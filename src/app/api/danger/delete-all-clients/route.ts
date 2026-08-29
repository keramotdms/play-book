import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/**
 * Danger zone: bulk-deletes ALL clients (and their uploaded photos).
 * Requires the user to type the exact confirmation phrase.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as { confirmPhrase?: string };
    if (body.confirmPhrase !== "DELETE ALL CLIENTS") {
      return NextResponse.json(
        { error: 'Type "DELETE ALL CLIENTS" exactly to confirm.' },
        { status: 400 }
      );
    }

    const store = await getStore();
    const deleted = await store.deleteAllClients(user.id);
    return NextResponse.json({ deleted });
  } catch (err) {
    console.error("danger zone error:", err);
    return NextResponse.json({ error: "Failed to delete clients" }, { status: 500 });
  }
}
