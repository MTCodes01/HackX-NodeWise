import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Shield, Zap, Wrench,
  Settings, LogOut, Bell, Search, Menu, X, ChevronRight, Cpu, MonitorSpeaker, ScrollText,
  Moon, Sun, Globe, Lock, User, HelpCircle, AlertTriangle, CheckCircle, Clock
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import DigitalTwinView from '../digital-twin/DigitalTwinView'


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
  
  // Maintenance State
  const [createdWorkOrders, setCreatedWorkOrders] = useState<number[]>([])
  const [completedWorkOrders, setCompletedWorkOrders] = useState<string[]>([])

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
                <Link to="/" className="sidebar-link text-danger hover-bg-danger">
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-grid"
                >
                  <div className="dashboard-stats-row">
                    {[
                      { label: 'Overall Equipment Effectiveness', value: '87.4%', trend: '+1.2%', color: 'var(--accent-primary)' },
                      { label: 'Active Machines', value: '47 / 52', trend: 'Optimal', color: '#10b981' },
                      { label: 'Total Energy Usage', value: '1.24 MW', trend: '-4.3%', color: '#f59e0b' },
                      { label: 'Safety Incidents (24h)', value: '0', trend: 'Stable', color: '#10b981' },
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
                      <div className="machine-list">
                        {[
                          { name: 'Milling Station A', status: 'Online', perf: 98 },
                          { name: 'Assembly Line 3', status: 'Warning', perf: 72 },
                          { name: 'Packaging Unit', status: 'Online', perf: 94 },
                          { name: 'CNC Machine 2', status: 'Maintenance', perf: 0 },
                        ].filter(m => matchesSearch(m.name)).map((m, i) => (
                          <motion.div
                            key={m.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="machine-item"
                            onClick={() => setSelectedMachine({ id: `M-0${i+1}`, ...m, temp: m.name === 'Assembly Line 3' ? '58°C' : '42°C', vib: m.name === 'Assembly Line 3' ? '1.2mm/s' : '0.4mm/s', util: m.perf })}
                          >
                            <div className="machine-info">
                              <div className={`status-indicator ${m.status.toLowerCase()}`} />
                              <span className="machine-name">{m.name}</span>
                            </div>
                            <span className="machine-perf">{m.perf}%</span>
                          </motion.div>
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
                  <DigitalTwinView view={activeTab as 'twin' | 'logs'} />
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
                  <DigitalTwinView view={activeTab as 'twin' | 'logs'} />
                </motion.div>
              )}

              {/* ===== MACHINES ===== */}
              {activeTab === 'machines' && (
                <motion.div
                  key="machines"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-grid"
                >
                  <div className="bento-header">
                    <h3>Fleet Overview</h3>
                    <div className="status-badges-row">
                      <span className="status-badge bg-success-light text-success">47 Online</span>
                      <span className="status-badge bg-warning-light text-warning">2 Warning</span>
                      <span className="status-badge bg-danger-light text-danger">3 Offline</span>
                    </div>
                  </div>
                  <div className="machines-grid">
                    {[
                      { id: 'M-01', name: 'Milling Station A', status: 'Online', temp: '42°C', vib: '0.4mm/s', util: 98 },
                      { id: 'M-02', name: 'CNC Machine 1', status: 'Online', temp: '45°C', vib: '0.6mm/s', util: 92 },
                      { id: 'M-03', name: 'Assembly Line 3', status: 'Warning', temp: '58°C', vib: '1.2mm/s', util: 72 },
                      { id: 'M-04', name: 'Packaging Unit', status: 'Online', temp: '38°C', vib: '0.2mm/s', util: 94 },
                      { id: 'M-05', name: 'CNC Machine 2', status: 'Maintenance', temp: '---', vib: '---', util: 0 },
                      { id: 'M-06', name: 'Painting Robot C', status: 'Online', temp: '40°C', vib: '0.3mm/s', util: 88 },
                    ].filter(m => matchesSearch(m.name + ' ' + m.id)).map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="machine-detail-card cursor-pointer"
                        onClick={() => setSelectedMachine(m)}
                      >
                        <div className="machine-card-header">
                          <div>
                            <span className="machine-id">{m.id}</span>
                            <h4>{m.name}</h4>
                          </div>
                          <div className={`status-indicator ${m.status.toLowerCase()}`} />
                        </div>
                        <div className="machine-metrics-row">
                          <div className="metric-col">
                            <span className="metric-label">Temp</span>
                            <span className={`metric-val ${m.temp > '50' ? 'text-warning' : ''}`}>{m.temp}</span>
                          </div>
                          <div className="metric-col">
                            <span className="metric-label">Vibration</span>
                            <span className={`metric-val ${m.vib > '1.0' ? 'text-warning' : ''}`}>{m.vib}</span>
                          </div>
                          <div className="metric-col">
                            <span className="metric-label">Utilization</span>
                            <span className="metric-val">{m.util}%</span>
                          </div>
                        </div>
                        <div className="util-bar-bg">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.util}%` }}
                            transition={{ delay: i * 0.05 + 0.2, duration: 0.6 }}
                            className={`util-bar-fill ${m.status.toLowerCase()}`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ===== ENERGY ===== */}
              {activeTab === 'energy' && (
                <motion.div
                  key="energy"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-grid"
                >
                  <div className="dashboard-stats-row">
                    {[
                      { label: 'Current Draw', value: '1.24 MW', trend: '-4.3%', color: '#f59e0b' },
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
                      <h3>Energy Consumption (24h)</h3>
                    </div>
                    <div className="energy-chart-container" style={{ flex: 1, position: 'relative', marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
                      
                      {/* Y-Axis Labels (Absolute Positioning) */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                        <span>2.0 MW</span>
                        <span>1.5 MW</span>
                        <span>1.0 MW</span>
                        <span>0.5 MW</span>
                        <span>0 MW</span>
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
                          
                          {/* Grid lines */}
                          <g stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5">
                            <line x1="0" y1="0" x2="1000" y2="0" />
                            <line x1="0" y1="75" x2="1000" y2="75" />
                            <line x1="0" y1="150" x2="1000" y2="150" />
                            <line x1="0" y1="225" x2="1000" y2="225" />
                            <line x1="0" y1="300" x2="1000" y2="300" />
                          </g>
                          
                          {/* Area Fill */}
                          <motion.path 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            d="M0,300 L0,220 C150,180 250,260 400,150 C550,40 650,140 800,100 C900,70 950,50 1000,90 L1000,300 Z" 
                            fill="url(#energyGradient)" 
                          />
                          
                          {/* Line */}
                          <motion.path 
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            d="M0,220 C150,180 250,260 400,150 C550,40 650,140 800,100 C900,70 950,50 1000,90" 
                            fill="none" 
                            stroke="#f59e0b" 
                            strokeWidth="4" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0px 4px 6px rgba(245, 158, 11, 0.3))' }}
                          />
                          
                          {/* Data points */}
                          {[
                            { cx: 0, cy: 220, val: '0.8 MW' },
                            { cx: 200, cy: 215, val: '0.9 MW' },
                            { cx: 400, cy: 150, val: '1.4 MW' },
                            { cx: 600, cy: 95, val: '1.8 MW' },
                            { cx: 800, cy: 100, val: '1.7 MW' },
                            { cx: 1000, cy: 90, val: '1.9 MW' }
                          ].map((pt, i) => (
                            <g key={i} className="chart-point-group" style={{ cursor: 'pointer' }}>
                              <motion.circle 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1 + (i * 0.1), type: 'spring' }}
                                cx={pt.cx} cy={pt.cy} r="6" fill="white" stroke="#f59e0b" strokeWidth="3" 
                              />
                              {/* Hidden tooltip that shows on hover using CSS */}
                              <g className="chart-tooltip" style={{ opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                                <rect x={pt.cx - 35} y={pt.cy - 45} width="70" height="28" rx="4" fill="var(--text-main)" />
                                <text x={pt.cx} y={pt.cy - 26} fill="var(--bg-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">{pt.val}</text>
                              </g>
                            </g>
                          ))}
                        </svg>
                      </div>
                      
                      {/* X-axis labels */}
                      <div style={{ marginLeft: '3rem', display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                        <span>00:00</span>
                        <span>04:00</span>
                        <span>08:00</span>
                        <span>12:00</span>
                        <span>16:00</span>
                        <span>20:00</span>
                        <span>24:00</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== SAFETY ===== */}
              {activeTab === 'safety' && (
                <motion.div
                  key="safety"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-grid"
                >
                  <div className="bento-header">
                    <h3>Active Camera Feeds</h3>
                    <span className="status-badge bg-success-light text-success">CV Monitoring Active</span>
                  </div>
                  <div className="camera-grid">
                    {[1, 2, 3, 4].map((cam) => (
                      <div key={cam} className="camera-feed">
                        <div className="camera-overlay">
                          <span className="camera-label">Zone {cam} - Assembly</span>
                          <span className="live-badge">LIVE</span>
                        </div>
                        <div className="cv-boxes-mock">
                          <div className="cv-box safe" style={{ left: '30%', top: '40%' }}>Person</div>
                          <div className="cv-box safe" style={{ left: '60%', top: '50%' }}>Helmet</div>
                          {cam === 2 && <div className="cv-box warning" style={{ left: '20%', top: '70%' }}>No Vest</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ===== MAINTENANCE ===== */}
              {activeTab === 'maintenance' && (
                <motion.div
                  key="maintenance"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-grid"
                >
                  <div className="dashboard-stats-row" style={{ marginBottom: '1.5rem' }}>
                    {[
                      { label: 'Active Alerts', value: '3', trend: 'Needs Action', color: '#ef4444' },
                      { label: 'Open Work Orders', value: '12', trend: '4 Overdue', color: '#f59e0b' },
                      { label: 'Technicians on Shift', value: '8 / 10', trend: 'Optimal', color: '#10b981' },
                    ].map((stat, i) => (
                      <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
                        <h4 className="stat-card-label">{stat.label}</h4>
                        <div className="stat-card-value-row">
                          <span className="stat-card-value" style={{ color: stat.color }}>{stat.value}</span>
                          <span className={`stat-card-trend ${stat.trend.includes('Overdue') || stat.trend.includes('Needs') ? 'text-warning' : ''}`}>{stat.trend}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="maintenance-layout">
                    {/* Predictive Alerts */}
                    <div className="bento-card flex flex-col">
                      <div className="bento-header" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', color: '#ef4444' }}>
                            <AlertTriangle size={20} />
                          </div>
                          <h3>Predictive Alerts</h3>
                        </div>
                      </div>
                      <div className="alerts-feed" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                          { level: 'critical', msg: 'Spindle bearing wear critical on CNC-2', time: '10 mins ago' },
                          { level: 'warning', msg: 'Abnormal temperature rise (58°C) in Assembly Line 3', time: '2 hours ago' },
                          { level: 'info', msg: 'Hydraulic fluid pressure drop detected on Press B', time: '5 hours ago' },
                        ].filter(a => matchesSearch(a.msg)).map((alert, i) => {
                          const isCreated = createdWorkOrders.includes(i)
                          return (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              key={i}
                              className={`maintenance-alert-card alert-${alert.level}`}
                            >
                              <div className="alert-content">
                                <span className="alert-time">{alert.time}</span>
                                <h4>{alert.msg}</h4>
                              </div>
                              <button 
                                className={`btn-small ${isCreated ? 'btn-success' : 'btn-primary'}`}
                                disabled={isCreated}
                                onClick={() => setCreatedWorkOrders([...createdWorkOrders, i])}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {isCreated ? 'Work Order Created' : 'Create Work Order'}
                              </button>
                            </motion.div>
                          )
                        })}
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
                        {[
                          { id: 'WO-8832', desc: 'Quarterly lubrication of Conveyor Belt A', due: 'Tomorrow', type: 'preventive' },
                          { id: 'WO-8833', desc: 'Replace HEPA filters in Cleanroom 2', due: 'In 3 Days', type: 'routine' },
                          { id: 'WO-8834', desc: 'Calibrate robotic arm sensors (Line 4)', due: 'Next Week', type: 'calibration' },
                        ].filter(w => matchesSearch(w.desc + ' ' + w.id)).map((wo) => {
                          const isCompleted = completedWorkOrders.includes(wo.id)
                          return (
                            <div key={wo.id} className={`wo-card ${isCompleted ? 'wo-completed' : ''}`}>
                              <div className="wo-details">
                                <div className="wo-id-badge">{wo.id}</div>
                                <div className="wo-desc" style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>{wo.desc}</div>
                                <span className="wo-due text-muted text-small flex items-center gap-1">
                                  <Clock size={12} /> Due {wo.due}
                                </span>
                              </div>
                              <button 
                                className={`wo-action-btn ${isCompleted ? 'completed' : ''}`}
                                onClick={() => isCompleted ? setCompletedWorkOrders(completedWorkOrders.filter(id => id !== wo.id)) : setCompletedWorkOrders([...completedWorkOrders, wo.id])}
                              >
                                <CheckCircle size={20} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== SETTINGS ===== */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
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

                  <div className="modal-actions">
                    <button className="btn-primary w-full">View Maintenance Logs</button>
                    {selectedMachine.status === 'Warning' && (
                      <button className="btn-secondary w-full text-danger border-danger">Halt Machine</button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
