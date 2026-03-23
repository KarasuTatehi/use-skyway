"use client";

import { SkyWayContext } from "@skyway-sdk/room";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { SkyWayContextValue, SkyWayProviderCoreProps, SkyWayProviderProps } from "../types";

// ----------------------------------------------------------------
// Context
// ----------------------------------------------------------------

const SkyWayReactContext = createContext<SkyWayContextValue | null>(null);
SkyWayReactContext.displayName = "SkyWayContext";

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
  const [skyWayContext, setSkyWayContext] = useState<SkyWayContext | null>(null);
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
        setSkyWayContext(ctx);
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
      setSkyWayContext(null);
    };
  }, []);

  return (
    <SkyWayReactContext.Provider value={{ skyWayContext, isInitializing, error }}>
      {children}
    </SkyWayReactContext.Provider>
  );
}

// ================================================================
// Core版（手動トークン制御）
// ================================================================

/**
 * SkyWay 認証コンテキストを初期化し、子コンポーネントへ提供する Core プロバイダー。
 *
 * Compat版（SkyWayProvider）と異なり、トークンの自動更新は行いません。
 * トークン変更時は明示的にプロップを更新し、Context 再作成を促すか、
 * 手動で `skyWayContext.updateAuthToken(newToken)` を呼んでください。
 *
 * ```tsx
 * const [token, setToken] = useState(myInitialToken);
 *
 * const handleTokenRefresh = (newToken: string) => {
 *   setToken(newToken);
 * };
 *
 * return (
 *   <SkyWayProviderCore token={token}>
 *     <App onTokenRefresh={handleTokenRefresh} />
 *   </SkyWayProviderCore>
 * );
 * ```
 */
export function SkyWayProviderCore({ token, children, config, onError }: SkyWayProviderCoreProps) {
  const [skyWayContext, setSkyWayContext] = useState<SkyWayContext | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // cleanup 用 ref
  const contextRef = useRef<SkyWayContext | null>(null);
  // コールバックを ref で管理
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let disposed = false;

    const handleError = (err: unknown) => {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      onErrorRef.current?.(normalized);
    };

    const init = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        // Core版は token を直接使用（自動更新なし）
        const ctx = await SkyWayContext.Create(token, config);
        if (disposed) {
          ctx.dispose();
          return;
        }

        // Core版はリスナー登録をしない（手動制御）
        // トークン更新が必要な場合、ユーザーが以下を手動実行：
        // - token prop 変更 → Context 再作成
        // - または ctx.updateAuthToken(newToken) を直接呼び出し

        contextRef.current = ctx;
        setSkyWayContext(ctx);
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
      setSkyWayContext(null);
    };
  }, [token, config]);

  return (
    <SkyWayReactContext.Provider value={{ skyWayContext, isInitializing, error }}>
      {children}
    </SkyWayReactContext.Provider>
  );
}

// ----------------------------------------------------------------
// Raw Context export（useSkyWayContext から利用）
// ----------------------------------------------------------------
export { SkyWayReactContext };

/**
 * SkyWay コンテキスト値を直接取得するフック（内部用）。
 * SkyWayProvider の外で呼ぶと null を返します。
 */
export function useSkyWayContextRaw(): SkyWayContextValue | null {
  return useContext(SkyWayReactContext);
}
