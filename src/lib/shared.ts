// Client-safe constants, types and pure helpers shared by UI and API routes.

export type ClientStatus =
  | "new"
  | "outreach_sent"
  | "follow_up_1_sent"
  | "follow_up_2_sent"
  | "replied"
  | "client"
  | "cold_lead";

export type IcpTier = "best" | "potential" | "low_potential";
export type ScriptType = "initial" | "followup_1" | "followup_2";
export type IcpKey =
  | "hasPaidOffer"
  | "hasEmailList"
  | "rightAudience"
  | "genericCopy"
  | "postedRecently";

export const COLD_LEAD_DAYS = 7;

export interface StatusMeta {
  value: ClientStatus;
  label: string;
  short: string;
  badge: string;
  dot: string;
  order: number;
  hint: string;
}

export const STATUS_LIST: ClientStatus[] = [
  "new",
  "outreach_sent",
  "follow_up_1_sent",
  "follow_up_2_sent",
  "replied",
  "client",
  "cold_lead",
];

export const STATUS_META: Record<ClientStatus, StatusMeta> = {
  new: {
    value: "new",
    label: "New — Not Contacted",
    short: "New",
    badge: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400",
    order: 0,
    hint: "ICP checklist done. Time to send the first outreach message.",
  },
  outreach_sent: {
    value: "outreach_sent",
    label: "Outreach Sent",
    short: "Outreach sent",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    order: 1,
    hint: "Give it a few days, then send Follow-up 1.",
  },
  follow_up_1_sent: {
    value: "follow_up_1_sent",
    label: "Need Another Follow-up",
    short: "Follow-up 1 sent",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
    order: 2,
    hint: "One more nudge to go — send Follow-up 2.",
  },
  follow_up_2_sent: {
    value: "follow_up_2_sent",
    label: "Waiting for Response (follow-ups done)",
    short: "Waiting",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    dot: "bg-violet-400",
    order: 3,
    hint: "All follow-ups sent. If no reply within 7 days they turn into a cold lead.",
  },
  replied: {
    value: "replied",
    label: "Active Lead — Conversation Running",
    short: "Active lead",
    badge: "bg-[#E3EAD9] text-[#3D4A32] border-[#C9D6BB]",
    dot: "bg-[#7C8F6F]",
    order: 4,
    hint: "Conversation running — aim for a call, then close.",
  },
  client: {
    value: "client",
    label: "Sold Client",
    short: "Sold",
    badge: "bg-[#3D4A32] text-[#F2F0E4] border-[#3D4A32]",
    dot: "bg-[#3D4A32]",
    order: 5,
    hint: "Won! Deliver well and collect a testimonial.",
  },
  cold_lead: {
    value: "cold_lead",
    label: "Cold Lead",
    short: "Cold",
    badge: "bg-stone-100 text-stone-400 border-stone-200",
    dot: "bg-stone-300",
    order: 6,
    hint: "No reply within the 7-day window. Reopen if they respond late.",
  },
};

export function tierFromScore(score: number): IcpTier {
  if (score >= 4) return "best";
  if (score >= 2) return "potential";
  return "low_potential";
}

export const ICP_CHECKLIST: { key: IcpKey; label: string }[] = [
  { key: "hasPaidOffer", label: "Has a clear paid offer" },
  { key: "hasEmailList", label: "Has an active email list or newsletter" },
  { key: "rightAudience", label: "Follower/list size roughly 1K–10K" },
  { key: "genericCopy", label: "Current copy looks generic or outdated" },
  { key: "postedRecently", label: "Posted in the last 30 days" },
];

export const TIER_META: Record<IcpTier, { label: string; badge: string }> = {
  best: { label: "Best fit", badge: "bg-[#E3EAD9] text-[#3D4A32] border-[#C9D6BB]" },
  potential: { label: "Potential", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  low_potential: { label: "Low potential", badge: "bg-rose-100 text-rose-700 border-rose-200" },
};

export const NICHES = ["Career Coach", "Health Coach", "Course Creator", "Other"] as const;
export const FRAMEWORKS = ["AIDA", "PAS", "4 Ps", "custom"] as const;

export const CLIENT_FILTERS = [
  { id: "all", label: "Overview" },
  { id: "best", label: "Best client" },
  { id: "potential", label: "Potential clients" },
  { id: "active_leads", label: "Active leads" },
  { id: "sold", label: "Sold client" },
  { id: "need_followup", label: "Need to follow-up" },
  { id: "followup_done", label: "Follow-up done" },
  { id: "waiting", label: "Waiting for response" },
  { id: "cold", label: "Cold client" },
] as const;

export type ClientFilterId = (typeof CLIENT_FILTERS)[number]["id"];

export function filterClients<T extends { status: string; icpTier: string }>(
  clients: T[],
  filter: ClientFilterId
): T[] {
  switch (filter) {
    case "all":
      return clients;
    case "best":
      return clients.filter((c) => c.icpTier === "best");
    case "potential":
      return clients.filter((c) => c.icpTier === "potential");
    case "active_leads":
      return clients.filter((c) => c.status === "replied");
    case "sold":
      return clients.filter((c) => c.status === "client");
    case "need_followup":
      return clients.filter((c) => c.status === "outreach_sent" || c.status === "follow_up_1_sent");
    case "followup_done":
    case "waiting":
      return clients.filter((c) => c.status === "follow_up_2_sent");
    case "cold":
      return clients.filter((c) => c.status === "cold_lead");
    default:
      return clients;
  }
}

export const CURRICULUM: { module: string; lessons: string[] }[] = [
  {
    module: "1. Copywriting Foundations",
    lessons: [
      "What direct-response copywriting is, and how it differs from branding/content writing",
      "Understanding your reader: voice-of-customer research and pain points",
      "The AIDA framework, with examples",
      "The PAS framework, with examples",
      "Headlines and subject lines: what makes people keep reading",
    ],
  },
  {
    module: "2. Email Copywriting",
    lessons: [
      "Anatomy of a high-converting sales email",
      "Welcome sequences: the first 3 emails a new subscriber should get",
      "Cart-abandonment and re-engagement emails",
      "Writing subject lines that get opened, not just written",
    ],
  },
  {
    module: "3. Sales Pages & Landing Pages",
    lessons: [
      "The structure of a long-form sales page",
      "Writing a hero section and primary CTA",
      "Handling objections in copy",
      "Social proof and testimonials: where and how to use them",
    ],
  },
  {
    module: "4. Finding & Qualifying Clients",
    lessons: [
      "Picking a profitable niche",
      "Building an ICP (ideal client profile) checklist",
      "Where to find prospects: platforms and search strategies",
      "Building proof without prior clients (spec work, swipe files)",
    ],
  },
  {
    module: "5. Outreach & Client Acquisition",
    lessons: [
      "Cold outreach message structures (Direct Offer vs Curiosity-Led)",
      "Following up without being annoying: timing and tone",
      "Pricing your first few projects",
      "Turning a free sample into a paid retainer",
    ],
  },
  {
    module: "6. Working With Clients",
    lessons: [
      "Onboarding a new client: what to ask before writing anything",
      "Giving and receiving revisions gracefully",
      "Setting boundaries and scope without losing the client",
      "Getting testimonials and referrals after a win",
    ],
  },
  {
    module: "7. Scaling to Consultant",
    lessons: [
      "Productizing your service (packages vs hourly vs retainer)",
      "Raising your rates as you gain proof",
      "Positioning yourself as a strategic partner, not just 'a writer'",
      "Building a referral engine so new leads come to you",
    ],
  },
];

export const UNCATEGORIZED_MODULE = "Uncategorized";
export const MODULE_NAMES: string[] = [
  ...CURRICULUM.map((m) => m.module),
  UNCATEGORIZED_MODULE,
];
export const MODULE_ORDER: Record<string, number> = Object.fromEntries(
  MODULE_NAMES.map((m, i) => [m, i + 1])
);

// ---------- DTOs (dates arrive as ISO strings over JSON) ----------

export interface ClientDTO {
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
  icpTier: IcpTier;
  icpHasPaidOffer: boolean;
  icpHasEmailList: boolean;
  icpRightAudience: boolean;
  icpGenericCopy: boolean;
  icpPostedRecently: boolean;
  status: ClientStatus;
  scriptUsedInitial: string | null;
  scriptUsedFollowup1: string | null;
  scriptUsedFollowup2: string | null;
  outreachSentAt: string | null;
  followUp1SentAt: string | null;
  followUp2SentAt: string | null;
  repliedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptStats {
  uses: number;
  wins: number;
  ratio: number | null; // null = not enough data yet (<3 uses)
}

export interface ScriptDTO {
  id: string;
  title: string;
  body: string;
  type: ScriptType;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  stats?: ScriptStats;
}

export interface CopyDTO {
  id: string;
  title: string;
  body: string;
  nicheTag: string;
  framework: string;
  clientIdRef: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string | null;
}

export interface LessonDTO {
  id: string;
  module: string;
  moduleOrder: number;
  lessonOrder: number;
  title: string;
  completed: boolean;
  isCustom: boolean;
  sourceUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  bio: string;
  avatarUrl: string;
}

export interface PlanItem {
  id: string;
  kind: "new_outreach" | "follow_up" | "expiring" | "cold_review" | "lesson" | "all_done";
  label: string;
  count?: number;
  filterId?: ClientFilterId;
}

export interface DashboardDTO {
  totals: {
    tracked: number;
    activeLeads: number;
    replyRate: number;
    soldClients: number;
    followUpsRemaining: number;
    activeClients: number;
  };
  pipeline: { status: ClientStatus; count: number }[];
  bestClient: ClientDTO | null;
  mostEngaged: (ClientDTO & { touches: number }) | null;
  learn: { completed: number; total: number; pct: number };
  plan: PlanItem[];
}

// ---------- formatting helpers ----------

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function scriptTypeLabel(type: ScriptType): string {
  switch (type) {
    case "initial":
      return "Initial";
    case "followup_1":
      return "Follow-up 1";
    case "followup_2":
      return "Follow-up 2";
  }
}
