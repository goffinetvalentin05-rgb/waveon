import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { INVITE_COOKIE, inviteCookieOptions, invitePath, inviteTokenFromPath, isInviteToken } from "@/lib/auth/invite";

const PROTECTED_PREFIXES = [
  "/home",
  "/crm",
  "/calendar",
  "/english",
  "/tasks",
  "/settings",
  "/projects",
  "/finances",
  "/notes",
  "/notifications",
  "/personal",
  "/join",
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

function withInviteCookie(response: NextResponse, token: string) {
  response.cookies.set(INVITE_COOKIE, token, inviteCookieOptions);
  return response;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const inviteToken = inviteTokenFromPath(path);
  if (inviteToken) {
    response = withInviteCookie(response, inviteToken);
  }

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
        if (inviteToken) {
          response.cookies.set(INVITE_COOKIE, inviteToken, inviteCookieOptions);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(path) && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (user && AUTH_PAGES.has(path)) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const fromRedirect = inviteTokenFromPath(redirectParam ?? "");
    if (fromRedirect) {
      return withInviteCookie(NextResponse.redirect(new URL(invitePath(fromRedirect), request.url)), fromRedirect);
    }
    const cookieToken = request.cookies.get(INVITE_COOKIE)?.value;
    if (isInviteToken(cookieToken) && request.nextUrl.searchParams.get("invite") === "1") {
      return NextResponse.redirect(new URL(invitePath(cookieToken), request.url));
    }
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (path === "/" && user) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (path === "/" && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const spaceRedirect = redirectLegacySpace(request);
    if (spaceRedirect) return spaceRedirect;
  }

  return response;
}

function redirectLegacySpace(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const url = request.nextUrl;

  const mapPrefix = (from: string, to: string) => {
    if (path === from || path.startsWith(`${from}/`)) {
      const next = new URL(path.replace(from, to), request.url);
      next.search = url.search;
      return NextResponse.redirect(next);
    }
    return null;
  };

  const personal = mapPrefix("/calendar", "/personal/calendar")
    ?? mapPrefix("/tasks", "/personal/tasks")
    ?? mapPrefix("/english", "/personal/english")
    ?? mapPrefix("/notes", "/personal/notes");
  if (personal) return personal;

  if (path === "/crm/prospects") {
    const project = url.searchParams.get("project");
    if (project && project !== "unassigned") {
      return NextResponse.redirect(new URL(`/projects/${project}/prospects`, request.url));
    }
    if (project === "unassigned") {
      return NextResponse.redirect(new URL("/projects/unassigned", request.url));
    }
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  if (
    path === "/crm" ||
    path === "/crm/today" ||
    path === "/crm/clients" ||
    path === "/crm/stats"
  ) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  if (path === "/finances" || path.startsWith("/finances/")) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return null;
}

export const config = {
  matcher: [
    "/",
    "/home",
    "/home/:path*",
    "/personal",
    "/personal/:path*",
    "/crm",
    "/crm/:path*",
    "/calendar",
    "/calendar/:path*",
    "/english",
    "/english/:path*",
    "/tasks",
    "/tasks/:path*",
    "/dashboard/:path*",
    "/prospects/:path*",
    "/today/:path*",
    "/clients/:path*",
    "/stats/:path*",
    "/settings",
    "/settings/:path*",
    "/projects",
    "/projects/:path*",
    "/finances",
    "/finances/:path*",
    "/notes",
    "/notes/:path*",
    "/notifications",
    "/notifications/:path*",
    "/invite",
    "/invite/:path*",
    "/join",
    "/login",
    "/signup",
    "/register",
  ],
};
