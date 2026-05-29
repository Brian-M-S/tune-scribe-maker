import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchTabBytes, getSongsterrSource } from "@/lib/songsterr.functions";
import { AlphaTabViewer } from "@/components/AlphaTabViewer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tabs/$songId")({
  head: () => ({ meta: [{ title: "Tab Viewer — Tonewave" }] }),
  component: TabViewerPage,
});

function TabViewerPage() {
  const { songId } = Route.useParams();
  const search = Route.useSearch() as { title?: string; artist?: string };
  const getSource = useServerFn(getSongsterrSource);
  const getBytes = useServerFn(fetchTabBytes);

  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = Number(songId);
        const src = await getSource({ data: { songId: id } });
        if (cancelled) return;
        if (!src.source) throw new Error(src.error ?? "No tab source");
        const tab = await getBytes({ data: { url: src.source } });
        if (cancelled) return;
        const bin = atob(tab.base64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        setBytes(arr);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load tab";
        setError(msg);
        toast.error(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [songId, getSource, getBytes]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/practice">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to search
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
          {error}
        </div>
      ) : !bytes ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tab from Songsterr…
        </div>
      ) : (
        <AlphaTabViewer bytes={bytes} title={search.title} artist={search.artist} />
      )}
    </div>
  );
}
