"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { api, uploadImage } from "@/lib/client";
import { ClientDTO, ICP_CHECKLIST, IcpKey, TIER_META, tierFromScore } from "@/lib/shared";

interface FormState {
  name: string;
  niche: string;
  email: string;
  phone: string;
  socialLinkedin: string;
  socialInstagram: string;
  socialX: string;
  socialOther: string;
  imageUrl: string;
  notes: string;
  icp: Record<IcpKey, boolean>;
}

const EMPTY_FORM: FormState = {
  name: "",
  niche: "",
  email: "",
  phone: "",
  socialLinkedin: "",
  socialInstagram: "",
  socialX: "",
  socialOther: "",
  imageUrl: "",
  notes: "",
  icp: {
    hasPaidOffer: false,
    hasEmailList: false,
    rightAudience: false,
    genericCopy: false,
    postedRecently: false,
  },
};

export function ClientFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ClientDTO | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            name: editing.name,
            niche: editing.niche,
            email: editing.email,
            phone: editing.phone,
            socialLinkedin: editing.socialLinkedin,
            socialInstagram: editing.socialInstagram,
            socialX: editing.socialX,
            socialOther: editing.socialOther,
            imageUrl: editing.imageUrl,
            notes: editing.notes,
            icp: {
              hasPaidOffer: editing.icpHasPaidOffer,
              hasEmailList: editing.icpHasEmailList,
              rightAudience: editing.icpRightAudience,
              genericCopy: editing.icpGenericCopy,
              postedRecently: editing.icpPostedRecently,
            },
          }
        : EMPTY_FORM
    );
  }, [open, editing]);

  const score = Object.values(form.icp).filter(Boolean).length;
  const tier = tierFromScore(score);

  const setField = (key: keyof Omit<FormState, "icp">, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleIcp = (key: IcpKey, checked: boolean) =>
    setForm((f) => ({ ...f, icp: { ...f.icp, [key]: checked } }));

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = JSON.stringify(form);
      if (editing) {
        await api(`/api/clients/${editing.id}`, { method: "PATCH", body: payload });
      } else {
        await api("/api/clients", { method: "POST", body: payload });
      }
      toast.success(editing ? "Client updated." : "Client added — status starts at New.");
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
            {editing ? "Edit client" : "Add client"}
          </DialogTitle>
          <DialogDescription>
            The ICP score (0–5) is calculated automatically from the checklist. New
            clients start in “New — Not Contacted”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {form.imageUrl ? (
              <div className="relative">
                <img
                  src={form.imageUrl}
                  alt="Client photo"
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <button
                  onClick={() => setField("imageUrl", "")}
                  aria-label="Remove photo"
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-1 text-background"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                <Camera className="h-5 w-5" aria-hidden />
              </div>
            )}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden />
                )}
                {uploading ? "Uploading…" : "Upload photo"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-name">Name *</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Jane Coach"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-niche">Niche</Label>
              <Input
                id="c-niche"
                value={form.niche}
                onChange={(e) => setField("niche", e.target.value)}
                placeholder="Health Coach"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-li">LinkedIn</Label>
              <Input
                id="c-li"
                value={form.socialLinkedin}
                onChange={(e) => setField("socialLinkedin", e.target.value)}
                placeholder="@handle or URL"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-ig">Instagram</Label>
              <Input
                id="c-ig"
                value={form.socialInstagram}
                onChange={(e) => setField("socialInstagram", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-x">X (Twitter)</Label>
              <Input
                id="c-x"
                value={form.socialX}
                onChange={(e) => setField("socialX", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-other">Other social</Label>
              <Input
                id="c-other"
                value={form.socialOther}
                onChange={(e) => setField("socialOther", e.target.value)}
                placeholder="YouTube, TikTok, website…"
              />
            </div>
          </div>

          <fieldset className="rounded-xl border p-3">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ICP checklist
            </legend>
            <div className="space-y-2.5">
              {ICP_CHECKLIST.map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-center gap-2.5 text-sm"
                >
                  <Checkbox
                    checked={form.icp[item.key]}
                    onCheckedChange={(v) => toggleIcp(item.key, v === true)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <p className="mt-3 border-t pt-2.5 text-sm">
              ICP score <span className="font-semibold tabular-nums">{score}/5</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-medium">{TIER_META[tier].label}</span>
            </p>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Anything worth remembering…"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Add client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
