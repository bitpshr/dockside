import { describe, it, expect } from "vitest";
import { applyThrust, applyDrag, applyWind, applyCurrent, sumForces } from "@/lib/physics/forces";
import { getOBBVertices, satOverlap, boatToOBB, resolveCollision } from "@/lib/physics/collision";
import { physicsTick } from "@/lib/physics/engine";
import type { BoatState, OBB } from "@/lib/types";
import { PHYSICS } from "@/lib/types";
import { createSimulationState } from "@/lib/scenario";

function makeBoat(overrides: Partial<BoatState> = {}): BoatState {
  return {
    x: 0, z: 0, heading: 0,
    vx: 0, vz: 0, angularVel: 0,
    throttle: 0, steering: 0,
    ...overrides,
  };
}

// ── Force Tests ──────────────────────────────────────────

describe("applyThrust", () => {
  it("returns zero force when throttle is 0", () => {
    const result = applyThrust(makeBoat());
    expect(result.fx).toBe(0);
    expect(result.fz).toBe(0);
    expect(result.torque).toBe(0);
  });

  it("produces forward force (positive Z) at full throttle with heading 0", () => {
    const result = applyThrust(makeBoat({ throttle: 1 }));
    expect(result.fz).toBeGreaterThan(0);
    expect(Math.abs(result.fx)).toBeLessThan(0.01);
  });

  it("produces backward force at reverse throttle", () => {
    const result = applyThrust(makeBoat({ throttle: -1 }));
    expect(result.fz).toBeLessThan(0);
  });

  it("produces torque when steering is non-zero", () => {
    const result = applyThrust(makeBoat({ throttle: 1, steering: 0.5 }));
    expect(result.torque).not.toBe(0);
  });

  it("produces no torque when steering is centered", () => {
    const result = applyThrust(makeBoat({ throttle: 1, steering: 0 }));
    expect(Math.abs(result.torque)).toBeLessThan(0.01);
  });
});

describe("applyDrag", () => {
  it("returns zero force when velocity is zero", () => {
    const result = applyDrag(makeBoat());
    expect(result.fx).toBeCloseTo(0);
    expect(result.fz).toBeCloseTo(0);
    expect(result.torque).toBeCloseTo(0);
  });

  it("opposes forward motion", () => {
    const result = applyDrag(makeBoat({ vz: 5 }));
    expect(result.fz).toBeLessThan(0); // drag opposes +Z velocity
  });

  it("lateral drag is stronger than longitudinal drag", () => {
    const longitudinal = applyDrag(makeBoat({ vz: 3 }));
    const lateral = applyDrag(makeBoat({ vx: 3 }));
    expect(Math.abs(lateral.fx)).toBeGreaterThan(Math.abs(longitudinal.fz));
  });

  it("opposes angular velocity", () => {
    const result = applyDrag(makeBoat({ angularVel: 1 }));
    expect(result.torque).toBeLessThan(0);
  });
});

describe("applyWind", () => {
  it("returns zero force when wind speed is 0", () => {
    const result = applyWind(makeBoat(), 0, 90);
    expect(result.fx).toBe(0);
    expect(result.fz).toBe(0);
    expect(result.torque).toBe(0);
  });

  it("produces force opposite to 'from' direction", () => {
    const result = applyWind(makeBoat(), 10, 90); // wind from east → pushes west
    expect(result.fx).toBeLessThan(0); // pushes in -X direction (west)
  });

  it("produces torque (weathervaning)", () => {
    const result = applyWind(makeBoat({ heading: 0 }), 10, 90);
    expect(result.torque).not.toBe(0);
  });
});

describe("applyCurrent", () => {
  it("returns zero force when current speed is 0", () => {
    const result = applyCurrent(0, 180);
    expect(result.fx).toBe(0);
    expect(result.fz).toBe(0);
    expect(result.torque).toBe(0);
  });

  it("produces force in current direction with no torque", () => {
    const result = applyCurrent(2, 180); // current flowing south
    expect(result.fz).toBeLessThan(0); // negative Z = south
    expect(result.torque).toBe(0);
  });
});

describe("sumForces", () => {
  it("sums multiple force results", () => {
    const f1 = { fx: 10, fz: 20, torque: 5 };
    const f2 = { fx: -3, fz: 7, torque: -2 };
    const result = sumForces(f1, f2);
    expect(result.fx).toBe(7);
    expect(result.fz).toBe(27);
    expect(result.torque).toBe(3);
  });
});

// ── Collision Tests ──────────────────────────────────────

describe("getOBBVertices", () => {
  it("returns 4 vertices for axis-aligned box", () => {
    const obb: OBB = { cx: 0, cz: 0, halfW: 1, halfH: 2, angle: 0 };
    const verts = getOBBVertices(obb);
    expect(verts).toHaveLength(4);
    // Verify corners are at expected positions
    expect(verts.some(v => Math.abs(v.x - 1) < 0.01 && Math.abs(v.z - 2) < 0.01)).toBe(true);
    expect(verts.some(v => Math.abs(v.x + 1) < 0.01 && Math.abs(v.z + 2) < 0.01)).toBe(true);
  });
});

describe("satOverlap", () => {
  it("detects overlapping boxes", () => {
    const a: OBB = { cx: 0, cz: 0, halfW: 1, halfH: 1, angle: 0 };
    const b: OBB = { cx: 1, cz: 0, halfW: 1, halfH: 1, angle: 0 };
    const result = satOverlap(a, b);
    expect(result.colliding).toBe(true);
    expect(result.overlapDepth).toBeGreaterThan(0);
  });

  it("detects non-overlapping boxes", () => {
    const a: OBB = { cx: 0, cz: 0, halfW: 1, halfH: 1, angle: 0 };
    const b: OBB = { cx: 5, cz: 0, halfW: 1, halfH: 1, angle: 0 };
    const result = satOverlap(a, b);
    expect(result.colliding).toBe(false);
  });

  it("handles rotated boxes", () => {
    const a: OBB = { cx: 0, cz: 0, halfW: 1, halfH: 1, angle: 0 };
    const b: OBB = { cx: 1.5, cz: 0, halfW: 1, halfH: 1, angle: Math.PI / 4 };
    const result = satOverlap(a, b);
    expect(result.colliding).toBe(true);
  });
});

describe("boatToOBB", () => {
  it("creates OBB from boat state", () => {
    const boat = makeBoat({ x: 5, z: 10, heading: Math.PI / 2 });
    const obb = boatToOBB(boat);
    expect(obb.cx).toBe(5);
    expect(obb.cz).toBe(10);
    expect(obb.angle).toBe(Math.PI / 2);
    expect(obb.halfW).toBe(PHYSICS.BOAT_BEAM / 2);
    expect(obb.halfH).toBe(PHYSICS.BOAT_LENGTH / 2);
  });
});

describe("resolveCollision", () => {
  it("separates boat from obstacle", () => {
    const boat = makeBoat({ x: 0, z: 0, vx: 1 });
    const collision = { colliding: true, overlapDepth: 0.5, normalX: 1, normalZ: 0 };
    const resolved = resolveCollision(boat, collision);
    expect(resolved.x).toBe(-0.5); // pushed back
  });

  it("returns unchanged boat when no collision", () => {
    const boat = makeBoat();
    const noCollision = { colliding: false, overlapDepth: 0, normalX: 0, normalZ: 0 };
    const result = resolveCollision(boat, noCollision);
    expect(result).toBe(boat);
  });
});

// ── Engine Tests ──────────────────────────────────────────

describe("physicsTick", () => {
  it("advances elapsed time", () => {
    const state = createSimulationState({
      dockSide: "left", windSpeed: 0, windDirection: 0,
      currentSpeed: 0, currentDirection: 0,
    });
    const next = physicsTick(state, PHYSICS.DT);
    expect(next.elapsedTime).toBeGreaterThan(0);
  });

  it("moves boat forward when throttle is applied", () => {
    const state = createSimulationState({
      dockSide: "left", windSpeed: 0, windDirection: 0,
      currentSpeed: 0, currentDirection: 0,
    });
    state.boat.throttle = 1;
    state.boat.heading = 0;

    let s = state;
    for (let i = 0; i < 60; i++) {
      s = physicsTick(s, PHYSICS.DT);
    }
    expect(s.boat.vz).toBeGreaterThan(0); // moving forward
  });

  it("does not advance when status is success", () => {
    const state = createSimulationState({
      dockSide: "left", windSpeed: 0, windDirection: 0,
      currentSpeed: 0, currentDirection: 0,
    });
    state.status = "success";
    const next = physicsTick(state, PHYSICS.DT);
    expect(next.elapsedTime).toBe(0); // unchanged
  });

  it("applies drag to slow boat down", () => {
    const state = createSimulationState({
      dockSide: "left", windSpeed: 0, windDirection: 0,
      currentSpeed: 0, currentDirection: 0,
    });
    state.boat.vz = 5; // initial velocity

    let s = state;
    for (let i = 0; i < 120; i++) {
      s = physicsTick(s, PHYSICS.DT);
    }
    expect(Math.abs(s.boat.vz)).toBeLessThan(5); // slowed down
  });
});
