import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { MODULE_ORDER, UNCATEGORIZED_MODULE } from "@/lib/shared";

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const store = await getStore();
    // Starter curriculum is seeded lazily per user (firebase) or at account
    // bootstrap (sqlite); this call is a cheap no-op once seeded.
    await store.ensureUserSeed(user.id);
    const lessons = await store.listLessons(user.id);
    return NextResponse.json({ lessons });
  } catch (err) {
    console.error("learn list error:", err);
    return NextResponse.json({ error: "Failed to load lessons" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = str(body.title).trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const requestedModule = str(body.module);
    const moduleName = MODULE_ORDER[requestedModule]
      ? requestedModule
      : UNCATEGORIZED_MODULE;
    const moduleOrder = MODULE_ORDER[moduleName];

    const store = await getStore();
    const lessons = await store.listLessons(user.id);
    const lastOrder = lessons
      .filter((l) => l.module === moduleName)
      .reduce((max, l) => Math.max(max, l.lessonOrder), 0);

    const lesson = await store.createLesson(user.id, {
      title,
      module: moduleName,
      moduleOrder,
      lessonOrder: lastOrder + 1,
      completed: false, // custom lessons always start unchecked
      isCustom: true,
      sourceUrl: str(body.sourceUrl) || null,
      notes: str(body.notes) || null,
    });
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (err) {
    console.error("lesson create error:", err);
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
  }
}
