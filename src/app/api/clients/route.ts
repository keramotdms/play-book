import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { icpDataFrom, IcpAnswers } from "@/lib/domain";

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const store = await getStore();
    // Lazy cold-lead evaluation on client list load (see spec assumptions).
    await store.sweepColdLeads(user.id);
    const clients = await store.listClients(user.id);
    return NextResponse.json({ clients });
  } catch (err) {
    console.error("clients list error:", err);
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = str(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const icp = (body.icp ?? {}) as Record<string, unknown>;
    const answers: IcpAnswers = {
      hasPaidOffer: Boolean(icp.hasPaidOffer),
      hasEmailList: Boolean(icp.hasEmailList),
      rightAudience: Boolean(icp.rightAudience),
      genericCopy: Boolean(icp.genericCopy),
      postedRecently: Boolean(icp.postedRecently),
    };

    const store = await getStore();
    const client = await store.createClient(user.id, {
      name,
      niche: str(body.niche),
      email: str(body.email),
      phone: str(body.phone),
      socialLinkedin: str(body.socialLinkedin),
      socialInstagram: str(body.socialInstagram),
      socialX: str(body.socialX),
      socialOther: str(body.socialOther),
      imageUrl: str(body.imageUrl),
      notes: str(body.notes),
      status: "new",
      ...icpDataFrom(answers),
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    console.error("client create error:", err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
