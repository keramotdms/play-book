import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizeTags } from "@/lib/domain";
import { ScriptType } from "@/lib/shared";

type Ctx = { params: Promise<{ id: string }> };
const SCRIPT_TYPES: ScriptType[] = ["initial", "followup_1", "followup_2"];

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const existing = await store.getScript(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: { title?: string; body?: string; type?: string; tags?: string } = {};
    if (typeof body.title === "string" && body.title.trim()) {
      data.title = body.title.trim();
    }
    if (typeof body.body === "string" && body.body.trim()) data.body = body.body;
    if (typeof body.type === "string" && SCRIPT_TYPES.includes(body.type as ScriptType)) {
      data.type = body.type;
    }
    if (body.tags !== undefined) data.tags = normalizeTags(body.tags);

    const script = await store.updateScript(user.id, id, data);
    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    return NextResponse.json({
      script: { ...script, tags: script.tags ? script.tags.split(",").filter(Boolean) : [] },
    });
  } catch (err) {
    console.error("script update error:", err);
    return NextResponse.json({ error: "Failed to update script" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const existing = await store.getScript(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }
    await store.deleteScript(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("script delete error:", err);
    return NextResponse.json({ error: "Failed to delete script" }, { status: 500 });
  }
}
