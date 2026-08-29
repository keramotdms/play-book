"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CircleUserRound,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, clearSessionToken } from "@/lib/client";
import { ClientFilterId, UserDTO } from "@/lib/shared";
import { UserAvatar } from "@/components/app/ui-bits";
import { DashboardView } from "@/components/app/dashboard-view";
import { ClientsView } from "@/components/app/clients-view";
import { ScriptsView } from "@/components/app/scripts-view";
import { LearnView } from "@/components/app/learn-view";
import { ProfileView } from "@/components/app/profile-view";

export type ViewId = "dashboard" | "clients" | "scripts" | "learn" | "profile";

const NAV: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Users },
  { id: "scripts", label: "Scripts", icon: ScrollText },
  { id: "learn", label: "Learn", icon: GraduationCap },
  { id: "profile", label: "Profile", icon: CircleUserRound },
];

export function AppShell({ user }: { user: UserDTO }) {
  const [view, setView] = useState<ViewId>("dashboard");
  const [clientFilter, setClientFilter] = useState<ClientFilterId>("all");
  const [addClientSignal, setAddClientSignal] = useState(0);
  const qc = useQueryClient();

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      clearSessionToken();
      // Reset + refetch mounted queries: "me" now returns 401 -> login screen.
      await qc.resetQueries();
    }
  };

  const openClients = (filter?: ClientFilterId, add?: boolean) => {
    if (filter) setClientFilter(filter);
    if (add) setAddClientSignal((s) => s + 1);
    setView("clients");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img
            src="/icons/icon-192.png"
            alt="Copy Playbook logo"
            className="h-9 w-9 rounded-lg"
          />
          <span className="font-serif text-lg font-semibold tracking-tight">
            Copy Playbook
          </span>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                view === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="flex items-center gap-2.5">
            <UserAvatar
              url={user.avatarUrl}
              name={user.displayName || user.email}
              className="h-8 w-8"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.displayName || "Copywriter"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-192.png"
            alt="Copy Playbook logo"
            className="h-7 w-7 rounded-md"
          />
          <span className="font-serif font-semibold">Copy Playbook</span>
        </div>
        <UserAvatar
          url={user.avatarUrl}
          name={user.displayName || user.email}
          className="h-8 w-8"
        />
      </header>

      <div className="flex min-h-screen flex-col pb-16 md:pl-60 md:pb-0">
        <main className="flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-10">
          {view === "dashboard" && (
            <DashboardView
              user={user}
              onOpenClients={openClients}
              onOpenLearn={() => setView("learn")}
            />
          )}
          {view === "clients" && (
            <ClientsView
              key={addClientSignal}
              filter={clientFilter}
              onFilterChange={setClientFilter}
              startWithAdd={addClientSignal > 0}
            />
          )}
          {view === "scripts" && <ScriptsView />}
          {view === "learn" && <LearnView />}
          {view === "profile" && <ProfileView user={user} onLogout={logout} />}
        </main>

        <footer className="mt-auto border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:px-6 md:pb-3 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Copy Playbook · Your outreach, organized.</span>
            <span className="hidden sm:inline">Personal workspace — {user.email}</span>
          </div>
        </footer>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      >
        <div className="grid h-16 grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                view === item.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
