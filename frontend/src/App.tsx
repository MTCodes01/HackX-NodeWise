import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Pages
import Home from './pages/Home'
import Platform from './pages/Platform'
import Solutions from './pages/Solutions'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'

function AppContent() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isAuth = location.pathname.startsWith('/auth')
  
  return (
    <div className="app-layout">
      {(!isDashboard && !isAuth) && <Navbar />}
      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </AnimatePresence>
      </main>
      {(!isDashboard && !isAuth) && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
