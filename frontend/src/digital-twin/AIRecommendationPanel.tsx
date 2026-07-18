import { motion } from 'framer-motion'
import { Cpu, Brain, TrendingUp } from 'lucide-react'
import type { AIRecommendation } from '../simulation/types'

interface AIRecommendationPanelProps {
  recommendation: AIRecommendation
}

export default function AIRecommendationPanel({ recommendation }: AIRecommendationPanelProps) {
  return (
    <motion.div
      className="ai-rec-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header with AI label */}
      <div className="ai-rec-header">
        <div className="ai-rec-icon-wrap">
          <Brain size={14} style={{ color: '#8b5cf6' }} />
        </div>
        <div>
          <div className="ai-rec-title">AI Operational Recommendation</div>
          <div className="ai-rec-source">Generated from verified incident evidence</div>
        </div>
      </div>

      <div className="ai-rec-divider" />

      {/* Probable Cause */}
      <div className="ai-rec-section">
        <div className="ai-rec-section-label">
          <Cpu size={11} />
          Probable Cause
        </div>
        <p className="ai-rec-text">{recommendation.probableCause}</p>
      </div>

      {/* Evidence Considered */}
      <div className="ai-rec-section">
        <div className="ai-rec-section-label">Evidence Considered</div>
        <ul className="ai-rec-evidence-list">
          {recommendation.evidenceConsidered.map((ev, i) => (
            <li key={i} className="ai-rec-evidence-item">
              <span className="ai-rec-evidence-dot" />
              {ev}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Action */}
      <div className="ai-rec-action-box">
        <div className="ai-rec-section-label">
          <TrendingUp size={11} />
          Recommended Action
        </div>
        <p className="ai-rec-action-text">{recommendation.recommendedAction}</p>
      </div>

      {/* Timeline & Impact */}
      <div className="ai-rec-footer">
        <div className="ai-rec-footer-item">
          <div className="ai-rec-footer-label">Timeline</div>
          <div className="ai-rec-footer-value">{recommendation.timeline}</div>
        </div>
        <div className="ai-rec-footer-item">
          <div className="ai-rec-footer-label">Potential Impact</div>
          <div className="ai-rec-footer-value impact">{recommendation.potentialImpact}</div>
        </div>
      </div>

      <div className="ai-rec-disclaimer">
        AI interpretation of algorithmically verified evidence. Not a substitute for qualified engineering judgment.
      </div>
    </motion.div>
  )
}
