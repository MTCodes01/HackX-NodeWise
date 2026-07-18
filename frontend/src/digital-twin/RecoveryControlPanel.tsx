import { Wrench } from 'lucide-react'
import RecoveryCard from './RecoveryCard'
import { RECOVERY_PROFILES } from '../simulation/recoveryProfiles'
import type { SimulationState } from '../simulation/types'

interface RecoveryControlPanelProps {
  state: SimulationState
}

export default function RecoveryControlPanel({ state }: RecoveryControlPanelProps) {
  return (
    <div className="sim-control-panel">
      <div className="sim-panel-title">Resolves Toolbox</div>
      
      {/* Recovery Actions Section */}
      <div className="sim-section">
        <div className="sim-section-header">
          <Wrench size={14} style={{ color: '#10b981' }} />
          <span style={{ color: '#10b981' }}>Recovery Actions</span>
        </div>
        <div className="sim-cards-list">
          {RECOVERY_PROFILES.map(profile => (
            <RecoveryCard
              key={profile.id}
              profile={profile}
              onDragStart={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
