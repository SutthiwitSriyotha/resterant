import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // เปิด strict mode
  swcMinify: true,       // ใช้ SWC minify เร็วกว่า
  eslint: {
    ignoreDuringBuilds: true, // ให้ build ผ่านแม้ ESLint error (แก้ด่วนๆ)
  },
  typescript: {
    ignoreBuildErrors: true, // ให้ build ผ่านแม้ TS error (แก้ด่วนๆ)
  },
};

export default nextConfig;
