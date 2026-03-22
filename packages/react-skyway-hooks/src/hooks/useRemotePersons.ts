"use client";

import type {
  LocalRoomMember,
  RemoteAudioStream,
  RemoteRoomMember,
  RemoteVideoStream,
  RoomMember,
  RoomPublication,
  RoomSubscription,
} from "@skyway-sdk/room";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RemotePersonState, UseRemotePersonsOptions, UseRemotePersonsReturn } from "../types";

// ----------------------------------------------------------------
// 内部ヘルパー
// ----------------------------------------------------------------

function isRemoteRoomMember(member: RoomMember): member is RemoteRoomMember {
  return member.side === "remote";
}

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
  autoSubscribe = true,
  onMemberJoined,
  onMemberLeft,
}: UseRemotePersonsOptions): UseRemotePersonsReturn {
  const [remotePersons, setRemotePersons] = useState<RemotePersonState[]>([]);

  // 購読 Map: publicationId -> RoomSubscription
  const subscriptionsRef = useRef<Map<string, RoomSubscription>>(new Map());
  // メンバー Map: memberId -> RemoteRoomMember
  const membersRef = useRef<Map<string, RemoteRoomMember>>(new Map());
  // メンバー単位の publication 監視解除関数
  const publicationListenerDisposersRef = useRef<Map<string, () => void>>(new Map());

  // コールバックを ref で安定させる
  const onMemberJoinedRef = useRef(onMemberJoined);
  const onMemberLeftRef = useRef(onMemberLeft);
  onMemberJoinedRef.current = onMemberJoined;
  onMemberLeftRef.current = onMemberLeft;

  const rebuildState = useCallback(() => {
    const persons = Array.from(membersRef.current.values()).map((member) =>
      buildRemotePersonState(member, subscriptionsRef.current)
    );
    setRemotePersons(persons);
  }, []);

  // 単一パブリケーションをサブスクライブ
  const subscribe = useCallback(
    async (publication: RoomPublication): Promise<void> => {
      if (!localMember) return;
      if (subscriptionsRef.current.has(publication.id)) return;
      if (publication.contentType === "data") return;

      try {
        const { subscription } = await localMember.subscribe(publication.id);
        subscriptionsRef.current.set(publication.id, subscription);
        rebuildState();
      } catch (e) {
        console.error("[useRemotePersons] subscribe error:", e);
      }
    },
    [localMember, rebuildState]
  );

  const unsubscribe = useCallback(
    async (subscriptionId: string): Promise<void> => {
      if (!localMember) return;
      try {
        await localMember.unsubscribe(subscriptionId);
        // Map から subscriptionId に対応するエントリを削除
        for (const [pubId, sub] of subscriptionsRef.current.entries()) {
          if (sub.id === subscriptionId) {
            subscriptionsRef.current.delete(pubId);
            break;
          }
        }
        rebuildState();
      } catch (e) {
        console.error("[useRemotePersons] unsubscribe error:", e);
      }
    },
    [localMember, rebuildState]
  );

  useEffect(() => {
    if (!room || !localMember) {
      membersRef.current.clear();
      subscriptionsRef.current.clear();
      for (const dispose of publicationListenerDisposersRef.current.values()) {
        dispose();
      }
      publicationListenerDisposersRef.current.clear();
      setRemotePersons([]);
      return;
    }

    // 既存メンバーをセット
    for (const member of room.members) {
      if (!isRemoteRoomMember(member)) continue;
      membersRef.current.set(member.id, member);

      const listener = member.onPublicationListChanged.add(() => {
        membersRef.current.set(member.id, member);
        if (autoSubscribe) {
          for (const pub of member.publications) {
            void subscribe(pub);
          }
        }
        rebuildState();
      });
      publicationListenerDisposersRef.current.set(member.id, listener.removeListener);
    }
    rebuildState();

    // --- メンバー入室 ---
    const handleMemberJoined = ({ member }: { member: RoomMember }) => {
      if (!isRemoteRoomMember(member)) return;
      membersRef.current.set(member.id, member);
      onMemberJoinedRef.current?.(member);

      // メンバーが既に持っているパブリケーションをサブスクライブ
      if (autoSubscribe) {
        for (const pub of member.publications) {
          void subscribe(pub);
        }
      }

      // 以後のパブリケーション変更を監視
      const listener = member.onPublicationListChanged.add(() => {
        membersRef.current.set(member.id, member);
        if (autoSubscribe) {
          for (const pub of member.publications) {
            void subscribe(pub);
          }
        }
        rebuildState();
      });
      publicationListenerDisposersRef.current.set(member.id, listener.removeListener);

      rebuildState();
    };

    // --- メンバー退室 ---
    const handleMemberLeft = ({ member }: { member: RoomMember }) => {
      if (!isRemoteRoomMember(member)) return;
      membersRef.current.delete(member.id);
      onMemberLeftRef.current?.(member);
      const dispose = publicationListenerDisposersRef.current.get(member.id);
      dispose?.();
      publicationListenerDisposersRef.current.delete(member.id);
      // そのメンバーの全サブスクリプションを削除
      for (const pub of member.publications) {
        subscriptionsRef.current.delete(pub.id);
      }
      rebuildState();
    };

    const joinedListener = room.onMemberJoined.add(handleMemberJoined);
    const leftListener = room.onMemberLeft.add(handleMemberLeft);

    // --- 既存メンバーのパブリケーションをサブスクライブ ---
    if (autoSubscribe) {
      for (const member of room.members) {
        if (!isRemoteRoomMember(member)) continue;
        for (const pub of member.publications) {
          void subscribe(pub);
        }
      }
    }

    return () => {
      joinedListener.removeListener();
      leftListener.removeListener();
      for (const dispose of publicationListenerDisposersRef.current.values()) {
        dispose();
      }
      publicationListenerDisposersRef.current.clear();
      membersRef.current.clear();
      subscriptionsRef.current.clear();
    };
  }, [room, localMember, autoSubscribe, subscribe, rebuildState]);

  return { remotePersons, subscribe, unsubscribe };
}
