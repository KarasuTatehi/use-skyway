import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "use-skyway example",
  description: "SkyWay SDK カスタムフックライブラリのサンプルアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
