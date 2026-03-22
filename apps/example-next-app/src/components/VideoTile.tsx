"use client";

import type {
  LocalVideoStream,
  RemoteAudioStream,
  RemoteVideoStream,
} from "@use-skyway/react-hooks";
import { useEffect, useRef } from "react";
import styles from "./VideoTile.module.css";

interface VideoTileProps {
  isLocal: boolean;
  displayName: string;
  /** LocalVideoStream | RemoteVideoStream | null */
  videoStream: LocalVideoStream | RemoteVideoStream | null;
  audioStream: RemoteAudioStream | null;
}

/**
 * 1参加者分のビデオ・オーディオを表示するタイルコンポーネント。
 *
 * - ローカル: <video> に LocalVideoStream.attach()
 * - リモート: <video> に RemoteVideoStream.attach() + Audio インスタンスに RemoteAudioStream.attach()
 */
export function VideoTile({ isLocal, displayName, videoStream, audioStream }: VideoTileProps) {
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

    audioStream.attach(audioRef.current);
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
}
