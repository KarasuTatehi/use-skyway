import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRemotePersonsCore } from "./useRemotePersonsCore";

function createEvent() {
  return {
    add: vi.fn().mockReturnValue({ removeListener: vi.fn() }),
  };
}

describe("useRemotePersonsCore transparency", () => {
  it("forwards subscribe publication id and options", async () => {
    const publication = { id: "pub-1", contentType: "video" };
    const subscribeOptions = { preferredEncodingId: "high" };
    const subscription = { id: "sub-1", publication };

    const localMember = {
      subscribe: vi.fn().mockResolvedValue({ subscription }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    const remoteMember = {
      id: "remote-1",
      side: "remote",
      publications: [publication],
      onPublicationListChanged: createEvent(),
    };

    const room = {
      members: [remoteMember],
      onMemberJoined: createEvent(),
      onMemberLeft: createEvent(),
    };

    const { result } = renderHook(() =>
      useRemotePersonsCore({
        room: room as never,
        localMember: localMember as never,
      })
    );

    await act(async () => {
      await result.current.subscribe(publication as never, subscribeOptions as never);
    });

    expect(localMember.subscribe).toHaveBeenCalledWith("pub-1", subscribeOptions);
  });

  it("forwards unsubscribe target", async () => {
    const publication = { id: "pub-2", contentType: "audio" };
    const subscription = { id: "sub-2", publication };

    const localMember = {
      subscribe: vi.fn().mockResolvedValue({ subscription }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    const remoteMember = {
      id: "remote-2",
      side: "remote",
      publications: [publication],
      onPublicationListChanged: createEvent(),
    };

    const room = {
      members: [remoteMember],
      onMemberJoined: createEvent(),
      onMemberLeft: createEvent(),
    };

    const { result } = renderHook(() =>
      useRemotePersonsCore({
        room: room as never,
        localMember: localMember as never,
      })
    );

    await act(async () => {
      await result.current.unsubscribe("sub-2");
    });

    expect(localMember.unsubscribe).toHaveBeenCalledWith("sub-2");
  });
});
