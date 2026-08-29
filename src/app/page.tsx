"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { UserDTO } from "@/lib/shared";
import { LoginView } from "@/components/app/login-view";
import { AppShell } from "@/components/app/app-shell";

export default function Home() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  );
}

function Root() {
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: UserDTO }>("/api/auth/me"),
    staleTime: Infinity,
    retry: false,
  });

  if (meQuery.isPending) return <Splash />;
  if (meQuery.isError || !meQuery.data) {
    return (
      <LoginView
        onSuccess={(user) => {
          qc.setQueryData(["me"], { user });
          qc.invalidateQueries();
        }}
      />
    );
  }
  return <AppShell user={meQuery.data.user} />;
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img
        src="/icons/icon-512.png"
        alt="Copy Playbook"
        className="h-16 w-16 rounded-2xl"
      />
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Loading Copy Playbook…</span>
    </div>
  );
}
