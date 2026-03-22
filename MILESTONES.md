# Milestones

| # | Slug | Description | Status | Branch | Notes |
|---|------|-------------|--------|--------|-------|
| 1 | scaffold | Vite/React/TS project, worker architecture, port HTML prototype to typed modules, Vitest, GitHub Actions deploy | done | feature/scaffold | 38/38 tests passing |
| 2 | parallax-layers | Multi-layer canvas compositor, background drift particles, nutrient wash layer, parallax pan/zoom | done | feature/parallax-layers | 50/50 tests |
| 3 | islands-barriers | AABB barrier editor (drag to place, right-click remove), barrier collision, nutrient blocking, visual treatment | done | feature/islands-barriers | 64/64 tests |
| 4 | stats-panel | Slide-in panel: cells/colonies/species over-time charts, current stat rows, toggle button | done | feature/stats-panel | 72/72 tests |
| 5 | dna-rna-viewer | Click-cell genome breakdown: bit bitmap, gene table (label/bits/expression), trait summary | done | feature/dna-rna-viewer | 83/83 tests |
| 6 | adversarial-organisms | Predator = toxin∧flagella; engulf smaller prey, faster movement, crimson visual treatment | done | feature/adversarial-organisms | 91/91 tests |
| 7 | extended-genome | 32-bit genome, membrane permeability, signalling, multicellular differentiation genes | done | feature/extended-genome | 113/113 tests |
| 8 | chemical-gradients | Nutrient concentration heatmap layer, gradient chemotaxis, signalling molecule diffusion | done | feature/chemical-gradients | 126/126 tests |
| 9 | fluorescence-mode | Third render mode, GFP-style emission by expressed genes, configurable channel mapping | done | feature/fluorescence-mode | 126/126 tests |
| 10 | replay-export | World state snapshot recording, replay at any speed, PNG/video export | done | feature/replay-export | 137/137 tests |
| 11 | visual-realism | Dark field diffraction rings (concentric rims), extended stats (gen distribution, top genomes, avg gen/energy) | done | feature/visual-realism | 137/137 tests |

---

Agent should add rows as new milestones are identified during development.
Milestone 1 is the gate — nothing ships until the scaffold is clean and tests pass.
