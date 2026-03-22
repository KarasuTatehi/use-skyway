import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/skyway-token
 *
 * SkyWay 認証トークンを発行する API Route。
 *
 * 本番環境では:
 *   1. ユーザー認証を検証する
 *   2. SKYWAY_APP_ID / SKYWAY_SECRET_KEY で署名した JWT を生成する
 *
 * 開発環境では SKYWAY_TOKEN 環境変数に設定したトークンをそのまま返します。
 *
 * @see https://skyway.ntt.com/ja/docs/user-guide/authentication/
 */
export async function GET(_req: NextRequest) {
  const token = process.env.SKYWAY_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error:
          "SKYWAY_TOKEN 環境変数が設定されていません。" +
          ".env.local に SKYWAY_TOKEN=<your-token> を追加してください。",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ token });
}
