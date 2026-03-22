/**
 * GenomeViewer.tsx — DNA/RNA bit-range breakdown panel
 *
 * Replaces the plain binary string in the inspector with a visual breakdown
 * showing each gene region, its current value, and what it expresses.
 */

import { useEffect, useRef } from 'react'
import { getBits, getBit, traitsFrom } from '../../simulation/genome.js'
import './GenomeViewer.css'

interface GeneRegion {
  label: string
  start: number
  length: number
  format: (val: number) => string
}

const GENE_REGIONS: GeneRegion[] = [
  { label: 'Adhesion', start: 0, length: 2, format: v => ['none', 'A', 'B', 'C'][v]! },
  { label: 'Metabolism', start: 2, length: 2, format: v => ['slow', 'med', 'fast', 'rapid'][v]! },
  { label: 'Size', start: 4, length: 2, format: v => ['tiny', 'small', 'med', 'large'][v]! },
  { label: 'Photo', start: 6, length: 1, format: v => v ? 'yes' : 'no' },
  { label: 'Flagella', start: 7, length: 1, format: v => v ? 'yes' : 'no' },
  { label: 'Div thresh', start: 8, length: 2, format: v => ['low', 'med', 'high', 'max'][v]! },
  { label: 'Chemotaxis', start: 10, length: 1, format: v => v ? 'yes' : 'no' },
  { label: 'Toxin', start: 11, length: 1, format: v => v ? 'yes' : 'no' },
  { label: 'Shape', start: 12, length: 2, format: v => ['round', 'elongated', 'spiky', 'irreg'][v]! },
  { label: 'Lineage', start: 14, length: 2, format: v => String(v) },
]

function drawGenomeBitmap(
  ctx: CanvasRenderingContext2D,
  genome: number,
): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  const bitW = W / 16
  const regionColors = [
    '#5a8a5a', '#4a7a8a', '#8a7a4a', '#3a7a3a',
    '#3a3a7a', '#7a3a3a', '#6a5a3a', '#3a6a6a',
    '#7a4a7a', '#6a6a3a',
  ]

  // Draw gene regions
  for (let ri = 0; ri < GENE_REGIONS.length; ri++) {
    const region = GENE_REGIONS[ri]!
    const color = regionColors[ri % regionColors.length]!
    for (let b = 0; b < region.length; b++) {
      const bitIdx = region.start + b
      const bitVal = getBit(genome, bitIdx)
      const x = bitIdx * bitW
      ctx.fillStyle = bitVal ? color : 'rgba(20,20,20,0.8)'
      ctx.fillRect(x + 1, 1, bitW - 2, H - 2)
    }
  }

  // Bit index labels at bottom
  ctx.font = '6px Courier New'
  ctx.textAlign = 'center'
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = getBit(genome, i) ? '#aadaaa' : '#3a5a3a'
    ctx.fillText(String(i), i * bitW + bitW / 2, H - 1)
  }
}

interface GenomeViewerProps {
  genome: number
  onClose: () => void
}

export function GenomeViewer({ genome, onClose }: GenomeViewerProps) {
  const bitmapRef = useRef<HTMLCanvasElement>(null)
  const traits = traitsFrom(genome)
  const genomeBin = genome.toString(2).padStart(16, '0')

  useEffect(() => {
    if (bitmapRef.current) {
      const ctx = bitmapRef.current.getContext('2d')!
      drawGenomeBitmap(ctx, genome)
    }
  }, [genome])

  return (
    <div className="genome-viewer">
      <div className="gv-header">
        <span className="gv-title">Genome / DNA</span>
        <button className="gv-close" onClick={onClose}>✕</button>
      </div>

      <canvas ref={bitmapRef} width={256} height={24} className="gv-bitmap" />

      <div className="gv-binary">{genomeBin}</div>

      <div className="gv-table">
        {GENE_REGIONS.map((region) => {
          const val = region.length === 1
            ? getBit(genome, region.start)
            : getBits(genome, region.start, region.length)
          const bits = genomeBin.slice(15 - (region.start + region.length - 1), 16 - region.start)
          // Display bits in reading order (MSB first within the region)
          const bitsDisplay = bits.split('').reverse().join('')
          return (
            <div key={region.label} className="gv-row">
              <span className="gv-gene-label">{region.label}</span>
              <span className="gv-gene-bits">{bitsDisplay}</span>
              <span className="gv-gene-value">{region.format(val)}</span>
            </div>
          )
        })}
      </div>

      <div className="gv-footer">
        <span className="gv-label">Radius</span>
        <span className="gv-val">{traits.radius.toFixed(1)}</span>
        <span className="gv-label">Metabolism</span>
        <span className="gv-val">{traits.metabolism.toFixed(2)}</span>
        <span className="gv-label">Div energy</span>
        <span className="gv-val">{traits.divisionEnergy}</span>
      </div>
    </div>
  )
}
