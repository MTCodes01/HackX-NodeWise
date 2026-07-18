import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Thermometer, Zap, Gauge } from 'lucide-react'
import TelemetrySparkline from './TelemetrySparkline'
import type { SimulationState } from '../simulation/types'
import { MACHINE_BASELINES } from '../simulation/factoryData'

interface MachineDetailsPanelProps {
  state: SimulationState
  onClose: () => void
  onDropRecovery: (recoveryType: string, machineId: string) => void
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Healthy', color: '#10b981' },
  warning: { label: 'Warning', color: '#f59e0b' },
  critical: { label: 'Critical', color: '#ef4444' },
  offline: { label: 'Offline', color: '#94a3b8' },
  recovering: { label: 'Recovering', color: '#06b6d4' },
}

export default function MachineDetailsPanel({ state, onClose, onDropRecovery }: MachineDetailsPanelProps) {
  const machineId = state.selectedMachineId
  const machine = machineId ? state.machines[machineId] : null
  const history = machineId ? (state.telemetryHistory[machineId] ?? []) : []
  const baseline = machineId ? MACHINE_BASELINES[machineId] : null

  const activeIncident = state.incidents.find(
    i => i.machineId === machineId && i.status !== 'resolved'
  )
  const anomalies = state.anomalies.filter(a => a.machineId === machineId && a.isActive)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const recoveryType = e.dataTransfer.getData('recoveryType')
    if (recoveryType && machineId) {
      onDropRecovery(recoveryType, machineId)
    }
  }

  return (
    <AnimatePresence>
      {machine && (
        <motion.div
          className="machine-details-panel"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="mdp-header">
            <div>
              <div className="mdp-machine-id">{machine.id}</div>
              <div className="mdp-machine-name">{machine.name}</div>
              <div className="mdp-line">{machine.lineId}</div>
            </div>
            <button className="mdp-close" onClick={onClose}><X size={16} /></button>
          </div>

          {/* Status + Health */}
          <div className="mdp-status-row">
            <div className="mdp-status-card">
              <div className="mdp-status-label">Status</div>
              <div className="mdp-status-value" style={{ color: STATUS_LABELS[machine.status]?.color }}>
                <span className="mdp-status-dot" style={{ background: STATUS_LABELS[machine.status]?.color }} />
                {STATUS_LABELS[machine.status]?.label}
              </div>
            </div>
            <div className="mdp-status-card">
              <div className="mdp-status-label">Health Score</div>
              <div className="mdp-health-value" style={{
                color: machine.healthScore >= 80 ? '#10b981' : machine.healthScore >= 60 ? '#f59e0b' : '#ef4444'
              }}>
                {machine.healthScore}<span className="mdp-health-max">/100</span>
              </div>
            </div>
          </div>

          {/* Live Metrics */}
          <div className="mdp-section-title">Live Telemetry</div>
          <div className="mdp-metrics-grid">
            <div className="mdp-metric">
              <Activity size={12} style={{ color: '#10b981' }} />
              <div className="mdp-metric-value">{machine.vibration.toFixed(2)}</div>
              <div className="mdp-metric-label">Vibration mm/s</div>
            </div>
            <div className="mdp-metric">
              <Thermometer size={12} style={{ color: '#f59e0b' }} />
              <div className="mdp-metric-value">{machine.temperature.toFixed(1)}</div>
              <div className="mdp-metric-label">Temperature °C</div>
            </div>
            <div className="mdp-metric">
              <Gauge size={12} style={{ color: '#06b6d4' }} />
              <div className="mdp-metric-value">{machine.rpm.toLocaleString()}</div>
              <div className="mdp-metric-label">RPM</div>
            </div>
            <div className="mdp-metric">
              <Zap size={12} style={{ color: '#8b5cf6' }} />
              <div className="mdp-metric-value">{machine.powerKw.toFixed(1)}</div>
              <div className="mdp-metric-label">Power kW</div>
            </div>
          </div>

          {/* Sparkline Charts */}
          <div className="mdp-section-title">Telemetry History</div>
          <div className="mdp-sparklines">
            <TelemetrySparkline
              data={history}
              metric="vibration"
              label="Vibration"
              unit="mm/s"
              warningThreshold={baseline ? baseline.vibrationMax * 1.4 : undefined}
              criticalThreshold={baseline ? baseline.vibrationMax * 2.0 : undefined}
              color="#10b981"
            />
            <TelemetrySparkline
              data={history}
              metric="temperature"
              label="Temperature"
              unit="°C"
              warningThreshold={baseline ? baseline.temperatureMax * 1.2 : undefined}
              criticalThreshold={baseline ? baseline.temperatureMax * 1.45 : undefined}
              color="#f59e0b"
            />
            <TelemetrySparkline
              data={history}
              metric="powerKw"
              label="Power"
              unit="kW"
              warningThreshold={baseline ? baseline.powerMax * 1.25 : undefined}
              color="#8b5cf6"
            />
          </div>

          {/* Anomaly Status */}
          {anomalies.length > 0 && (
            <div className="mdp-anomaly-section">
              <div className="mdp-section-title">Active Anomalies</div>
              {anomalies.map(a => (
                <div key={a.id} className="mdp-anomaly-row">
                  <span className="mdp-anomaly-domain">{a.domain.replace(/_/g, ' ')}</span>
                  <span className="mdp-anomaly-metric">{a.metric}</span>
                  <span className="mdp-anomaly-dev">+{a.deviation}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Incident reference */}
          {activeIncident && (
            <div className="mdp-incident-ref">
              <div className="mdp-incident-ref-id">{activeIncident.id}</div>
              <div className="mdp-incident-ref-title">{activeIncident.title}</div>
              <div className={`mdp-incident-status status-${activeIncident.status}`}>
                {activeIncident.status.toUpperCase()}
              </div>
            </div>
          )}

          {/* Drop zone for recovery */}
          <div className="mdp-drop-zone" onDragOver={handleDragOver} onDrop={handleDrop}>
            <div className="mdp-drop-hint">Drop a Recovery Action here</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
