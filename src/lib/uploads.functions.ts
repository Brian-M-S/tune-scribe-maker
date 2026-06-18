import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Upload a Guitar Pro file (.gp / .gp3 / .gp4 / .gp5 / .gpx / .gp7) to the
 * private `tabs` storage bucket, then record it in `saved_tabs`.
 */
export const uploadGpTab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; artist?: string; filename: string; base64: string }) =>
    z
      .object({
        title: z.string().trim().min(1).max(160),
        artist: z.string().trim().max(160).optional(),
        filename: z.string().min(1).max(200),
        base64: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ext = (data.filename.split(".").pop() ?? "gp").toLowerCase();
    if (!/^gp[3-7x]?$/.test(ext)) {
      throw new Error("Solo se aceptan archivos .gp / .gp3-7 / .gpx");
    }
    const bin = atob(data.base64);
    if (bin.length > MAX_BYTES) throw new Error("El archivo excede 8 MB");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
    const up = await context.supabase.storage
      .from("tabs")
      .upload(path, bytes, { contentType: "application/octet-stream", upsert: false });
    if (up.error) throw new Error(up.error.message);

    const { data: row, error } = await context.supabase
      .from("saved_tabs")
      .insert({
        user_id: context.userId,
        title: data.title,
        artist: data.artist ?? null,
        source: "upload",
        format: ext,
        storage_path: path,
      })
      .select("id, title, artist, format, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { tab: row };
  });

export const listMyTabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_tabs")
      .select("id, title, artist, source, format, storage_path, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tabs: data ?? [] };
  });

export const deleteMyTab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error: fetchErr } = await context.supabase
      .from("saved_tabs")
      .select("storage_path, user_id")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (row.user_id !== context.userId) throw new Error("Forbidden");
    if (row.storage_path) {
      await context.supabase.storage.from("tabs").remove([row.storage_path]);
    }
    const { error } = await context.supabase.from("saved_tabs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Returns the uploaded tab bytes as base64 so AlphaTab can render it. */
export const getMyTabBytes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("saved_tabs")
      .select("id, title, artist, format, storage_path, user_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (row.user_id !== context.userId) throw new Error("Forbidden");
    if (!row.storage_path) throw new Error("Sin archivo almacenado");
    const dl = await context.supabase.storage.from("tabs").download(row.storage_path);
    if (dl.error || !dl.data) throw new Error(dl.error?.message ?? "No se pudo descargar");
    const buf = new Uint8Array(await dl.data.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return {
      base64: btoa(bin),
      title: row.title,
      artist: row.artist,
      format: row.format,
    };
  });
