import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaStream } from "./useMediaStream";

const { useMediaStreamCoreMock } = vi.hoisted(() => ({
  useMediaStreamCoreMock: vi.fn(),
}));

vi.mock("./useMediaStreamCore", () => ({
  useMediaStreamCore: () => useMediaStreamCoreMock(),
}));

describe("useMediaStream compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps device ids to media constraints and forwards to core", async () => {
    const requestCameraAndMicrophone = vi.fn().mockResolvedValue({ video: null, audio: null });

    useMediaStreamCoreMock.mockReturnValue({
      localVideoStream: null,
      localAudioStream: null,
      isLoading: false,
      error: null,
      requestCameraAndMicrophone,
      requestDisplay: vi.fn().mockResolvedValue({ video: null, audio: null }),
      stopMediaStream: vi.fn(),
    });

    const { result } = renderHook(() => useMediaStream());

    await act(async () => {
      await result.current.requestMediaStream({
        videoDeviceId: "video-device-1",
        audioDeviceId: "audio-device-1",
      });
    });

    expect(requestCameraAndMicrophone).toHaveBeenCalledWith({
      video: { deviceId: { exact: "video-device-1" } },
      audio: { deviceId: { exact: "audio-device-1" } },
    });
  });

  it("forwards requestScreenShare as display with audio false", async () => {
    const requestDisplay = vi.fn().mockResolvedValue({ video: null, audio: null });

    useMediaStreamCoreMock.mockReturnValue({
      localVideoStream: null,
      localAudioStream: null,
      isLoading: false,
      error: null,
      requestCameraAndMicrophone: vi.fn().mockResolvedValue({ video: null, audio: null }),
      requestDisplay,
      stopMediaStream: vi.fn(),
    });

    const { result } = renderHook(() => useMediaStream());

    await act(async () => {
      await result.current.requestScreenShare();
    });

    expect(requestDisplay).toHaveBeenCalledWith({ audio: false });
  });
});
