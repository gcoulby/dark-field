# CLAUDE.md — Life Simulator: Agent Instructions

## Project Vision

A scientifically-grounded, visually immersive cellular life simulator. The goal is to watch life evolve: single cells competing, forming multicellular colonies, speciation through mutation, ecological pressures from adversarial organisms, closed-system resource dynamics, and emergent complexity over time.

This is not a game. It is a living petri dish. The aesthetic is a high-end research microscope — darkfield, brightfield, and eventually fluorescence modes. The experience should feel like discovery.

---

## Agent Behaviour

You are a **self-directed engineering agent**. You do not wait for instructions between milestones. You plan, implement, test, evaluate, log, and iterate.

### Workflow for every milestone

1. **Plan** — Before writing code, update `AGENT_LOG.md` with the milestone goal, your implementation plan, and what tests you will write.
2. **Branch** — Create a feature branch from `develop`: `git checkout -b feature/<milestone-slug>`.
3. **Implement** — Write the code. Follow the tech stack and architecture rules below.
4. **Test** — Run `pnpm test` (Vitest). All tests must pass. Write tests for any simulation logic, genome functions, or utility code you add.
5. **Evaluate** — In `AGENT_LOG.md`, record what was achieved, what was not, any known issues, and what the next milestone should be.
6. **Commit** — `git add -A && git commit -m "<milestone-slug>: <short description>"`.
7. **Merge** — `git checkout develop && git merge --no-ff feature/<milestone-slug> && git push origin develop`.
8. **Next milestone** — Update `MILESTONES.md` marking the completed milestone and planning the next. Then begin.

Do not skip steps. Do not merge broken code. If tests fail, fix them before merging.

---

## Repository Structure

```
life-sim/
├── CLAUDE.md               ← this file
├── AGENT_LOG.md            ← running log of agent decisions, plans, evaluations
├── MILESTONES.md           ← milestone tracker (planned, in-progress, done)
├── index.html              ← Vite entry point
├── vite.config.ts
├── package.json
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Pages deploy on push to main
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── simulation/         ← all sim logic, no rendering concerns
│   │   ├── genome.ts       ← genome encoding, decoding, mutation
│   │   ├── cell.ts         ← cell agent logic
│   │   ├── colony.ts       ← bond graph, colony detection
│   │   ├── nutrients.ts    ← nutrient particles and diffusion
│   │   ├── physics.ts      ← spatial grid, collision, movement
│   │   ├── world.ts        ← world state, step function, closed system
│   │   ├── islands.ts      ← wall/barrier geometry and collision
│   │   └── stats.ts        ← species tracking, lineage, statistics
│   ├── rendering/
│   │   ├── renderer.ts     ← main render orchestrator
│   │   ├── layers.ts       ← parallax layer system
│   │   ├── darkfield.ts    ← darkfield rendering mode
│   │   ├── lightfield.ts   ← brightfield rendering mode
│   │   ├── bloom.ts        ← bloom/glow post-processing
│   │   ├── shapes.ts       ← cell shape geometry
│   │   └── ui-overlay.ts   ← HUD, inspector, stats panel rendering
│   ├── ui/
│   │   ├── controls/       ← React control panel components
│   │   ├── panels/         ← stats panel, DNA viewer, inspector
│   │   └── hooks/          ← useSimulation, useRenderer, etc.
│   └── workers/
│       └── sim.worker.ts   ← simulation runs off main thread
└── tests/
    ├── genome.test.ts
    ├── cell.test.ts
    ├── colony.test.ts
    ├── physics.test.ts
    └── world.test.ts
```

---

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Testing**: Vitest + @testing-library/react
- **Styling**: CSS Modules or plain CSS — no Tailwind, no heavy UI libraries
- **Canvas**: Canvas 2D (main thread renders, sim runs in Web Worker)
- **State**: React context + useReducer for UI state; simulation state lives in the worker
- **No** external simulation libraries. All physics, genetics, and rendering is hand-written.

---

## Architecture Principles

### Simulation / Rendering separation
The simulation is pure logic — no DOM, no canvas, no React. It runs in a Web Worker. The main thread sends commands (seed, inject, kill, pause) and receives serialised world snapshots each frame for rendering.

### Genome encoding
16-bit integer. Every trait is derived deterministically from bit ranges. Adding new traits = allocating new bit ranges. Document every allocation in `genome.ts` with a comment block.

### Closed system
Energy is conserved. Nutrients released on cell death. The total energy budget in a sealed island must be tracked and logged. Violations are bugs.

### Layers (parallax)
The renderer maintains multiple canvas layers composited together:
- **Layer 0 (deepest)**: slow-drifting background particles, debris, out-of-focus matter
- **Layer 1**: nutrient field, chemical gradients (visualised as colour wash)
- **Layer 2**: main cell layer
- **Layer 3**: colony membranes, extracellular matrix
- **Layer 4**: UI overlays, labels, inspector highlights

Each layer has an independent scroll offset multiplied by a parallax factor. As you pan, deep layers move slower than the cell layer, exactly like a microscope stage.

### Islands / barriers
Barriers are polygonal regions defined in world space. Cells cannot pass through them. Nutrients diffuse around them slowly. Different islands create isolated gene pools — speciation pressure.

### Adversarial organisms
A distinct genome flag marks an organism as a predator archetype. Predators:
- Move faster (flagella always on)
- Cannot photosynthesise
- Gain energy by engulfing smaller cells (must be within radius)
- Have a distinct visual treatment (different membrane signature)

They are not scripted — they evolve like everything else. The predator trait can be lost or gained through mutation.

---

## Milestone Philosophy

Start with a clean, well-tested React/Vite scaffold seeded from the existing HTML prototype. Each milestone should be shippable — the app should always run and look reasonable after every merge.

Milestone sizing: each milestone should be completable in a single focused session. If a milestone feels too large, split it.

Priority order (initial roadmap — agent should refine this):

1. **Scaffold** — Vite/React/TypeScript project, worker architecture, port existing HTML sim logic into typed modules, all existing behaviour preserved, basic tests passing, GitHub Actions deploy workflow.
2. **Parallax layers** — multi-layer canvas compositor, background drift particles, nutrient wash layer, parallax pan/zoom.
3. **Islands & barriers** — polygon barrier editor (click to place walls), barrier collision, isolated nutrient budgets per island, visual treatment.
4. **Statistics panel** — slide-in panel showing species count over time, dominant lineage, genome frequency charts, energy budget graph.
5. **DNA/RNA viewer** — click a cell, see a visual breakdown of its genome: each bit range labelled, current expression, mutation history if tracked.
6. **Adversarial organisms** — predator genome flag, engulf mechanic, prey detection, visual differentiation.
7. **Extended genome** — expand to 32-bit genome, add membrane permeability, signalling molecules, differentiation genes for multicellular roles (wall cell, reproductive cell, sensor cell).
8. **Chemical gradients** — nutrient concentration rendered as a heatmap layer, cells respond to gradient direction, signalling molecules diffuse and influence behaviour.
9. **Fluorescence mode** — third rendering mode, cells emit based on expressed genes (GFP-style), configurable channel mapping.
10. **Replay & export** — record world state snapshots, replay at any speed, export a PNG or short video of a run.

The agent should update `MILESTONES.md` after every merge, marking completions and adding new milestones as they become apparent.

---

## Git Rules

- Base branch: `develop`
- Feature branches: `feature/<slug>` branched from `develop`
- Merge target: always `develop` via `--no-ff`
- Never force-push
- Never commit directly to `develop` or `main`
- `main` is updated only by the GitHub Actions deploy workflow (or manually when releasing)
- Commit messages: `<milestone-slug>: <imperative short description>`
  - Example: `scaffold: add Vitest config and genome unit tests`

---

## GitHub Actions: Deploy Workflow

File: `.github/workflows/deploy.yml`

Trigger: push to `main`
Steps:
1. `pnpm install`
2. `pnpm test --run` (fail deploy if tests fail)
3. `pnpm build`
4. Deploy `dist/` to GitHub Pages using `peaceiris/actions-gh-pages`

The agent writes this file during the scaffold milestone.

---

## AGENT_LOG.md Format

```markdown
## [YYYY-MM-DD] Milestone: <name>

### Plan
<what you intend to do and why>

### Implementation notes
<decisions made during implementation, alternatives rejected>

### Test results
<summary of vitest output>

### Evaluation
<what was achieved, what was not, known issues>

### Next milestone
<what you are planning next and why>
```

---

## MILESTONES.md Format

```markdown
# Milestones

| # | Slug | Description | Status | Branch | Notes |
|---|------|-------------|--------|--------|-------|
| 1 | scaffold | ... | done | feature/scaffold | |
| 2 | parallax-layers | ... | in-progress | feature/parallax-layers | |
```

---

## What Good Looks Like

- The simulation runs at 60fps with 1000+ cells on a modern laptop
- The renderer feels like a real microscope — the parallax is subtle but noticeable on pan
- Zooming in reveals detail; zooming out shows ecosystem-level patterns
- Barriers create visible speciation over ~500 ticks
- The stats panel tells a story: you can see a dominant species emerge and collapse
- The DNA viewer makes genome bits legible to a non-programmer
- Predators create visible population dynamics — boom/crash cycles
- The closed system is honest: total energy is conserved, displayed, trusted

---

## Seed File

The project is seeded with `life-sim.html` — a working single-file prototype demonstrating:
- Darkfield and lightfield rendering modes
- 16-bit genome with shape, adhesion, metabolism, size, flagella, chemotaxis, toxin, photosynthesis
- Cell agents with division, mutation, death, nutrient consumption
- Colony bond detection
- Pan/zoom viewport
- Bloom post-processing (two-pass screen blend)
- Basic cell inspector

The scaffold milestone should port this faithfully into the typed module structure before adding anything new.

---

## Final Note

This project has no fixed end. Life is the goal. When the sim surprises you — when you see something emerge that wasn't explicitly programmed — that is the measure of success. Keep going.
