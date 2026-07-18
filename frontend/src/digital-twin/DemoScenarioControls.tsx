import { Pause, Play, RefreshCw, Zap } from 'lucide-react'
import type { SimulationSpeed, DemoScenario } from '../simulation/types'

interface DemoScenarioControlsProps {
  isPaused: boolean
  speed: SimulationSpeed
  onSetSpeed: (speed: SimulationSpeed) => void
  onTogglePause: () => void
  onReset: () => void
  onRunScenario: (scenario: DemoScenario) => void
}

const SCENARIOS: { id: DemoScenario; label: string }[] = [
  { id: 'normal', label: 'Normal Operation' },
  { id: 'bearing_degradation', label: 'Bearing Degradation' },
  { id: 'energy_anomaly', label: 'Energy Anomaly' },
  { id: 'multi_domain_critical', label: 'Multi-Domain Critical' },
]

export default function DemoScenarioControls({
  isPaused, speed, onSetSpeed, onTogglePause, onReset, onRunScenario
}: DemoScenarioControlsProps) {
  return (
    <div className="demo-controls">
      {/* Playback controls */}
      <div className="demo-playback">
        <button
          className="demo-btn"
          onClick={onTogglePause}
          title={isPaused ? 'Resume simulation' : 'Pause simulation'}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button className="demo-btn demo-btn-reset" onClick={onReset} title="Reset factory to baseline">
          <RefreshCw size={14} />
          Reset
        </button>
      </div>

      {/* Speed control */}
      <div className="demo-speed">
        <span className="demo-speed-label">Speed</span>
        {([1, 2, 4] as SimulationSpeed[]).map(s => (
          <button
            key={s}
            className={`demo-speed-btn ${speed === s ? 'active' : ''}`}
            onClick={() => onSetSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Demo scenarios */}
      <div className="demo-scenarios">
        <div className="demo-scenario-label">
          <Zap size={11} style={{ color: '#10b981' }} />
          Demo Scenarios
        </div>
        {SCENARIOS.map(sc => (
          <button
            key={sc.id}
            className="demo-scenario-btn"
            onClick={() => onRunScenario(sc.id)}
          >
            ▶ {sc.label}
          </button>
        ))}
      </div>
    </div>
  )
}
