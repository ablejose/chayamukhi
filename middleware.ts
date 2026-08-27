import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/auth";
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");
  const isLoginApi = pathname === "/api/admin/login" || pathname === "/api/admin/logout";
  const isLoginPage = pathname === "/admin/login";
  const ok = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET ?? "");
  if (isApi && !isLoginApi && !ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isAdminPage && !isLoginPage && !ok) { const u = req.nextUrl.clone(); u.pathname = "/admin/login"; u.search = ""; return NextResponse.redirect(u); }
  if (isLoginPage && ok) { const u = req.nextUrl.clone(); u.pathname = "/admin"; u.search = ""; return NextResponse.redirect(u); }
  const res = NextResponse.next(); if (isAdminPage || isApi) res.headers.set("X-Robots-Tag", "noindex, nofollow"); return res;
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
