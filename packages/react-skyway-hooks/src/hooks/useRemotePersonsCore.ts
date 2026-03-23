"use client";

import type {
  LocalRoomMember,
  RemoteRoomMember,
  RoomMember,
  RoomPublication,
  RoomSubscription,
  SubscriptionOptions,
} from "@skyway-sdk/room";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnyRoom, UseRemotePersonsCoreOptions, UseRemotePersonsCoreReturn } from "../types";

function isRemoteRoomMember(member: RoomMember): member is RemoteRoomMember {
  return member.side === "remote";
}

export function useRemotePersonsCore({
  room,
  localMember,
  onMemberJoined,
  onMemberLeft,
}: UseRemotePersonsCoreOptions): UseRemotePersonsCoreReturn {
  const [remoteMembers, setRemoteMembers] = useState<RemoteRoomMember[]>([]);
  const [subscriptions, setSubscriptions] = useState<RoomSubscription[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const membersRef = useRef<Map<string, RemoteRoomMember>>(new Map());
  const subscriptionsRef = useRef<Map<string, RoomSubscription>>(new Map());
  const publicationListenerDisposersRef = useRef<Map<string, () => void>>(new Map());

  const onMemberJoinedRef = useRef(onMemberJoined);
  const onMemberLeftRef = useRef(onMemberLeft);
  onMemberJoinedRef.current = onMemberJoined;
  onMemberLeftRef.current = onMemberLeft;

  const syncStates = useCallback(() => {
    setRemoteMembers(Array.from(membersRef.current.values()));
    setSubscriptions(Array.from(subscriptionsRef.current.values()));
  }, []);

  const attachPublicationListener = useCallback(
    (member: RemoteRoomMember) => {
      const prevDispose = publicationListenerDisposersRef.current.get(member.id);
      prevDispose?.();

      const listener = member.onPublicationListChanged.add(() => {
        membersRef.current.set(member.id, member);
        syncStates();
      });
      publicationListenerDisposersRef.current.set(member.id, listener.removeListener);
    },
    [syncStates]
  );

  const subscribe = useCallback<UseRemotePersonsCoreReturn["subscribe"]>(
    async (publication: RoomPublication, options?: SubscriptionOptions) => {
      if (!localMember) return null;
      if (subscriptionsRef.current.has(publication.id)) {
        return subscriptionsRef.current.get(publication.id) ?? null;
      }

      setIsProcessing(true);
      setError(null);
      try {
        const { subscription } = await localMember.subscribe(publication.id, options);
        subscriptionsRef.current.set(publication.id, subscription);
        syncStates();
        return subscription;
      } catch (e) {
        const nextError = e instanceof Error ? e : new Error(String(e));
        setError(nextError);
        throw nextError;
      } finally {
        setIsProcessing(false);
      }
    },
    [localMember, syncStates]
  );

  const unsubscribe = useCallback<UseRemotePersonsCoreReturn["unsubscribe"]>(
    async (target) => {
      if (!localMember) return;

      setIsProcessing(true);
      setError(null);
      try {
        await localMember.unsubscribe(target);

        const targetSubscriptionId = typeof target === "string" ? target : target.id;
        for (const [publicationId, subscription] of subscriptionsRef.current.entries()) {
          if (subscription.id === targetSubscriptionId) {
            subscriptionsRef.current.delete(publicationId);
            break;
          }
        }
        syncStates();
      } catch (e) {
        const nextError = e instanceof Error ? e : new Error(String(e));
        setError(nextError);
        throw nextError;
      } finally {
        setIsProcessing(false);
      }
    },
    [localMember, syncStates]
  );

  useEffect(() => {
    if (!room || !localMember) {
      for (const dispose of publicationListenerDisposersRef.current.values()) {
        dispose();
      }
      publicationListenerDisposersRef.current.clear();
      membersRef.current.clear();
      subscriptionsRef.current.clear();
      syncStates();
      return;
    }

    for (const member of room.members) {
      if (!isRemoteRoomMember(member)) continue;
      membersRef.current.set(member.id, member);
      attachPublicationListener(member);
    }
    syncStates();

    const joinedListener = room.onMemberJoined.add(({ member }: { member: RoomMember }) => {
      if (!isRemoteRoomMember(member)) return;
      membersRef.current.set(member.id, member);
      onMemberJoinedRef.current?.(member);
      attachPublicationListener(member);
      syncStates();
    });

    const leftListener = room.onMemberLeft.add(({ member }: { member: RoomMember }) => {
      if (!isRemoteRoomMember(member)) return;
      membersRef.current.delete(member.id);
      onMemberLeftRef.current?.(member);

      const dispose = publicationListenerDisposersRef.current.get(member.id);
      dispose?.();
      publicationListenerDisposersRef.current.delete(member.id);

      for (const publication of member.publications) {
        subscriptionsRef.current.delete(publication.id);
      }
      syncStates();
    });

    return () => {
      joinedListener.removeListener();
      leftListener.removeListener();
      for (const dispose of publicationListenerDisposersRef.current.values()) {
        dispose();
      }
      publicationListenerDisposersRef.current.clear();
      membersRef.current.clear();
      subscriptionsRef.current.clear();
      syncStates();
    };
  }, [room, localMember, attachPublicationListener, syncStates]);

  return useMemo(
    () => ({
      remoteMembers,
      subscriptions,
      isProcessing,
      error,
      subscribe,
      unsubscribe,
    }),
    [remoteMembers, subscriptions, isProcessing, error, subscribe, unsubscribe]
  );
}
