import { NextResponse } from "next/server";
import { listOrders, orderStats, migrateLegacyOrders } from "@/lib/cloudinary";
import { errorResponse } from "@/lib/apiError";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders?limit=200 — newest-first orders, merged across the new
 * per-order objects and any orders still sitting in the legacy blob.
 * (Admin-only: middleware guards /api/admin/*.)
 */
export async function GET(req: Request) {
  try {
    const limit = Number(new URL(req.url).searchParams.get("limit") ?? 200);
    const [orders, stats] = await Promise.all([listOrders({ limit: Number.isFinite(limit) ? limit : 200 }), orderStats()]);
    return NextResponse.json({ ok: true, stats, count: orders.length, orders });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * POST /api/admin/orders  { "action": "migrate" }
 * Idempotent one-time migration of the legacy single orders blob into one object
 * per order. The legacy blob is never deleted — it stays as a backup.
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
