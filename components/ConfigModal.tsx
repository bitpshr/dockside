"use client";

import { useState, useCallback, useRef } from "react";
import type { ScenarioConfig } from "@/lib/types";

const STARTING_HEADING_DEG = 270;

interface ConfigModalProps {
  onStart: (config: ScenarioConfig) => void;
  initialConfig: ScenarioConfig;
}

// ── Direction Compass (draggable) ────────────────────────

function DirectionCompass({
  value,
  onChange,
  id,
  mode,
  color,
  boatHeading = 0,
}: {
  value: number;
  onChange: (deg: number) => void;
  id: string;
  mode: "from" | "toward";
  color: string;
  boatHeading?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const updateAngle = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const x = clientX - rect.left - cx;
      const y = clientY - rect.top - cy;
      let deg = (Math.atan2(x, -y) * 180) / Math.PI + boatHeading + (mode === "from" ? -180 : 0);
      deg = ((deg % 360) + 360) % 360;
      deg = Math.round(deg / 15) * 15;
      if (deg >= 360) deg = 0;
      onChange(deg);
    },
    [onChange, boatHeading, mode],
  );

  const onDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      dragging.current = true;
      svgRef.current?.setPointerCapture(e.pointerId);
      updateAngle(e.clientX, e.clientY);
    },
    [updateAngle],
  );
  const onMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragging.current) updateAngle(e.clientX, e.clientY);
    },
    [updateAngle],
  );
  const onUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const R = 36;
  const CX = 50;
  const CY = 50;
  const pushOffset = mode === "from" ? 180 : 0;
  const displayRad = ((value + pushOffset - boatHeading) * Math.PI) / 180;
  const rnd = (n: number) => Math.round(n * 100) / 100;
  const ex = rnd(CX + R * Math.sin(displayRad));
  const ey = rnd(CY - R * Math.cos(displayRad));

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      className="w-24 h-24 cursor-pointer select-none touch-none shrink-0"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      {/* Background ring */}
      <circle cx={CX} cy={CY} r={R + 5} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.7} />

      {/* Tick marks every 15deg */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * 15 * Math.PI) / 180;
        const major = i % 6 === 0;
        const inner = major ? R - 5 : R - 2.5;
        return (
          <line
            key={i}
            x1={rnd(CX + inner * Math.sin(a))}
            y1={rnd(CY - inner * Math.cos(a))}
            x2={rnd(CX + (R + 0.5) * Math.sin(a))}
            y2={rnd(CY - (R + 0.5) * Math.cos(a))}
            stroke={`rgba(255,255,255,${major ? 0.3 : 0.1})`}
            strokeWidth={major ? 1 : 0.5}
          />
        );
      })}

      {/* Arrow */}
      <defs>
        <marker id={`arr-${id}`} markerWidth={6} markerHeight={6} refX={4.5} refY={3} orient="auto">
          <path d="M0,0.5 L5,3 L0,5.5 Z" fill={color} />
        </marker>
      </defs>
      <line x1={CX} y1={CY} x2={ex} y2={ey} stroke={color} strokeWidth={2} markerEnd={`url(#arr-${id})`} />

      <circle cx={ex} cy={ey} r={4} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />

      {/* Degree readout */}
      <text x={CX} y={CY + 4.5} textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize={12} fontWeight="700">
        {value}&deg;
      </text>
    </svg>
  );
}

// ── Config Modal ─────────────────────────────────────────

export function ConfigModal({ onStart, initialConfig }: ConfigModalProps) {
  const [windSpeed, setWindSpeed] = useState(initialConfig.windSpeed);
  const [windDirection, setWindDirection] = useState(initialConfig.windDirection);
  const [currentSpeed, setCurrentSpeed] = useState(initialConfig.currentSpeed);
  const [currentDirection, setCurrentDirection] = useState(initialConfig.currentDirection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
      <div
        className="bg-[#1a2234]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-fade-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-0">
          <h1 className="text-3xl font-black tracking-[0.12em] text-white text-center mb-1">DOCKSIDE</h1>
          <p className="text-white/30 text-[10px] tracking-widest uppercase text-center mb-4">Set conditions</p>
        </div>

        {/* Environment controls */}
        <div className="p-6 pt-4 space-y-4">
          {/* Wind row */}
          <div className="flex items-center gap-4">
            <DirectionCompass value={windDirection} onChange={setWindDirection} id="wind" mode="from" color="#60a5fa" boatHeading={STARTING_HEADING_DEG} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Wind</span>
                <span className="text-[9px] text-white/25 ml-auto">Blowing from</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="flex-1 h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer"
                  style={{ accentColor: "#60a5fa" }}
                />
                <span className="text-sm font-bold tabular-nums text-white/90 min-w-[44px] text-right">
                  {windSpeed} <span className="text-[10px] text-white/35 font-medium">kts</span>
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Current row */}
          <div className="flex items-center gap-4">
            <DirectionCompass value={currentDirection} onChange={setCurrentDirection} id="current" mode="toward" color="#34d399" boatHeading={STARTING_HEADING_DEG} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Current</span>
                <span className="text-[9px] text-white/25 ml-auto">Flowing toward</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.5}
                  value={currentSpeed}
                  onChange={(e) => setCurrentSpeed(Number(e.target.value))}
                  className="flex-1 h-1 appearance-none bg-white/[0.08] rounded-full cursor-pointer"
                  style={{ accentColor: "#34d399" }}
                />
                <span className="text-sm font-bold tabular-nums text-white/90 min-w-[44px] text-right">
                  {currentSpeed} <span className="text-[10px] text-white/35 font-medium">kts</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Start button */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() =>
              onStart({ dockSide: "left", windSpeed, windDirection, currentSpeed, currentDirection })
            }
            className="w-full py-3 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] rounded-xl font-semibold text-sm text-white/90 uppercase tracking-widest transition-colors cursor-pointer"
          >
            Start Docking
          </button>
        </div>
      </div>
    </div>
  );
}
