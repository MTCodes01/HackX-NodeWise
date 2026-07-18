import { motion } from 'framer-motion'
import { Cpu, Cog, Droplets, ArrowRight } from 'lucide-react'
import type { Machine, FaultType } from '../simulation/types'

interface MachineNodeProps {
  machine: Machine
  isSelected: boolean
  onSelect: () => void
  onDrop: (faultType: FaultType) => void
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
}

const TYPE_ICONS: Record<Machine['type'], React.ReactNode> = {
  cnc: <Cog size={16} />,
  motor: <Cpu size={16} />,
  pump: <Droplets size={16} />,
  conveyor: <ArrowRight size={16} />,
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

export default function MachineNode({
  machine, isSelected, onSelect, onDrop, isDragOver, onDragOver, onDragLeave
}: MachineNodeProps) {
  const cfg = STATUS_CONFIG[machine.status]

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const faultType = e.dataTransfer.getData('faultType') as FaultType
    if (faultType) onDrop(faultType)
  }

  const healthColor = machine.healthScore >= 80 ? '#10b981' : machine.healthScore >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <motion.g
      style={{ cursor: 'pointer' }}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Drag-over highlight ring */}
      {isDragOver && (
        <motion.rect
          x={machine.x - 42} y={machine.y - 42}
          width={84} height={84}
          rx={14}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="6 3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Selection glow */}
      {isSelected && (
        <rect
          x={machine.x - 40} y={machine.y - 40}
          width={80} height={80}
          rx={12}
          fill="none"
          stroke="#0f172a"
          strokeWidth={2}
          opacity={0.6}
        />
      )}

      {/* Status pulse ring (warning/critical/recovering) */}
      {cfg.pulse && (
        <motion.circle
          cx={machine.x} cy={machine.y}
          r={38}
          fill="none"
          stroke={cfg.ring}
          strokeWidth={1.5}
          opacity={0.5}
          animate={{ r: [38, 48, 38], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: machine.status === 'critical' ? 1.2 : 2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Machine card body */}
      <rect
        x={machine.x - 38} y={machine.y - 38}
        width={76} height={76}
        rx={10}
        fill={isDragOver ? 'rgba(16,185,129,0.15)' : cfg.bg}
        stroke={isSelected ? '#0f172a' : cfg.ring}
        strokeWidth={isSelected ? 1.5 : 1}
        strokeOpacity={0.6}
      />

      {/* Icon area */}
      <rect
        x={machine.x - 16} y={machine.y - 28}
        width={32} height={28}
        rx={6}
        fill={cfg.ring}
        fillOpacity={0.15}
      />

      {/* Health score arc */}
      <circle
        cx={machine.x} cy={machine.y + 14}
        r={14}
        fill="none"
        stroke="var(--border-color)"
        strokeWidth={2.5}
      />
      <motion.circle
        cx={machine.x} cy={machine.y + 14}
        r={14}
        fill="none"
        stroke={healthColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={`${(machine.healthScore / 100) * 87.96} 87.96`}
        strokeDashoffset={21.99}
        animate={{ strokeDasharray: `${(machine.healthScore / 100) * 87.96} 87.96` }}
        transition={{ duration: 0.5 }}
        transform={`rotate(-90 ${machine.x} ${machine.y + 14})`}
      />

      {/* Health percentage text */}
      <text
        x={machine.x} y={machine.y + 18}
        textAnchor="middle"
        fontSize={8}
        fontWeight="700"
        fill={healthColor}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {machine.healthScore}%
      </text>

      {/* Machine ID label */}
      <text
        x={machine.x} y={machine.y + 50}
        textAnchor="middle"
        fontSize={8}
        fontWeight="600"
        fill="var(--text-muted)"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {machine.id}
      </text>

      {/* Status dot */}
      <motion.circle
        cx={machine.x + 30} cy={machine.y - 30}
        r={5}
        fill={cfg.ring}
        animate={cfg.pulse ? { opacity: [1, 0.4, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* Foreignobject for icon (SVG workaround) */}
      <foreignObject x={machine.x - 10} y={machine.y - 26} width={20} height={20}>
        <div style={{ color: cfg.ring, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {TYPE_ICONS[machine.type]}
        </div>
      </foreignObject>
    </motion.g>
  )
}
