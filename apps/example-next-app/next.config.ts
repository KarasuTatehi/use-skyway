import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // React Compiler を有効化（babel-plugin-react-compiler が必要）
    reactCompiler: true,
  },
  // @skyway-sdk/room は ESM 専用パッケージのためトランスパイル対象にする
  transpilePackages: ["@skyway-sdk/room", "@use-skyway/react-hooks"],
};

export default nextConfig;
