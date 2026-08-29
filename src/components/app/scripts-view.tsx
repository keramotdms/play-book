"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, copyText } from "@/lib/client";
import {
  ClientDTO,
  CopyDTO,
  FRAMEWORKS,
  NICHES,
  ScriptDTO,
  ScriptType,
  scriptTypeLabel,
} from "@/lib/shared";
import { EmptyState } from "@/components/app/ui-bits";

const TYPE_BADGE: Record<ScriptType, string> = {
  initial: "bg-amber-100 text-amber-800 border-amber-200",
  followup_1: "bg-orange-100 text-orange-800 border-orange-200",
  followup_2: "bg-violet-100 text-violet-800 border-violet-200",
};

export function ScriptsView() {
  const qc = useQueryClient();
  const scriptsQuery = useQuery({
    queryKey: ["scripts"],
    queryFn: () => api<{ scripts: ScriptDTO[] }>("/api/scripts"),
  });
  const copiesQuery = useQuery({
    queryKey: ["copies"],
    queryFn: () => api<{ copies: CopyDTO[] }>("/api/copies"),
  });
  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => api<{ clients: ClientDTO[] }>("/api/clients"),
  });

  const [sort, setSort] = useState<"newest" | "converting">("newest");
  const [scriptDialog, setScriptDialog] = useState<{ open: boolean; editing: ScriptDTO | null }>({
    open: false,
    editing: null,
  });
  const [copyDialog, setCopyDialog] = useState<{ open: boolean; editing: CopyDTO | null }>({
    open: false,
    editing: null,
  });
  const [nicheFilter, setNicheFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");

  const scripts = scriptsQuery.data?.scripts ?? [];
  const sortedScripts = useMemo(() => {
    const arr = [...scripts];
    if (sort === "converting") {
      arr.sort(
        (a, b) =>
          (b.stats?.ratio ?? -1) - (a.stats?.ratio ?? -1) ||
          (b.stats?.uses ?? 0) - (a.stats?.uses ?? 0)
      );
    } else {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return arr;
  }, [scripts, sort]);

  const copies = useMemo(() => {
    return (copiesQuery.data?.copies ?? []).filter(
      (c) =>
        (nicheFilter === "all" || c.nicheTag === nicheFilter) &&
        (frameworkFilter === "all" || c.framework === frameworkFilter)
    );
  }, [copiesQuery.data, nicheFilter, frameworkFilter]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["scripts"] });
    qc.invalidateQueries({ queryKey: ["copies"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const removeScript = async (s: ScriptDTO) => {
    try {
      await api(`/api/scripts/${s.id}`, { method: "DELETE" });
      toast.success("Script deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const removeCopy = async (c: CopyDTO) => {
    try {
      await api(`/api/copies/${c.id}`, { method: "DELETE" });
      toast.success("Copy deleted.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          Scripts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates you send — and copy you’ve actually written for clients.
        </p>
      </header>

      <Tabs defaultValue="outreach">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="outreach">Outreach Scripts</TabsTrigger>
          <TabsTrigger value="copies">Copies</TabsTrigger>
        </TabsList>

        <TabsContent value="outreach" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "converting")}>
              <SelectTrigger className="w-44" aria-label="Sort scripts">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="converting">Best converting</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setScriptDialog({ open: true, editing: null })}>
              <Plus className="h-4 w-4" aria-hidden /> New script
            </Button>
          </div>

          {scriptsQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : sortedScripts.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <EmptyState
                  title="No scripts yet"
                  body="Starter scripts like Direct Offer and Curiosity-Led are seeded on first run — edit them or add your own."
                />
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {sortedScripts.map((s) => (
                <li key={s.id}>
                  <Card className="h-full shadow-sm">
                    <CardContent className="flex h-full flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">{s.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className={TYPE_BADGE[s.type]}>
                              {scriptTypeLabel(s.type)}
                            </Badge>
                            {s.tags.map((t) => (
                              <Badge key={t} variant="secondary" className="font-normal">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {s.stats &&
                          (s.stats.ratio === null ? (
                            <Badge variant="secondary" className="shrink-0 font-normal">
                              Not enough data yet
                            </Badge>
                          ) : (
                            <Badge className="shrink-0 bg-primary text-primary-foreground">
                              {s.stats.ratio}% reply rate
                            </Badge>
                          ))}
                      </div>
                      <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                        {s.body}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <span className="text-xs text-muted-foreground">
                          {s.stats
                            ? `${s.stats.uses} use${s.stats.uses === 1 ? "" : "s"} · ${s.stats.wins} replied`
                            : ""}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const ok = await copyText(s.body);
                              if (ok) toast.success("Script copied to clipboard.");
                              else toast.error("Copy failed.");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setScriptDialog({ open: true, editing: s })}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Delete script ${s.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete “{s.title}”?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Existing clients keep their recorded usage history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeScript(s)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="copies" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={nicheFilter} onValueChange={setNicheFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by niche">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All niches</SelectItem>
                {NICHES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by framework">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All frameworks</SelectItem>
                {FRAMEWORKS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCopyDialog({ open: true, editing: null })}>
              <Plus className="h-4 w-4" aria-hidden /> Add copy
            </Button>
          </div>

          {copiesQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : copies.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <EmptyState
                  title="No copies saved yet"
                  body="Save real copy you write for clients here — a personal portfolio, filterable by niche and framework."
                />
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {copies.map((c) => (
                <li key={c.id}>
                  <Card className="h-full shadow-sm">
                    <CardContent className="flex h-full flex-col p-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{c.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="font-normal">
                            {c.nicheTag}
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {c.framework}
                          </Badge>
                          {c.clientName && (
                            <span className="text-xs text-muted-foreground">
                              For: {c.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                        {c.body}
                      </p>
                      <div className="mt-auto flex justify-end gap-1 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCopyDialog({ open: true, editing: c })}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Delete copy ${c.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete “{c.title}”?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This copy will be removed from your library permanently.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeCopy(c)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ScriptDialog
        open={scriptDialog.open}
        editing={scriptDialog.editing}
        onOpenChange={(o) => setScriptDialog((s) => ({ ...s, open: o }))}
        onSaved={invalidate}
      />
      <CopyDialog
        open={copyDialog.open}
        editing={copyDialog.editing}
        clients={clientsQuery.data?.clients ?? []}
        onOpenChange={(o) => setCopyDialog((s) => ({ ...s, open: o }))}
        onSaved={invalidate}
      />
    </div>
  );
}

function ScriptDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ScriptDTO | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<ScriptType>("initial");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setBody(editing?.body ?? "");
    setType(editing?.type ?? "initial");
    setTags(editing?.tags.join(", ") ?? "");
  }, [open, editing]);

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = JSON.stringify({ title, body, type, tags });
      if (editing) {
        await api(`/api/scripts/${editing.id}`, { method: "PATCH", body: payload });
      } else {
        await api("/api/scripts", { method: "POST", body: payload });
      }
      toast.success(editing ? "Script updated." : "Script added.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="custom-scrollbar max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {editing ? "Edit script" : "New script"}
          </DialogTitle>
          <DialogDescription>
            Scripts appear automatically in the matching send dialog on a client.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="s-title">Title *</Label>
            <Input
              id="s-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Direct Offer v2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ScriptType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial</SelectItem>
                  <SelectItem value="followup_1">Follow-up 1</SelectItem>
                  <SelectItem value="followup_2">Follow-up 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-tags">Tags</Label>
              <Input
                id="s-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="cold DM, warm intro, follow-up"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-body">Body *</Label>
            <Textarea
              id="s-body"
              rows={8}
              className="font-mono text-[13px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{name}} — …"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Add script"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CopyDialog({
  open,
  onOpenChange,
  editing,
  clients,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: CopyDTO | null;
  clients: ClientDTO[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [nicheTag, setNicheTag] = useState<string>("Other");
  const [framework, setFramework] = useState<string>("custom");
  const [clientIdRef, setClientIdRef] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setBody(editing?.body ?? "");
    setNicheTag(editing?.nicheTag ?? "Other");
    setFramework(editing?.framework ?? "custom");
    setClientIdRef(editing?.clientIdRef ?? "none");
  }, [open, editing]);

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = JSON.stringify({
        title,
        body,
        nicheTag,
        framework,
        clientIdRef: clientIdRef === "none" ? "" : clientIdRef,
      });
      if (editing) {
        await api(`/api/copies/${editing.id}`, { method: "PATCH", body: payload });
      } else {
        await api("/api/copies", { method: "POST", body: payload });
      }
      toast.success(editing ? "Copy updated." : "Copy saved to your library.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="custom-scrollbar max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {editing ? "Edit copy" : "Add copy"}
          </DialogTitle>
          <DialogDescription>
            A library of copy you’ve actually written — a personal reference, not for
            sending.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-title">Title *</Label>
            <Input
              id="cp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Welcome sequence — Jane Coach"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Niche</Label>
              <Select value={nicheTag} onValueChange={setNicheTag}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Framework</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Written for (optional)</Label>
              <Select value={clientIdRef} onValueChange={setClientIdRef}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— none —</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-body">The copy *</Label>
            <Textarea
              id="cp-body"
              rows={8}
              className="font-mono text-[13px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Subject: …"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Add copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
