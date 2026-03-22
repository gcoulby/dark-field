import { useRef, useCallback } from 'react'
import type { SimStats } from '../../simulation/stats.js'

export interface StatsHistory {
  samples: SimStats[]
  maxSamples: number
}

const MAX_SAMPLES = 600

export function useStatsHistory(): {
  history: React.MutableRefObject<StatsHistory>
  push: (stats: SimStats) => void
  clear: () => void
} {
  const history = useRef<StatsHistory>({ samples: [], maxSamples: MAX_SAMPLES })

  const push = useCallback((stats: SimStats) => {
    const h = history.current
    h.samples.push(stats)
    if (h.samples.length > h.maxSamples) {
      h.samples.shift()
    }
  }, [])

  const clear = useCallback(() => {
    history.current.samples = []
  }, [])

  return { history, push, clear }
}
