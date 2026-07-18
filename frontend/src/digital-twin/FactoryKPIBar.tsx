import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Zap, ShieldCheck } from 'lucide-react'
import type { SimulationState } from '../simulation/types'

interface FactoryKPIBarProps {
  state: SimulationState
}

export default function FactoryKPIBar({ state }: FactoryKPIBarProps) {
  const machines = Object.values(state.machines)
  const healthyCount = machines.filter(m => m.status === 'healthy').length
  const warningCount = machines.filter(m => m.status === 'warning').length
  const criticalCount = machines.filter(m => m.status === 'critical').length
  const activeIncidents = state.incidents.filter(i => i.status === 'active').length

  const avgPower = machines.reduce((s, m) => s + m.powerKw, 0)
  const energyEff = Math.round(Math.max(60, 100 - (criticalCount * 8) - (warningCount * 3)))

  const score = state.factoryIntelligenceScore
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="factory-kpi-bar">
      {/* Intelligence Score */}
      <div className="kpi-score-card">
        <div className="kpi-score-label">Factory Intelligence Score</div>
        <motion.div
          className="kpi-score-value"
          key={score}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          style={{ color: scoreColor }}
        >
          {score}
          <span className="kpi-score-max">/100</span>
        </motion.div>
      </div>

      <div className="kpi-divider" />

      {/* KPI tiles */}
      <div className="kpi-tile">
        <Activity size={14} style={{ color: '#10b981' }} />
        <div>
          <div className="kpi-tile-value" style={{ color: '#10b981' }}>{healthyCount}</div>
          <div className="kpi-tile-label">Healthy</div>
        </div>
      </div>

      <div className="kpi-tile">
        <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
        <div>
          <motion.div
            className="kpi-tile-value"
            key={warningCount}
            animate={{ scale: warningCount > 0 ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.4 }}
            style={{ color: warningCount > 0 ? '#f59e0b' : 'var(--text-muted)' }}
          >
            {warningCount}
          </motion.div>
          <div className="kpi-tile-label">Warnings</div>
        </div>
      </div>

      <div className="kpi-tile">
        <ShieldCheck size={14} style={{ color: criticalCount > 0 ? '#ef4444' : '#10b981' }} />
        <div>
          <motion.div
            className="kpi-tile-value"
            key={criticalCount}
            animate={{ scale: criticalCount > 0 ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.4 }}
            style={{ color: criticalCount > 0 ? '#ef4444' : 'var(--text-muted)' }}
          >
            {criticalCount > 0 ? criticalCount : 0}
          </motion.div>
          <div className="kpi-tile-label">Critical</div>
        </div>
      </div>

      <div className="kpi-tile">
        <Zap size={14} style={{ color: '#f59e0b' }} />
        <div>
          <div className="kpi-tile-value" style={{ color: energyEff >= 85 ? '#10b981' : '#f59e0b' }}>
            {energyEff}%
          </div>
          <div className="kpi-tile-label">Energy Eff.</div>
        </div>
      </div>

      <div className="kpi-tile">
        <AlertTriangle size={14} style={{ color: activeIncidents > 0 ? '#ef4444' : '#10b981' }} />
        <div>
          <motion.div
            className="kpi-tile-value"
            key={activeIncidents}
            animate={{ scale: activeIncidents > 0 ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5 }}
            style={{ color: activeIncidents > 0 ? '#ef4444' : 'var(--text-muted)' }}
          >
            {activeIncidents}
          </motion.div>
          <div className="kpi-tile-label">Incidents</div>
        </div>
      </div>

      <div className="kpi-tile">
        <Zap size={14} style={{ color: '#94a3b8' }} />
        <div>
          <div className="kpi-tile-value" style={{ color: 'var(--text-main)' }}>{avgPower.toFixed(1)} kW</div>
          <div className="kpi-tile-label">Total Power</div>
        </div>
      </div>
    </div>
  )
}
