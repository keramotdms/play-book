"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client";
import {
  CLIENT_FILTERS,
  ClientDTO,
  ClientFilterId,
  filterClients,
  fmtRelative,
} from "@/lib/shared";
import {
  EmptyState,
  IcpBadge,
  StatusBadge,
  UserAvatar,
} from "@/components/app/ui-bits";
import { ClientFormDialog } from "@/components/app/client-form-dialog";
import { ClientDetailSheet } from "@/components/app/client-detail-sheet";

export function ClientsView({
  filter,
  onFilterChange,
  startWithAdd,
}: {
  filter: ClientFilterId;
  onFilterChange: (f: ClientFilterId) => void;
  startWithAdd: boolean;
}) {
  const qc = useQueryClient();
  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => api<{ clients: ClientDTO[] }>("/api/clients"),
  });
  const clients = clientsQuery.data?.clients ?? [];

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(startWithAdd);
  const [editing, setEditing] = useState<ClientDTO | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base = filterClients(clients, filter);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) =>
      [c.name, c.email, c.niche].some((v) => v.toLowerCase().includes(q))
    );
  }, [clients, filter, search]);

  const counts = useMemo(() => {
    const map = new Map<ClientFilterId, number>();
    for (const f of CLIENT_FILTERS) {
      map.set(f.id, filterClients(clients, f.id).length);
    }
    return map;
  }, [clients]);

  const selectedClient = selectedId
    ? clients.find((c) => c.id === selectedId) ?? null
    : null;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            Clients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} tracked · every view filters the same underlying list.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden /> Add client
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Client views"
        className="custom-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {CLIENT_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            role="tab"
            aria-selected={filter === f.id}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {f.label}
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                filter === f.id ? "text-primary-foreground/80" : "text-muted-foreground/70"
              )}
            >
              {counts.get(f.id) ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or niche…"
          className="pl-8"
          aria-label="Search clients"
        />
      </div>

      {clientsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              image="/images/empty-state.png"
              title="No clients yet"
              body="Add your first prospect and run the ICP checklist — the journey starts at New — Not Contacted."
              action={
                <Button onClick={openAdd}>
                  <Plus className="h-4 w-4" aria-hidden /> Add client
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              title="Nobody matches this view"
              body="Try a different filter or clear the search to see the full list."
            />
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className="w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar url={c.imageUrl} name={c.name} className="h-10 w-10" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.niche || "No niche"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <IcpBadge tier={c.icpTier} score={c.icpScore} />
                  <span className="text-xs text-muted-foreground">
                    Updated {fmtRelative(c.updatedAt)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["clients"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />
      <ClientDetailSheet
        client={selectedClient}
        onClose={() => setSelectedId(null)}
        onEdit={(c) => {
          setEditing(c);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
