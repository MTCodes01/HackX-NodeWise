import { motion } from 'framer-motion'
import SectionWrapper, { SectionBadge, SectionTitle } from './SectionWrapper'
import { Star, Quote } from 'lucide-react'

// const testimonials = [
//   {
//     name: 'Rajesh Mehta',
//     role: 'VP Operations',
//     company: 'Tata Advanced Systems',
//     quote: 'Optimus reduced our unplanned downtime by 42% in the first quarter. The predictive maintenance AI detected a critical bearing failure 3 days before it would have shut down our entire production line.',
//     avatar: 'RM',
//     accentColor: '#10b981',
//   },
//   {
//     name: 'Sarah Chen',
//     role: 'Factory Manager',
//     company: 'Foxconn Electronics',
//     quote: 'The unified dashboard gave us visibility we never had before. What used to take 4 different systems and 2 hours of manual reporting now happens in real-time, in one screen.',
//     avatar: 'SC',
//     accentColor: '#8b5cf6',
//   },
//   {
//     name: 'Michael Torres',
//     role: 'Head of Safety',
//     company: 'Bosch Manufacturing',
//     quote: 'Worker safety has improved dramatically. The computer vision system caught PPE violations and zone intrusions we would have missed. Our incident rate dropped by 67%.',
//     avatar: 'MT',
//     accentColor: '#06b6d4',
//   },
//   {
//     name: 'Priya Sharma',
//     role: 'Chief Technology Officer',
//     company: 'Mahindra Industries',
//     quote: 'The AI Copilot is a game-changer. Our floor supervisors can now ask natural language questions about production data and get instant, actionable insights. It\'s like having an expert analyst on demand.',
//     avatar: 'PS',
//     accentColor: '#f59e0b',
//   },
// ]

// export default function Testimonials() {
  // return (
    // <SectionWrapper>

      {/* <div className="testimonials-grid">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="card card-hover testimonial-card"
          >
            <Quote size={32} className="testimonial-quote-icon" /> */}

            {/* Stars */}
            {/* <div className="testimonial-stars">
              {[...Array(5)].map((_, j) => (
                <Star key={j} size={14} className="star-icon" />
              ))}
            </div>

            <p className="testimonial-text">"{t.quote}"</p> */}

            {/* Author */}
            {/* <div className="testimonial-author">
              <div className="testimonial-avatar" style={{ backgroundColor: `${t.accentColor}20`, color: t.accentColor }}>
                {t.avatar}
              </div>
              <div>
                <h4 className="testimonial-name">{t.name}</h4>
                <p className="testimonial-role">{t.role} · {t.company}</p>
              </div>
            </div> */}
          {/* </motion.div>
        ))}
      </div> */}
    // </SectionWrapper>
  // )
// }
