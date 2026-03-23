import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ name?: string; mode?: string }>;
}

/**
 * /room?name=xxx → /room/xxx にリダイレクト
 */
export default async function RoomIndexPage({ searchParams }: Props) {
  const { name, mode } = await searchParams;
  const roomName = name?.trim();
  const roomMode = mode === "core" ? "core" : "compat";
  if (roomName) {
    redirect(`/room/${encodeURIComponent(roomName)}?mode=${roomMode}`);
  }
  redirect("/");
}
