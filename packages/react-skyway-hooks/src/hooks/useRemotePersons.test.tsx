import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRemotePersons } from "./useRemotePersons";

const { useRemotePersonsCoreMock } = vi.hoisted(() => ({
  useRemotePersonsCoreMock: vi.fn(),
}));

vi.mock("./useRemotePersonsCore", () => ({
  useRemotePersonsCore: (options: unknown) => useRemotePersonsCoreMock(options),
}));

describe("useRemotePersons compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards subscribe calls to useRemotePersonsCore for media publications", async () => {
    const subscribeCore = vi.fn().mockResolvedValue({ id: "sub-1" });
    const room = { id: "room-1" };
    const localMember = { id: "local-1" };
    const publication = { id: "pub-1", contentType: "video" };

    useRemotePersonsCoreMock.mockReturnValue({
      remoteMembers: [],
      subscriptions: [],
      isProcessing: false,
      error: null,
      subscribe: subscribeCore,
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() =>
      useRemotePersons({
        room: room as never,
        localMember: localMember as never,
      })
    );

    await act(async () => {
      await result.current.subscribe(publication as never);
    });

    expect(subscribeCore).toHaveBeenCalledWith(publication);
  });

  it("does not forward subscribe for data publications", async () => {
    const subscribeCore = vi.fn().mockResolvedValue({ id: "sub-2" });
    const publication = { id: "pub-data-1", contentType: "data" };
    const room = { id: "room-2" };
    const localMember = { id: "local-2" };

    useRemotePersonsCoreMock.mockReturnValue({
      remoteMembers: [],
      subscriptions: [],
      isProcessing: false,
      error: null,
      subscribe: subscribeCore,
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() =>
      useRemotePersons({
        room: room as never,
        localMember: localMember as never,
      })
    );

    await act(async () => {
      await result.current.subscribe(publication as never);
    });

    expect(subscribeCore).not.toHaveBeenCalled();
  });

  it("does not auto subscribe by default", async () => {
    const subscribeCore = vi.fn().mockResolvedValue({ id: "sub-auto-default" });
    const room = { id: "room-3" };
    const localMember = { id: "local-3" };

    useRemotePersonsCoreMock.mockReturnValue({
      remoteMembers: [
        {
          id: "remote-1",
          publications: [{ id: "pub-video-1", contentType: "video" }],
        },
      ],
      subscriptions: [],
      isProcessing: false,
      error: null,
      subscribe: subscribeCore,
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });

    renderHook(() =>
      useRemotePersons({
        room: room as never,
        localMember: localMember as never,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(subscribeCore).not.toHaveBeenCalled();
  });

  it("auto subscribes when autoSubscribe is true", async () => {
    const subscribeCore = vi.fn().mockResolvedValue({ id: "sub-auto-true" });
    const room = { id: "room-4" };
    const localMember = { id: "local-4" };
    const publication = { id: "pub-video-2", contentType: "video" };

    useRemotePersonsCoreMock.mockReturnValue({
      remoteMembers: [{ id: "remote-2", publications: [publication] }],
      subscriptions: [],
      isProcessing: false,
      error: null,
      subscribe: subscribeCore,
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });

    renderHook(() =>
      useRemotePersons({
        room: room as never,
        localMember: localMember as never,
        autoSubscribe: true,
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(subscribeCore).toHaveBeenCalledWith(publication);
  });
});
