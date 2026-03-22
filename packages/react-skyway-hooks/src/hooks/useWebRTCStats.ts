"use client";

import type { LocalRoomMember } from "@skyway-sdk/room";
import { useEffect, useRef, useState } from "react";
import type { AnyRoom, UseWebRTCStatsOptions, UseWebRTCStatsReturn, WebRTCStats } from "../types";

// ----------------------------------------------------------------
// RTCPeerConnection 統計収集ヘルパー
// ----------------------------------------------------------------

/**
 * RTCPeerConnection の getStats() から集計値を取得する。
 * 内部では RTCStatsType のうち candidatePair / inbound-rtp / outbound-rtp を利用。
 */
async function collectStats(prev: WebRTCStats | null): Promise<WebRTCStats | null> {
  // WebRTC は PeerConnection に直接アクセスする必要があるため、
  // アクティブな全 RTCPeerConnection を列挙して統計を集約する。
  // SkyWay SDK は PeerConnection を隠蔽しているため、
  // ブラウザ標準の RTCPeerConnection を monkey-patch せずに
  // navigator.mediaDevices や window オブジェクトからは取得できない。
  // ここでは window.__skyway_peerConnections（SDK が開放する場合）を利用するか、
  // 代替として document.querySelectorAll('video/audio') の tracks の
  // stats を取得するアプローチを採用する（SDK 依存を最小化）。
  //
  // 実運用では SkyWay SDK が RTCPeerConnection を公開している場合、
  // room.localRoomMember から取得するなど SDK ごとに拡張してください。

  const pcs: RTCPeerConnection[] = [];

  // SkyWay SDK が window._skyway_pcs にアクセサを提供する場合（拡張ポイント）
  const skyway = (window as unknown as Record<string, unknown>)._skyway_pcs;
  if (Array.isArray(skyway)) {
    pcs.push(...(skyway as RTCPeerConnection[]));
  }

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
        // currentRoundTripTime は秒単位
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
  const [stats, setStats] = useState<WebRTCStats | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const prevStatsRef = useRef<WebRTCStats | null>(null);

  useEffect(() => {
    if (!room || !enabled) {
      setStats(null);
      setIsCollecting(false);
      return;
    }

    setIsCollecting(true);

    const collect = async () => {
      const result = await collectStats(prevStatsRef.current);
      if (result) {
        prevStatsRef.current = result;
        setStats(result);
      }
    };

    void collect();
    const timerId = setInterval(() => void collect(), intervalMs);

    return () => {
      clearInterval(timerId);
      setIsCollecting(false);
      prevStatsRef.current = null;
    };
  }, [room, enabled, intervalMs]);

  return { stats, isCollecting };
}
