import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigModal } from "@/components/ConfigModal";

const defaultConfig = {
  dockSide: "left" as const,
  windSpeed: 0,
  windDirection: 90,
  currentSpeed: 1,
  currentDirection: 180,
};

describe("ConfigModal", () => {
  it("renders title and start button", () => {
    render(<ConfigModal onStart={vi.fn()} initialConfig={defaultConfig} />);
    expect(screen.getByText("DOCKSIDE")).toBeInTheDocument();
    expect(screen.getByText("Start Docking")).toBeInTheDocument();
  });

  it("calls onStart with config when clicking start", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<ConfigModal onStart={onStart} initialConfig={defaultConfig} />);

    await user.click(screen.getByText("Start Docking"));
    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        dockSide: "left",
        windSpeed: expect.any(Number),
        windDirection: expect.any(Number),
        currentSpeed: expect.any(Number),
        currentDirection: expect.any(Number),
      })
    );
  });

  it("renders wind and current controls", () => {
    render(<ConfigModal onStart={vi.fn()} initialConfig={defaultConfig} />);
    expect(screen.getByText("Wind")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });
});
