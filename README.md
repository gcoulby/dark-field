# Life Simulator

## AI Declaration

This project is an agentic coding experiment. The architecture, specification, and code are being generated with AI assistance (Claude, Anthropic). It is exploratory by nature -- expect rough edges, evolving structure, and the occasional questionable decision made at speed.

---

A scientifically-grounded cellular life simulator. Watch single cells compete, mutate, form multicellular colonies, and evolve under selection pressure -- rendered through a darkfield microscope aesthetic.

This is not a game. It is a living petri dish.

![Status](https://img.shields.io/badge/status-early%20development-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it is

A browser-based simulation where emergent complexity is the goal. Cells are agents with a 16-bit genome encoding metabolism, size, shape, adhesion type, motility, and behaviour. They eat, divide, mutate, and die. Nutrients cycle. Energy is conserved. Closed systems create selection pressure. Isolated populations diverge.

The renderer aims for the aesthetic of a research microscope -- darkfield scattering, brightfield absorption, parallax layering as you pan across the sample, bloom on dense colonies.

Over time, with barriers creating isolated islands, adversarial predator strains evolving, and chemical gradients shaping where life can thrive, the simulation should surprise you. That is the measure of success.

---

## Features (current)

- 16-bit genome with deterministic trait expression
- Four cell morphologies: round, elongated, spiky, irregular
- Cell behaviours: photosynthesis, chemotaxis, flagella-driven motility, toxin production, adhesion-based colony formation
- Closed system energy conservation -- dead cells return nutrients to the field
- Darkfield and brightfield rendering modes
- Two-pass bloom compositing
- Colony membrane visualisation
- Pan / zoom viewport with drag navigation
- Cell inspector showing genome and live stats
- Seeding, nutrient injection, and kill tools

## Planned

See [MILESTONES.md](./MILESTONES.md) for the full roadmap. Highlights:

- Parallax layered rendering (deep background, nutrient wash, cell layer, colony membrane, UI overlay)
- Island / barrier system -- draw walls to create isolated gene pools
- Statistics panel -- species counts, lineage graphs, energy budget over time
- DNA/RNA viewer -- visual genome breakdown per cell
- Adversarial predator organisms
- 32-bit extended genome with multicellular differentiation
- Chemical gradient field with heatmap visualisation
- Fluorescence rendering mode (GFP-style gene expression display)
- Replay and export

---

## Tech stack

- React 18 + TypeScript
- Vite
- Vitest
- Canvas 2D (simulation runs in a Web Worker, main thread renders only)
- No simulation libraries -- all physics, genetics, and rendering is hand-written

---

## Getting started

```bash
git clone <repo-url>
cd life-sim
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Run tests

```bash
pnpm test
```

### Build

```bash
pnpm build
```

---

## Project structure

```
life-sim/
├── src/
│   ├── simulation/     # genome, cell logic, physics, world state (no rendering)
│   ├── rendering/      # canvas layers, darkfield, lightfield, bloom, shapes
│   ├── ui/             # React controls, panels, hooks
│   └── workers/        # Web Worker for simulation tick
├── tests/              # Vitest unit tests
├── CLAUDE.md           # Agent instructions and architecture specification
├── MILESTONES.md       # Milestone tracker
└── AGENT_LOG.md        # Agent planning and evaluation log
```

---

## How the agent works

This project is being built by a Claude Code agent operating from [CLAUDE.md](./CLAUDE.md). The agent plans milestones, branches from `develop`, implements, runs tests, evaluates, and merges -- without manual prompting between steps. [AGENT_LOG.md](./AGENT_LOG.md) records every decision.

If you are running the agent yourself:

```bash
# Ensure you are on develop
git checkout develop

# Start Claude Code in the repo root
claude
```

The agent will read CLAUDE.md, pick up the next planned milestone from MILESTONES.md, and proceed.

---

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that runs tests, builds, and deploys to GitHub Pages. The Pages URL will be configured on the repository settings.

---

## Contributing

This is an exploratory personal project. Issues and ideas welcome. PRs are fine but the agent may immediately refactor whatever you write.

---

## Licence

MIT
