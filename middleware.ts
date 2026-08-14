import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/home",
  "/crm",
  "/calendar",
  "/english",
  "/tasks",
  "/settings",
  // Anciennes URLs (redirigées ensuite) — protégées pour éviter le flash login
  "/dashboard",
  "/prospects",
  "/today",
  "/clients",
  "/stats",
];

const AUTH_PAGES = new Set(["/login", "/signup", "/register"]);

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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

  if (isProtectedPath(path) && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", path);
    return NextResponse.redirect(login);
  }

  if (user && AUTH_PAGES.has(path)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (path === "/" && user) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (path === "/" && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/home/:path*",
    "/crm/:path*",
    "/calendar/:path*",
    "/english/:path*",
    "/tasks/:path*",
    "/dashboard/:path*",
    "/prospects/:path*",
    "/today/:path*",
    "/clients/:path*",
    "/stats/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/register",
  ],
};
