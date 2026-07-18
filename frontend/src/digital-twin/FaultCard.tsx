import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { FaultProfile } from '../simulation/types'

interface FaultCardProps {
  profile: FaultProfile
  onDragStart: (faultId: string) => void
}

const SEVERITY_CONFIG = {
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'Medium' },
  high: { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', label: 'High' },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Critical' },
}

export default function FaultCard({ profile, onDragStart }: FaultCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const sev = SEVERITY_CONFIG[profile.severity]

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('faultType', profile.id)
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(profile.id)
  }

  return (
    <div
      className="fault-card"
      draggable
      onDragStart={handleDragStart}
      style={{ borderColor: sev.border, background: sev.bg, padding: '0.75rem', marginBottom: '0.5rem', cursor: 'grab' }}
      title={`Drag onto a compatible machine to inject this fault`}
    >
      <div 
        className="fault-card-header" 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: isOpen ? '0.75rem' : 0 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="fault-card-name" style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {profile.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="fault-severity-badge" style={{ color: sev.color, background: `${sev.bg}` }}>
            {sev.label}
          </span>
          {isOpen ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>
      
      {isOpen && (
        <div style={{ marginTop: '0.5rem' }}>
          <p className="fault-card-desc" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {profile.description}
          </p>
          <div className="fault-card-types" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {profile.compatibleTypes.map(t => (
              <span key={t} className="fault-type-tag" style={{ fontSize: '0.625rem', fontWeight: 700, background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                {t.toUpperCase()}
              </span>
            ))}
          </div>
          <div className="fault-drag-hint" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'right' }}>⟡ Drag to machine</div>
        </div>
      )}
    </div>
  )
}
