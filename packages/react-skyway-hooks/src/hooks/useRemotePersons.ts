"use client";

import type {
  RemoteAudioStream,
  RemoteRoomMember,
  RemoteVideoStream,
  RoomPublication,
  RoomSubscription,
} from "@skyway-sdk/room";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RemotePersonState, UseRemotePersonsOptions, UseRemotePersonsReturn } from "../types";
import { useRemotePersonsCore } from "./useRemotePersonsCore";

// ----------------------------------------------------------------
// 内部ヘルパー
// ----------------------------------------------------------------

function buildRemotePersonState(
  member: RemoteRoomMember,
  subscriptions: Map<string, RoomSubscription>
): RemotePersonState {
  let videoSubscription: RoomSubscription<RemoteVideoStream> | null = null;
  let audioSubscription: RoomSubscription<RemoteAudioStream> | null = null;

  for (const pub of member.publications) {
    const sub = subscriptions.get(pub.id);
    if (!sub) continue;
    if (pub.contentType === "video") {
      videoSubscription = sub as RoomSubscription<RemoteVideoStream>;
    } else if (pub.contentType === "audio") {
      audioSubscription = sub as RoomSubscription<RemoteAudioStream>;
    }
  }

  return {
    member,
    publications: member.publications,
    videoSubscription,
    audioSubscription,
  };
}

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

/**
 * リモート参加者の入退室とストリーム購読を管理するフック。
 *
 * `autoSubscribe: true`（デフォルト）の場合、
 * リモートメンバーが公開したすべてのストリームを自動的にサブスクライブします。
 *
 * ```tsx
 * const { remotePersons } = useRemotePersons({ room, localMember });
 * ```
 */
export function useRemotePersons({
  room,
  localMember,
  autoSubscribe = false,
  onMemberJoined,
  onMemberLeft,
}: UseRemotePersonsOptions): UseRemotePersonsReturn {
  const [remotePersons, setRemotePersons] = useState<RemotePersonState[]>([]);

  const {
    remoteMembers,
    subscriptions,
    subscribe: subscribeCore,
    unsubscribe: unsubscribeCore,
  } = useRemotePersonsCore({
    room,
    localMember,
    onMemberJoined,
    onMemberLeft,
  });

  const subscriptionsMap = useMemo(() => {
    const nextMap = new Map<string, RoomSubscription>();
    for (const sub of subscriptions) {
      nextMap.set(sub.publication.id, sub);
    }
    return nextMap;
  }, [subscriptions]);

  // 単一パブリケーションをサブスクライブ
  const subscribe = useCallback(
    async (publication: RoomPublication): Promise<void> => {
      if (!localMember) return;
      if (publication.contentType === "data") return;

      try {
        await subscribeCore(publication);
      } catch (e) {
        console.error("[useRemotePersons] subscribe error:", e);
      }
    },
    [localMember, subscribeCore]
  );

  const unsubscribe = useCallback(
    async (subscriptionId: string): Promise<void> => {
      if (!localMember) return;
      try {
        await unsubscribeCore(subscriptionId);
      } catch (e) {
        console.error("[useRemotePersons] unsubscribe error:", e);
      }
    },
    [localMember, unsubscribeCore]
  );

  useEffect(() => {
    if (!room || !localMember) {
      setRemotePersons([]);
      return;
    }

    // --- 既存メンバーのパブリケーションをサブスクライブ ---
    if (autoSubscribe) {
      for (const member of remoteMembers) {
        for (const pub of member.publications) {
          void subscribe(pub);
        }
      }
    }

    const persons = remoteMembers.map((member) => buildRemotePersonState(member, subscriptionsMap));
    setRemotePersons(persons);
  }, [room, localMember, autoSubscribe, subscribe, remoteMembers, subscriptionsMap]);

  return { remotePersons, subscribe, unsubscribe };
}
