import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Printer,
  Loader2,
  Repeat,
  Gauge,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Music,
  Timer,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  bytes: Uint8Array;
  title?: string;
  artist?: string;
};

type TrackInfo = {
  index: number;
  name: string;
  tuning: string;
  muted: boolean;
  solo: boolean;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const formatTuning = (midi: number[]) =>
  !midi?.length
    ? ""
    : midi.slice().reverse().map((n) => NOTE_NAMES[n % 12]).join(" ");

const fmtTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Premium tab viewer powered by alphaTab.
 * Looks/feels like Moises / Soundslice — dark transport bar with speed, zoom,
 * metronome, count-in, A/B loop, per-track mute/solo, fullscreen, PDF export.
 */
export function AlphaTabViewer({ bytes, title, artist }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  // alphaTab types are loose — keep as any internally
  const apiRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [activeTrack, setActiveTrack] = useState<number>(0);

  const [speed, setSpeed] = useState(1.0);
  const [zoom, setZoom] = useState(1.0);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [looping, setLooping] = useState(false);
  const [muted, setMuted] = useState(false);

  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [isFs, setIsFs] = useState(false);

  // --- Boot alphaTab ---
  useEffect(() => {
    let disposed = false;
    let api: any = null;

    (async () => {
      if (!mountRef.current) return;
      try {
        const mod: any = await import("@coderline/alphatab");
        const alphaTab: any = mod.default ?? mod;
        const AlphaTabApi = alphaTab.AlphaTabApi;

        const settings = {
          core: {
            engine: "svg",
            fontDirectory:
              "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/font/",
            scriptFile:
              "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/alphaTab.min.js",
          },
          player: {
            enablePlayer: true,
            enableCursor: true,
            enableUserInteraction: true,
            soundFont:
              "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.3/dist/soundfont/sonivox.sf2",
            scrollElement: mountRef.current,
          },
          display: { scale: 1.0 },
        };

        api = new AlphaTabApi(mountRef.current, settings);
        apiRef.current = api;

        api.scoreLoaded.on((score: any) => {
          if (disposed) return;
          setTracks(
            score.tracks.map((t: any) => ({
              index: t.index,
              name: t.name || `Track ${t.index + 1}`,
              tuning: formatTuning(t.staves?.[0]?.tuning ?? []),
              muted: false,
              solo: false,
            })),
          );
          setActiveTrack(0);
        });
        api.renderFinished.on(() => !disposed && setReady(true));
        api.playerStateChanged.on((e: any) => {
          if (!disposed) setPlaying(e.state === 1);
        });
        api.playerPositionChanged.on((e: any) => {
          if (disposed) return;
          setPos(e.currentTime ?? 0);
          setDur(e.endTime ?? 0);
        });

        api.load(bytes);
      } catch (err) {
        console.error(err);
        toast.error("No se pudo cargar el visor de tablatura");
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

  // --- Sync controls with alphaTab ---
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.playbackSpeed = speed;
  }, [speed]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.metronomeVolume = metronome ? 1 : 0;
  }, [metronome]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.countInVolume = countIn ? 1 : 0;
  }, [countIn]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.isLooping = looping;
  }, [looping]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.masterVolume = muted ? 0 : 1;
  }, [muted]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || !ready) return;
    try {
      api.settings.display.scale = zoom;
      api.updateSettings();
      api.render();
    } catch {
      /* noop */
    }
  }, [zoom, ready]);

  // --- Fullscreen ---
  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFs = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  // --- Actions ---
  const togglePlay = () => apiRef.current?.playPause?.();
  const restart = () => {
    const api = apiRef.current;
    if (!api) return;
    api.tickPosition = 0;
  };
  const printPdf = () => {
    const api = apiRef.current;
    if (!api?.print) return toast.error("El visor aún no está listo");
    api.print();
  };
  const seekPct = (pct: number) => {
    const api = apiRef.current;
    if (!api || !dur) return;
    api.timePosition = (pct / 100) * dur;
  };

  const toggleMute = (idx: number) => {
    const api = apiRef.current;
    if (!api) return;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.index !== idx) return t;
        const next = !t.muted;
        api.changeTrackMute?.([{ index: idx }], next);
        return { ...t, muted: next };
      }),
    );
  };
  const toggleSolo = (idx: number) => {
    const api = apiRef.current;
    if (!api) return;
    setTracks((prev) =>
      prev.map((t) => {
        if (t.index !== idx) return t;
        const next = !t.solo;
        api.changeTrackSolo?.([{ index: idx }], next);
        return { ...t, solo: next };
      }),
    );
  };
  const focusTrack = (idx: number) => {
    const api = apiRef.current;
    if (!api) return;
    setActiveTrack(idx);
    try {
      const score = api.score;
      const t = score?.tracks?.[idx];
      if (t) api.renderTracks([t]);
    } catch {
      /* noop */
    }
  };

  const progressPct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;

  return (
    <div
      ref={wrapRef}
      className="flex flex-col rounded-2xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/40 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{title ?? "Tablatura"}</p>
          {artist && (
            <p className="truncate text-xs text-muted-foreground">{artist}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={printPdf} disabled={!ready} size="sm" variant="outline">
            <Printer className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
          <Button onClick={toggleFs} size="sm" variant="ghost">
            {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Body: tracks sidebar + score */}
      <div className="flex min-h-[60vh] flex-1">
        {tracks.length > 0 && (
          <aside className="hidden w-56 shrink-0 border-r border-border/60 bg-background/30 md:flex md:flex-col">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pistas
            </div>
            <ul className="flex-1 overflow-auto px-2 pb-2 space-y-1">
              {tracks.map((t) => (
                <li
                  key={t.index}
                  className={cn(
                    "rounded-lg border p-2 transition cursor-pointer",
                    activeTrack === t.index
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/50 bg-background/40 hover:border-border",
                  )}
                  onClick={() => focusTrack(t.index)}
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-sm font-medium">{t.name}</span>
                  </div>
                  {t.tuning && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {t.tuning}
                    </p>
                  )}
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute(t.index);
                      }}
                      className={cn(
                        "flex-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition",
                        t.muted
                          ? "bg-destructive/80 text-destructive-foreground"
                          : "bg-background/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      M
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSolo(t.index);
                      }}
                      className={cn(
                        "flex-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition",
                        t.solo
                          ? "bg-accent text-accent-foreground"
                          : "bg-background/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      S
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="flex-1 overflow-hidden bg-white">
          {!ready && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Renderizando partitura…
            </div>
          )}
          <div
            ref={mountRef}
            className="alphatab-surface h-full max-h-[70vh] overflow-auto p-3"
          />
        </div>
      </div>

      {/* Transport bar */}
      <div className="border-t border-border/60 bg-background/60 px-4 py-3 space-y-3">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-muted-foreground w-12">
            {fmtTime(pos)}
          </span>
          <div className="relative flex-1">
            <Slider
              value={[progressPct]}
              max={100}
              step={0.1}
              onValueChange={(v) => seekPct(v[0])}
              disabled={!ready || !dur}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
            {fmtTime(dur)}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={restart} disabled={!ready}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={togglePlay}
              disabled={!ready}
              className="h-10 w-10 rounded-full glow-primary"
            >
              {!ready ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          <div className="h-8 w-px bg-border/60" />

          {/* Speed */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[speed * 100]}
              min={25}
              max={150}
              step={5}
              onValueChange={(v) => setSpeed(v[0] / 100)}
              className="flex-1"
            />
            <span className="text-xs tabular-nums w-12 text-right text-muted-foreground">
              {Math.round(speed * 100)}%
            </span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums w-10 text-center text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-8 w-px bg-border/60" />

          <ToggleChip
            active={metronome}
            onClick={() => setMetronome((v) => !v)}
            icon={<Timer className="h-3.5 w-3.5" />}
            label="Metrónomo"
          />
          <ToggleChip
            active={countIn}
            onClick={() => setCountIn((v) => !v)}
            icon={<Timer className="h-3.5 w-3.5" />}
            label="Count-in"
          />
          <ToggleChip
            active={looping}
            onClick={() => setLooping((v) => !v)}
            icon={<Repeat className="h-3.5 w-3.5" />}
            label="Loop"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
