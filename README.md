<img src="app/icon.svg" width="48" height="48" alt="Dockside icon" />

# DOCKSIDE

> A realistic 3D first-person boat docking simulator for learning center console outboard boat docking techniques.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Three.js](https://img.shields.io/badge/Three.js-R3F-green)
![Tests](https://img.shields.io/badge/tests-48_passing-brightgreen)

## Overview

Practice parallel parking a center console boat into a slip with configurable wind, current, and dock positioning. Features a custom 2D physics engine with realistic asymmetric hull drag, wind weathervaning, and current forces — all rendered in a 3D first-person view from the helm.

## Getting Started

```bash
bun install
bun dev          # http://localhost:3000
bun test         # 48 tests
bun run lint     # ESLint
bun run type-check  # TypeScript
```

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 + React 19 | App shell, routing |
| Rendering | React Three Fiber + drei | 3D first-person view |
| Physics | Custom Euler integration | Boat dynamics simulation |
| Styling | Tailwind CSS v4 | HUD and setup UI |
| Testing | Vitest + RTL | 48 unit tests |

## Controls

| Key | Action |
|-----|--------|
| `W` / `Space` | Forward throttle |
| `S` | Reverse throttle |
| `A` / `←` | Steer left |
| `D` / `→` | Steer right |

## Physics Model

- **Motor thrust** — Direction follows outboard steering angle, torque from off-center application
- **Water drag** — Quadratic, asymmetric: lateral drag ~5x longitudinal (hull shape)
- **Wind** — Linear push + yaw torque (weathervaning effect)
- **Current** — Linear force, no rotation
- **Collisions** — SAT (Separating Axis Theorem) OBB detection + impulse response
- **Mooring lines** — Spring constraint with damping for tie-up and kick-into-slip

## File Structure

```
dockside/
├── app/              # Next.js pages + layout
├── components/
│   ├── scene/        # R3F 3D components (boat, dock, water, sky)
│   ├── HUD.tsx       # Speed, heading, wind/current overlay
│   ├── SetupScreen   # Scenario configuration
│   └── ...
├── lib/
│   ├── physics/      # Engine, forces, collision (pure functions)
│   ├── input.ts      # Keyboard state manager
│   └── scenario.ts   # Dock layout generator
└── __tests__/        # Vitest test suites
```

## Design Decisions

- **Custom physics over Matter.js/Rapier** — Boat-specific drag model (asymmetric hull) requires fine-grained control that generic rigid-body engines don't optimize for
- **2D physics + 3D render** — All forces computed in horizontal XZ plane, mapped to Three.js coordinates. Simpler, more stable, and perfectly adequate for surface vessel simulation
- **Fixed timestep accumulator** — 60 Hz physics with frame-time accumulation prevents framerate-dependent behavior
- **Semi-implicit Euler** — Velocity updated before position for better numerical stability
- **React state for HUD, refs for physics** — Physics runs in R3F's imperative useFrame loop (60fps), HUD polls at 10fps via setInterval
