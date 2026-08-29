import "server-only";
import {
  ClientDTO,
  DashboardDTO,
  PlanItem,
  ScriptStats,
  STATUS_LIST,
  tierFromScore,
} from "@/lib/shared";

export const DAY_MS = 86_400_000;
export const COLD_LEAD_DAYS = 7;

export interface IcpAnswers {
  hasPaidOffer: boolean;
  hasEmailList: boolean;
  rightAudience: boolean;
  genericCopy: boolean;
  postedRecently: boolean;
}

export function icpDataFrom(a: IcpAnswers) {
  const icpScore = Object.values(a).filter(Boolean).length;
  return {
    icpScore,
    icpTier: tierFromScore(icpScore),
    icpHasPaidOffer: a.hasPaidOffer,
    icpHasEmailList: a.hasEmailList,
    icpRightAudience: a.rightAudience,
    icpGenericCopy: a.genericCopy,
    icpPostedRecently: a.postedRecently,
  };
}

/** Shape of a data-store Client row (dates still Date objects on the server). */
export interface DashClient {
  id: string;
  name: string;
  niche: string;
  email: string;
  phone: string;
  socialLinkedin: string;
  socialInstagram: string;
  socialX: string;
  socialOther: string;
  imageUrl: string;
  icpScore: number;
  icpTier: string;
  icpHasPaidOffer: boolean;
  icpHasEmailList: boolean;
  icpRightAudience: boolean;
  icpGenericCopy: boolean;
  icpPostedRecently: boolean;
  status: string;
  scriptUsedInitial: string | null;
  scriptUsedFollowup1: string | null;
  scriptUsedFollowup2: string | null;
  outreachSentAt: Date | null;
  followUp1SentAt: Date | null;
  followUp2SentAt: Date | null;
  repliedAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export function computePlan(
  clients: { status: string; followUp2SentAt: Date | null }[]
): PlanItem[] {
  const items: PlanItem[] = [];
  const plural = (n: number) => (n === 1 ? "" : "s");

  const newCount = clients.filter((c) => c.status === "new").length;
  if (newCount > 0) {
    items.push({
      id: "new_outreach",
      kind: "new_outreach",
      count: newCount,
      filterId: "all",
      label: `Send outreach to ${newCount} new prospect${plural(newCount)}`,
    });
  }

  const followUps = clients.filter(
    (c) => c.status === "outreach_sent" || c.status === "follow_up_1_sent"
  ).length;
  if (followUps > 0) {
    items.push({
      id: "follow_up",
      kind: "follow_up",
      count: followUps,
      filterId: "need_followup",
      label: `Follow up with ${followUps} lead${plural(followUps)} today`,
    });
  }

  const expiring = clients.filter((c) => {
    if (c.status !== "follow_up_2_sent" || !c.followUp2SentAt) return false;
    const days = Math.floor((Date.now() - c.followUp2SentAt.getTime()) / DAY_MS);
    return days >= 5 && days < COLD_LEAD_DAYS;
  }).length;
  if (expiring > 0) {
    items.push({
      id: "expiring",
      kind: "expiring",
      count: expiring,
      filterId: "waiting",
      label: `Check back on ${expiring} lead${plural(expiring)} whose 7-day window closes soon`,
    });
  }

  const cold = clients.filter((c) => c.status === "cold_lead").length;
  if (cold > 0) {
    items.push({
      id: "cold_review",
      kind: "cold_review",
      count: cold,
      filterId: "cold",
      label: `Review ${cold} cold lead${plural(cold)} — reopen if they replied late`,
    });
  }

  return items;
}

function touchesOf(c: DashClient): number {
  return [c.outreachSentAt, c.followUp1SentAt, c.followUp2SentAt, c.repliedAt].filter(
    Boolean
  ).length;
}

function toDTO(c: DashClient): ClientDTO {
  return c as unknown as ClientDTO; // Dates serialize to ISO strings in JSON
}

export function buildDashboard(
  clients: DashClient[],
  learnCompleted: number,
  learnTotal: number
): DashboardDTO {
  const total = clients.length;
  const activeLeads = clients.filter((c) => c.status === "replied").length;
  const contacted = clients.filter((c) => c.status !== "new").length;
  const positive = clients.filter(
    (c) => c.status === "replied" || c.status === "client"
  ).length;
  const sold = clients.filter((c) => c.status === "client").length;
  const followUpsRemaining = clients.filter(
    (c) => c.status === "outreach_sent" || c.status === "follow_up_1_sent"
  ).length;

  const pipeline = STATUS_LIST.map((status) => ({
    status,
    count: clients.filter((c) => c.status === status).length,
  }));

  const bestClient = [...clients].sort(
    (a, b) => b.icpScore - a.icpScore || b.updatedAt.getTime() - a.updatedAt.getTime()
  )[0];

  const engagedPool = clients.filter(
    (c) => c.status === "replied" || c.status === "client"
  );
  const mostEngaged = engagedPool.length
    ? [...engagedPool].sort(
        (a, b) =>
          touchesOf(b) - touchesOf(a) || b.updatedAt.getTime() - a.updatedAt.getTime()
      )[0]
    : null;

  const plan = computePlan(
    clients.map((c) => ({ status: c.status, followUp2SentAt: c.followUp2SentAt }))
  );

  return {
    totals: {
      tracked: total,
      activeLeads,
      replyRate: contacted === 0 ? 0 : Math.round((positive / contacted) * 100),
      soldClients: sold,
      followUpsRemaining,
      activeClients: sold,
    },
    pipeline,
    bestClient: bestClient ? toDTO(bestClient) : null,
    mostEngaged: mostEngaged
      ? { ...toDTO(mostEngaged), touches: touchesOf(mostEngaged) }
      : null,
    learn: {
      completed: learnCompleted,
      total: learnTotal,
      pct: learnTotal === 0 ? 0 : Math.round((learnCompleted / learnTotal) * 100),
    },
    plan,
  };
}

export function normalizeTags(tags: unknown): string {
  const arr = Array.isArray(tags)
    ? tags.map((t) => (typeof t === "string" ? t : "")).map((t) => t.trim())
    : (typeof tags === "string" ? tags : "").split(",");
  return arr
    .map((t) => t.trim())
    .filter(Boolean)
    .join(",");
}

export function computeScriptStats(
  scriptId: string,
  clients: {
    status: string;
    scriptUsedInitial: string | null;
    scriptUsedFollowup1: string | null;
    scriptUsedFollowup2: string | null;
  }[]
): ScriptStats {
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
