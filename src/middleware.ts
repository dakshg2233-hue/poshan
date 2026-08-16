import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie, and gates the private pages.
 *
 * Two jobs:
 *  1. Touching getUser() refreshes the access token, so a session does not
 *     silently expire mid-visit.
 *  2. A signed-out visitor asking for /profile or /dashboard is sent to
 *     /login and returned to where they were headed afterwards.
 *
 * The marketing page is open to everyone. It was briefly behind the login,
 * which meant a first-time visitor was asked for an account before being
 * shown a single reason to want one.
 */

/**
 * Sign-in required. Everything not listed here is public, including "/" —
 * the marketing page has to sell the product before it can ask for an
 * account, and a visitor who hits a wall before seeing the thali, the 38
 * meals or the pricing has been given no reason to sign up.
 *
 * These two are the pages that show a person their own data.
 */
const PRIVATE_PREFIXES = ["/profile", "/dashboard"];

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

  /* Allow-list flipped to a deny-list. Previously everything was gated except
     a handful of paths, which meant any new page defaulted to private — and
     put the whole marketing site behind sign-in. Now only the pages that show
     a person their own data require it, and a new page is public by default,
     which is the right default for a site whose job is to persuade. */
  const isPrivate = PRIVATE_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  if (!user && isPrivate) {
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
