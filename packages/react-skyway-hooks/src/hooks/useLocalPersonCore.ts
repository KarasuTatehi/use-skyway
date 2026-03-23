"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UseLocalPersonCoreOptions, UseLocalPersonCoreReturn } from "../types";

/**
 * LocalRoomMember の API を透過的に扱うコアフック。
 *
 * publish / unpublish / subscribe / unsubscribe を薄く委譲し、
 * publication リストを react state として同期します。
 */
export function useLocalPersonCore({
  localMember,
}: UseLocalPersonCoreOptions): UseLocalPersonCoreReturn {
  const [publications, setPublications] = useState<import("@skyway-sdk/room").RoomPublication[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!localMember) {
      setPublications([]);
      return;
    }

    setPublications([...localMember.publications]);
    const listener = localMember.onPublicationListChanged.add(() => {
      setPublications([...localMember.publications]);
    });

    return () => {
      listener.removeListener();
    };
  }, [localMember]);

  const publish = useCallback(
    async <
      T extends import("@skyway-sdk/room").LocalStream = import("@skyway-sdk/room").LocalStream,
    >(
      stream: T,
      options?: import("@skyway-sdk/room").RoomPublicationOptions
    ): Promise<import("@skyway-sdk/room").RoomPublication<T> | null> => {
      if (!localMember) return null;

      setIsProcessing(true);
      setError(null);
      try {
        const publication = await localMember.publish<T>(stream, options);
        setPublications([...localMember.publications]);
        return publication;
      } catch (e) {
        const nextError = e instanceof Error ? e : new Error(String(e));
        setError(nextError);
        throw nextError;
      } finally {
        setIsProcessing(false);
      }
    },
    [localMember]
  );

  const unpublish = useCallback<UseLocalPersonCoreReturn["unpublish"]>(
    async (target): Promise<void> => {
      if (!localMember) return;

      setIsProcessing(true);
      setError(null);
      try {
        await localMember.unpublish(target);
        setPublications([...localMember.publications]);
      } catch (e) {
        const nextError = e instanceof Error ? e : new Error(String(e));
        setError(nextError);
        throw nextError;
      } finally {
        setIsProcessing(false);
      }
    },
    [localMember]
  );

  const subscribe = useCallback<UseLocalPersonCoreReturn["subscribe"]>(
    async (target, options) => {
      if (!localMember) return null;

      setIsProcessing(true);
      setError(null);
      try {
        return await localMember.subscribe(target, options);
      } catch (e) {
        const nextError = e instanceof Error ? e : new Error(String(e));
        setError(nextError);
        throw nextError;
      } finally {
        setIsProcessing(false);
      }
    },
    [localMember]
  );

  const unsubscribe = useCallback<UseLocalPersonCoreReturn["unsubscribe"]>(
    async (target): Promise<void> => {
      if (!localMember) return;

      setIsProcessing(true);
      setError(null);
      try {
        await localMember.unsubscribe(target);
      } catch (e) {
        const nextError = e instanceof Error ? e : new Error(String(e));
        setError(nextError);
        throw nextError;
      } finally {
        setIsProcessing(false);
      }
    },
    [localMember]
  );

  return useMemo(
    () => ({
      localMember,
      publications,
      isProcessing,
      error,
      publish,
      unpublish,
      subscribe,
      unsubscribe,
    }),
    [localMember, publications, isProcessing, error, publish, unpublish, subscribe, unsubscribe]
  );
}
