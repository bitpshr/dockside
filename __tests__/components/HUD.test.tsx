import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HUD } from "@/components/HUD";
import type { BoatState, ScenarioConfig } from "@/lib/types";

const defaultBoat: BoatState = {
  x: 0, z: 0, heading: 0,
  vx: 0, vz: 0, angularVel: 0,
  throttle: 0, steering: 0,
};

const defaultScenario: ScenarioConfig = {
  dockSide: "left",
  windSpeed: 10,
  windDirection: 90,
  currentSpeed: 1,
  currentDirection: 180,
};

const defaultProps = {
  boat: defaultBoat,
  scenario: defaultScenario,
  elapsedTime: 0,
  collisionCount: 0,
  slipCenter: { x: 0, z: 0 },
  slipHeading: 0,
  steerPosition: 0,
  onRestart: vi.fn(),
};

describe("HUD", () => {
  it("displays speed", () => {
    render(<HUD {...defaultProps} />);
    expect(screen.getByText("Speed")).toBeInTheDocument();
  });

  it("displays heading", () => {
    render(<HUD {...defaultProps} />);
    expect(screen.getByText("Heading")).toBeInTheDocument();
  });

  it("displays idle throttle when not accelerating", () => {
    render(<HUD {...defaultProps} />);
    expect(screen.getByText("IDLE")).toBeInTheDocument();
  });

  it("displays wind compass when wind > 0", () => {
    render(<HUD {...defaultProps} />);
    expect(screen.getByText("Wind")).toBeInTheDocument();
  });

  it("displays current compass when current > 0", () => {
    render(<HUD {...defaultProps} />);
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("displays collision count when > 0", () => {
    render(<HUD {...defaultProps} collisionCount={3} />);
    expect(screen.getByText("3 hits")).toBeInTheDocument();
  });

  it("displays elapsed time", () => {
    render(<HUD {...defaultProps} elapsedTime={125} />);
    expect(screen.getByText("2:05")).toBeInTheDocument();
  });

  it("shows rudder indicator", () => {
    render(<HUD {...defaultProps} />);
    expect(screen.getByText("Rudder")).toBeInTheDocument();
    expect(screen.getAllByText("CTR").length).toBeGreaterThanOrEqual(1);
  });
});
