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
 *   // roomType 未指定で default Room
 *   autoJoin: true,
 * });
 * ```
 */
export function useRoom({
  roomName,
  roomType,
  autoJoin = false,
  joinOptions,
  closeOnEmpty = true,
}: UseRoomOptions): UseRoomReturn {
  const { skywayContext } = useSkywayContext();
  const [state, dispatch] = useReducer(roomReducer, initialState);

  // アンマウント時のクリーンアップ用に ref でインスタンスを保持
  const roomRef = useRef<AnyRoom | null>(null);
  const localMemberRef = useRef<LocalRoomMember | null>(null);

  // join の重複実行を ref で防ぐ（state を deps にしないための安全弁）
  const isJoiningRef = useRef(false);
  const isJoinedRef = useRef(false);
  const isClosingRef = useRef(false);

  // roomName / roomType / joinOptions / closeOnEmpty は ref 経由で最新値を読む
  const roomNameRef = useRef(roomName);
  const roomTypeRef = useRef(roomType);
  const joinOptionsRef = useRef(joinOptions);
  const closeOnEmptyRef = useRef(closeOnEmpty);
  roomNameRef.current = roomName;
  roomTypeRef.current = roomType;
  joinOptionsRef.current = joinOptions;
  closeOnEmptyRef.current = closeOnEmpty;

  const join = useCallback(
    async (overrideOptions?: { name?: string; metadata?: string }) => {
      if (!skywayContext || isJoiningRef.current || isJoinedRef.current) return;

      isJoiningRef.current = true;
      dispatch({ type: "CONNECTING" });
      try {
        const currentRoomType = roomTypeRef.current;
        const roomInit =
          currentRoomType && currentRoomType !== "default"
            ? { type: currentRoomType, name: roomNameRef.current }
            : { name: roomNameRef.current };
        const room = await SkyWayRoom.FindOrCreate(skywayContext, roomInit);
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
      // leave() 前に判定 — leave() 後は SDK がメンバーリストを更新するタイミングが不確定
      const shouldClose = closeOnEmptyRef.current && room != null && room.members.length <= 1;

      await localMemberRef.current?.leave();
      localMemberRef.current = null;

      if (shouldClose && room && !isClosingRef.current) {
        isClosingRef.current = true;
        await room.close().finally(() => {
          isClosingRef.current = false;
        });
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

  // 自分が最後の1人になった瞬間にもルームを自動 close する
  useEffect(() => {
    if (!closeOnEmpty || !state.room || !state.localMember) return;

    const room = state.room;
    const myMemberId = state.localMember.id;

    const closeIfOnlySelfRemains = async () => {
      if (isClosingRef.current) return;
      const includesMe = room.members.some((member) => member.id === myMemberId);
      if (!includesMe || room.members.length !== 1) return;

      isClosingRef.current = true;
      await room
        .close()
        .catch(console.error)
        .finally(() => {
          isClosingRef.current = false;
        });
    };

    const leftListener = room.onMemberLeft.add(() => {
      void closeIfOnlySelfRemains();
    });
    const listChangedListener = room.onMemberListChanged.add(() => {
      void closeIfOnlySelfRemains();
    });

    return () => {
      leftListener.removeListener();
      listChangedListener.removeListener();
    };
  }, [closeOnEmpty, state.room, state.localMember]);

  // アンマウント時にリソースを解放
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      const localMember = localMemberRef.current;
      // leave() 前に判定（同期）
      const shouldClose = closeOnEmptyRef.current && room != null && room.members.length <= 1;
      roomRef.current = null;
      localMemberRef.current = null;

      // 非同期クリーンアップを正しくチェーン
      void (async () => {
        await localMember?.leave().catch(console.error);
        if (shouldClose && room && !isClosingRef.current) {
          isClosingRef.current = true;
          await room
            .close()
            .catch(console.error)
            .finally(() => {
              isClosingRef.current = false;
            });
        }
        await room?.dispose().catch(console.error);
      })();
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
