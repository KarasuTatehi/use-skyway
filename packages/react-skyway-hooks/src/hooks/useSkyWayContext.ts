"use client";

import { useContext } from "react";
import { SkyWayReactContext } from "../context/SkyWayProvider";
import type { SkyWayContextValue } from "../types";

/**
 * SkyWayProvider が提供するコンテキスト値を取得するフック。
 *
 * SkyWayProvider の外側で呼び出された場合はエラーをスローします。
 *
 * ```tsx
 * const { skyWayContext, isInitializing, error } = useSkyWayContext();
 * ```
 */
export function useSkyWayContext(): SkyWayContextValue {
  const ctx = useContext(SkyWayReactContext);
  if (ctx === null) {
    throw new Error("[use-skyway] useSkyWayContext must be used inside <SkyWayProvider>.");
  }
  return ctx;
}

/**
 * SkyWayProvider が提供するコンテキスト値を取得する Core フック。
 *
 * Compat 版と異なり、SkyWayProvider の外側で呼び出された場合は
 * エラーを投げずに null を返します。
 *
 * ```tsx
 * const ctx = useSkyWayContextCore();
 * if (ctx?.skyWayContext) {
 *   console.log(ctx.skyWayContext);
 * }
 * ```
 */
export function useSkyWayContextCore(): SkyWayContextValue | null {
  return useContext(SkyWayReactContext);
}
