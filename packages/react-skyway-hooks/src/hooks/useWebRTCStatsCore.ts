"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseWebRTCStatsCoreOptions, UseWebRTCStatsCoreReturn, WebRTCStats } from "../types";

async function collectStats(
  prev: WebRTCStats | null,
  getPeerConnections: () => RTCPeerConnection[]
): Promise<WebRTCStats | null> {
  const pcs = getPeerConnections();
  if (pcs.length === 0) return null;

  let bytesSent = 0;
  let bytesReceived = 0;
  let rttMs: number | null = null;
  let packetsLost = 0;
  let packetsSent = 0;
  const now = Date.now();

  for (const pc of pcs) {
    const statsReport = await pc.getStats();
    for (const report of statsReport.values()) {
      if (
        report.type === "candidate-pair" &&
        (report as RTCIceCandidatePairStats).state === "succeeded"
      ) {
        const pair = report as RTCIceCandidatePairStats;
        if (typeof pair.currentRoundTripTime === "number") {
          rttMs =
            rttMs === null
              ? pair.currentRoundTripTime * 1000
              : Math.min(rttMs, pair.currentRoundTripTime * 1000);
        }
        bytesSent += pair.bytesSent ?? 0;
        bytesReceived += pair.bytesReceived ?? 0;
      }
      if (report.type === "outbound-rtp") {
        const outbound = report as RTCOutboundRtpStreamStats;
        packetsLost += (outbound as unknown as { packetsLost?: number }).packetsLost ?? 0;
        packetsSent += outbound.packetsSent ?? 0;
      }
    }
  }

  const elapsed = prev !== null ? (now - prev.updatedAt) / 1000 : 1;
  const bitrateSendBps = prev ? ((bytesSent - prev.bytesSent) * 8) / elapsed : 0;
  const bitrateReceiveBps = prev ? ((bytesReceived - prev.bytesReceived) * 8) / elapsed : 0;

  const packetLossRate = packetsSent > 0 ? packetsLost / (packetsSent + packetsLost) : null;

  return {
    rttMs,
    packetLossRate,
    bytesSent,
    bytesReceived,
    bitrateSendBps: Math.max(0, bitrateSendBps),
    bitrateReceiveBps: Math.max(0, bitrateReceiveBps),
    updatedAt: now,
  };
}

function defaultGetPeerConnections(): RTCPeerConnection[] {
  const skyway = (window as unknown as Record<string, unknown>)._skyway_pcs;
  if (Array.isArray(skyway)) {
    return skyway as RTCPeerConnection[];
  }
  return [];
}

export function useWebRTCStatsCore({
  room,
  intervalMs = 5000,
  enabled = true,
  getPeerConnections = defaultGetPeerConnections,
}: UseWebRTCStatsCoreOptions): UseWebRTCStatsCoreReturn {
  const [stats, setStats] = useState<WebRTCStats | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const prevStatsRef = useRef<WebRTCStats | null>(null);

  const collectNow = useCallback(async () => {
    const result = await collectStats(prevStatsRef.current, getPeerConnections);
    if (result) {
      prevStatsRef.current = result;
      setStats(result);
    }
  }, [getPeerConnections]);

  useEffect(() => {
    if (!room || !enabled) {
      setStats(null);
      setIsCollecting(false);
      return;
    }

    setIsCollecting(true);
    void collectNow();
    const timerId = setInterval(() => void collectNow(), intervalMs);

    return () => {
      clearInterval(timerId);
      setIsCollecting(false);
      prevStatsRef.current = null;
    };
  }, [room, enabled, intervalMs, collectNow]);

  return { stats, isCollecting, collectNow };
}
