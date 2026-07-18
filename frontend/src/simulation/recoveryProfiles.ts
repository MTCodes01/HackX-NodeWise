import type { RecoveryProfile } from './types'

// ============================================================
// Recovery action profiles
// ============================================================

export const RECOVERY_PROFILES: RecoveryProfile[] = [
  {
    id: 'preventive_maintenance',
    name: 'Preventive Maintenance',
    description: 'Gradually restores vibration and temperature to baseline over time.',
    icon: 'Wrench',
    effect: 'gradual_restore',
    durationSeconds: 60,
  },
  {
    id: 'emergency_inspection',
    name: 'Emergency Inspection',
    description: 'Stops degradation immediately and places machine into inspection state.',
    icon: 'Search',
    effect: 'stop_degradation',
    durationSeconds: 30,
  },
  {
    id: 'energy_optimization',
    name: 'Energy Optimization',
    description: 'Gradually reduces abnormal power consumption back to baseline.',
    icon: 'Battery',
    effect: 'reduce_power',
    durationSeconds: 45,
  },
  {
    id: 'reset_machine',
    name: 'Reset Machine',
    description: 'Returns the simulation to a fully normal baseline state immediately.',
    icon: 'RefreshCw',
    effect: 'full_reset',
    durationSeconds: 5,
  },
]

export const RECOVERY_PROFILE_MAP: Record<string, RecoveryProfile> = Object.fromEntries(
  RECOVERY_PROFILES.map(r => [r.id, r])
)

/**
 * Returns a 0–1 progress value for the recovery.
 * 1.0 = fully recovered.
 */
export function getRecoveryProgress(startedAt: number, durationSeconds: number, simulationSpeed: number): number {
  const elapsed = (Date.now() - startedAt) / 1000 * simulationSpeed
  return Math.min(elapsed / durationSeconds, 1)
}
