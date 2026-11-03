import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allows remote media URLs from Unsplash, Google Images, CDNs, and any user-added external image host
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
