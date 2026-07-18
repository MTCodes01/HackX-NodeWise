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
        <div className="sim-section-header">
          <AlertTriangle size={14} style={{ color: '#ef4444' }} />
          <span style={{ color: '#ef4444' }}>Inject Fault</span>
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
        <div className="sim-section">
          <div className="sim-section-title">Active Faults</div>
          {state.activeFaults.filter(f => f.isActive).map(fault => (
            <div key={fault.id} className="active-fault-row">
              <span className="active-fault-dot" />
              <div>
                <div className="active-fault-type">{fault.faultType.replace(/_/g, ' ')}</div>
                <div className="active-fault-machine">{fault.machineId}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
