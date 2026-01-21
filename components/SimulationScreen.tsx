"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Group, ACESFilmicToneMapping, Vector3 } from "three";
import type { SimulationState, ScenarioConfig, DockLayout, MooringLine, BoatState, AttachmentPoint, Vec2 } from "@/lib/types";
import { PHYSICS } from "@/lib/types";
import { physicsTick } from "@/lib/physics/engine";
import { initInput, smoothInput, setInputEnabled, type InputState } from "@/lib/input";
import { createSimulationState } from "@/lib/scenario";
import { headingToForward } from "@/lib/utils";
import { BoatModel } from "@/components/scene/BoatModel";
import { DockModel } from "@/components/scene/DockModel";
import { WaterSurface } from "@/components/scene/WaterSurface";
import { SkyDome } from "@/components/scene/SkyDome";
import { MooringLine3D } from "@/components/scene/MooringLine3D";
import { HUD } from "@/components/HUD";

const INITIAL_INPUT: InputState = {
  throttle: 0, steering: 0, steerPosition: 0,
  lookYaw: 0, lookingBack: false,
};

// Fly-in duration in seconds
const FLY_IN_DURATION = 2.0;

interface SimulationScreenProps {
  scenario: ScenarioConfig;
  onRestart: () => void;
  modalOpen: boolean;
}

function Scene({
  simRef,
  inputRef,
  dockLayout,
  initialBoat,
  modalOpen,
}: {
  simRef: React.RefObject<SimulationState>;
  inputRef: React.RefObject<InputState>;
  dockLayout: DockLayout;
  initialBoat: BoatState;
  modalOpen: boolean;
}) {
  const boatGroupRef = useRef<Group>(null);
  const { camera } = useThree();
  const accumRef = useRef(0);

  // Fly-in animation state — plays on mount
  const flyInProgress = useRef(0);
  const flyInActive = useRef(true);

  const [steering, setSteering] = useState(initialBoat.steering);
  const [mooringLines, setMooringLines] = useState<{ lines: MooringLine[]; boat: BoatState }>({
    lines: [],
    boat: initialBoat,
  });

  const lineIdRef = useRef(0);

  const handleDockClick = useCallback((point: Vec2) => {
    const sim = simRef.current;
    const input = inputRef.current;
    const boat = sim.boat;

    const attachment: AttachmentPoint = input.lookingBack ? "stern" : "bow";

    // Replace existing line for this attachment point (bow or stern)
    const filtered = sim.mooringLines.filter(l => l.boatAttachment !== attachment);

    const forward = headingToForward(boat.heading);
    const offset = attachment === "bow" ? PHYSICS.BOAT_LENGTH / 2 : -PHYSICS.BOAT_LENGTH / 2;
    const attachX = boat.x + forward.x * offset;
    const attachZ = boat.z + forward.z * offset;
    const dx = point.x - attachX;
    const dz = point.z - attachZ;
    const ropeLength = Math.sqrt(dx * dx + dz * dz);

    if (ropeLength > PHYSICS.MAX_ROPE_LENGTH) return;

    const id = `dock-${lineIdRef.current++}`;
    (simRef as React.MutableRefObject<SimulationState>).current = {
      ...sim,
      mooringLines: [...filtered, {
        boatAttachment: attachment,
        cleatId: id,
        cleatX: point.x,
        cleatZ: point.z,
        ropeLength,
      }],
    };
  }, [simRef, inputRef]);

  useFrame((_, delta) => {
    const sim = simRef.current;

    // Only run physics when not in modal
    if (!modalOpen) {
      const input = inputRef.current;
      const smoothed = smoothInput(input, delta);
      (inputRef as React.MutableRefObject<InputState>).current = smoothed;

      sim.boat.throttle = smoothed.throttle;
      sim.boat.steering = smoothed.steering;

      accumRef.current += Math.min(delta, 0.1);
      while (accumRef.current >= PHYSICS.DT) {
        (simRef as React.MutableRefObject<SimulationState>).current = physicsTick(
          simRef.current,
          PHYSICS.DT,
        );
        accumRef.current -= PHYSICS.DT;
      }
    }

    const boat = simRef.current.boat;
    if (boatGroupRef.current) {
      boatGroupRef.current.position.set(boat.x, 0, boat.z);
      boatGroupRef.current.rotation.set(0, boat.heading, 0);
    }

    // Camera target position (helm) — nudge forward to see less roof
    const forward = headingToForward(boat.heading);
    const helmHeight = 1.65;
    const lookingBack = inputRef.current.lookingBack;
    const camOffset = lookingBack ? -0.8 : 0.05;
    const helmPos = new Vector3(
      boat.x + forward.x * camOffset,
      helmHeight,
      boat.z + forward.z * camOffset,
    );

    // Fly-in animation
    if (flyInActive.current) {
      flyInProgress.current = Math.min(flyInProgress.current + delta / FLY_IN_DURATION, 1);
      const t = flyInProgress.current;
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      // Start position: high up, offset behind and above boat
      const skyHeight = 50;
      const skyOffset = 20;
      const startPos = new Vector3(
        boat.x - forward.x * skyOffset,
        skyHeight,
        boat.z - forward.z * skyOffset,
      );

      // Interpolate position
      camera.position.lerpVectors(startPos, helmPos, ease);

      // Interpolate look target: from looking at dock area to looking forward
      const lookFar = new Vector3(
        helmPos.x + forward.x * 20,
        helmHeight - 0.15,
        helmPos.z + forward.z * 20,
      );
      const lookStart = new Vector3(
        boat.x,
        0,
        boat.z,
      );
      const lookTarget = new Vector3().lerpVectors(lookStart, lookFar, ease);
      camera.lookAt(lookTarget);

      if (t >= 1) {
        flyInActive.current = false;
      }
    } else {
      // Normal first-person camera
      camera.position.copy(helmPos);

      const input = inputRef.current;
      const lookAngle = boat.heading + input.lookYaw;
      const lookDir = {
        x: Math.sin(lookAngle),
        z: Math.cos(lookAngle),
      };
      camera.lookAt(
        camera.position.x + lookDir.x * 20,
        helmHeight - 0.15,
        camera.position.z + lookDir.z * 20,
      );
    }

    setSteering(boat.steering);
    const currentLines = simRef.current.mooringLines;
    if (currentLines.length > 0 || mooringLines.lines.length > 0) {
      setMooringLines({ lines: currentLines, boat: { ...boat } });
    }
  });

  return (
    <>
      <fog attach="fog" args={["#b0d0e9", 120, 400]} />
      <SkyDome />
      <WaterSurface />

      <Environment preset="sunset" background={false} environmentIntensity={0.5} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[100, 150, -50]}
        intensity={2.0}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-bias={-0.0003}
      />
      <hemisphereLight args={["#87CEEB", "#556B2F", 0.35]} />

      <group ref={boatGroupRef}>
        <BoatModel steering={steering} />
      </group>

      <DockModel
        layout={dockLayout}
        onDockClick={handleDockClick}
      />

      {mooringLines.lines.map((line, i) => (
        <MooringLine3D key={i} line={line} boat={mooringLines.boat} />
      ))}

      <EffectComposer>
        <Bloom intensity={0.2} luminanceThreshold={0.85} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.3} darkness={0.3} />
      </EffectComposer>
    </>
  );
}

export function SimulationScreen({ scenario, onRestart, modalOpen }: SimulationScreenProps) {
  const [initialState] = useState(() => createSimulationState(scenario));
  const simRef = useRef<SimulationState>(initialState);
  const inputRef = useRef<InputState>({ ...INITIAL_INPUT });
  const [fadeIn, setFadeIn] = useState(true);

  const [hudState, setHudState] = useState({
    boat: initialState.boat,
    elapsedTime: 0,
    collisionCount: 0,
    steerPosition: 0,
  });

  // Live-update scenario config (wind/current) without reloading the scene
  useEffect(() => {
    (simRef as React.MutableRefObject<SimulationState>).current = {
      ...simRef.current,
      scenario,
    };
  }, [scenario]);

  // Block input when modal is open
  useEffect(() => {
    setInputEnabled(!modalOpen);
  }, [modalOpen]);

  useEffect(() => {
    const cleanup = initInput();
    return cleanup;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const sim = simRef.current;
      setHudState({
        boat: { ...sim.boat },
        elapsedTime: sim.elapsedTime,
        collisionCount: sim.collisionCount,
        steerPosition: inputRef.current.steerPosition,
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Initial fade-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(false));
  }, []);

  return (
    <div className="h-dvh w-full relative">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 500 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <Scene
          simRef={simRef}
          inputRef={inputRef}
          dockLayout={initialState.dock}
          initialBoat={initialState.boat}
          modalOpen={modalOpen}
        />
      </Canvas>

      {/* Fade overlay */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-[1500ms] ease-out"
        style={{ opacity: fadeIn ? 1 : 0 }}
      />

      {!modalOpen && (
        <HUD
          boat={hudState.boat}
          scenario={scenario}
          elapsedTime={hudState.elapsedTime}
          collisionCount={hudState.collisionCount}
          slipCenter={initialState.dock.slipCenter}
          slipHeading={initialState.dock.slipHeading}
          steerPosition={hudState.steerPosition}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}
