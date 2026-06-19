import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSearchHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("search_history")
      .select("id, query, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const addSearchHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) =>
    z.object({ query: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // De-dupe: remove prior identical entries for this user
    await context.supabase
      .from("search_history")
      .delete()
      .eq("user_id", context.userId)
      .eq("query", data.query);
    const { error } = await context.supabase
      .from("search_history")
      .insert({ user_id: context.userId, query: data.query });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSearchHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; all?: boolean }) =>
    z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("search_history").delete().eq("user_id", context.userId);
    if (data.id) q = q.eq("id", data.id);
    else if (!data.all) throw new Error("id or all required");
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
