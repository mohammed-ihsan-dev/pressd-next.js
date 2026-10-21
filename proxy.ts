import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate for the SEO dashboard only. It never grants access: every
// admin page and API route re-checks the session and role on the server
// (lib/seo/auth/guard.ts). This just turns away requests with no session
// cookie early and keeps admin URLs out of search indexes and caches.
const SESSION_COOKIE = "pressd_seo_session";
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/auth/"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p));
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  let res: NextResponse;
  if (!isPublic && !hasSession) {
    res = pathname.startsWith("/api/")
      ? NextResponse.json({ error: { code: "unauthenticated", message: "Sign in required" } }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login", req.url));
  } else {
    res = NextResponse.next();
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("X-Frame-Options", "DENY");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
