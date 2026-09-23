import { NextResponse } from "next/server";
import { migrateLegacyOrders } from "@/lib/cloudinary";
import { errorResponse } from "@/lib/apiError";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

/**
 * Migration-only endpoint. Orders are stored one raw object per order; this
 * copies any order still sitting in the legacy single-blob store into that
 * layout. Idempotent, and the legacy blob is never deleted — it stays as a
 * backup, and reads fall back to it for anything not yet migrated.
 *
 * POST /api/admin/orders  { "action": "migrate" }
 *
 * Admin-only: middleware guards /api/admin/*. There is deliberately no GET —
 * this endpoint exists to make the storage change safe, not to expose orders.
 */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    if (b?.action !== "migrate") return NextResponse.json({ error: 'Unknown action. Send { "action": "migrate" }.' }, { status: 400 });
    const report = await migrateLegacyOrders();
    return NextResponse.json({ ok: report.failed === 0, ...report });
  } catch (e) {
    return errorResponse(e);
  }
}
