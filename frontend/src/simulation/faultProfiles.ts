import type { FaultProfile } from './types'

// ============================================================
// Fault profiles — each defines a degradation curve
// t = seconds elapsed since fault injection
// multipliers are applied to the CURRENT reading, not baseline
// ============================================================

export const FAULT_PROFILES: FaultProfile[] = [
  {
    id: 'bearing_degradation',
    name: 'Bearing Degradation',
    description: 'Gradually increases vibration, followed by temperature and power consumption.',
    compatibleTypes: ['cnc', 'motor'],
    icon: 'AlertTriangle',
    severity: 'high',
    curve: [
      { t: 0,  vibrationMult: 1.0, temperatureMult: 1.0, powerMult: 1.0, rpmMult: 1.0 },
      { t: 10, vibrationMult: 1.4, temperatureMult: 1.0, powerMult: 1.02, rpmMult: 0.99 },
      { t: 20, vibrationMult: 1.9, temperatureMult: 1.05, powerMult: 1.08, rpmMult: 0.98 },
      { t: 30, vibrationMult: 2.6, temperatureMult: 1.12, powerMult: 1.18, rpmMult: 0.97 },
      { t: 45, vibrationMult: 3.1, temperatureMult: 1.22, powerMult: 1.35, rpmMult: 0.95 },
      { t: 60, vibrationMult: 3.6, temperatureMult: 1.35, powerMult: 1.52, rpmMult: 0.93 },
      { t: 90, vibrationMult: 4.2, temperatureMult: 1.48, powerMult: 1.68, rpmMult: 0.90 },
    ],
  },
  {
    id: 'cooling_failure',
    name: 'Cooling Failure',
    description: 'Progressive temperature increase and health degradation.',
    compatibleTypes: ['cnc', 'motor'],
    icon: 'Thermometer',
    severity: 'high',
    curve: [
      { t: 0,  vibrationMult: 1.0, temperatureMult: 1.0, powerMult: 1.0, rpmMult: 1.0 },
      { t: 10, vibrationMult: 1.0, temperatureMult: 1.12, powerMult: 1.05, rpmMult: 1.0 },
      { t: 20, vibrationMult: 1.05, temperatureMult: 1.28, powerMult: 1.10, rpmMult: 0.99 },
      { t: 35, vibrationMult: 1.10, temperatureMult: 1.48, powerMult: 1.18, rpmMult: 0.98 },
      { t: 50, vibrationMult: 1.15, temperatureMult: 1.70, powerMult: 1.28, rpmMult: 0.96 },
      { t: 70, vibrationMult: 1.22, temperatureMult: 1.95, powerMult: 1.40, rpmMult: 0.94 },
    ],
  },
  {
    id: 'motor_overload',
    name: 'Motor Overload',
    description: 'Increases power consumption and temperature, may introduce vibration.',
    compatibleTypes: ['motor', 'cnc'],
    icon: 'Zap',
    severity: 'critical',
    curve: [
      { t: 0,  vibrationMult: 1.0, temperatureMult: 1.0, powerMult: 1.0, rpmMult: 1.0 },
      { t: 5,  vibrationMult: 1.05, temperatureMult: 1.08, powerMult: 1.25, rpmMult: 1.02 },
      { t: 15, vibrationMult: 1.12, temperatureMult: 1.18, powerMult: 1.55, rpmMult: 1.04 },
      { t: 30, vibrationMult: 1.20, temperatureMult: 1.32, powerMult: 1.80, rpmMult: 1.05 },
      { t: 50, vibrationMult: 1.35, temperatureMult: 1.50, powerMult: 2.10, rpmMult: 1.06 },
    ],
  },
  {
    id: 'energy_inefficiency',
    name: 'Energy Inefficiency',
    description: 'Abnormal power consumption relative to production baseline.',
    compatibleTypes: ['cnc', 'motor', 'pump', 'conveyor'],
    icon: 'TrendingUp',
    severity: 'medium',
    curve: [
      { t: 0,  vibrationMult: 1.0, temperatureMult: 1.0, powerMult: 1.0, rpmMult: 1.0 },
      { t: 10, vibrationMult: 1.0, temperatureMult: 1.02, powerMult: 1.18, rpmMult: 1.0 },
      { t: 25, vibrationMult: 1.02, temperatureMult: 1.06, powerMult: 1.40, rpmMult: 1.0 },
      { t: 45, vibrationMult: 1.04, temperatureMult: 1.10, powerMult: 1.62, rpmMult: 1.0 },
    ],
  },
  {
    id: 'restricted_zone',
    name: 'Restricted Zone Event',
    description: 'Worker entering a restricted safety zone near an active machine.',
    compatibleTypes: ['cnc', 'motor', 'conveyor'],
    icon: 'ShieldAlert',
    severity: 'critical',
    // No telemetry degradation — this is a safety event
    curve: [
      { t: 0, vibrationMult: 1.0, temperatureMult: 1.0, powerMult: 1.0, rpmMult: 1.0 },
    ],
  },
]

export const FAULT_PROFILE_MAP: Record<string, FaultProfile> = Object.fromEntries(
  FAULT_PROFILES.map(f => [f.id, f])
)

/** Interpolate the degradation multipliers at a given elapsed time */
export function interpolateCurve(curve: FaultProfile['curve'], elapsedSeconds: number) {
  if (curve.length === 0) return { vibrationMult: 1, temperatureMult: 1, powerMult: 1, rpmMult: 1 }

  // Clamp to last point
  if (elapsedSeconds >= curve[curve.length - 1].t) return curve[curve.length - 1]
  if (elapsedSeconds <= curve[0].t) return curve[0]

  for (let i = 1; i < curve.length; i++) {
    if (elapsedSeconds <= curve[i].t) {
      const prev = curve[i - 1]
      const next = curve[i]
      const frac = (elapsedSeconds - prev.t) / (next.t - prev.t)
      return {
        t: elapsedSeconds,
        vibrationMult: prev.vibrationMult + (next.vibrationMult - prev.vibrationMult) * frac,
        temperatureMult: prev.temperatureMult + (next.temperatureMult - prev.temperatureMult) * frac,
        powerMult: prev.powerMult + (next.powerMult - prev.powerMult) * frac,
        rpmMult: prev.rpmMult + (next.rpmMult - prev.rpmMult) * frac,
      }
    }
  }
  return curve[curve.length - 1]
}
