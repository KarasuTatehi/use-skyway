"use client";

import type { LocalRoomMember, LocalVideoStream, RemotePersonState } from "@use-skyway/react-hooks";
import styles from "./VideoGrid.module.css";
import { VideoTile } from "./VideoTile";

interface VideoGridProps {
  localMember: LocalRoomMember | null;
  localVideoStream: LocalVideoStream | null;
  remotePersons: RemotePersonState[];
}

/**
 * ローカル・リモートのビデオタイルをグリッドレイアウトで表示するコンポーネント。
 */
export function VideoGrid({ localMember, localVideoStream, remotePersons }: VideoGridProps) {
  const totalCount = (localMember ? 1 : 0) + remotePersons.length;

  if (!localMember) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>参加ボタンを押してルームに接続してください</p>
      </div>
    );
  }

  return (
    <div className={styles.grid} data-count={Math.min(totalCount, 9)}>
      {/* ローカル自身 */}
      <VideoTile
        isLocal
        displayName={localMember.name ?? "あなた"}
        videoStream={localVideoStream}
        audioStream={null}
      />

      {/* リモート参加者 */}
      {remotePersons.map(({ member, videoSubscription, audioSubscription }) => (
        <VideoTile
          key={member.id}
          isLocal={false}
          displayName={member.name ?? member.id.slice(0, 8)}
          videoStream={videoSubscription?.stream ?? null}
          audioStream={audioSubscription?.stream ?? null}
        />
      ))}
    </div>
  );
}
