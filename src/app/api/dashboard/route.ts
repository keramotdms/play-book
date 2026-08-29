import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { buildDashboard } from "@/lib/domain";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const store = await getStore();
    // Lazy cold-lead evaluation on dashboard load (see spec assumptions).
    await store.sweepColdLeads(user.id);

    const [clients, lessons] = await Promise.all([
      store.listClients(user.id),
      store.listLessons(user.id),
    ]);
    const learnCompleted = lessons.filter((l) => l.completed).length;

    const dashboard = buildDashboard(clients, learnCompleted, lessons.length);
    return NextResponse.json(dashboard);
  } catch (err) {
    console.error("dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
