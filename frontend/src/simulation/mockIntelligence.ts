import type {
  Machine, TelemetrySample, Anomaly, Correlation,
  Incident, AIRecommendation, IncidentEvidence, AnomalyDomain
} from './types'
import { MACHINE_BASELINES } from './factoryData'

// ============================================================
// Mock Intelligence Pipeline — DEMO MODE ONLY
// Simulates: Anomaly Detection → Correlation → Incident
// This is NOT the real backend intelligence engine.
// The UI clearly distinguishes algorithmic detection from AI recommendation.
// ============================================================

const ANOMALY_THRESHOLDS: Record<AnomalyDomain, number> = {
  machine_health: 0.30,   // 30% above baseline triggers anomaly
  energy: 0.25,
  safety: 0,              // safety events are injected directly
}

/** Detect anomalies by comparing current telemetry to machine baselines */
export function detectAnomalies(
  machines: Record<string, Machine>,
  telemetryHistory: Record<string, TelemetrySample[]>,
  existingAnomalyIds: Set<string>
): Anomaly[] {
  const newAnomalies: Anomaly[] = []
  const now = Date.now()

  for (const [machineId, machine] of Object.entries(machines)) {
    const history = telemetryHistory[machineId]
    if (!history || history.length < 3) continue

    // Use last 5 samples average to reduce noise
    const recent = history.slice(-5)
    const avgVib = recent.reduce((s, h) => s + h.vibration, 0) / recent.length
    const avgTemp = recent.reduce((s, h) => s + h.temperature, 0) / recent.length
    const avgPower = recent.reduce((s, h) => s + h.powerKw, 0) / recent.length

    const b = MACHINE_BASELINES[machineId]
    if (!b) continue

    const baseVib = (b.vibrationMin + b.vibrationMax) / 2
    const baseTemp = (b.temperatureMin + b.temperatureMax) / 2
    const basePower = (b.powerMin + b.powerMax) / 2

    const vibDev = (avgVib - baseVib) / baseVib
    const tempDev = (avgTemp - baseTemp) / baseTemp
    const powerDev = (avgPower - basePower) / basePower

    const threshold = ANOMALY_THRESHOLDS.machine_health

    // Vibration anomaly
    const vibAnomalyId = `${machineId}-vib-anomaly`
    if (vibDev > threshold && !existingAnomalyIds.has(vibAnomalyId)) {
      newAnomalies.push({
        id: vibAnomalyId,
        machineId,
        domain: 'machine_health',
        metric: 'vibration',
        value: avgVib,
        baseline: baseVib,
        deviation: Math.round(vibDev * 100),
        detectedAt: now,
        isActive: true,
      })
    }

    // Temperature anomaly (fires slightly later in the curve)
    const tempAnomalyId = `${machineId}-temp-anomaly`
    if (tempDev > threshold * 0.8 && !existingAnomalyIds.has(tempAnomalyId)) {
      newAnomalies.push({
        id: tempAnomalyId,
        machineId,
        domain: 'machine_health',
        metric: 'temperature',
        value: avgTemp,
        baseline: baseTemp,
        deviation: Math.round(tempDev * 100),
        detectedAt: now + 100, // slight delay
        isActive: true,
      })
    }

    // Energy anomaly
    const energyAnomalyId = `${machineId}-energy-anomaly`
    if (powerDev > ANOMALY_THRESHOLDS.energy && !existingAnomalyIds.has(energyAnomalyId)) {
      newAnomalies.push({
        id: energyAnomalyId,
        machineId,
        domain: 'energy',
        metric: 'power_kw',
        value: avgPower,
        baseline: basePower,
        deviation: Math.round(powerDev * 100),
        detectedAt: now + 200,
        isActive: true,
      })
    }
  }

  return newAnomalies
}

/** Group related anomalies on the same machine into a correlation */
export function correlateAnomalies(anomalies: Anomaly[]): Correlation | null {
  const activeAnomalies = anomalies.filter(a => a.isActive)
  if (activeAnomalies.length < 2) return null

  // Group by machineId
  const byMachine: Record<string, Anomaly[]> = {}
  for (const a of activeAnomalies) {
    if (!byMachine[a.machineId]) byMachine[a.machineId] = []
    byMachine[a.machineId].push(a)
  }

  // Find machine with most anomalies
  let best: Anomaly[] = []
  for (const group of Object.values(byMachine)) {
    if (group.length > best.length) best = group
  }

  if (best.length < 2) return null

  const domains = [...new Set(best.map(a => a.domain))] as Anomaly['domain'][]
  const score = Math.min(0.99, 0.6 + best.length * 0.12 + domains.length * 0.07)

  return {
    id: `CORR-${best[0].machineId}-${Date.now()}`,
    anomalyIds: best.map(a => a.id),
    machineIds: [...new Set(best.map(a => a.machineId))],
    domains,
    score: parseFloat(score.toFixed(2)),
    createdAt: Date.now(),
  }
}

/** Create a unified incident from a correlation */
export function createIncident(
  correlation: Correlation,
  anomalies: Anomaly[],
  machines: Record<string, Machine>,
  existingIds: Set<string>
): Incident | null {
  const incidentId = `INC-${String(Math.floor(Math.random() * 900) + 100)}`
  if (existingIds.has(incidentId)) return null

  const relevantAnomalies = anomalies.filter(a => correlation.anomalyIds.includes(a.id))
  const primaryMachineId = correlation.machineIds[0]
  const machine = machines[primaryMachineId]
  if (!machine) return null

  const evidence: IncidentEvidence[] = relevantAnomalies.map(a => ({
    label: formatMetricLabel(a.metric),
    domain: a.domain,
    value: a.value,
    baseline: a.baseline,
    deviationPct: a.deviation,
  }))

  const priority = correlation.score > 0.85 ? 'high' : correlation.score > 0.7 ? 'medium' : 'low'

  return {
    id: incidentId,
    correlationId: correlation.id,
    title: generateIncidentTitle(relevantAnomalies),
    priority,
    status: 'active',
    machineId: primaryMachineId,
    lineId: machine.lineId,
    correlationScore: correlation.score,
    evidence,
    createdAt: Date.now(),
  }
}

/** Generate a deterministic AI recommendation from a verified incident */
export function generateAIRecommendation(incident: Incident): AIRecommendation {
  const hasVibAnomaly = incident.evidence.some(e => e.label.includes('Vibration'))
  const hasTempAnomaly = incident.evidence.some(e => e.label.includes('Temperature'))
  const hasEnergyAnomaly = incident.evidence.some(e => e.label.includes('Power'))

  let probableCause: string
  let action: string
  let timeline: string
  let impact: string

  if (hasVibAnomaly && hasTempAnomaly) {
    probableCause = 'Possible bearing or spindle degradation causing increased mechanical resistance and heat generation.'
    action = 'Inspect bearing and spindle assembly. Check lubrication levels and bearing clearances. Schedule replacement if wear exceeds manufacturer tolerance.'
    timeline = 'Within 12 hours to prevent unplanned downtime.'
    impact = 'Continued degradation may result in catastrophic bearing failure, requiring 24–48 hours of unplanned downtime.'
  } else if (hasEnergyAnomaly && !hasVibAnomaly) {
    probableCause = 'Power draw anomaly without mechanical signal — potential electrical inefficiency, load imbalance, or phase issue.'
    action = 'Review electrical load profile and check power factor. Inspect for partial phase failure or capacitor bank issues.'
    timeline = 'Within 24 hours.'
    impact = 'Continued energy inefficiency increases operating costs and may indicate impending electrical component failure.'
  } else if (hasTempAnomaly) {
    probableCause = 'Thermal anomaly without significant vibration — likely coolant flow restriction or heat exchanger fouling.'
    action = 'Check coolant flow rate and filter condition. Inspect heat exchanger for blockage. Verify coolant mixture concentration.'
    timeline = 'Within 8 hours.'
    impact = 'Thermal damage to spindle bearings and electrical components if temperature continues to rise.'
  } else {
    probableCause = 'Multiple correlated deviations detected. Root cause requires physical inspection to determine precise failure mode.'
    action = 'Perform comprehensive inspection of mechanical and electrical systems. Check all fluid levels and filter conditions.'
    timeline = 'Within 4 hours.'
    impact = 'Risk of unplanned downtime increasing. Proactive intervention strongly recommended.'
  }

  const evidenceConsidered = incident.evidence.map(e =>
    `${e.label}: +${e.deviationPct}% above baseline`
  )

  return {
    incidentId: incident.id,
    probableCause,
    evidenceConsidered,
    recommendedAction: action,
    timeline,
    potentialImpact: impact,
    generatedAt: Date.now(),
  }
}

// --- Helpers ---

function formatMetricLabel(metric: string): string {
  const map: Record<string, string> = {
    vibration: 'Vibration',
    temperature: 'Temperature',
    power_kw: 'Power Consumption',
    rpm: 'RPM',
  }
  return map[metric] ?? metric
}

function generateIncidentTitle(anomalies: Anomaly[]): string {
  const hasVib = anomalies.some(a => a.metric === 'vibration')
  const hasTemp = anomalies.some(a => a.metric === 'temperature')
  const hasEnergy = anomalies.some(a => a.domain === 'energy')

  if (hasVib && hasTemp && hasEnergy) return 'Probable Mechanical Degradation — Multi-Domain'
  if (hasVib && hasTemp) return 'Probable Mechanical Degradation'
  if (hasEnergy && hasVib) return 'Mechanical-Electrical Anomaly'
  if (hasEnergy) return 'Energy Consumption Anomaly'
  if (hasTemp) return 'Thermal Anomaly Detected'
  return 'Multi-Signal Operational Anomaly'
}
