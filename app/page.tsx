"use client";

import { useState, useCallback } from "react";
import type { ScenarioConfig } from "@/lib/types";
import { SimulationScreen } from "@/components/SimulationScreen";
import { ConfigModal } from "@/components/ConfigModal";

const DEFAULT_CONFIG: ScenarioConfig = {
  dockSide: "left",
  windSpeed: 0,
  windDirection: 90,
  currentSpeed: 1,
  currentDirection: 180,
};

export default function HomePage() {
  const [scenario, setScenario] = useState<ScenarioConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(true);

  const handleStart = useCallback((config: ScenarioConfig) => {
    setScenario(config);
    setShowConfig(false);
  }, []);

  const handleRestart = useCallback(() => {
    setShowConfig(true);
  }, []);

  return (
    <>
      <SimulationScreen
        scenario={scenario}
        onRestart={handleRestart}
        modalOpen={showConfig}
      />
      {showConfig && (
        <ConfigModal onStart={handleStart} initialConfig={scenario} />
      )}
    </>
  );
}
