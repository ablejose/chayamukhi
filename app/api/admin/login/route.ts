import { NextResponse } from "next/server";
import { createSessionToken, ADMIN_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const password = typeof b?.password === "string" ? b.password : "";
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  if (!expected || !secret) return NextResponse.json({ error: "Admin is not configured (missing ADMIN_PASSWORD / SESSION_SECRET)." }, { status: 500 });
  if (password !== expected) return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  const token = await createSessionToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
  return res;
}
