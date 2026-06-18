import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SongsterrResult = {
  id: number;
  title: string;
  artist: string;
  url: string;
  ugSearchUrl: string;
  tabTypes: string[];
};

/**
 * Songsterr public search — returns up to 50 tabs matching a query.
 * No API key required.
 *
 * Notes on filterable fields:
 * - Songsterr's public search does NOT expose album, tuning, or rating.
 *   Tuning lives inside the Guitar Pro file (per-track) — surfaced in the viewer.
 *   Album/rating are not available; we sort by artist/title and filter by tabTypes
 *   (Guitar, Bass, Drums, Vocal) which IS in the response.
 */
export const searchSongsterr = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) =>
    z.object({ query: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = `https://www.songsterr.com/a/ra/songs.json?pattern=${encodeURIComponent(data.query)}&size=50`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Referer: "https://www.songsterr.com/",
        },
      });
    } catch (e) {
      return {
        results: [] as SongsterrResult[],
        error: `Network error: ${e instanceof Error ? e.message : "unknown"}`,
      };
    }
    const text = await res.text();
    if (!res.ok) {
      console.error("[songsterr] status", res.status, text.slice(0, 200));
      return { results: [] as SongsterrResult[], error: `Songsterr ${res.status}` };
    }
    let raw: Array<{ id: number; title: string; artist?: { name?: string }; tabTypes?: string[] }>;
    try {
      raw = JSON.parse(text);
    } catch {
      console.error("[songsterr] non-JSON response", text.slice(0, 200));
      return {
        results: [] as SongsterrResult[],
        error: "Songsterr devolvió una respuesta inesperada",
      };
    }
    const results: SongsterrResult[] = raw.map((r) => {
      const artist = r.artist?.name ?? "Unknown";
      return {
        id: r.id,
        title: r.title,
        artist,
        url: `https://www.songsterr.com/a/wsa/${slugify(artist)}-${slugify(r.title)}-tab-s${r.id}`,
        ugSearchUrl: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(`${artist} ${r.title}`)}`,
        tabTypes: r.tabTypes ?? [],
      };
    });
    return { results, error: null as string | null };
  });

/**
 * Resolve the latest Guitar Pro source URL for a Songsterr song id.
 * Used by the alphaTab viewer to load and render the tab in the browser.
 */
export const getSongsterrSource = createServerFn({ method: "POST" })
  .inputValidator((input: { songId: number }) =>
    z.object({ songId: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    const res = await fetch(
      `https://www.songsterr.com/a/ra/song/${data.songId}/revisions.json`,
      { headers: { Accept: "application/json", "User-Agent": "Tonewave/1.0" } },
    );
    if (!res.ok) {
      return { source: null as string | null, error: `Songsterr error ${res.status}` };
    }
    const revisions = (await res.json()) as Array<{ source?: string }>;
    const source = revisions.find((r) => r.source)?.source ?? null;
    return { source, error: source ? null : "No tab source available" };
  });

/**
 * Proxy the Guitar Pro file bytes so alphaTab can load it without CORS issues.
 * Returns base64 so it travels safely through the JSON RPC boundary.
 */
export const fetchTabBytes = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) =>
    z.object({ url: z.string().url().max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const u = new URL(data.url);
    if (!u.hostname.endsWith("songsterr.com") && !u.hostname.endsWith("songsterrcdn.com")) {
      throw new Error("Only Songsterr-hosted tabs can be fetched");
    }
    const res = await fetch(data.url, { headers: { "User-Agent": "Tonewave/1.0" } });
    if (!res.ok) throw new Error(`Tab fetch failed ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    // base64 encode
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { base64: btoa(bin), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  });

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
