/**
 * @use-skyway/react-hooks
 *
 * SkyWay JS SDK のカスタム React フックライブラリ。
 * Next.js App Router / React 18-19 対応。
 */

// Provider
export { SkyWayProvider } from "./context/SkyWayProvider";

// Hooks
export { useSkywayContext } from "./hooks/useSkywayContext";
export { useRoomCore } from "./hooks/useRoomCore";
export { useRoom } from "./hooks/useRoom";
export { useLocalPersonCore } from "./hooks/useLocalPersonCore";
export { useLocalPerson } from "./hooks/useLocalPerson";
export { useRemotePersons } from "./hooks/useRemotePersons";
export { useMediaStream } from "./hooks/useMediaStream";
export { useWebRTCStats } from "./hooks/useWebRTCStats";

// Types
export type {
  // Provider
  SkyWayProviderProps,
  SkyWayContextValue,
  // Hooks
  UseRoomOptions,
  UseRoomReturn,
  UseRoomCoreOptions,
  UseRoomCoreReturn,
  UseLocalPersonCoreOptions,
  UseLocalPersonCoreReturn,
  UseLocalPersonOptions,
  UseLocalPersonReturn,
  RemotePersonState,
  UseRemotePersonsOptions,
  UseRemotePersonsReturn,
  UseMediaStreamOptions,
  UseMediaStreamReturn,
  UseWebRTCStatsOptions,
  UseWebRTCStatsReturn,
  WebRTCStats,
  // SDK re-exports
  AnyRoom,
  ContentType,
  LocalAudioStream,
  LocalP2PRoomMember,
  LocalRoomMember,
  LocalSFURoomMember,
  LocalVideoStream,
  P2PRoom,
  PublicationOptions,
  RemoteAudioStream,
  RemoteRoomMember,
  RemoteVideoStream,
  RoomInit,
  RoomPublication,
  RoomSubscription,
  RoomType,
  SFURoom,
  SkyWayContextConfig,
  Stream,
} from "./types";
