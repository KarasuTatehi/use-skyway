"use client";

import {
  type LocalAudioStream,
  type LocalVideoStream,
  SkyWayStreamFactory,
} from "@skyway-sdk/room";
import { useCallback, useRef, useState } from "react";
import type { UseMediaStreamOptions, UseMediaStreamReturn } from "../types";

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

/**
 * SkyWayStreamFactory を使ってカメラ・マイク・画面共有ストリームを
 * 管理する汎用フック。
 *
 * ```tsx
 * const { localVideoStream, localAudioStream, requestMediaStream } =
 *   useMediaStream();
 *
 * // カメラ・マイク取得
 * await requestMediaStream();
 *
 * // デバイス指定
 * await requestMediaStream({ videoDeviceId: "abc123" });
 * ```
 */
export function useMediaStream(): UseMediaStreamReturn {
  const [localVideoStream, setLocalVideoStream] = useState<LocalVideoStream | null>(null);
  const [localAudioStream, setLocalAudioStream] = useState<LocalAudioStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // アンマウント時のクリーンアップ用
  const videoRef = useRef<LocalVideoStream | null>(null);
  const audioRef = useRef<LocalAudioStream | null>(null);

  const stopMediaStream = useCallback(() => {
    videoRef.current?.release();
    videoRef.current = null;
    audioRef.current?.release();
    audioRef.current = null;
    setLocalVideoStream(null);
    setLocalAudioStream(null);
  }, []);

  const requestMediaStream = useCallback(
    async (
      options: UseMediaStreamOptions = {}
    ): Promise<{
      video: LocalVideoStream | null;
      audio: LocalAudioStream | null;
    }> => {
      setIsLoading(true);
      setError(null);

      // 既存ストリームを解放
      stopMediaStream();

      try {
        const videoConstraints = options.videoDeviceId
          ? { deviceId: { exact: options.videoDeviceId } }
          : options.videoConstraints === true || options.videoConstraints === false
            ? undefined
            : options.videoConstraints;

        const audioConstraints = options.audioDeviceId
          ? { deviceId: { exact: options.audioDeviceId } }
          : options.audioConstraints === true || options.audioConstraints === false
            ? undefined
            : options.audioConstraints;

        const { video, audio } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream({
          video: videoConstraints,
          audio: audioConstraints,
        });

        videoRef.current = video;
        audioRef.current = audio;
        setLocalVideoStream(video);
        setLocalAudioStream(audio);

        return { video, audio };
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return { video: null, audio: null };
      } finally {
        setIsLoading(false);
      }
    },
    [stopMediaStream]
  );

  const requestScreenShare = useCallback(async (): Promise<LocalVideoStream | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { video } = await SkyWayStreamFactory.createDisplayStreams({
        audio: false,
      });
      return video;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    localVideoStream,
    localAudioStream,
    isLoading,
    error,
    requestMediaStream,
    stopMediaStream,
    requestScreenShare,
  };
}
