"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ClientStatus,
  STATUS_META,
  IcpTier,
  TIER_META,
  initials,
} from "@/lib/shared";
import type { LucideIcon } from "lucide-react";

export function StatusBadge({
  status,
  short = true,
  className,
}: {
  status: ClientStatus;
  short?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("font-medium", meta.badge, className)}>
      {short ? meta.short : meta.label}
    </Badge>
  );
}

export function IcpBadge({
  tier,
  score,
  className,
}: {
  tier: IcpTier;
  score?: number;
  className?: string;
}) {
  const meta = TIER_META[tier];
  return (
    <Badge variant="outline" className={cn("font-medium", meta.badge, className)}>
      ICP {score !== undefined ? `${score}/5 · ` : ""}
      {meta.label}
    </Badge>
  );
}

export function UserAvatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name: string;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {url ? <AvatarImage src={url} alt={name} /> : null}
      <AvatarFallback className="bg-accent font-semibold text-accent-foreground">
        {initials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-lg bg-accent p-2 text-accent-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  image,
  icon: Icon,
  title,
  body,
  action,
}: {
  image?: string;
  icon?: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {image ? (
        <img
          src={image}
          alt=""
          aria-hidden
          className="mb-4 w-56 max-w-full rounded-2xl"
        />
      ) : Icon ? (
        <div className="mb-3 rounded-full bg-accent p-3 text-accent-foreground">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PipelineChart({
  data,
}: {
  data: { status: ClientStatus; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const meta = STATUS_META[d.status];
        return (
          <div key={d.status} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-muted-foreground sm:w-36">
              {meta.short}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", meta.dot)}
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs font-semibold tabular-nums">
              {d.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
