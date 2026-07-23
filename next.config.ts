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

  async redirects() {
    return [
      { source: "/dashboard", destination: "/home", permanent: false },
      { source: "/prospects", destination: "/crm/prospects", permanent: false },
      {
        source: "/prospects/:id",
        destination: "/crm/prospects/:id",
        permanent: false,
      },
      { source: "/today", destination: "/crm/today", permanent: false },
      { source: "/clients", destination: "/crm/clients", permanent: false },
      { source: "/stats", destination: "/crm/stats", permanent: false },
    ];
  },
};

export default nextConfig;
