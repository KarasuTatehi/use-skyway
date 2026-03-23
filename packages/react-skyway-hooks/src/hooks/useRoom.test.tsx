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
});
