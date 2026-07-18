import { Cpu, Globe } from "lucide-react";
import { Link } from 'react-router-dom'

const footerLinks = {
  Product: [
    { label: 'Solutions', href: '/solutions' },
    { label: 'Platform', href: '/platform' },
    { label: 'Dashboard', href: '/platform' },
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
  ],
  Company: [
    { label: 'About', href: '/' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Press', href: '#' },
  ],
  Industries: [
    { label: 'Manufacturing', href: '/solutions' },
    { label: 'Automotive', href: '/solutions' },
    { label: 'Pharmaceutical', href: '/solutions' },
    { label: 'Electronics', href: '/solutions' },
    { label: 'Food Processing', href: '/solutions' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Security', href: '#' },
    { label: 'Compliance', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <Link to="/" className="navbar-logo footer-logo mb-4">
              <div className="logo-icon-wrapper">
                <div className="logo-icon">
                  <Cpu className="icon-white" size={16} />
                </div>
              </div>
              <span className="logo-text">
                <span className="text-brand">Optimus</span>
                <span className="logo-badge">AI</span>
              </span>
            </Link>
            <p className="footer-description">
              The AI Operating System for Industrial Intelligence. Making factories smarter, safer, and more efficient.
            </p>
            <div className="footer-socials">
              <a href="#" className="social-icon glass">
                <Globe size={14} />
              </a>
              <a href="#" className="social-icon glass">
                <Globe size={14} />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-links-col">
              <h4 className="footer-heading">{category}</h4>
              <ul className="footer-link-list">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © 2026 Optimus AI. All rights reserved.
          </p>
          <div className="footer-legal">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
