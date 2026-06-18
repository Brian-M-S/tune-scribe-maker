import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SongsterrResult = {
  id: number;
  title: string;
  artist: string;
  url: string;
  ugSearchUrl: string;
  tabTypes: string[];
  /** "songsterr" = playable in our viewer; "ug" = fallback link only */
  source: "songsterr" | "ug";
};

const BROWSER_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Referer: "https://www.songsterr.com/",
};

// --- Schemas for each known Songsterr endpoint ----------------------------

const NewApiItem = z.object({
  songId: z.number(),
  title: z.string(),
  artist: z.string().optional(),
  tracks: z.array(z.object({ instrument: z.string().optional() })).optional(),
});
const NewApiSchema = z.array(NewApiItem);

const LegacyItem = z.object({
  id: z.number(),
  title: z.string(),
  artist: z.object({ name: z.string() }).optional(),
  tabTypes: z.array(z.string()).optional(),
});
const LegacySchema = z.array(LegacyItem);

// --- Internal probes -------------------------------------------------------

async function probeNewApi(query: string): Promise<SongsterrResult[] | null> {
  const url = `https://www.songsterr.com/api/songs?pattern=${encodeURIComponent(query)}&size=50`;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) {
      console.warn("[songsterr] new api status", res.status);
      return null;
    }
    const raw = await res.json();
    const parsed = NewApiSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[songsterr] new api schema mismatch", parsed.error.issues.slice(0, 2));
      return null;
    }
    return parsed.data.map((r) => mapItem(r.songId, r.title, r.artist ?? "Unknown", typesFromTracks(r.tracks)));
  } catch (e) {
    console.warn("[songsterr] new api network error", e);
    return null;
  }
}

async function probeLegacyApi(query: string): Promise<SongsterrResult[] | null> {
  const url = `https://www.songsterr.com/a/ra/songs.json?pattern=${encodeURIComponent(query)}&size=50`;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) {
      console.warn("[songsterr] legacy api status", res.status);
      return null;
    }
    const raw = await res.json();
    const parsed = LegacySchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[songsterr] legacy api schema mismatch", parsed.error.issues.slice(0, 2));
      return null;
    }
    return parsed.data.map((r) => mapItem(r.id, r.title, r.artist?.name ?? "Unknown", r.tabTypes ?? []));
  } catch (e) {
    console.warn("[songsterr] legacy api network error", e);
    return null;
  }
}

function syntheticUgFallback(query: string): SongsterrResult[] {
  // We can't search UG (no public API and HTML scraping is brittle), so we
  // return a single synthetic row that opens the UG search page for the query.
  return [
    {
      id: -1,
      title: `Buscar "${query}" en Ultimate Guitar`,
      artist: "Ultimate Guitar",
      url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}`,
      ugSearchUrl: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}`,
      tabTypes: [],
      source: "ug",
    },
  ];
}

function typesFromTracks(tracks?: Array<{ instrument?: string }>) {
  const types = new Set<string>();
  for (const t of tracks ?? []) {
    const ins = (t.instrument ?? "").toLowerCase();
    if (ins.includes("bass")) types.add("Bass");
    else if (ins.includes("drum") || ins.includes("percussion")) types.add("Drums");
    else if (ins.includes("vocal") || ins.includes("sax")) types.add("Vocal");
    else if (ins.includes("guitar")) types.add("Guitar");
    else if (ins) types.add("Other");
  }
  return Array.from(types);
}

function mapItem(id: number, title: string, artist: string, tabTypes: string[]): SongsterrResult {
  return {
    id,
    title,
    artist,
    url: `https://www.songsterr.com/a/wsa/${slugify(artist)}-${slugify(title)}-tab-s${id}`,
    ugSearchUrl: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(`${artist} ${title}`)}`,
    tabTypes,
    source: "songsterr",
  };
}

// --- Public server functions ----------------------------------------------

export const searchSongsterr = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) =>
    z.object({ query: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const fromNew = await probeNewApi(data.query);
    if (fromNew && fromNew.length > 0) {
      return { results: fromNew, error: null as string | null, fallback: false as const };
    }
    const fromLegacy = await probeLegacyApi(data.query);
    if (fromLegacy && fromLegacy.length > 0) {
      return { results: fromLegacy, error: null, fallback: false as const };
    }
    // Both upstream endpoints failed or returned no results — return synthetic
    // results that just open Ultimate Guitar's search page in a new tab.
    return {
      results: syntheticUgFallback(data.query),
      error: fromNew === null && fromLegacy === null
        ? "Songsterr no responde, mostrando fallback de Ultimate Guitar"
        : null,
      fallback: true as const,
    };
  });

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
