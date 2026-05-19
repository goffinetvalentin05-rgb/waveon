import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: (() => {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hostname = raw
      ? (() => {
          try {
            return new URL(raw).hostname;
          } catch {
            return null;
          }
        })()
      : null;

    return hostname
      ? {
          remotePatterns: [
            {
              protocol: "https",
              hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ],
        }
      : undefined;
  })(),
};

export default nextConfig;
