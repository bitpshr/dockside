import { clamp } from "@/lib/utils";

// Throttle caps (equivalent to old F2/R2 gear levels)
const MAX_FORWARD_THROTTLE = 0.4;
const MAX_REVERSE_THROTTLE = 0.3;

// How fast throttle ramps while held / decays when released
const THROTTLE_ENGAGE_RATE = 1.5;
const THROTTLE_DECAY_RATE = 3.0;

// Steering positions: -6 to +6 (each tap = one click of the wheel)
const MAX_STEER_POSITION = 6;
const STEERING_RAMP_RATE = 3.5;

export interface InputState {
  throttle: number;       // capped at ±0.4/0.3
  steering: number;       // -1 to 1
  steerPosition: number;  // -6 to 6 (wheel position)
  lookYaw: number;        // radians, camera yaw offset from forward
  lookingBack: boolean;   // spacebar held = rear view
}

let currentSteerPosition = 0;
let mouseYaw = 0;
let lookingBack = false;
const pressedKeys = new Set<string>();
let inputEnabled = true;

export function setInputEnabled(enabled: boolean) {
  inputEnabled = enabled;
  if (!enabled) {
    mouseYaw = 0;
    lookingBack = false;
    pressedKeys.clear();
  }
}

export function initInput() {
  currentSteerPosition = 0;
  mouseYaw = 0;
  lookingBack = false;
  pressedKeys.clear();

  const onKeyDown = (e: KeyboardEvent) => {
    if (!inputEnabled) return;
    const key = e.key.toLowerCase();
    pressedKeys.add(key);

    // Steering — tap-based, each press turns wheel one click
    if (!e.repeat) {
      if (key === "a" || key === "arrowleft") {
        currentSteerPosition = Math.max(currentSteerPosition - 1, -MAX_STEER_POSITION);
      } else if (key === "d" || key === "arrowright") {
        currentSteerPosition = Math.min(currentSteerPosition + 1, MAX_STEER_POSITION);
      }
    }

    // Spacebar = look behind (hold)
    if (e.key === " ") {
      lookingBack = true;
      e.preventDefault();
    }

    if (["arrowleft", "arrowright"].includes(key)) {
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    pressedKeys.delete(e.key.toLowerCase());
    if (e.key === " ") {
      lookingBack = false;
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!inputEnabled) return;
    const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseYaw = -normalizedX * (Math.PI / 2);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("mousemove", onMouseMove);
    pressedKeys.clear();
    currentSteerPosition = 0;
    mouseYaw = 0;
    lookingBack = false;
  };
}

export function resetInput() {
  pressedKeys.clear();
  currentSteerPosition = 0;
  mouseYaw = 0;
  lookingBack = false;
}

export function smoothInput(current: InputState, dt: number): InputState {
  // Throttle: hold W = ramp forward, hold S = ramp reverse, release = decay to 0
  let targetThrottle = 0;
  if (pressedKeys.has("w")) {
    targetThrottle = MAX_FORWARD_THROTTLE;
  } else if (pressedKeys.has("s")) {
    targetThrottle = -MAX_REVERSE_THROTTLE;
  }

  const throttleRate = targetThrottle === 0 ? THROTTLE_DECAY_RATE : THROTTLE_ENGAGE_RATE;
  const throttle = rampToward(current.throttle, targetThrottle, throttleRate * dt);

  // Steering ramps smoothly toward wheel position target
  const targetSteering = clamp(currentSteerPosition / MAX_STEER_POSITION, -1, 1);
  const steering = rampToward(current.steering, targetSteering, STEERING_RAMP_RATE * dt);

  return {
    throttle,
    steering,
    steerPosition: currentSteerPosition,
    lookYaw: lookingBack ? Math.PI : mouseYaw,
    lookingBack,
  };
}

function rampToward(current: number, target: number, maxStep: number): number {
  const diff = target - current;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}
