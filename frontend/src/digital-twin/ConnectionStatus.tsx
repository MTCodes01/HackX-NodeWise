import type { BackendConnectionState } from '../simulation/types'

interface ConnectionStatusProps {
  state: BackendConnectionState
}

export default function ConnectionStatus({ state }: ConnectionStatusProps) {
  const config = {
    connected: { label: 'Backend Connected', dot: '#10b981', bg: 'rgba(16,185,129,0.1)', text: '#10b981' },
    demo_mode: { label: 'Simulation Mode', dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: '#d97706' },
    connecting: { label: 'Connecting...', dot: '#94a3b8', bg: 'rgba(148,163,184,0.1)', text: '#64748b' },
  }[state]

  return (
    <div className="connection-status" style={{ background: config.bg, color: config.text }}>
      <span className="connection-dot" style={{ background: config.dot }} />
      {config.label}
    </div>
  )
}
