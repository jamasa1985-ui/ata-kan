import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  allowedDevOrigins: ['localhost:3000', '192.168.11.25:3000'],
};

export default nextConfig;
