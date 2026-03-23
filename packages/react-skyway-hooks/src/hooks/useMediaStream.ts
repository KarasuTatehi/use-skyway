"use client";

import { useCallback } from "react";
import type { UseMediaStreamOptions, UseMediaStreamReturn } from "../types";
import { useMediaStreamCore } from "./useMediaStreamCore";

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
  const {
    localVideoStream,
    localAudioStream,
    isLoading,
    error,
    requestCameraAndMicrophone,
    requestDisplay,
    stopMediaStream,
  } = useMediaStreamCore();

  const requestMediaStream = useCallback(
    async (
      options: UseMediaStreamOptions = {}
    ): Promise<{
      video: import("@skyway-sdk/room").LocalVideoStream | null;
      audio: import("@skyway-sdk/room").LocalAudioStream | null;
    }> => {
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

      return await requestCameraAndMicrophone({
        video: videoConstraints,
        audio: audioConstraints,
      });
    },
    [requestCameraAndMicrophone]
  );

  const requestScreenShare = useCallback(async () => {
    return await requestDisplay({ audio: false });
  }, [requestDisplay]);

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
