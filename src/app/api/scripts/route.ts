import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { normalizeTags } from "@/lib/domain";
import { ScriptType } from "@/lib/shared";

const SCRIPT_TYPES: ScriptType[] = ["initial", "followup_1", "followup_2"];
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const store = await getStore();
    const [scripts, clients] = await Promise.all([
      store.listScripts(user.id),
      store.listClients(user.id),
    ]);

    return NextResponse.json({
      scripts: scripts.map((s) => ({
        ...s,
        tags: s.tags ? s.tags.split(",").filter(Boolean) : [],
        stats: computeStatsFor(s.id, clients),
      })),
    });
  } catch (err) {
    console.error("scripts list error:", err);
    return NextResponse.json({ error: "Failed to load scripts" }, { status: 500 });
  }
}

// Local alias to keep the route file's exports limited to handlers.
function computeStatsFor(
  scriptId: string,
  clients: {
    status: string;
    scriptUsedInitial: string | null;
    scriptUsedFollowup1: string | null;
    scriptUsedFollowup2: string | null;
  }[]
) {
  const used = clients.filter(
    (c) =>
      c.status !== "new" &&
      [c.scriptUsedInitial, c.scriptUsedFollowup1, c.scriptUsedFollowup2].includes(
        scriptId
      )
  );
  const wins = used.filter(
    (c) => c.status === "replied" || c.status === "client"
  ).length;
  return {
    uses: used.length,
    wins,
    // Fewer than 3 uses -> "not enough data yet" (null), per spec.
    ratio: used.length >= 3 ? Math.round((wins / used.length) * 100) : null,
  };
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = str(body.title).trim();
    const scriptBody = str(body.body).trim();
    const type = str(body.type) as ScriptType;
    if (!title || !scriptBody) {
      return NextResponse.json(
        { error: "Title and body are required." },
        { status: 400 }
      );
    }
    if (!SCRIPT_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid script type." }, { status: 400 });
    }

    const store = await getStore();
    const script = await store.createScript(user.id, {
      title,
      body: scriptBody,
      type,
      tags: normalizeTags(body.tags),
    });
    return NextResponse.json({ script }, { status: 201 });
  } catch (err) {
    console.error("script create error:", err);
    return NextResponse.json({ error: "Failed to create script" }, { status: 500 });
  }
}
