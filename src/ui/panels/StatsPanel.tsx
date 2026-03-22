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
const GEN_DIST_H = 44
const GEN_BUCKETS = ['0', '1–5', '6–20', '21–100', '101+'] as const

function drawLineChart(
  ctx: CanvasRenderingContext2D,
  values: number[],
  color: string,
  label: string,
): void {
  const W = CHART_W
  const H = CHART_H
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
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

  ctx.fillStyle = 'rgba(100,160,100,0.7)'
  ctx.font = '8px Courier New'
  ctx.fillText(label, 4, 10)

  const cur = values[values.length - 1]!
  ctx.fillStyle = '#8ab88a'
  ctx.textAlign = 'right'
  ctx.fillText(String(Math.round(cur)), W - 4, 10)
  ctx.textAlign = 'left'
}

function drawGenDist(
  ctx: CanvasRenderingContext2D,
  dist: [number, number, number, number, number],
): void {
  const W = CHART_W
  const H = GEN_DIST_H
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 0, W, H)

  const total = dist.reduce((a, b) => a + b, 0) || 1
  const barW = W / 5
  const hues = [200, 140, 80, 40, 0] // blue→green→yellow→orange→red

  for (let i = 0; i < 5; i++) {
    const frac = dist[i]! / total
    const h = frac * (H - 14)
    ctx.fillStyle = `hsla(${hues[i]},70%,55%,0.75)`
    ctx.fillRect(i * barW + 1, H - 14 - h, barW - 2, h)
    ctx.fillStyle = 'rgba(100,160,100,0.6)'
    ctx.font = '7px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText(GEN_BUCKETS[i]!, i * barW + barW / 2, H - 2)
  }
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(100,160,100,0.7)'
  ctx.font = '8px Courier New'
  ctx.fillText('generations', 4, 9)
}

function drawLineageBar(
  ctx: CanvasRenderingContext2D,
  samples: SimStats[],
): void {
  const W = CHART_W
  const H = CHART_H
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 0, W, H)

  if (samples.length === 0) return

  const values = samples.map(s => s.speciesCount)
  const max = Math.max(...values, 1)
  const barW = W / values.length

  for (let i = 0; i < values.length; i++) {
    const h = (values[i]! / max) * (H - 8)
    const hue = (i / values.length) * 120
    ctx.fillStyle = `hsla(${hue},50%,50%,0.6)`
    ctx.fillRect(i * barW, H - h - 4, barW, h)
  }

  ctx.fillStyle = 'rgba(100,160,100,0.7)'
  ctx.font = '8px Courier New'
  ctx.fillText('species', 4, 10)
  ctx.fillStyle = '#8ab88a'
  ctx.textAlign = 'right'
  ctx.fillText(String(samples[samples.length - 1]?.speciesCount ?? 0), W - 4, 10)
  ctx.textAlign = 'left'
}

function lineageHue(lineage: number): number {
  return Math.round((lineage * 22.5) % 360)
}

export function StatsPanel({ historyRef, currentStats, open }: StatsPanelProps) {
  const cellChartRef = useRef<HTMLCanvasElement>(null)
  const speciesChartRef = useRef<HTMLCanvasElement>(null)
  const colonyChartRef = useRef<HTMLCanvasElement>(null)
  const genChartRef = useRef<HTMLCanvasElement>(null)
  const genDistRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    function draw() {
      const samples = historyRef.current.samples
      if (cellChartRef.current) {
        drawLineChart(cellChartRef.current.getContext('2d')!, samples.map(s => s.cellCount), '#6aaa6a', 'cells')
      }
      if (speciesChartRef.current) {
        drawLineageBar(speciesChartRef.current.getContext('2d')!, samples)
      }
      if (colonyChartRef.current) {
        drawLineChart(colonyChartRef.current.getContext('2d')!, samples.map(s => s.colonyCount), '#6a9aaa', 'colonies')
      }
      if (genChartRef.current) {
        drawLineChart(genChartRef.current.getContext('2d')!, samples.map(s => s.avgGeneration), '#aa9a6a', 'avg gen')
      }
      if (genDistRef.current) {
        drawGenDist(genDistRef.current.getContext('2d')!, currentStats.genDistribution)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [historyRef, currentStats.genDistribution])

  const { topGenomes } = currentStats

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
        <span className="stats-label">Species</span>
        <span className="stats-value">{currentStats.speciesCount}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Max gen</span>
        <span className="stats-value">{currentStats.maxGeneration}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Avg gen</span>
        <span className="stats-value">{currentStats.avgGeneration}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Avg energy</span>
        <span className="stats-value">{currentStats.avgEnergy}</span>
      </div>
      <div className="stats-row">
        <span className="stats-label">Tick</span>
        <span className="stats-value">{currentStats.tick}</span>
      </div>

      <div className="stats-chart-label">Generation distribution</div>
      <canvas ref={genDistRef} width={CHART_W} height={GEN_DIST_H} className="stats-chart" />

      <div className="stats-chart-label">Dominant genomes</div>
      <table className="stats-genome-table">
        <thead>
          <tr>
            <th>hue</th>
            <th>lineage</th>
            <th>genome</th>
            <th>count</th>
          </tr>
        </thead>
        <tbody>
          {topGenomes.map(g => (
            <tr key={g.genome}>
              <td>
                <span
                  className="stats-genome-swatch"
                  style={{ background: `hsl(${lineageHue(g.lineage)},80%,55%)` }}
                />
              </td>
              <td>{g.lineage}</td>
              <td className="stats-genome-hex">{(g.genome >>> 0).toString(16).padStart(8, '0')}</td>
              <td>{g.count}</td>
            </tr>
          ))}
          {topGenomes.length === 0 && (
            <tr><td colSpan={4} className="stats-genome-empty">no data</td></tr>
          )}
        </tbody>
      </table>

      <div className="stats-chart-label">Cells over time</div>
      <canvas ref={cellChartRef} width={CHART_W} height={CHART_H} className="stats-chart" />

      <div className="stats-chart-label">Avg generation over time</div>
      <canvas ref={genChartRef} width={CHART_W} height={CHART_H} className="stats-chart" />

      <div className="stats-chart-label">Colonies over time</div>
      <canvas ref={colonyChartRef} width={CHART_W} height={CHART_H} className="stats-chart" />

      <div className="stats-chart-label">Species over time</div>
      <canvas ref={speciesChartRef} width={CHART_W} height={CHART_H} className="stats-chart" />
    </div>
  )
}
