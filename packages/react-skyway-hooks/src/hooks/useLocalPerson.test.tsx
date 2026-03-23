import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalPerson } from "./useLocalPerson";

const { useLocalPersonCoreMock } = vi.hoisted(() => ({
  useLocalPersonCoreMock: vi.fn(),
}));

vi.mock("./useLocalPersonCore", () => ({
  useLocalPersonCore: (options: unknown) => useLocalPersonCoreMock(options),
}));

describe("useLocalPerson compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards publishVideo options to useLocalPersonCore.publish", async () => {
    const publication = { id: "pub-v-1" };
    const publishCore = vi.fn().mockResolvedValue(publication);
    const localMember = {
      publications: [publication],
    };
    const stream = {
      setEnabled: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    };

    useLocalPersonCoreMock.mockReturnValue({
      localMember,
      publications: localMember.publications,
      isProcessing: false,
      error: null,
      publish: publishCore,
      unpublish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(null),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHook(() => useLocalPerson({ localMember: localMember as never }));

    const options = { type: "p2p" as const };
    await act(async () => {
      await result.current.publishVideo(stream as never, options);
    });

    expect(publishCore).toHaveBeenCalledWith(stream, options);
    expect(result.current.isVideoPublishing).toBe(true);
  });
});
