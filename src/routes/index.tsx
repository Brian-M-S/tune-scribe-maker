import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Wand2, Sliders, Youtube, FileMusic, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tonewave — AI music, stems and synced guitar tabs" },
      {
        name: "description",
        content:
          "Generate songs with Suno, separate vocals, slow down YouTube videos and practice with synchronized Songsterr tabs and PDF export.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: "/studio" });
    }
  },
  component: Landing,
});

const FEATURES = [
  {
    icon: Wand2,
    title: "Generate with Suno",
    body: "Prompt-to-song, custom lyrics, instrumental, V4 → V5.5. Stream output in seconds, watermark-free.",
  },
  {
    icon: Sliders,
    title: "Moises-style stems",
    body: "Separate vocals from instrumental, change tempo and pitch independently, loop A→B and metronome.",
  },
  {
    icon: Youtube,
    title: "YouTube practice",
    body: "Drop any video, slow it down without changing pitch, and keep the cursor on the right note.",
  },
  {
    icon: FileMusic,
    title: "Synced Songsterr tabs · PDF",
    body: "Find the tab, lock it to the original audio like Songsterr, and export to PDF in one click.",
  },
];

function Landing() {
  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary glow-primary" />
              Suno + Moises + Songsterr, in one app
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Make music. <span className="text-gradient">Slow it down.</span>{" "}
              Play along.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Generate songs with AI, separate vocals, slow down any YouTube
              video without changing pitch, and practice with guitar tabs that
              follow the original audio note by note.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="glow-primary">
                <Link to="/auth">
                  Get started <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/practice">Try practice mode</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition hover:border-primary/40 hover:bg-card"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
