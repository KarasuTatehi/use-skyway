"use client";

import { SkyWayContext } from "@skyway-sdk/room";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { SkyWayContextValue, SkyWayProviderProps } from "../types";

// ----------------------------------------------------------------
// Context
// ----------------------------------------------------------------

const SkywayReactContext = createContext<SkyWayContextValue | null>(null);
SkywayReactContext.displayName = "SkyWayContext";

// ----------------------------------------------------------------
// Provider
// ----------------------------------------------------------------

/**
 * SkyWay 認証コンテキストを初期化し、子コンポーネントへ提供するプロバイダー。
 *
 * ```tsx
 * <SkyWayProvider token={myToken}>
 *   <App />
 * </SkyWayProvider>
 * ```
 */
export function SkyWayProvider({
  token,
  children,
  config,
  onTokenExpired,
  onError,
}: SkyWayProviderProps) {
  const [skywayContext, setSkywayContext] = useState<SkyWayContext | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // cleanup 用 ref（クロージャ内の最新インスタンスを参照）
  const contextRef = useRef<SkyWayContext | null>(null);
  // トークン更新リマインダーのリスナーを安定させるため ref で管理
  const tokenRef = useRef(token);
  const configRef = useRef(config);
  const onErrorRef = useRef(onError);
  const onTokenExpiredRef = useRef(onTokenExpired);
  tokenRef.current = token;
  configRef.current = config;
  onErrorRef.current = onError;
  onTokenExpiredRef.current = onTokenExpired;

  useEffect(() => {
    let disposed = false;

    const handleError = (err: unknown) => {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      onErrorRef.current?.(normalized);
    };

    const resolveToken = async (): Promise<string> => {
      const t = tokenRef.current;
      return typeof t === "function" ? t() : t;
    };

    const init = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        const resolvedToken = await resolveToken();
        if (disposed) return;

        const ctx = await SkyWayContext.Create(resolvedToken, configRef.current);
        if (disposed) {
          ctx.dispose();
          return;
        }

        // トークン期限切れ時に自動更新を試みる
        ctx.onTokenExpired.add(async () => {
          onTokenExpiredRef.current?.();
          try {
            const newToken = await resolveToken();
            ctx.updateAuthToken(newToken);
          } catch (e) {
            handleError(e);
          }
        });

        // トークン更新リマインダー（期限の 30 秒前頃に発火）
        ctx.onTokenUpdateReminder.add(async () => {
          try {
            const newToken = await resolveToken();
            ctx.updateAuthToken(newToken);
          } catch (e) {
            handleError(e);
          }
        });

        contextRef.current = ctx;
        setSkywayContext(ctx);
      } catch (e) {
        if (!disposed) handleError(e);
      } finally {
        if (!disposed) setIsInitializing(false);
      }
    };

    void init();

    return () => {
      disposed = true;
      contextRef.current?.dispose();
      contextRef.current = null;
      setSkywayContext(null);
    };
  }, []);

  return (
    <SkywayReactContext.Provider value={{ skywayContext, isInitializing, error }}>
      {children}
    </SkywayReactContext.Provider>
  );
}

// ----------------------------------------------------------------
// Raw Context export（useSkywayContext から利用）
// ----------------------------------------------------------------
export { SkywayReactContext };

/**
 * SkyWay コンテキスト値を直接取得するフック（内部用）。
 * SkyWayProvider の外で呼ぶと null を返します。
 */
export function useSkyWayContextRaw(): SkyWayContextValue | null {
  return useContext(SkywayReactContext);
}
