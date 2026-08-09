import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this application. This prevents Next.js from
  // discovering package-lock files in parent coursework folders.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
