import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyTabBytes } from "@/lib/uploads.functions";
import { getCachedTab, setCachedTab } from "@/lib/tab-cache";
import { AlphaTabViewer } from "@/components/AlphaTabViewer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tabs/uploaded/$id")({
  head: () => ({ meta: [{ title: "Tab Viewer — Tonewave" }] }),
  component: UploadedTabPage,
});

function UploadedTabPage() {
  const { id } = Route.useParams();
  const getBytes = useServerFn(getMyTabBytes);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [meta, setMeta] = useState<{ title: string; artist: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fast path: render from IndexedDB cache if we've opened this tab before.
        const cached = await getCachedTab(id);
        if (cached && !cancelled) setBytes(cached);

        const res = await getBytes({ data: { id } });
        if (cancelled) return;
        setMeta({ title: res.title, artist: res.artist });
        if (!cached) {
          const bin = atob(res.base64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          setBytes(arr);
          void setCachedTab(id, arr);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo cargar la tablatura";
        setError(msg);
        toast.error(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getBytes]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/library">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Librería
        </Link>
      </Button>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm">{error}</div>
      ) : !bytes ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando tablatura…
        </div>
      ) : (
        <AlphaTabViewer bytes={bytes} title={meta?.title} artist={meta?.artist ?? undefined} />
      )}
    </div>
  );
}
