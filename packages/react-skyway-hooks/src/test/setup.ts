class MockRTCPeerConnection {
  async getStats() {
    return new Map();
  }
}

(globalThis as unknown as { RTCPeerConnection?: unknown }).RTCPeerConnection =
  MockRTCPeerConnection;
