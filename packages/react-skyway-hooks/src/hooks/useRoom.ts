"use client";

import { type LocalRoomMember, SkyWayRoom } from "@skyway-sdk/room";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AnyRoom, UseRoomOptions, UseRoomReturn } from "../types";
import { useSkywayContext } from "./useSkywayContext";

// ----------------------------------------------------------------
// State / Reducer
// ----------------------------------------------------------------

interface RoomState {
  room: AnyRoom | null;
  localMember: LocalRoomMember | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
}

type RoomAction =
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; room: AnyRoom; localMember: LocalRoomMember }
  | { type: "ERROR"; error: Error }
  | { type: "DISCONNECTED" };

const initialState: RoomState = {
  room: null,
  localMember: null,
  isConnecting: false,
  isConnected: false,
  error: null,
};

function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "CONNECTING":
      return { ...state, isConnecting: true, error: null };
    case "CONNECTED":
      return {
        room: action.room,
        localMember: action.localMember,
        isConnecting: false,
        isConnected: true,
        error: null,
      };
    case "ERROR":
      return { ...state, isConnecting: false, error: action.error };
    case "DISCONNECTED":
      return initialState;
    default:
      return state;
  }
}

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

/**
 * SkyWay ルームの参加・退出を管理するフック。
 *
 * ```tsx
 * const { room, localMember, isConnected, join, leave } = useRoom({
 *   roomName: "my-room",
 *   roomType: "p2p",
 *   autoJoin: true,
 * });
 * ```
 */
export function useRoom({
  roomName,
  roomType = "p2p",
  autoJoin = false,
  joinOptions,
}: UseRoomOptions): UseRoomReturn {
  const { skywayContext } = useSkywayContext();
  const [state, dispatch] = useReducer(roomReducer, initialState);

  // アンマウント時のクリーンアップ用に ref でインスタンスを保持
  const roomRef = useRef<AnyRoom | null>(null);
  const localMemberRef = useRef<LocalRoomMember | null>(null);

  // join の重複実行を ref で防ぐ（state を deps にしないための安全弁）
  const isJoiningRef = useRef(false);
  const isJoinedRef = useRef(false);

  // roomName / roomType / joinOptions は ref 経由で最新値を読む
  const roomNameRef = useRef(roomName);
  const roomTypeRef = useRef(roomType);
  const joinOptionsRef = useRef(joinOptions);
  roomNameRef.current = roomName;
  roomTypeRef.current = roomType;
  joinOptionsRef.current = joinOptions;

  const join = useCallback(
    async (overrideOptions?: { name?: string; metadata?: string }) => {
      if (!skywayContext || isJoiningRef.current || isJoinedRef.current) return;

      isJoiningRef.current = true;
      dispatch({ type: "CONNECTING" });
      try {
        const room = await SkyWayRoom.FindOrCreate(skywayContext, {
          type: roomTypeRef.current,
          name: roomNameRef.current,
        });
        roomRef.current = room;

        const opts = overrideOptions ?? joinOptionsRef.current;
        // P2P/SFU で join の戻り値の型が異なるが、両方 LocalRoomMember を返す
        const localMember = (await room.join(opts)) as LocalRoomMember;
        localMemberRef.current = localMember;

        isJoiningRef.current = false;
        isJoinedRef.current = true;
        dispatch({ type: "CONNECTED", room, localMember });
      } catch (e) {
        isJoiningRef.current = false;
        dispatch({
          type: "ERROR",
          error: e instanceof Error ? e : new Error(String(e)),
        });
      }
    },
    // skywayContext のみに依存 — roomName/roomType/joinOptions は ref 経由で読む
    [skywayContext]
  );

  const leave = useCallback(async () => {
    try {
      const room = roomRef.current;
      await localMemberRef.current?.leave();
      localMemberRef.current = null;

      // 自分が最後のメンバーだった場合はルームを永続的にclose
      if (room && room.members.length === 0) {
        await room.close();
      }

      await room?.dispose();
      roomRef.current = null;
      isJoinedRef.current = false;
      dispatch({ type: "DISCONNECTED" });
    } catch (e) {
      console.error("[useRoom] Error while leaving room:", e);
    }
  }, []);

  // autoJoin: SkyWayContext が準備できたらルームへ参加
  useEffect(() => {
    if (autoJoin && skywayContext) {
      void join();
    }
  }, [autoJoin, skywayContext, join]);

  // アンマウント時にリソースを解放
  useEffect(() => {
    return () => {
      void localMemberRef.current?.leave().catch(console.error);
      localMemberRef.current = null;
      void roomRef.current?.dispose().catch(console.error);
      roomRef.current = null;
    };
  }, []);

  return {
    room: state.room,
    localMember: state.localMember,
    isConnecting: state.isConnecting,
    isConnected: state.isConnected,
    error: state.error,
    join,
    leave,
  };
}
