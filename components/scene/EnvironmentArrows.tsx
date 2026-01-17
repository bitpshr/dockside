"use client";

import type { ScenarioConfig } from "@/lib/types";

function Arrow3D({
  position,
  heading,
  color,
  opacity,
}: {
  position: [number, number, number];
  heading: number;
  color: string;
  opacity: number;
}) {
  return (
    <group position={position} rotation={[0, heading, 0]}>
      {/* Shaft */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.12, 0.06, 2.2]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {/* Arrowhead — cone pointing +Z */}
      <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.28, 0.6, 8]} />
        <meshStandardMaterial color={color} transparent opacity={opacity + 0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

interface EnvironmentArrowsProps {
  scenario: ScenarioConfig;
}

export function EnvironmentArrows({ scenario }: EnvironmentArrowsProps) {
  // Wind: blowing FROM windDirection → arrows point opposite
  const windHeading = ((scenario.windDirection + 180) * Math.PI) / 180;

  // Current: flowing TOWARD currentDirection
  const currentHeading = (scenario.currentDirection * Math.PI) / 180;

  const windPositions: [number, number, number][] = [
    [-4, 0.6, -10],
    [5, 0.6, 3],
    [-6, 0.6, 12],
    [8, 0.6, -4],
  ];

  const currentPositions: [number, number, number][] = [
    [2, 0.15, -7],
    [-4, 0.15, 6],
    [7, 0.15, 0],
  ];

  return (
    <group>
      {scenario.windSpeed > 0 &&
        windPositions.map((pos, i) => (
          <Arrow3D
            key={`wind-${i}`}
            position={pos}
            heading={windHeading}
            color="#64b5f6"
            opacity={0.3}
          />
        ))}

      {scenario.currentSpeed > 0 &&
        currentPositions.map((pos, i) => (
          <Arrow3D
            key={`curr-${i}`}
            position={pos}
            heading={currentHeading}
            color="#4dd0b8"
            opacity={0.35}
          />
        ))}
    </group>
  );
}
