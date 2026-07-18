import { useState } from 'react'
import { Plus, X, Cpu, Cog, Droplets, ArrowRight } from 'lucide-react'
import MachineCard from './MachineCard'
import type { SimulationState, FaultType, Machine, MachineType } from '../simulation/types'
import { PRODUCTION_LINES } from '../simulation/factoryData'
import { FAULT_PROFILE_MAP } from '../simulation/faultProfiles'

interface FactoryGridProps {
  state: SimulationState
  onSelectMachine: (id: string) => void
  onDropFault: (faultType: FaultType, machineId: string) => void
  onAddMachine: (name: string, type: MachineType, lineId: string, gridIndex?: number) => void
}

const MACHINE_TYPES: { type: MachineType, name: string, icon: React.ReactNode }[] = [
  { type: 'cnc', name: 'CNC Center', icon: <Cog size={20} /> },
  { type: 'motor', name: 'Motor', icon: <Cpu size={20} /> },
  { type: 'pump', name: 'Pump', icon: <Droplets size={20} /> },
  { type: 'conveyor', name: 'Conveyor', icon: <ArrowRight size={20} /> },
]

export default function FactoryGrid({ state, onSelectMachine, onDropFault, onAddMachine }: FactoryGridProps) {
  const [dragOverMachine, setDragOverMachine] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<number | null>(null)

  const machines = Object.values(state.machines)

  const handleDragStartMachine = (e: React.DragEvent, type: MachineType) => {
    e.dataTransfer.setData('machineType', type)
  }

  const handleDropCanvas = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverCell(null)
    const machineType = e.dataTransfer.getData('machineType') as MachineType
    if (machineType) {
      const typeConfig = MACHINE_TYPES.find(t => t.type === machineType)
      if (typeConfig) {
        onAddMachine(typeConfig.name, machineType, PRODUCTION_LINES[0].id, machines.length)
      }
    }
  }

  const handleDragOverMachineCard = (e: React.DragEvent, machineId: string) => {
    e.preventDefault()
    const faultType = e.dataTransfer.getData('faultType') as FaultType
    
    // Check compatibility
    const machine = state.machines[machineId]
    const profile = FAULT_PROFILE_MAP[faultType]
    if (profile && machine && profile.compatibleTypes.includes(machine.type)) {
      setDragOverMachine(machineId)
    }
  }

  return (
    <div className="factory-grid-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-primary)' }}>
      {/* Draggable Toolbar */}
      <div className="factory-grid-header" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1rem 1.5rem' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Available Units
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {MACHINE_TYPES.map(m => (
            <div
              key={m.type}
              draggable
              onDragStart={(e) => handleDragStartMachine(e, m.type)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)', borderRadius: '0.5rem',
                cursor: 'grab', fontSize: '0.75rem', fontWeight: 600,
                color: 'var(--text-main)', transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-brand)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {m.icon}
              {m.name}
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
          Drag units onto the grid below
        </div>
      </div>

      {/* Grid Canvas */}
      <div 
        style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(248, 250, 252, 0.6)' }}
        onDragOver={(e) => {
          e.preventDefault()
          if (e.dataTransfer.types.includes('machinetype')) {
            setDragOverCell(1)
          }
        }}
        onDragLeave={() => setDragOverCell(null)}
        onDrop={handleDropCanvas}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.5rem',
        }}>
          {machines.map((machine) => (
            <div key={machine.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <MachineCard
                machine={machine}
                isSelected={state.selectedMachineId === machine.id}
                isDragOver={dragOverMachine === machine.id}
                onSelect={() => onSelectMachine(machine.id)}
                onDrop={(faultType) => {
                  onDropFault(faultType, machine.id)
                  setDragOverMachine(null)
                }}
                onDragOver={(e) => handleDragOverMachineCard(e, machine.id)}
                onDragLeave={() => setDragOverMachine(null)}
              />
            </div>
          ))}
          
          {/* Drop Zone Placeholder */}
          <div 
            style={{
              minHeight: '160px',
              border: '2px dashed var(--border-color)',
              borderRadius: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-light)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              ...(dragOverCell === 1 ? {
                borderColor: 'var(--accent-brand)',
                background: 'rgba(16, 185, 129, 0.05)',
                color: 'var(--accent-brand)',
                transform: 'scale(1.02)'
              } : {})
            }}
          >
            <Plus size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            Drop new unit here
          </div>
        </div>
      </div>
    </div>
  )
}
