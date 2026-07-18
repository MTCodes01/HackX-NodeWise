import { Pause, Play, RefreshCw, Zap } from 'lucide-react'
import type { SimulationSpeed, DemoScenario } from '../simulation/types'

interface DemoToolbarProps {
  isPaused: boolean
  speed: SimulationSpeed
  onSetSpeed: (speed: SimulationSpeed) => void
  onTogglePause: () => void
  onReset: () => void
  onRunScenario: (scenario: DemoScenario) => void
}

const SCENARIOS: { id: DemoScenario; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'bearing_degradation', label: 'Bearing Degradation' },
  { id: 'energy_anomaly', label: 'Energy Anomaly' },
  { id: 'multi_domain_critical', label: 'Multi-Domain Critical' },
]

export default function DemoToolbar({
  isPaused, speed, onSetSpeed, onTogglePause, onReset, onRunScenario
}: DemoToolbarProps) {
  return (
    <div className="demo-toolbar">
      {/* Playback Controls */}
      <div className="demo-toolbar-group">
        <button
          className={`demo-tb-btn ${isPaused ? 'paused' : 'playing'}`}
          onClick={onTogglePause}
          title={isPaused ? 'Resume simulation' : 'Pause simulation'}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button className="demo-tb-btn demo-btn-reset" onClick={onReset} title="Reset factory to baseline">
          <RefreshCw size={14} />
          Reset
        </button>
      </div>

      <div className="demo-toolbar-divider" />

      {/* Speed Controls */}
      <div className="demo-toolbar-group">
        <span className="demo-tb-label">Speed</span>
        <div className="demo-speed-toggle">
          {([1, 2, 4] as SimulationSpeed[]).map(s => (
            <button
              key={s}
              className={`demo-speed-pip ${speed === s ? 'active' : ''}`}
              onClick={() => onSetSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="demo-toolbar-divider" />

      {/* Scenarios */}
      <div className="demo-toolbar-group flex-1">
        <span className="demo-tb-label">
          <Zap size={12} style={{ color: '#10b981' }} />
          Scenarios
        </span>
        <div className="demo-scenarios-row">
          {SCENARIOS.map(sc => (
            <button
              key={sc.id}
              className="demo-scenario-pill"
              onClick={() => onRunScenario(sc.id)}
            >
              ▶ {sc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
