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
});
