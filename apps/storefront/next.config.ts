import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Demo catalog media is served from Unsplash (seeded by the API).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
