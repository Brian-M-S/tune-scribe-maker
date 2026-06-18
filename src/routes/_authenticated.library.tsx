import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Library, Upload, Trash2, FileMusic, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteMyTab, listMyTabs, uploadGpTab } from "@/lib/uploads.functions";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library — Tonewave" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const list = useServerFn(listMyTabs);
  const upload = useServerFn(uploadGpTab);
  const remove = useServerFn(deleteMyTab);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["my-tabs"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecciona un archivo .gp");
      if (!title.trim()) throw new Error("Pon un título");
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      return upload({
        data: {
          title: title.trim(),
          artist: artist.trim() || undefined,
          filename: file.name,
          base64: btoa(bin),
        },
      });
    },
    onSuccess: () => {
      toast.success("Tablatura subida");
      setTitle("");
      setArtist("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["my-tabs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al subir"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries({ queryKey: ["my-tabs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const tabs = q.data?.tabs ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Library className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Librería</h1>
          <p className="text-sm text-muted-foreground">Sube tus archivos Guitar Pro y reprodúcelos en el visor.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Subir tablatura (.gp / .gp3-7 / .gpx)
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Título *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Artista (opcional)" value={artist} onChange={(e) => setArtist(e.target.value)} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".gp,.gp3,.gp4,.gp5,.gp7,.gpx"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
        />
        <Button
          onClick={() => uploadMut.mutate()}
          disabled={uploadMut.isPending || !file || !title.trim()}
        >
          {uploadMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          Subir
        </Button>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
        <h2 className="font-semibold mb-4">Tus tablaturas</h2>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : tabs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has subido tablaturas.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {tabs.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileMusic className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.artist ?? "—"} · {t.source}{t.format ? ` · .${t.format}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.source === "upload" && (
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/tabs/uploaded/$id" params={{ id: t.id }}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Abrir
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`¿Eliminar "${t.title}"?`)) deleteMut.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
