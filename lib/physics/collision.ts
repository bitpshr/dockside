import type { OBB, Vec2 } from "@/lib/types";
import { PHYSICS } from "@/lib/types";
import type { BoatState } from "@/lib/types";

/** Get the 4 corner vertices of an OBB */
export function getOBBVertices(obb: OBB): Vec2[] {
  const cos = Math.cos(obb.angle);
  const sin = Math.sin(obb.angle);

  const dx = obb.halfW;
  const dz = obb.halfH;

  return [
    { x: obb.cx + cos * dx - sin * dz, z: obb.cz + sin * dx + cos * dz },
    { x: obb.cx - cos * dx - sin * dz, z: obb.cz - sin * dx + cos * dz },
    { x: obb.cx - cos * dx + sin * dz, z: obb.cz - sin * dx - cos * dz },
    { x: obb.cx + cos * dx + sin * dz, z: obb.cz + sin * dx - cos * dz },
  ];
}

/** Get the 2 unique edge normals (axes) of an OBB */
function getAxes(obb: OBB): Vec2[] {
  const cos = Math.cos(obb.angle);
  const sin = Math.sin(obb.angle);
  return [
    { x: cos, z: sin },
    { x: -sin, z: cos },
  ];
}

/** Project vertices onto an axis and return [min, max] */
function project(vertices: Vec2[], axis: Vec2): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of vertices) {
    const p = v.x * axis.x + v.z * axis.z;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
}

export interface CollisionResult {
  colliding: boolean;
  overlapDepth: number;
  normalX: number;
  normalZ: number;
}

const NO_COLLISION: CollisionResult = { colliding: false, overlapDepth: 0, normalX: 0, normalZ: 0 };

/**
 * SAT (Separating Axis Theorem) collision test between two OBBs.
 * Returns collision info including the minimum translation vector.
 */
export function satOverlap(a: OBB, b: OBB): CollisionResult {
  const axes = [...getAxes(a), ...getAxes(b)];
  const vertsA = getOBBVertices(a);
  const vertsB = getOBBVertices(b);

  let minOverlap = Infinity;
  let minAxis: Vec2 = { x: 0, z: 0 };

  for (const axis of axes) {
    const [minA, maxA] = project(vertsA, axis);
    const [minB, maxB] = project(vertsB, axis);

    // Check for gap
    if (maxA < minB || maxB < minA) {
      return NO_COLLISION;
    }

    // Calculate overlap
    const overlap = Math.min(maxA - minB, maxB - minA);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      minAxis = axis;
    }
  }

  // Ensure normal points from A to B
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;
  if (dx * minAxis.x + dz * minAxis.z < 0) {
    minAxis = { x: -minAxis.x, z: -minAxis.z };
  }

  return {
    colliding: true,
    overlapDepth: minOverlap,
    normalX: minAxis.x,
    normalZ: minAxis.z,
  };
}

/** Create an OBB from boat state */
export function boatToOBB(boat: BoatState): OBB {
  return {
    cx: boat.x,
    cz: boat.z,
    halfW: PHYSICS.BOAT_BEAM / 2,
    halfH: PHYSICS.BOAT_LENGTH / 2,
    angle: boat.heading,
  };
}

/**
 * Resolve collision by separating the boat and applying impulse response.
 * Only the boat moves — dock walls and parked boats are static.
 */
export function resolveCollision(boat: BoatState, collision: CollisionResult): BoatState {
  if (!collision.colliding) return boat;

  // Separate boat from obstacle
  const newX = boat.x - collision.normalX * collision.overlapDepth;
  const newZ = boat.z - collision.normalZ * collision.overlapDepth;

  // Velocity along collision normal (normal points from boat toward wall)
  const velAlongNormal = boat.vx * collision.normalX + boat.vz * collision.normalZ;

  // If already moving away from wall, just separate — no impulse needed
  if (velAlongNormal <= 0) {
    return { ...boat, x: newX, z: newZ };
  }

  // Impulse-based response
  const impulse = -(1 + PHYSICS.COLLISION_RESTITUTION) * velAlongNormal;

  return {
    ...boat,
    x: newX,
    z: newZ,
    vx: boat.vx + impulse * collision.normalX,
    vz: boat.vz + impulse * collision.normalZ,
    angularVel: boat.angularVel * 0.8, // dampen rotation on impact
  };
}
