# use-skyway

SkyWay JS SDK を Next.js App Router で扱いやすくするための React カスタムフックライブラリです。

このリポジトリは Turborepo + pnpm workspace のモノレポ構成で、以下を含みます。

- React フックライブラリ: `@use-skyway/react-hooks`
- 動作サンプル: Next.js 15 App Router アプリ

## 特徴

- `@skyway-sdk/room` 同梱の TypeScript 型を利用
- `RoomMemberInit` / `RoomPublicationOptions` / `SubscriptionOptions` など主要 SDK 型を再エクスポート
- Next.js App Router で使える Client Component 前提のフック設計
- `next/dynamic` + `ssr: false` による `RTCPeerConnection` SSR エラー回避パターン
- React Compiler 有効化済みサンプル（手動 `memo` / `useCallback` 不要）
- Biome で lint と format を統一

## リポジトリ構成

```text
use-skyway/
├── apps/
│   └── example-next-app/      # Next.js サンプル
├── packages/
│   └── react-skyway-hooks/    # フックライブラリ
├── biome.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 設計方針（2層構造）

このライブラリは以下の2層で API を提供します。

- Compat 層（使いやすさ優先）: `useRoom`, `useLocalPerson` など。既存コードを壊さず利用可能。
- Core 層（透過性優先）: `useRoomCore`, `useLocalPersonCore`, `useRemotePersonsCore`, `useMediaStreamCore`, `useWebRTCStatsCore`。`@skyway-sdk/room` のオプションを可能な限りそのまま渡せます。

推奨:

- まずは Compat 層を使う
- SDK の細かいオプション制御が必要になったら Core 層を使う

### Compat/Core 型対応表

| ユースケース | Compat 層 | Core 層 | 主な SDK 型 |
|---|---|---|---|
| 認証・初期化 | `SkyWayProvider` | `SkyWayProviderCore` | `SkyWayProviderProps`, `SkyWayProviderCoreProps` |
| ルーム参加 | `useRoom` | `useRoomCore` | `RoomInit`, `RoomMemberInit` |
| ローカル publish | `useLocalPerson` | `useLocalPersonCore` | `PublicationOptions`, `RoomPublicationOptions` |
| リモート subscribe | `useRemotePersons` | `useRemotePersonsCore` | `SubscriptionOptions`, `RoomSubscription` |
| メディア取得 | `useMediaStream` | `useMediaStreamCore` | `VideoMediaTrackConstraints`, `AudioMediaTrackConstraints` |
| 統計取得 | `useWebRTCStats` | `useWebRTCStatsCore` | `RTCStats`, `RTCIceCandidatePairStats` |

目安:

- 既存実装の移行・簡易利用は Compat 層
- SDK オプションを厳密に制御したい場合は Core 層

### `SkyWayProvider` (Compat 層)

SkyWay 認証コンテキストを初期化し、全体に提供するプロバイダーです。

トークンの自動更新機能を持つため、簡単に利用できます：

```tsx
<SkyWayProvider token={myToken}>
  <App />
</SkyWayProvider>
```

**オプション：**

| プロップ | 型 | 説明 |
|---------|----|----|
| `token` | `string \| (() => Promise<string>)` | トークン。関数の場合、期限切れ時に再呼び出し |
| `config` | `SkyWayContextConfig` | SkyWayContext の設定（オプション） |
| `onTokenExpired` | `() => void` | トークン期限切れ時のコールバック |
| `onError` | `(error: Error) => void` | エラー発生時のコールバック |

### `SkyWayProviderCore` (Core 層)

手動トークン制御版のプロバイダーです。トークンの自動更新は行いません。

```tsx
const [token, setToken] = useState(myInitialToken);

const handleTokenRefresh = (newToken: string) => {
  setToken(newToken);  // Context が再初期化される
};

<SkyWayProviderCore token={token}>
  <App onTokenRefresh={handleTokenRefresh} />
</SkyWayProviderCore>
```

**オプション：**

| プロップ | 型 | 説明 |
|---------|----|----|
| `token` | `string` | トークン（文字列のみ、自動更新なし） |
| `config` | `SkyWayContextConfig` | SkyWayContext の設定（オプション） |
| `onError` | `(error: Error) => void` | エラー発生時のコールバック |

### `useRoom`

ルームの参加・退出・接続状態を管理します。

このライブラリでは `roomType` 未指定時に `default Room` を使用します。
通信方式（`p2p` / `sfu`）は `publish` 時に指定する運用を想定しています。

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `roomName` | `string` | 必須 | ルーム名 |
| `roomType` | `"default" \| "p2p" \| "sfu"` | `"default"` | ルームタイプ（未指定時は default Room） |
| `autoJoin` | `boolean` | `false` | マウント時に自動参加 |
| `joinOptions` | `RoomMemberInit` | — | `join()` に渡す追加オプション |
| `closeOnEmpty` | `boolean` | `false` | 最後のメンバーが退出したとき `room.close()` を呼ぶか（`true` で有効化） |

### その他のフック

- `useSkyWayContext` — Provider で初期化した SkyWayContext を取得
- `useSkyWayContextCore` — Provider で初期化した SkyWayContext を取得（Provider 外では例外ではなく `null` を返す）
- `useLocalPerson` — ローカルの publish とマイク・カメラ制御（`publishVideo` / `publishAudio` は `PublicationOptions` を受け取り、`type` 指定可能）
- `useRoomCore` — `FindOrCreate(roomInit)` / `join(joinOptions)` / `leave` / `close` / `dispose` を透過的に扱う
- `useLocalPersonCore` — `publish` / `unpublish` / `subscribe` / `unsubscribe` を透過的に扱う
- `useRemotePersons` — リモート参加者管理と subscribe 補助（デフォルト `autoSubscribe: false`、明示的に `true` で全パブリケーションを自動 subscribe）
- `useRemotePersonsCore` — リモート参加者と subscribe/unsubscribe を透過的に扱う（手動での subscribe/unsubscribe が必須）
- `useMediaStream` — カメラ・マイク・画面共有ストリーム取得
- `useMediaStreamCore` — `SkyWayStreamFactory` 呼び出しを透過的に扱う
- `useWebRTCStats` — RTT・パケットロス・ビットレート取得（デフォルト `enabled: false`、明示的に `true` で自動収集）
- `useWebRTCStatsCore` — 統計収集の間隔・有効化・PeerConnection 取得方法を透過的に扱う

## Core 層の最小例

```tsx
"use client";

import {
  SkyWayProviderCore,
  useLocalPersonCore,
  useMediaStreamCore,
  useRemotePersonsCore,
  useRoomCore,
  useSkyWayContextCore,
  useWebRTCStatsCore,
} from "@use-skyway/react-hooks";
import { useState } from "react";

function CoreDemo() {
  const contextValue = useSkyWayContextCore();
  const skyWayContext = contextValue?.skyWayContext ?? null;
  const { room, localMember, join, leave, close, dispose } = useRoomCore({
    roomInit: { name: "demo" }, // type 未指定 = default Room
    joinOptions: { name: "alice" },
  });
  const { publish, unpublish } = useLocalPersonCore({ localMember });
  const { remoteMembers, subscribe, unsubscribe } = useRemotePersonsCore({ room, localMember });
  const { requestCameraAndMicrophone, requestDisplay } = useMediaStreamCore();
  const { stats, collectNow } = useWebRTCStatsCore({ room, intervalMs: 3000, enabled: true });

  // 例: publish(localVideoStream, { type: "p2p" })
  // 例: unpublish(publicationId)
  // 例: subscribe(publication, options)
  // 例: unsubscribe(subscription)
  // 例: requestCameraAndMicrophone({ video, audio })
  // 例: requestDisplay({ audio: false })
  // 例: collectNow()
  // remoteMembers からリモート参加者一覧を取得
  // stats から RTT / ロス率を取得
  // skyWayContext から SDK のイベントを手動購読可能

  return null;
}

export default function App() {
  const [token, setToken] = useState("YOUR_SKYWAY_TOKEN");

  const handleTokenRefresh = (newToken: string) => {
    setToken(newToken);
  };

  return (
    <SkyWayProviderCore token={token}>
      <CoreDemo />
    </SkyWayProviderCore>
  );
}
```

## 通信方式の指定方針

- ルーム参加: `useRoom({ roomName })`（default Room）
- 通信方式の選択: `publish` 時に `type` で指定
- サンプルアプリ: `publishVideo(stream, { type: "p2p" })` / `publishAudio(stream, { type: "p2p" })`

将来的にサーバー側ポリシーで方式を決める場合でも、クライアントは `publish` オプションを差し替えるだけで対応できます。

## 自動挙動から手動制御への移行ガイド

v1.x では全てのフックのデフォルトを手動制御に変更しました。以前の自動挙動を維持したい場合は、明示的にオプトインしてください。

### 変更内容

| フック | オプション | 以前のデフォルト | 新しいデフォルト | 以前の動作を維持するには |
|---|---|---|---|---|
| `useRoom` | `closeOnEmpty` | `true` | `false` | `closeOnEmpty: true` を明示 |
| `useRemotePersons` | `autoSubscribe` | `true` | `false` | `autoSubscribe: true` を明示 |
| `useWebRTCStats` | `enabled` | `true` | `false` | `enabled: true` を明示 |

### 移行例

**Compat 層:**

```tsx
// ❌ 以前（自動で subscribe・統計収集）
const { remotePersons } = useRemotePersons({ room, localMember });
const { stats } = useWebRTCStats(room, localMember, { intervalMs: 5000 });

// ✅ 新しい（手動制御、必要に応じてオプトイン）
const { remotePersons } = useRemotePersons({ room, localMember, autoSubscribe: true });
const { stats } = useWebRTCStats(room, localMember, { intervalMs: 5000, enabled: true });
```

**Core 層:**

```tsx
// Core 層は元々手動制御が前提です
const { remoteMembers, subscribe, unsubscribe } = useRemotePersonsCore({ room, localMember });
const { stats } = useWebRTCStatsCore({ room, enabled: true, intervalMs: 5000 });

// 手動で subscribe が必要
remoteMembers.forEach(member => {
  member.publications.forEach(pub => {
    if (pub.contentType !== "data") void subscribe(pub);
  });
});
```

### 推奨

- **新規実装**: デフォルト（手動制御）のまま使う。必要なときだけオプトイン
- **既存コード**: 以前の自動動作が必要な場合のみ、上記のように明示的にオプションを指定

## セットアップ

前提:

- Node.js 18 以上
- pnpm 9 以上

手順:

```bash
pnpm install
```

## 開発

### 全体

```bash
pnpm dev
```

### ライブラリのみビルド

```bash
pnpm --filter @use-skyway/react-hooks build
```

### サンプルアプリのみ起動

```bash
pnpm --filter @use-skyway/example-next dev
```

### 型チェック

```bash
pnpm check-types
```

### Lint

```bash
pnpm lint
```

## サンプルアプリの環境変数

`apps/example-next-app/.env.local.example` を `apps/example-next-app/.env.local` にコピーして設定します。

```bash
cp apps/example-next-app/.env.local.example apps/example-next-app/.env.local
```

必要な値:

| 変数名 | 説明 |
|---|---|
| `SKYWAY_APP_ID` | SkyWay ダッシュボードのアプリケーション ID |
| `SKYWAY_SECRET_KEY` | SkyWay ダッシュボードのシークレットキー |

サンプルアプリには `/api/skyway-token` エンドポイントが含まれており、`@skyway-sdk/token` を使ってサーバーサイドで JWT（有効期限 24 時間）を生成します。クライアントからトークンをハードコードする必要はありません。

## サンプルアプリの機能

- ルーム参加・退出
- カメラ・マイクの ON/OFF 切替
- 自分の音声の自己モニター ON/OFF 切替
- WebRTC 統計表示（RTT・パケットロス率）
- 最後のメンバーが退出した際の自動 `room.close()`

## パッケージの使い方

### Compat 層（簡単に使う）

```tsx
"use client";

import {
  SkyWayProvider,
  useLocalPerson,
  useMediaStream,
  useRoom,
} from "@use-skyway/react-hooks";

function Demo() {
  const { localMember, join, leave, isConnected } = useRoom({ roomName: "demo" });
  const { requestMediaStream } = useMediaStream();
  const { publishVideo, publishAudio } = useLocalPerson({ localMember });

  const handleJoin = async () => {
    const { video, audio } = await requestMediaStream();
    await join();
    if (video) await publishVideo(video, { type: "p2p" });
    if (audio) await publishAudio(audio, { type: "p2p" });
  };

  return (
    <div>
      <button type="button" onClick={() => void handleJoin()}>Join</button>
      <button type="button" onClick={() => void leave()}>Leave</button>
      <p>{isConnected ? "connected" : "disconnected"}</p>
    </div>
  );
}

export default function App() {
  // token は /api/skyway-token などサーバーサイドで生成して渡す
  return (
    <SkyWayProvider token="YOUR_SKYWAY_TOKEN">
      <Demo />
    </SkyWayProvider>
  );
}
```

### Core 層（SDK オプションを厳密に制御する）

```tsx
"use client";

import {
  SkyWayProviderCore,
  useLocalPersonCore,
  useMediaStreamCore,
  useRoomCore,
} from "@use-skyway/react-hooks";
import { useState } from "react";

function DemoCore() {
  const { room, localMember, join, leave } = useRoomCore({
    roomInit: { name: "demo-core" },
    joinOptions: { name: "alice" },
  });
  const { publish } = useLocalPersonCore({ localMember });
  const { requestCameraAndMicrophone } = useMediaStreamCore();

  const handleJoin = async () => {
    const { video, audio } = await requestCameraAndMicrophone({
      video: { width: 1280, height: 720 },
      audio: { echoCancellation: true },
    });

    await join();

    if (video) {
      await publish(video, { type: "p2p" });
    }
    if (audio) {
      await publish(audio, { type: "p2p" });
    }
  };

  return (
    <div>
      <button type="button" onClick={() => void handleJoin()}>Join</button>
      <button type="button" onClick={() => void leave()}>Leave</button>
      <p>{room ? "joined" : "not joined"}</p>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState("YOUR_SKYWAY_TOKEN");

  const handleTokenRefresh = (newToken: string) => {
    setToken(newToken);
  };

  return (
    <SkyWayProviderCore token={token}>
      <DemoCore />
    </SkyWayProviderCore>
  );
}
```

## ライセンス

必要に応じて追記してください。
