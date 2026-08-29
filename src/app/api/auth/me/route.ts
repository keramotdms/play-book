import { NextResponse } from "next/server";
import { getSessionUser, toSafeUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Guarantees starter data exists even if this is the first request after
    // login (no-op once seeded).
    const store = await getStore();
    await store.ensureUserSeed(user.id);
    return NextResponse.json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("me error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
