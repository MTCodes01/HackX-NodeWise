import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { RecoveryProfile } from '../simulation/types'

interface RecoveryCardProps {
  profile: RecoveryProfile
  onDragStart: (recoveryId: string) => void
}

export default function RecoveryCard({ profile, onDragStart }: RecoveryCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('recoveryType', profile.id)
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(profile.id)
  }

  return (
    <div
      className="recovery-card"
      draggable
      onDragStart={handleDragStart}
      title="Drag onto a machine to apply recovery"
      style={{ padding: '0.75rem', marginBottom: '0.5rem', cursor: 'grab' }}
    >
      <div 
        className="recovery-card-header" 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: isOpen ? '0.75rem' : 0 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="recovery-card-name" style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {profile.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="recovery-duration">{profile.durationSeconds}s</span>
          {isOpen ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>
      
      {isOpen && (
        <div style={{ marginTop: '0.5rem' }}>
          <p className="recovery-card-desc" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {profile.description}
          </p>
          <div className="fault-drag-hint" style={{ color: '#10b981', fontSize: '0.6875rem', textAlign: 'right' }}>⟡ Drag to machine</div>
        </div>
      )}
    </div>
  )
}
