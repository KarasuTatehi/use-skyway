"use client";

import styles from "./RoomControls.module.css";

interface RoomControlsProps {
  isConnected: boolean;
  isConnecting: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoPublishing: boolean;
  isAudioPublishing: boolean;
  onJoin(): void;
  onLeave(): void;
  onToggleVideo(): void;
  onToggleAudio(): void;
}

/**
 * ルーム操作コントロールバー（参加・退出・マイク・カメラ切替）。
 */
export function RoomControls({
  isConnected,
  isConnecting,
  isVideoEnabled,
  isAudioEnabled,
  isVideoPublishing,
  isAudioPublishing,
  onJoin,
  onLeave,
  onToggleVideo,
  onToggleAudio,
}: RoomControlsProps) {
  return (
    <div className={styles.bar}>
      {/* カメラ切替（参加後のみ表示）*/}
      {isConnected && isVideoPublishing && (
        <ControlButton
          onClick={onToggleVideo}
          label={isVideoEnabled ? "カメラOFF" : "カメラON"}
          icon={isVideoEnabled ? "🎥" : "📷"}
          isActive={!isVideoEnabled}
        />
      )}

      {/* マイク切替（参加後のみ表示）*/}
      {isConnected && isAudioPublishing && (
        <ControlButton
          onClick={onToggleAudio}
          label={isAudioEnabled ? "ミュート" : "ミュート解除"}
          icon={isAudioEnabled ? "🎙️" : "🔇"}
          isActive={!isAudioEnabled}
        />
      )}

      {/* 参加 / 退出ボタン */}
      {isConnected ? (
        <button
          type="button"
          className={styles.leaveButton}
          onClick={onLeave}
          disabled={isConnecting}
        >
          退出
        </button>
      ) : (
        <button
          type="button"
          className={styles.joinButton}
          onClick={onJoin}
          disabled={isConnecting}
        >
          {isConnecting ? "接続中…" : "参加する"}
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// ControlButton（汎用ピルボタン）
// ----------------------------------------------------------------

interface ControlButtonProps {
  onClick(): void;
  label: string;
  icon: string;
  isActive: boolean;
}

function ControlButton({ onClick, label, icon, isActive }: ControlButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.controlButton} ${isActive ? styles.inactive : ""}`}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={label}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
