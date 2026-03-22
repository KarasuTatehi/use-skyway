"use client";

import { RoomControls } from "@/components/RoomControls";
import { VideoGrid } from "@/components/VideoGrid";
import {
  SkyWayProvider,
  useLocalPerson,
  useMediaStream,
  useRemotePersons,
  useRoom,
  useWebRTCStats,
} from "@use-skyway/react-hooks";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import styles from "./room.module.css";

// ----------------------------------------------------------------
// Inner (コンテキスト内で動作するコンポーネント)
// ----------------------------------------------------------------

interface RoomInnerProps {
  roomName: string;
}

function RoomInner({ roomName }: RoomInnerProps) {
  const router = useRouter();

  // 1. ルーム管理
  const { room, localMember, isConnecting, isConnected, error, join, leave } = useRoom({
    roomName,
    roomType: "p2p",
  });

  // 2. ローカルメンバーのメディア制御
  const {
    videoStream,
    audioStream,
    isVideoEnabled,
    isAudioEnabled,
    isVideoPublishing,
    isAudioPublishing,
    publishVideo,
    publishAudio,
    unpublishVideo,
    unpublishAudio,
    toggleVideo,
    toggleAudio,
  } = useLocalPerson({ localMember });

  // 3. リモート参加者
  const { remotePersons } = useRemotePersons({ room, localMember });

  // 4. メディアストリーム取得
  const { requestMediaStream, isLoading: isMediaLoading } = useMediaStream();

  // 5. WebRTC 統計
  const { stats } = useWebRTCStats(room, localMember, { intervalMs: 5000 });

  // ----------------------------------------------------------------
  // ハンドラー
  // ----------------------------------------------------------------

  const handleJoin = useCallback(async () => {
    const { video, audio } = await requestMediaStream();
    await join();
    if (video) await publishVideo(video);
    if (audio) await publishAudio(audio);
  }, [requestMediaStream, join, publishVideo, publishAudio]);

  const handleLeave = useCallback(async () => {
    await unpublishVideo();
    await unpublishAudio();
    await leave();
    router.push("/");
  }, [unpublishVideo, unpublishAudio, leave, router]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  if (error) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>⚠ {error.message}</p>
        <button type="button" className={styles.retryButton} onClick={() => router.push("/")}>
          トップへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.roomInfo}>
          <span className={styles.roomName}>{roomName}</span>
          {isConnected && (
            <span className={styles.connectedBadge}>{remotePersons.length + 1}人接続中</span>
          )}
        </div>
        {stats && (
          <div className={styles.statsBar}>
            {stats.rttMs !== null && <span>RTT: {Math.round(stats.rttMs)}ms</span>}
            {stats.packetLossRate !== null && (
              <span>パケットロス: {(stats.packetLossRate * 100).toFixed(1)}%</span>
            )}
          </div>
        )}
      </header>

      {/* ビデオグリッド */}
      <VideoGrid
        localMember={localMember}
        localVideoStream={isVideoPublishing ? videoStream : null}
        remotePersons={remotePersons}
      />

      {/* コントロールバー */}
      <RoomControls
        isConnected={isConnected}
        isConnecting={isConnecting || isMediaLoading}
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isVideoPublishing={isVideoPublishing}
        isAudioPublishing={isAudioPublishing}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
      />
    </div>
  );
}

// ----------------------------------------------------------------
// Export (SkyWayProvider でラップ)
// ----------------------------------------------------------------

interface RoomPageClientProps {
  roomName: string;
  initialToken: string;
}

export function RoomPageClient({ roomName, initialToken }: RoomPageClientProps) {
  return (
    <SkyWayProvider token={initialToken}>
      <RoomInner roomName={roomName} />
    </SkyWayProvider>
  );
}
