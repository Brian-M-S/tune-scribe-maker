import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Songsterr public search — returns up to 25 tabs matching a query.
 * No API key required.
 */
export const searchSongsterr = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) =>
    z.object({ query: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = `https://www.songsterr.com/a/ra/songs.json?pattern=${encodeURIComponent(data.query)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Tonewave/1.0" },
    });
    if (!res.ok) {
      return { results: [], error: `Songsterr error ${res.status}` };
    }
    const raw = (await res.json()) as Array<{
      id: number;
      title: string;
      artist?: { name?: string };
      tabTypes?: string[];
    }>;
    const results = raw.slice(0, 25).map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist?.name ?? "Unknown",
      url: `https://www.songsterr.com/a/wsa/${slugify(r.artist?.name ?? "")}-${slugify(r.title)}-tab-s${r.id}`,
      sourceUrl: `https://www.songsterr.com/a/ra/song/${r.id}/revisions.json`,
      tabTypes: r.tabTypes ?? [],
    }));
    return { results, error: null as string | null };
  });

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
