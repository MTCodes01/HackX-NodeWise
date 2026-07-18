import { useState } from 'react'
import '../digital-twin.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Shield, Zap, Wrench,
  Settings, LogOut, Menu, X, Cpu, MonitorSpeaker, Bell, ChevronRight, ScrollText
} from 'lucide-react'

import ConnectionStatus from './ConnectionStatus'
import FactoryKPIBar from './FactoryKPIBar'
import FactoryGrid from './FactoryGrid'
import DemoToolbar from './DemoToolbar'
import SimulationControlPanel from './SimulationControlPanel'
import RecoveryControlPanel from './RecoveryControlPanel'
import MachineDetailsPanel from './MachineDetailsPanel'
import IncidentPanel from './IncidentPanel'
import FactoryEventLog from './FactoryEventLog'

import { useFactorySimulation } from '../simulation/factorySimulation'
import type { FaultType, RecoveryType } from '../simulation/types'



export default function DigitalTwinView({ view = 'twin' }: { view?: 'twin' | 'logs' }) {
  const [rightPanel, setRightPanel] = useState<'details' | 'incidents'>('details')

  const {
    state,
    injectFault,
    applyRecovery,
    selectMachine,
    setSpeed,
    togglePause,
    resetFactory,
    runDemoScenario,
    addMachine,
  } = useFactorySimulation()

  const handleDropFault = (faultType: FaultType, machineId: string) => {
    injectFault(faultType, machineId)
  }

  const handleDropRecovery = (recoveryType: string, machineId: string) => {
    applyRecovery(recoveryType as RecoveryType, machineId)
  }

  const handleSelectMachine = (machineId: string) => {
    selectMachine(machineId)
    setRightPanel('details')
  }

  const hasActiveIncident = state.incidents.some(i => i.status !== 'resolved')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Topbar equivalent for simulation controls inside the view */}
      <div className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            {view === 'logs' ? 'System Logs' : 'Live Factory Twin'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ConnectionStatus state={state.backendState} />
          {hasActiveIncident && (
            <button className="topbar-incident-alert" onClick={() => setRightPanel('incidents')}>
              <Bell size={14} /> Active Incident
            </button>
          )}
        </div>
      </div>

          {/* KPI Bar */}
          <FactoryKPIBar state={state} />

          {view === 'twin' ? (
            /* Three-column layout */
            <div className="dt-layout">
              {/* LEFT: Simulation Control Panel */}
            <div className="dt-left-panel">
              <SimulationControlPanel
                state={state}
              />
            </div>

            {/* CENTER: Factory Grid & Top Toolbar */}
            <div className="dt-center">
              <div className="demo-toolbar-container">
                <DemoToolbar
                  isPaused={state.isPaused}
                  speed={state.simulationSpeed}
                  onSetSpeed={setSpeed}
                  onTogglePause={togglePause}
                  onReset={resetFactory}
                  onRunScenario={runDemoScenario}
                />
              </div>

              <FactoryGrid
                state={state}
                onSelectMachine={handleSelectMachine}
                onDropFault={handleDropFault}
                onAddMachine={addMachine}
              />

              {/* Center Overlay for Details & Incidents */}
              <AnimatePresence mode="wait">
                {(state.selectedMachineId || rightPanel === 'incidents') && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 20 }}
                    style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', zIndex: 50, display: 'flex', flexDirection: 'column' }}
                  >
                    <div className="dt-right-tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex' }}>
                        <button
                          className={`dt-tab ${rightPanel === 'details' ? 'active' : ''}`}
                          onClick={() => setRightPanel('details')}
                        >
                          Machine Details
                        </button>
                        <button
                          className={`dt-tab ${rightPanel === 'incidents' ? 'active' : ''}`}
                          onClick={() => setRightPanel('incidents')}
                        >
                          Incidents
                          {hasActiveIncident && <span className="dt-tab-dot" />}
                        </button>
                      </div>
                      <button 
                        onClick={() => { selectMachine(null); setRightPanel('details'); }}
                        style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                      {rightPanel === 'details' ? (
                        state.selectedMachineId ? (
                          <MachineDetailsPanel
                            state={state}
                            onClose={() => { selectMachine(null); setRightPanel('details'); }}
                            onDropRecovery={handleDropRecovery}
                          />
                        ) : (
                          <div className="dt-empty-panel">
                            <MonitorSpeaker size={28} style={{ color: 'var(--text-light)', opacity: 0.5 }} />
                            <div className="dt-empty-title">No Machine Selected</div>
                            <div className="dt-empty-sub">Click a machine on the canvas to inspect its telemetry</div>
                            <div className="dt-empty-hint">
                              <ChevronRight size={12} />
                              Or drag a fault card to inject a simulation
                            </div>
                          </div>
                        )
                      ) : (
                        <IncidentPanel state={state} />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT: Resolves Toolbox & Logs */}
            <div className="dt-right-panel">
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <RecoveryControlPanel state={state} />
              </div>
            </div>
          </div>
          ) : (
            /* Logs View */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'var(--bg-primary)', overflow: 'hidden' }}>
              <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <FactoryEventLog events={state.eventLog} />
              </div>
            </div>
          )}
    </div>
  )
}
