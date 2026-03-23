import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaStreamCore } from "./useMediaStreamCore";

const { createMicCamMock, createDisplayMock } = vi.hoisted(() => ({
  createMicCamMock: vi.fn(),
  createDisplayMock: vi.fn(),
}));

vi.mock("@skyway-sdk/room", () => ({
  SkyWayStreamFactory: {
    createMicrophoneAudioAndCameraStream: createMicCamMock,
    createDisplayStreams: createDisplayMock,
  },
}));

describe("useMediaStreamCore transparency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards camera/microphone options to SkyWayStreamFactory", async () => {
    const video = { id: "video-1", release: vi.fn() };
    const audio = { id: "audio-1", release: vi.fn() };
    const options = {
      video: { width: 1280, height: 720 },
      audio: { sampleRate: 48000 },
    };

    createMicCamMock.mockResolvedValue({ video, audio });

    const { result } = renderHook(() => useMediaStreamCore());

    await act(async () => {
      await result.current.requestCameraAndMicrophone(options as never);
    });

    expect(createMicCamMock).toHaveBeenCalledWith(options);
    expect(result.current.localVideoStream).toBe(video);
    expect(result.current.localAudioStream).toBe(audio);
  });

  it("forwards display options and can release acquired streams", async () => {
    const video = { id: "video-2", release: vi.fn() };
    const audio = { id: "audio-2", release: vi.fn() };
    const displayVideo = { id: "display-1", release: vi.fn() };

    createMicCamMock.mockResolvedValue({ video, audio });
    createDisplayMock.mockResolvedValue({ video: displayVideo });

    const { result } = renderHook(() => useMediaStreamCore());

    await act(async () => {
      await result.current.requestCameraAndMicrophone();
    });

    await act(async () => {
      await result.current.requestDisplay({ audio: false });
    });

    expect(createDisplayMock).toHaveBeenCalledWith({ audio: false });

    act(() => {
      result.current.stopMediaStream();
    });

    expect(video.release).toHaveBeenCalledTimes(1);
    expect(audio.release).toHaveBeenCalledTimes(1);
    expect(result.current.localVideoStream).toBeNull();
    expect(result.current.localAudioStream).toBeNull();
  });
});
