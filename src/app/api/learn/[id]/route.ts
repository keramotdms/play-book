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
    const lesson = await store.getLesson(user.id, id);
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, string | boolean | null> = {};

    if (typeof body.completed === "boolean") data.completed = body.completed;

    // Built-in lessons only track completion; custom lessons are fully editable.
    if (lesson.isCustom) {
      if (typeof body.title === "string" && body.title.trim()) {
        data.title = body.title.trim();
      }
      if (body.sourceUrl !== undefined) data.sourceUrl = str(body.sourceUrl) || null;
      if (body.notes !== undefined) data.notes = str(body.notes) || null;
    }

    const updated = await store.updateLesson(user.id, id, data);
    return NextResponse.json({ lesson: updated });
  } catch (err) {
    console.error("lesson update error:", err);
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const lesson = await store.getLesson(user.id, id);
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const deleted = await store.deleteLesson(user.id, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Built-in lessons cannot be deleted." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("lesson delete error:", err);
    return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 });
  }
}
