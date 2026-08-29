import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/**
 * Image upload endpoint (client photos, avatar).
 *
 * Backend-aware via getStore():
 *  - firebase (production): file lands in the project's Cloud Storage bucket
 *    under client_photos/{uid}/… and a public token URL is returned.
 *  - sqlite (sandbox): file is written to public/uploads/ and served statically.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    const ext = EXT_BY_TYPE[contentType];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPEG, WebP or GIF." },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image too large (5 MB max)." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const store = await getStore();
    const url = await store.saveUpload(user.id, buffer, contentType, ext);
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}
