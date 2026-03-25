import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54331",
      },
      {
        protocol: "https",
        hostname: "pkahsxwnkvqmwmnvbzdc.supabase.co",
      },
    ],
  },
};

export default nextConfig;
