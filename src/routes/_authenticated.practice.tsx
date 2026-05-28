import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mic2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchSongsterr } from "@/lib/songsterr.functions";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [{ title: "Practice — Tonewave" }] }),
  component: PracticePage,
});

function PracticePage() {
  const [query, setQuery] = useState("");
  const search = useServerFn(searchSongsterr);
  const m = useMutation({
    mutationFn: (q: string) => search({ data: { query: q } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Search failed"),
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Mic2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Practice</h1>
          <p className="text-sm text-muted-foreground">
            Find a song, load the tab, sync it with the audio.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
        <h2 className="font-semibold mb-3">Find a tab on Songsterr</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) m.mutate(query.trim());
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Song or artist name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" disabled={m.isPending}>
            <Search className="h-4 w-4 mr-1" />
            {m.isPending ? "Searching…" : "Search"}
          </Button>
        </form>

        {m.data?.results && (
          <ul className="mt-4 divide-y divide-border/60 rounded-lg border border-border/60 bg-background/40">
            {m.data.results.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No results.</li>
            )}
            {m.data.results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.artist}</p>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground mb-2">Coming next</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Load Guitar Pro tabs with the alphaTab player (synced cursor + synth).</li>
          <li>YouTube embed + slow-down without changing pitch.</li>
          <li>Auto-extract tabs from the video using basic-pitch (local, free).</li>
          <li>Export the loaded tab to PDF.</li>
        </ul>
      </section>
    </div>
  );
}
