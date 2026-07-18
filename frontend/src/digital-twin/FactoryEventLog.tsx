import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FactoryEvent } from '../simulation/types'

interface FactoryEventLogProps {
  events: FactoryEvent[]
}

const CATEGORY_CONFIG: Record<FactoryEvent['category'], { label: string; color: string; bg: string }> = {
  system: { label: 'SYSTEM', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  anomaly: { label: 'ANOMALY', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  correlation: { label: 'CORRELATION', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  incident: { label: 'INCIDENT', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  ai: { label: 'AI', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  operator: { label: 'OPERATOR', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function FactoryEventLog({ events }: FactoryEventLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [events.length])

  // Slice the last 50 events (newest at the bottom, like a terminal)
  const displayed = [...events].slice(-50)

  return (
    <div className="event-log">
      <div className="event-log-header">
        <span className="event-log-title">Factory Event Log</span>
        <span className="event-log-count">{events.length} events</span>
      </div>
      <div className="event-log-body" ref={containerRef}>
        <AnimatePresence initial={false}>
          {displayed.map(ev => {
            const cfg = CATEGORY_CONFIG[ev.category]
            return (
              <motion.div
                key={ev.id}
                className="event-row"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="event-time">{formatTime(ev.timestamp)}</span>
                <span
                  className="event-tag"
                  style={{ color: cfg.color, background: cfg.bg }}
                >
                  {cfg.label}
                </span>
                <span className="event-msg">{ev.message}</span>
                {ev.machineId && (
                  <span className="event-machine-ref">{ev.machineId}</span>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
