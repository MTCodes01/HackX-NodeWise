import type { TelemetrySample } from '../simulation/types'

interface TelemetrySparklineProps {
  data: TelemetrySample[]
  metric: 'vibration' | 'temperature' | 'powerKw' | 'rpm'
  label: string
  unit: string
  warningThreshold?: number
  criticalThreshold?: number
  color?: string
}

export default function TelemetrySparkline({
  data,
  metric,
  label,
  unit,
  warningThreshold,
  criticalThreshold,
  color = '#10b981',
}: TelemetrySparklineProps) {
  const values = data.map(d => d[metric] as number)
  if (values.length < 2) return (
    <div className="sparkline-container">
      <div className="sparkline-header">
        <span className="sparkline-label">{label}</span>
        <span className="sparkline-current">—</span>
      </div>
      <div className="sparkline-area" style={{ height: 48 }} />
    </div>
  )

  const current = values[values.length - 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  // Build SVG polyline points
  const W = 200, H = 48
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // Area fill path
  const areaPath = `M0,${H} ` +
    values.map((v, i) => {
      const x = (i / (values.length - 1)) * W
      const y = H - ((v - min) / range) * (H - 6) - 3
      return `L${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ') +
    ` L${W},${H} Z`

  // Color based on threshold
  let lineColor = color
  if (criticalThreshold && current >= criticalThreshold) lineColor = '#ef4444'
  else if (warningThreshold && current >= warningThreshold) lineColor = '#f59e0b'

  const currentStr = metric === 'rpm'
    ? Math.round(current).toLocaleString()
    : current.toFixed(metric === 'temperature' ? 1 : 2)

  return (
    <div className="sparkline-container">
      <div className="sparkline-header">
        <span className="sparkline-label">{label}</span>
        <span className="sparkline-current" style={{ color: lineColor }}>
          {currentStr} <span className="sparkline-unit">{unit}</span>
        </span>
      </div>
      <div className="sparkline-area">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
          {/* Area fill */}
          <path d={areaPath} fill={lineColor} fillOpacity={0.12} />
          {/* Threshold line */}
          {warningThreshold && (
            <line
              x1={0} y1={H - ((warningThreshold - min) / range) * (H - 6) - 3}
              x2={W} y2={H - ((warningThreshold - min) / range) * (H - 6) - 3}
              stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="3,3" opacity={0.5}
            />
          )}
          {/* Main line */}
          <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" />
          {/* Current value dot */}
          {values.length > 0 && (() => {
            const last = values[values.length - 1]
            const x = W
            const y = H - ((last - min) / range) * (H - 6) - 3
            return <circle cx={x} cy={y} r={2.5} fill={lineColor} />
          })()}
        </svg>
      </div>
    </div>
  )
}
