import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, toSafeUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: toSafeUser(user) });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, string> = {};
    for (const key of ["displayName", "phone", "bio", "avatarUrl"] as const) {
      if (typeof body[key] === "string") patch[key] = body[key] as string;
    }

    const store = await getStore();
    const updated = await store.updateUserProfile(user.id, patch);
    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("profile update error:", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
