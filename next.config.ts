import type { NextConfig } from "next";
import { displayFrameAncestorsCsp } from "./lib/display/frame-ancestors";

const displayEmbedPolicy = displayFrameAncestorsCsp();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/display",
        headers: [
          {
            key: "Content-Security-Policy",
            value: displayEmbedPolicy,
          },
        ],
      },
      {
        source: "/display/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: displayEmbedPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
