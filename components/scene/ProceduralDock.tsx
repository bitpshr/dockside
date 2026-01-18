"use client";

import { useMemo } from "react";
import { Color, MeshStandardMaterial, CylinderGeometry } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Vec2 } from "@/lib/types";

// ── Layout constants (match scenario.ts exactly) ─────────
const DECK_Y = 0.8;
const DECK_THICKNESS = 0.15;

const MAIN_ARM_LENGTH = 50;
const MAIN_ARM_WIDTH = 3;
const MAIN_ARM_CZ = 0;

const SHORE_ARM_LENGTH = 25 + MAIN_ARM_WIDTH / 2; // extends flush with main arm outer edge
const SHORE_ARM_WIDTH = 3;
const SHORE_ARM_CX = MAIN_ARM_WIDTH / 2 - SHORE_ARM_LENGTH / 2;
const SHORE_ARM_CZ = -(MAIN_ARM_LENGTH / 2);
const SHORE_ARM_FAR_X = SHORE_ARM_CX - SHORE_ARM_LENGTH / 2; // -25

// ── Colors ───────────────────────────────────────────────
const DECK_COLOR = new Color("#8B7355");
const STRINGER_COLOR = new Color("#6B5340");
const PILING_COLOR = new Color("#4A3728");
const BUMPER_COLOR = new Color("#2A2018");

// ── Shared materials ─────────────────────────────────────
const pilingMat = new MeshStandardMaterial({ color: PILING_COLOR, roughness: 0.92 });
const stringerMat = new MeshStandardMaterial({ color: STRINGER_COLOR, roughness: 0.85 });
const bumperMat = new MeshStandardMaterial({ color: BUMPER_COLOR, roughness: 0.9 });
const cleatMat = new MeshStandardMaterial({ color: "#555555", metalness: 0.6, roughness: 0.4 });

// ── Wood plank shader ────────────────────────────────────
const WOOD_VERTEX = `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WOOD_FRAGMENT = `
  uniform vec3 uBaseColor;
  uniform float uPlankWidth;
  uniform float uGapWidth;
  uniform int uPlankAxis;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float coord = uPlankAxis == 0 ? vWorldPos.x : vWorldPos.z;
    float pitch = uPlankWidth + uGapWidth;
    float plankIndex = floor(coord / pitch);
    float withinPlank = fract(coord / pitch) * pitch;

    float isGap = smoothstep(uPlankWidth - 0.005, uPlankWidth, withinPlank);

    float variation = hash(plankIndex) * 0.14 - 0.07;
    float otherCoord = uPlankAxis == 0 ? vWorldPos.z : vWorldPos.x;
    float grain = sin(otherCoord * 12.0 + hash(plankIndex) * 50.0) * 0.015;

    vec3 plankColor = uBaseColor * (1.0 + variation + grain);

    // Edge weathering
    float edgeDist = withinPlank / uPlankWidth;
    plankColor *= 1.0 - smoothstep(0.92, 1.0, edgeDist) * 0.06;
    plankColor *= 1.0 - (1.0 - smoothstep(0.0, 0.08, edgeDist)) * 0.06;

    vec3 color = mix(plankColor, vec3(0.01, 0.01, 0.02), isGap);

    vec3 lightDir = normalize(vec3(0.5, 1.0, -0.3));
    float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.4 + 0.6;
    color *= diffuse;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Deck Section (plank-shaded box) ──────────────────────
function DeckSection({
  position,
  sizeX,
  sizeZ,
  plankAxis,
}: {
  position: [number, number, number];
  sizeX: number;
  sizeZ: number;
  plankAxis: 0 | 1;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[sizeX, DECK_THICKNESS, sizeZ]} />
      <shaderMaterial
        vertexShader={WOOD_VERTEX}
        fragmentShader={WOOD_FRAGMENT}
        uniforms={{
          uBaseColor: { value: DECK_COLOR },
          uPlankWidth: { value: 0.15 },
          uGapWidth: { value: 0.012 },
          uPlankAxis: { value: plankAxis },
        }}
      />
    </mesh>
  );
}

// ── Support Frame (bent): 2 posts + cross-beam ──────────
// A real dock bent: two tapered pilings with a horizontal
// cap beam connecting their tops just under the deck.
function SupportFrame({
  x,
  z,
  dockWidth,
  along,
}: {
  x: number;
  z: number;
  dockWidth: number;
  along: "z" | "x"; // which axis the dock runs along
}) {
  const topY = DECK_Y - DECK_THICKNESS / 2;
  const postH = 3.5;
  const postCY = topY - postH / 2;
  const inset = dockWidth * 0.4;

  // Posts spread across dock width; beam connects them
  const p1: [number, number, number] =
    along === "z" ? [x - inset, postCY, z] : [x, postCY, z - inset];
  const p2: [number, number, number] =
    along === "z" ? [x + inset, postCY, z] : [x, postCY, z + inset];

  const beamArgs: [number, number, number] =
    along === "z"
      ? [dockWidth * 0.8 + 0.3, 0.15, 0.2]
      : [0.2, 0.15, dockWidth * 0.8 + 0.3];

  return (
    <group>
      <mesh position={p1} material={pilingMat} castShadow>
        <cylinderGeometry args={[0.1, 0.14, postH, 8]} />
      </mesh>
      <mesh position={p2} material={pilingMat} castShadow>
        <cylinderGeometry args={[0.1, 0.14, postH, 8]} />
      </mesh>
      <mesh position={[x, topY - 0.08, z]} material={stringerMat} castShadow>
        <boxGeometry args={beamArgs} />
      </mesh>
    </group>
  );
}

// ── Stringer (long beam under deck connecting frames) ────
function Stringer({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const cx = (start[0] + end[0]) / 2;
  const cy = (start[1] + end[1]) / 2;
  const cz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={[cx, cy, cz]} rotation={[0, angle, 0]} material={stringerMat} castShadow>
      <boxGeometry args={[0.18, 0.18, length]} />
    </mesh>
  );
}

// ── Rub rail (dark edge strip) ───────────────────────────
function RubRail({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const cx = (start[0] + end[0]) / 2;
  const cy = (start[1] + end[1]) / 2;
  const cz = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={[cx, cy, cz]} rotation={[0, angle, 0]} material={bumperMat} castShadow>
      <boxGeometry args={[0.08, 0.1, length]} />
    </mesh>
  );
}

// ── Dock cleat (small T-shaped fitting) ──────────────────
function DockCleat({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={cleatMat} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.06, 6]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={cleatMat} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
      </mesh>
    </group>
  );
}

// ── Assemble main arm structure ──────────────────────────
function MainArmStructure() {
  const topY = DECK_Y - DECK_THICKNESS / 2;
  const stringerY = topY - 0.25;
  const half = MAIN_ARM_WIDTH / 2;
  const halfLen = MAIN_ARM_LENGTH / 2;

  const framePositions: number[] = [];
  for (let z = -24; z <= 24; z += 4) framePositions.push(z);

  return (
    <>
      {/* Support frames every 4m */}
      {framePositions.map((z) => (
        <SupportFrame key={`mf-${z}`} x={0} z={z} dockWidth={MAIN_ARM_WIDTH} along="z" />
      ))}

      {/* Longitudinal stringers (2 per side, running the full length) */}
      <Stringer start={[-half + 0.3, stringerY, -halfLen]} end={[-half + 0.3, stringerY, halfLen]} />
      <Stringer start={[half - 0.3, stringerY, -halfLen]} end={[half - 0.3, stringerY, halfLen]} />

      {/* Rub rails along both outer edges */}
      <RubRail start={[-half, DECK_Y - 0.02, -halfLen]} end={[-half, DECK_Y - 0.02, halfLen]} />
      <RubRail start={[half, DECK_Y - 0.02, -(halfLen + SHORE_ARM_WIDTH / 2)]} end={[half, DECK_Y - 0.02, halfLen]} />

      {/* Cleats along the outer (+X) edge every 8m */}
      {[-20, -12, -4, 4, 12, 20].map((z) => (
        <DockCleat key={`mc-${z}`} position={[half - 0.2, DECK_Y + 0.03, z]} />
      ))}

      {/* Cleats along inner (-X) edge at a few points */}
      {[-16, 0, 16].map((z) => (
        <DockCleat key={`mic-${z}`} position={[-half + 0.2, DECK_Y + 0.03, z]} />
      ))}
    </>
  );
}

// ── Assemble shore arm structure ─────────────────────────
function ShoreArmStructure() {
  const topY = DECK_Y - DECK_THICKNESS / 2;
  const stringerY = topY - 0.25;
  const half = SHORE_ARM_WIDTH / 2;

  const framePositions: number[] = [];
  for (let x = -22; x <= -2; x += 4) framePositions.push(x);

  return (
    <>
      {/* Support frames every 4m */}
      {framePositions.map((x) => (
        <SupportFrame key={`sf-${x}`} x={x} z={SHORE_ARM_CZ} dockWidth={SHORE_ARM_WIDTH} along="x" />
      ))}

      {/* Longitudinal stringers */}
      <Stringer
        start={[SHORE_ARM_FAR_X, stringerY, SHORE_ARM_CZ - half + 0.3]}
        end={[MAIN_ARM_WIDTH / 2, stringerY, SHORE_ARM_CZ - half + 0.3]}
      />
      <Stringer
        start={[SHORE_ARM_FAR_X, stringerY, SHORE_ARM_CZ + half - 0.3]}
        end={[-MAIN_ARM_WIDTH / 2, stringerY, SHORE_ARM_CZ + half - 0.3]}
      />

      {/* Rub rails */}
      <RubRail
        start={[SHORE_ARM_FAR_X, DECK_Y - 0.02, SHORE_ARM_CZ - half]}
        end={[MAIN_ARM_WIDTH / 2, DECK_Y - 0.02, SHORE_ARM_CZ - half]}
      />
      <RubRail
        start={[SHORE_ARM_FAR_X, DECK_Y - 0.02, SHORE_ARM_CZ + half]}
        end={[-MAIN_ARM_WIDTH / 2, DECK_Y - 0.02, SHORE_ARM_CZ + half]}
      />

      {/* End cap rub rail */}
      <RubRail
        start={[SHORE_ARM_FAR_X, DECK_Y - 0.02, SHORE_ARM_CZ - half]}
        end={[SHORE_ARM_FAR_X, DECK_Y - 0.02, SHORE_ARM_CZ + half]}
      />

      {/* Cleats along shore arm */}
      <DockCleat position={[-20, DECK_Y + 0.03, SHORE_ARM_CZ]} />
      <DockCleat position={[-12, DECK_Y + 0.03, SHORE_ARM_CZ]} />
      <DockCleat position={[-4, DECK_Y + 0.03, SHORE_ARM_CZ]} />
    </>
  );
}

// ── Main export ──────────────────────────────────────────
interface ProceduralDockProps {
  onDockClick?: (point: Vec2) => void;
}

export function ProceduralDock({ onDockClick }: ProceduralDockProps) {
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (onDockClick) {
      onDockClick({ x: e.point.x, z: e.point.z });
    }
  };

  const halfMain = MAIN_ARM_WIDTH / 2;
  const halfShore = SHORE_ARM_WIDTH / 2;

  return (
    <group
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}
    >
      {/* ── Deck surfaces ── */}
      <DeckSection
        position={[0, DECK_Y, MAIN_ARM_CZ]}
        sizeX={MAIN_ARM_WIDTH}
        sizeZ={MAIN_ARM_LENGTH}
        plankAxis={0}
      />
      <DeckSection
        position={[SHORE_ARM_CX, DECK_Y, SHORE_ARM_CZ]}
        sizeX={SHORE_ARM_LENGTH}
        sizeZ={SHORE_ARM_WIDTH}
        plankAxis={1}
      />

      {/* ── Structural underside ── */}
      <MainArmStructure />
      <ShoreArmStructure />
    </group>
  );
}
