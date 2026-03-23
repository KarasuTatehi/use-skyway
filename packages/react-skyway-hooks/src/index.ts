/**
 * @use-skyway/react-hooks
 *
 * SkyWay JS SDK のカスタム React フックライブラリ。
 * Next.js App Router / React 18-19 対応。
 */

// Provider
export { SkyWayProvider, SkyWayProviderCore } from "./context/SkyWayProvider";

// Hooks
export {
  useSkyWayContext,
  useSkyWayContextCore,
} from "./hooks/useSkyWayContext";
export { useRoomCore } from "./hooks/useRoomCore";
export { useRoom } from "./hooks/useRoom";
export { useLocalPersonCore } from "./hooks/useLocalPersonCore";
export { useLocalPerson } from "./hooks/useLocalPerson";
export { useRemotePersonsCore } from "./hooks/useRemotePersonsCore";
export { useRemotePersons } from "./hooks/useRemotePersons";
export { useMediaStreamCore } from "./hooks/useMediaStreamCore";
export { useMediaStream } from "./hooks/useMediaStream";
export { useWebRTCStatsCore } from "./hooks/useWebRTCStatsCore";
export { useWebRTCStats } from "./hooks/useWebRTCStats";

// Types
export type {
  // Provider
  SkyWayProviderProps,
  SkyWayProviderCoreProps,
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
  UseRemotePersonsCoreOptions,
  UseRemotePersonsCoreReturn,
  UseRemotePersonsOptions,
  UseRemotePersonsReturn,
  UseMediaStreamCoreOptions,
  UseMediaStreamCoreReturn,
  UseMediaStreamOptions,
  UseMediaStreamReturn,
  UseWebRTCStatsCoreOptions,
  UseWebRTCStatsCoreReturn,
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
  RoomMemberInit,
  RoomInit,
  RoomPublicationOptions,
  RoomPublication,
  RoomSubscription,
  RoomType,
  SFURoom,
  SkyWayContextConfig,
  Stream,
  SubscriptionOptions,
} from "./types";
