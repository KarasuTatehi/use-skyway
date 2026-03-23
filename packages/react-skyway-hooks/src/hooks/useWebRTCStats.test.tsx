import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWebRTCStats } from "./useWebRTCStats";

const { useWebRTCStatsCoreMock } = vi.hoisted(() => ({
  useWebRTCStatsCoreMock: vi.fn(),
}));

vi.mock("./useWebRTCStatsCore", () => ({
  useWebRTCStatsCore: (options: unknown) => useWebRTCStatsCoreMock(options),
}));

describe("useWebRTCStats compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards room and options to useWebRTCStatsCore", () => {
    const stats = { rttMs: 12, packetLossRate: 0.01, bitrateKbps: 320 };
    useWebRTCStatsCoreMock.mockReturnValue({
      stats,
      isCollecting: true,
      collectNow: vi.fn().mockResolvedValue(undefined),
    });

    const room = { id: "room-1" };
    const localMember = { id: "local-1" };

    const { result } = renderHook(() =>
      useWebRTCStats(room as never, localMember as never, { intervalMs: 3000, enabled: false })
    );

    expect(useWebRTCStatsCoreMock).toHaveBeenCalledWith({
      room,
      intervalMs: 3000,
      enabled: false,
    });
    expect(result.current.stats).toBe(stats);
    expect(result.current.isCollecting).toBe(true);
  });
});
