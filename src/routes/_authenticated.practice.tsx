import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mic2, Search, ExternalLink, ArrowUpDown, History, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchSongsterr, type SongsterrResult } from "@/lib/songsterr.functions";
import {
  listSearchHistory,
  addSearchHistory,
  deleteSearchHistory,
} from "@/lib/search-history.functions";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [{ title: "Practice — Tonewave" }] }),
  component: PracticePage,
});

type SortKey = "artist" | "title" | "type";

function PracticePage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("artist");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [groupByArtist, setGroupByArtist] = useState(true);

  const qc = useQueryClient();
  const search = useServerFn(searchSongsterr);
  const listHistory = useServerFn(listSearchHistory);
  const addHistory = useServerFn(addSearchHistory);
  const deleteHistory = useServerFn(deleteSearchHistory);

  const history = useQuery({
    queryKey: ["search-history"],
    queryFn: () => listHistory(),
  });

  const m = useMutation({
    mutationFn: (q: string) => search({ data: { query: q } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Search failed"),
  });

  const runSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    m.mutate(trimmed);
    addHistory({ data: { query: trimmed } })
      .then(() => qc.invalidateQueries({ queryKey: ["search-history"] }))
      .catch(() => {});
  };

  const removeHistoryItem = (id: string) => {
    deleteHistory({ data: { id } })
      .then(() => qc.invalidateQueries({ queryKey: ["search-history"] }))
      .catch(() => {});
  };
  const clearHistory = () => {
    deleteHistory({ data: { all: true } })
      .then(() => qc.invalidateQueries({ queryKey: ["search-history"] }))
      .catch(() => {});
  };

  useEffect(() => {
    // no-op placeholder for future autocomplete
  }, []);


  const allResults = m.data?.results ?? [];

  const tabTypes = useMemo(() => {
    const s = new Set<string>();
    allResults.forEach((r) => r.tabTypes.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [allResults]);

  const filtered = useMemo(() => {
    let list = allResults;
    if (typeFilter !== "all") list = list.filter((r) => r.tabTypes.includes(typeFilter));
    list = [...list].sort((a, b) => {
      if (sort === "artist") return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
      if (sort === "title") return a.title.localeCompare(b.title);
      return (a.tabTypes[0] ?? "").localeCompare(b.tabTypes[0] ?? "");
    });
    return list;
  }, [allResults, sort, typeFilter]);

  const grouped = useMemo(() => {
    if (!groupByArtist || sort !== "artist") return null;
    const map = new Map<string, SongsterrResult[]>();
    filtered.forEach((r) => {
      const arr = map.get(r.artist) ?? [];
      arr.push(r);
      map.set(r.artist, arr);
    });
    return Array.from(map.entries());
  }, [filtered, groupByArtist, sort]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Mic2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Practice</h1>
          <p className="text-sm text-muted-foreground">
            Search Songsterr, open the tab there, or jump to Ultimate Guitar. Upload your own .gp file in the Library to use the in-app player.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Song or artist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={m.isPending}>
            <Search className="h-4 w-4 mr-1" />
            {m.isPending ? "Searching…" : "Search"}
          </Button>
        </form>

        {(history.data?.items.length ?? 0) > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <History className="h-3.5 w-3.5" /> Recent searches
              </span>
              <button
                onClick={clearHistory}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {history.data!.items.map((h) => (
                <span
                  key={h.id}
                  className="group inline-flex items-center gap-1 rounded-full bg-background/40 pl-2 pr-1 py-0.5 text-xs hover:bg-background/60"
                >
                  <button onClick={() => runSearch(h.query)} className="hover:text-primary">
                    {h.query}
                  </button>
                  <button
                    onClick={() => removeHistoryItem(h.id)}
                    aria-label="Remove"
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {allResults.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Sort:</span>
              {(["artist", "title", "type"] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`rounded-full px-2 py-1 capitalize ${
                    sort === k ? "bg-primary text-primary-foreground" : "bg-background/40 hover:bg-background/60"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Instrument:</span>
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-full px-2 py-1 ${
                  typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-background/40 hover:bg-background/60"
                }`}
              >
                all
              </button>
              {tabTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full px-2 py-1 ${
                    typeFilter === t ? "bg-primary text-primary-foreground" : "bg-background/40 hover:bg-background/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-muted-foreground">
              <input
                type="checkbox"
                checked={groupByArtist}
                onChange={(e) => setGroupByArtist(e.target.checked)}
                className="accent-primary"
              />
              Group by artist
            </label>
            <span className="ml-auto text-muted-foreground">{filtered.length} results</span>
          </div>
        )}

        {m.data?.error && (
          <p className="text-sm text-destructive">⚠ {m.data.error}</p>
        )}

        {m.data && !m.data.error && allResults.length === 0 && (
          <p className="text-sm text-muted-foreground">No results.</p>
        )}

        {grouped ? (
          <div className="space-y-4">
            {grouped.map(([artist, items]) => (
              <div key={artist} className="rounded-lg border border-border/60 bg-background/40">
                <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {artist} <span className="text-muted-foreground/60">· {items.length}</span>
                </div>
                <ul className="divide-y divide-border/60">
                  {items.map((r) => (
                    <ResultRow key={r.id} r={r} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          filtered.length > 0 && (
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-background/40">
              {filtered.map((r) => (
                <ResultRow key={r.id} r={r} />
              ))}
            </ul>
          )
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground mb-2">About the catalog</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Songsterr exposes a free public search; we sort by artist/title and filter by instrument.</li>
          <li>Album, tuning and ratings are not in the Songsterr search payload — tuning appears once the tab is loaded.</li>
          <li>Ultimate Guitar has no public API, so we link to their search instead of embedding.</li>
        </ul>
      </section>
    </div>
  );
}

function ResultRow({ r }: { r: SongsterrResult }) {
  const isUg = r.source === "ug";
  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{r.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {r.artist}
          {r.tabTypes.length > 0 && <span> · {r.tabTypes.join(", ")}</span>}
          {isUg && <span> · fallback</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isUg && (
          <Button asChild size="sm" variant="secondary">
            <a href={r.url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Songsterr
            </a>
          </Button>
        )}
        <a
          href={r.ugSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background/60"
          title="Search on Ultimate Guitar"
        >
          UG <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </li>
  );
}
