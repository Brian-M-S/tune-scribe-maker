import { createFileRoute } from "@tanstack/react-router";
import { Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({ meta: [{ title: "Studio — Tonewave" }] }),
  component: StudioPage,
});

function StudioPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Wand2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Studio</h1>
          <p className="text-sm text-muted-foreground">Generate songs with Suno AI.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center text-muted-foreground">
        <p>Suno generation will appear here.</p>
        <p className="mt-2 text-xs">
          Next step: add your <code className="text-foreground">SUNO_API_KEY</code> to enable music generation.
        </p>
      </div>
    </div>
  );
}
