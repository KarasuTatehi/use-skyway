import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoomPageClient } from "./RoomPageClient";

interface Props {
  params: Promise<{ roomName: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomName } = await params;
  return {
    title: `ルーム: ${decodeURIComponent(roomName)} | use-skyway`,
  };
}

/**
 * /room/[roomName] - Server Component
 *
 * ルーム名を受け取り、トークン取得 API を呼んで
 * クライアントコンポーネントへ渡す。
 */
export default async function RoomPage({ params }: Props) {
  const { roomName: encodedName } = await params;
  const roomName = decodeURIComponent(encodedName);

  if (!roomName || roomName.trim() === "") {
    redirect("/");
  }

  // 本番環境では認証済みユーザーのみにトークンを発行してください。
  // ここでは開発用に内部 API からトークンを取得します。
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/skyway-token`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "var(--color-text-muted)",
        }}
      >
        <p>トークンの取得に失敗しました。環境変数を確認してください。</p>
      </main>
    );
  }

  const { token } = (await res.json()) as { token: string };

  return <RoomPageClient roomName={roomName} initialToken={token} />;
}
