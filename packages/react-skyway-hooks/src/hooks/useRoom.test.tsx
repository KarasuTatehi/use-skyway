import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRoom } from "./useRoom";

const { useRoomCoreMock } = vi.hoisted(() => ({
  useRoomCoreMock: vi.fn(),
}));

vi.mock("./useRoomCore", () => ({
  useRoomCore: (options: unknown) => useRoomCoreMock(options),
}));

describe("useRoom compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards room options and join override to useRoomCore", async () => {
    const joinCore = vi.fn().mockResolvedValue(undefined);

    useRoomCoreMock.mockReturnValue({
      room: null,
      localMember: null,
      isConnecting: false,
      isConnected: false,
      error: null,
      join: joinCore,
      leave: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() =>
      useRoom({
        roomName: "room-a",
        roomType: "p2p",
        autoJoin: true,
        joinOptions: { name: "alice" },
      })
    );

    const override = { name: "bob", metadata: "meta-b" };
    await act(async () => {
      await result.current.join(override);
    });

    expect(useRoomCoreMock).toHaveBeenCalledWith({
      roomInit: { name: "room-a", type: "p2p" },
      autoJoin: true,
      joinOptions: { name: "alice" },
    });
    expect(joinCore).toHaveBeenCalledWith(override);
  });

  it("does not run close/dispose on rerender when dependencies change", () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const dispose = vi.fn().mockResolvedValue(undefined);

    let currentRoom = {
      id: "room-1",
      members: [{ id: "local-1" }],
      onMemberLeft: { add: vi.fn().mockReturnValue({ removeListener: vi.fn() }) },
      onMemberListChanged: { add: vi.fn().mockReturnValue({ removeListener: vi.fn() }) },
    };
    let currentLocalMember = { id: "local-1" };

    useRoomCoreMock.mockImplementation(() => ({
      room: currentRoom,
      localMember: currentLocalMember,
      isConnecting: false,
      isConnected: true,
      error: null,
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      close,
      dispose,
    }));

    const { rerender } = renderHook(
      ({ roomName }: { roomName: string }) => useRoom({ roomName, closeOnEmpty: true }),
      {
        initialProps: { roomName: "room-a" },
      }
    );

    currentRoom = {
      id: "room-2",
      members: [{ id: "local-1" }],
      onMemberLeft: { add: vi.fn().mockReturnValue({ removeListener: vi.fn() }) },
      onMemberListChanged: { add: vi.fn().mockReturnValue({ removeListener: vi.fn() }) },
    };
    currentLocalMember = { id: "local-1" };

    rerender({ roomName: "room-b" });

    expect(close).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
  });

  it("runs close/dispose only on unmount", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const dispose = vi.fn().mockResolvedValue(undefined);

    const room = {
      id: "room-1",
      members: [{ id: "local-1" }],
      onMemberLeft: { add: vi.fn().mockReturnValue({ removeListener: vi.fn() }) },
      onMemberListChanged: { add: vi.fn().mockReturnValue({ removeListener: vi.fn() }) },
    };
    const localMember = { id: "local-1" };

    useRoomCoreMock.mockReturnValue({
      room,
      localMember,
      isConnecting: false,
      isConnected: true,
      error: null,
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      close,
      dispose,
    });

    const { unmount } = renderHook(() => useRoom({ roomName: "room-a", closeOnEmpty: true }));

    await act(async () => {
      unmount();
      await Promise.resolve();
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
