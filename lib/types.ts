// ── Vector2D ────────────────────────────────────────────
export interface Vec2 {
  x: number;
  z: number;
}

// ── Boat State ──────────────────────────────────────────
export interface BoatState {
  x: number;
  z: number;
  heading: number;       // radians, 0 = +Z (forward), CW positive
  vx: number;
  vz: number;
  angularVel: number;    // rad/s
  throttle: number;      // -1 (full reverse) to 1 (full forward)
  steering: number;      // -1 (full left) to 1 (full right)
}

// ── Scenario Config ─────────────────────────────────────
export interface ScenarioConfig {
  dockSide: "left" | "right";
  windSpeed: number;           // knots, 0-20
  windDirection: number;       // degrees, 0-360, direction blowing FROM
  currentSpeed: number;        // knots, 0-3
  currentDirection: number;    // degrees, 0-360, direction flowing TO
}

// ── Mooring Lines ───────────────────────────────────────
export type AttachmentPoint = "bow" | "stern";

export interface DockCleat {
  id: string;
  x: number;
  z: number;
}

export interface MooringLine {
  boatAttachment: AttachmentPoint;
  cleatId: string;
  cleatX: number;
  cleatZ: number;
  ropeLength: number;
}

// ── Collision Geometry ──────────────────────────────────
export interface OBB {
  cx: number;
  cz: number;
  halfW: number;        // half-width (X axis before rotation)
  halfH: number;        // half-height (Z axis before rotation)
  angle: number;        // rotation in radians
}

// ── Dock Layout ─────────────────────────────────────────
export interface DockLayout {
  walls: OBB[];
  parkedBoats: OBB[];
  cleats: DockCleat[];
  slipCenter: Vec2;
  slipHeading: number;  // expected heading when docked
  slipWidth: number;
  slipLength: number;
}

// ── Simulation State ────────────────────────────────────
export interface SimulationState {
  boat: BoatState;
  scenario: ScenarioConfig;
  dock: DockLayout;
  mooringLines: MooringLine[];
  elapsedTime: number;
  collisionCount: number;
  dockingProgress: number;   // seconds spent in valid dock position
  status: "running" | "success";
}

// ── Physics Constants ───────────────────────────────────
export const PHYSICS = {
  DT: 1 / 60,                    // fixed timestep (seconds)
  BOAT_MASS: 1200,                // kg (~2600 lb center console)
  BOAT_INERTIA: 3000,             // kg*m^2 (moment of inertia about vertical axis)
  BOAT_LENGTH: 7.5,               // meters (~25 ft)
  BOAT_BEAM: 2.5,                 // meters (~8 ft)
  MAX_THRUST: 1200,               // Newtons (realistic for docking speeds)
  MAX_STEER_ANGLE: 35 * Math.PI / 180,  // radians
  MOTOR_ARM_LENGTH: 2.5,          // meters from center to transom
  DRAG_LONGITUDINAL: 50,          // N/(m/s)^2 — low (hull cuts through)
  DRAG_LATERAL: 250,              // N/(m/s)^2 — high (flat side resists)
  DRAG_ANGULAR: 3000,             // N*m/(rad/s)^2 — strong rotational damping
  DRAG_LONGITUDINAL_LINEAR: 80,   // N/(m/s) — low-speed linear damping
  DRAG_LATERAL_LINEAR: 200,       // N/(m/s) — low-speed lateral damping
  DRAG_ANGULAR_LINEAR: 1200,      // N*m/(rad/s) — prevents endless spinning
  RUDDER_FLOW_COEFF: 200,         // rudder torque from water flow past outboard
  WIND_STRENGTH: 2.5,             // force multiplier per knot
  WIND_TORQUE_COEFF: 15,          // torque multiplier per knot
  CURRENT_STRENGTH: 50,           // force multiplier per knot (gives ~0.25 m/s drift at 1kt)
  ROPE_STIFFNESS: 25000,          // N/m spring constant (stiff nylon line)
  ROPE_DAMPING: 8000,             // N/(m/s) near-critical damping (no bounce)
  ROPE_ANGULAR_DAMPING: 25000,    // N*m/(rad/s) extra rotational damping when taut
  ROPE_MAX_FORCE: 20000,          // N — maximum force before rope would break
  MAX_ROPE_LENGTH: 12,            // meters
  COLLISION_RESTITUTION: 0.2,     // bounciness
  DOCKING_SPEED_THRESHOLD: 0.3,   // m/s — must be slower than this
  DOCKING_ANGLE_THRESHOLD: 25 * Math.PI / 180,  // radians from target heading
  DOCKING_DISTANCE_THRESHOLD: 1.5, // meters from slip center
  DOCKING_TIME_REQUIRED: 2.0,      // seconds to hold position
  KNOTS_TO_MS: 0.51444,           // conversion factor
} as const;

// ── Boat Geometry Points (relative to center, facing +Z) ──
export const BOAT_BOW_OFFSET = PHYSICS.BOAT_LENGTH / 2;
export const BOAT_STERN_OFFSET = -PHYSICS.BOAT_LENGTH / 2;
