# Milestones

| # | Slug | Description | Status | Branch | Notes |
|---|------|-------------|--------|--------|-------|
| 1 | scaffold | Vite/React/TS project, worker architecture, port HTML prototype to typed modules, Vitest, GitHub Actions deploy | done | feature/scaffold | 38/38 tests passing |
| 2 | parallax-layers | Multi-layer canvas compositor, background drift particles, nutrient wash layer, parallax pan/zoom | done | feature/parallax-layers | 50/50 tests |
| 3 | islands-barriers | Polygon barrier editor, barrier collision, isolated nutrient budgets, visual treatment | planned | — | |
| 4 | stats-panel | Slide-in panel: species count over time, dominant lineage, genome frequency charts, energy budget | planned | — | |
| 5 | dna-rna-viewer | Click-cell genome breakdown: bit ranges labelled, current expression, mutation delta | planned | — | |
| 6 | adversarial-organisms | Predator genome flag, engulf mechanic, prey detection, visual differentiation | planned | — | |
| 7 | extended-genome | 32-bit genome, membrane permeability, signalling, multicellular differentiation genes | planned | — | Depends on 6 |
| 8 | chemical-gradients | Nutrient concentration heatmap layer, gradient chemotaxis, signalling molecule diffusion | planned | — | |
| 9 | fluorescence-mode | Third render mode, GFP-style emission by expressed genes, configurable channel mapping | planned | — | |
| 10 | replay-export | World state snapshot recording, replay at any speed, PNG/video export | planned | — | |

---

Agent should add rows as new milestones are identified during development.
Milestone 1 is the gate — nothing ships until the scaffold is clean and tests pass.
