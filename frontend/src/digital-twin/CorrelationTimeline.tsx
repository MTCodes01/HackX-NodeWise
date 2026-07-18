import { motion } from 'framer-motion'

interface CorrelationTimelineProps {
  incidents: any[]
  anomalies?: any[]
  correlations?: any[]
}

const DOMAIN_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
  machine: { label: 'Machine Health', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  energy: { label: 'Energy', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  vision: { label: 'Safety', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

function parseTime(ts: string): number {
  if (ts.includes('T')) return new Date(ts).getTime();
  const today = new Date();
  const [h, m, s] = ts.split(':').map(Number);
  today.setHours(h, m, s, 0);
  return today.getTime();
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function CorrelationTimeline({ incidents }: CorrelationTimelineProps) {
  const activeIncident = incidents && incidents.length > 0 ? incidents[incidents.length - 1] : null;
  
  if (!activeIncident) return null

  // Build timeline events
  const events: { time: number; label: string; type: 'anomaly' | 'correlation' | 'incident'; domain?: string }[] = []

  const evidenceList = activeIncident.verified_evidence || [];
  
  for (const a of evidenceList.slice(0, 4)) {
    events.push({ 
      time: parseTime(a.timestamp), 
      label: `${a.metric} anomaly — ${a.machine_id || activeIncident.asset} (+${Math.round(a.deviation_pct)}%)`, 
      type: 'anomaly', 
      domain: a.domain 
    })
  }

  // Synthesize a correlation event if there are multiple pieces of evidence
  if (evidenceList.length > 1) {
     const lastAnomalyTime = Math.max(...events.filter(e => e.type === 'anomaly').map(e => e.time));
     events.push({ 
       time: lastAnomalyTime + 1000, 
       label: `Cross-domain correlation (${Math.round(activeIncident.correlation_score * 100)}% confidence)`, 
       type: 'correlation' 
     })
  }

  events.push({ 
    time: parseTime(activeIncident.start_time), 
    label: `Incident ${activeIncident.incident_id} created — ${activeIncident.detection_summary}`, 
    type: 'incident' 
  })

  events.sort((a, b) => a.time - b.time)

  const typeConfig = {
    anomaly: { color: '#f59e0b', dot: '#f59e0b', label: 'ANOMALY' },
    correlation: { color: '#8b5cf6', dot: '#8b5cf6', label: 'CORRELATION' },
    incident: { color: '#ef4444', dot: '#ef4444', label: 'INCIDENT' },
  }
  
  const domains = Array.from(new Set(evidenceList.map((e: any) => e.domain)));

  return (
    <div className="correlation-timeline">
      <div className="ct-header">
        <span className="ct-title">Correlation Timeline</span>
        <span className="ct-score">Score: {Math.round(activeIncident.correlation_score * 100)}%</span>
      </div>

      {/* Domain badges */}
      <div className="ct-domains">
        {domains.map((d: any) => {
          const cfg = DOMAIN_CONFIG[d] || DOMAIN_CONFIG['machine'];
          return (
            <span key={d} className="ct-domain-badge" style={{ color: cfg.color, background: cfg.bg }}>
              {cfg.label}
            </span>
          )
        })}
      </div>

      {/* Timeline events */}
      <div className="ct-events">
        {events.map((ev, i) => {
          const cfg = typeConfig[ev.type]
          const domainCfg = ev.domain ? (DOMAIN_CONFIG[ev.domain] || DOMAIN_CONFIG['machine']) : null
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
