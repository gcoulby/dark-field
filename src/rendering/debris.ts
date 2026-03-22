/**
 * debris.ts — Layer 0: slow-drifting background debris particles
 *
 * These represent out-of-focus matter in the optical path. They drift very slowly
 * in world space and are rendered at parallax factor 0.15 — so they barely move
 * when you pan, giving a sense of depth.
 */

export interface DebrisParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  hue: number
}

const POOL_SIZE = 220
const WORLD_W = 3200
const WORLD_H = 3200

export function createDebrisPool(): DebrisParticle[] {
  return Array.from({ length: POOL_SIZE }, () => makeDebris())
}

function makeDebris(): DebrisParticle {
  return {
    x: Math.random() * WORLD_W,
    y: Math.random() * WORLD_H,
    vx: (Math.random() - 0.5) * 0.06,
    vy: (Math.random() - 0.5) * 0.06,
    radius: 0.8 + Math.random() * 2.5,
    alpha: 0.04 + Math.random() * 0.12,
    hue: 100 + Math.random() * 60,
  }
}

export function stepDebris(particles: DebrisParticle[]): void {
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    // Wraparound so they never disappear
    if (p.x < 0) p.x += WORLD_W
    if (p.x > WORLD_W) p.x -= WORLD_W
    if (p.y < 0) p.y += WORLD_H
    if (p.y > WORLD_H) p.y -= WORLD_H
  }
}

export function drawDebrisLayer(
  ctx: CanvasRenderingContext2D,
  particles: DebrisParticle[],
  worldToScreen: (wx: number, wy: number) => [number, number],
  vscale: number,
  W: number,
  H: number,
  fieldMode: 'dark' | 'light',
): void {
  ctx.clearRect(0, 0, W, H)

  if (fieldMode === 'dark') {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    // Vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75)
    vg.addColorStop(0, 'rgba(0,5,3,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, W, H)
  } else {
    ctx.fillStyle = '#e8eeea'
    ctx.fillRect(0, 0, W, H)
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.08)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, W, H)
  }

  for (const p of particles) {
    const [sx, sy] = worldToScreen(p.x, p.y)
    if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue
    const sr = Math.max(0.5, p.radius * vscale * 0.4) // debris is out-of-focus — soft and small

    ctx.beginPath()
    ctx.arc(sx, sy, sr * 3, 0, Math.PI * 2)

    if (fieldMode === 'dark') {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3)
      g.addColorStop(0, `hsla(${p.hue},30%,70%,${p.alpha})`)
      g.addColorStop(1, `hsla(${p.hue},20%,50%,0)`)
      ctx.fillStyle = g
    } else {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3)
      g.addColorStop(0, `hsla(${p.hue},20%,30%,${p.alpha * 0.5})`)
      g.addColorStop(1, `hsla(${p.hue},15%,20%,0)`)
      ctx.fillStyle = g
    }
    ctx.fill()
  }
}
