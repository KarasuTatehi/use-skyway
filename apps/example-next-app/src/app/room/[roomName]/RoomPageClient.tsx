"use client";

import { RoomControls } from "@/components/RoomControls";
import { VideoGrid } from "@/components/VideoGrid";
import {
  type AnyRoom,
  type LocalAudioStream,
  type LocalRoomMember,
  type LocalVideoStream,
  type RemotePersonState,
  type RoomPublication,
  type RoomSubscription,
  SkyWayProvider,
  useLocalPerson,
  useLocalPersonCore,
  useMediaStream,
  useMediaStreamCore,
  useRemotePersons,
  useRemotePersonsCore,
  useRoom,
  useRoomCore,
  useWebRTCStats,
  useWebRTCStatsCore,
} from "@use-skyway/react-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./room.module.css";

// ----------------------------------------------------------------
// Inner (コンテキスト内で動作するコンポーネント)
// ----------------------------------------------------------------

interface RoomInnerProps {
  roomName: string;
}

type RoomMode = "compat" | "core";

function buildRemotePersonsFromCore(
  remoteMembers: import("@use-skyway/react-hooks").RemoteRoomMember[],
  subscriptions: RoomSubscription[]
): RemotePersonState[] {
  const subByPublicationId = new Map<string, RoomSubscription>();
  for (const sub of subscriptions) {
    subByPublicationId.set(sub.publication.id, sub);
  }

  return remoteMembers.map((member) => {
    let videoSubscription: RemotePersonState["videoSubscription"] = null;
    let audioSubscription: RemotePersonState["audioSubscription"] = null;

    for (const publication of member.publications) {
      const subscription = subByPublicationId.get(publication.id);
      if (!subscription) continue;
      if (publication.contentType === "video") {
        videoSubscription = subscription as RemotePersonState["videoSubscription"];
      }
      if (publication.contentType === "audio") {
        audioSubscription = subscription as RemotePersonState["audioSubscription"];
      }
    }

    return {
      member,
      publications: member.publications,
      videoSubscription,
      audioSubscription,
    };
  });
}

function isAlreadyPublishedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("alreadyPublishedStream");
}

function RoomFrame({
  roomName,
  mode,
  room,
  localMember,
  remotePersons,
  localVideoStream,
  localAudioStream,
  isConnected,
  isConnecting,
  isMediaLoading,
  isVideoEnabled,
  isAudioEnabled,
  isVideoPublishing,
  isAudioPublishing,
  stats,
  error,
  onJoin,
  onLeave,
  onToggleVideo,
  onToggleAudio,
}: {
  roomName: string;
  mode: RoomMode;
  room: AnyRoom | null;
  localMember: LocalRoomMember | null;
  remotePersons: RemotePersonState[];
  localVideoStream: LocalVideoStream | null;
  localAudioStream: LocalAudioStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  isMediaLoading: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoPublishing: boolean;
  isAudioPublishing: boolean;
  stats: { rttMs: number | null; packetLossRate: number | null } | null;
  error: Error | null;
  onJoin(): Promise<void>;
  onLeave(): Promise<void>;
  onToggleVideo(): void;
  onToggleAudio(): void;
}) {
  const router = useRouter();
  const [isSelfMonitorEnabled, setIsSelfMonitorEnabled] = useState(true);
  const toggleSelfMonitor = useCallback(() => setIsSelfMonitorEnabled((prev) => !prev), []);

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
          <span className={styles.modeBadge}>{mode === "core" ? "Core" : "Compat"}</span>
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
        localVideoStream={isVideoPublishing ? localVideoStream : null}
        localAudioStream={isAudioPublishing && isSelfMonitorEnabled ? localAudioStream : null}
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
        isSelfMonitorEnabled={isSelfMonitorEnabled}
        onJoin={() => void onJoin()}
        onLeave={() => void onLeave()}
        onToggleVideo={onToggleVideo}
        onToggleAudio={onToggleAudio}
        onToggleSelfMonitor={toggleSelfMonitor}
      />
    </div>
  );
}

function RoomInnerCompat({ roomName }: RoomInnerProps) {
  const router = useRouter();
  const videoPublishRequestedRef = useRef(false);
  const audioPublishRequestedRef = useRef(false);

  const { room, localMember, isConnecting, isConnected, error, join, leave } = useRoom({
    roomName,
  });

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

  const { remotePersons } = useRemotePersons({ room, localMember, autoSubscribe: true });

  const {
    localVideoStream,
    localAudioStream,
    requestMediaStream,
    isLoading: isMediaLoading,
  } = useMediaStream();

  const { stats } = useWebRTCStats(room, localMember, { intervalMs: 5000, enabled: true });

  const handleJoin = useCallback(async () => {
    videoPublishRequestedRef.current = false;
    audioPublishRequestedRef.current = false;
    await requestMediaStream();
    await join();
  }, [requestMediaStream, join]);

  useEffect(() => {
    if (!localMember) return;

    if (localVideoStream && !isVideoPublishing && !videoPublishRequestedRef.current) {
      videoPublishRequestedRef.current = true;
      void publishVideo(localVideoStream, { type: "p2p" }).catch((publishError) => {
        if (!isAlreadyPublishedError(publishError)) {
          console.error("Failed to publish video stream:", publishError);
          videoPublishRequestedRef.current = false;
        }
      });
    }
    if (localAudioStream && !isAudioPublishing && !audioPublishRequestedRef.current) {
      audioPublishRequestedRef.current = true;
      void publishAudio(localAudioStream, { type: "p2p" }).catch((publishError) => {
        if (!isAlreadyPublishedError(publishError)) {
          console.error("Failed to publish audio stream:", publishError);
          audioPublishRequestedRef.current = false;
        }
      });
    }
  }, [
    localMember,
    localVideoStream,
    localAudioStream,
    isVideoPublishing,
    isAudioPublishing,
    publishVideo,
    publishAudio,
  ]);

  useEffect(() => {
    if (!localVideoStream) videoPublishRequestedRef.current = false;
  }, [localVideoStream]);

  useEffect(() => {
    if (!localAudioStream) audioPublishRequestedRef.current = false;
  }, [localAudioStream]);

  const handleLeave = useCallback(async () => {
    await unpublishVideo();
    await unpublishAudio();
    await leave();
    router.push("/");
  }, [unpublishVideo, unpublishAudio, leave, router]);

  return (
    <RoomFrame
      roomName={roomName}
      mode="compat"
      room={room}
      localMember={localMember}
      remotePersons={remotePersons}
      localVideoStream={videoStream}
      localAudioStream={audioStream}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isMediaLoading={isMediaLoading}
      isVideoEnabled={isVideoEnabled}
      isAudioEnabled={isAudioEnabled}
      isVideoPublishing={isVideoPublishing}
      isAudioPublishing={isAudioPublishing}
      stats={stats}
      error={error}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onToggleVideo={toggleVideo}
      onToggleAudio={toggleAudio}
    />
  );
}

function RoomInnerCore({ roomName }: RoomInnerProps) {
  const router = useRouter();
  const videoPublishRequestedRef = useRef(false);
  const audioPublishRequestedRef = useRef(false);
  const [videoPublicationId, setVideoPublicationId] = useState<string | null>(null);
  const [audioPublicationId, setAudioPublicationId] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const { room, localMember, isConnecting, isConnected, error, join, leave, dispose } = useRoomCore(
    {
      roomInit: { name: roomName },
    }
  );
  const { publish, unpublish } = useLocalPersonCore({ localMember });
  const { remoteMembers, subscriptions, subscribe } = useRemotePersonsCore({ room, localMember });
  const {
    localVideoStream,
    localAudioStream,
    requestCameraAndMicrophone,
    stopMediaStream,
    isLoading: isMediaLoading,
  } = useMediaStreamCore();
  const { stats } = useWebRTCStatsCore({ room, intervalMs: 5000 });

  const remotePersons = useMemo(
    () => buildRemotePersonsFromCore(remoteMembers, subscriptions),
    [remoteMembers, subscriptions]
  );

  useEffect(() => {
    if (!localMember) return;
    for (const member of remoteMembers) {
      for (const publication of member.publications) {
        if (publication.contentType === "data") continue;
        void subscribe(publication).catch((subscribeError) => {
          if (!String(subscribeError).includes("alreadySubscribed")) {
            console.error("Failed to subscribe publication:", subscribeError);
          }
        });
      }
    }
  }, [localMember, remoteMembers, subscribe]);

  const handleJoin = useCallback(async () => {
    videoPublishRequestedRef.current = false;
    audioPublishRequestedRef.current = false;
    setVideoPublicationId(null);
    setAudioPublicationId(null);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);

    await requestCameraAndMicrophone();
    await join();
  }, [requestCameraAndMicrophone, join]);

  useEffect(() => {
    if (!localMember) return;

    if (localVideoStream && !videoPublicationId && !videoPublishRequestedRef.current) {
      videoPublishRequestedRef.current = true;
      void publish(localVideoStream, { type: "p2p" })
        .then((publication) => {
          if (!publication) return;
          setVideoPublicationId(publication.id);
        })
        .catch((publishError) => {
          if (!isAlreadyPublishedError(publishError)) {
            console.error("Failed to publish video stream:", publishError);
            videoPublishRequestedRef.current = false;
          }
        });
    }

    if (localAudioStream && !audioPublicationId && !audioPublishRequestedRef.current) {
      audioPublishRequestedRef.current = true;
      void publish(localAudioStream, { type: "p2p" })
        .then((publication) => {
          if (!publication) return;
          setAudioPublicationId(publication.id);
        })
        .catch((publishError) => {
          if (!isAlreadyPublishedError(publishError)) {
            console.error("Failed to publish audio stream:", publishError);
            audioPublishRequestedRef.current = false;
          }
        });
    }
  }, [
    localMember,
    localVideoStream,
    localAudioStream,
    videoPublicationId,
    audioPublicationId,
    publish,
  ]);

  useEffect(() => {
    if (!localVideoStream) videoPublishRequestedRef.current = false;
  }, [localVideoStream]);

  useEffect(() => {
    if (!localAudioStream) audioPublishRequestedRef.current = false;
  }, [localAudioStream]);

  const handleLeave = useCallback(async () => {
    if (videoPublicationId) {
      await unpublish(videoPublicationId).catch(console.error);
      setVideoPublicationId(null);
    }
    if (audioPublicationId) {
      await unpublish(audioPublicationId).catch(console.error);
      setAudioPublicationId(null);
    }
    stopMediaStream();
    await leave();
    await dispose();
    router.push("/");
  }, [videoPublicationId, audioPublicationId, unpublish, stopMediaStream, leave, dispose, router]);

  const toggleVideo = useCallback(() => {
    if (!localVideoStream) return;
    const next = !isVideoEnabled;
    setIsVideoEnabled(next);
    void localVideoStream.setEnabled(next);
  }, [localVideoStream, isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    if (!localAudioStream) return;
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    void localAudioStream.setEnabled(next);
  }, [localAudioStream, isAudioEnabled]);

  return (
    <RoomFrame
      roomName={roomName}
      mode="core"
      room={room}
      localMember={localMember}
      remotePersons={remotePersons}
      localVideoStream={localVideoStream}
      localAudioStream={localAudioStream}
      isConnected={isConnected}
      isConnecting={isConnecting}
      isMediaLoading={isMediaLoading}
      isVideoEnabled={isVideoEnabled}
      isAudioEnabled={isAudioEnabled}
      isVideoPublishing={videoPublicationId != null}
      isAudioPublishing={audioPublicationId != null}
      stats={stats}
      error={error}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onToggleVideo={toggleVideo}
      onToggleAudio={toggleAudio}
    />
  );
}

// ----------------------------------------------------------------
// Export (SkyWayProvider でラップ)
// ----------------------------------------------------------------

interface RoomPageClientProps {
  roomName: string;
  initialToken: string;
  mode: RoomMode;
}

export function RoomPageClient({ roomName, initialToken, mode }: RoomPageClientProps) {
  return (
    <SkyWayProvider token={initialToken}>
      {mode === "core" ? (
        <RoomInnerCore roomName={roomName} />
      ) : (
        <RoomInnerCompat roomName={roomName} />
      )}
    </SkyWayProvider>
  );
}
