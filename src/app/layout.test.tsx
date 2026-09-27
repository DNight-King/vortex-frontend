import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { useGlobalErrorCaptureMock } = vi.hoisted(() => ({
  useGlobalErrorCaptureMock: vi.fn(),
}));

// Stub out the global error capture hook — we test it in isolation
vi.mock("@/hooks/useGlobalErrorCapture", () => ({
  useGlobalErrorCapture: useGlobalErrorCaptureMock,
}));

// The command palette navigates with the app router, which a unit render
// doesn't mount; the layout tests only care that the layout renders.
vi.mock("@/components/CommandPalette", () => ({ CommandPalette: () => null }));

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("renders its children", () => {
    render(
      <RootLayout>
        <p>Child content</p>
      </RootLayout>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders a skip-to-content link targeting main content", () => {
    render(
      <RootLayout>
        <div />
      </RootLayout>,
    );

    expect(screen.getByText("Skip to main content")).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("mounts the global error capture hook", () => {
    render(
      <RootLayout>
        <div />
      </RootLayout>
    );
    expect(useGlobalErrorCaptureMock).toHaveBeenCalled();
  });
});
