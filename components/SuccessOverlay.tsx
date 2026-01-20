"use client";

interface SuccessOverlayProps {
  elapsedTime: number;
  collisionCount: number;
  onRetry: () => void;
  onNewScenario: () => void;
}

export function SuccessOverlay({ elapsedTime, collisionCount, onRetry, onNewScenario }: SuccessOverlayProps) {
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);

  const rating = collisionCount === 0
    ? { label: "Perfect Docking!", stars: 3 }
    : collisionCount <= 2
      ? { label: "Good Job!", stars: 2 }
      : { label: "Docked!", stars: 1 };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="text-4xl mb-2">
          {"⭐".repeat(rating.stars)}{"☆".repeat(3 - rating.stars)}
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">
          {rating.label}
        </h2>
        <p className="text-text-muted mb-6">
          You docked successfully.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Time</div>
            <div className="text-xl font-bold text-text-primary tabular-nums">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-text-muted uppercase tracking-wider">Collisions</div>
            <div className={`text-xl font-bold tabular-nums ${collisionCount === 0 ? "text-green-600" : "text-orange-600"}`}>
              {collisionCount}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-primary font-medium rounded-lg transition-colors cursor-pointer"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onNewScenario}
            className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            New Scenario
          </button>
        </div>
      </div>
    </div>
  );
}
