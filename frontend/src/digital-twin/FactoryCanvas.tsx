import { useState } from 'react'
import { motion } from 'framer-motion'
import MachineNode from './MachineNode'
import type { SimulationState, FaultType, Machine } from '../simulation/types'
import { PRODUCTION_LINES } from '../simulation/factoryData'
import { FAULT_PROFILE_MAP } from '../simulation/faultProfiles'

interface FactoryCanvasProps {
  state: SimulationState
  onSelectMachine: (id: string) => void
  onDropFault: (faultType: FaultType, machineId: string) => void
}

export default function FactoryCanvas({ state, onSelectMachine, onDropFault }: FactoryCanvasProps) {
  const [dragOverMachine, setDragOverMachine] = useState<string | null>(null)
  const [dragFaultType, setDragFaultType] = useState<FaultType | null>(null)

  const machines = Object.values(state.machines)

  const handleDragOver = (e: React.DragEvent, machineId: string) => {
    e.preventDefault()
    const faultType = e.dataTransfer.getData('faultType') as FaultType
    // Check compatibility
    const machine = state.machines[machineId]
    const profile = FAULT_PROFILE_MAP[faultType]
    if (profile && machine && profile.compatibleTypes.includes(machine.type)) {
      setDragOverMachine(machineId)
    }
  }

  // Group machines by line
  const byLine: Record<string, Machine[]> = {}
  for (const m of machines) {
    if (!byLine[m.lineId]) byLine[m.lineId] = []
    byLine[m.lineId].push(m)
  }

  return (
    <div className="factory-canvas-wrapper">
      {/* Legend */}
      <div className="canvas-legend">
        {[
          { color: '#10b981', label: 'Healthy' },
          { color: '#f59e0b', label: 'Warning' },
          { color: '#ef4444', label: 'Critical' },
          { color: '#06b6d4', label: 'Recovering' },
          { color: '#94a3b8', label: 'Offline' },
        ].map(item => (
          <div key={item.label} className="legend-item">
            <span className="legend-dot" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
        <div className="legend-item legend-hint">
          ← Drag faults onto machines
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="canvas-scroll-area">
        <svg
          viewBox="0 0 660 520"
          className="factory-svg"
          style={{ width: '100%', minWidth: 500, height: 'auto' }}
          onDragOver={e => e.preventDefault()}
          onDrop={() => setDragOverMachine(null)}
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="660" height="520" fill="url(#grid)" />

          {/* Production Lines */}
          {PRODUCTION_LINES.map(line => (
            <g key={line.id}>
              <rect
                x={line.x} y={line.y}
                width={line.width} height={line.height}
                rx={12}
                fill={line.color}
                stroke={line.color.replace('0.08', '0.3')}
                strokeWidth={1}
              />
              <text
                x={line.x + 14} y={line.y + 20}
                fontSize={9}
                fontWeight="600"
                fill="var(--text-muted)"
                fontFamily="Inter, system-ui, sans-serif"
                opacity={0.7}
              >
                {line.name.toUpperCase()}
              </text>

              {/* Conveyor belt line between machines in same line */}
              {byLine[line.id] && byLine[line.id].length > 1 && (() => {
                const sorted = [...byLine[line.id]].sort((a, b) => a.x - b.x)
                return sorted.slice(0, -1).map((m, i) => {
                  const next = sorted[i + 1]
                  return (
                    <g key={`belt-${m.id}`}>
                      <line
                        x1={m.x + 40} y1={m.y}
                        x2={next.x - 40} y2={next.y}
                        stroke="rgba(148,163,184,0.25)"
                        strokeWidth={6}
                        strokeLinecap="round"
                      />
                      <motion.line
                        x1={m.x + 40} y1={m.y}
                        x2={next.x - 40} y2={next.y}
                        stroke="rgba(16,185,129,0.3)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeDasharray="8 12"
                        animate={{ strokeDashoffset: [-20, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </g>
                  )
                })
              })()}
            </g>
          ))}

          {/* Energy zone indicator */}
          <rect x={600} y={20} width={50} height={490} rx={8}
            fill="rgba(245,158,11,0.04)"
            stroke="rgba(245,158,11,0.15)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text x={625} y={270} fontSize={7} fill="rgba(245,158,11,0.5)"
            fontFamily="Inter, system-ui, sans-serif" fontWeight="600"
            transform="rotate(-90 625 270)" textAnchor="middle">
            ENERGY ZONE
          </text>

          {/* Machine nodes */}
          {machines.map(machine => (
            <MachineNode
              key={machine.id}
              machine={machine}
              isSelected={state.selectedMachineId === machine.id}
              isDragOver={dragOverMachine === machine.id}
              onSelect={() => onSelectMachine(machine.id)}
              onDrop={(faultType) => {
                onDropFault(faultType, machine.id)
                setDragOverMachine(null)
              }}
              onDragOver={(e) => handleDragOver(e, machine.id)}
              onDragLeave={() => setDragOverMachine(null)}
            />
          ))}

          {/* Active incident lines: connect affected machines */}
          {state.incidents.filter(i => i.status !== 'resolved').map(incident => {
            const machine = state.machines[incident.machineId]
            if (!machine) return null
            return (
              <motion.circle
                key={`incident-${incident.id}`}
                cx={machine.x} cy={machine.y}
                r={50}
                fill="none"
                stroke={incident.priority === 'high' ? '#ef4444' : '#f59e0b'}
                strokeWidth={1}
                strokeDasharray="6 4"
                opacity={0.4}
                animate={{ r: [50, 60, 50], opacity: [0.4, 0.2, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
