/**
 * recorder.ts — circular snapshot ring buffer for replay & export
 *
 * Stores up to `capacity` WorldSnapshot objects. Old entries are overwritten
 * once full, keeping only the most recent `capacity` frames. Access is O(1)
 * by index (oldest=0, newest=length-1).
 */

import type { WorldSnapshot } from '../simulation/serialize.js'

export class SnapshotRing {
  private buf: (WorldSnapshot | null)[]
  private head = 0   // next write position
  private _size = 0

  constructor(readonly capacity: number) {
    this.buf = new Array(capacity).fill(null)
  }

  push(snap: WorldSnapshot): void {
    this.buf[this.head] = snap
    this.head = (this.head + 1) % this.capacity
    if (this._size < this.capacity) this._size++
  }

  get length(): number { return this._size }

  /** Get snapshot by logical index: 0 = oldest, length-1 = newest. */
  get(i: number): WorldSnapshot {
    if (i < 0 || i >= this._size) throw new RangeError(`Index ${i} out of range [0, ${this._size})`)
    const oldest = this._size < this.capacity ? 0 : this.head
    const idx = (oldest + i) % this.capacity
    return this.buf[idx]!
  }

  /** Return all stored snapshots oldest-first. */
  toArray(): WorldSnapshot[] {
    return Array.from({ length: this._size }, (_, i) => this.get(i))
  }

  clear(): void {
    this.head = 0
    this._size = 0
    this.buf.fill(null)
  }
}

/**
 * Trigger a browser download of a Blob.
 * Works in both regular and incognito contexts.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Capture the current frame of a canvas as a PNG and download it.
 */
export function exportPNG(canvas: HTMLCanvasElement, filename = `life-sim-${Date.now()}.png`): void {
  canvas.toBlob(blob => {
    if (blob) downloadBlob(blob, filename)
  }, 'image/png')
}

/**
 * Record the canvas stream for `durationMs` milliseconds and download as WebM.
 * Returns a cleanup function to stop recording early if needed.
 */
export function recordWebM(
  canvas: HTMLCanvasElement,
  durationMs: number,
  onDone: () => void,
  filename = `life-sim-${Date.now()}.webm`,
): () => void {
  const stream = canvas.captureStream(30)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    downloadBlob(blob, filename)
    onDone()
  }

  recorder.start()
  const timer = window.setTimeout(() => recorder.stop(), durationMs)

  return () => {
    clearTimeout(timer)
    if (recorder.state !== 'inactive') recorder.stop()
  }
}
