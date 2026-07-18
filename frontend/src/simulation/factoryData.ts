import type { Machine, ProductionLine, MachineBaseline } from './types'

// ============================================================
// Static factory floor layout — 7 machines, 2 production lines
// Canvas viewBox: 0 0 900 560
// ============================================================

export const PRODUCTION_LINES: ProductionLine[] = [
  {
    id: 'LINE-A',
    name: 'Production Line A',
    color: 'rgba(16, 185, 129, 0.08)',
    x: 20,
    y: 20,
    width: 560,
    height: 220,
  },
  {
    id: 'LINE-B',
    name: 'Production Line B',
    color: 'rgba(6, 182, 212, 0.08)',
    x: 20,
    y: 280,
    width: 560,
    height: 200,
  },
]

export const INITIAL_MACHINES: Machine[] = [
  {
    id: 'CNC-01',
    name: 'CNC Machine 01',
    type: 'cnc',
    lineId: 'LINE-A',
    gridIndex: 0,
    x: 80,
    y: 110,
    status: 'healthy',
    healthScore: 98,
    temperature: 47,
    vibration: 1.9,
    rpm: 1460,
    powerKw: 7.8,
    lastUpdated: Date.now(),
  },
  {
    id: 'CNC-02',
    name: 'CNC Machine 02',
    type: 'cnc',
    lineId: 'LINE-A',
    gridIndex: 1,
    x: 200,
    y: 110,
    status: 'healthy',
    healthScore: 95,
    temperature: 51,
    vibration: 2.2,
    rpm: 1480,
    powerKw: 8.1,
    lastUpdated: Date.now(),
  },
  {
    id: 'CNC-03',
    name: 'CNC Machine 03',
    type: 'cnc',
    lineId: 'LINE-A',
    gridIndex: 2,
    x: 320,
    y: 110,
    status: 'healthy',
    healthScore: 97,
    temperature: 49,
    vibration: 2.0,
    rpm: 1455,
    powerKw: 7.9,
    lastUpdated: Date.now(),
  },
  {
    id: 'CNC-04',
    name: 'CNC Machine 04',
    type: 'cnc',
    lineId: 'LINE-A',
    gridIndex: 3,
    x: 440,
    y: 110,
    status: 'healthy',
    healthScore: 96,
    temperature: 54,
    vibration: 2.1,
    rpm: 1450,
    powerKw: 8.4,
    lastUpdated: Date.now(),
  },
  {
    id: 'Motor-01',
    name: 'Drive Motor 01',
    type: 'motor',
    lineId: 'LINE-B',
    gridIndex: 4,
    x: 100,
    y: 375,
    status: 'healthy',
    healthScore: 99,
    temperature: 62,
    vibration: 1.4,
    rpm: 2950,
    powerKw: 15.2,
    lastUpdated: Date.now(),
  },
  {
    id: 'Pump-01',
    name: 'Coolant Pump 01',
    type: 'pump',
    lineId: 'LINE-B',
    gridIndex: 5,
    x: 250,
    y: 375,
    status: 'healthy',
    healthScore: 94,
    temperature: 38,
    vibration: 0.8,
    rpm: 1750,
    powerKw: 4.5,
    lastUpdated: Date.now(),
  },
  {
    id: 'Conveyor-01',
    name: 'Conveyor System 01',
    type: 'conveyor',
    lineId: 'LINE-B',
    x: 410,
    y: 375,
    status: 'healthy',
    healthScore: 92,
    temperature: 32,
    vibration: 1.1,
    rpm: 450,
    powerKw: 5.8,
    lastUpdated: Date.now(),
  },
]

// Baseline telemetry ranges per machine
export const MACHINE_BASELINES: Record<string, MachineBaseline> = {
  'CNC-01': { vibrationMin: 1.6, vibrationMax: 2.3, temperatureMin: 44, temperatureMax: 54, rpmMin: 1440, rpmMax: 1480, powerMin: 7.2, powerMax: 8.5 },
  'CNC-02': { vibrationMin: 1.8, vibrationMax: 2.5, temperatureMin: 47, temperatureMax: 56, rpmMin: 1460, rpmMax: 1500, powerMin: 7.5, powerMax: 8.8 },
  'CNC-03': { vibrationMin: 1.7, vibrationMax: 2.4, temperatureMin: 45, temperatureMax: 55, rpmMin: 1440, rpmMax: 1480, powerMin: 7.3, powerMax: 8.6 },
  'CNC-04': { vibrationMin: 1.8, vibrationMax: 2.5, temperatureMin: 45, temperatureMax: 60, rpmMin: 1430, rpmMax: 1470, powerMin: 7.0, powerMax: 9.0 },
  'Motor-01': { vibrationMin: 1.1, vibrationMax: 1.8, temperatureMin: 58, temperatureMax: 67, rpmMin: 2900, rpmMax: 3000, powerMin: 14.0, powerMax: 16.5 },
  'Pump-01': { vibrationMin: 0.5, vibrationMax: 1.0, temperatureMin: 34, temperatureMax: 42, rpmMin: 1720, rpmMax: 1780, powerMin: 4.0, powerMax: 5.2 },
  'Conveyor-01': { vibrationMin: 0.8, vibrationMax: 1.4, temperatureMin: 28, temperatureMax: 36, rpmMin: 430, rpmMax: 470, powerMin: 5.2, powerMax: 6.5 },
}

// For quick lookup
export const MACHINE_MAP: Record<string, Machine> = Object.fromEntries(
  INITIAL_MACHINES.map(m => [m.id, { ...m }])
)

export function getDefaultBaselineForType(type: Machine['type']): MachineBaseline {
  switch (type) {
    case 'cnc':
      return { vibrationMin: 1.6, vibrationMax: 2.5, temperatureMin: 44, temperatureMax: 58, rpmMin: 1440, rpmMax: 1480, powerMin: 7.2, powerMax: 8.8 }
    case 'motor':
      return { vibrationMin: 1.1, vibrationMax: 1.8, temperatureMin: 58, temperatureMax: 67, rpmMin: 2900, rpmMax: 3000, powerMin: 14.0, powerMax: 16.5 }
    case 'pump':
      return { vibrationMin: 0.5, vibrationMax: 1.0, temperatureMin: 34, temperatureMax: 42, rpmMin: 1720, rpmMax: 1780, powerMin: 4.0, powerMax: 5.2 }
    case 'conveyor':
      return { vibrationMin: 0.8, vibrationMax: 1.4, temperatureMin: 28, temperatureMax: 36, rpmMin: 430, rpmMax: 470, powerMin: 5.2, powerMax: 6.5 }
  }
}
