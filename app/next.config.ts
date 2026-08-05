import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resolve this app as its own workspace root (avoids the monorepo
  // lockfile-detection warning from the content repo's package-lock.json).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
