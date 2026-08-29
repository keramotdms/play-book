"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, LogOut, Save, Trash2 } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, uploadImage } from "@/lib/client";
import { UserDTO } from "@/lib/shared";
import { UserAvatar } from "@/components/app/ui-bits";

export function ProfileView({
  user,
  onLogout,
}: {
  user: UserDTO;
  onLogout: () => void;
}) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [phone, setPhone] = useState(user.phone);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyUser = (u: UserDTO) => qc.setQueryData(["me"], { user: u });

  const save = async () => {
    setSaving(true);
    try {
      const res = await api<{ user: UserDTO }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName, phone, bio, avatarUrl }),
      });
      applyUser(res.user);
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setAvatarUrl(url);
      const res = await api<{ user: UserDTO }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: url }),
      });
      applyUser(res.user);
      toast.success("Photo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteAll = async () => {
    setDeleting(true);
    try {
      const res = await api<{ deleted: number }>("/api/danger/delete-all-clients", {
        method: "POST",
        body: JSON.stringify({ confirmPhrase: phrase }),
      });
      toast.success(`Deleted ${res.deleted} client${res.deleted === 1 ? "" : "s"}.`);
      setPhrase("");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = phrase === "DELETE ALL CLIENTS";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account details for this personal workspace.
        </p>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
          <CardDescription>Photos are stored with your workspace files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              url={avatarUrl}
              name={displayName || user.email}
              className="h-16 w-16"
            />
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
                {uploading ? "Uploading…" : "Change photo"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Display name</Label>
              <Input
                id="p-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Phone (optional)</Label>
              <Input
                id="p-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" value={user.email} disabled />
              <p className="text-xs text-muted-foreground">
                Email comes from your account and is read-only.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-bio">Bio / notes (optional)</Label>
              <Textarea
                id="p-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Niche, positioning, goals…"
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Bulk-delete ALL clients and their uploaded photos — meant for clearing out
            test data before tracking real prospects. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-confirm">Confirmation phrase</Label>
            <p className="text-xs text-muted-foreground">
              Type <span className="font-mono">DELETE ALL CLIENTS</span> below to enable
              the button.
            </p>
            <Input
              id="p-confirm"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="DELETE ALL CLIENTS"
              autoComplete="off"
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!canDelete || deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
                Delete all clients
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete every client?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes all clients, their funnel history and their
                  photos. There is no undo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAll}>
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
