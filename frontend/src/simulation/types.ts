// ============================================================
// OPTIMUS — Factory Digital Twin: Type Definitions
// ============================================================

// --- Machine & Production Line ---

export type MachineStatus = 'healthy' | 'warning' | 'critical' | 'offline' | 'recovering'
export type MachineType = 'cnc' | 'motor' | 'pump' | 'conveyor'

export interface Machine {
  id: string
  name: string
  type: MachineType
  lineId: string
  gridIndex?: number
  x: number
  y: number
  status: MachineStatus
  healthScore: number
  temperature: number
  vibration: number
  rpm: number
  powerKw: number
  lastUpdated: number
}

export interface ProductionLine {
  id: string
  name: string
  color: string
  x: number
  y: number
  width: number
  height: number
}

// --- Telemetry ---

export interface TelemetrySample {
  timestamp: number
  vibration: number
  temperature: number
  rpm: number
  powerKw: number
}

export type TelemetryHistory = Record<string, TelemetrySample[]>

export interface MachineBaseline {
  vibrationMin: number
  vibrationMax: number
  temperatureMin: number
  temperatureMax: number
  rpmMin: number
  rpmMax: number
  powerMin: number
  powerMax: number
}

// --- Faults ---

export type FaultType = 'bearing_degradation' | 'cooling_failure' | 'motor_overload' | 'energy_inefficiency' | 'restricted_zone'

export interface FaultProfile {
  id: FaultType
  name: string
  description: string
  compatibleTypes: MachineType[]
  icon: string
  severity: 'medium' | 'high' | 'critical'
  /** Degradation curve: seconds → multipliers for each metric */
  curve: DegradationPoint[]
}

export interface DegradationPoint {
  t: number // seconds elapsed
  vibrationMult: number
  temperatureMult: number
  powerMult: number
  rpmMult: number
}

export interface FaultInstance {
  id: string
  faultType: FaultType
  machineId: string
  startedAt: number // Date.now()
  isActive: boolean
}

// --- Recovery ---

export type RecoveryType = 'preventive_maintenance' | 'emergency_inspection' | 'energy_optimization' | 'reset_machine'

export interface RecoveryProfile {
  id: RecoveryType
  name: string
  description: string
  icon: string
  effect: 'gradual_restore' | 'stop_degradation' | 'reduce_power' | 'full_reset'
  durationSeconds: number
}

export interface RecoveryInstance {
  id: string
  recoveryType: RecoveryType
  machineId: string
  startedAt: number
  isComplete: boolean
}

// --- Intelligence Layer ---

export type AnomalyDomain = 'machine_health' | 'energy' | 'safety'

export interface Anomaly {
  id: string
  machineId: string
  domain: AnomalyDomain
  metric: string
  value: number
  baseline: number
  deviation: number // percentage above baseline
  detectedAt: number
  isActive: boolean
}

export interface Correlation {
  id: string
  anomalyIds: string[]
  machineIds: string[]
  domains: AnomalyDomain[]
  score: number // 0–1
  createdAt: number
}

export type IncidentStatus = 'active' | 'mitigating' | 'resolved'
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Incident {
  id: string
  correlationId: string
  title: string
  priority: IncidentPriority
  status: IncidentStatus
  machineId: string
  lineId: string
  correlationScore: number
  evidence: IncidentEvidence[]
  createdAt: number
  resolvedAt?: number
}

export interface IncidentEvidence {
  label: string
  domain: AnomalyDomain
  value: number
  baseline: number
  deviationPct: number
}

export interface AIRecommendation {
  incidentId: string
  probableCause: string
  evidenceConsidered: string[]
  recommendedAction: string
  timeline: string
  potentialImpact: string
  generatedAt: number
}

// --- Event Log ---

export type EventCategory = 'system' | 'anomaly' | 'correlation' | 'incident' | 'ai' | 'operator'

export interface FactoryEvent {
  id: string
  timestamp: number
  category: EventCategory
  message: string
  machineId?: string
}

// --- Simulation State ---

export type SimulationSpeed = 1 | 2 | 4

export type BackendConnectionState = 'connected' | 'demo_mode' | 'connecting'

export type DemoScenario = 'normal' | 'bearing_degradation' | 'energy_anomaly' | 'safety_incident' | 'multi_domain_critical'

export interface SimulationState {
  machines: Record<string, Machine>
  telemetryHistory: TelemetryHistory
  activeFaults: FaultInstance[]
  activeRecoveries: RecoveryInstance[]
  anomalies: Anomaly[]
  correlations: Correlation[]
  incidents: Incident[]
  recommendations: Record<string, AIRecommendation>
  eventLog: FactoryEvent[]
  selectedMachineId: string | null
  simulationSpeed: SimulationSpeed
  isPaused: boolean
  backendState: BackendConnectionState
  factoryIntelligenceScore: number
}
