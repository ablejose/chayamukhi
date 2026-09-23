import { NextResponse } from "next/server";
import { mutateManifest } from "@/lib/cloudinary";
import { errorResponse } from "@/lib/apiError";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    const { result: announcement } = await mutateManifest((m) => {
      m.announcement = { text: typeof b?.text === "string" ? b.text : "", active: !!b?.active };
      return m.announcement;
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, announcement });
  } catch (e) {
    return errorResponse(e);
  }
}
