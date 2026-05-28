import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUNO_BASE = "https://api.sunoapi.org/api/v1";

function sunoHeaders() {
  const key = process.env.SUNO_API_KEY;
  if (!key) throw new Error("SUNO_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function sunoFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUNO_BASE}${path}`, {
    ...init,
    headers: { ...sunoHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    throw new Error(`Suno API ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data as T;
}

const GenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  style: z.string().max(200).optional(),
  title: z.string().max(120).optional(),
  customMode: z.boolean().default(false),
  instrumental: z.boolean().default(false),
  model: z.enum(["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"]).default("V4_5"),
});

/**
 * Kicks off a Suno music generation and saves a pending track for the user.
 */
export const generateMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => GenerateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const body: Record<string, unknown> = {
      prompt: data.prompt,
      customMode: data.customMode,
      instrumental: data.instrumental,
      model: data.model,
    };
    if (data.style) body.style = data.style;
    if (data.title) body.title = data.title;

    const result = await sunoFetch<{ code: number; msg?: string; data?: { taskId?: string } }>(
      "/generate",
      { method: "POST", body: JSON.stringify(body) },
    );

    const taskId = result.data?.taskId;
    if (!taskId) throw new Error(result.msg || "Suno did not return a taskId");

    const { data: track, error } = await supabase
      .from("tracks")
      .insert({
        user_id: userId,
        title: data.title || data.prompt.slice(0, 60),
        prompt: data.prompt,
        style: data.style ?? null,
        model: data.model,
        instrumental: data.instrumental,
        suno_task_id: taskId,
        status: "processing",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { track };
  });

/**
 * Polls the status of a Suno task and updates the matching track.
 */
export const refreshTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { trackId: string }) => z.object({ trackId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: track, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", data.trackId)
      .eq("user_id", userId)
      .single();
    if (error || !track) throw new Error("Track not found");
    if (!track.suno_task_id) return { track };

    try {
      const res = await sunoFetch<{
        code: number;
        data?: {
          status?: string;
          response?: {
      const status = res.data?.status?.toUpperCase() ?? "PROCESSING";
      const item = res.data?.response?.sunoData?.[0];

      const update: {
        audio_url?: string;
        stream_audio_url?: string;
        image_url?: string;
        duration_seconds?: number;
        title?: string;
        suno_audio_id?: string;
        status?: "pending" | "processing" | "complete" | "error";
        error_message?: string;
      } = {};
      if (item?.audioUrl) update.audio_url = item.audioUrl;
      if (item?.streamAudioUrl) update.stream_audio_url = item.streamAudioUrl;
      if (item?.imageUrl) update.image_url = item.imageUrl;
      if (item?.duration) update.duration_seconds = item.duration;
      if (item?.title) update.title = item.title;
      if (item?.id) update.suno_audio_id = item.id;

      if (status === "SUCCESS" || status === "COMPLETE") update.status = "complete";
      else if (status.includes("FAIL") || status === "ERROR") {
        update.status = "error";
        update.error_message = "Suno reported an error";
      } else update.status = "processing";

      if (Object.keys(update).length > 0) {
        await supabase.from("tracks").update(update).eq("id", track.id);
      }

      }

      const { data: fresh } = await supabase.from("tracks").select("*").eq("id", track.id).single();
      return { track: fresh };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await supabase
        .from("tracks")
        .update({ status: "error", error_message: msg })
        .eq("id", track.id);
      return { track: { ...track, status: "error", error_message: msg } };
    }
  });

/**
 * Returns the remaining credits of the configured Suno account.
 */
export const getSunoCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const res = await sunoFetch<{ code: number; data?: number }>("/generate/credit", { method: "GET" });
      return { credits: res.data ?? 0, error: null as string | null };
    } catch (e) {
      return { credits: 0, error: e instanceof Error ? e.message : "Unknown" };
    }
  });
