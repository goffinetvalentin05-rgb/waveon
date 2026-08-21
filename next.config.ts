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
      { source: "/calendar", destination: "/personal/calendar", permanent: false },
      { source: "/calendar/:path*", destination: "/personal/calendar/:path*", permanent: false },
      { source: "/tasks", destination: "/personal/tasks", permanent: false },
      { source: "/english", destination: "/personal/english", permanent: false },
      { source: "/english/:path*", destination: "/personal/english/:path*", permanent: false },
      { source: "/notes", destination: "/personal/notes", permanent: false },
      { source: "/crm", destination: "/projects", permanent: false },
      { source: "/crm/today", destination: "/projects", permanent: false },
      { source: "/crm/clients", destination: "/projects", permanent: false },
      { source: "/crm/stats", destination: "/projects", permanent: false },
      { source: "/finances", destination: "/projects", permanent: false },
      { source: "/finances/:path*", destination: "/projects", permanent: false },
    ];
  },
};

export default nextConfig;
