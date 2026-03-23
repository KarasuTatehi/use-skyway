"use client";

import { type LocalRoomMember, SkyWayRoom } from "@skyway-sdk/room";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AnyRoom, UseRoomCoreOptions, UseRoomCoreReturn } from "../types";
import { useSkywayContext } from "./useSkywayContext";

interface RoomCoreState {
  room: AnyRoom | null;
  localMember: LocalRoomMember | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
}

type RoomCoreAction =
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; room: AnyRoom; localMember: LocalRoomMember }
  | { type: "LEFT"; room: AnyRoom | null }
  | { type: "ERROR"; error: Error }
  | { type: "DISPOSED" };

const initialState: RoomCoreState = {
  room: null,
  localMember: null,
  isConnecting: false,
  isConnected: false,
  error: null,
};

function roomCoreReducer(state: RoomCoreState, action: RoomCoreAction): RoomCoreState {
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
    case "LEFT":
      return {
        ...state,
        room: action.room,
        localMember: null,
        isConnecting: false,
        isConnected: false,
      };
    case "ERROR":
      return { ...state, isConnecting: false, error: action.error };
    case "DISPOSED":
      return initialState;
    default:
      return state;
  }
}

/**
 * SkyWay SDK の room API を透過的に扱うコアフック。
 *
 * - room 作成: SkyWayRoom.FindOrCreate(roomInit)
 * - 参加: room.join(joinOptions)
 * - 退出: localMember.leave()
 * - 明示操作: close(), dispose()
 */
export function useRoomCore({
  roomInit,
  autoJoin = false,
  joinOptions,
}: UseRoomCoreOptions): UseRoomCoreReturn {
  const { skywayContext } = useSkywayContext();
  const [state, dispatch] = useReducer(roomCoreReducer, initialState);

  const roomRef = useRef<AnyRoom | null>(null);
  const localMemberRef = useRef<LocalRoomMember | null>(null);
  const isJoiningRef = useRef(false);
  const isJoinedRef = useRef(false);

  const roomInitRef = useRef(roomInit);
  const joinOptionsRef = useRef(joinOptions);
  roomInitRef.current = roomInit;
  joinOptionsRef.current = joinOptions;

  const join = useCallback(
    async (overrideOptions?: import("@skyway-sdk/room").RoomMemberInit) => {
      if (!skywayContext || isJoiningRef.current || isJoinedRef.current) return;

      isJoiningRef.current = true;
      dispatch({ type: "CONNECTING" });
      try {
        const room = await SkyWayRoom.FindOrCreate(skywayContext, roomInitRef.current);
        roomRef.current = room;

        const opts = overrideOptions ?? joinOptionsRef.current;
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
    [skywayContext]
  );

  const leave = useCallback(async () => {
    try {
      await localMemberRef.current?.leave();
      localMemberRef.current = null;
      isJoinedRef.current = false;
      dispatch({ type: "LEFT", room: roomRef.current });
    } catch (e) {
      console.error("[useRoomCore] Error while leaving room:", e);
    }
  }, []);

  const close = useCallback(async () => {
    try {
      await roomRef.current?.close();
    } catch (e) {
      console.error("[useRoomCore] Error while closing room:", e);
    }
  }, []);

  const dispose = useCallback(async () => {
    try {
      await roomRef.current?.dispose();
      roomRef.current = null;
      localMemberRef.current = null;
      isJoinedRef.current = false;
      dispatch({ type: "DISPOSED" });
    } catch (e) {
      console.error("[useRoomCore] Error while disposing room:", e);
    }
  }, []);

  useEffect(() => {
    if (autoJoin && skywayContext) {
      void join();
    }
  }, [autoJoin, skywayContext, join]);

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      const localMember = localMemberRef.current;
      roomRef.current = null;
      localMemberRef.current = null;
      isJoinedRef.current = false;

      void (async () => {
        await localMember?.leave().catch(console.error);
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
    close,
    dispose,
  };
}
