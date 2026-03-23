"use client";

import type { RoomMemberInit } from "@skyway-sdk/room";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UseRoomOptions, UseRoomReturn } from "../types";
import { useRoomCore } from "./useRoomCore";

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
  closeOnEmpty = false,
}: UseRoomOptions): UseRoomReturn {
  const isClosingRef = useRef(false);

  const roomInit = useMemo(() => {
    return roomType && roomType !== "default"
      ? { type: roomType, name: roomName }
      : { name: roomName };
  }, [roomName, roomType]);

  const {
    room,
    localMember,
    isConnecting,
    isConnected,
    error,
    join: joinCore,
    leave: leaveCore,
    close,
    dispose,
  } = useRoomCore({ roomInit, autoJoin, joinOptions });

  const roomRef = useRef<import("../types").AnyRoom | null>(null);
  const localMemberRef = useRef<import("@skyway-sdk/room").LocalRoomMember | null>(null);
  const closeOnEmptyRef = useRef(closeOnEmpty);
  const closeRef = useRef(close);
  const disposeRef = useRef(dispose);

  roomRef.current = room;
  localMemberRef.current = localMember;
  closeOnEmptyRef.current = closeOnEmpty;
  closeRef.current = close;
  disposeRef.current = dispose;

  const join = useCallback(
    async (overrideOptions?: RoomMemberInit) => {
      await joinCore(overrideOptions);
    },
    [joinCore]
  );

  const leave = useCallback(async () => {
    try {
      const shouldClose =
        closeOnEmpty &&
        room != null &&
        localMember != null &&
        room.members.length <= 1 &&
        room.members.some((member) => member.id === localMember.id);

      await leaveCore();

      if (shouldClose && !isClosingRef.current) {
        isClosingRef.current = true;
        await close().finally(() => {
          isClosingRef.current = false;
        });
      }

      await dispose();
    } catch (e) {
      console.error("[useRoom] Error while leaving room:", e);
    }
  }, [closeOnEmpty, room, localMember, leaveCore, close, dispose]);

  // 自分が最後の1人になった瞬間にもルームを自動 close する
  useEffect(() => {
    if (!closeOnEmpty || !room || !localMember) return;

    const myMemberId = localMember.id;

    const closeIfOnlySelfRemains = async () => {
      if (isClosingRef.current) return;
      const includesMe = room.members.some((member) => member.id === myMemberId);
      if (!includesMe || room.members.length !== 1) return;

      isClosingRef.current = true;
      await close()
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
  }, [closeOnEmpty, room, localMember, close]);

  // アンマウント時にリソースを解放
  useEffect(() => {
    return () => {
      const latestRoom = roomRef.current;
      const latestLocalMember = localMemberRef.current;

      // leave() 前に判定（同期）
      const shouldClose =
        closeOnEmptyRef.current &&
        latestRoom != null &&
        latestLocalMember != null &&
        latestRoom.members.length <= 1 &&
        latestRoom.members.some((member) => member.id === latestLocalMember.id);

      // 非同期クリーンアップを正しくチェーン
      void (async () => {
        if (shouldClose && !isClosingRef.current) {
          isClosingRef.current = true;
          await closeRef
            .current()
            .catch(console.error)
            .finally(() => {
              isClosingRef.current = false;
            });
        }
        await disposeRef.current().catch(console.error);
      })();
    };
  }, []);

  return {
    room,
    localMember,
    isConnecting,
    isConnected,
    error,
    join,
    leave,
  };
}
