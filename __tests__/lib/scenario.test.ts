import { describe, it, expect } from "vitest";
import { generateDockLayout, createSimulationState } from "@/lib/scenario";
import type { ScenarioConfig } from "@/lib/types";

const config: ScenarioConfig = {
  dockSide: "left",
  windSpeed: 10,
  windDirection: 90,
  currentSpeed: 1,
  currentDirection: 180,
};

describe("generateDockLayout", () => {
  it("generates walls and parked boats", () => {
    const layout = generateDockLayout(config);
    expect(layout.walls.length).toBeGreaterThan(0);
    expect(layout.parkedBoats.length).toBeGreaterThan(0);
  });

  it("places two outer boats on +X side with a gap", () => {
    const layout = generateDockLayout(config);
    // 2 outer boats + 3 inner boats
    const outerBoats = layout.parkedBoats.filter(b => b.cx > 0);
    expect(outerBoats).toHaveLength(2);

    // Gap between them contains the slip center
    const sorted = outerBoats.sort((a, b) => a.cz - b.cz);
    const gapStart = sorted[0].cz + sorted[0].halfH;
    const gapEnd = sorted[1].cz - sorted[1].halfH;
    expect(layout.slipCenter.z).toBeGreaterThanOrEqual(gapStart);
    expect(layout.slipCenter.z).toBeLessThanOrEqual(gapEnd);
  });

  it("randomizes gap position across calls", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 10; i++) {
      positions.add(Math.round(generateDockLayout(config).slipCenter.z));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("slip center is on the +X outer edge", () => {
    const layout = generateDockLayout(config);
    expect(layout.slipCenter.x).toBeGreaterThan(0);
  });
});

describe("createSimulationState", () => {
  it("creates complete simulation state", () => {
    const state = createSimulationState(config);
    expect(state.boat).toBeDefined();
    expect(state.dock).toBeDefined();
    expect(state.scenario).toEqual(config);
    expect(state.mooringLines).toEqual([]);
    expect(state.elapsedTime).toBe(0);
    expect(state.collisionCount).toBe(0);
    expect(state.status).toBe("running");
  });

  it("boat starts at open water facing dock", () => {
    const state = createSimulationState(config);
    expect(state.boat.x).toBeGreaterThan(20); // far from dock
    expect(state.boat.vx).toBe(0);
    expect(state.boat.vz).toBe(0);
    expect(state.boat.throttle).toBe(0);
    expect(state.boat.steering).toBe(0);
  });

  it("boat starts aligned with the gap", () => {
    const state = createSimulationState(config);
    expect(state.boat.z).toBeCloseTo(state.dock.slipCenter.z, 1);
  });
});
