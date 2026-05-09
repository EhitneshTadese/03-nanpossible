import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  distDir: process.env.VERCEL
    ? ".next"
    : process.env.NODE_ENV === "development"
      ? ".next.nosync/dev"
      : ".next.nosync/prod",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wial.org",
      },
      {
        protocol: "https",
        hostname: "www.wial.org",
      },
      {
        protocol: "https",
        hostname: "images.credly.com",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
