"use client";

import { useRef, useMemo, Suspense, Component, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { Group, Box3, Vector3, BufferGeometry, Float32BufferAttribute, Mesh } from "three";
import { PHYSICS } from "@/lib/types";

const MODEL_PATH = "/models/fishing_boat.glb";

interface BoatModelProps {
  steering: number; // -1 to 1
}

// ── Error boundary for graceful fallback when GLB is missing ──
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ── GLB boat loader ──
function GLTFBoat() {
  const { scene } = useGLTF(MODEL_PATH);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Measure the model
    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Scale uniformly so longest horizontal axis = BOAT_LENGTH
    const maxHoriz = Math.max(size.x, size.z);
    const s = PHYSICS.BOAT_LENGTH / maxHoriz;
    clone.scale.setScalar(s);

    // Re-measure after scaling
    box.setFromObject(clone);
    box.getSize(size);
    box.getCenter(center);

    // If X is the longer axis, rotate 90° so length aligns with Z
    if (size.x > size.z * 1.2) {
      clone.rotation.y = Math.PI / 2;
      box.setFromObject(clone);
      box.getSize(size);
      box.getCenter(center);
    }

    // Center at origin, waterline at Y=0 (roughly 25% up from bottom)
    clone.position.set(-center.x, -box.min.y - size.y * 0.25, -center.z);

    return clone;
  }, [scene]);

  return <primitive object={cloned} />;
}

// Preload to start fetch immediately
try { useGLTF.preload(MODEL_PATH); } catch { /* noop */ }

// ── Shared hull geometry export for parked boats ──
export { MODEL_PATH };

export function useBoatGLTF() {
  return useGLTF(MODEL_PATH);
}

// ── Procedural hull geometry (fallback + parked boats) ──
function vert(arr: number[], v: number[]) {
  arr.push(v[0], v[1], v[2]);
}

function quad(arr: number[], a: number[], b: number[], c: number[], d: number[]) {
  vert(arr, a); vert(arr, b); vert(arr, c);
  vert(arr, a); vert(arr, c); vert(arr, d);
}

export function createHullGeometry(L: number, B: number): BufferGeometry {
  const halfB = B / 2;

  const stations: [number, number, number, number, number, number][] = [
    [L / 2,       0,              0,              0.86,   0.86,  0.86],
    [L * 0.49,    halfB * 0.01,   halfB * 0.02,   0.80,   0.82,  0.87],
    [L * 0.48,    halfB * 0.02,   halfB * 0.04,   0.74,   0.78,  0.88],
    [L * 0.47,    halfB * 0.03,   halfB * 0.06,   0.66,   0.74,  0.88],
    [L * 0.46,    halfB * 0.04,   halfB * 0.09,   0.58,   0.68,  0.89],
    [L * 0.45,    halfB * 0.06,   halfB * 0.12,   0.50,   0.62,  0.89],
    [L * 0.44,    halfB * 0.08,   halfB * 0.16,   0.42,   0.56,  0.89],
    [L * 0.42,    halfB * 0.11,   halfB * 0.22,   0.32,   0.48,  0.89],
    [L * 0.40,    halfB * 0.15,   halfB * 0.30,   0.22,   0.40,  0.89],
    [L * 0.37,    halfB * 0.20,   halfB * 0.40,   0.12,   0.32,  0.89],
    [L * 0.34,    halfB * 0.26,   halfB * 0.50,   0.04,   0.24,  0.88],
    [L * 0.30,    halfB * 0.34,   halfB * 0.58,  -0.02,   0.18,  0.87],
    [L * 0.25,    halfB * 0.44,   halfB * 0.68,  -0.06,   0.14,  0.86],
    [L * 0.20,    halfB * 0.54,   halfB * 0.76,  -0.08,   0.12,  0.85],
    [L * 0.14,    halfB * 0.64,   halfB * 0.84,  -0.10,   0.10,  0.84],
    [L * 0.08,    halfB * 0.74,   halfB * 0.90,  -0.10,   0.10,  0.83],
    [L * 0.02,    halfB * 0.82,   halfB * 0.95,  -0.10,   0.10,  0.82],
    [0,           halfB * 0.88,   halfB,         -0.08,   0.10,  0.80],
    [-L * 0.06,   halfB * 0.92,   halfB,         -0.06,   0.10,  0.79],
    [-L * 0.14,   halfB * 0.95,   halfB,         -0.04,   0.10,  0.78],
    [-L * 0.22,   halfB * 0.96,   halfB,         -0.02,   0.10,  0.77],
    [-L * 0.30,   halfB * 0.96,   halfB,          0.0,    0.10,  0.76],
    [-L * 0.40,   halfB * 0.96,   halfB,          0.0,    0.10,  0.74],
    [-L / 2,      halfB * 0.96,   halfB,          0.0,    0.10,  0.70],
  ];

  const positions: number[] = [];

  for (let i = 0; i < stations.length - 1; i++) {
    const [z0, bc0, bg0, k0, c0, g0] = stations[i];
    const [z1, bc1, bg1, k1, c1, g1] = stations[i + 1];

    const K0 = [0, k0, z0], K1 = [0, k1, z1];
    const PC0 = [-bc0, c0, z0], PC1 = [-bc1, c1, z1];
    const PG0 = [-bg0, g0, z0], PG1 = [-bg1, g1, z1];
    const SC0 = [bc0, c0, z0], SC1 = [bc1, c1, z1];
    const SG0 = [bg0, g0, z0], SG1 = [bg1, g1, z1];

    quad(positions, K0, PC0, PC1, K1);
    quad(positions, K0, K1, SC1, SC0);
    quad(positions, PG0, PG1, PC1, PC0);
    quad(positions, SC0, SC1, SG1, SG0);
    quad(positions, SG0, SG1, PG1, PG0);
  }

  const tr = stations[stations.length - 1];
  const [tz, tbc, tbg, tk, tc, tg] = tr;
  const TK = [0, tk, tz];
  const TPC = [-tbc, tc, tz], TPG = [-tbg, tg, tz];
  const TSC = [tbc, tc, tz], TSG = [tbg, tg, tz];
  vert(positions, TK); vert(positions, TPC); vert(positions, TSC);
  quad(positions, TPG, TSG, TSC, TPC);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

// ── Procedural boat (fallback while GLB loads or if missing) ──
function ProceduralBoat({ steering }: BoatModelProps) {
  const motorRef = useRef<Group>(null);
  const hullGeo = useMemo(() => createHullGeometry(PHYSICS.BOAT_LENGTH, PHYSICS.BOAT_BEAM), []);
  const motorAngle = -steering * PHYSICS.MAX_STEER_ANGLE;
  const L = PHYSICS.BOAT_LENGTH;

  return (
    <group>
      <mesh geometry={hullGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#f5f5f0" roughness={0.3} metalness={0.0} />
      </mesh>
      {/* Console */}
      <mesh position={[0, 1.12, 0.3]} castShadow>
        <boxGeometry args={[1.3, 0.65, 1.5]} />
        <meshStandardMaterial color="#f0ede6" roughness={0.5} metalness={0.0} />
      </mesh>
      {/* T-top posts */}
      {[[-0.55, L / 8], [0.55, L / 8], [-0.55, -L / 8], [0.55, -L / 8]].map(([x, z], i) => (
        <mesh key={`t-${i}`} position={[x, 1.9, z]}>
          <cylinderGeometry args={[0.025, 0.025, 1.5, 12]} />
          <meshStandardMaterial color="#c0c0c0" roughness={0.2} metalness={0.7} />
        </mesh>
      ))}
      {/* T-top canopy */}
      <mesh position={[0, 2.66, 0]}>
        <boxGeometry args={[1.8, 0.04, 2.1]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.7} metalness={0.0} />
      </mesh>
      {/* Motor */}
      <group ref={motorRef} position={[0, 0, -L / 2]} rotation={[0, motorAngle, 0]}>
        <mesh position={[0, 0.78, -0.4]} castShadow>
          <cylinderGeometry args={[0.17, 0.21, 0.52, 24]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.15} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.04, -0.4]}>
          <sphereGeometry args={[0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.15} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.0, -0.48]}>
          <cylinderGeometry args={[0.09, 0.065, 0.42, 16]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// ── Main export: GLB with procedural fallback ──
export function BoatModel({ steering }: BoatModelProps) {
  const fallback = <ProceduralBoat steering={steering} />;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLTFBoat />
      </Suspense>
    </ModelErrorBoundary>
  );
}
