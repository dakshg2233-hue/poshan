import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie, and makes the app open on sign-in.
 *
 * Two jobs:
 *  1. Touching getUser() refreshes the access token, so a session does not
 *     silently expire mid-visit.
 *  2. A signed-out visitor landing on "/" is sent to /login. Signed in, "/"
 *     renders the full site as before.
 *
 * Note this does put the marketing page behind the login — nobody sees the
 * thali, the meal library or the pricing without an account. That is the
 * requested behaviour; to undo it, delete the redirect block below and
 * nothing else changes.
 */
const PUBLIC_PATHS = ["/login", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  /* Not configured yet — pass through rather than 500 the whole site.
     Without this guard an unconfigured deploy would redirect to a login
     page that cannot sign anyone in, i.e. a dead end. */
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  /* Touching getUser() is what performs the refresh. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`)) ||
    path.startsWith("/api/");

  /* Signed out and asking for a gated page: open on sign-in instead, keeping
     where they were headed so they land back there afterwards. */
  /* POSHAN_OPEN=1 lifts the login gate so the marketing page can be inspected
     without a session. Hard-bound to non-production: if this ever reaches a
     deploy, the env var does nothing and the gate holds. */
  const gateOpen =
    process.env.NODE_ENV !== "production" && process.env.POSHAN_OPEN === "1";

  if (!user && !isPublic && !gateOpen) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    if (path !== "/") to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }

  /* Already signed in and hitting the login page: send them into the app. */
  if (user && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = request.nextUrl.searchParams.get("next") || "/";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  matcher: [
    /* Everything except static assets and image optimisation. */
    "/((?!_next/static|_next/image|favicon.ico|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
