# use-skyway

SkyWay JS SDK を Next.js App Router で扱いやすくするための React カスタムフックライブラリです。

このリポジトリは Turborepo + pnpm workspace のモノレポ構成で、以下を含みます。

- React フックライブラリ: @use-skyway/react-hooks
- 動作サンプル: Next.js 15 App Router アプリ

## 特徴

- @skyway-sdk/room 同梱の TypeScript 型を利用
- Next.js App Router で使える Client Component 前提のフック設計
- React Compiler 有効化済みサンプル
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

- useSkywayContext
  - Provider で初期化した SkyWayContext を取得
- useRoom
  - ルーム参加、退出、接続状態管理
- useLocalPerson
  - ローカルの publish とマイク、カメラ制御
- useRemotePersons
  - リモート参加者管理と subscribe 補助
- useMediaStream
  - カメラ、マイク、画面共有ストリーム取得
- useWebRTCStats
  - RTT、パケットロス、ビットレート取得

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

apps/example-next-app/.env.local.example を apps/example-next-app/.env.local にコピーして設定します。

必要な値:

- SKYWAY_TOKEN
  - SkyWay ダッシュボードで作成したトークン
- NEXT_PUBLIC_APP_URL
  - 例: http://localhost:3000

## パッケージの使い方

```tsx
"use client";

import { SkyWayProvider, useRoom } from "@use-skyway/react-hooks";

function Demo() {
  const { join, leave, isConnected } = useRoom({ roomName: "demo", roomType: "p2p" });

  return (
    <div>
      <button type="button" onClick={() => void join()}>Join</button>
      <button type="button" onClick={() => void leave()}>Leave</button>
      <p>{isConnected ? "connected" : "disconnected"}</p>
    </div>
  );
}

export default function App() {
  return (
    <SkyWayProvider token={"YOUR_SKYWAY_TOKEN"}>
      <Demo />
    </SkyWayProvider>
  );
}
```

## ライセンス

必要に応じて追記してください。
