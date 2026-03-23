/**
 * @use-skyway/react-hooks 公開型定義
 * SkyWay SDK 同梱の型を参照し、各フックの入出力型を定義します。
 */

// Re-export SDK types for consumers
export type {
  ContentType,
  ContextConfig,
  LocalAudioStream,
  LocalP2PRoomMember,
  LocalRoomMember,
  LocalSFURoomMember,
  LocalVideoStream,
  P2PRoom,
  PublicationOptions,
  Room,
  RemoteAudioStream,
  RemoteRoomMember,
  RemoteVideoStream,
  RoomInit,
  RoomPublication,
  RoomSubscription,
  RoomType,
  SFURoom,
  Stream,
} from "@skyway-sdk/room";

/** 後方互換: 既存API名を維持するための型エイリアス */
export type AnyRoom =
  | import("@skyway-sdk/room").Room
  | import("@skyway-sdk/room").P2PRoom
  | import("@skyway-sdk/room").SFURoom;
/** 後方互換: 既存API名を維持するための型エイリアス */
export type SkyWayContextConfig = import("@skyway-sdk/room").ContextConfig;
/** SkyWay SDK 実型に合わせた制約型 */
export type AudioConstraints = import("@skyway-sdk/room").AudioMediaTrackConstraints;
/** SkyWay SDK 実型に合わせた制約型 */
export type VideoConstraints = import("@skyway-sdk/room").VideoMediaTrackConstraints;

// ----------------------------------------------------------------
// Provider
// ----------------------------------------------------------------

/** SkyWayProvider に渡す props */
export interface SkyWayProviderProps {
  /**
   * SkyWay 認証トークン。
   * 文字列として直接渡すか、非同期関数でトークンを取得できます。
   * 関数の場合、トークン期限切れ時に再呼び出しされます。
   */
  token: string | (() => Promise<string>);
  children: React.ReactNode;
  /** SkyWayContext の設定 */
  config?: SkyWayContextConfig;
  /** トークン期限切れ時のコールバック */
  onTokenExpired?: () => void;
  /** エラー発生時のコールバック */
  onError?: (error: Error) => void;
}

/** SkyWayProvider が提供するコンテキスト値 */
export interface SkyWayContextValue {
  /** SkyWayContext インスタンス（初期化前は null）*/
  skywayContext: import("@skyway-sdk/room").SkyWayContext | null;
  /** 初期化中フラグ */
  isInitializing: boolean;
  /** 初期化エラー */
  error: Error | null;
}

// ----------------------------------------------------------------
// useRoom
// ----------------------------------------------------------------

export interface UseRoomOptions {
  /** ルーム名 */
  roomName: string;
  /** ルームタイプ（デフォルト: "default"。未指定時は type を渡さない）*/
  roomType?: import("@skyway-sdk/room").RoomType;
  /** マウント時に自動的にルームに参加するか（デフォルト: false）*/
  autoJoin?: boolean;
  /** join() に渡すオプション */
  joinOptions?: import("@skyway-sdk/room").RoomMemberInit;
  /**
   * 自分が最後のメンバーとして退出した際に room.close() を呼ぶか（デフォルト: true）。
   * false にするとルームを残したまま退出できます。
   */
  closeOnEmpty?: boolean;
}

export interface UseRoomReturn {
  room: AnyRoom | null;
  localMember: import("@skyway-sdk/room").LocalRoomMember | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
  join(options?: import("@skyway-sdk/room").RoomMemberInit): Promise<void>;
  leave(): Promise<void>;
}

export interface UseRoomCoreOptions {
  /** SkyWayRoom.FindOrCreate に渡す初期化オプション（透過） */
  roomInit: import("@skyway-sdk/room").RoomInit;
  /** マウント時に自動で join() を呼ぶか */
  autoJoin?: boolean;
  /** join() に渡すオプション（透過） */
  joinOptions?: import("@skyway-sdk/room").RoomMemberInit;
}

export interface UseRoomCoreReturn {
  room: AnyRoom | null;
  localMember: import("@skyway-sdk/room").LocalRoomMember | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
  join(options?: import("@skyway-sdk/room").RoomMemberInit): Promise<void>;
  leave(): Promise<void>;
  close(): Promise<void>;
  dispose(): Promise<void>;
}

// ----------------------------------------------------------------
// useLocalPerson
// ----------------------------------------------------------------

export interface UseLocalPersonOptions {
  localMember: import("@skyway-sdk/room").LocalRoomMember | null;
}

export interface UseLocalPersonCoreOptions {
  localMember: import("@skyway-sdk/room").LocalRoomMember | null;
}

export interface UseLocalPersonCoreReturn {
  localMember: import("@skyway-sdk/room").LocalRoomMember | null;
  publications: import("@skyway-sdk/room").RoomPublication[];
  isProcessing: boolean;
  error: Error | null;
  publish<
    T extends import("@skyway-sdk/room").LocalStream = import("@skyway-sdk/room").LocalStream,
  >(
    stream: T,
    options?: import("@skyway-sdk/room").RoomPublicationOptions
  ): Promise<import("@skyway-sdk/room").RoomPublication<T> | null>;
  unpublish(target: string | import("@skyway-sdk/room").RoomPublication): Promise<void>;
  subscribe<
    T extends
      | import("@skyway-sdk/room").RemoteVideoStream
      | import("@skyway-sdk/room").RemoteAudioStream
      | import("@skyway-sdk/room").RemoteDataStream,
  >(
    target: string | import("@skyway-sdk/room").RoomPublication,
    options?: import("@skyway-sdk/room").SubscriptionOptions
  ): Promise<{ subscription: import("@skyway-sdk/room").RoomSubscription<T>; stream: T } | null>;
  unsubscribe(target: string | import("@skyway-sdk/room").RoomSubscription): Promise<void>;
}

export interface UseLocalPersonReturn {
  /** 発行中のビデオストリーム */
  videoStream: import("@skyway-sdk/room").LocalVideoStream | null;
  /** 発行中のオーディオストリーム */
  audioStream: import("@skyway-sdk/room").LocalAudioStream | null;
  /** 現在のパブリケーション一覧 */
  publications: import("@skyway-sdk/room").RoomPublication[];
  /** ビデオ有効フラグ */
  isVideoEnabled: boolean;
  /** オーディオ有効フラグ */
  isAudioEnabled: boolean;
  /** ビデオ発行中フラグ */
  isVideoPublishing: boolean;
  /** オーディオ発行中フラグ */
  isAudioPublishing: boolean;
  /** ビデオストリームを発行する */
  publishVideo(
    stream: import("@skyway-sdk/room").LocalVideoStream,
    options?: import("@skyway-sdk/room").PublicationOptions
  ): Promise<void>;
  /** オーディオストリームを発行する */
  publishAudio(
    stream: import("@skyway-sdk/room").LocalAudioStream,
    options?: import("@skyway-sdk/room").PublicationOptions
  ): Promise<void>;
  /** ビデオ発行を停止する */
  unpublishVideo(): Promise<void>;
  /** オーディオ発行を停止する */
  unpublishAudio(): Promise<void>;
  /** ビデオの有効/無効を切り替える */
  toggleVideo(): void;
  /** オーディオの有効/無効を切り替える */
  toggleAudio(): void;
}

// ----------------------------------------------------------------
// useRemotePersons
// ----------------------------------------------------------------

/** リモート参加者の状態 */
export interface RemotePersonState {
  member: import("@skyway-sdk/room").RemoteRoomMember;
  publications: import("@skyway-sdk/room").RoomPublication[];
  /** サブスクライブ済みのビデオストリーム（contentType: "video"）*/
  videoSubscription:
    | import("@skyway-sdk/room").RoomSubscription<import("@skyway-sdk/room").RemoteVideoStream>
    | null;
  /** サブスクライブ済みのオーディオストリーム（contentType: "audio"）*/
  audioSubscription:
    | import("@skyway-sdk/room").RoomSubscription<import("@skyway-sdk/room").RemoteAudioStream>
    | null;
}

export interface UseRemotePersonsOptions {
  room: AnyRoom | null;
  localMember: import("@skyway-sdk/room").LocalRoomMember | null;
  /** 自動的に全パブリケーションをサブスクライブするか（デフォルト: true）*/
  autoSubscribe?: boolean;
  /** 参加イベントのコールバック */
  onMemberJoined?: (member: import("@skyway-sdk/room").RemoteRoomMember) => void;
  /** 退出イベントのコールバック */
  onMemberLeft?: (member: import("@skyway-sdk/room").RemoteRoomMember) => void;
}

export interface UseRemotePersonsReturn {
  remotePersons: RemotePersonState[];
  subscribe(publication: import("@skyway-sdk/room").RoomPublication): Promise<void>;
  unsubscribe(subscriptionId: string): Promise<void>;
}

export interface UseRemotePersonsCoreOptions {
  room: AnyRoom | null;
  localMember: import("@skyway-sdk/room").LocalRoomMember | null;
  onMemberJoined?: (member: import("@skyway-sdk/room").RemoteRoomMember) => void;
  onMemberLeft?: (member: import("@skyway-sdk/room").RemoteRoomMember) => void;
}

export interface UseRemotePersonsCoreReturn {
  remoteMembers: import("@skyway-sdk/room").RemoteRoomMember[];
  subscriptions: import("@skyway-sdk/room").RoomSubscription[];
  isProcessing: boolean;
  error: Error | null;
  subscribe(
    publication: import("@skyway-sdk/room").RoomPublication,
    options?: import("@skyway-sdk/room").SubscriptionOptions
  ): Promise<import("@skyway-sdk/room").RoomSubscription | null>;
  unsubscribe(target: string | import("@skyway-sdk/room").RoomSubscription): Promise<void>;
}

// ----------------------------------------------------------------
// useMediaStream
// ----------------------------------------------------------------

export interface UseMediaStreamOptions {
  /** カメラのデバイス ID */
  videoDeviceId?: string;
  /** マイクのデバイス ID */
  audioDeviceId?: string;
  /** ビデオ制約 */
  videoConstraints?: VideoConstraints | boolean;
  /** オーディオ制約 */
  audioConstraints?: AudioConstraints | boolean;
}

export type UseMediaStreamCoreOptions = Record<string, never>;

export interface UseMediaStreamCoreReturn {
  localVideoStream: import("@skyway-sdk/room").LocalVideoStream | null;
  localAudioStream: import("@skyway-sdk/room").LocalAudioStream | null;
  isLoading: boolean;
  error: Error | null;
  /** SkyWayStreamFactory.createMicrophoneAudioAndCameraStream を透過的に呼び出す */
  requestCameraAndMicrophone(options?: {
    video?: import("@skyway-sdk/room").VideoMediaTrackConstraints;
    audio?: import("@skyway-sdk/room").AudioMediaTrackConstraints;
  }): Promise<{
    video: import("@skyway-sdk/room").LocalVideoStream | null;
    audio: import("@skyway-sdk/room").LocalAudioStream | null;
  }>;
  /** SkyWayStreamFactory.createDisplayStreams を透過的に呼び出す */
  requestDisplay(
    options?: import("@skyway-sdk/room").DisplayStreamOptions
  ): Promise<import("@skyway-sdk/room").LocalVideoStream | null>;
  /** 取得済みのカメラ・マイクストリームを解放 */
  stopMediaStream(): void;
}

export interface UseMediaStreamReturn {
  localVideoStream: import("@skyway-sdk/room").LocalVideoStream | null;
  localAudioStream: import("@skyway-sdk/room").LocalAudioStream | null;
  isLoading: boolean;
  error: Error | null;
  /** カメラ・マイクのストリームを取得する */
  requestMediaStream(options?: UseMediaStreamOptions): Promise<{
    video: import("@skyway-sdk/room").LocalVideoStream | null;
    audio: import("@skyway-sdk/room").LocalAudioStream | null;
  }>;
  /** ストリームを停止・解放する */
  stopMediaStream(): void;
  /** 画面共有ストリームを取得する */
  requestScreenShare(): Promise<import("@skyway-sdk/room").LocalVideoStream | null>;
}

// ----------------------------------------------------------------
// useWebRTCStats
// ----------------------------------------------------------------

export interface WebRTCStats {
  /** 往復遅延（RTT）ミリ秒 */
  rttMs: number | null;
  /** パケットロス率（0〜1）*/
  packetLossRate: number | null;
  /** 送信バイト数（累計）*/
  bytesSent: number;
  /** 受信バイト数（累計）*/
  bytesReceived: number;
  /** 送信ビットレート（bps）*/
  bitrateSendBps: number;
  /** 受信ビットレート（bps）*/
  bitrateReceiveBps: number;
  /** 最終更新時刻 */
  updatedAt: number;
}

export interface UseWebRTCStatsOptions {
  /** 計測間隔（ミリ秒、デフォルト: 5000ms）*/
  intervalMs?: number;
  /** 計測を有効にするか（デフォルト: true）*/
  enabled?: boolean;
}

export interface UseWebRTCStatsCoreOptions {
  room: AnyRoom | null;
  /** 計測間隔（ミリ秒、デフォルト: 5000ms）*/
  intervalMs?: number;
  /** 計測を有効にするか（デフォルト: true）*/
  enabled?: boolean;
  /**
   * 統計収集対象の RTCPeerConnection 一覧を返す。
   * 未指定時は window._skyway_pcs を参照します。
   */
  getPeerConnections?: () => RTCPeerConnection[];
}

export interface UseWebRTCStatsCoreReturn {
  stats: WebRTCStats | null;
  isCollecting: boolean;
  collectNow(): Promise<void>;
}

export interface UseWebRTCStatsReturn {
  stats: WebRTCStats | null;
  isCollecting: boolean;
}
