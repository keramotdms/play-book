import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const existing = await store.getCopy(user.id, id);
    if (!existing) return NextResponse.json({ error: "Copy not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, string | null> = {};
    if (typeof body.title === "string" && body.title.trim()) {
      data.title = body.title.trim();
    }
    if (typeof body.body === "string" && body.body.trim()) data.body = body.body;
    if (typeof body.nicheTag === "string") data.nicheTag = body.nicheTag || "Other";
    if (typeof body.framework === "string") data.framework = body.framework || "custom";
    if (body.clientIdRef !== undefined) {
      data.clientIdRef = str(body.clientIdRef) || null;
    }

    const copy = await store.updateCopy(user.id, id, data);
    if (!copy) return NextResponse.json({ error: "Copy not found" }, { status: 404 });
    return NextResponse.json({ copy: { ...copy, clientName: null } });
  } catch (err) {
    console.error("copy update error:", err);
    return NextResponse.json({ error: "Failed to update copy" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const existing = await store.getCopy(user.id, id);
    if (!existing) return NextResponse.json({ error: "Copy not found" }, { status: 404 });
    await store.deleteCopy(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("copy delete error:", err);
    return NextResponse.json({ error: "Failed to delete copy" }, { status: 500 });
  }
}
