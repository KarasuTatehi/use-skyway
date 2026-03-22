"use client";

import type {
  LocalAudioStream,
  LocalRoomMember,
  LocalVideoStream,
  PublicationOptions,
  RoomPublication,
} from "@skyway-sdk/room";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { UseLocalPersonOptions, UseLocalPersonReturn } from "../types";

// ----------------------------------------------------------------
// State / Reducer
// ----------------------------------------------------------------

interface LocalPersonState {
  videoStream: LocalVideoStream | null;
  audioStream: LocalAudioStream | null;
  videoPublicationId: string | null;
  audioPublicationId: string | null;
  publications: RoomPublication[];
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoPublishing: boolean;
  isAudioPublishing: boolean;
}

type LocalPersonAction =
  | {
      type: "VIDEO_PUBLISHED";
      stream: LocalVideoStream;
      publicationId: string;
      publications: RoomPublication[];
    }
  | {
      type: "AUDIO_PUBLISHED";
      stream: LocalAudioStream;
      publicationId: string;
      publications: RoomPublication[];
    }
  | {
      type: "VIDEO_UNPUBLISHED";
      publications: RoomPublication[];
    }
  | {
      type: "AUDIO_UNPUBLISHED";
      publications: RoomPublication[];
    }
  | { type: "TOGGLE_VIDEO" }
  | { type: "TOGGLE_AUDIO" }
  | { type: "RESET" };

const initialState: LocalPersonState = {
  videoStream: null,
  audioStream: null,
  videoPublicationId: null,
  audioPublicationId: null,
  publications: [],
  isVideoEnabled: true,
  isAudioEnabled: true,
  isVideoPublishing: false,
  isAudioPublishing: false,
};

function localPersonReducer(state: LocalPersonState, action: LocalPersonAction): LocalPersonState {
  switch (action.type) {
    case "VIDEO_PUBLISHED":
      return {
        ...state,
        videoStream: action.stream,
        videoPublicationId: action.publicationId,
        publications: action.publications,
        isVideoPublishing: true,
      };
    case "AUDIO_PUBLISHED":
      return {
        ...state,
        audioStream: action.stream,
        audioPublicationId: action.publicationId,
        publications: action.publications,
        isAudioPublishing: true,
      };
    case "VIDEO_UNPUBLISHED":
      return {
        ...state,
        videoStream: null,
        videoPublicationId: null,
        publications: action.publications,
        isVideoPublishing: false,
      };
    case "AUDIO_UNPUBLISHED":
      return {
        ...state,
        audioStream: null,
        audioPublicationId: null,
        publications: action.publications,
        isAudioPublishing: false,
      };
    case "TOGGLE_VIDEO":
      return { ...state, isVideoEnabled: !state.isVideoEnabled };
    case "TOGGLE_AUDIO":
      return { ...state, isAudioEnabled: !state.isAudioEnabled };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

/**
 * ローカルメンバーのストリーム発行・メディア制御を管理するフック。
 *
 * ```tsx
 * const { publishVideo, publishAudio, toggleVideo, toggleAudio } =
 *   useLocalPerson({ localMember });
 * ```
 */
export function useLocalPerson({ localMember }: UseLocalPersonOptions): UseLocalPersonReturn {
  const [state, dispatch] = useReducer(localPersonReducer, initialState);

  // ストリームの enable/disable は副作用として処理
  const prevVideoEnabledRef = useRef(state.isVideoEnabled);
  const prevAudioEnabledRef = useRef(state.isAudioEnabled);
  // アンマウント時クリーンアップに使う ref（state をキャプチャしない）
  const currentVideoStreamRef = useRef<import("@skyway-sdk/room").LocalVideoStream | null>(null);
  const currentAudioStreamRef = useRef<import("@skyway-sdk/room").LocalAudioStream | null>(null);
  currentVideoStreamRef.current = state.videoStream;
  currentAudioStreamRef.current = state.audioStream;

  // ビデオ有効/無効の切り替えを実際のストリームへ反映
  useEffect(() => {
    if (!state.videoStream) return;
    if (prevVideoEnabledRef.current !== state.isVideoEnabled) {
      void state.videoStream.setEnabled(state.isVideoEnabled);
      prevVideoEnabledRef.current = state.isVideoEnabled;
    }
  }, [state.isVideoEnabled, state.videoStream]);

  // オーディオ有効/無効の切り替えを実際のストリームへ反映
  useEffect(() => {
    if (!state.audioStream) return;
    if (prevAudioEnabledRef.current !== state.isAudioEnabled) {
      void state.audioStream.setEnabled(state.isAudioEnabled);
      prevAudioEnabledRef.current = state.isAudioEnabled;
    }
  }, [state.isAudioEnabled, state.audioStream]);

  const publishVideo = useCallback(
    async (stream: LocalVideoStream, options?: PublicationOptions): Promise<void> => {
      if (!localMember) return;
      const publication = await localMember.publish(stream, options);
      dispatch({
        type: "VIDEO_PUBLISHED",
        stream,
        publicationId: publication.id,
        publications: localMember.publications,
      });
    },
    [localMember]
  );

  const publishAudio = useCallback(
    async (stream: LocalAudioStream, options?: PublicationOptions): Promise<void> => {
      if (!localMember) return;
      const publication = await localMember.publish(stream, options);
      dispatch({
        type: "AUDIO_PUBLISHED",
        stream,
        publicationId: publication.id,
        publications: localMember.publications,
      });
    },
    [localMember]
  );

  const unpublishVideo = useCallback(async (): Promise<void> => {
    if (!localMember || !state.videoPublicationId) return;
    await localMember.unpublish(state.videoPublicationId);
    state.videoStream?.release();
    dispatch({
      type: "VIDEO_UNPUBLISHED",
      publications: localMember.publications,
    });
  }, [localMember, state.videoPublicationId, state.videoStream]);

  const unpublishAudio = useCallback(async (): Promise<void> => {
    if (!localMember || !state.audioPublicationId) return;
    await localMember.unpublish(state.audioPublicationId);
    state.audioStream?.release();
    dispatch({
      type: "AUDIO_UNPUBLISHED",
      publications: localMember.publications,
    });
  }, [localMember, state.audioPublicationId, state.audioStream]);

  const toggleVideo = useCallback(() => {
    dispatch({ type: "TOGGLE_VIDEO" });
  }, []);

  const toggleAudio = useCallback(() => {
    dispatch({ type: "TOGGLE_AUDIO" });
  }, []);

  // アンマウント時にストリームを解放
  useEffect(() => {
    return () => {
      currentVideoStreamRef.current?.release();
      currentAudioStreamRef.current?.release();
    };
  }, []);

  return {
    videoStream: state.videoStream,
    audioStream: state.audioStream,
    publications: state.publications,
    isVideoEnabled: state.isVideoEnabled,
    isAudioEnabled: state.isAudioEnabled,
    isVideoPublishing: state.isVideoPublishing,
    isAudioPublishing: state.isAudioPublishing,
    publishVideo,
    publishAudio,
    unpublishVideo,
    unpublishAudio,
    toggleVideo,
    toggleAudio,
  };
}
