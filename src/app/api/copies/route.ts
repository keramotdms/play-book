import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const store = await getStore();
    const [copies, clients] = await Promise.all([
      store.listCopies(user.id),
      store.listClients(user.id),
    ]);
    const nameById = new Map(clients.map((c) => [c.id, c.name]));
    return NextResponse.json({
      copies: copies.map((c) => ({
        ...c,
        clientName: c.clientIdRef ? nameById.get(c.clientIdRef) ?? null : null,
      })),
    });
  } catch (err) {
    console.error("copies list error:", err);
    return NextResponse.json({ error: "Failed to load copies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = str(body.title).trim();
    const copyBody = str(body.body).trim();
    if (!title || !copyBody) {
      return NextResponse.json(
        { error: "Title and body are required." },
        { status: 400 }
      );
    }

    const store = await getStore();
    const copy = await store.createCopy(user.id, {
      title,
      body: copyBody,
      nicheTag: str(body.nicheTag) || "Other",
      framework: str(body.framework) || "custom",
      clientIdRef: str(body.clientIdRef) || null,
    });
    return NextResponse.json({ copy: { ...copy, clientName: null } }, { status: 201 });
  } catch (err) {
    console.error("copy create error:", err);
    return NextResponse.json({ error: "Failed to create copy" }, { status: 500 });
  }
}
