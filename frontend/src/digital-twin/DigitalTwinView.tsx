import { useState, useEffect, useRef } from 'react'
import '../digital-twin.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Shield, Zap, Wrench,
  Settings, LogOut, Menu, X, Cpu, MonitorSpeaker, Bell, ChevronRight, ScrollText
} from 'lucide-react'

import ConnectionStatus from './ConnectionStatus'
import FactoryKPIBar from './FactoryKPIBar'
import FactoryGrid from './FactoryGrid'
import DemoToolbar from './DemoToolbar'
import SimulationControlPanel from './SimulationControlPanel'
import RecoveryControlPanel from './RecoveryControlPanel'
import MachineDetailsPanel from './MachineDetailsPanel'
import IncidentPanel from './IncidentPanel'
import FactoryEventLog from './FactoryEventLog'

import { useFactorySimulation } from '../simulation/factorySimulation'
import type { FaultType, RecoveryType } from '../simulation/types'



import { MACHINE_BASELINES, getDefaultBaselineForType } from '../simulation/factoryData'

interface DigitalTwinViewProps {
  view?: 'twin' | 'logs'
  liveIncidents?: any[]
  companyMachines?: any[]   // imported machines from Dashboard machinesList
  liveAnomalies?: any[]     // live backend anomalies to overlay on the twin
  onTriggerScenario?: (scenario: string, machineId?: string) => Promise<void>
  onResetSimulator?: () => Promise<void>
}

export default function DigitalTwinView({ 
  view = 'twin', 
  liveIncidents = [], 
  companyMachines = [], 
  liveAnomalies = [],
  onTriggerScenario,
  onResetSimulator
}: DigitalTwinViewProps) {
  const [rightPanel, setRightPanel] = useState<'details' | 'incidents'>('details')

  // API recommendations for live twin page
  const [twinRecommendation, setTwinRecommendation] = useState<any | null>(null)
  const [loadingTwinRec, setLoadingTwinRec] = useState(false)

  const activeLiveIncident = liveIncidents.find(i => i.priority === 'CRITICAL' || i.priority === 'HIGH' || i.priority === 'WARNING' || i.priority === 'LOW')

  useEffect(() => {
    if (activeLiveIncident) {
      const fetchRecommendation = async () => {
        setLoadingTwinRec(true)
        try {
          const res = await fetch(`http://localhost:8000/api/recommendations/${activeLiveIncident.incident_id}`)
          if (res.ok) {
            const data = await res.json()
            setTwinRecommendation(data)
          }
        } catch (e) {
          console.error("Failed to load Gemini recommendation for Twin:", e)
        } finally {
          setLoadingTwinRec(false)
        }
      }
      fetchRecommendation()
    } else {
      setTwinRecommendation(null)
    }
  }, [activeLiveIncident])

  const {
    state,
    injectFault,
    applyRecovery,
    selectMachine,
    setSpeed,
    togglePause,
    resetFactory,
    runDemoScenario,
    addMachine,
  } = useFactorySimulation()

  // ── Sync company-imported machines into the live factory simulation ──────────
  const syncedMachineIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!companyMachines || companyMachines.length === 0) return

    // After a factory reset, state.machines becomes empty — clear our tracking so we re-add them
    if (Object.keys(state.machines).length === 0) {
      syncedMachineIds.current.clear()
    }

    companyMachines.forEach((cm) => {
      const id: string = cm.id
      if (syncedMachineIds.current.has(id)) return
      if (state.machines[id]) {
        syncedMachineIds.current.add(id)
        return
      }

      // Determine machine type from name heuristic (fallback: cnc)
      const nameLower = (cm.name || '').toLowerCase()
      const type: 'cnc' | 'motor' | 'pump' | 'conveyor' =
        nameLower.includes('pump') ? 'pump'
        : nameLower.includes('motor') ? 'motor'
        : nameLower.includes('conveyor') ? 'conveyor'
        : 'cnc'

      // Register a telemetry baseline so the simulation tick can generate readings
      if (!MACHINE_BASELINES[id]) {
        MACHINE_BASELINES[id] = getDefaultBaselineForType(type)
      }

      addMachine(cm.name || id, type, 'LINE-A', undefined, id)
      syncedMachineIds.current.add(id)
    })
  }, [companyMachines, state.machines, addMachine])

  // ── Apply live backend anomalies as fault injections in the twin ────────────
  const appliedAnomalyIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!liveAnomalies || liveAnomalies.length === 0) {
      appliedAnomalyIds.current.clear()
      return
    }

    liveAnomalies.forEach((anomaly) => {
      const anomalyId: string = anomaly.anomaly_id
      if (appliedAnomalyIds.current.has(anomalyId)) return

      const machineId: string = anomaly.machine_id
      // Only inject if the machine is present in the twin canvas
      if (!state.machines[machineId]) return

      appliedAnomalyIds.current.add(anomalyId)

      // Map backend telemetry metric → simulation fault type
      let faultType: FaultType
      if (anomaly.metric === 'temperature') faultType = 'cooling_failure'
      else if (anomaly.metric === 'vibration') faultType = 'bearing_degradation'
      else if (anomaly.metric === 'power_kw') faultType = 'energy_inefficiency'
      else faultType = 'motor_overload'

      injectFault(faultType, machineId)
    })
  }, [liveAnomalies, state.machines, injectFault])

  const handleDropFault = (faultType: FaultType, machineId: string) => {
    injectFault(faultType, machineId)
  }

  const handleDropRecovery = (recoveryType: string, machineId: string) => {
    applyRecovery(recoveryType as RecoveryType, machineId)
  }

  const handleSelectMachine = (machineId: string) => {
    selectMachine(machineId)
    setRightPanel('details')
  }

  const hasActiveIncident = state.incidents.some(i => i.status !== 'resolved')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Topbar equivalent for simulation controls inside the view */}
      <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            {view === 'logs' ? 'System Logs' : 'Live Factory Twin'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ConnectionStatus state={state.backendState} />
          {hasActiveIncident && (
            <button className="topbar-incident-alert" onClick={() => setRightPanel('incidents')}>
              <Bell size={14} /> Active Incident
            </button>
          )}
        </div>
      </div>

          {/* KPI Bar */}
          <FactoryKPIBar state={state} />

          {view === 'twin' ? (
            /* Three-column layout */
            <div className="dt-layout">
              {/* LEFT: Simulation Control Panel */}
            <div className="dt-left-panel">
              <SimulationControlPanel
                state={state}
              />
            </div>

            {/* CENTER: Factory Grid & Top Toolbar */}
            <div className="dt-center">
              <div className="demo-toolbar-container">
                <DemoToolbar
                  isPaused={state.isPaused}
                  speed={state.simulationSpeed}
                  onSetSpeed={setSpeed}
                  onTogglePause={togglePause}
                  onReset={resetFactory}
                  onRunScenario={runDemoScenario}
                />
              </div>

              <FactoryGrid
                state={state}
                onSelectMachine={handleSelectMachine}
                onDropFault={handleDropFault}
                onAddMachine={addMachine}
              />

              {/* Center Overlay for Details & Incidents */}
              <AnimatePresence mode="wait">
                {(state.selectedMachineId || rightPanel === 'incidents') && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 20 }}
                    style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', zIndex: 50, display: 'flex', flexDirection: 'column' }}
                  >
                    <div className="dt-right-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex' }}>
                        <button
                          className={`dt-tab ${rightPanel === 'details' ? 'active' : ''}`}
                          onClick={() => setRightPanel('details')}
                        >
                          Machine Details
                        </button>
                        <button
                          className={`dt-tab ${rightPanel === 'incidents' ? 'active' : ''}`}
                          onClick={() => setRightPanel('incidents')}
                        >
                          Incidents
                          {hasActiveIncident && <span className="dt-tab-dot" />}
                        </button>
                      </div>
                      <button 
                        onClick={() => { selectMachine(null); setRightPanel('details'); }}
                        style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      {rightPanel === 'details' ? (
                        state.selectedMachineId ? (
                          <MachineDetailsPanel
                            state={state}
                            onClose={() => { selectMachine(null); setRightPanel('details'); }}
                            onDropRecovery={handleDropRecovery}
                          />
                        ) : (
                          <div className="dt-empty-panel">
                            <MonitorSpeaker size={28} style={{ color: 'var(--text-light)', opacity: 0.5 }} />
                            <div className="dt-empty-sub">Click a machine on the canvas to inspect its telemetry</div>
                          </div>
                        )
                      ) : (
                        <IncidentPanel 
                          state={state} 
                          liveIncidents={liveIncidents}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT: Resolves Toolbox & Logs */}
            <div className="dt-right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto' }}>
              <div style={{ flex: 1 }}>
                <RecoveryControlPanel state={state} />
              </div>
            </div>
          </div>
          ) : (
            /* Logs View */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'var(--bg-primary)', overflow: 'hidden' }}>
              <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <FactoryEventLog events={state.eventLog} />
              </div>
            </div>
          )}
    </div>
  )
}
