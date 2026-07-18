import { motion } from 'framer-motion'
import type { Incident, Anomaly, Correlation } from '../simulation/types'

interface CorrelationTimelineProps {
  incidents: Incident[]
  anomalies: Anomaly[]
  correlations: Correlation[]
}

const DOMAIN_CONFIG = {
  machine_health: { label: 'Machine Health', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  energy: { label: 'Energy', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  safety: { label: 'Safety', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function CorrelationTimeline({ incidents, anomalies, correlations }: CorrelationTimelineProps) {
  const activeIncident = incidents.find(i => i.status !== 'resolved')
  const relevantAnomalies = activeIncident
    ? anomalies.filter(a => activeIncident.evidence.some(e => e.label.toLowerCase().includes(a.metric)))
    : anomalies.filter(a => a.isActive).slice(0, 5)
  const correlation = activeIncident
    ? correlations.find(c => c.id === activeIncident.correlationId)
    : null

  if (relevantAnomalies.length === 0 && !activeIncident) return null

  // Build timeline events
  const events: { time: number; label: string; type: 'anomaly' | 'correlation' | 'incident'; domain?: Anomaly['domain'] }[] = []

  for (const a of relevantAnomalies.slice(0, 4)) {
    events.push({ time: a.detectedAt, label: `${a.metric} anomaly — ${a.machineId} (+${a.deviation}%)`, type: 'anomaly', domain: a.domain })
  }
  if (correlation) {
    events.push({ time: correlation.createdAt, label: `Cross-domain correlation (${Math.round(correlation.score * 100)}% confidence)`, type: 'correlation' })
  }
  if (activeIncident) {
    events.push({ time: activeIncident.createdAt, label: `Incident ${activeIncident.id} created — ${activeIncident.title}`, type: 'incident' })
  }

  events.sort((a, b) => a.time - b.time)

  const typeConfig = {
    anomaly: { color: '#f59e0b', dot: '#f59e0b', label: 'ANOMALY' },
    correlation: { color: '#8b5cf6', dot: '#8b5cf6', label: 'CORRELATION' },
    incident: { color: '#ef4444', dot: '#ef4444', label: 'INCIDENT' },
  }

  return (
    <div className="correlation-timeline">
      <div className="ct-header">
        <span className="ct-title">Correlation Timeline</span>
        {correlation && (
          <span className="ct-score">Score: {Math.round(correlation.score * 100)}%</span>
        )}
      </div>

      {/* Domain badges */}
      {correlation && (
        <div className="ct-domains">
          {correlation.domains.map(d => {
            const cfg = DOMAIN_CONFIG[d]
            return (
              <span key={d} className="ct-domain-badge" style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.label}
              </span>
            )
          })}
        </div>
      )}

      {/* Timeline events */}
      <div className="ct-events">
        {events.map((ev, i) => {
          const cfg = typeConfig[ev.type]
          const domainCfg = ev.domain ? DOMAIN_CONFIG[ev.domain] : null
          return (
            <motion.div
              key={i}
              className="ct-event"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Connector */}
              <div className="ct-connector">
                <motion.div
                  className="ct-dot"
                  style={{ background: domainCfg?.color ?? cfg.dot }}
                  animate={ev.type === 'incident' ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                {i < events.length - 1 && (
                  <motion.div
                    className="ct-line"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.1 + 0.2, duration: 0.3 }}
                  />
                )}
              </div>
              {/* Content */}
              <div className="ct-event-content">
                <div className="ct-event-time">{formatTime(ev.time)}</div>
                <span className="ct-event-tag" style={{ color: cfg.color, background: `${cfg.color}18` }}>
                  {cfg.label}
                </span>
                <div className="ct-event-label">{ev.label}</div>
              </div>
            </motion.div>
          )
        })}

        {events.length === 0 && (
          <div className="ct-empty">No correlated events yet</div>
        )}
      </div>
    </div>
  )
}
