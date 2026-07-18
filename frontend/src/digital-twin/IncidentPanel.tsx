import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, Cpu, Brain, TrendingUp } from 'lucide-react'
import CorrelationTimeline from './CorrelationTimeline'
import AIRecommendationPanel from './AIRecommendationPanel'
import type { SimulationState } from '../simulation/types'

interface IncidentPanelProps {
  state: SimulationState
  liveIncidents?: any[]
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

export default function IncidentPanel({ 
  state,
  liveIncidents = []
}: IncidentPanelProps) {
  const activeIncident = state.incidents.find(i => i.status !== 'resolved')
    ?? state.incidents[state.incidents.length - 1]

  const recommendation = activeIncident ? state.recommendations[activeIncident.id] : null

  const [liveRecommendation, setLiveRecommendation] = useState<any | null>(null)
  const [loadingLiveRecommendation, setLoadingLiveRecommendation] = useState(false)

  useEffect(() => {
    if (!activeIncident || !liveIncidents || liveIncidents.length === 0) {
      setLiveRecommendation(null)
      return
    }

    // Match backend incident by asset name (machine ID)
    const matchingBackendIncident = liveIncidents.find(
      (inc: any) => inc.asset.toLowerCase() === activeIncident.machineId.toLowerCase()
    )

    if (matchingBackendIncident) {
      const fetchRecommendation = async () => {
        setLoadingLiveRecommendation(true)
        try {
          const res = await fetch(`http://localhost:8000/api/recommendations/${matchingBackendIncident.incident_id}`)
          if (res.ok) {
            const data = await res.json()
            setLiveRecommendation(data)
          } else {
            setLiveRecommendation(null)
          }
        } catch (e) {
          console.error("Failed to load Gemini recommendation in IncidentPanel:", e)
          setLiveRecommendation(null)
        } finally {
          setLoadingLiveRecommendation(false)
        }
      }
      fetchRecommendation()
    } else {
      setLiveRecommendation(null)
    }
  }, [activeIncident, liveIncidents])

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

              {/* Dynamic AI Explanation directly inside the incident card */}
              {(loadingLiveRecommendation || liveRecommendation) && (
                <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '0.5rem', background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.15)', borderLeft: '3px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    <Brain size={12} style={{ color: '#8b5cf6' }} />
                    <span>AI Real-time Diagnosis</span>
                  </div>
                  {loadingLiveRecommendation ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        style={{ border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--accent-primary)', borderRadius: '50%', width: '10px', height: '10px' }}
                      />
                      <span>Analyzing telemetry drift...</span>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        {liveRecommendation.summary}
                      </p>
                      {liveRecommendation.operator_explanation && (
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          <strong>Technical Cause:</strong> {liveRecommendation.operator_explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

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
            {loadingLiveRecommendation ? (
              <div className="ai-rec-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{ border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--accent-primary)', borderRadius: '50%', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Querying Gemini 3.5 Flash...</span>
              </div>
            ) : liveRecommendation ? (
              <motion.div
                className="ai-rec-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="ai-rec-header">
                  <div className="ai-rec-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                    <Brain size={14} />
                  </div>
                  <div>
                    <div className="ai-rec-title">AI Live Predictive Analysis</div>
                    <div className="ai-rec-source">Generated via ForgeMind AI Intelligence Layer</div>
                  </div>
                </div>

                <div className="ai-rec-divider" />

                <div className="ai-rec-section">
                  <div className="ai-rec-section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Cpu size={11} />
                    Probable Cause & Diagnosis
                  </div>
                  <p className="ai-rec-text">{liveRecommendation.summary}</p>
                </div>

                {liveRecommendation.operator_explanation && (
                  <div className="ai-rec-section">
                    <div className="ai-rec-section-label">Operator Explanation</div>
                    <p className="ai-rec-text" style={{ fontSize: '0.80rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                      {liveRecommendation.operator_explanation}
                    </p>
                  </div>
                )}

                <div className="ai-rec-action-box">
                  <div className="ai-rec-section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <TrendingUp size={11} />
                    Recommended Actions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {(liveRecommendation.recommended_actions || liveRecommendation.recommendedActions || []).map((act: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.80rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-main)' }}>{act.action}</span>
                        <span className="status-badge bg-brand-light text-brand" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>{act.timeline}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ai-rec-disclaimer">
                  AI interpretation of algorithmically verified evidence. Not a substitute for qualified engineering judgment.
                </div>
              </motion.div>
            ) : recommendation ? (
              <AIRecommendationPanel recommendation={recommendation} />
            ) : null}
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
