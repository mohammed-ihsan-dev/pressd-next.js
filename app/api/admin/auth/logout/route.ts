import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { currentViewer } from "@/lib/seo/auth/guard";
import { SESSION_COOKIE } from "@/lib/seo/auth/session";
import { getDb } from "@/lib/seo/server";
import { logAdmin } from "@/lib/seo/services/log";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return NextResponse.json({ error: { code: "bad_origin" } }, { status: 403 });
  const viewer = await currentViewer();
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
  if (viewer) {
    try {
      await logAdmin(await getDb(), viewer.email, "logout");
    } catch {}
  }
  return NextResponse.redirect(new URL("/admin/login?signed_out=1", req.url), 303);
}
