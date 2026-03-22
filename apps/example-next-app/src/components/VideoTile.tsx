"use client";

import type {
  LocalAudioStream,
  LocalVideoStream,
  RemoteAudioStream,
  RemoteVideoStream,
} from "@use-skyway/react-hooks";
import { memo, useEffect, useRef } from "react";
import styles from "./VideoTile.module.css";

interface VideoTileProps {
  isLocal: boolean;
  displayName: string;
  /** LocalVideoStream | RemoteVideoStream | null */
  videoStream: LocalVideoStream | RemoteVideoStream | null;
  audioStream: LocalAudioStream | RemoteAudioStream | null;
}

/**
 * 1参加者分のビデオ・オーディオを表示するタイルコンポーネント。
 *
 * - ローカル: <video> に LocalVideoStream.attach()
 * - リモート: <video> に RemoteVideoStream.attach() + Audio インスタンスに RemoteAudioStream.attach()
 */
export const VideoTile = memo(function VideoTile({
  isLocal,
  displayName,
  videoStream,
  audioStream,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ビデオストリームをアタッチ
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoStream) return;

    videoStream.attach(el);
    return () => {
      videoStream.detach();
    };
  }, [videoStream]);

  // オーディオストリームをアタッチ（リモートのみ）
  useEffect(() => {
    if (!audioStream) return;
    if (audioRef.current === null) {
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
    }

    const audioEl = audioRef.current;
    if (!audioEl) return;

    audioStream.attach(audioEl);
    void audioEl.play().catch((error) => {
      console.warn("[VideoTile] audio play was blocked or failed:", error);
    });

    return () => {
      audioStream.detach();
    };
  }, [audioStream]);

  return (
    <div className={styles.tile}>
      {videoStream ? (
        <video ref={videoRef} className={styles.video} autoPlay playsInline muted={isLocal} />
      ) : (
        <div className={styles.noVideo}>
          <span className={styles.avatar}>{displayName[0]?.toUpperCase() ?? "?"}</span>
        </div>
      )}

      <div className={styles.nameTag}>
        <span className={styles.name}>{displayName}</span>
        {isLocal && <span className={styles.localBadge}>あなた</span>}
      </div>
    </div>
  );
});
