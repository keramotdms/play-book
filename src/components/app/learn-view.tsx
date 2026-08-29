"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { LessonDTO, MODULE_NAMES } from "@/lib/shared";

export function LearnView() {
  const qc = useQueryClient();
  const lessonsQuery = useQuery({
    queryKey: ["learn"],
    queryFn: () => api<{ lessons: LessonDTO[] }>("/api/learn"),
  });
  const lessons = lessonsQuery.data?.lessons ?? [];
  const completed = lessons.filter((l) => l.completed).length;
  const total = lessons.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const [addOpen, setAddOpen] = useState(false);

  const modules = useMemo(() => {
    const map = new Map<string, LessonDTO[]>();
    for (const l of lessons) {
      const arr = map.get(l.module) ?? [];
      arr.push(l);
      map.set(l.module, arr);
    }
    return [...map.entries()].map(([name, ls]) => ({ name, lessons: ls }));
  }, [lessons]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["learn"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const toggle = async (lesson: LessonDTO, next: boolean) => {
    // Optimistic update — instant checkbox response.
    qc.setQueryData<{ lessons: LessonDTO[] }>(["learn"], (old) =>
      old
        ? {
            lessons: old.lessons.map((l) =>
              l.id === lesson.id ? { ...l, completed: next } : l
            ),
          }
        : old
    );
    try {
      await api(`/api/learn/${lesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: next }),
      });
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the lesson");
      invalidate();
    }
  };

  const removeCustom = async (lesson: LessonDTO) => {
    try {
      await api(`/api/learn/${lesson.id}`, { method: "DELETE" });
      toast.success("Lesson removed.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the lesson");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            Learn
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A self-paced path from zero copywriting experience to freelance consultant.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden /> Add lesson
        </Button>
      </header>

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Overall progress</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {completed} of {total} lessons complete · nothing is pre-checked
              </p>
            </div>
            <p className="font-serif text-3xl font-semibold tabular-nums">{pct}%</p>
          </div>
          <Progress value={pct} className="mt-3" />
        </CardContent>
      </Card>

      {lessonsQuery.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={modules[0] ? [modules[0].name] : []}
          className="rounded-xl border bg-card px-4 shadow-sm"
        >
          {modules.map((m) => {
            const done = m.lessons.filter((l) => l.completed).length;
            return (
              <AccordionItem key={m.name} value={m.name}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex w-full items-center justify-between gap-3 pr-3">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {done}/{m.lessons.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul>
                    {m.lessons.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-start gap-3 border-t py-3 first:border-t-0"
                      >
                        <Checkbox
                          checked={l.completed}
                          onCheckedChange={(v) => toggle(l, v === true)}
                          className="mt-0.5"
                          aria-label={`Mark "${l.title}" ${l.completed ? "incomplete" : "complete"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm leading-snug ${
                              l.completed ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {l.title}
                          </p>
                          {l.isCustom && l.sourceUrl ? (
                            <a
                              href={l.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" aria-hidden /> Source
                            </a>
                          ) : null}
                          {l.isCustom && l.notes ? (
                            <p className="mt-1 text-xs text-muted-foreground">{l.notes}</p>
                          ) : null}
                        </div>
                        {l.isCustom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeCustom(l)}
                            aria-label={`Delete lesson ${l.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <AddLessonDialog open={addOpen} onOpenChange={setAddOpen} onSaved={invalidate} />
    </div>
  );
}

function AddLessonDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [module, setModule] = useState<string>(MODULE_NAMES[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setSourceUrl("");
      setNotes("");
      setModule(MODULE_NAMES[0]);
    }
  }, [open]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/learn", {
        method: "POST",
        body: JSON.stringify({ title, sourceUrl, notes, module }),
      });
      toast.success("Lesson added — it starts unchecked.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the lesson");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Add lesson</DialogTitle>
          <DialogDescription>
            Add a lesson you found elsewhere on the web and track it alongside the
            built-in curriculum.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="l-title">Title *</Label>
            <Input
              id="l-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Landing page teardown — SQ 07"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-url">Source URL</Label>
            <Input
              id="l-url"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-module">Module</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger id="l-module" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_NAMES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-notes">Your notes / summary</Label>
            <Textarea
              id="l-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key takeaways…"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Add lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
