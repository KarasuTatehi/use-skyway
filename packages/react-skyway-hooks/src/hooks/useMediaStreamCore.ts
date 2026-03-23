"use client";

import {
  type LocalAudioStream,
  type LocalVideoStream,
  SkyWayStreamFactory,
} from "@skyway-sdk/room";
import { useCallback, useRef, useState } from "react";
import type { UseMediaStreamCoreReturn } from "../types";

export function useMediaStreamCore(): UseMediaStreamCoreReturn {
  const [localVideoStream, setLocalVideoStream] = useState<LocalVideoStream | null>(null);
  const [localAudioStream, setLocalAudioStream] = useState<LocalAudioStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

  const requestCameraAndMicrophone = useCallback<
    UseMediaStreamCoreReturn["requestCameraAndMicrophone"]
  >(
    async (options) => {
      setIsLoading(true);
      setError(null);

      stopMediaStream();

      try {
        const { video, audio } = await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream(
          options ?? {}
        );

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

  const requestDisplay = useCallback<UseMediaStreamCoreReturn["requestDisplay"]>(
    async (options = { audio: false }) => {
      setIsLoading(true);
      setError(null);

      try {
        const { video } = await SkyWayStreamFactory.createDisplayStreams(options);
        return video;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    localVideoStream,
    localAudioStream,
    isLoading,
    error,
    requestCameraAndMicrophone,
    requestDisplay,
    stopMediaStream,
  };
}
