import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Hand, Piano as PianoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/scales")({
  head: () => ({ meta: [{ title: "Escalas — Tonewave" }] }),
  component: ScalesPage,
});

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

// Intervals (in semitones) from the root
const SCALES: Record<string, number[]> = {
  Mayor: [0, 2, 4, 5, 7, 9, 11],
  "Menor natural": [0, 2, 3, 5, 7, 8, 10],
  "Menor armónica": [0, 2, 3, 5, 7, 8, 11],
  "Menor melódica": [0, 2, 3, 5, 7, 9, 11],
  "Pentatónica mayor": [0, 2, 4, 7, 9],
  "Pentatónica menor": [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10],
  Dórico: [0, 2, 3, 5, 7, 9, 10],
  Frigio: [0, 1, 3, 5, 7, 8, 10],
  Lidio: [0, 2, 4, 6, 7, 9, 11],
  Mixolidio: [0, 2, 4, 5, 7, 9, 10],
  Locrio: [0, 1, 3, 5, 6, 8, 10],
};

const TUNINGS: Record<string, number[]> = {
  // Standard guitar tuning (low to high), MIDI numbers
  "Guitarra estándar (E A D G B E)": [40, 45, 50, 55, 59, 64],
  "Drop D (D A D G B E)": [38, 45, 50, 55, 59, 64],
  "Half-step down (Eb)": [39, 44, 49, 54, 58, 63],
  "Open G (D G D G B D)": [38, 43, 50, 55, 59, 62],
  "Bajo 4 cuerdas (E A D G)": [28, 33, 38, 43],
};

const FRETS = 16;

function buildScaleSet(rootIdx: number, intervals: number[]): Set<number> {
  return new Set(intervals.map((i) => (rootIdx + i) % 12));
}

function ScalesPage() {
  const [instrument, setInstrument] = useState<"guitar" | "piano">("guitar");
  const [tuningKey, setTuningKey] = useState(Object.keys(TUNINGS)[0]);
  const [root, setRoot] = useState<(typeof NOTES)[number]>("A");
  const [scaleName, setScaleName] = useState<string>("Pentatónica menor");

  const rootIdx = NOTES.indexOf(root);
  const intervals = SCALES[scaleName] ?? SCALES["Mayor"];
  const noteSet = useMemo(() => buildScaleSet(rootIdx, intervals), [rootIdx, intervals]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Hand className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Escalas</h1>
          <p className="text-sm text-muted-foreground">
            Visualiza cualquier escala en el mástil de guitarra o en el piano.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SegBtn
            active={instrument === "guitar"}
            onClick={() => setInstrument("guitar")}
            icon={<Hand className="h-3.5 w-3.5" />}
            label="Guitarra / Bajo"
          />
          <SegBtn
            active={instrument === "piano"}
            onClick={() => setInstrument("piano")}
            icon={<PianoIcon className="h-3.5 w-3.5" />}
            label="Piano"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tónica">
            <div className="flex flex-wrap gap-1">
              {NOTES.map((n) => (
                <button
                  key={n}
                  onClick={() => setRoot(n)}
                  className={cn(
                    "min-w-[2.25rem] rounded-md border px-2 py-1 text-xs font-semibold transition",
                    root === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background/40 hover:bg-background/60",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Escala">
            <select
              value={scaleName}
              onChange={(e) => setScaleName(e.target.value as any)}
              className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm"
            >
              {Object.keys(SCALES).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          {instrument === "guitar" && (
            <Field label="Afinación">
              <select
                value={tuningKey}
                onChange={(e) => setTuningKey(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm"
              >
                {Object.keys(TUNINGS).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs">
          {intervals.map((i) => {
            const noteIdx = (rootIdx + i) % 12;
            return (
              <span
                key={i}
                className={cn(
                  "rounded-full border px-2 py-0.5",
                  i === 0
                    ? "border-primary/60 bg-primary/20 text-primary font-semibold"
                    : "border-border/60 bg-background/40 text-muted-foreground",
                )}
              >
                {NOTES[noteIdx]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Visualizer */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 overflow-x-auto">
        {instrument === "guitar" ? (
          <Fretboard tuning={TUNINGS[tuningKey]} noteSet={noteSet} rootIdx={rootIdx} />
        ) : (
          <Keyboard noteSet={noteSet} rootIdx={rootIdx} />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SegBtn({
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
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

// --- Fretboard ---
function Fretboard({
  tuning,
  noteSet,
  rootIdx,
}: {
  tuning: number[];
  noteSet: Set<number>;
  rootIdx: number;
}) {
  // tuning is low to high; render highest string on top
  const strings = [...tuning].reverse();
  const markers = [3, 5, 7, 9, 12, 15];

  return (
    <div className="min-w-[800px]">
      {/* Fret numbers */}
      <div className="flex pl-12 mb-2">
        {Array.from({ length: FRETS + 1 }).map((_, f) => (
          <div
            key={f}
            className="flex-1 text-center text-[10px] text-muted-foreground"
          >
            {f}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-gradient-to-b from-[#3a2a1a] to-[#1f140a] p-2">
        {strings.map((openMidi, sIdx) => (
          <div key={sIdx} className="flex items-center">
            <div className="w-12 text-right pr-2 text-xs font-mono text-amber-200/70">
              {NOTES[openMidi % 12]}
            </div>
            <div className="flex flex-1 relative">
              {/* string line */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-amber-100/30" />
              {Array.from({ length: FRETS + 1 }).map((_, f) => {
                const midi = openMidi + f;
                const noteIdx = midi % 12;
                const inScale = noteSet.has(noteIdx);
                const isRoot = noteIdx === rootIdx;
                const showMarker =
                  sIdx === Math.floor(strings.length / 2) - 1 &&
                  markers.includes(f);
                return (
                  <div
                    key={f}
                    className={cn(
                      "relative flex-1 h-9 border-r border-amber-50/20 flex items-center justify-center",
                      f === 0 && "border-l-4 border-l-amber-50/60",
                    )}
                  >
                    {showMarker && (
                      <span
                        className={cn(
                          "absolute h-2 w-2 rounded-full bg-amber-100/30 -bottom-1",
                          f === 12 && "h-1.5 w-1.5",
                        )}
                      />
                    )}
                    {inScale && (
                      <div
                        className={cn(
                          "relative z-10 grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold shadow-md",
                          isRoot
                            ? "bg-primary text-primary-foreground ring-2 ring-primary-foreground/40"
                            : "bg-accent text-accent-foreground",
                        )}
                      >
                        {NOTES[noteIdx]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Piano ---
function Keyboard({ noteSet, rootIdx }: { noteSet: Set<number>; rootIdx: number }) {
  // Render 3 octaves starting from C
  const octaves = 3;
  const whiteIdx = [0, 2, 4, 5, 7, 9, 11];
  const blackIdx = [1, 3, 6, 8, 10]; // positions within octave
  const whiteWidth = 44;

  const totalWhite = whiteIdx.length * octaves;

  return (
    <div
      className="relative mx-auto"
      style={{ width: totalWhite * whiteWidth, height: 200 }}
    >
      {/* White keys */}
      <div className="flex h-full">
        {Array.from({ length: octaves }).map((_, oct) =>
          whiteIdx.map((n) => {
            const noteIdx = n;
            const inScale = noteSet.has(noteIdx);
            const isRoot = noteIdx === rootIdx;
            return (
              <div
                key={`w-${oct}-${n}`}
                className="relative flex flex-col-reverse items-center border border-neutral-300 bg-white rounded-b-md"
                style={{ width: whiteWidth }}
              >
                {inScale && (
                  <div
                    className={cn(
                      "mb-3 grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold",
                      isRoot
                        ? "bg-primary text-primary-foreground ring-2 ring-primary-foreground/30"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {NOTES[noteIdx]}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* Black keys overlay */}
      {Array.from({ length: octaves }).map((_, oct) =>
        blackIdx.map((n) => {
          // position: black keys sit between specific white keys
          // Within an octave (0..6 white indices): b#0->between 0&1, b#1->1&2, b#2->3&4, b#3->4&5, b#4->5&6
          const offsetMap: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
          const whitePos = offsetMap[n];
          const left = (oct * 7 + whitePos + 1) * whiteWidth - whiteWidth * 0.3;
          const inScale = noteSet.has(n);
          const isRoot = n === rootIdx;
          return (
            <div
              key={`b-${oct}-${n}`}
              className="absolute top-0 flex flex-col-reverse items-center rounded-b-md bg-neutral-900 border border-neutral-700"
              style={{
                left,
                width: whiteWidth * 0.6,
                height: 120,
              }}
            >
              {inScale && (
                <div
                  className={cn(
                    "mb-2 grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold",
                    isRoot
                      ? "bg-primary text-primary-foreground ring-2 ring-primary-foreground/30"
                      : "bg-accent text-accent-foreground",
                  )}
                >
                  {NOTES[n]}
                </div>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
