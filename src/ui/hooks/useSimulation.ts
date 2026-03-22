import { useEffect, useRef, useCallback } from 'react'
import type { WorldSnapshot } from '../../simulation/serialize.js'

export type SimMode = 'observe' | 'seed' | 'inject' | 'kill'
export type SimSpeed = 0.5 | 1 | 3 | 8

interface UseSimulationOptions {
  onSnapshot: (snapshot: WorldSnapshot) => void
  paused: boolean
  speed: SimSpeed
}

export function useSimulation({ onSnapshot, paused, speed }: UseSimulationOptions) {
  const workerRef = useRef<Worker | null>(null)
  const rafRef = useRef<number>(0)
  const pausedRef = useRef(paused)
  const speedRef = useRef(speed)
  const onSnapshotRef = useRef(onSnapshot)

  // Keep refs current
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { onSnapshotRef.current = onSnapshot }, [onSnapshot])

  useEffect(() => {
    const worker = new Worker(new URL('../../workers/sim.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.addEventListener('message', (e: MessageEvent) => {
      const msg = e.data as { type: string; world: WorldSnapshot }
      if (msg.type === 'snapshot') {
        onSnapshotRef.current(msg.world)
      }
    })

    function tick() {
      if (!pausedRef.current) {
        const steps = Math.round(speedRef.current)
        worker.postMessage({ type: 'step', count: steps })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      worker.terminate()
    }
  }, [])

  const sendCommand = useCallback((msg: Record<string, unknown>) => {
    workerRef.current?.postMessage(msg)
  }, [])

  const reset = useCallback(() => sendCommand({ type: 'reset' }), [sendCommand])
  const stepOnce = useCallback(() => sendCommand({ type: 'step', count: 1 }), [sendCommand])

  const addCluster = useCallback((wx: number, wy: number) => {
    sendCommand({ type: 'addCluster', wx, wy })
  }, [sendCommand])

  const inject = useCallback((wx: number, wy: number) => {
    sendCommand({ type: 'inject', wx, wy })
  }, [sendCommand])

  const seed = useCallback((wx: number, wy: number) => {
    sendCommand({ type: 'seed', wx, wy })
  }, [sendCommand])

  const kill = useCallback((wx: number, wy: number) => {
    sendCommand({ type: 'kill', wx, wy })
  }, [sendCommand])

  return { reset, stepOnce, addCluster, inject, seed, kill, sendCommand }
}
