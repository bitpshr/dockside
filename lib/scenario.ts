import type { ScenarioConfig, DockLayout, OBB, BoatState, SimulationState } from "@/lib/types";
import { PHYSICS } from "@/lib/types";

// ── L-Shaped dock geometry ───────────────────────────────
// Matches ProceduralDock.tsx visual geometry exactly.
//
//   Main arm: runs along Z at X=0, 50m long (Z: -25 to +25), 3m wide
//   Shore arm: runs along -X at Z=-25, 25m long (X: -25 to 0), 3m wide
//
// Two boats park on the outer (+X) edge with a random gap between them.
// Player approaches from open water (+X), parks in the gap.

const MAIN_ARM_WIDTH = 3;
const MAIN_ARM_HALF_LENGTH = 25;

const SHORE_ARM_LENGTH = 25 + MAIN_ARM_WIDTH / 2; // extends flush with main arm outer edge
const SHORE_ARM_WIDTH = 3;
const SHORE_ARM_CX = MAIN_ARM_WIDTH / 2 - SHORE_ARM_LENGTH / 2;
const SHORE_ARM_CZ = -MAIN_ARM_HALF_LENGTH;

const DOCK_EDGE_X = MAIN_ARM_WIDTH / 2;        // +1.5
const BOAT_GAP = 0.3;                          // gap between hull and dock edge
const PARKED_BOAT_LENGTH = 6.5;
const PARKED_BOAT_BEAM = 2.0;
const BOAT_OFFSET = DOCK_EDGE_X + BOAT_GAP + PARKED_BOAT_BEAM / 2; // 2.8

// -X side (inner / shore side) — static visual filler boats
const INNER_BOATS_Z = [-16, -6, 14];

function createWalls(): OBB[] {
  return [
    // Main arm
    {
      cx: 0,
      cz: 0,
      halfW: MAIN_ARM_WIDTH / 2,
      halfH: MAIN_ARM_HALF_LENGTH,
      angle: 0,
    },
    // Shore arm
    {
      cx: SHORE_ARM_CX,
      cz: SHORE_ARM_CZ,
      halfW: SHORE_ARM_LENGTH / 2,
      halfH: SHORE_ARM_WIDTH / 2,
      angle: 0,
    },
  ];
}

export function generateDockLayout(_config: ScenarioConfig): DockLayout {
  const walls = createWalls();

  // Random gap between two parked boats on the outer (+X) edge
  // Gap width: 1–2 boat-lengths of clearance (tight to comfortable)
  const gapWidth = 8.5 + Math.random() * 3.5; // 8.5–12m for a 7.5m player boat

  // Random position for the gap center along the dock
  const margin = PARKED_BOAT_LENGTH / 2 + gapWidth / 2 + 1;
  const minZ = -MAIN_ARM_HALF_LENGTH + margin;
  const maxZ = MAIN_ARM_HALF_LENGTH - margin;
  const gapCenterZ = minZ + Math.random() * (maxZ - minZ);

  // Place one boat on each side of the gap
  const boat1Z = gapCenterZ - gapWidth / 2 - PARKED_BOAT_LENGTH / 2;
  const boat2Z = gapCenterZ + gapWidth / 2 + PARKED_BOAT_LENGTH / 2;

  const parkedBoats: OBB[] = [
    {
      cx: BOAT_OFFSET,
      cz: boat1Z,
      halfW: PARKED_BOAT_BEAM / 2,
      halfH: PARKED_BOAT_LENGTH / 2,
      angle: 0,
    },
    {
      cx: BOAT_OFFSET,
      cz: boat2Z,
      halfW: PARKED_BOAT_BEAM / 2,
      halfH: PARKED_BOAT_LENGTH / 2,
      angle: 0,
    },
  ];

  // Inner side boats for visual variety
  for (const z of INNER_BOATS_Z) {
    parkedBoats.push({
      cx: -BOAT_OFFSET,
      cz: z,
      halfW: PARKED_BOAT_BEAM / 2,
      halfH: PARKED_BOAT_LENGTH / 2,
      angle: 0,
    });
  }

  return {
    walls,
    parkedBoats,
    cleats: [],
    slipCenter: { x: BOAT_OFFSET, z: gapCenterZ },
    slipHeading: 0,
    slipWidth: PARKED_BOAT_BEAM + 2,
    slipLength: gapWidth,
  };
}

export function createSimulationState(config: ScenarioConfig): SimulationState {
  const dock = generateDockLayout(config);
  return {
    boat: {
      x: 30,
      z: dock.slipCenter.z,
      heading: Math.PI * 1.5, // facing -X (toward dock)
      vx: 0,
      vz: 0,
      angularVel: 0,
      throttle: 0,
      steering: 0,
    },
    scenario: config,
    dock,
    mooringLines: [],
    elapsedTime: 0,
    collisionCount: 0,
    dockingProgress: 0,
    status: "running",
  };
}
