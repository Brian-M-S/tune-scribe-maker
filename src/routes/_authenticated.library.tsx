import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Library — Tonewave" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Library className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Library</h1>
          <p className="text-sm text-muted-foreground">Your tracks, sessions and saved tabs.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center text-muted-foreground">
        Your saved tracks, practice sessions and tabs will live here.
      </div>
    </div>
  );
}
