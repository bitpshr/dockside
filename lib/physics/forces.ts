import type { BoatState, Vec2, MooringLine } from "@/lib/types";
import { PHYSICS } from "@/lib/types";
import { headingToForward, headingToRight, dot, sub, magnitude, normalize, degToRad } from "@/lib/utils";

export interface ForceResult {
  fx: number;
  fz: number;
  torque: number;
}

const ZERO_FORCE: ForceResult = { fx: 0, fz: 0, torque: 0 };

/**
 * Motor thrust — applied at stern, direction based on heading + steering angle.
 * Thrust direction follows the outboard angle. Torque arises because the
 * propeller is offset from the boat's center of mass.
 */
export function applyThrust(boat: BoatState): ForceResult {
  const steerAngle = boat.steering * PHYSICS.MAX_STEER_ANGLE;
  const fwd = headingToForward(boat.heading);
  const forwardSpeed = dot({ x: boat.vx, z: boat.vz }, fwd);

  let fx = 0, fz = 0;
  let thrustTorque = 0;

  if (boat.throttle !== 0) {
    const thrustMag = boat.throttle * PHYSICS.MAX_THRUST;
    const effectiveAngle = boat.heading + steerAngle;

    fx = Math.sin(effectiveAngle) * thrustMag;
    fz = Math.cos(effectiveAngle) * thrustMag;

    let armLength: number;
    if (boat.throttle < 0) {
      // Reverse: some torque, but boat mostly tracks backward
      armLength = PHYSICS.MOTOR_ARM_LENGTH * 0.7;
    } else {
      // Forward: hull tracks straight, resists yaw more at speed — wide arcs
      const speedDamping = 1.0 / (1.0 + Math.max(forwardSpeed, 0) * 0.5);
      armLength = PHYSICS.MOTOR_ARM_LENGTH * 0.6 * speedDamping;
    }
    thrustTorque = -Math.sin(steerAngle) * thrustMag * armLength;
  }

  // Rudder torque from water flowing past the turned outboard (even without throttle)
  // Damped at speed in both directions so boat tracks straighter
  const speed = Math.sqrt(boat.vx * boat.vx + boat.vz * boat.vz);
  const flowDamping = 1.0 / (1.0 + Math.abs(forwardSpeed) * 0.5);
  const flowTorque = -Math.sin(steerAngle) * PHYSICS.RUDDER_FLOW_COEFF * speed * speed * flowDamping;

  return { fx, fz, torque: thrustTorque + flowTorque };
}

/**
 * Water drag — quadratic, asymmetric.
 * Hull has much less resistance moving forward/backward (longitudinal)
 * than moving sideways (lateral). This is what makes boats behave like boats.
 */
export function applyDrag(boat: BoatState): ForceResult {
  const forward = headingToForward(boat.heading);
  const right = headingToRight(boat.heading);
  const vel: Vec2 = { x: boat.vx, z: boat.vz };

  // Decompose velocity into boat-local axes
  const localLongitudinal = dot(vel, forward);  // along boat length
  const localLateral = dot(vel, right);          // across boat beam

  // Quadratic drag + linear damping for low-speed stopping
  const dragLong = -PHYSICS.DRAG_LONGITUDINAL * localLongitudinal * Math.abs(localLongitudinal)
                   - PHYSICS.DRAG_LONGITUDINAL_LINEAR * localLongitudinal;
  const dragLat = -PHYSICS.DRAG_LATERAL * localLateral * Math.abs(localLateral)
                  - PHYSICS.DRAG_LATERAL_LINEAR * localLateral;

  // Convert back to world frame
  const fx = dragLong * forward.x + dragLat * right.x;
  const fz = dragLong * forward.z + dragLat * right.z;

  // Angular drag: quadratic + linear (prevents endless spinning)
  const torque = -PHYSICS.DRAG_ANGULAR * boat.angularVel * Math.abs(boat.angularVel)
                 - PHYSICS.DRAG_ANGULAR_LINEAR * boat.angularVel;

  return { fx, fz, torque };
}

/**
 * Wind force — pushes the boat slightly, but primarily causes yaw (rotation).
 * This matches real-world behavior: wind catches the hull's freeboard
 * and weathervanes the boat.
 */
export function applyWind(boat: BoatState, windSpeed: number, windDirection: number): ForceResult {
  if (windSpeed === 0) return ZERO_FORCE;

  // windDirection is "blowing FROM", so push direction is +180°
  const pushAngleRad = degToRad(windDirection + 180);

  // Linear push (relatively small)
  const fx = PHYSICS.WIND_STRENGTH * windSpeed * Math.sin(pushAngleRad);
  const fz = PHYSICS.WIND_STRENGTH * windSpeed * Math.cos(pushAngleRad);

  // Yaw torque — wind spins the boat based on angle of attack
  const torque = PHYSICS.WIND_TORQUE_COEFF * windSpeed * Math.sin(pushAngleRad - boat.heading);

  return { fx, fz, torque };
}

/**
 * Current force — pushes the boat linearly in the current direction.
 * Unlike wind, current doesn't cause significant rotation because
 * it acts uniformly on the underwater hull.
 */
export function applyCurrent(currentSpeed: number, currentDirection: number): ForceResult {
  if (currentSpeed === 0) return ZERO_FORCE;

  const currentAngleRad = degToRad(currentDirection);

  const fx = -PHYSICS.CURRENT_STRENGTH * currentSpeed * Math.sin(currentAngleRad);
  const fz = -PHYSICS.CURRENT_STRENGTH * currentSpeed * Math.cos(currentAngleRad);

  return { fx, fz, torque: 0 };
}

/**
 * Rope/mooring line force — stiff spring constraint between boat attachment
 * point and dock cleat. Only pulls when line is taut (distance > ropeLength).
 * Uses attachment-point velocity (including angular contribution) for damping,
 * and adds angular damping to prevent wild spinning.
 */
export function applyRope(boat: BoatState, line: MooringLine): ForceResult {
  const forward = headingToForward(boat.heading);
  const offset = line.boatAttachment === "bow"
    ? PHYSICS.BOAT_LENGTH / 2
    : -PHYSICS.BOAT_LENGTH / 2;

  // Arm from boat center to attachment point (world space)
  const armX = forward.x * offset;
  const armZ = forward.z * offset;
  const attachX = boat.x + armX;
  const attachZ = boat.z + armZ;

  // Vector from attachment to cleat
  const toCleat: Vec2 = { x: line.cleatX - attachX, z: line.cleatZ - attachZ };
  const dist = magnitude(toCleat);

  if (dist <= line.ropeLength) return ZERO_FORCE;

  // Spring force pulling toward cleat
  const extension = dist - line.ropeLength;
  const dir = normalize(toCleat);
  const springForce = PHYSICS.ROPE_STIFFNESS * extension;

  // Attachment point velocity = center velocity + angular contribution
  // v_attach = v_center + ω × arm (in 2D: ω is CW positive)
  const vAttachX = boat.vx + boat.angularVel * armZ;
  const vAttachZ = boat.vz - boat.angularVel * armX;

  // Damp the attachment point velocity along the rope direction
  const velAlongRope = vAttachX * dir.x + vAttachZ * dir.z;
  // Negative velAlongRope = pulling away (extending), positive = approaching (shortening)
  const dampingForce = -PHYSICS.ROPE_DAMPING * velAlongRope;

  // Total force must be non-negative (rope can only pull, never push)
  const totalForce = Math.min(
    Math.max(0, springForce + dampingForce),
    PHYSICS.ROPE_MAX_FORCE,
  );

  const fx = dir.x * totalForce;
  const fz = dir.z * totalForce;

  // Torque from rope pulling on the off-center attachment point.
  // Heavily scaled down: real dock lines create gentle pivoting, not violent
  // spinning (line friction through cleat, nylon stretch, hull drag).
  const rawTorque = armX * fz - armZ * fx;
  const torqueFromForce = rawTorque * 0.12;

  // Strong angular damping when line is taut — resists spinning around the cleat
  const tensionRatio = Math.min(1, extension / 0.2);
  const angularDamping = -PHYSICS.ROPE_ANGULAR_DAMPING * boat.angularVel * tensionRatio;

  return { fx, fz, torque: torqueFromForce + angularDamping };
}

/** Sum multiple force results */
export function sumForces(...forces: ForceResult[]): ForceResult {
  let fx = 0, fz = 0, torque = 0;
  for (const f of forces) {
    fx += f.fx;
    fz += f.fz;
    torque += f.torque;
  }
  return { fx, fz, torque };
}
