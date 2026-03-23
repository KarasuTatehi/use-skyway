import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRoomCore } from "./useRoomCore";

const { mockUseSkywayContext, findOrCreateMock } = vi.hoisted(() => ({
  mockUseSkywayContext: vi.fn(),
  findOrCreateMock: vi.fn(),
}));

vi.mock("@skyway-sdk/room", () => ({
  SkyWayRoom: {
    FindOrCreate: findOrCreateMock,
  },
}));

vi.mock("./useSkywayContext", () => ({
  useSkywayContext: () => mockUseSkywayContext(),
}));

describe("useRoomCore transparency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSkywayContext.mockReturnValue({ skywayContext: { id: "ctx" } });
  });

  it("forwards roomInit and joinOptions to SDK APIs", async () => {
    const roomInit = { name: "room-a", type: "p2p" as const };
    const joinOptions = { name: "alice", metadata: "meta-a" };

    const localMember = {
      id: "local-1",
      leave: vi.fn().mockResolvedValue(undefined),
    };
    const join = vi.fn().mockResolvedValue(localMember);
    const fakeRoom = {
      id: "room-id",
      members: [],
      join,
      close: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    findOrCreateMock.mockResolvedValue(fakeRoom);

    const { result } = renderHook(() =>
      useRoomCore({
        roomInit,
        joinOptions,
      })
    );

    await act(async () => {
      await result.current.join();
    });

    expect(findOrCreateMock).toHaveBeenCalledWith({ id: "ctx" }, roomInit);
    expect(join).toHaveBeenCalledWith(joinOptions);
  });

  it("join override options take precedence over default joinOptions", async () => {
    const roomInit = { name: "room-b" };
    const defaultJoinOptions = { name: "alice", metadata: "default" };
    const override = { name: "bob", metadata: "override" };

    const join = vi.fn().mockResolvedValue({
      id: "local-2",
      leave: vi.fn().mockResolvedValue(undefined),
    });
    const fakeRoom = {
      id: "room-id-2",
      members: [],
      join,
      close: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    findOrCreateMock.mockResolvedValue(fakeRoom);

    const { result } = renderHook(() =>
      useRoomCore({
        roomInit,
        joinOptions: defaultJoinOptions,
      })
    );

    await act(async () => {
      await result.current.join(override);
    });

    expect(join).toHaveBeenCalledWith(override);
  });
});
