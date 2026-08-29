import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { icpDataFrom, IcpAnswers } from "@/lib/domain";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const store = await getStore();
  const client = await store.getClient(user.id, id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const existing = await store.getClient(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const data: Record<string, string> = {};
    for (const key of [
      "name",
      "niche",
      "email",
      "phone",
      "socialLinkedin",
      "socialInstagram",
      "socialX",
      "socialOther",
      "imageUrl",
      "notes",
    ] as const) {
      if (typeof body[key] === "string") data[key] = body[key] as string;
    }
    if (typeof data.name === "string" && !data.name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }

    let icpFields = {};
    if (body.icp && typeof body.icp === "object") {
      const icp = body.icp as Record<string, unknown>;
      const answers: IcpAnswers = {
        hasPaidOffer: Boolean(icp.hasPaidOffer),
        hasEmailList: Boolean(icp.hasEmailList),
        rightAudience: Boolean(icp.rightAudience),
        genericCopy: Boolean(icp.genericCopy),
        postedRecently: Boolean(icp.postedRecently),
      };
      icpFields = icpDataFrom(answers);
    }

    const client = await store.updateClient(user.id, id, {
      ...data,
      ...icpFields,
    });
    return NextResponse.json({ client });
  } catch (err) {
    console.error("client update error:", err);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const store = await getStore();
    const deleted = await store.deleteClient(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("client delete error:", err);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
