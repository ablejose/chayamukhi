import { NextResponse } from "next/server";
import { mutateManifest, getImageResource } from "@/lib/cloudinary";
import { errorResponse } from "@/lib/apiError";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

/** Site-wide artwork that is not attached to a finish, type or product. */
export async function PATCH(req: Request) {
  try {
    const b = await req.json().catch(() => null);

    // Side effect resolved BEFORE the mutation, so a compare-and-set retry never repeats it.
    let storyUrl: string | undefined;
    if (b?.storyImage && typeof b.storyImage.publicId === "string") {
      const res = await getImageResource(b.storyImage.publicId, "c1");
      if (!res) return NextResponse.json({ error: "Uploaded image could not be read back from Cloudinary." }, { status: 502 });
      storyUrl = res.url;
    }

    const { result: site } = await mutateManifest((m) => {
      if (storyUrl) m.site.storyImage = storyUrl;
      if (b?.storyImage === null) m.site.storyImage = undefined; // explicit clear -> fall back to the default art
      return m.site;
    });

    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, site });
  } catch (e) {
    return errorResponse(e);
  }
}
