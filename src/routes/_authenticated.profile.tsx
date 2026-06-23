import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserCircle, Save, Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Perfil — Tonewave" }] }),
  component: ProfilePage,
});

const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB

function ProfilePage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setDisplayName(data?.display_name ?? "");
      const stored = data?.avatar_url ?? null;
      setAvatarPath(stored);
      if (stored && stored.startsWith(`${user.id}/`)) {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(stored, 60 * 60);
        setAvatarPreview(signed?.signedUrl ?? "");
      } else if (stored) {
        // Legacy: stored as full URL
        setAvatarPreview(stored);
      }
      setLoading(false);
    })();
  }, [user]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("La imagen no puede superar 4 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (up.error) throw up.error;

      // Remove previous avatar to keep the folder clean.
      if (avatarPath && avatarPath.startsWith(`${user.id}/`) && avatarPath !== path) {
        await supabase.storage.from("avatars").remove([avatarPath]);
      }

      const { error: upErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: path, updated_at: new Date().toISOString() });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60);
      setAvatarPath(path);
      setAvatarPreview(signed?.signedUrl ?? "");
      toast.success("Foto actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error subiendo la imagen");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    setUploading(true);
    try {
      if (avatarPath && avatarPath.startsWith(`${user.id}/`)) {
        await supabase.storage.from("avatars").remove([avatarPath]);
      }
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: null, updated_at: new Date().toISOString() });
      if (error) throw error;
      setAvatarPath(null);
      setAvatarPreview("");
      toast.success("Foto eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName.trim() || null,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil guardado");
  };

  const initial = (displayName || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <UserCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Personaliza tu nombre y foto.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-6">
        <div className="flex items-center gap-4">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="avatar"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/40"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-bold text-primary-foreground">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1.5" />
                )}
                Subir foto
              </Button>
              {avatarPath && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={removeAvatar}
                  disabled={uploading}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Quitar
                </Button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              JPG, PNG o WebP. Máximo 4 MB.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Nombre para mostrar">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                maxLength={80}
              />
            </Field>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Guardar cambios
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
