import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Vec2 } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Vector Math ─────────────────────────────────────────

export function vec2(x: number, z: number): Vec2 {
  return { x, z };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, z: v.z * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.z * b.z;
}

export function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

export function normalize(v: Vec2): Vec2 {
  const m = magnitude(v);
  if (m === 0) return { x: 0, z: 0 };
  return { x: v.x / m, z: v.z / m };
}

export function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.z * sin,
    z: v.x * sin + v.z * cos,
  };
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a;
}

/** Get the forward direction vector for a heading (0 = +Z) */
export function headingToForward(heading: number): Vec2 {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

/** Get the right direction vector for a heading */
export function headingToRight(heading: number): Vec2 {
  return { x: Math.cos(heading), z: -Math.sin(heading) };
}

/** Convert world-space point to boat-local coordinates */
export function worldToLocal(point: Vec2, boatPos: Vec2, heading: number): Vec2 {
  const rel = sub(point, boatPos);
  return rotate(rel, -heading);
}

/** Convert boat-local vector to world-space */
export function localToWorld(localVec: Vec2, heading: number): Vec2 {
  return rotate(localVec, heading);
}

/** Speed in m/s to knots display */
export function msToKnots(ms: number): number {
  return ms / 0.51444;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
