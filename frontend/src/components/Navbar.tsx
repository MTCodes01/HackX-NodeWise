import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Cpu, ArrowRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Platform', href: '/platform' },
  { label: 'Solutions', href: '/solutions' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`navbar ${scrolled ? 'navbar-scrolled glass' : ''}`}
      >
        <div className="container navbar-container">
          {/* Logo */}
          <Link to="/" className="navbar-logo group">
            <div className="logo-icon-wrapper">
              <div className="logo-icon">
                <Cpu className="icon-white" size={20} />
              </div>
              <div className="logo-icon-glow group-hover-glow" />
            </div>
            <span className="logo-text">
              <span className="text-brand">Optimus</span>
              <span className="logo-badge">AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="navbar-links desktop-only">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`nav-link ${location.pathname === link.href ? 'text-brand' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="navbar-actions desktop-only">
            <Link to="/contact" className="nav-link">
              Contact Sales
            </Link>
            <Link to="/auth" className="btn-primary">
              Login / Sign Up
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mobile-toggle mobile-only"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mobile-menu glass"
          >
            <div className="mobile-menu-content">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`mobile-nav-link ${location.pathname === link.href ? 'text-brand' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="btn-primary flex-center mt-4">
                Login / Sign Up
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
