import { useState, useRef, useEffect, useCallback } from 'react'
import type { WorldSnapshot, CellSnapshot } from './simulation/serialize.js'
import { traitsFrom, SHAPE_NAMES } from './simulation/genome.js'
import { makeBarrier } from './simulation/islands.js'
import type { Barrier } from './simulation/islands.js'
import { LayerCompositor } from './rendering/layers.js'
import type { FieldMode, Viewport } from './rendering/renderer.js'
import { useSimulation } from './ui/hooks/useSimulation.js'
import type { SimMode, SimSpeed } from './ui/hooks/useSimulation.js'
import './App.css'

const WORLD_W = 3200
const WORLD_H = 3200

type AppMode = SimMode | 'wall'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const compositorRef = useRef<LayerCompositor | null>(null)

  const snapshotRef = useRef<WorldSnapshot | null>(null)
  const vpRef = useRef<Viewport>({ vx: WORLD_W / 2, vy: WORLD_H / 2, vscale: 1, W: window.innerWidth, H: window.innerHeight })
  const rafRenderRef = useRef<number>(0)

  const [fieldMode, setFieldModeState] = useState<FieldMode>('dark')
  const [mode, setMode] = useState<AppMode>('observe')
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState<SimSpeed>(1)
  const [selectedCell, setSelectedCell] = useState<CellSnapshot | null>(null)
  const [barriers, setBarriers] = useState<Barrier[]>([])
  const [stats, setStats] = useState({ cellCount: 0, colonyCount: 0, nutrientCount: 0, maxGeneration: 0, speciesCount: 0, tick: 0 })

  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  const wallDragStart = useRef<{ wx: number; wy: number } | null>(null)
  const selectedIdRef = useRef<number | null>(null)
  const barriersRef = useRef<Barrier[]>([])

  // Keep ref in sync
  useEffect(() => { barriersRef.current = barriers }, [barriers])

  useEffect(() => {
    const canvas = canvasRef.current!
    compositorRef.current = new LayerCompositor(canvas)

    function resize() {
      const W = window.innerWidth
      const H = window.innerHeight
      canvas.width = W
      canvas.height = H
      vpRef.current.W = W
      vpRef.current.H = H
      compositorRef.current?.resize(W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    function renderLoop() {
      if (snapshotRef.current && compositorRef.current) {
        compositorRef.current.render(snapshotRef.current, vpRef.current)
      }
      rafRenderRef.current = requestAnimationFrame(renderLoop)
    }
    rafRenderRef.current = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRenderRef.current)
    }
  }, [])

  const onSnapshot = useCallback((snap: WorldSnapshot) => {
    snapshotRef.current = snap
    setStats(snap.stats)
    if (selectedIdRef.current !== null) {
      const found = snap.cells.find(c => c.id === selectedIdRef.current)
      if (found) setSelectedCell(found)
      else { setSelectedCell(null); selectedIdRef.current = null }
    }
  }, [])

  const { reset: resetSim, stepOnce, addCluster, inject, seed, kill, sendCommand } = useSimulation({ onSnapshot, paused, speed })

  const syncBarriers = useCallback((bs: Barrier[]) => {
    sendCommand({ type: 'setBarriers', barriers: bs })
  }, [sendCommand])

  const setFieldMode = (fm: FieldMode) => {
    setFieldModeState(fm)
    compositorRef.current?.setFieldMode(fm)
  }

  const screenToWorld = (sx: number, sy: number): [number, number] => {
    const vp = vpRef.current
    return [(sx - vp.W / 2) / vp.vscale + vp.vx, (sy - vp.H / 2) / vp.vscale + vp.vy]
  }

  const findCellAt = (wx: number, wy: number): CellSnapshot | null => {
    const snap = snapshotRef.current
    if (!snap) return null
    let best: CellSnapshot | null = null
    let bd = Infinity
    for (const cell of snap.cells) {
      const d = Math.sqrt((cell.x - wx) ** 2 + (cell.y - wy) ** 2)
      const t = traitsFrom(cell.genome)
      if (d < t.radius + 8 && d < bd) { bd = d; best = cell }
    }
    return best
  }

  const findBarrierAt = (wx: number, wy: number): Barrier | null => {
    for (const b of barriersRef.current) {
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return b
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [wx, wy] = screenToWorld(e.clientX, e.clientY)

    if (e.button === 2) {
      // Right-click: remove barrier
      const hit = findBarrierAt(wx, wy)
      if (hit) {
        const next = barriersRef.current.filter(b => b.id !== hit.id)
        setBarriers(next)
        syncBarriers(next)
      }
      return
    }

    if (e.button !== 0) return

    if (mode === 'observe') {
      isDragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY, vx: vpRef.current.vx, vy: vpRef.current.vy }
      const cell = findCellAt(wx, wy)
      setSelectedCell(cell)
      selectedIdRef.current = cell?.id ?? null
      compositorRef.current?.setSelectedId(cell?.id ?? null)
    } else if (mode === 'wall') {
      wallDragStart.current = { wx, wy }
    } else if (mode === 'seed') {
      seed(wx, wy)
    } else if (mode === 'inject') {
      inject(wx, wy)
    } else if (mode === 'kill') {
      kill(wx, wy)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current && mode === 'observe') {
      const vp = vpRef.current
      vp.vx = dragStart.current.vx - (e.clientX - dragStart.current.x) / vp.vscale
      vp.vy = dragStart.current.vy - (e.clientY - dragStart.current.y) / vp.vscale
    }
    if (e.buttons === 1 && mode === 'inject' && Math.random() < 0.35) {
      const [wx, wy] = screenToWorld(e.clientX, e.clientY)
      inject(wx, wy)
    }
    if (e.buttons === 1 && mode === 'kill') {
      const [wx, wy] = screenToWorld(e.clientX, e.clientY)
      kill(wx, wy)
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = false

    if (mode === 'wall' && wallDragStart.current && e.button === 0) {
      const [wx, wy] = screenToWorld(e.clientX, e.clientY)
      const dx = wx - wallDragStart.current.wx
      const dy = wy - wallDragStart.current.wy
      const minSize = 20 / vpRef.current.vscale
      if (Math.abs(dx) > minSize || Math.abs(dy) > minSize) {
        const barrier = makeBarrier(
          Math.min(wallDragStart.current.wx, wx),
          Math.min(wallDragStart.current.wy, wy),
          Math.abs(dx),
          Math.abs(dy),
        )
        const next = [...barriersRef.current, barrier]
        setBarriers(next)
        syncBarriers(next)
      }
      wallDragStart.current = null
    }
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.85 : 1.18
    const [wx, wy] = screenToWorld(e.clientX, e.clientY)
    const vp = vpRef.current
    vp.vscale = Math.max(0.1, Math.min(14, vp.vscale * factor))
    vp.vx = wx - (e.clientX - vp.W / 2) / vp.vscale
    vp.vy = wy - (e.clientY - vp.H / 2) / vp.vscale
  }

  const handleAddCluster = () => {
    const vp = vpRef.current
    addCluster(
      vp.vx + (Math.random() - 0.5) * 200 / vp.vscale,
      vp.vy + (Math.random() - 0.5) * 200 / vp.vscale,
    )
  }

  const clearBarriers = () => {
    setBarriers([])
    syncBarriers([])
  }

  const handleReset = () => {
    setBarriers([])
    resetSim()
  }

  const inspectorTraits = selectedCell ? traitsFrom(selectedCell.genome) : null
  const modeButtons: AppMode[] = ['observe', 'seed', 'inject', 'kill', 'wall']
  const modeCursor = mode === 'observe' ? 'crosshair' : mode === 'wall' ? 'copy' : 'cell'

  return (
    <div className={`app ${fieldMode === 'light' ? 'lightfield' : ''}`}>
      <canvas ref={canvasRef} id="canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ cursor: modeCursor }}
      />

      <div id="hud">
        <div className="hud-title">Life / 0.2</div>
        <div className="hud-stat">Cells <span>{stats.cellCount}</span></div>
        <div className="hud-stat">Colonies <span>{stats.colonyCount}</span></div>
        <div className="hud-stat">Nutrients <span>{stats.nutrientCount}</span></div>
        <div className="hud-stat">Generation <span>{stats.maxGeneration}</span></div>
        <div className="hud-stat">Species <span>{stats.speciesCount}</span></div>
        <div className="hud-stat">Tick <span>{stats.tick}</span></div>
        {barriers.length > 0 && <div className="hud-stat">Barriers <span>{barriers.length}</span></div>}
      </div>

      <div id="field-toggle">
        <button className={fieldMode === 'dark' ? 'active' : ''} onClick={() => setFieldMode('dark')}>Dark field</button>
        <button className={fieldMode === 'light' ? 'active' : ''} onClick={() => setFieldMode('light')}>Light field</button>
      </div>

      {selectedCell && inspectorTraits && (
        <div id="inspector">
          <div className="inspector-title">Cell Inspector</div>
          <div className="inspector-row">Energy <span>{selectedCell.energy.toFixed(1)}</span></div>
          <div className="inspector-row">Age <span>{selectedCell.age}</span></div>
          <div className="inspector-row">Generation <span>{selectedCell.generation}</span></div>
          <div className="inspector-row">Shape <span>{SHAPE_NAMES[inspectorTraits.shape]}</span></div>
          <div className="inspector-row">Adhesion <span>{['none', 'A', 'B', 'C'][inspectorTraits.adhesion]}</span></div>
          <div className="inspector-row">Metabolism <span>{inspectorTraits.metabolism.toFixed(2)}</span></div>
          <div className="genome-display">{selectedCell.genome.toString(2).padStart(16, '0')}</div>
        </div>
      )}

      <div id="controls">
        <div className="mode-label">Mode</div>
        <div className="ctrl-group">
          {modeButtons.map(m => (
            <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
              {m === 'inject' ? 'Nutrients' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="ctrl-group">
          <button className={paused ? 'active' : ''} onClick={() => setPaused(p => !p)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={stepOnce}>Step</button>
          <button onClick={handleReset}>Reset</button>
          <button onClick={handleAddCluster}>+ Cluster</button>
          {barriers.length > 0 && <button onClick={clearBarriers}>Clear walls</button>}
        </div>
        <div className="ctrl-group">
          {([0.5, 1, 3, 8] as SimSpeed[]).map(s => (
            <button key={s} className={speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div id="tip">scroll to zoom &nbsp;|&nbsp; drag to pan<br />click cell to inspect<br />wall: drag to draw, right-click to remove</div>
    </div>
  )
}
