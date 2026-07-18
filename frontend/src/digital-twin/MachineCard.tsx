import { motion } from 'framer-motion'
import { Cpu, Cog, Droplets, ArrowRight } from 'lucide-react'
import type { Machine, FaultType } from '../simulation/types'

interface MachineCardProps {
  machine: Machine
  isSelected: boolean
  onSelect: () => void
  onDrop: (faultType: FaultType) => void
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
}

const TYPE_ICONS: Record<Machine['type'], React.ReactNode> = {
  cnc: <Cog size={20} />,
  motor: <Cpu size={20} />,
  pump: <Droplets size={20} />,
  conveyor: <ArrowRight size={20} />,
}

const STATUS_CONFIG = {
  healthy: {
    ring: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    label: 'Healthy',
    labelColor: '#10b981',
    pulse: false,
  },
  warning: {
    ring: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    label: 'Warning',
    labelColor: '#d97706',
    pulse: true,
  },
  critical: {
    ring: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    label: 'Critical',
    labelColor: '#ef4444',
    pulse: true,
  },
  offline: {
    ring: '#94a3b8',
    bg: 'rgba(148,163,184,0.06)',
    label: 'Offline',
    labelColor: '#94a3b8',
    pulse: false,
  },
  recovering: {
    ring: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    label: 'Recovering',
    labelColor: '#0891b2',
    pulse: true,
  },
}

export default function MachineCard({
  machine, isSelected, onSelect, onDrop, isDragOver, onDragOver, onDragLeave
}: MachineCardProps) {
  const cfg = STATUS_CONFIG[machine.status]

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const faultType = e.dataTransfer.getData('faultType') as FaultType
    if (faultType) onDrop(faultType)
  }

  const healthColor = machine.healthScore >= 80 ? '#10b981' : machine.healthScore >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <motion.div
      className={`machine-card ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      style={{
        '--status-color': cfg.ring,
        '--status-bg': cfg.bg,
      } as React.CSSProperties}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <div className="mc-header">
        <div className="mc-icon-wrap">
          {TYPE_ICONS[machine.type]}
        </div>
        <div className="mc-status-indicator">
          {cfg.pulse && <motion.div className="mc-pulse-dot" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />}
          <div className="mc-status-dot" style={{ backgroundColor: cfg.ring }} />
        </div>
      </div>
      
      <div className="mc-title">{machine.name}</div>
      <div className="mc-id">{machine.id}</div>
      
      <div className="mc-stats">
        <div className="mc-health-arc">
          <svg viewBox="0 0 36 36" width="36" height="36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border-color)" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15" fill="none" stroke={healthColor} strokeWidth="3" strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: machine.healthScore / 100 }}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div className="mc-health-val" style={{ color: healthColor }}>
            {machine.healthScore}
          </div>
        </div>
        
        <div className="mc-metrics-mini">
          <div className="mc-metric">
            <span className="mc-metric-lbl">Temp</span>
            <span className="mc-metric-val">{machine.temperature.toFixed(1)}°</span>
          </div>
          <div className="mc-metric">
            <span className="mc-metric-lbl">Vib</span>
            <span className="mc-metric-val">{machine.vibration.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
