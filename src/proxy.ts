import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "rd_session";
const ANON_COOKIE = "rd_anon";

/**
 * Lightweight edge checks. Real session validation happens in the layouts;
 * this only bounces obviously signed-out visitors and tags anonymous visitors
 * so landing-page views and store-badge clicks can be counted.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  if ((pathname.startsWith("/app") || pathname.startsWith("/owner")) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (!req.cookies.get(ANON_COOKIE)?.value) {
    res.cookies.set(ANON_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next|api|brand|icon.png|apple-icon.png|manifest.webmanifest|favicon.ico).*)"],
};
