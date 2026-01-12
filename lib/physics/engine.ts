import type { SimulationState } from "@/lib/types";
import { PHYSICS } from "@/lib/types";
import { applyThrust, applyDrag, applyWind, applyCurrent, applyRope, sumForces } from "./forces";
import { boatToOBB, satOverlap, resolveCollision } from "./collision";
import { magnitude, normalizeAngle } from "@/lib/utils";

/**
 * Advance the simulation by one fixed timestep.
 * Pure function: takes state, returns new state.
 */
export function physicsTick(state: SimulationState, dt: number = PHYSICS.DT): SimulationState {
  if (state.status === "success") return state;

  let boat = { ...state.boat };
  const { scenario } = state;

  // ── Accumulate Forces ──────────────────────────────────
  const thrust = applyThrust(boat);
  const drag = applyDrag(boat);
  const wind = applyWind(boat, scenario.windSpeed, scenario.windDirection);
  const current = applyCurrent(scenario.currentSpeed, scenario.currentDirection);

  // Rope forces
  const ropeForces = state.mooringLines.map(line => applyRope(boat, line));

  const net = sumForces(thrust, drag, wind, current, ...ropeForces);

  // ── Integrate (Semi-implicit Euler) ────────────────────
  // Update velocity first, then position (more stable)
  const ax = net.fx / PHYSICS.BOAT_MASS;
  const az = net.fz / PHYSICS.BOAT_MASS;
  boat.vx += ax * dt;
  boat.vz += az * dt;
  boat.x += boat.vx * dt;
  boat.z += boat.vz * dt;

  const angularAccel = net.torque / PHYSICS.BOAT_INERTIA;
  boat.angularVel += angularAccel * dt;
  boat.heading += boat.angularVel * dt;
  boat.heading = normalizeAngle(boat.heading);

  // ── Collision Detection & Response ─────────────────────
  let collisionCount = state.collisionCount;

  // Check against dock walls (recompute OBB after each resolution)
  for (const wall of state.dock.walls) {
    const result = satOverlap(boatToOBB(boat), wall);
    if (result.colliding) {
      boat = resolveCollision(boat, result);
      collisionCount++;
    }
  }

  // Check against parked boats
  for (const parked of state.dock.parkedBoats) {
    const result = satOverlap(boatToOBB(boat), parked);
    if (result.colliding) {
      boat = resolveCollision(boat, result);
      collisionCount++;
    }
  }

  // ── Docking Check ─────────────────────────────────────
  const dxFromSlip = boat.x - state.dock.slipCenter.x;
  const dzFromSlip = boat.z - state.dock.slipCenter.z;
  const distFromSlip = Math.sqrt(dxFromSlip * dxFromSlip + dzFromSlip * dzFromSlip);

  const speed = magnitude({ x: boat.vx, z: boat.vz });
  const headingDiff = Math.abs(normalizeAngle(boat.heading - state.dock.slipHeading));
  const headingOk = headingDiff < PHYSICS.DOCKING_ANGLE_THRESHOLD ||
    headingDiff > (2 * Math.PI - PHYSICS.DOCKING_ANGLE_THRESHOLD);

  const isInDockPosition =
    distFromSlip < PHYSICS.DOCKING_DISTANCE_THRESHOLD &&
    speed < PHYSICS.DOCKING_SPEED_THRESHOLD &&
    headingOk;

  const dockingProgress = isInDockPosition
    ? state.dockingProgress + dt
    : Math.max(0, state.dockingProgress - dt * 0.5); // decay slowly

  const status = dockingProgress >= PHYSICS.DOCKING_TIME_REQUIRED ? "success" : "running";

  return {
    ...state,
    boat,
    elapsedTime: state.elapsedTime + dt,
    collisionCount,
    dockingProgress,
    status,
  };
}
