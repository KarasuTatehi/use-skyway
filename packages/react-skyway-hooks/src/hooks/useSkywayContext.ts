"use client";

import { useContext } from "react";
import { SkywayReactContext } from "../context/SkyWayProvider";
import type { SkyWayContextValue } from "../types";

/**
 * SkyWayProvider が提供するコンテキスト値を取得するフック。
 *
 * SkyWayProvider の外側で呼び出された場合はエラーをスローします。
 *
 * ```tsx
 * const { skywayContext, isInitializing, error } = useSkywayContext();
 * ```
 */
export function useSkywayContext(): SkyWayContextValue {
  const ctx = useContext(SkywayReactContext);
  if (ctx === null) {
    throw new Error("[use-skyway] useSkywayContext must be used inside <SkyWayProvider>.");
  }
  return ctx;
}
