import { NextResponse } from "next/server";
import { AbortMutation, ManifestConflictError, CloudNotConfiguredError } from "@/lib/cloudinary";

/**
 * Single error mapper for every admin/API route, so a rejected or conflicting
 * write always reaches the client as a specific status with a usable message
 * instead of a bare 500.
 */
export function errorResponse(e: unknown) {
  if (e instanceof AbortMutation) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ManifestConflictError) return NextResponse.json({ error: e.message, conflict: true }, { status: 409 });
  if (e instanceof CloudNotConfiguredError) return NextResponse.json({ error: e.message, cloud: e.which }, { status: 503 });
  return NextResponse.json({ error: (e as Error)?.message || "Something went wrong." }, { status: 500 });
}
