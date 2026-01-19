"use client";

const CONTROLS = [
  { keys: "W (hold)", action: "Throttle Forward" },
  { keys: "S (hold)", action: "Throttle Reverse" },
  { keys: "A / ←", action: "Turn Wheel Left" },
  { keys: "D / →", action: "Turn Wheel Right" },
  { keys: "Space", action: "Look Behind" },
  { keys: "Mouse", action: "Look Around" },
  { keys: "Click Dock", action: "Attach Line" },
];

export function ControlsLegend() {
  return (
    <div className="absolute bottom-4 left-4 pointer-events-none">
      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Controls</div>
        {CONTROLS.map(({ keys, action }) => (
          <div key={keys} className="flex items-center gap-2 text-xs mb-0.5 last:mb-0">
            <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono min-w-[60px] text-center">
              {keys}
            </kbd>
            <span className="text-gray-300">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
