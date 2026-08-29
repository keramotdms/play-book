"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  MessageCircle,
  RefreshCw,
  Send,
  Snowflake,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client";
import {
  ClientFilterId,
  DashboardDTO,
  PlanItem,
  UserDTO,
} from "@/lib/shared";
import {
  EmptyState,
  IcpBadge,
  PipelineChart,
  StatCard,
  StatusBadge,
  UserAvatar,
} from "@/components/app/ui-bits";

const PLAN_ICONS: Record<PlanItem["kind"], LucideIcon> = {
  new_outreach: Send,
  follow_up: Bell,
  expiring: AlarmClock,
  cold_review: Snowflake,
  lesson: BookOpen,
  all_done: CheckCircle2,
};

const MINUTE = 60_000;

/** Hydration-safe ticking clock (updates once a minute, no effects needed). */
function useTimeBucket(): number {
  const subscribe = (onStoreChange: () => void) => {
    const id = setInterval(onStoreChange, MINUTE);
    return () => clearInterval(id);
  };
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / MINUTE),
    () => 0
  );
}

export function DashboardView({
  user,
  onOpenClients,
  onOpenLearn,
}: {
  user: UserDTO;
  onOpenClients: (filter?: ClientFilterId, add?: boolean) => void;
  onOpenLearn: () => void;
}) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardDTO>("/api/dashboard"),
  });

  const bucket = useTimeBucket();
  const now = bucket > 0 ? new Date(bucket * MINUTE) : null;
  const hour = now ? now.getHours() : null;
  const greeting =
    hour === null
      ? "Welcome back"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  const today = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const firstName = user.displayName.trim().split(/\s+/)[0] || "there";

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="mx-auto mt-10 max-w-md shadow-sm">
        <CardContent className="p-6 text-center">
          <p className="font-medium">Couldn’t load the dashboard.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4" aria-hidden /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const t = data.totals;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          {greeting}, {firstName}
        </h1>
        {today && <p className="mt-1 text-sm text-muted-foreground">{today}</p>}
      </header>

      <section aria-label="Key stats" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total tracked" value={t.tracked} sub="clients in your playbook" icon={Users} />
        <StatCard label="Active leads" value={t.activeLeads} sub="conversation running" icon={MessageCircle} />
        <StatCard label="Reply rate" value={`${t.replyRate}%`} sub="of contacted prospects" icon={TrendingUp} />
        <StatCard label="Sold clients" value={t.soldClients} sub="closed & won" icon={Trophy} />
      </section>

      <section aria-label="Activity" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Follow-ups remaining" value={t.followUpsRemaining} sub="a nudge is pending" icon={Bell} />
        <StatCard label="Active clients" value={t.activeClients} sub="currently sold & serving" icon={Trophy} />
        <StatCard
          label="Learn progress"
          value={`${data.learn.pct}%`}
          sub={`${data.learn.completed}/${data.learn.total} lessons complete`}
          icon={BookOpen}
        />
      </section>

      {t.tracked === 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              image="/images/empty-state.png"
              title="Your playbook is empty — and that’s the plan."
              body="Add your first prospect, run the ICP checklist, and every number on this page fills in from real data. Nothing is simulated and nothing is pre-checked."
              action={
                <Button onClick={() => onOpenClients(undefined, true)}>
                  Add your first client
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      <section aria-label="Spotlights and pipeline" className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Spotlight
            </CardTitle>
            <CardDescription>Your best fit and your warmest conversation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.bestClient ? (
              <button
                onClick={() => onOpenClients("best")}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent"
              >
                <UserAvatar url={data.bestClient.imageUrl} name={data.bestClient.name} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <Crown className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                    {data.bestClient.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Highest ICP score in your book
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <IcpBadge tier={data.bestClient.icpTier} score={data.bestClient.icpScore} />
                  <StatusBadge status={data.bestClient.status} />
                </div>
              </button>
            ) : (
              <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                No best client yet — add prospects and score them with the ICP checklist.
              </p>
            )}
            {data.mostEngaged ? (
              <button
                onClick={() => onOpenClients("active_leads")}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent"
              >
                <UserAvatar url={data.mostEngaged.imageUrl} name={data.mostEngaged.name} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <Flame className="h-3.5 w-3.5 shrink-0 text-[#b26843]" aria-hidden />
                    {data.mostEngaged.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {data.mostEngaged.touches} recorded touches — furthest along the funnel
                  </p>
                </div>
                <div className="flex shrink-0 items-end">
                  <StatusBadge status={data.mostEngaged.status} />
                </div>
              </button>
            ) : (
              <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                No active conversations yet — mark a lead as replied to see engagement here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline status</CardTitle>
            <CardDescription>How many clients sit at each stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineChart data={data.pipeline} />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Next day plan">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden /> Next day plan
            </CardTitle>
            <CardDescription>
              Auto-generated from your pipeline and lessons — click an item to jump there.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.plan.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                You’re all caught up. Add new prospects or enjoy the win.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.plan.map((item) => {
                  const Icon = PLAN_ICONS[item.kind] ?? Bell;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() =>
                          item.kind === "lesson" ? onOpenLearn() : onOpenClients(item.filterId ?? "all")
                        }
                        className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="rounded-lg bg-accent p-2 text-accent-foreground">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
