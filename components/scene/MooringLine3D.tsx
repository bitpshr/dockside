"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import type { MooringLine, BoatState } from "@/lib/types";
import { PHYSICS } from "@/lib/types";
import { headingToForward } from "@/lib/utils";

interface MooringLine3DProps {
  line: MooringLine;
  boat: BoatState;
}

const SEGMENTS = 12;

export function MooringLine3D({ line, boat }: MooringLine3DProps) {
  const points = useMemo(() => {
    const forward = headingToForward(boat.heading);
    const offset = line.boatAttachment === "bow"
      ? PHYSICS.BOAT_LENGTH / 2
      : -PHYSICS.BOAT_LENGTH / 2;

    const attachX = boat.x + forward.x * offset;
    const attachZ = boat.z + forward.z * offset;
    const attachY = 0.8;
    const cleatY = 0.65;

    // Distance between endpoints
    const dx = line.cleatX - attachX;
    const dz = line.cleatZ - attachZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Droop proportional to slack — tight lines barely droop
    const slack = Math.max(0, line.ropeLength - dist);
    const maxDroop = 0.8;
    const droop = Math.min(maxDroop, slack * 0.6);

    const result: [number, number, number][] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const x = attachX + dx * t;
      const z = attachZ + dz * t;
      // Catenary-like sag: parabolic droop, deepest at midpoint
      const sag = 4 * t * (1 - t);
      const baseY = attachY + (cleatY - attachY) * t;
      const y = baseY - droop * sag;
      result.push([x, y, z]);
    }
    return result;
  }, [line, boat.x, boat.z, boat.heading]);

  return (
    <Line
      points={points}
      color="#e8d5a8"
      lineWidth={2.5}
    />
  );
}
