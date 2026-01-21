"use client";

import { useState, useCallback, useRef } from "react";
import type { ScenarioConfig } from "@/lib/types";

interface SetupScreenProps {
  onStart: (config: ScenarioConfig) => void;
}

// ── Direction Compass (draggable) ────────────────────────

function DirectionCompass({
  value,
  onChange,
  id,
  mode,
  color,
}: {
  value: number;
  onChange: (deg: number) => void;
  id: string;
  mode: "from" | "toward";
  color: string;
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
      let deg = (Math.atan2(x, -y) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      deg = Math.round(deg / 15) * 15;
      if (deg >= 360) deg = 0;
      onChange(deg);
    },
    [onChange],
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
  const rad = (value * Math.PI) / 180;
  // Round to avoid SSR/client hydration mismatch from floating-point variance
  const rnd = (n: number) => Math.round(n * 100) / 100;
  const ex = rnd(CX + R * Math.sin(rad));
  const ey = rnd(CY - R * Math.cos(rad));

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

      {/* Cardinals */}
      <text x={CX} y={CY - R - 7} textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize={7} fontWeight="600">N</text>
      <text x={CX + R + 8} y={CY + 3} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6}>E</text>
      <text x={CX} y={CY + R + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6}>S</text>
      <text x={CX - R - 8} y={CY + 3} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6}>W</text>

      {/* Arrow */}
      <defs>
        <marker id={`arr-${id}`} markerWidth={6} markerHeight={6} refX={4.5} refY={3} orient="auto">
          <path d="M0,0.5 L5,3 L0,5.5 Z" fill={color} />
        </marker>
      </defs>
      {mode === "from" ? (
        <line x1={ex} y1={ey} x2={CX} y2={CY} stroke={color} strokeWidth={2} markerEnd={`url(#arr-${id})`} />
      ) : (
        <line x1={CX} y1={CY} x2={ex} y2={ey} stroke={color} strokeWidth={2} markerEnd={`url(#arr-${id})`} />
      )}

      <circle cx={ex} cy={ey} r={4} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />

      {/* Degree readout */}
      <text x={CX} y={CY + 4.5} textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize={12} fontWeight="700">
        {value}&deg;
      </text>
    </svg>
  );
}

// ── Scenario Preview (top-down dock view) ────────────────

function ScenarioPreview({
  windSpeed,
  windDirection,
  currentSpeed,
  currentDirection,
}: Omit<ScenarioConfig, "dockSide">) {
  const dockX = -12;
  const boatX = dockX - 2.65;
  const playerX = boatX - 6;

  const windToRad = ((windDirection + 180) * Math.PI) / 180;
  const wdx = Math.sin(windToRad);
  const wdy = -Math.cos(windToRad);

  const currRad = (currentDirection * Math.PI) / 180;
  const cdx = Math.sin(currRad);
  const cdy = -Math.cos(currRad);

  const AL = 3.5;

  return (
    <svg
      viewBox="-22 -14 44 28"
      className="w-full h-40 rounded-lg overflow-hidden"
      style={{ background: "linear-gradient(180deg, #131720 0%, #0e1118 100%)" }}
    >
      <defs>
        <marker id="ma-w" markerWidth="3.5" markerHeight="3.5" refX="2.8" refY="1.75" orient="auto">
          <path d="M0,0.3 L3,1.75 L0,3.2 Z" fill="rgba(120,180,240,0.7)" />
        </marker>
        <marker id="ma-c" markerWidth="3.5" markerHeight="3.5" refX="2.8" refY="1.75" orient="auto">
          <path d="M0,0.3 L3,1.75 L0,3.2 Z" fill="rgba(228,168,60,0.7)" />
        </marker>
        <marker id="ma-a" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="rgba(255,255,255,0.35)" />
        </marker>
      </defs>

      {/* Water texture lines */}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`wl${i}`} x1={-22} y1={-10 + i * 6} x2={22} y2={-10 + i * 6} stroke="rgba(255,255,255,0.025)" strokeWidth={0.3} />
      ))}

      {/* Dock */}
      <rect x={dockX - 1} y={-13} width={2} height={26} fill="#5C4A38" stroke="#3E3020" strokeWidth={0.3} rx={0.15} />
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`p${i}`} x1={dockX - 0.85} y1={-12 + i * 1.6} x2={dockX + 0.85} y2={-12 + i * 1.6} stroke="rgba(62,48,32,0.5)" strokeWidth={0.12} />
      ))}
      {[-10, -5, 0, 5, 10].map((y) => (
        <circle key={y} cx={dockX - 0.75} cy={y} r={0.35} fill="#3E3020" stroke="#2A1F14" strokeWidth={0.1} />
      ))}

      {/* Parked boats */}
      {[-10.5, 10.5].map((cy) => (
        <g key={cy} transform={`translate(${boatX}, ${cy})`}>
          <polygon points="0,-3.5 -1.05,-1.5 -1.1,2.2 -0.5,3.2 0,3.5 0.5,3.2 1.1,2.2 1.05,-1.5" fill="#6b7585" stroke="#4a5060" strokeWidth={0.2} />
        </g>
      ))}

      {/* Slip highlight */}
      <rect x={boatX - 1.5} y={-6} width={3} height={12} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.2} strokeDasharray="1,0.5" rx={0.3} />
      <text x={boatX} y={0.5} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={1.3} fontWeight="600">SLIP</text>

      {/* Wind arrows */}
      {windSpeed > 0 &&
        [{ x: dockX + 3, y: -6 }, { x: dockX + 3, y: 6 }].map(({ x, y }, i) => (
          <line key={`w${i}`} x1={x - wdx * AL} y1={y - wdy * AL} x2={x + wdx * AL} y2={y + wdy * AL} stroke="rgba(120,180,240,0.3)" strokeWidth={0.35} strokeDasharray="1.2,0.6" markerEnd="url(#ma-w)" />
        ))}

      {/* Current arrows */}
      {currentSpeed > 0 &&
        [{ x: dockX + 5, y: 0 }].map(({ x, y }, i) => (
          <line key={`c${i}`} x1={x - cdx * AL} y1={y - cdy * AL} x2={x + cdx * AL} y2={y + cdy * AL} stroke="rgba(228,168,60,0.35)" strokeWidth={0.5} markerEnd="url(#ma-c)" />
        ))}

      {/* Player boat */}
      <g transform={`translate(${playerX}, 0) rotate(90)`}>
        <polygon points="0,-3 -0.9,-1 -1,2 -0.5,2.8 0,3 0.5,2.8 1,2 0.9,-1" fill="#d0d4dc" stroke="rgba(255,255,255,0.4)" strokeWidth={0.3} />
      </g>

      {/* Approach line */}
      <line x1={playerX + 1.5} y1={0} x2={boatX - 2} y2={0} stroke="rgba(255,255,255,0.15)" strokeWidth={0.3} strokeDasharray="1.2,0.8" markerEnd="url(#ma-a)" />
    </svg>
  );
}

// ── Setup Screen ─────────────────────────────────────────

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [windSpeed, setWindSpeed] = useState(0);
  const [windDirection, setWindDirection] = useState(90);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [currentDirection, setCurrentDirection] = useState(180);

  return (
    <main
      className="h-dvh flex items-start justify-center px-4 pt-[8vh] pb-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #14181f 0%, #1a1e28 35%, #111419 70%, #0c0e14 100%)" }}
    >
      {/* Subtle wave background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute -bottom-2 w-[110%] -left-[5%] h-48 opacity-[0.04] animate-wave-drift"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path fill="#ffffff" d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,186.7C672,192,768,160,864,154.7C960,149,1056,171,1152,176C1248,181,1344,171,1392,165.3L1440,160L1440,320L0,320Z" />
        </svg>
        {/* Soft radial glow behind card */}
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #e4a83c 0%, transparent 70%)" }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md animate-fade-up overflow-y-auto max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-5xl font-black tracking-[0.12em] text-white mb-2"
            style={{ textShadow: "0 0 60px rgba(228,168,60,0.1)" }}
          >
            DOCKSIDE
          </h1>
          <p className="text-[#6b7280] text-xs tracking-wide">Configure conditions, then dock your boat</p>
        </div>

        <div className="bg-[#1a1e28]/90 backdrop-blur-xl rounded-2xl border border-[#2a2e38] shadow-2xl overflow-hidden">
          {/* Preview */}
          <div className="p-4 pb-0">
            <ScenarioPreview
              windSpeed={windSpeed}
              windDirection={windDirection}
              currentSpeed={currentSpeed}
              currentDirection={currentDirection}
            />
          </div>

          {/* Environment controls */}
          <div className="p-4 space-y-3">
            {/* Wind row */}
            <div className="flex items-center gap-4">
              <DirectionCompass value={windDirection} onChange={setWindDirection} id="wind" mode="from" color="#78b4f0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#78b4f0] shadow-[0_0_6px_rgba(120,180,240,0.4)]" />
                  <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">Wind</span>
                  <span className="text-[9px] text-[#565d6a] ml-auto">Blowing from</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(Number(e.target.value))}
                    className="flex-1 h-1 appearance-none bg-[#252830] rounded-full cursor-pointer"
                    style={{ accentColor: "#78b4f0" }}
                  />
                  <span className="text-sm font-bold tabular-nums text-[#e2e5ea] min-w-[44px] text-right">
                    {windSpeed} <span className="text-[10px] text-[#6b7280] font-medium">kts</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-[#252830]" />

            {/* Current row */}
            <div className="flex items-center gap-4">
              <DirectionCompass value={currentDirection} onChange={setCurrentDirection} id="current" mode="toward" color="#e4a83c" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#e4a83c] shadow-[0_0_6px_rgba(228,168,60,0.4)]" />
                  <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-widest">Current</span>
                  <span className="text-[9px] text-[#565d6a] ml-auto">Flowing toward</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.5}
                    value={currentSpeed}
                    onChange={(e) => setCurrentSpeed(Number(e.target.value))}
                    className="flex-1 h-1 appearance-none bg-[#252830] rounded-full cursor-pointer"
                    style={{ accentColor: "#e4a83c" }}
                  />
                  <span className="text-sm font-bold tabular-nums text-[#e2e5ea] min-w-[44px] text-right">
                    {currentSpeed} <span className="text-[10px] text-[#6b7280] font-medium">kts</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Start button — full-bleed bottom */}
          <button
            type="button"
            onClick={() =>
              onStart({ dockSide: "left", windSpeed, windDirection, currentSpeed, currentDirection })
            }
            className="w-full py-4 font-bold text-sm uppercase tracking-widest transition-all cursor-pointer text-white/95"
            style={{
              background: "linear-gradient(135deg, #c88a20 0%, #e4a83c 50%, #c88a20 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 -1px 0 rgba(0,0,0,0.3)",
            }}
          >
            Start Docking
          </button>
        </div>
      </div>
    </main>
  );
}
