import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PlayCanvas は CommonJS ビルドを持つため transpilePackages で ESM 変換
  transpilePackages: ['playcanvas'],
};

export default nextConfig;
