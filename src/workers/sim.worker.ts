/**
 * sim.worker.ts — Simulation Web Worker
 *
 * Message protocol:
 *   Main → Worker:
 *     { type: 'init' }
 *     { type: 'step', count: number }
 *     { type: 'addCluster', wx: number, wy: number }
 *     { type: 'inject', wx: number, wy: number }
 *     { type: 'seed', wx: number, wy: number }
 *     { type: 'kill', wx: number, wy: number }
 *     { type: 'reset' }
 *
 *   Worker → Main:
 *     { type: 'snapshot', world: WorldSnapshot }
 */

import {
  initWorld,
  stepWorld,
  addCluster,
  injectNutrients,
  killAt,
  seedAt,
} from '../simulation/world.js'
import { serializeWorld } from '../simulation/serialize.js'
import type { WorldState } from '../simulation/world.js'
import type { Barrier } from '../simulation/islands.js'

let world: WorldState = initWorld()

function sendSnapshot(): void {
  const snapshot = serializeWorld(world)
  self.postMessage({ type: 'snapshot', world: snapshot })
}

self.addEventListener('message', (e: MessageEvent) => {
  const msg = e.data as Record<string, unknown>

  switch (msg.type) {
    case 'init':
    case 'reset':
      world = initWorld()
      sendSnapshot()
      break

    case 'step': {
      const count = (msg.count as number) ?? 1
      for (let i = 0; i < count; i++) stepWorld(world)
      sendSnapshot()
      break
    }

    case 'addCluster':
      addCluster(world, msg.wx as number, msg.wy as number)
      break

    case 'inject':
      injectNutrients(world, msg.wx as number, msg.wy as number)
      break

    case 'seed':
      seedAt(world, msg.wx as number, msg.wy as number)
      break

    case 'kill':
      killAt(world, msg.wx as number, msg.wy as number)
      break

    case 'setBarriers':
      world.barriers = msg.barriers as Barrier[]
      break
  }
})

// Send initial snapshot
sendSnapshot()
