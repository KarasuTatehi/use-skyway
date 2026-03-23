import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWebRTCStatsCore } from "./useWebRTCStatsCore";

function createStatsMap() {
  return new Map<string, RTCStats>([
    [
      "candidate-pair-1",
      {
        id: "candidate-pair-1",
        timestamp: Date.now(),
        type: "candidate-pair",
        state: "succeeded",
        currentRoundTripTime: 0.123,
        bytesSent: 1000,
        bytesReceived: 2000,
      } as unknown as RTCIceCandidatePairStats,
    ],
    [
      "outbound-rtp-1",
      {
        id: "outbound-rtp-1",
        timestamp: Date.now(),
        type: "outbound-rtp",
        packetsSent: 100,
        packetsLost: 5,
      } as unknown as RTCOutboundRtpStreamStats,
    ],
  ]);
}

describe("useWebRTCStatsCore transparency", () => {
  it("uses injected getPeerConnections and computes stats", async () => {
    const getStats = vi.fn().mockResolvedValue(createStatsMap());
    const getPeerConnections = vi
      .fn()
      .mockReturnValue([{ getStats } as unknown as RTCPeerConnection]);

    const { result } = renderHook(() =>
      useWebRTCStatsCore({
        room: { id: "room-1" } as never,
        enabled: false,
        getPeerConnections,
      })
    );

    await act(async () => {
      await result.current.collectNow();
    });

    expect(getPeerConnections).toHaveBeenCalledTimes(1);
    expect(getStats).toHaveBeenCalledTimes(1);
  });

  it("does not start collecting when room is null", () => {
    const getPeerConnections = vi.fn();

    const { result } = renderHook(() =>
      useWebRTCStatsCore({
        room: null,
        enabled: true,
        getPeerConnections,
      })
    );

    expect(result.current.isCollecting).toBe(false);
    expect(result.current.stats).toBeNull();
    expect(getPeerConnections).not.toHaveBeenCalled();
  });
});
