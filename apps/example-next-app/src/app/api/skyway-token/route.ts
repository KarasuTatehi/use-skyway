import { SkyWayAuthToken } from "@skyway-sdk/token";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/skyway-token
 *
 * SkyWay 認証トークンを生成する API Route。
 *
 * @skyway-sdk/token を使用して JWT トークンを生成します。
 * 環境変数 SKYWAY_APP_ID と SKYWAY_SECRET_KEY が必要です。
 *
 * @see https://skyway.ntt.com/ja/docs/user-guide/authentication/
 */
export async function GET(_req: NextRequest) {
  const appId = process.env.SKYWAY_APP_ID;
  const secretKey = process.env.SKYWAY_SECRET_KEY;

  if (!appId || !secretKey) {
    return NextResponse.json(
      {
        error:
          "SKYWAY_APP_ID と SKYWAY_SECRET_KEY 環境変数が設定されていません。" +
          ".env.local に設定してください。",
      },
      { status: 500 }
    );
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // v3 スコープでトークンを生成
    const token = new SkyWayAuthToken({
      jti: uuidv4(),
      iat: now,
      exp: now + 24 * 60 * 60, // 24時間有効
      version: 3,
      scope: {
        appId,
        rooms: [
          {
            id: "*", // すべてのルーム
            methods: ["create" as const, "updateMetadata" as const, "close" as const],
            member: {
              id: "*", // すべてのメンバー
              methods: ["updateMetadata" as const, "publish" as const, "subscribe" as const],
            },
            sfu: {
              enabled: true,
            },
          },
        ],
        turn: {
          enabled: true,
        },
      },
    }).encode(secretKey);

    return NextResponse.json({ token, appId });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      {
        error: "トークン生成に失敗しました",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
