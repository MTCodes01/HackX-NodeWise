import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import CorrelationTimeline from './CorrelationTimeline'
import AIRecommendationPanel from './AIRecommendationPanel'
import type { SimulationState } from '../simulation/types'

interface IncidentPanelProps {
  state: SimulationState
}

const PRIORITY_CONFIG = {
  low: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'LOW' },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'MEDIUM' },
  high: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'HIGH' },
  critical: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', label: 'CRITICAL' },
}

const STATUS_CONFIG = {
  active: { color: '#ef4444', label: 'ACTIVE' },
  mitigating: { color: '#f59e0b', label: 'MITIGATING' },
  resolved: { color: '#10b981', label: 'RESOLVED' },
}

export default function IncidentPanel({ state }: IncidentPanelProps) {
  const activeIncident = state.incidents.find(i => i.status !== 'resolved')
    ?? state.incidents[state.incidents.length - 1]

  const recommendation = activeIncident ? state.recommendations[activeIncident.id] : null

  return (
    <div className="incident-panel">
      <AnimatePresence mode="wait">
        {activeIncident ? (
          <motion.div
            key={activeIncident.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Incident Card */}
            <div className="incident-card">
              <div className="incident-card-header">
                <div className="incident-id-row">
                  <AlertTriangle size={14} style={{ color: PRIORITY_CONFIG[activeIncident.priority].color }} />
                  <span className="incident-id">{activeIncident.id}</span>
                  <span className="incident-priority-badge"
                    style={{
                      color: PRIORITY_CONFIG[activeIncident.priority].color,
                      background: PRIORITY_CONFIG[activeIncident.priority].bg,
                    }}>
                    {PRIORITY_CONFIG[activeIncident.priority].label}
                  </span>
                </div>
                <motion.div
                  className="incident-status-badge"
                  key={activeIncident.status}
                  animate={{ scale: [1, 1.05, 1] }}
                  style={{ color: STATUS_CONFIG[activeIncident.status].color }}
                >
                  {STATUS_CONFIG[activeIncident.status].label}
                </motion.div>
              </div>

              <div className="incident-title">{activeIncident.title}</div>

              <div className="incident-meta">
                <div className="incident-meta-item">
                  <span className="incident-meta-label">Machine</span>
                  <span className="incident-meta-val">{activeIncident.machineId}</span>
                </div>
                <div className="incident-meta-item">
                  <span className="incident-meta-label">Line</span>
                  <span className="incident-meta-val">{activeIncident.lineId}</span>
                </div>
                <div className="incident-meta-item">
                  <span className="incident-meta-label">Correlation</span>
                  <span className="incident-meta-val">{Math.round(activeIncident.correlationScore * 100)}%</span>
                </div>
                <div className="incident-meta-item">
                  <span className="incident-meta-label">
                    <Clock size={10} /> Created
                  </span>
                  <span className="incident-meta-val">
                    {new Date(activeIncident.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Evidence — clearly labeled as algorithmic */}
              <div className="incident-evidence-header">
                <span className="incident-evidence-title">Verified Evidence</span>
                <span className="incident-algorithmic-badge">Detected algorithmically</span>
              </div>
              <div className="incident-evidence-list">
                {activeIncident.evidence.map((ev, i) => (
                  <div key={i} className="incident-evidence-row">
                    <div className="incident-evidence-meta">
                      <span className={`incident-evidence-domain domain-${ev.domain}`}>
                        {ev.domain.replace(/_/g, ' ')}
                      </span>
                      <span className="incident-evidence-label">{ev.label}</span>
                    </div>
                    <div className="incident-evidence-deviation">
                      +{ev.deviationPct}%
                      <div className="incident-evidence-bar-bg">
                        <motion.div
                          className="incident-evidence-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(ev.deviationPct, 100)}%` }}
                          transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                          style={{ background: ev.deviationPct > 40 ? '#ef4444' : '#f59e0b' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Correlation Timeline */}
            <CorrelationTimeline
              incidents={state.incidents}
              anomalies={state.anomalies}
              correlations={state.correlations}
            />

            {/* AI Recommendation */}
            {recommendation && (
              <AIRecommendationPanel recommendation={recommendation} />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="no-incident"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="incident-panel-empty"
          >
            <CheckCircle size={28} style={{ color: '#10b981', opacity: 0.5 }} />
            <div className="incident-panel-empty-title">No Active Incidents</div>
            <div className="incident-panel-empty-sub">
              Inject a fault to simulate an operational scenario
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past incidents */}
      {state.incidents.filter(i => i.status === 'resolved').length > 0 && (
        <div className="past-incidents">
          <div className="past-incidents-title">Past Incidents</div>
          {state.incidents.filter(i => i.status === 'resolved').map(i => (
            <div key={i.id} className="past-incident-row">
              <CheckCircle size={11} style={{ color: '#10b981' }} />
              <span className="past-incident-id">{i.id}</span>
              <span className="past-incident-title">{i.title}</span>
              <span className="past-incident-time">
                {new Date(i.resolvedAt ?? i.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
