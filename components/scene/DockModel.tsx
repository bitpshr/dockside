"use client";

import { useMemo, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, Mesh } from "three";
import type { DockLayout, OBB } from "@/lib/types";
import type { Vec2 } from "@/lib/types";
import { MODEL_PATH } from "./BoatModel";
import { ProceduralDock } from "./ProceduralDock";

const DEBUG_COLLISION = false;

interface DockModelProps {
  layout: DockLayout;
  onDockClick?: (point: Vec2) => void;
}

function DebugOBB({ obb, color }: { obb: OBB; color: string }) {
  return (
    <mesh position={[obb.cx, 2, obb.cz]} rotation={[0, obb.angle, 0]}>
      <boxGeometry args={[obb.halfW * 2, 4, obb.halfH * 2]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.7} />
    </mesh>
  );
}

function DebugSlipMarker({ center }: { center: Vec2 }) {
  return (
    <mesh position={[center.x, 3, center.z]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial color="yellow" wireframe />
    </mesh>
  );
}

function GLTFParkedBoat({ obb }: { obb: OBB }) {
  const { scene } = useGLTF(MODEL_PATH);
  const bl = obb.halfH * 2;

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new Box3().setFromObject(clone);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxHoriz = Math.max(size.x, size.z);
    const s = bl / maxHoriz;
    clone.scale.setScalar(s);

    box.setFromObject(clone);
    box.getSize(size);
    box.getCenter(center);

    if (size.x > size.z * 1.2) {
      clone.rotation.y = Math.PI / 2;
      box.setFromObject(clone);
      box.getSize(size);
      box.getCenter(center);
    }

    clone.position.set(-center.x, -box.min.y - size.y * 0.25, -center.z);
    return clone;
  }, [scene, bl]);

  return <primitive object={cloned} />;
}

function ParkedBoat({ obb }: { obb: OBB }) {
  return (
    <group position={[obb.cx, 0, obb.cz]} rotation={[0, obb.angle, 0]}>
      <Suspense fallback={null}>
        <GLTFParkedBoat obb={obb} />
      </Suspense>
    </group>
  );
}

export function DockModel({ layout, onDockClick }: DockModelProps) {
  return (
    <group>
      <ProceduralDock onDockClick={onDockClick} />

      {layout.parkedBoats.map((boat, i) => (
        <ParkedBoat key={`parked-${i}`} obb={boat} />
      ))}

      {DEBUG_COLLISION && (
        <>
          {layout.walls.map((wall, i) => (
            <DebugOBB key={`wall-${i}`} obb={wall} color="red" />
          ))}
          {layout.parkedBoats.map((boat, i) => (
            <DebugOBB key={`boat-${i}`} obb={boat} color="lime" />
          ))}
          <DebugSlipMarker center={layout.slipCenter} />
        </>
      )}
    </group>
  );
}
