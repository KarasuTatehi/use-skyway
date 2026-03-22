"use client";

import dynamic from "next/dynamic";

interface RoomPageClientLoaderProps {
  roomName: string;
  initialToken: string;
}

const DynamicRoomPageClient = dynamic(
  () => import("./RoomPageClient").then((mod) => mod.RoomPageClient),
  {
    ssr: false,
    loading: () => (
      <main
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "var(--color-text-muted)",
        }}
      >
        <p>ルームを読み込み中...</p>
      </main>
    ),
  }
);

export function RoomPageClientLoader({ roomName, initialToken }: RoomPageClientLoaderProps) {
  return <DynamicRoomPageClient roomName={roomName} initialToken={initialToken} />;
}
