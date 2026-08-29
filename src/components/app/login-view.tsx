"use client";

import { FormEvent, useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, saveSessionToken } from "@/lib/client";
import { UserDTO } from "@/lib/shared";

export function LoginView({ onSuccess }: { onSuccess: (user: UserDTO) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ user: UserDTO; token?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.token) saveSessionToken(res.token);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(60rem_40rem_at_50%_-10%,#e6ead9,transparent)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/icons/icon-192.png"
            alt="Copy Playbook logo"
            className="mb-3 h-14 w-14 rounded-2xl"
          />
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Copy Playbook
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clients, scripts &amp; lessons — your outreach, organized.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <LockKeyhole className="h-4 w-4" aria-hidden />
              )}
              Sign in
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-xl border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Sandbox account</p>
          <p className="mt-0.5">
            This personal single-user app seeds one account automatically (no public
            sign-up):
          </p>
          <p className="mt-1 font-mono text-[11px]">demo@copyplaybook.app · demo1234</p>
        </div>
      </div>
    </div>
  );
}
