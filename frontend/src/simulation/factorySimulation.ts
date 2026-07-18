import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  SimulationState, Machine, FaultInstance, RecoveryInstance,
  Anomaly, Incident, FactoryEvent, SimulationSpeed,
  FaultType, RecoveryType, TelemetrySample, DemoScenario
} from './types'
import { INITIAL_MACHINES, MACHINE_BASELINES, getDefaultBaselineForType } from './factoryData'
import {
  generateBaseline, applyFaultModifiers, applyRecoveryModifier,
  computeMachineHealth, trimHistory
} from './telemetryGenerator'
import { getRecoveryProgress, RECOVERY_PROFILE_MAP } from './recoveryProfiles'
import {
  detectAnomalies, correlateAnomalies, createIncident, generateAIRecommendation
} from './mockIntelligence'

// ============================================================
// useFactorySimulation — Central simulation state hook
// ============================================================

function makeId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function makeEvent(category: FactoryEvent['category'], message: string, machineId?: string): FactoryEvent {
  return { id: makeId(), timestamp: Date.now(), category, message, machineId }
}

const INITIAL_STATE: SimulationState = {
  machines: Object.fromEntries(INITIAL_MACHINES.map(m => [m.id, { ...m }])),
  telemetryHistory: Object.fromEntries(INITIAL_MACHINES.map(m => [m.id, []])),
  activeFaults: [],
  activeRecoveries: [],
  anomalies: [],
  correlations: [],
  incidents: [],
  recommendations: {},
  eventLog: [makeEvent('system', 'Factory simulation initialized. All systems nominal.')],
  selectedMachineId: null,
  simulationSpeed: 1,
  isPaused: false,
  backendState: 'demo_mode',
  factoryIntelligenceScore: 92,
}

export function useFactorySimulation() {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE)
  const stateRef = useRef(state)
  stateRef.current = state

  // Correlation cooldown — prevent creating a new incident every tick
  const lastCorrelationAt = useRef<number>(0)
  const CORRELATION_COOLDOWN_MS = 15000 // 15 seconds between incidents

  // ---- Tick function ----
  const tick = useCallback(() => {
    setState(prev => {
      if (prev.isPaused) return prev

      const speed = prev.simulationSpeed
      const now = Date.now()

      // 1. Update all machine telemetry
      const updatedMachines: Record<string, Machine> = {}
      const updatedHistory: Record<string, TelemetrySample[]> = {}

      for (const machineId of Object.keys(prev.machines)) {
        const machine = prev.machines[machineId]

        // Find active recovery for this machine
        const recovery = prev.activeRecoveries.find(r => r.machineId === machineId && !r.isComplete)
        const recoveryProgress = recovery
          ? getRecoveryProgress(recovery.startedAt, RECOVERY_PROFILE_MAP[recovery.recoveryType]?.durationSeconds ?? 60, speed)
          : 0

        const hasActiveFault = prev.activeFaults.some(f => f.machineId === machineId && f.isActive)

        let sample: TelemetrySample

        if (recovery && recoveryProgress >= 1) {
          // Fully recovered
          sample = generateBaseline(machineId)
        } else if (recovery) {
          // Recovering — blend from faulted toward baseline
          const faulted = applyFaultModifiers(generateBaseline(machineId), prev.activeFaults, machineId, speed)
          sample = applyRecoveryModifier(faulted, machineId, recoveryProgress)
        } else {
          // Normal or faulted
          const baseline = generateBaseline(machineId)
          sample = applyFaultModifiers(baseline, prev.activeFaults, machineId, speed)
        }

        const { status, healthScore } = computeMachineHealth(machine, sample, hasActiveFault, recoveryProgress)

        updatedMachines[machineId] = {
          ...machine,
          status,
          healthScore,
          temperature: sample.temperature,
          vibration: sample.vibration,
          rpm: sample.rpm,
          powerKw: sample.powerKw,
          lastUpdated: now,
        }

        const currentHistory = prev.telemetryHistory[machineId] ?? []
        updatedHistory[machineId] = trimHistory([...currentHistory, sample])
      }

      // 2. Complete recoveries
      const updatedRecoveries = prev.activeRecoveries.map(r => {
        if (r.isComplete) return r
        const profile = RECOVERY_PROFILE_MAP[r.recoveryType]
        const progress = getRecoveryProgress(r.startedAt, profile?.durationSeconds ?? 60, speed)
        if (progress >= 1 && !r.isComplete) return { ...r, isComplete: true }
        return r
      })

      // Clear faults that have a completed recovery
      const completedRecoveryMachines = updatedRecoveries
        .filter(r => r.isComplete)
        .map(r => r.machineId)

      const updatedFaults = prev.activeFaults.map(f =>
        completedRecoveryMachines.includes(f.machineId) ? { ...f, isActive: false } : f
      )

      // 3. Anomaly Detection (only run every 3 ticks worth of data)
      const existingAnomalyIds = new Set(prev.anomalies.map(a => a.id))
      const newAnomalies = detectAnomalies(updatedMachines, updatedHistory, existingAnomalyIds)

      const allAnomalies = [...prev.anomalies]
      const newEvents: FactoryEvent[] = []

      for (const anomaly of newAnomalies) {
        allAnomalies.push(anomaly)
        newEvents.push(makeEvent('anomaly',
          `${anomaly.metric} anomaly on ${anomaly.machineId} — +${anomaly.deviation}% above baseline`,
          anomaly.machineId
        ))
      }

      // Deactivate anomalies whose machine has recovered
      const resolvedAnomalies = allAnomalies.map(a => {
        if (!a.isActive) return a
        const machine = updatedMachines[a.machineId]
        if (machine?.status === 'healthy' || machine?.status === 'recovering') {
          return { ...a, isActive: false }
        }
        return a
      })

      // 4. Correlation (with cooldown to prevent spam)
      let updatedCorrelations = [...prev.correlations]
      let updatedIncidents = [...prev.incidents]
      let updatedRecommendations = { ...prev.recommendations }

      const canCorrelate = now - lastCorrelationAt.current > CORRELATION_COOLDOWN_MS
      const activeAnomalyCount = resolvedAnomalies.filter(a => a.isActive).length
      const hasActiveIncident = updatedIncidents.some(i => i.status === 'active')

      if (canCorrelate && activeAnomalyCount >= 2 && !hasActiveIncident) {
        const correlation = correlateAnomalies(resolvedAnomalies)
        if (correlation) {
          updatedCorrelations = [...updatedCorrelations, correlation]
          lastCorrelationAt.current = now

          newEvents.push(makeEvent('correlation',
            `Cross-domain correlation detected — ${correlation.anomalyIds.length} anomalies linked (score: ${Math.round(correlation.score * 100)}%)`
          ))

          // Create incident
          const existingIncidentIds = new Set(updatedIncidents.map(i => i.id))
          const incident = createIncident(correlation, resolvedAnomalies, updatedMachines, existingIncidentIds)
          if (incident) {
            updatedIncidents = [...updatedIncidents, incident]
            newEvents.push(makeEvent('incident',
              `Incident ${incident.id} created — ${incident.title} [${incident.priority.toUpperCase()}]`,
              incident.machineId
            ))

            // AI Recommendation
            const rec = generateAIRecommendation(incident)
            updatedRecommendations = { ...updatedRecommendations, [incident.id]: rec }
            newEvents.push(makeEvent('ai', `AI recommendation generated for ${incident.id}`))
          }
        }
      }

      // 5. Resolve incidents when machine recovers
      updatedIncidents = updatedIncidents.map(incident => {
        if (incident.status === 'resolved') return incident
        const machine = updatedMachines[incident.machineId]
        if (machine?.status === 'recovering' && incident.status === 'active') {
          return { ...incident, status: 'mitigating' as const }
        }
        if (machine?.status === 'healthy' && (incident.status === 'active' || incident.status === 'mitigating')) {
          newEvents.push(makeEvent('operator', `Incident ${incident.id} resolved — machine back to healthy`))
          return { ...incident, status: 'resolved' as const, resolvedAt: now }
        }
        return incident
      })

      // 6. Compute factory intelligence score
      const machines = Object.values(updatedMachines)
      const avgHealth = machines.reduce((s, m) => s + m.healthScore, 0) / machines.length
      const criticalCount = machines.filter(m => m.status === 'critical').length
      const activeIncidents = updatedIncidents.filter(i => i.status === 'active').length
      const score = Math.round(Math.max(10, avgHealth - criticalCount * 8 - activeIncidents * 5))

      // 7. Build event log (keep last 100)
      const updatedLog = [...prev.eventLog, ...newEvents].slice(-100)

      return {
        ...prev,
        machines: updatedMachines,
        telemetryHistory: updatedHistory,
        activeFaults: updatedFaults,
        activeRecoveries: updatedRecoveries,
        anomalies: resolvedAnomalies,
        correlations: updatedCorrelations,
        incidents: updatedIncidents,
        recommendations: updatedRecommendations,
        eventLog: updatedLog,
        factoryIntelligenceScore: score,
      }
    })
  }, [])

  // Interval ticker
  useEffect(() => {
    const interval = setInterval(tick, 1500 / state.simulationSpeed)
    return () => clearInterval(interval)
  }, [tick, state.simulationSpeed, state.isPaused])

  // ---- Public Actions ----

  const injectFault = useCallback((faultType: FaultType, machineId: string) => {
    const id = makeId()
    setState(prev => ({
      ...prev,
      activeFaults: [
        ...prev.activeFaults,
        { id, faultType, machineId, startedAt: Date.now(), isActive: true }
      ],
      eventLog: [...prev.eventLog, makeEvent('operator',
        `Fault injected: ${faultType.replace(/_/g, ' ')} on ${machineId}`, machineId
      )].slice(-100),
    }))
  }, [])

  const applyRecovery = useCallback((recoveryType: RecoveryType, machineId: string) => {
    const id = makeId()
    const profile = RECOVERY_PROFILE_MAP[recoveryType]

    setState(prev => {
      // If full_reset, immediately reset machine
      if (profile?.effect === 'full_reset') {
        const baseline = generateBaseline(machineId)
        const b = MACHINE_BASELINES[machineId]
        return {
          ...prev,
          machines: {
            ...prev.machines,
            [machineId]: {
              ...prev.machines[machineId],
              status: 'healthy',
              healthScore: 97,
              vibration: baseline.vibration,
              temperature: baseline.temperature,
              rpm: baseline.rpm,
              powerKw: baseline.powerKw,
            }
          },
          activeFaults: prev.activeFaults.map(f =>
            f.machineId === machineId ? { ...f, isActive: false } : f
          ),
          activeRecoveries: [...prev.activeRecoveries, { id, recoveryType, machineId, startedAt: Date.now(), isComplete: true }],
          anomalies: prev.anomalies.map(a => a.machineId === machineId ? { ...a, isActive: false } : a),
          incidents: prev.incidents.map(i => i.machineId === machineId && i.status !== 'resolved'
            ? { ...i, status: 'resolved' as const, resolvedAt: Date.now() } : i),
          eventLog: [...prev.eventLog, makeEvent('operator', `Reset applied to ${machineId}`, machineId)].slice(-100),
        }
      }

      return {
        ...prev,
        activeRecoveries: [
          ...prev.activeRecoveries.filter(r => r.machineId !== machineId),
          { id, recoveryType, machineId, startedAt: Date.now(), isComplete: false }
        ],
        eventLog: [...prev.eventLog, makeEvent('operator',
          `Recovery action applied: ${recoveryType.replace(/_/g, ' ')} on ${machineId}`, machineId
        )].slice(-100),
      }
    })
  }, [])

  const selectMachine = useCallback((machineId: string | null) => {
    setState(prev => ({ ...prev, selectedMachineId: machineId }))
  }, [])

  const setSpeed = useCallback((speed: SimulationSpeed) => {
    setState(prev => ({ ...prev, simulationSpeed: speed }))
  }, [])

  const togglePause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  const resetFactory = useCallback(() => {
    lastCorrelationAt.current = 0
    setState({
      ...INITIAL_STATE,
      machines: Object.fromEntries(INITIAL_MACHINES.map(m => [m.id, { ...m }])),
      telemetryHistory: Object.fromEntries(INITIAL_MACHINES.map(m => [m.id, []])),
      eventLog: [makeEvent('system', 'Factory reset to baseline. All systems nominal.')],
    })
  }, [])

  const addMachine = useCallback((name: string, type: Machine['type'], lineId: string, gridIndex?: number) => {
    const id = `${type.toUpperCase()}-${Math.floor(Math.random() * 10000)}`
    
    // Set dynamic baseline for the new machine
    MACHINE_BASELINES[id] = getDefaultBaselineForType(type)
    const baseline = generateBaseline(id)

    const newMachine: Machine = {
      id,
      name,
      type,
      lineId,
      gridIndex,
      x: 0, // Not used in grid layout
      y: 0, // Not used in grid layout
      status: 'healthy',
      healthScore: 100,
      temperature: baseline.temperature,
      vibration: baseline.vibration,
      rpm: baseline.rpm,
      powerKw: baseline.powerKw,
      lastUpdated: Date.now(),
    }

    setState(prev => ({
      ...prev,
      machines: { ...prev.machines, [id]: newMachine },
      telemetryHistory: { ...prev.telemetryHistory, [id]: [] },
      eventLog: [...prev.eventLog, makeEvent('system', `Machine added: ${name} (${id})`)].slice(-100)
    }))
  }, [])

  const runDemoScenario = useCallback((scenario: DemoScenario) => {
    if (scenario === 'normal') {
      // Clear existing faults, recoveries, anomalies, and incidents, but keep machines intact
      setState(prev => ({
        ...prev,
        activeFaults: [],
        activeRecoveries: [],
        anomalies: [],
        incidents: [],
        selectedMachineId: null, // Ensure overlay is closed
        eventLog: [...prev.eventLog, makeEvent('system', `Returning to normal operation`)].slice(-100),
      }))
      return
    }

    // For other scenarios, log the injection but DO NOT clear existing faults (allow stacking)
    setState(prev => ({
      ...prev,
      eventLog: [...prev.eventLog, makeEvent('system', `Loading demo scenario: ${scenario}`)].slice(-100),
    }))

    if (scenario === 'bearing_degradation' || scenario === 'multi_domain_critical') {
      // After 2s, inject bearing degradation on a random compatible machine
      setTimeout(() => {
        setState(prev => {
          const compatible = Object.values(prev.machines).filter(m => m.type === 'cnc' || m.type === 'motor')
          const target = compatible.length > 0 
            ? compatible[Math.floor(Math.random() * compatible.length)] 
            : Object.values(prev.machines)[0]

          return {
            ...prev,
            activeFaults: [
              ...prev.activeFaults,
              {
                id: makeId(),
                faultType: 'bearing_degradation',
                machineId: target.id,
                startedAt: Date.now(),
                isActive: true,
              }
            ],
            eventLog: [...prev.eventLog,
              makeEvent('system', `Demo scenario: Bearing Degradation starting on ${target.id}`, target.id)
            ].slice(-100),
          }
        })
      }, 2000)
    }

    if (scenario === 'energy_anomaly') {
      setTimeout(() => {
        setState(prev => {
          const compatible = Object.values(prev.machines).filter(m => m.type !== 'cnc') // Motor, Pump, Conveyor
          const target = compatible.length > 0 
            ? compatible[Math.floor(Math.random() * compatible.length)] 
            : Object.values(prev.machines)[0]

          return {
            ...prev,
            activeFaults: [
              ...prev.activeFaults,
              {
                id: makeId(),
                faultType: 'energy_inefficiency',
                machineId: target.id,
                startedAt: Date.now(),
                isActive: true,
              }
            ],
            eventLog: [...prev.eventLog,
              makeEvent('system', `Demo scenario: Energy Inefficiency starting on ${target.id}`, target.id)
            ].slice(-100),
          }
        })
      }, 2000)
    }
  }, [])

  return {
    state,
    injectFault,
    applyRecovery,
    selectMachine,
    setSpeed,
    togglePause,
    resetFactory,
    runDemoScenario,
    addMachine,
  }
}
