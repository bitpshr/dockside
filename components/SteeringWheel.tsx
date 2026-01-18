"use client";

interface SteeringIndicatorProps {
  steerPosition: number; // -6 to 6
}

const MAX_POS = 6;

export function SteeringWheel({ steerPosition }: SteeringIndicatorProps) {
  // Map position to percentage: -6 = 0%, 0 = 50%, +6 = 100%
  const pct = ((steerPosition + MAX_POS) / (MAX_POS * 2)) * 100;

  return (
    <div className="absolute bottom-20 right-4 pointer-events-none w-48">
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-white/50 font-mono mb-1 px-0.5">
        <span>L6</span>
        <span>CENTER</span>
        <span>R6</span>
      </div>

      {/* Track */}
      <div className="relative h-3 bg-white/10 rounded-full border border-white/20">
        {/* Tick marks */}
        {Array.from({ length: 13 }, (_, i) => {
          const isCenter = i === 6;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 flex items-center"
              style={{ left: `${(i / 12) * 100}%` }}
            >
              <div
                className={`w-px ${isCenter ? "h-full bg-white/50" : "h-1/2 bg-white/20"}`}
              />
            </div>
          );
        })}

        {/* Indicator thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-md transition-[left] duration-100"
          style={{
            left: `${pct}%`,
            backgroundColor: steerPosition === 0 ? "#9ca3af" : steerPosition < 0 ? "#f59e0b" : "#3b82f6",
          }}
        />
      </div>

      {/* Position readout */}
      <div className="text-center text-white/60 text-[10px] font-mono mt-1">
        {steerPosition === 0
          ? "CENTER"
          : steerPosition < 0
            ? `LEFT ${Math.abs(steerPosition)}`
            : `RIGHT ${steerPosition}`}
      </div>
    </div>
  );
}
