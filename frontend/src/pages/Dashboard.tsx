import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Shield, Zap, Wrench, 
  Settings, LogOut, Bell, Search, Menu, X, ChevronRight, Cpu, MonitorSpeaker, ScrollText
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <PageTransition>
      <div className="dashboard-layout">
        {/* Animated background glow */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="dashboard-bg-glow" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="dashboard-bg-glow" 
          style={{ top: 'auto', bottom: '-10rem', left: 'auto', right: '-10rem', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.04) 0%, transparent 70%)' }}
        />

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
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden sidebar-close">
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
                <button className="sidebar-link">
                  <Settings size={18} />
                  <span>Settings</span>
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
                <Search size={16} className="text-muted" />
                <input type="text" placeholder="Search factory data..." />
              </div>
              <button className="topbar-btn relative">
                <Bell size={20} />
                <span className="notification-dot" />
              </button>
              <div className="user-avatar">AD</div>
            </div>
          </header>

          <div className={`dashboard-content-area ${activeTab === 'twin' || activeTab === 'logs' ? 'no-padding' : ''}`}>
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-grid"
                >
                  {/* Stats Row */}
                  <div className="dashboard-stats-row">
                    {[
                      { label: 'Overall Equipment Effectiveness', value: '87.4%', trend: '+1.2%', color: 'var(--accent-primary)' },
                      { label: 'Active Machines', value: '47 / 52', trend: 'Optimal', color: '#10b981' },
                      { label: 'Total Energy Usage', value: '1.24 MW', trend: '-4.3%', color: '#f59e0b' },
                      { label: 'Safety Incidents (24h)', value: '0', trend: 'Stable', color: '#10b981' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.1, type: "spring", stiffness: 100 }}
                        className="stat-card"
                      >
                        <h4 className="stat-card-label">{stat.label}</h4>
                        <div className="stat-card-value-row">
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 + 0.3, type: "spring" }}
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

                  {/* Main Charts Area */}
                  <div className="dashboard-bento">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="bento-card bento-wide"
                    >
                      <div className="bento-header">
                        <h3>Production Output (Last 7 Days)</h3>
                        <button className="text-muted hover:text-emerald-500 transition-colors"><ChevronRight size={16} /></button>
                      </div>
                      <div className="bento-chart-area">
                        <div className="chart-bars-large">
                          {[40, 55, 48, 65, 75, 70, 85, 80, 95, 90, 85, 92, 88, 78].map((h, i) => (
                            <motion.div
                              key={i}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: `${h}%`, opacity: 1 }}
                              whileHover={{ scaleY: 1.05 }}
                              transition={{ 
                                height: { delay: 0.4 + i * 0.05, duration: 0.8, type: 'spring' },
                                opacity: { delay: 0.4 + i * 0.05, duration: 0.4 }
                              }}
                              className="chart-bar-large"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, type: "spring" }}
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
                        ].map((m, i) => (
                          <motion.div 
                            key={m.name} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            className="machine-item group"
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
                    <div className="flex gap-2">
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
                    ].map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass machine-detail-card"
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
                          <div className={`util-bar-fill ${m.status.toLowerCase()}`} style={{ width: `${m.util}%` }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

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
                    <div className="glass stat-card">
                      <h4 className="stat-card-label">Current Draw</h4>
                      <div className="stat-card-value-row">
                        <span className="stat-card-value text-warning">1.24 MW</span>
                        <span className="stat-card-trend">-4.3%</span>
                      </div>
                    </div>
                    <div className="glass stat-card">
                      <h4 className="stat-card-label">Carbon Footprint (Daily)</h4>
                      <div className="stat-card-value-row">
                        <span className="stat-card-value text-success">4.2 Tons</span>
                        <span className="stat-card-trend">-12%</span>
                      </div>
                    </div>
                    <div className="glass stat-card">
                      <h4 className="stat-card-label">Cost Savings (MTD)</h4>
                      <div className="stat-card-value-row">
                        <span className="stat-card-value text-brand">$12,450</span>
                        <span className="stat-card-trend">+8.1%</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass bento-card" style={{ minHeight: '400px' }}>
                    <div className="bento-header">
                      <h3>Energy Consumption (24h)</h3>
                    </div>
                    <div className="area-chart-mock">
                      <div className="area-chart-fill" />
                      <div className="area-chart-line" />
                    </div>
                  </div>
                </motion.div>
              )}

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
                      <div key={cam} className="camera-feed glass">
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

              {activeTab === 'maintenance' && (
                <motion.div
                  key="maintenance"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="dashboard-grid"
                >
                  <div className="dashboard-bento" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="glass bento-card">
                      <div className="bento-header">
                        <h3>Predictive Alerts</h3>
                      </div>
                      <div className="alerts-feed">
                        {[
                          { level: 'critical', msg: 'Spindle bearing wear critical on CNC-2', time: '10 mins ago' },
                          { level: 'warning', msg: 'Abnormal temperature rise (58°C) in Assembly Line 3', time: '2 hours ago' },
                          { level: 'info', msg: 'Hydraulic fluid pressure drop detected on Press B', time: '5 hours ago' },
                        ].map((alert, i) => (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={i}
                            className={`alert-box alert-${alert.level}`}
                          >
                            <div className="alert-box-header">
                              <span className="alert-time">{alert.time}</span>
                            </div>
                            <p>{alert.msg}</p>
                            <button className="btn-secondary btn-small mt-2">Create Work Order</button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="glass bento-card">
                      <div className="bento-header">
                        <h3>Scheduled Work Orders</h3>
                      </div>
                      <div className="work-orders">
                        {[
                          { id: 'WO-8832', desc: 'Quarterly lubrication of Conveyor Belt A', due: 'Tomorrow' },
                          { id: 'WO-8833', desc: 'Replace HEPA filters in Cleanroom 2', due: 'In 3 Days' },
                          { id: 'WO-8834', desc: 'Calibrate robotic arm sensors (Line 4)', due: 'Next Week' },
                        ].map((wo, i) => (
                          <div key={wo.id} className="work-order-row">
                            <div>
                              <div className="wo-id">{wo.id}</div>
                              <div className="wo-desc">{wo.desc}</div>
                            </div>
                            <span className="wo-due">{wo.due}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </PageTransition>
  )
}
