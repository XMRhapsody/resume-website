/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // 使用空的serverExternalPackages来代替废弃的选项
  serverExternalPackages: []
};

module.exports = nextConfig;
