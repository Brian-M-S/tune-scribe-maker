import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  /** Raw Guitar Pro file bytes */
  bytes: Uint8Array;
  title?: string;
  artist?: string;
};

/**
 * Songsterr-style tab viewer powered by alphaTab (MIT, free).
 * Renders the Guitar Pro file in the browser, plays it with the built-in
 * SoundFont synth, and supports printing/PDF export via the browser dialog.
 */
export function AlphaTabViewer({ bytes, title, artist }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tracks, setTracks] = useState<Array<{ index: number; name: string; tuning: string }>>([]);

  useEffect(() => {
    let disposed = false;
    let api: { destroy?: () => void } | null = null;

    (async () => {
      if (!mountRef.current) return;
      try {
        const mod = await import("@coderline/alphatab");
        const alphaTab = (mod as { default?: unknown }).default ?? mod;
        // @ts-expect-error — alphaTab types are not exported cleanly
        const AlphaTabApi = alphaTab.AlphaTabApi;
        // @ts-expect-error — see above
        const synth = alphaTab.synth;

        const settings = {
          core: {
            engine: "svg",
            // Use jsDelivr-hosted assets so we don't need to bundle SoundFont/worker
            fontDirectory: "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/font/",
            scriptFile: "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/alphaTab.min.js",
          },
          player: {
            enablePlayer: true,
            enableCursor: true,
            enableUserInteraction: true,
            soundFont: "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/soundfont/sonivox.sf2",
            scrollElement: mountRef.current,
          },
          display: { scale: 1.0 },
        };

        api = new AlphaTabApi(mountRef.current, settings);
        apiRef.current = api;

        api.scoreLoaded.on((score: { tracks: Array<{ index: number; name: string; staves: Array<{ tuning: number[] }> }> }) => {
          if (disposed) return;
          setTracks(
            score.tracks.map((t) => ({
              index: t.index,
              name: t.name || `Track ${t.index + 1}`,
              tuning: formatTuning(t.staves?.[0]?.tuning ?? []),
            })),
          );
        });
        api.renderFinished.on(() => !disposed && setReady(true));
        api.playerStateChanged.on((e: { state: number }) => {
          if (disposed) return;
          // 1 = Playing in alphaTab's PlayerState enum
          setPlaying(e.state === 1);
        });
        api.load(bytes);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load tab viewer");
      }
    })();

    return () => {
      disposed = true;
      try {
        api?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [bytes]);

  const togglePlay = () => {
    const api = apiRef.current as { playPause?: () => void } | null;
    api?.playPause?.();
  };

  const printPdf = () => {
    const api = apiRef.current as { print?: (width?: string) => void } | null;
    if (!api?.print) {
      toast.error("Viewer not ready");
      return;
    }
    // alphaTab opens a new window with a clean print layout — user picks "Save as PDF"
    api.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title ?? "Tab"}</p>
          {artist && <p className="truncate text-xs text-muted-foreground">{artist}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={togglePlay} disabled={!ready} size="sm">
            {!ready ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button onClick={printPdf} disabled={!ready} size="sm" variant="outline">
            <Printer className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {tracks.map((t) => (
            <span
              key={t.index}
              className="rounded-full border border-border/60 bg-background/40 px-2 py-1"
            >
              <span className="font-medium">{t.name}</span>
              {t.tuning && <span className="ml-1 text-muted-foreground">· {t.tuning}</span>}
            </span>
          ))}
        </div>
      )}

      <div
        ref={mountRef}
        className="alphatab-surface max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-white p-2"
      />
    </div>
  );
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function formatTuning(midiNotes: number[]): string {
  if (!midiNotes?.length) return "";
  // alphaTab returns from high to low; show low → high like guitarists read it
  return midiNotes
    .slice()
    .reverse()
    .map((n) => NOTE_NAMES[n % 12])
    .join(" ");
}
