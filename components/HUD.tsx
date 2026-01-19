"use client";

import { useState } from "react";
import type { BoatState, ScenarioConfig, Vec2 } from "@/lib/types";
import { magnitude, msToKnots, radToDeg, normalizeAngle, degToRad } from "@/lib/utils";

interface HUDProps {
  boat: BoatState;
  scenario: ScenarioConfig;
  elapsedTime: number;
  collisionCount: number;
  slipCenter: Vec2;
  slipHeading: number;
  steerPosition: number;
  onRestart: () => void;
}

const CONTROLS = [
  { keys: "W (hold)", action: "Throttle Forward" },
  { keys: "S (hold)", action: "Throttle Reverse" },
  { keys: "A / \u2190", action: "Turn Wheel Left" },
  { keys: "D / \u2192", action: "Turn Wheel Right" },
  { keys: "Space", action: "Look Behind" },
  { keys: "Mouse", action: "Look Around" },
  { keys: "Click Dock", action: "Attach Line" },
];

export function HUD({
  boat,
  scenario,
  elapsedTime,
  collisionCount,
  slipCenter,
  slipHeading,
  steerPosition,
  onRestart,
}: HUDProps) {
  const [showControls, setShowControls] = useState(false);

  const speed = magnitude({ x: boat.vx, z: boat.vz });
  const speedKnots = msToKnots(speed);
  const headingDeg = Math.round(radToDeg(normalizeAngle(boat.heading)));
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);

  const throttlePct = Math.round(Math.abs(boat.throttle) * 100);
  const throttleDir = boat.throttle > 0.01 ? "FWD" : boat.throttle < -0.01 ? "REV" : "";

  const dx = boat.x - slipCenter.x;
  const dz = boat.z - slipCenter.z;
  const distToSlip = Math.sqrt(dx * dx + dz * dz);

  const slipRight = { x: Math.cos(slipHeading), z: -Math.sin(slipHeading) };
  const lateralOffset = dx * slipRight.x + dz * slipRight.z;

  // Relative push direction for compass arrows (matches config compass logic)
  const windPushAngle = degToRad(scenario.windDirection + 180) - boat.heading;
  const currentPushAngle = degToRad(scenario.currentDirection) - boat.heading;

  const hasWind = scenario.windSpeed > 0;
  const hasCurrent = scenario.currentSpeed > 0;

  // Steering: map -6..+6 to percentage
  const steerPct = ((steerPosition + 6) / 12) * 100;

  return (
    <>
      <div className="absolute top-0 left-0 right-0 pointer-events-none p-3 flex justify-center">
        <div className="inline-flex bg-black/65 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
          {/* Main instrument row */}
          <div className="flex items-stretch">

            {/* Speed + Heading */}
            <div className="flex items-center gap-5 px-5 py-3">
              <div>
                <div className="text-[9px] text-white/40 uppercase tracking-[0.15em] font-medium">Speed</div>
                <div className="text-[22px] font-bold tabular-nums text-white leading-none mt-0.5">
                  {speedKnots.toFixed(1)}
                  <span className="text-[10px] text-white/40 ml-1 font-medium">kts</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] text-white/40 uppercase tracking-[0.15em] font-medium">Heading</div>
                <div className="text-[20px] font-bold tabular-nums text-white leading-none mt-0.5">
                  {headingDeg.toString().padStart(3, "0")}&deg;
                </div>
              </div>
            </div>

            <Divider />

            {/* Throttle */}
            <div className="flex items-center px-4 py-3">
              <div>
                <div className="text-[9px] text-white/40 uppercase tracking-[0.15em] font-medium">Throttle</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-16 h-[5px] bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-100 ${
                        boat.throttle > 0.01 ? "bg-emerald-400" : boat.throttle < -0.01 ? "bg-red-400" : "bg-white/15"
                      }`}
                      style={{ width: `${throttlePct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums ${
                    boat.throttle > 0.01 ? "text-emerald-400" : boat.throttle < -0.01 ? "text-red-400" : "text-white/25"
                  }`}>
                    {throttlePct > 0 ? `${throttleDir} ${throttlePct}%` : "IDLE"}
                  </span>
                </div>
              </div>
            </div>

            <Divider />

            {/* Steering */}
            <div className="flex items-center px-4 py-3">
              <div>
                <div className="text-[9px] text-white/40 uppercase tracking-[0.15em] font-medium">Rudder</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[8px] text-white/25 font-mono">P</span>
                  <div className="relative w-16 h-[5px] bg-white/[0.08] rounded-full">
                    {/* Center mark */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 -translate-x-px" />
                    {/* Indicator */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-[left] duration-100"
                      style={{
                        left: `${steerPct}%`,
                        backgroundColor:
                          steerPosition === 0 ? "#6b7280" : steerPosition < 0 ? "#f59e0b" : "#3b82f6",
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-white/25 font-mono">S</span>
                </div>
                <div className="text-[9px] text-white/35 text-center mt-0.5 tabular-nums font-mono">
                  {steerPosition === 0
                    ? "CTR"
                    : steerPosition < 0
                      ? `P${Math.abs(steerPosition)}`
                      : `S${steerPosition}`}
                </div>
              </div>
            </div>

            <Divider />

            {/* Timer + Distance */}
            <div className="flex items-center px-4 py-3">
              <div className="text-center min-w-[65px]">
                <div className="text-lg font-bold tabular-nums text-white leading-none">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold tabular-nums ${
                    distToSlip < 3 ? "text-emerald-400" : distToSlip < 8 ? "text-amber-400" : "text-white/50"
                  }`}>
                    {distToSlip.toFixed(1)}m
                  </span>
                  <span className="text-[10px] text-white/30 tabular-nums">
                    {Math.abs(lateralOffset) < 0.1
                      ? "CTR"
                      : `${Math.abs(lateralOffset).toFixed(1)}${lateralOffset < 0 ? "L" : "R"}`}
                  </span>
                </div>
                {collisionCount > 0 && (
                  <div className="text-[10px] text-red-400 font-bold mt-0.5">
                    {collisionCount} hit{collisionCount !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>

            {/* Wind & Current Compasses */}
            {(hasWind || hasCurrent) && (
              <>
                <Divider />
                <div className="flex items-center gap-3 px-4 py-2">
                  {hasWind && (
                    <ForceCompass
                      label="Wind"
                      angle={windPushAngle}
                      speed={scenario.windSpeed}
                      color="#60a5fa"
                    />
                  )}
                  {hasCurrent && (
                    <ForceCompass
                      label="Current"
                      angle={currentPushAngle}
                      speed={scenario.currentSpeed}
                      color="#34d399"
                    />
                  )}
                </div>
              </>
            )}

            {/* Action buttons — stacked vertically, full bleed */}
            <div className="flex flex-col self-stretch border-l border-white/[0.08]">
              <button
                type="button"
                onClick={onRestart}
                className="flex-1 flex items-center justify-center w-11 pointer-events-auto hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Restart"
              >
                {/* Rotate-right arrow (restart) */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <div className="h-px bg-white/[0.08]" />
              <button
                type="button"
                onClick={() => setShowControls(true)}
                className="flex-1 flex items-center justify-center w-11 pointer-events-auto hover:bg-white/[0.08] transition-colors cursor-pointer"
                title="Controls"
              >
                {/* Keyboard icon (controls) */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="6" y1="8" x2="6" y2="8" />
                  <line x1="10" y1="8" x2="10" y2="8" />
                  <line x1="14" y1="8" x2="14" y2="8" />
                  <line x1="18" y1="8" x2="18" y2="8" />
                  <line x1="6" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="18" y2="12" />
                  <line x1="8" y1="16" x2="16" y2="16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls modal */}
      {showControls && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto"
          onClick={() => setShowControls(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowControls(false)}
          role="button"
          tabIndex={0}
        >
          <div
            className="bg-[#1a2234]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm tracking-wide">Controls</h3>
              <button
                type="button"
                onClick={() => setShowControls(false)}
                className="text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {CONTROLS.map(({ keys, action }) => (
                <div key={keys} className="flex items-center gap-3">
                  <kbd className="bg-white/[0.08] border border-white/[0.1] px-2 py-1 rounded-md text-[10px] font-mono text-white/70 min-w-[72px] text-center shrink-0">
                    {keys}
                  </kbd>
                  <span className="text-[11px] text-white/50">{action}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
              <span className="text-[10px] text-white/25">Press anywhere or ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Divider() {
  return <div className="w-px self-stretch bg-white/[0.08]" />;
}

function ForceCompass({
  label,
  angle,
  speed,
  color,
}: {
  label: string;
  angle: number;
  speed: number;
  color: string;
}) {
  const angleDeg = radToDeg(angle);

  return (
    <div className="flex flex-col items-center">
      <div className="text-[8px] text-white/35 uppercase tracking-[0.15em] font-medium">{label}</div>
      <svg width="46" height="46" viewBox="0 0 46 46" className="mt-0.5">
        {/* Outer ring */}
        <circle cx="23" cy="23" r="21" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        {/* Cardinal tick marks */}
        <line x1="23" y1="3" x2="23" y2="7" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <line x1="23" y1="39" x2="23" y2="43" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1="3" y1="23" x2="7" y2="23" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1="39" y1="23" x2="43" y2="23" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        {/* Bow marker (triangle at top) */}
        <polygon points="23,2 21.2,5.5 24.8,5.5" fill="rgba(255,255,255,0.35)" />

        {/* Force arrow: center to edge */}
        <g transform={`rotate(${angleDeg}, 23, 23)`}>
          <line
            x1="23" y1="23" x2="23" y2="6"
            stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7"
          />
          <polygon points="23,3.5 19.5,9.5 26.5,9.5" fill={color} opacity="0.9" />
        </g>
        <circle cx="23" cy="23" r="2" fill={color} opacity="0.3" />
      </svg>
      <div className="text-[10px] font-bold tabular-nums leading-none" style={{ color }}>
        {speed.toFixed(1)} <span className="text-[8px] font-medium opacity-60">kts</span>
      </div>
    </div>
  );
}
