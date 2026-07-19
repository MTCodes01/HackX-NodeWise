import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Shield, Zap, Wrench,
  Settings, LogOut, Bell, Search, Menu, X, ChevronRight, Cpu, MonitorSpeaker, ScrollText, Plus,
  Moon, Sun, Globe, Lock, User, HelpCircle, AlertTriangle, CheckCircle, Clock, Upload, Image as ImageIcon
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import DigitalTwinView from '../digital-twin/DigitalTwinView'
import { useFactorySimulation } from '../simulation/factorySimulation'
import { TelemetrySocket, getSystemState, registerMachine, logWorkOrder } from '../services/factoryApi'

type NavItem = {
  icon: any;
  label: string;
  id: string;
  href?: string;
}

const sidebarNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Overview', id: 'overview' },
  { icon: MonitorSpeaker, label: 'Live Twin', id: 'twin' },
  { icon: ScrollText, label: 'System Logs', id: 'logs' },
  { icon: Activity, label: 'Machines', id: 'machines' },
  { icon: Zap, label: 'Energy', id: 'energy' },
  { icon: Shield, label: 'Safety', id: 'safety' },
  { icon: Wrench, label: 'Maintenance', id: 'maintenance' },
]

const notifications = [
  { id: 1, title: 'High vibration detected', desc: 'CNC Machine 2 — spindle bearing wear critical', time: '10 min ago', type: 'critical' },
  { id: 2, title: 'Temperature warning', desc: 'Assembly Line 3 operating at 58°C', time: '2 hours ago', type: 'warning' },
  { id: 3, title: 'Maintenance completed', desc: 'Milling Station A — quarterly lubrication done', time: '5 hours ago', type: 'success' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<any>(null)

  // Factory Twin Simulation State
  const sim = useFactorySimulation()
  // Starts EMPTY — purely filled by real sim ticks, zero hardcoded values
  const [energyHistory, setEnergyHistory] = useState<number[]>([])

  // Record every sim tick into rolling history (no gate — machines tick from startup)
  useEffect(() => {
    const totalPowerKw = Object.values(sim.state.machines).reduce((sum, m) => sum + m.powerKw, 0)
    if (totalPowerKw === 0) return
    setEnergyHistory(prev => {
      const next = [...prev, totalPowerKw]
      if (next.length > 50) next.shift()
      return next
    })
  }, [sim.state.machines])

  // Maintenance State
  const [createdWorkOrders, setCreatedWorkOrders] = useState<number[]>([])
  const [completedWorkOrders, setCompletedWorkOrders] = useState<string[]>([])
  // Filter Maintenance tab by a specific machine when navigating from machine modal
  const [maintenanceMachineFilter, setMaintenanceMachineFilter] = useState<string | null>(null)
  // Live incident count for selected machine (fetched from backend)
  const [machineIncidentCount, setMachineIncidentCount] = useState<number>(0)

  // Dynamic Machinery Registry (Empty by default for fresh company setup)
  const [machinesList, setMachinesList] = useState<any[]>([])

  // Add Machinery Form States
  const [showAddMachineModal, setShowAddMachineModal] = useState(false)
  const [newMachineId, setNewMachineId] = useState('')
  const [newMachineName, setNewMachineName] = useState('')
  const [newMachineUtil, setNewMachineUtil] = useState(90)
  const [newMachineTemp, setNewMachineTemp] = useState('40°C')
  const [newMachineVib, setNewMachineVib] = useState('0.4mm/s')

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMachineId || !newMachineName) return

    // Avoid duplicate IDs
    if (machinesList.some(m => m.id.toLowerCase() === newMachineId.trim().toLowerCase())) {
      alert("A machine with this ID already exists.")
      return
    }

    const newMachine = {
      id: newMachineId.trim(),
      name: newMachineName.trim(),
      status: 'Online',
      temp: newMachineTemp.trim(),
      vib: newMachineVib.trim(),
      util: Number(newMachineUtil) || 90
    }

    const success = await registerMachine(newMachine)
    if (success) {
      setMachinesList([...machinesList, newMachine])
    }
    setNewMachineId('')
    setNewMachineName('')
    setNewMachineUtil(90)
    setNewMachineTemp('40°C')
    setNewMachineVib('0.4mm/s')
    setShowAddMachineModal(false)
  }

  const handleExternalAddMachine = async (newMachine: any) => {
    if (machinesList.some(m => m.id.toLowerCase() === newMachine.id.toLowerCase())) return
    const success = await registerMachine(newMachine)
    if (success) {
      setMachinesList(prev => [...prev, newMachine])
    }
  }

  // Dynamic alert classification helper
  const getIncidentTitle = (inc: any) => {
    const domains = Array.from(new Set(inc.verified_evidence.map((e: any) => e.domain)))
    const metrics = Array.from(new Set(inc.verified_evidence.map((e: any) => e.metric)))
    
    if (domains.includes('vision')) {
      return `Safety Restricted Zone Violation`
    }
    if (metrics.includes('vibration') && metrics.includes('temperature')) {
      return `Critical Thermo-Mechanical Friction`
    }
    if (metrics.includes('vibration')) {
      return `High Spindle Vibration Anomaly`
    }
    if (metrics.includes('temperature')) {
      return `Abnormal Drive Core Temperature`
    }
    if (metrics.includes('power_kw')) {
      return `Electrical Overload Power Surge`
    }
    return `Operational Asset Fault`
  }

  // Fetch live incident count for a machine whenever the modal opens
  useEffect(() => {
    if (!selectedMachine) {
      setMachineIncidentCount(0)
      return
    }
    fetch(`http://localhost:8000/api/incidents/machine/${selectedMachine.id}`)
      .then(res => res.ok ? res.json() : [])
      .then((data: any[]) => setMachineIncidentCount(data.length))
      .catch(() => setMachineIncidentCount(0))
  }, [selectedMachine])

  // API Integration States
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [syncActive, setSyncActive] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null)
  const [recommendation, setRecommendation] = useState<any | null>(null)
  const [loadingRec, setLoadingRec] = useState(false)
  const [simulationRunning, setSimulationRunning] = useState(false)

  // Fetch live anomalies and incidents from FastAPI backend
  // Fetch live anomalies and incidents initially, then rely on WebSocket for live updates
  const fetchDashboardData = async () => {
    try {
      const systemState = await getSystemState()
      if (systemState) {
        setMachinesList(systemState.machines || [])
        setCreatedWorkOrders(systemState.created_work_orders || [])
        setCompletedWorkOrders(systemState.completed_work_orders || [])
      }

      const anomRes = await fetch('http://localhost:8000/api/anomalies')
      const incRes = await fetch('http://localhost:8000/api/incidents')
      if (anomRes.ok && incRes.ok) {
        const anomData = await anomRes.json()
        const incData = await incRes.json()
        setAnomalies(anomData)
        setIncidents(incData)
        setSyncActive(true)
      } else {
        setSyncActive(false)
      }
    } catch (e) {
      setSyncActive(false)
      console.warn("FastAPI offline. Dashboard running in offline demo mode.")
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Ensure connection is established
    TelemetrySocket.connect()

    // Subscribe to real-time updates
    const unsubscribe = TelemetrySocket.onUpdate((data) => {
      setAnomalies(data.anomalies)
      setIncidents(data.incidents)
      setSyncActive(true)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleTriggerScenario = async (scenario: string, machineId?: string) => {
    setSimulationRunning(true)
    try {
      const res = await fetch('http://localhost:8000/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, machine_id: machineId })
      })
      if (res.ok) {
        await fetchDashboardData()
      }
    } catch (e) {
      console.error("Failed to trigger scenario:", e)
    } finally {
      setSimulationRunning(false)
    }
  }

  const handleReset = async () => {
    setSimulationRunning(true)
    try {
      const res = await fetch('http://localhost:8000/api/simulator/reset', {
        method: 'POST'
      })
      if (res.ok) {
        setAnomalies([])
        setIncidents([])
        setSelectedIncident(null)
        setRecommendation(null)
        await fetchDashboardData()
      }
    } catch (e) {
      console.error("Failed to reset database:", e)
    } finally {
      setSimulationRunning(false)
    }
  }

  // AI Recommendation Modal Handlers
  const handleOpenAIModal = async (incident: any) => {
    setSelectedIncident(incident)
    setLoadingRec(true)
    setRecommendation(null)
    try {
      const res = await fetch(`http://localhost:8000/api/recommendations/${incident.incident_id}`)
      if (res.ok) {
        const data = await res.json()
        setRecommendation(data)
      }
    } catch (e) {
      console.error("Failed to load Gemini recommendation:", e)
    } finally {
      setLoadingRec(false)
    }
  }

  const handleCloseAIModal = () => {
    setSelectedIncident(null)
    setRecommendation(null)
  }

  // Dynamic values based on live telemetry anomalies
  const activeMachinesCount = machinesList.filter(m => getLiveMachineState(m.id, m).status === 'Online').length
  const safetyIncidentsCount = anomalies.filter(a => a.domain === 'vision').length
  const liveOEE = incidents.some(i => i.priority === 'CRITICAL') ? '76.8%' :
                  incidents.some(i => i.priority === 'HIGH') ? '83.2%' : '87.4%'
  // Live power stat — direct from current sim state
  const totalPowerKw = Object.values(sim.state.machines).reduce((sum, m) => sum + m.powerKw, 0)
  const liveEnergy = totalPowerKw > 0 ? `${totalPowerKw.toFixed(1)} kW` : '—'

  // Helper to map live telemetry into static machine cards
  function getLiveMachineState(mId: string, defaultVals: any) {
    const targetId = mId === 'M-02' ? 'CNC-04' : mId
    const machineAnoms = anomalies.filter(a => a.machine_id === targetId)
    const activeInc = incidents.find(inc => inc.asset === targetId)

    if (machineAnoms.length > 0 || activeInc) {
      const vibAnom = machineAnoms.find(a => a.metric === 'vibration')
      const tempAnom = machineAnoms.find(a => a.metric === 'temperature')
      return {
        status: activeInc ? 'Warning' : 'Online',
        temp: tempAnom ? `${tempAnom.current_value.toFixed(1)}°C` : defaultVals.temp,
        vib: vibAnom ? `${vibAnom.current_value.toFixed(1)} mm/s` : defaultVals.vib,
        util: activeInc ? 68 : defaultVals.util
      }
    }
    return defaultVals
  }

  // Search filter helper
  const matchesSearch = (text: string) =>
    !searchQuery || text.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <PageTransition>
      <div className={`dashboard-layout ${darkMode ? 'dark-mode' : ''}`}>
        {/* Animated gradient mesh background for glassmorphism */}
        <div className="dashboard-mesh-bg">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 50, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            className="mesh-blob mesh-blob-1"
          />
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
              x: [0, -40, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="mesh-blob mesh-blob-2"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
              x: [0, 60, 0],
              y: [0, -20, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            className="mesh-blob mesh-blob-3"
          />
        </div>
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="dashboard-bg-glow"
          style={{ top: 'auto', bottom: '-10rem', left: 'auto', right: '-10rem', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.04) 0%, transparent 70%)' }}
        />

        {/* Click-away overlays */}
        {(showNotifications || showUserMenu) && (
          <div className="dropdown-backdrop" onClick={() => { setShowNotifications(false); setShowUserMenu(false) }} />
        )}

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="dashboard-sidebar glass"
            >
              <div className="sidebar-header">
                <Link to="/" className="sidebar-brand">
                  <div className="logo-icon-wrapper">
                    <div className="logo-icon" style={{ width: '2rem', height: '2rem' }}>
                      <Cpu className="icon-white" size={16} />
                    </div>
                  </div>
                  <span className="logo-text">Optimus<span className="text-brand">AI</span></span>
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="sidebar-close">
                  <X size={20} />
                </button>
              </div>

              <nav className="sidebar-nav">
                {sidebarNav.map((item) => (
                  item.href ? (
                    <Link
                      key={item.id}
                      to={item.href}
                      className="sidebar-link"
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                      {activeTab === item.id && (
                        <motion.div layoutId="sidebar-active" className="sidebar-active-bg" />
                      )}
                    </button>
                  )
                ))}
              </nav>



              <div className="sidebar-footer">
                <button className="sidebar-link" onClick={() => setActiveTab('settings')}>
                  <Settings size={18} />
                  <span>Settings</span>
                  {activeTab === 'settings' && (
                    <motion.div layoutId="sidebar-active" className="sidebar-active-bg" />
                  )}
                </button>
                <Link to="/home" className="sidebar-link text-danger hover-bg-danger">
                  <LogOut size={18} />
                  <span>Logout</span>
                </Link>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`dashboard-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <header className="dashboard-topbar glass">
            <div className="topbar-left">
              {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="topbar-btn">
                  <Menu size={20} />
                </button>
              )}
              <h2 className="topbar-title capitalize">{activeTab} Dashboard</h2>
            </div>

            <div className="topbar-right">
              {/* Sync Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                <div className={`status-dot ${syncActive ? 'online' : 'maintenance'}`} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {syncActive ? 'Live Sync' : 'Sandbox Mode'}
                </span>
              </div>
              <div className="search-bar">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search factory data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className={`dashboard-content-area ${activeTab === 'twin' || activeTab === 'logs' ? 'no-padding' : ''}`}>
            <AnimatePresence mode="wait">
              {/* ===== OVERVIEW ===== */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="dashboard-grid"
                >
                  <div className="dashboard-stats-row">
                    {[
                      { label: 'Overall Equipment Effectiveness', value: liveOEE, trend: '+1.2%', color: 'var(--accent-primary)' },
                      { label: 'Active Machines', value: `${activeMachinesCount} / ${machinesList.length}`, trend: incidents.some(i => i.priority === 'CRITICAL') ? 'Alert' : 'Optimal', color: '#10b981' },
                      { label: 'Total Energy Usage', value: liveEnergy, trend: anomalies.some(a => a.metric === 'power_kw') ? '+14.5%' : '-4.3%', color: '#f59e0b' },
                      { label: 'Safety Incidents (24h)', value: safetyIncidentsCount.toString(), trend: 'Stable', color: '#10b981' },
                    ].filter(s => matchesSearch(s.label)).map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.1, type: 'spring', stiffness: 100 }}
                        className="stat-card"
                      >
                        <h4 className="stat-card-label">{stat.label}</h4>
                        <div className="stat-card-value-row">
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 + 0.3, type: 'spring' }}
                            className="stat-card-value"
                            style={{ color: stat.color }}
                          >
                            {stat.value}
                          </motion.span>
                          <span className="stat-card-trend">{stat.trend}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="dashboard-bento">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="bento-card bento-wide"
                    >
                      <div className="bento-header">
                        <h3>Production Output (Last 7 Days)</h3>
                        <button className="bento-more-btn"><ChevronRight size={16} /></button>
                      </div>
                      <div className="bento-chart-area">
                        <div className="custom-bar-chart">
                          <div className="chart-y-axis">
                            <span>100k</span>
                            <span>75k</span>
                            <span>50k</span>
                            <span>25k</span>
                            <span>0</span>
                          </div>
                          <div className="chart-grid">
                            <div className="grid-line" />
                            <div className="grid-line" />
                            <div className="grid-line" />
                            <div className="grid-line" />
                            <div className="grid-line" />
                          </div>
                          <div className="chart-bars-large">
                            {[
                              { day: 'Mon', val: 40 },
                              { day: 'Tue', val: 55 },
                              { day: 'Wed', val: 48 },
                              { day: 'Thu', val: 65 },
                              { day: 'Fri', val: 75 },
                              { day: 'Sat', val: 70 },
                              { day: 'Sun', val: 85 }
                            ].map((data, i) => (
                              <div key={i} className="chart-bar-col">
                                <div className="chart-bar-track">
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${data.val}%` }}
                                    transition={{ duration: 1, type: "spring", bounce: 0.3, delay: i * 0.1 }}
                                    className="chart-bar-large group"
                                  >
                                    <span className="chart-bar-value">{data.val}k</span>
                                  </motion.div>
                                </div>
                                <span className="chart-x-label">{data.day}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className="bento-card"
                    >
                      <div className="bento-header">
                        <h3>Machine Status</h3>
                      </div>
                      <div className="machine-list" style={{ width: '100%' }}>
                        {machinesList.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '0.75rem', width: '100%' }}>
                            <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>No machinery imported yet.</p>
                            <button 
                              onClick={() => setActiveTab('machines')}
                              className="btn-small btn-primary" 
                              style={{ marginTop: '0.75rem', cursor: 'pointer' }}
                            >
                              Go to Machines Page
                            </button>
                          </div>
                        ) : (
                          machinesList.slice(0, 4).filter(m => matchesSearch(m.name)).map((m, i) => {
                            const live = getLiveMachineState(m.id, { status: m.status, util: m.util });
                            return (
                              <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="machine-item"
                                onClick={() => setSelectedMachine({ 
                                  id: m.id, 
                                  name: m.name, 
                                  status: live.status,
                                  temp: live.temp || m.temp, 
                                  vib: live.vib || m.vib, 
                                  util: live.util 
                                })}
                              >
                                <div className="machine-info">
                                  <div className={`status-indicator ${live.status.toLowerCase()}`} />
                                  <span className="machine-name">{m.name}</span>
                                </div>
                                <span className="machine-perf">{live.util}%</span>
                              </motion.div>
                            )
                          })
                        )}
                      </div>
                    </motion.div>
                  </div>

                  <div className="dashboard-bento">
                    {/* System Health */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bento-card"
                    >
                      <div className="bento-header">
                        <h3>System Health</h3>
                        <button className="bento-more-btn"><ChevronRight size={16} /></button>
                      </div>
                      <div className="system-health-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {[
                          { label: 'Network Latency', val: '24ms', perc: 15, color: '#10b981' },
                          { label: 'Storage Capacity', val: '78%', perc: 78, color: '#f59e0b' },
                          { label: 'CPU Load (Cluster)', val: '42%', perc: 42, color: '#3b82f6' },
                        ].map((item, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                              <span style={{ fontWeight: 600 }}>{item.val}</span>
                            </div>
                            <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${item.perc}%` }} transition={{ delay: 0.5 + (i * 0.1) }}
                                style={{ height: '100%', background: item.color, borderRadius: '3px' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bento-card bento-wide"
                    >
                      <div className="bento-header">
                        <h3>Recent Activity</h3>
                      </div>
                      <div className="activity-feed" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {incidents
  .slice(0, 3)
  .map((act, i) => (
    <div
      key={act.incident_id || i}
      style={{
        display: 'flex',
        gap: '1rem',
        paddingBottom: '1rem',
        borderBottom:
          i !== Math.min(incidents.length, 3) - 1
            ? '1px solid var(--border-color)'
            : 'none'
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          flexShrink: 0
        }}
      >
        <AlertTriangle size={16} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-main)'
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {act.asset}
          </span>{" "}
          {act.detection_summary}
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          {act.start_time}
        </span>
      </div>
    </div>
))}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {(activeTab === 'twin' || activeTab === 'logs') && (
                <motion.div
                  key="twin"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}
                >
                  <DigitalTwinView view={activeTab as 'twin' | 'logs'} liveIncidents={incidents} companyMachines={machinesList} liveAnomalies={anomalies} onTriggerScenario={handleTriggerScenario} onResetSimulator={handleReset} onMachineAdded={handleExternalAddMachine} />
                </motion.div>
              )}



              {/* ===== MACHINES ===== */}
              {activeTab === 'machines' && (
                <motion.div
                  key="machines"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="dashboard-grid"
                >
                  <div className="bento-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3>Fleet Overview</h3>
                      <div className="status-badges-row" style={{ marginTop: '0.25rem' }}>
                        <span className="status-badge bg-success-light text-success">{activeMachinesCount} Online</span>
                        <span className="status-badge bg-warning-light text-warning">
                          {machinesList.length - activeMachinesCount} Warning
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowAddMachineModal(true)}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                      <Plus size={16} />
                      <span>Add Machinery</span>
                    </button>
                  </div>
                  {machinesList.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', border: '2px dashed var(--border-color)', borderRadius: '1rem', background: 'var(--bg-secondary)', gridColumn: 'span 3', minHeight: '350px', width: '100%' }}>
                      <Activity size={32} style={{ color: 'var(--accent-primary)', opacity: 0.6, marginBottom: '1rem' }} />
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>Your Factory Fleet is Empty</h4>
                      <p className="text-muted" style={{ fontSize: '0.875rem', margin: '0 0 1.5rem 0', textAlign: 'center', maxWidth: '360px', lineHeight: '1.4' }}>
                        Import your company-specific factory machinery using the button above to start monitoring live telemetry anomalies.
                      </p>
                      <button 
                        onClick={() => setShowAddMachineModal(true)}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                      >
                        <Plus size={16} />
                        <span>Import First Machine</span>
                      </button>
                    </div>
                  ) : (
                    <div className="machines-grid">
                      {machinesList.filter(m => matchesSearch(m.name + ' ' + m.id)).map((m, i) => {
                        const live = getLiveMachineState(m.id, m);
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="machine-detail-card cursor-pointer"
                            onClick={() => setSelectedMachine({ ...m, ...live })}
                          >
                            <div className="machine-card-header">
                              <div>
                                <span className="machine-id">{m.id}</span>
                                <h4>{m.name}</h4>
                              </div>
                              <div className={`status-indicator ${live.status.toLowerCase()}`} />
                            </div>
                            <div className="machine-metrics-row">
                              <div className="metric-col">
                                <span className="metric-label">Temp</span>
                                <span className={`metric-val ${live.status === 'Warning' ? 'text-warning' : ''}`}>{live.temp}</span>
                              </div>
                              <div className="metric-col">
                                <span className="metric-label">Vibration</span>
                                <span className={`metric-val ${live.status === 'Warning' ? 'text-warning' : ''}`}>{live.vib}</span>
                              </div>
                              <div className="metric-col">
                                <span className="metric-label">Utilization</span>
                                <span className="metric-val">{live.util}%</span>
                              </div>
                            </div>
                            <div className="util-bar-bg">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${live.util}%` }}
                                transition={{ delay: i * 0.05 + 0.2, duration: 0.6 }}
                                className={`util-bar-fill ${live.status.toLowerCase()}`}
                              />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ===== ENERGY ===== */}
              {activeTab === 'energy' && (() => {
                const hasData = energyHistory.length >= 2

                // All chart math — only computed when we have real data
                let energyLinePath = ''
                let energyFillPath = ''
                let energyPoints: { cx: number; cy: number; val: string }[] = []
                let dotPoints: typeof energyPoints = []
                let yLabels: string[] = ['100 kW', '75 kW', '50 kW', '25 kW', '0 kW']

                if (hasData) {
                  const step = 1000 / (energyHistory.length - 1)
                  const maxVal = Math.max(...energyHistory)
                  const yMax = Math.max(maxVal * 1.15, 10) // 15% headroom

                  yLabels = [yMax, yMax * 0.75, yMax * 0.5, yMax * 0.25, 0]
                    .map(v => `${v.toFixed(0)} kW`)

                  energyPoints = energyHistory.map((val, idx) => ({
                    cx: Math.round(idx * step),
                    cy: Math.round(300 - (val / yMax) * 300),
                    val: `${val.toFixed(1)} kW`,
                  }))

                  energyLinePath = `M${energyPoints[0].cx},${energyPoints[0].cy} ` +
                    energyPoints.slice(1).map(pt => `L${pt.cx},${pt.cy}`).join(' ')

                  energyFillPath = `M0,300 L${energyPoints[0].cx},${energyPoints[0].cy} ` +
                    energyPoints.slice(1).map(pt => `L${pt.cx},${pt.cy}`).join(' ') +
                    ` L1000,300 Z`

                  const dotInterval = Math.max(1, Math.floor(energyPoints.length / 7))
                  dotPoints = energyPoints.filter((_, i) => i % dotInterval === 0 || i === energyPoints.length - 1)
                }

                return (
                  <motion.div
                    key="energy"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="dashboard-grid"
                  >
                    <div className="dashboard-stats-row">
                      {[
                        { label: 'Current Draw', value: liveEnergy, trend: anomalies.some(a => a.metric === 'power_kw') ? '+14.5%' : '-4.3%', color: '#f59e0b' },
                        { label: 'Carbon Footprint (Daily)', value: '4.2 Tons', trend: '-12%', color: '#10b981' },
                        { label: 'Cost Savings (MTD)', value: '$12,450', trend: '+8.1%', color: 'var(--accent-brand)' },
                      ].filter(s => matchesSearch(s.label)).map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
                          <h4 className="stat-card-label">{stat.label}</h4>
                          <div className="stat-card-value-row">
                            <span className="stat-card-value" style={{ color: stat.color }}>{stat.value}</span>
                            <span className="stat-card-trend">{stat.trend}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="bento-card flex flex-col" style={{ minHeight: '450px' }}>
                      <div className="bento-header">
                        <h3>Energy Consumption — Live Power Feed</h3>
                      </div>
                      <div className="energy-chart-container" style={{ flex: 1, position: 'relative', marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>

                        {!hasData ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.75rem' }}>
                            <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <p style={{ fontSize: '0.875rem' }}>Collecting live power data from simulation...</p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>The graph will appear within a second.</p>
                          </div>
                        ) : (
                          <>
                            {/* Dynamic Y-Axis Labels */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                              {yLabels.map((l, i) => <span key={i}>{l}</span>)}
                            </div>

                            {/* SVG Chart */}
                            <div style={{ flex: 1, marginLeft: '3rem', position: 'relative' }}>
                              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                <defs>
                                  <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
                                  </linearGradient>
                                </defs>
                                <g stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5">
                                  <line x1="0" y1="0" x2="1000" y2="0" />
                                  <line x1="0" y1="75" x2="1000" y2="75" />
                                  <line x1="0" y1="150" x2="1000" y2="150" />
                                  <line x1="0" y1="225" x2="1000" y2="225" />
                                  <line x1="0" y1="300" x2="1000" y2="300" />
                                </g>
                                <path d={energyFillPath} fill="url(#energyGradient)" />
                                <path
                                  d={energyLinePath}
                                  fill="none" stroke="#f59e0b" strokeWidth="3"
                                  strokeLinecap="round" strokeLinejoin="round"
                                  style={{ filter: 'drop-shadow(0px 4px 6px rgba(245,158,11,0.3))' }}
                                />
                                {dotPoints.map((pt, i) => (
                                  <g key={i} className="chart-point-group" style={{ cursor: 'pointer' }}>
                                    <circle cx={pt.cx} cy={pt.cy} r="5" fill="white" stroke="#f59e0b" strokeWidth="3" />
                                    <g className="chart-tooltip" style={{ opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                                      <rect x={pt.cx - 35} y={pt.cy - 45} width="70" height="28" rx="4" fill="var(--text-main)" />
                                      <text x={pt.cx} y={pt.cy - 26} fill="var(--bg-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">{pt.val}</text>
                                    </g>
                                  </g>
                                ))}
                              </svg>
                            </div>

                            {/* X-axis footer */}
                            <div style={{ marginLeft: '3rem', display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                              <span>oldest</span>
                              <span style={{ fontStyle: 'italic' }}>{energyHistory.length} live readings</span>
                              <span>now</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })()}

              {/* ===== SAFETY ===== */}
              {activeTab === 'safety' && (
                <motion.div
                  key="safety"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="dashboard-grid"
                >
                  <div className="bento-card bento-wide" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Computer Vision Safety</h3>
                      <p className="text-muted" style={{ fontSize: '0.875rem' }}>Real-time monitoring and image analysis for PPE compliance and hazard detection.</p>
                    </div>
                    <label className="btn-primary cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={16} /> Upload Video for Analysis
                      <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          alert(`Video "${e.target.files[0].name}" uploaded for Safety CV Analysis! (Simulation)`)
                        }
                      }} />
                    </label>
                  </div>

                  <div className="bento-card bento-wide">
                    <div className="bento-header" style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', color: '#10b981' }}>
                          <ImageIcon size={20} />
                        </div>
                        <h3>Live Camera Feeds</h3>
                      </div>
                      <span className="status-badge bg-success-light text-success" style={{ padding: '0.375rem 0.75rem', borderRadius: '2rem' }}>
                        <span className="live-dot" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', marginRight: '6px' }}></span>
                        CV Monitoring Active
                      </span>
                    </div>
                    <div className="camera-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                      {[1, 2, 3, 4].map((cam, i) => {
                        const hasVisionAlert = cam === 1 && anomalies.some(a => a.domain === 'vision')
                        return (
                          <motion.div
                            key={cam}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="camera-feed"
                            style={{ 
                              borderRadius: '1rem', 
                              overflow: 'hidden', 
                              border: hasVisionAlert ? '2px solid #ef4444' : '1px solid var(--border-color)', 
                              position: 'relative', 
                              height: '240px', 
                              background: '#1e293b', 
                              boxShadow: hasVisionAlert ? '0 0 15px rgba(239, 68, 68, 0.3)' : '0 10px 25px rgba(0,0,0,0.05)' 
                            }}
                          >
                            <div className="camera-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
                              <span className="camera-label" style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>Zone {cam} - {['Assembly', 'Packaging', 'Loading Dock', 'Warehouse'][cam - 1]}</span>
                              <span className={`live-badge ${hasVisionAlert ? 'bg-danger animate-pulse' : ''}`} style={{ background: hasVisionAlert ? '#ef4444' : 'rgba(239,68,68,0.9)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
                                {hasVisionAlert ? 'SAFETY VIOLATION' : 'LIVE'}
                              </span>
                            </div>

                            {/* Synthetic visual for camera background */}
                            <div style={{ position: 'absolute', inset: 0, background: `url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop') center/cover`, opacity: 0.5 }}></div>

                            <div className="cv-boxes-mock" style={{ position: 'absolute', inset: 0 }}>
                              {cam === 1 && <div className="cv-box safe" style={{ position: 'absolute', border: '2px solid #10b981', background: 'rgba(16,185,129,0.2)', padding: '2px 6px', color: 'white', fontSize: '0.75rem', left: '30%', top: '40%', width: '120px', height: '150px' }}>Person (PPE 100%)</div>}
                              {cam === 1 && <div className="cv-box safe" style={{ position: 'absolute', border: '2px solid #10b981', background: 'rgba(16,185,129,0.2)', padding: '2px 6px', color: 'white', fontSize: '0.75rem', left: '60%', top: '50%', width: '80px', height: '80px' }}>Helmet</div>}
                              {cam === 2 && <div className="cv-box warning" style={{ position: 'absolute', border: '2px solid #ef4444', background: 'rgba(239,68,68,0.2)', padding: '2px 6px', color: 'white', fontSize: '0.75rem', left: '20%', top: '60%', width: '100px', height: '130px', fontWeight: 'bold' }}>⚠️ Missing Vest</div>}
                              {cam === 3 && <div className="cv-box safe" style={{ position: 'absolute', border: '2px solid #3b82f6', background: 'rgba(59,130,246,0.2)', padding: '2px 6px', color: 'white', fontSize: '0.75rem', left: '40%', top: '30%', width: '200px', height: '180px' }}>Forklift - Safe Distance</div>}
                              {hasVisionAlert && (
                                <div className="cv-box danger" style={{ position: 'absolute', border: '2px solid #ef4444', background: 'rgba(239,68,68,0.2)', padding: '2px 6px', color: 'white', fontSize: '0.75rem', left: '35%', top: '55%', width: '210px', height: '90px', fontWeight: 'bold' }}>
                                  Restricted Zone Breach (CNC-04)
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== MAINTENANCE ===== */}
              {activeTab === 'maintenance' && (
                <motion.div
                  key="maintenance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="dashboard-grid"
                >
                  <div className="dashboard-stats-row" style={{ marginBottom: '1.5rem' }}>
                    {[
                      {
                        label: 'Active Alerts',
                        value: incidents.length.toString(),
                        trend: incidents.some(i => i.priority === 'CRITICAL') ? 'Critical — Act Now' : incidents.length > 0 ? 'Needs Review' : 'All Clear',
                        color: incidents.length > 0 ? '#ef4444' : '#10b981'
                      },
                      {
                        label: 'Open Work Orders',
                        // Count machine-driven WOs not yet completed
                        value: (() => {
                          const woIds: string[] = []
                          machinesList.forEach(m => {
                            const mAnoms = anomalies.filter(a => a.machine_id === m.id)
                            const mInc = incidents.find(i => i.asset === m.id)
                            if (mInc) woIds.push(`WO-INC-${m.id}`)
                            if (mAnoms.some(a => a.metric === 'temperature')) woIds.push(`WO-COOL-${m.id}`)
                            if (mAnoms.some(a => a.metric === 'vibration')) woIds.push(`WO-BEAR-${m.id}`)
                            const util = parseFloat(String(m.util)) || 90
                            if (util > 85) woIds.push(`WO-LUBE-${m.id}`)
                          })
                          const open = woIds.filter(id => !completedWorkOrders.includes(id))
                          return open.length.toString()
                        })(),
                        trend: completedWorkOrders.length > 0 ? `${completedWorkOrders.length} Completed` : 'Pending',
                        color: '#f59e0b'
                      },
                      {
                        label: 'Machines Monitored',
                        value: `${machinesList.length}`,
                        trend: machinesList.length > 0 ? `${anomalies.length} Anomalies` : 'Import machines to begin',
                        color: '#10b981'
                      },
                    ].map((stat, i) => (
                      <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
                        <h4 className="stat-card-label">{stat.label}</h4>
                        <div className="stat-card-value-row">
                          <span className="stat-card-value" style={{ color: stat.color }}>{stat.value}</span>
                          <span className={`stat-card-trend ${stat.trend.includes('Critical') || stat.trend.includes('Needs') ? 'text-warning' : ''}`}>{stat.trend}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="maintenance-layout">
                    {/* Predictive Alerts */}
                    <div className="bento-card flex flex-col">
                      <div className="bento-header" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: '#ef4444' }}>
                              <AlertTriangle size={20} />
                            </div>
                            <h3 style={{ margin: 0 }}>Predictive Alerts</h3>
                          </div>
                          {/* Machine filter chip */}
                          {maintenanceMachineFilter && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.65rem', borderRadius: '2rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                              <span>Filtered: {maintenanceMachineFilter}</span>
                              <button
                                onClick={() => setMaintenanceMachineFilter(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '0.1rem' }}
                                title="Clear filter"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="alerts-feed" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {incidents.length === 0 ? (
                          <div className="text-muted text-center py-8">
                            No active predictive alerts. Run a scenario from the sidebar simulator to test anomaly detection!
                          </div>
                        ) : (
                          incidents
                            .filter(inc => !maintenanceMachineFilter || inc.asset.toLowerCase() === maintenanceMachineFilter.toLowerCase())
                            .filter(inc => matchesSearch(inc.detection_summary + ' ' + inc.asset)).map((inc, i) => {
                            const isCritical = inc.priority === 'CRITICAL' || inc.priority === 'HIGH'
                            return (
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={inc.incident_id}
                                className={`maintenance-alert-card alert-${isCritical ? 'critical' : 'warning'}`}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.02)' }}
                              >
                                <div className="alert-content">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <span className="status-badge danger" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>{inc.priority}</span>
                                    <span className="alert-time">{inc.start_time}</span>
                                  </div>
                                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{getIncidentTitle(inc)}</h4>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-primary)' }}>{inc.asset}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {inc.incident_id}</span>
                                  </div>
                                  <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.35rem 0 0 0', lineHeight: '1.4' }}>{inc.detection_summary}</p>
                                </div>
                                <button
                                  className="btn-small btn-primary"
                                  onClick={() => handleOpenAIModal(inc)}
                                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                                >
                                  <Cpu size={12} />
                                  <span>Analyze Root-Cause</span>
                                </button>
                              </motion.div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    {/* Scheduled Work Orders */}
                    <div className="bento-card flex flex-col">
                      <div className="bento-header" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', color: '#3b82f6' }}>
                            <Settings size={20} />
                          </div>
                          <h3>Scheduled Work Orders</h3>
                        </div>
                      </div>
                      <div className="work-orders-list" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(() => {
                          // Build dynamic work orders from imported machine data + live anomalies/incidents
                          const dynamicWOs: { id: string; desc: string; due: string; type: string; urgency: 'urgent' | 'preventive' | 'routine' }[] = []

                          machinesList.forEach(m => {
                            const mAnoms = anomalies.filter(a => a.machine_id === m.id)
                            const mInc = incidents.find(i => i.asset === m.id)
                            const util = parseFloat(String(m.util)) || 90

                            // 1. URGENT: machine has an active incident from AI detection
                            if (mInc) {
                              dynamicWOs.push({
                                id: `WO-INC-${m.id}`,
                                desc: `⚡ AI-Detected Fault Response — ${m.name} (${getIncidentTitle(mInc)})`,
                                due: 'Immediate',
                                type: 'corrective',
                                urgency: 'urgent'
                              })
                            }

                            // 2. HIGH TEMP anomaly → cooling / thermal inspection
                            const tempAnom = mAnoms.find(a => a.metric === 'temperature')
                            if (tempAnom) {
                              dynamicWOs.push({
                                id: `WO-COOL-${m.id}`,
                                desc: `Thermal Inspection & Cooling Service — ${m.name} (${tempAnom.current_value?.toFixed(1) ?? '?'}°C detected)`,
                                due: 'Today',
                                type: 'corrective',
                                urgency: 'urgent'
                              })
                            }

                            // 3. HIGH VIBRATION anomaly → bearing check
                            const vibAnom = mAnoms.find(a => a.metric === 'vibration')
                            if (vibAnom) {
                              dynamicWOs.push({
                                id: `WO-BEAR-${m.id}`,
                                desc: `Bearing & Spindle Inspection — ${m.name} (${vibAnom.current_value?.toFixed(2) ?? '?'} mm/s)`,
                                due: 'Tomorrow',
                                type: 'preventive',
                                urgency: 'preventive'
                              })
                            }

                            // 4. HIGH UTILIZATION → scheduled lubrication
                            if (util > 85 && !mInc) {
                              dynamicWOs.push({
                                id: `WO-LUBE-${m.id}`,
                                desc: `Preventive Lubrication & Wear Check — ${m.name} (${util}% utilization)`,
                                due: 'In 3 Days',
                                type: 'preventive',
                                urgency: 'preventive'
                              })
                            }

                            // 5. POWER anomaly → electrical inspection
                            const powerAnom = mAnoms.find(a => a.metric === 'power_kw')
                            if (powerAnom) {
                              dynamicWOs.push({
                                id: `WO-ELEC-${m.id}`,
                                desc: `Electrical Load Audit — ${m.name} (${powerAnom.current_value?.toFixed(1) ?? '?'} kW draw)`,
                                due: 'Next Week',
                                type: 'routine',
                                urgency: 'routine'
                              })
                            }
                          })

                          if (dynamicWOs.length === 0) {
                            return (
                              <div className="text-muted text-center py-8" style={{ padding: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                {machinesList.length === 0
                                  ? 'Import machines on the Machines page to generate maintenance work orders.'
                                  : 'All machines healthy — no work orders required at this time.'
                                }
                              </div>
                            )
                          }

                          const urgencyColor = (u: string) => u === 'urgent' ? '#ef4444' : u === 'preventive' ? '#f59e0b' : '#3b82f6'

                          return dynamicWOs
                            .filter(w => matchesSearch(w.desc + ' ' + w.id))
                            .map((wo) => {
                              const isCompleted = completedWorkOrders.includes(wo.id)
                              return (
                                <div key={wo.id} className={`wo-card ${isCompleted ? 'wo-completed' : ''}`} style={{ borderLeft: `3px solid ${isCompleted ? '#10b981' : urgencyColor(wo.urgency)}` }}>
                                  <div className="wo-details">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                      <div className="wo-id-badge" style={{ background: isCompleted ? 'rgba(16,185,129,0.1)' : `rgba(${wo.urgency === 'urgent' ? '239,68,68' : wo.urgency === 'preventive' ? '245,158,11' : '59,130,246'},0.1)`, color: urgencyColor(wo.urgency) }}>{wo.id}</div>
                                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: urgencyColor(wo.urgency), textTransform: 'uppercase', letterSpacing: '0.04em' }}>{wo.urgency}</span>
                                    </div>
                                    <div className="wo-desc" style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>{wo.desc}</div>
                                    <span className="wo-due text-muted text-small flex items-center gap-1">
                                      <Clock size={12} /> Due {wo.due}
                                    </span>
                                  </div>
                                  <button
                                    className={`wo-action-btn ${isCompleted ? 'completed' : ''}`}
                                    title={isCompleted ? 'Mark as open' : 'Mark as done'}
                                    onClick={async () => {
                                      const newStatus = !isCompleted;
                                      if (newStatus) {
                                        await logWorkOrder('complete', wo.id);
                                        setCompletedWorkOrders([...completedWorkOrders, wo.id]);
                                      } else {
                                        // Simple optimistic un-completion (would ideally need a backend undo endpoint, but for now just local state since backend persists completions)
                                        setCompletedWorkOrders(completedWorkOrders.filter(id => id !== wo.id));
                                      }
                                    }}
                                  >
                                    <CheckCircle size={20} />
                                  </button>
                                </div>
                              )
                            })
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== SETTINGS ===== */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="settings-page-container">
                    <div className="settings-page-header">
                      <h2>Account Settings</h2>
                      <p className="text-muted">Manage your account preferences and factory settings.</p>
                    </div>

                    <div className="settings-section">
                      <div className="settings-section-info">
                        <h3>Profile Information</h3>
                        <p className="text-muted">Update your personal details and public profile.</p>
                      </div>
                      <div className="settings-section-content">
                        <div className="settings-field">
                          <label>Display Name</label>
                          <input type="text" defaultValue="Admin User" />
                        </div>
                        <div className="settings-field">
                          <label>Email</label>
                          <input type="email" defaultValue="admin@optimus.ai" />
                        </div>
                        <div className="settings-field">
                          <label>Role</label>
                          <input type="text" defaultValue="Factory Manager" readOnly />
                        </div>
                        <div className="settings-action">
                          <button className="settings-save-btn">Save Changes</button>
                        </div>
                      </div>
                    </div>

                    <hr className="settings-divider" />

                    <div className="settings-section">
                      <div className="settings-section-info">
                        <h3>Security</h3>
                        <p className="text-muted">Ensure your account remains secure with a strong password.</p>
                      </div>
                      <div className="settings-section-content">
                        <div className="settings-field">
                          <label>Current Password</label>
                          <input type="password" placeholder="••••••••" />
                        </div>
                        <div className="settings-field">
                          <label>New Password</label>
                          <input type="password" placeholder="••••••••" />
                        </div>
                        <div className="settings-action">
                          <button className="settings-save-btn">Update Password</button>
                        </div>
                      </div>
                    </div>

                    <hr className="settings-divider" />

                    <div className="settings-section">
                      <div className="settings-section-info">
                        <h3>Preferences</h3>
                        <p className="text-muted">Customize your dashboard experience and alerts.</p>
                      </div>
                      <div className="settings-section-content">
                        <div className="settings-options">
                          <div className="settings-option-row">
                            <div className="settings-option-info-inner">
                              <span className="font-semibold text-main">Email Notifications</span>
                              <span className="text-muted text-small mt-1 block">Receive daily reports via email.</span>
                            </div>
                            <label className="toggle-switch">
                              <input type="checkbox" defaultChecked />
                              <span className="toggle-slider" />
                            </label>
                          </div>
                          <div className="settings-option-row">
                            <div className="settings-option-info-inner">
                              <span className="font-semibold text-main">Critical Alerts</span>
                              <span className="text-muted text-small mt-1 block">Immediate push notifications for machine failures.</span>
                            </div>
                            <label className="toggle-switch">
                              <input type="checkbox" defaultChecked />
                              <span className="toggle-slider" />
                            </label>
                          </div>
                          <div className="settings-option-row">
                            <div className="settings-option-info-inner">
                              <span className="font-semibold text-main">Dark Mode</span>
                              <span className="text-muted text-small mt-1 block">Switch the dashboard to a darker theme.</span>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={(e) => setDarkMode(e.target.checked)}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Machine Details Modal */}
        <AnimatePresence>
          {selectedMachine && (
            <div className="modal-backdrop" onClick={() => setSelectedMachine(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="machine-modal glass"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <span className="text-muted text-small">{selectedMachine.id}</span>
                    <h3>{selectedMachine.name}</h3>
                  </div>
                  <button className="modal-close-btn" onClick={() => setSelectedMachine(null)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-status-banner">
                    <div className={`status-indicator ${selectedMachine.status.toLowerCase()}`} />
                    <span className="font-semibold">{selectedMachine.status}</span>
                  </div>

                  <div className="modal-metrics-grid">
                    <div className="modal-metric-card">
                      <span className="text-muted text-small">Temperature</span>
                      <div className={`metric-value-large ${selectedMachine.temp > '50' ? 'text-warning' : 'text-main'}`}>
                        {selectedMachine.temp}
                      </div>
                    </div>
                    <div className="modal-metric-card">
                      <span className="text-muted text-small">Vibration</span>
                      <div className={`metric-value-large ${selectedMachine.vib > '1.0' ? 'text-warning' : 'text-main'}`}>
                        {selectedMachine.vib}
                      </div>
                    </div>
                    <div className="modal-metric-card">
                      <span className="text-muted text-small">Utilization</span>
                      <div className="metric-value-large text-main">
                        {selectedMachine.util}%
                      </div>
                    </div>
                  </div>

                  {/* Live Incident Count from backend */}
                  {machineIncidentCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '0.25rem' }}>
                      <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>
                        {machineIncidentCount} active incident{machineIncidentCount !== 1 ? 's' : ''} recorded for this machine
                      </span>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button
                      className="btn-primary w-full"
                      onClick={() => {
                        setMaintenanceMachineFilter(selectedMachine.id)
                        setActiveTab('maintenance')
                        setSelectedMachine(null)
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                      <ScrollText size={15} />
                      <span>View Maintenance Logs</span>
                    </button>
                    {selectedMachine.status === 'Warning' && (
                      <button className="btn-secondary w-full text-danger border-danger">Halt Machine</button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Explainable AI Diagnosis Modal */}
        <AnimatePresence>
          {selectedIncident && (
            <div className="modal-backdrop" onClick={handleCloseAIModal} style={{ zIndex: 1100 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="machine-modal glass"
                style={{ maxWidth: '650px', width: '100%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <span className="status-badge danger" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', marginRight: '0.5rem', textTransform: 'uppercase' }}>{selectedIncident.priority}</span>
                    <h3 style={{ display: 'inline-block', margin: 0 }}>Incident Diagnosis: {selectedIncident.incident_id}</h3>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseAIModal}>
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {loadingRec ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--accent-primary)', borderRadius: '50%', width: '36px', height: '36px', marginBottom: '1.25rem' }}
                      />
                      <p className="text-muted" style={{ fontSize: '0.875rem' }}>Querying Gemini 3.5 Flash for explainable operational reasoning...</p>
                    </div>
                  ) : recommendation ? (
                    <>
                      {/* Summary */}
                      <div style={{ padding: '1rem', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '0.5rem', borderLeft: '3px solid var(--accent-primary)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Root-Cause Summary</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>{recommendation.summary}</p>
                      </div>

                      {/* Probable Causes */}
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Probable Causes</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(recommendation.probable_causes || recommendation.probableCauses || []).map((cause: any, idx: number) => (
                            <div key={idx} style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cause.cause}</span>
                                <span className={`status-badge ${cause.confidence === 'high' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                  {cause.confidence.toUpperCase()}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Basis: {cause.basis.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Recommended Actions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(recommendation.recommended_actions || recommendation.recommendedActions || []).map((act: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" readOnly checked={false} style={{ accentColor: 'var(--accent-primary)' }} />
                                <span style={{ fontSize: '0.875rem' }}>{act.action}</span>
                              </div>
                              <span className="status-badge bg-brand-light text-brand" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>{act.timeline}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Operator Explanation */}
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>Detailed Technical Explanation</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>{recommendation.operator_explanation || recommendation.operatorExplanation || ""}</p>
                      </div>

                      {/* Estimated Impact */}
                      <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.08)', borderRadius: '0.5rem' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: '#ef4444', fontSize: '0.85rem' }}>Estimated Impact</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#fca5a5', lineHeight: '1.4' }}>{recommendation.estimated_impact || recommendation.estimatedImpact || ""}</p>
                      </div>

                      {/* Limitations */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        ⚠️ {recommendation.limitations}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-danger py-4">Failed to load root cause analysis.</div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Machinery Modal */}
        <AnimatePresence>
          {showAddMachineModal && (
            <div className="modal-backdrop" onClick={() => setShowAddMachineModal(false)} style={{ zIndex: 1100 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="machine-modal glass"
                style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <h3>Import Company Machinery</h3>
                    <span className="text-muted text-small">Configure local asset parameter mappings</span>
                  </div>
                  <button className="modal-close-btn" onClick={() => setShowAddMachineModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddMachine} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Machine ID (Immutable / Match telemetry)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CNC-04, PRESS-02"
                      value={newMachineId}
                      onChange={(e) => setNewMachineId(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Machine Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spindle Milling Unit B"
                      value={newMachineName}
                      onChange={(e) => setNewMachineName(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial Temp</label>
                      <input
                        type="text"
                        value={newMachineTemp}
                        onChange={(e) => setNewMachineTemp(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial Vibration</label>
                      <input
                        type="text"
                        value={newMachineVib}
                        onChange={(e) => setNewMachineVib(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial Utilization (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newMachineUtil}
                      onChange={(e) => setNewMachineUtil(Number(e.target.value))}
                      style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none' }}
                    />
                  </div>

                  <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn-primary w-full" style={{ cursor: 'pointer' }}>Import Machinery</button>
                    <button type="button" className="btn-secondary w-full" onClick={() => setShowAddMachineModal(false)} style={{ cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
