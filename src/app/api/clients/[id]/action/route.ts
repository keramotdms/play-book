import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { ClientUpdate } from "@/lib/store/types";
import { ClientStatus } from "@/lib/shared";

type Ctx = { params: Promise<{ id: string }> };

type ActionName =
  | "send_outreach"
  | "follow_up_1"
  | "follow_up_2"
  | "mark_replied"
  | "mark_sold"
  | "mark_cold"
  | "reopen";

const ALLOWED_FROM: Record<ActionName, ClientStatus[]> = {
  send_outreach: ["new"],
  follow_up_1: ["outreach_sent"],
  follow_up_2: ["follow_up_1_sent"],
  mark_replied: ["outreach_sent", "follow_up_1_sent", "follow_up_2_sent", "cold_lead"],
  mark_sold: ["outreach_sent", "follow_up_1_sent", "follow_up_2_sent", "replied", "cold_lead"],
  mark_cold: ["outreach_sent", "follow_up_1_sent", "follow_up_2_sent", "replied"],
  reopen: ["cold_lead"],
};

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      scriptId?: string | null;
    };
    const action = body.action as ActionName;
    if (!action || !(action in ALLOWED_FROM)) {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const store = await getStore();
    const client = await store.getClient(user.id, id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    if (!ALLOWED_FROM[action].includes(client.status as ClientStatus)) {
      return NextResponse.json(
        {
          error: `Action "${action}" is not available while the client is in status "${client.status}".`,
        },
        { status: 409 }
      );
    }

    const scriptId =
      typeof body.scriptId === "string" && body.scriptId.trim()
        ? body.scriptId.trim()
        : null;
    const now = new Date();
    let data: ClientUpdate;

    switch (action) {
      case "send_outreach":
        data = {
          status: "outreach_sent",
          scriptUsedInitial: scriptId,
          outreachSentAt: now,
        };
        break;
      case "follow_up_1":
        data = {
          status: "follow_up_1_sent",
          scriptUsedFollowup1: scriptId,
          followUp1SentAt: now,
        };
        break;
      case "follow_up_2":
        data = {
          status: "follow_up_2_sent",
          scriptUsedFollowup2: scriptId,
          followUp2SentAt: now,
        };
        break;
      case "mark_replied":
      case "reopen":
        data = { status: "replied", repliedAt: now };
        break;
      case "mark_sold":
        data = { status: "client" };
        break;
      case "mark_cold":
        data = { status: "cold_lead" };
        break;
    }

    const updated = await store.updateClient(user.id, id, data);
    return NextResponse.json({ client: updated });
  } catch (err) {
    console.error("client action error:", err);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
