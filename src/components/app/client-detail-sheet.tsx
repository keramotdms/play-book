"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Check,
  Copy,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  Send,
  Snowflake,
  Trash2,
  Trophy,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api, copyText } from "@/lib/client";
import {
  ClientDTO,
  COLD_LEAD_DAYS,
  daysSince,
  fmtDateTime,
  ScriptDTO,
  ScriptType,
  scriptTypeLabel,
  STATUS_META,
} from "@/lib/shared";
import { IcpBadge, StatusBadge, UserAvatar } from "@/components/app/ui-bits";

type SendConfig = {
  action: "send_outreach" | "follow_up_1" | "follow_up_2";
  type: ScriptType;
};

const SEND_TITLES: Record<ScriptType, string> = {
  initial: "Send outreach message",
  followup_1: "Send Follow-up 1",
  followup_2: "Send Follow-up 2",
};

export function ClientDetailSheet({
  client,
  onClose,
  onEdit,
}: {
  client: ClientDTO | null;
  onClose: () => void;
  onEdit: (c: ClientDTO) => void;
}) {
  const qc = useQueryClient();
  const [sendConfig, setSendConfig] = useState<SendConfig | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(client?.notes ?? "");
  }, [client?.id, client?.notes]);

  const scriptsQuery = useQuery({
    queryKey: ["scripts"],
    queryFn: () => api<{ scripts: ScriptDTO[] }>("/api/scripts"),
    enabled: !!client,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["scripts"] });
  };

  const runAction = async (action: string, scriptId: string | null = null) => {
    if (!client) return false;
    try {
      await api(`/api/clients/${client.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action, scriptId }),
      });
      invalidateAll();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
      return false;
    }
  };

  const saveNotes = async () => {
    if (!client) return;
    setSavingNotes(true);
    try {
      await api(`/api/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
      toast.success("Notes saved.");
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const deleteClient = async () => {
    if (!client) return;
    try {
      await api(`/api/clients/${client.id}`, { method: "DELETE" });
      toast.success(`${client.name} deleted.`);
      onClose();
      invalidateAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const meta = client ? STATUS_META[client.status] : null;
  const scripts = scriptsQuery.data?.scripts ?? [];

  return (
    <>
      <Sheet open={!!client} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="custom-scrollbar w-full overflow-y-auto sm:max-w-md"
        >
          {client && meta && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  {client.imageUrl ? (
                    <img
                      src={client.imageUrl}
                      alt={client.name}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <UserAvatar url={null} name={client.name} className="h-14 w-14" />
                  )}
                  <div className="min-w-0">
                    <SheetTitle className="font-serif text-xl">{client.name}</SheetTitle>
                    <SheetDescription className="truncate">
                      {client.niche || "No niche set"}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <IcpBadge tier={client.icpTier} score={client.icpScore} />
                  <StatusBadge status={client.status} short={false} />
                </div>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-8">
                <div className="rounded-xl border bg-muted/40 p-3">
                  <p className="text-sm">{meta.hint}</p>
                  {client.status === "follow_up_2_sent" && client.followUp2SentAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      7-day window:{" "}
                      {Math.max(0, COLD_LEAD_DAYS - daysSince(client.followUp2SentAt))}{" "}
                      day(s) left before this turns cold.
                    </p>
                  )}
                </div>

                <section aria-label="Actions" className="space-y-2">
                  {client.status === "new" && (
                    <Button
                      className="w-full"
                      onClick={() => setSendConfig({ action: "send_outreach", type: "initial" })}
                    >
                      <Send className="h-4 w-4" aria-hidden /> Send outreach message
                    </Button>
                  )}
                  {client.status === "outreach_sent" && (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => setSendConfig({ action: "follow_up_1", type: "followup_1" })}
                      >
                        <Send className="h-4 w-4" aria-hidden /> Send Follow-up 1
                      </Button>
                      <Button variant="secondary" className="w-full" onClick={() => runAction("mark_replied")}>
                        <Check className="h-4 w-4" aria-hidden /> Mark as Replied
                      </Button>
                      <ColdAction onConfirm={() => runAction("mark_cold")} />
                    </>
                  )}
                  {client.status === "follow_up_1_sent" && (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => setSendConfig({ action: "follow_up_2", type: "followup_2" })}
                      >
                        <Send className="h-4 w-4" aria-hidden /> Send Follow-up 2
                      </Button>
                      <Button variant="secondary" className="w-full" onClick={() => runAction("mark_replied")}>
                        <Check className="h-4 w-4" aria-hidden /> Mark as Replied
                      </Button>
                      <ColdAction onConfirm={() => runAction("mark_cold")} />
                    </>
                  )}
                  {client.status === "follow_up_2_sent" && (
                    <>
                      <Button className="w-full" onClick={() => runAction("mark_replied")}>
                        <Check className="h-4 w-4" aria-hidden /> Mark as Replied
                      </Button>
                      <ColdAction onConfirm={() => runAction("mark_cold")} />
                    </>
                  )}
                  {client.status === "replied" && (
                    <>
                      <Button className="w-full" onClick={() => runAction("mark_sold")}>
                        <Trophy className="h-4 w-4" aria-hidden /> Mark as Sold (Client)
                      </Button>
                      <ColdAction onConfirm={() => runAction("mark_cold")} />
                    </>
                  )}
                  {client.status === "cold_lead" && (
                    <Button className="w-full" onClick={() => runAction("reopen")}>
                      <RotateCcw className="h-4 w-4" aria-hidden /> Reopen — they replied late
                    </Button>
                  )}
                  {client.status === "client" && (
                    <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                      Won! No further funnel actions — deliver well and collect a
                      testimonial.
                    </p>
                  )}
                </section>

                <Separator />

                <section aria-label="Contact" className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {client.phone && (
                      <a href={`tel:${client.phone}`}>
                        <Button variant="outline" size="sm" type="button">
                          <Phone className="h-3.5 w-3.5" aria-hidden /> {client.phone}
                        </Button>
                      </a>
                    )}
                    {client.email && (
                      <a href={`mailto:${client.email}`}>
                        <Button variant="outline" size="sm" type="button">
                          <Mail className="h-3.5 w-3.5" aria-hidden /> Email
                        </Button>
                      </a>
                    )}
                    {client.socialLinkedin && (
                      <a href={socialUrl("linkedin", client.socialLinkedin)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" type="button">
                          <Linkedin className="h-3.5 w-3.5" aria-hidden /> LinkedIn
                        </Button>
                      </a>
                    )}
                    {client.socialInstagram && (
                      <a href={socialUrl("instagram", client.socialInstagram)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" type="button">
                          <Instagram className="h-3.5 w-3.5" aria-hidden /> Instagram
                        </Button>
                      </a>
                    )}
                    {client.socialX && (
                      <a href={socialUrl("x", client.socialX)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" type="button">
                          <AtSign className="h-3.5 w-3.5" aria-hidden /> X
                        </Button>
                      </a>
                    )}
                    {client.socialOther && (
                      <a href={socialUrl("x", client.socialOther)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" type="button">
                          <Globe className="h-3.5 w-3.5" aria-hidden /> Other
                        </Button>
                      </a>
                    )}
                  </div>
                </section>

                <section aria-label="Outreach history">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Outreach history
                  </h3>
                  <ul className="mt-2 space-y-2">
                    <HistoryRow
                      stage="Initial outreach"
                      scriptId={client.scriptUsedInitial}
                      at={client.outreachSentAt}
                      scripts={scripts}
                    />
                    <HistoryRow
                      stage="Follow-up 1"
                      scriptId={client.scriptUsedFollowup1}
                      at={client.followUp1SentAt}
                      scripts={scripts}
                    />
                    <HistoryRow
                      stage="Follow-up 2"
                      scriptId={client.scriptUsedFollowup2}
                      at={client.followUp2SentAt}
                      scripts={scripts}
                    />
                    {client.repliedAt && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                        <span className="font-medium">Replied</span>
                        <span className="text-xs text-muted-foreground">
                          {fmtDateTime(client.repliedAt)}
                        </span>
                      </li>
                    )}
                    {!client.outreachSentAt && !client.repliedAt && (
                      <li className="text-sm text-muted-foreground">
                        Nothing sent yet — the first outreach will be recorded here.
                      </li>
                    )}
                  </ul>
                </section>

                <section aria-label="Notes" className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </h3>
                  <Textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Freeform notes about this client…"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveNotes}
                    disabled={savingNotes || notes === (client.notes ?? "")}
                  >
                    {savingNotes && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                    Save notes
                  </Button>
                </section>

                <Separator />

                <section aria-label="Manage" className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit client
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete client
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the client and their funnel history.
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteClient}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <SendScriptDialog
        config={sendConfig}
        clientName={client?.name ?? ""}
        scripts={scripts}
        onClose={() => setSendConfig(null)}
        onConfirm={async (scriptId) => {
          if (!sendConfig) return;
          const ok = await runAction(sendConfig.action, scriptId);
          if (ok) setSendConfig(null);
        }}
      />
    </>
  );
}

function ColdAction({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive">
          <Snowflake className="h-4 w-4" aria-hidden /> Mark as Cold
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as cold lead?</AlertDialogTitle>
          <AlertDialogDescription>
            Use this if the conversation stalled. You can always reopen a cold lead
            later if they reply.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Mark as Cold</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function HistoryRow({
  stage,
  scriptId,
  at,
  scripts,
}: {
  stage: string;
  scriptId: string | null;
  at: string | null;
  scripts: ScriptDTO[];
}) {
  if (!at) return null;
  const script = scriptId ? scripts.find((s) => s.id === scriptId) ?? null : null;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <span className="font-medium">{stage}</span>
        <span className="text-xs text-muted-foreground">
          {" "}
          · {script ? script.title : "No script recorded"} · {fmtDateTime(at)}
        </span>
      </div>
    </li>
  );
}

function socialUrl(platform: "linkedin" | "instagram" | "x", handle: string): string {
  const h = handle.trim().replace(/^@/, "");
  if (!h) return "#";
  if (h.startsWith("http")) return h;
  if (h.includes(".")) return `https://${h}`;
  if (platform === "linkedin") return `https://www.linkedin.com/in/${h}`;
  if (platform === "instagram") return `https://instagram.com/${h}`;
  return `https://x.com/${h}`;
}

function SendScriptDialog({
  config,
  clientName,
  scripts,
  onClose,
  onConfirm,
}: {
  config: SendConfig | null;
  clientName: string;
  scripts: ScriptDTO[];
  onClose: () => void;
  onConfirm: (scriptId: string | null) => Promise<void>;
}) {
  const [scriptId, setScriptId] = useState("none");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (config) setScriptId("none");
  }, [config]);

  const pool = config ? scripts.filter((s) => s.type === config.type) : [];
  const chosen = pool.find((s) => s.id === scriptId) ?? null;

  const confirm = async () => {
    setSending(true);
    try {
      await onConfirm(scriptId === "none" ? null : scriptId);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!config} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            {config ? SEND_TITLES[config.type] : ""} — {clientName}
          </DialogTitle>
          <DialogDescription>
            Pick a script, copy it into your message, then confirm once it is sent. The
            status updates automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="script-pick">Script</Label>
            <Select value={scriptId} onValueChange={setScriptId}>
              <SelectTrigger id="script-pick" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No script — I wrote my own</SelectItem>
                {pool.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {config && pool.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No {scriptTypeLabel(config.type).toLowerCase()} scripts yet — add one in
                Scripts.
              </p>
            )}
          </div>

          {chosen && (
            <div className="space-y-2">
              <div className="custom-scrollbar max-h-40 overflow-y-auto whitespace-pre-line rounded-lg border bg-muted/40 p-3 text-sm">
                {chosen.body}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const ok = await copyText(chosen.body);
                  if (ok) {
                    toast.success("Script copied to clipboard.");
                  } else {
                    toast.error("Copy failed — select the text manually.");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden /> Copy text
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Confirm — mark as sent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
