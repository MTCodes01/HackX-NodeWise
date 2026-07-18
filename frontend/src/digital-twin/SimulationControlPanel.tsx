import { AlertTriangle } from 'lucide-react'
import FaultCard from './FaultCard'
import { FAULT_PROFILES } from '../simulation/faultProfiles'
import type { SimulationState } from '../simulation/types'

interface SimulationControlPanelProps {
  state: SimulationState
}

export default function SimulationControlPanel({ state }: SimulationControlPanelProps) {
  return (
    <div className="sim-control-panel">
      <div className="sim-panel-title">Action Toolbox</div>

      {/* Inject Fault Section */}
      <div className="sim-section">
        <div className="sim-section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <AlertTriangle size={14} style={{ color: '#ef4444' }} />
          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inject Fault</span>
        </div>
        <div className="sim-cards-list">
          {FAULT_PROFILES.map(profile => (
            <FaultCard
              key={profile.id}
              profile={profile}
              onDragStart={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Active Faults Summary */}
      {state.activeFaults.filter(f => f.isActive).length > 0 && (
        <div className="sim-section" style={{ marginTop: '1.5rem' }}>
          <div className="sim-section-title" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Faults</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {state.activeFaults.filter(f => f.isActive).map(fault => (
              <div key={fault.id} className="active-fault-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <span className="active-fault-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                <div>
                  <div className="active-fault-type" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{fault.faultType.replace(/_/g, ' ')}</div>
                  <div className="active-fault-machine" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fault.machineId}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
