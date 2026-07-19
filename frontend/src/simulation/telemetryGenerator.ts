import type { Machine, MachineBaseline, TelemetrySample } from './types'
import { MACHINE_BASELINES } from './factoryData'
import { interpolateCurve } from './faultProfiles'
import type { FaultInstance } from './types'
import { FAULT_PROFILE_MAP } from './faultProfiles'

// ============================================================
// Telemetry Generator
// Produces realistic sensor readings with noise, fault modifiers,
// and recovery modifiers
// ============================================================

/** Return a random float in [min, max] */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Small Gaussian-ish noise: ±range */
function noise(range: number): number {
  return (Math.random() - 0.5) * 2 * range
}

/** Generate a clean baseline reading for a machine using time-based smooth oscillations */
export function generateBaseline(machineId: string): TelemetrySample {
  const b: MachineBaseline = MACHINE_BASELINES[machineId] ?? {
    vibrationMin: 1, vibrationMax: 3,
    temperatureMin: 40, temperatureMax: 70,
    rpmMin: 1000, rpmMax: 2000,
    powerMin: 5, powerMax: 15,
  }
  
  const now = Date.now()
  // Pseudo-random phase offset for this machine
  const hash = machineId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  // Different frequencies for different metrics
  const t1 = (now / 35000) + hash
  const t2 = (now / 50000) + hash * 2
  const t3 = (now / 25000) + hash * 3
  
  // Smoothly vary around the middle of the baseline range (only +-15% of the total range)
  const mid = (min: number, max: number) => (min + max) / 2;
  const vary = (min: number, max: number, t: number) => mid(min, max) + Math.sin(t) * ((max - min) * 0.15);
  
  const v = vary(b.vibrationMin, b.vibrationMax, t1)
  const temp = vary(b.temperatureMin, b.temperatureMax, t2)
  const r = vary(b.rpmMin, b.rpmMax, t3)
  const p = vary(b.powerMin, b.powerMax, t1 * 1.3)

  return {
    timestamp: now,
    vibration: parseFloat((v + noise(0.05)).toFixed(2)),
    temperature: parseFloat((temp + noise(0.2)).toFixed(1)),
    rpm: Math.round(r + noise(5)),
    powerKw: parseFloat((p + noise(0.1)).toFixed(2)),
  }
}

/**
 * Apply all active fault modifiers to the baseline reading.
 * The fault curve multipliers compound on top of the baseline, NOT each other.
 */
export function applyFaultModifiers(
  baseline: TelemetrySample,
  activeFaults: FaultInstance[],
  machineId: string,
  simulationSpeed: number
): TelemetrySample {
  const machineFaults = activeFaults.filter(f => f.machineId === machineId && f.isActive)
  if (machineFaults.length === 0) return baseline

  let vibMult = 1
  let tempMult = 1
  let powerMult = 1
  let rpmMult = 1

  for (const fault of machineFaults) {
    const profile = FAULT_PROFILE_MAP[fault.faultType]
    if (!profile) continue
    const elapsedSec = ((Date.now() - fault.startedAt) / 1000) * simulationSpeed
    const mults = interpolateCurve(profile.curve, elapsedSec)
    // Take the worst (highest) multiplier from all active faults
    vibMult = Math.max(vibMult, mults.vibrationMult)
    tempMult = Math.max(tempMult, mults.temperatureMult)
    powerMult = Math.max(powerMult, mults.powerMult)
    rpmMult = Math.min(rpmMult, mults.rpmMult) // rpm degrades downward
  }

  const b = MACHINE_BASELINES[machineId]
  const baseVib = (b.vibrationMin + b.vibrationMax) / 2
  const baseTemp = (b.temperatureMin + b.temperatureMax) / 2
  const basePower = (b.powerMin + b.powerMax) / 2
  const baseRpm = (b.rpmMin + b.rpmMax) / 2

  return {
    timestamp: Date.now(),
    vibration: parseFloat(Math.max(0, baseVib * vibMult + noise(0.15)).toFixed(2)),
    temperature: parseFloat(Math.max(0, baseTemp * tempMult + noise(0.5)).toFixed(1)),
    rpm: Math.round(Math.max(0, baseRpm * rpmMult + noise(10))),
    powerKw: parseFloat(Math.max(0, basePower * powerMult + noise(0.2)).toFixed(2)),
  }
}

/**
 * Apply recovery modifier — lerp from faulted values toward baseline.
 * progress: 0 (no recovery) → 1 (fully restored)
 */
export function applyRecoveryModifier(
  current: TelemetrySample,
  machineId: string,
  progress: number
): TelemetrySample {
  const baseline = generateBaseline(machineId)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  return {
    timestamp: Date.now(),
    vibration: parseFloat(lerp(current.vibration, baseline.vibration, progress).toFixed(2)),
    temperature: parseFloat(lerp(current.temperature, baseline.temperature, progress).toFixed(1)),
    rpm: Math.round(lerp(current.rpm, baseline.rpm, progress)),
    powerKw: parseFloat(lerp(current.powerKw, baseline.powerKw, progress).toFixed(2)),
  }
}

/** Compute machine status and health score from current telemetry vs baseline */
export function computeMachineHealth(
  machine: Machine,
  sample: TelemetrySample,
  hasActiveFault: boolean,
  recoveryProgress: number
): { status: Machine['status']; healthScore: number } {
  const b = MACHINE_BASELINES[machine.id]
  if (!b) return { status: 'healthy', healthScore: 95 }

  const baseVib = (b.vibrationMin + b.vibrationMax) / 2
  const baseTemp = (b.temperatureMin + b.temperatureMax) / 2
  const basePower = (b.powerMin + b.powerMax) / 2

  const vibDev = sample.vibration / baseVib
  const tempDev = sample.temperature / baseTemp
  const powerDev = sample.powerKw / basePower

  // Weighted deviation score
  const deviation = (vibDev * 0.4 + tempDev * 0.35 + powerDev * 0.25)

  let status: Machine['status'] = 'healthy'
  let healthScore: number

  if (recoveryProgress > 0 && recoveryProgress < 1) {
    status = 'recovering'
    healthScore = Math.round(50 + recoveryProgress * 47)
  } else if (hasActiveFault) {
    // Only enter warning or critical if there is an active fault
    if (deviation > 1.8) {
      status = 'critical'
      healthScore = Math.round(Math.max(10, 100 - (deviation - 1) * 40))
    } else {
      status = 'warning'
      // Ensure health score drops below 90 quickly when a fault is applied
      healthScore = Math.round(Math.max(30, 85 - (deviation - 1) * 20))
    }
  } else {
    status = 'healthy'
    // Keep health score high and stable during normal baseline operations (between 92-100)
    healthScore = Math.round(Math.min(100, Math.max(92, 100 - Math.abs(deviation - 1) * 12)))
  }

  return { status, healthScore }
}

/** Keep only the last N samples in a history array */
export function trimHistory(samples: TelemetrySample[], maxLen = 60): TelemetrySample[] {
  if (samples.length > maxLen) return samples.slice(samples.length - maxLen)
  return samples
}
