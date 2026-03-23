import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLocalPersonCore } from "./useLocalPersonCore";

describe("useLocalPersonCore transparency", () => {
  it("forwards publish stream and options", async () => {
    const stream = { id: "stream-1" };
    const options = { type: "p2p" as const };
    const publication = { id: "pub-1" };

    const publish = vi.fn().mockResolvedValue(publication);
    const localMember = {
      publications: [publication],
      publish,
      unpublish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue({
        subscription: { id: "sub-1" },
        stream: { id: "remote-1" },
      }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      onPublicationListChanged: {
        add: vi.fn().mockReturnValue({ removeListener: vi.fn() }),
      },
    };

    const { result } = renderHook(() => useLocalPersonCore({ localMember: localMember as never }));

    await act(async () => {
      await result.current.publish(stream as never, options);
    });

    expect(publish).toHaveBeenCalledWith(stream, options);
  });

  it("forwards subscribe target and options", async () => {
    const publication = { id: "pub-2" };
    const subscribeOptions = { preferredEncodingId: "low" };

    const subscribe = vi.fn().mockResolvedValue({
      subscription: { id: "sub-2" },
      stream: { id: "remote-2" },
    });

    const localMember = {
      publications: [],
      publish: vi.fn().mockResolvedValue({ id: "pub-0" }),
      unpublish: vi.fn().mockResolvedValue(undefined),
      subscribe,
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      onPublicationListChanged: {
        add: vi.fn().mockReturnValue({ removeListener: vi.fn() }),
      },
    };

    const { result } = renderHook(() => useLocalPersonCore({ localMember: localMember as never }));

    await act(async () => {
      await result.current.subscribe(publication as never, subscribeOptions as never);
    });

    expect(subscribe).toHaveBeenCalledWith(publication, subscribeOptions);
  });
});
