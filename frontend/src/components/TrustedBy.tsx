import { motion } from 'framer-motion'
import { Factory, Car, FlaskRound, Cpu, UtensilsCrossed } from 'lucide-react'

const logos = [
  { name: 'Manufacturing', icon: Factory },
  { name: 'Automotive', icon: Car },
  { name: 'Pharmaceutical', icon: FlaskRound },
  { name: 'Electronics', icon: Cpu },
  { name: 'Food Processing', icon: UtensilsCrossed },
]

export default function TrustedBy() {
  return (
    <section className="trusted-by-section">
      <div className="container section-inner">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="trusted-label"
        >
          Built for the next generation of smart manufacturing
        </motion.p>

        <div className="trusted-logos">
          {logos.map((logo, i) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="trusted-item"
            >
              <div className="trusted-icon-box">
                <logo.icon size={24} className="trusted-icon" />
              </div>
              <span className="trusted-name">{logo.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
