import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SkyWayContextValue } from "../types";

vi.mock("../context/SkyWayProvider", async () => {
  const { createContext } = await import("react");

  return {
    SkyWayReactContext: createContext<unknown>(null),
  };
});

import { SkyWayReactContext } from "../context/SkyWayProvider";
import { useSkyWayContext, useSkyWayContextCore } from "./useSkyWayContext";

describe("useSkyWayContext", () => {
  it("throws when called outside SkyWayProvider", () => {
    expect(() => renderHook(() => useSkyWayContext())).toThrow(
      "[use-skyway] useSkyWayContext must be used inside <SkyWayProvider>."
    );
  });

  it("returns the context value when provided", () => {
    const value: SkyWayContextValue = {
      skyWayContext: { id: "ctx-1" } as never,
      isInitializing: false,
      error: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SkyWayReactContext.Provider value={value}>{children}</SkyWayReactContext.Provider>
    );

    const { result } = renderHook(() => useSkyWayContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});

describe("useSkyWayContextCore", () => {
  it("returns null when called outside SkyWayProvider", () => {
    const { result } = renderHook(() => useSkyWayContextCore());

    expect(result.current).toBeNull();
  });

  it("returns the context value when provided", () => {
    const value: SkyWayContextValue = {
      skyWayContext: { id: "ctx-2" } as never,
      isInitializing: true,
      error: null,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SkyWayReactContext.Provider value={value}>{children}</SkyWayReactContext.Provider>
    );

    const { result } = renderHook(() => useSkyWayContextCore(), { wrapper });

    expect(result.current).toBe(value);
  });
});
