import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ name?: string }>;
}

/**
 * /room?name=xxx → /room/xxx にリダイレクト
 */
export default async function RoomIndexPage({ searchParams }: Props) {
  const { name } = await searchParams;
  const roomName = name?.trim();
  if (roomName) {
    redirect(`/room/${encodeURIComponent(roomName)}`);
  }
  redirect("/");
}
