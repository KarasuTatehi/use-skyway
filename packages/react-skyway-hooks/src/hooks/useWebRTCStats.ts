"use client";

import type { LocalRoomMember } from "@skyway-sdk/room";
import type { AnyRoom, UseWebRTCStatsOptions, UseWebRTCStatsReturn, WebRTCStats } from "../types";
import { useWebRTCStatsCore } from "./useWebRTCStatsCore";

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

/**
 * RTT・パケットロス・ビットレートなど WebRTC 接続統計を定期的に収集するフック。
 *
 * ```tsx
 * const { stats } = useWebRTCStats(room, { intervalMs: 3000 });
 * if (stats) {
 *   console.log(`RTT: ${stats.rttMs}ms`);
 * }
 * ```
 */
export function useWebRTCStats(
  room: AnyRoom | null,
  _localMember: LocalRoomMember | null,
  { intervalMs = 5000, enabled = true }: UseWebRTCStatsOptions = {}
): UseWebRTCStatsReturn {
  const { stats, isCollecting } = useWebRTCStatsCore({
    room,
    intervalMs,
    enabled,
  });

  return { stats: stats as WebRTCStats | null, isCollecting };
}
