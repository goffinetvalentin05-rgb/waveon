import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, NextResponse } from "next/server";

type BillingAccessState = "ALLOWED" | "BLOCKED";

function isBillingApiExempt(pathname: string): boolean {
  if (pathname.startsWith("/api/stripe/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/subscription/gate") return true;
  if (pathname === "/api/subscription/live") return true;
  if (pathname.startsWith("/api/cron/emails")) return true;
  if (pathname.startsWith("/api/reservations/cancel")) return true;
  if (pathname.startsWith("/api/business/check-public-slug")) return true;
  return false;
}

function isDashboardExemptWhenBlocked(pathname: string): boolean {
  if (pathname === "/dashboard/facturation" || pathname.startsWith("/dashboard/facturation/")) return true;
  if (pathname === "/dashboard/parametres" || pathname.startsWith("/dashboard/parametres/")) return true;
  return false;
}

async function fetchBillingState(request: NextRequest): Promise<BillingAccessState> {
  try {
    const res = await fetch(new URL("/api/subscription/gate", request.nextUrl.origin), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!res.ok) return "BLOCKED";
    const j = (await res.json()) as { canUseApp?: boolean; kind?: string };
    if (typeof j.canUseApp === "boolean") {
      return j.canUseApp ? "ALLOWED" : "BLOCKED";
    }
    return j.kind === "trial_expired" ? "BLOCKED" : "ALLOWED";
  } catch {
    return "BLOCKED";
  }
}

function withPathnameHeader(response: NextResponse, request: NextRequest, pathname: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const nextRes = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.cookies.getAll().forEach((cookie) => {
    nextRes.cookies.set(cookie.name, cookie.value);
  });
  return nextRes;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/reserver/")) {
    const slug = path.slice("/reserver/".length);
    if (slug && !slug.includes("/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}`;
      return NextResponse.redirect(url, 301);
    }
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedDashboard = path.startsWith("/dashboard");
  if (isProtectedDashboard && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", path);
    return NextResponse.redirect(login);
  }

  let billing: BillingAccessState | null = null;
  if (
    user &&
    path !== "/api/subscription/gate" &&
    (isProtectedDashboard || path.startsWith("/api/") || path === "/login" || path === "/signup")
  ) {
    billing = await fetchBillingState(request);
  }

  if ((path === "/login" || path === "/signup") && user && billing !== "BLOCKED") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && billing === "BLOCKED") {
    if (path.startsWith("/api/")) {
      if (!isBillingApiExempt(path)) {
        return NextResponse.json(
          {
            error: "subscription_required",
            message: "Votre essai est terminé ou votre abonnement est inactif. Souscrivez depuis Facturation.",
          },
          { status: 402 }
        );
      }
    } else if (isProtectedDashboard && !isDashboardExemptWhenBlocked(path)) {
      const u = new URL("/dashboard/facturation", request.url);
      u.searchParams.set("trial_expired", "1");
      return NextResponse.redirect(u, 302);
    }
  }

  if (path.startsWith("/dashboard")) {
    response = withPathnameHeader(response, request, path);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/login",
    "/signup",
    "/pricing",
  ],
};
