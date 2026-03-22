import { useEffect, useRef } from 'react'
import type { SimStats } from '../../simulation/stats.js'
import type { StatsHistory } from '../hooks/useStatsHistory.js'
import './StatsPanel.css'

interface StatsPanelProps {
  historyRef: React.MutableRefObject<StatsHistory>
  currentStats: SimStats
  open: boolean
}

const CHART_H = 60
const CHART_W = 260

function drawLineChart(
  ctx: CanvasRenderingContext2D,
  values: number[],
  color: string,
  label: string,
  fieldMode: 'dark' | 'light' = 'dark',
): void {
  const W = CHART_W
  const H = CHART_H
  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = fieldMode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(240,248,240,0.6)'
  ctx.fillRect(0, 0, W, H)

  if (values.length < 2) return

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  ctx.beginPath()
  for (let i = 0; i < values.length; i++) {
    const x = (i / (values.length - 1)) * W
    const y = H - ((values[i]! - min) / range) * (H - 8) - 4
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Fill under line
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fillStyle = color.replace(')', ',0.08)').replace('rgb', 'rgba').replace('hsl', 'hsla')
  ctx.fill()

  // Label
  ctx.fillStyle = fieldMode === 'dark' ? 'rgba(100,160,100,0.7)' : 'rgba(30,80,30,0.7)'
  ctx.font = '8px Courier New'
  ctx.fillText(label, 4, 10)

  // Current value
  const cur = values[values.length - 1]!
  ctx.fillStyle = fieldMode === 'dark' ? '#8ab88a' : '#2a5a2a'
  ctx.textAlign = 'right'
  ctx.fillText(String(Math.round(cur)), W - 4, 10)
  ctx.textAlign = 'left'
}

function drawLineageBar(
  ctx: CanvasRenderingContext2D,
  samples: SimStats[],
  fieldMode: 'dark' | 'light',
): void {
  const W = CHART_W
  const H = CHART_H
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = fieldMode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(240,248,240,0.6)'
  ctx.fillRect(0, 0, W, H)

  if (samples.length === 0) return

  // We only have speciesCount from SimStats, not per-lineage breakdown.
  // Render speciesCount as a step chart instead.
  const values = samples.map(s => s.speciesCount)
  const max = Math.max(...values, 1)
  const barW = W / values.length

  for (let i = 0; i < values.length; i++) {
    const h = (values[i]! / max) * (H - 8)
    const hue = (i / values.length) * 120
    ctx.fillStyle = fieldMode === 'dark'
      ? `hsla(${hue},50%,50%,0.6)`
      : `hsla(${hue},60%,35%,0.5)`
    ctx.fillRect(i * barW, H - h - 4, barW, h)
  }

  ctx.fillStyle = fieldMode === 'dark' ? 'rgba(100,160,100,0.7)' : 'rgba(30,80,30,0.7)'
  ctx.font = '8px Courier New'
  ctx.fillText('species', 4, 10)
  ctx.fillStyle = fieldMode === 'dark' ? '#8ab88a' : '#2a5a2a'
  ctx.textAlign = 'right'
  ctx.fillText(String(samples[samples.length - 1]?.speciesCount ?? 0), W - 4, 10)
  ctx.textAlign = 'left'
}

export function StatsPanel({ historyRef, currentStats, open }: StatsPanelProps) {
  const cellChartRef = useRef<HTMLCanvasElement>(null)
  const speciesChartRef = useRef<HTMLCanvasElement>(null)
  const colonyChartRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    function draw() {
      const samples = historyRef.current.samples
      if (cellChartRef.current) {
        const ctx = cellChartRef.current.getContext('2d')!
        drawLineChart(ctx, samples.map(s => s.cellCount), '#6aaa6a', 'cells')
      }
      if (speciesChartRef.current) {
        const ctx = speciesChartRef.current.getContext('2d')!
        drawLineageBar(ctx, samples, 'dark')
      }
      if (colonyChartRef.current) {
        const ctx = colonyChartRef.current.getContext('2d')!
        drawLineChart(ctx, samples.map(s => s.colonyCount), '#6a9aaa', 'colonies')
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [historyRef])

  return (
    <div className={`stats-panel ${open ? 'open' : ''}`}>
      <div className="stats-panel-title">Statistics</div>

      <div className="stats-row">
        <span className="stats-label">Cells</span>
        <span className="stats-value">{currentStats.cellCount}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Colonies</span>
        <span className="stats-value">{currentStats.colonyCount}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Nutrients</span>
        <span className="stats-value">{currentStats.nutrientCount}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Max gen</span>
        <span className="stats-value">{currentStats.maxGeneration}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Species</span>
        <span className="stats-value">{currentStats.speciesCount}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Tick</span>
        <span className="stats-value">{currentStats.tick}</span>
      </div>

      <div className="stats-chart-label">Cells over time</div>
      <canvas ref={cellChartRef} width={CHART_W} height={CHART_H} className="stats-chart" />

      <div className="stats-chart-label">Colonies over time</div>
      <canvas ref={colonyChartRef} width={CHART_W} height={CHART_H} className="stats-chart" />

      <div className="stats-chart-label">Species over time</div>
      <canvas ref={speciesChartRef} width={CHART_W} height={CHART_H} className="stats-chart" />
    </div>
  )
}
