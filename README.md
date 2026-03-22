# use-skyway

SkyWay JS SDK を Next.js App Router で扱いやすくするための React カスタムフックライブラリです。

このリポジトリは Turborepo + pnpm workspace のモノレポ構成で、以下を含みます。

- React フックライブラリ: `@use-skyway/react-hooks`
- 動作サンプル: Next.js 15 App Router アプリ

## 特徴

- `@skyway-sdk/room` 同梱の TypeScript 型を利用
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

## 主なフック

### `useRoom`

ルームの参加・退出・接続状態を管理します。

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `roomName` | `string` | 必須 | ルーム名 |
| `roomType` | `"default" \| "p2p" \| "sfu"` | `"default"` | ルームタイプ（未指定時は default Room） |
| `autoJoin` | `boolean` | `false` | マウント時に自動参加 |
| `joinOptions` | `{ name?: string; metadata?: string }` | — | `join()` に渡す追加オプション |
| `closeOnEmpty` | `boolean` | `true` | 最後のメンバーが退出したとき `room.close()` を呼ぶか |

### その他のフック

- `useSkywayContext` — Provider で初期化した SkyWayContext を取得
- `useLocalPerson` — ローカルの publish とマイク・カメラ制御
- `useRemotePersons` — リモート参加者管理と subscribe 補助
- `useMediaStream` — カメラ・マイク・画面共有ストリーム取得
- `useWebRTCStats` — RTT・パケットロス・ビットレート取得

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

```tsx
"use client";

import { SkyWayProvider, useRoom } from "@use-skyway/react-hooks";

function Demo() {
  const { join, leave, isConnected } = useRoom({ roomName: "demo" });

  return (
    <div>
      <button type="button" onClick={() => void join()}>Join</button>
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

## ライセンス

必要に応じて追記してください。
