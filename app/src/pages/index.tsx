import { Inter } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

type PhaseKey = "primer" | "pulse" | "drift" | "synthesis";

type PhaseBlueprint = {
  key: PhaseKey;
  label: string;
  mantra: string;
  gradient: string;
  accent: string;
};

const PHASE_BLUEPRINT: PhaseBlueprint[] = [
  {
    key: "primer",
    label: "Primer Scan",
    mantra: "Sketch the win and stage your cues.",
    gradient: "from-sky-500/60 via-cyan-500/20 to-transparent",
    accent: "text-sky-300",
  },
  {
    key: "pulse",
    label: "Focus Pulse",
    mantra: "Dive into the single most convincing move.",
    gradient: "from-emerald-500/50 via-teal-500/10 to-transparent",
    accent: "text-emerald-300",
  },
  {
    key: "drift",
    label: "Drift Break",
    mantra: "Let loose threads surface without judgment.",
    gradient: "from-amber-400/40 via-orange-500/10 to-transparent",
    accent: "text-amber-300",
  },
  {
    key: "synthesis",
    label: "Anchor Synthesis",
    mantra: "Capture the pattern before it dissolves.",
    gradient: "from-fuchsia-500/50 via-purple-500/20 to-transparent",
    accent: "text-fuchsia-300",
  },
];

type InferenceSettings = {
  signal: number;
  scatter: number;
  curiosity: number;
};

type PhaseDefinition = PhaseBlueprint & {
  seconds: number;
};

type CycleLog = {
  id: number;
  completedAt: string;
  hypothesis: string;
  settings: InferenceSettings;
  durations: Record<PhaseKey, number>;
  capture?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const describeSignal = (value: number) => {
  if (value >= 75) return "running hot and ready for deep dives";
  if (value >= 50) return "steady enough to stay in the pocket";
  if (value >= 25) return "flickering—momentum needs scaffolding";
  return "fragile—small wins will keep the lights on";
};

const describeScatter = (value: number) => {
  if (value >= 75) return "saturated with tangents";
  if (value >= 50) return "noisy but steerable";
  if (value >= 25) return "mostly aligned with the mission";
  return "quiet and cooperative";
};

const describeCuriosity = (value: number) => {
  if (value >= 75) return "the work feels novel and worth exploring";
  if (value >= 50) return "some intrigue is present";
  if (value >= 25) return "you need intentional sparks";
  return "keep it lightweight—novelty is running low";
};

const computeDurations = ({
  signal,
  scatter,
  curiosity,
}: InferenceSettings) => {
  const primer = clamp(
    Math.round(2 + scatter / 22 - signal / 45 + curiosity / 55),
    1,
    6,
  );
  const pulse = clamp(
    Math.round(20 + signal / 5 - scatter / 7 + curiosity / 8),
    12,
    40,
  );
  const drift = clamp(
    Math.round(4 + scatter / 14 - signal / 35 + curiosity / 18),
    3,
    12,
  );
  const synthesis = clamp(
    Math.round(6 + curiosity / 14 + signal / 20 - scatter / 26),
    3,
    15,
  );

  const hypothesis = [
    `Signal is ${describeSignal(signal)}, so the Focus Pulse settles at ${pulse} minutes to stay persuasive without burnout.`,
    `Scatter reads ${describeScatter(scatter)}, which grows a ${drift}-minute Drift Break to metabolize stray loops.`,
    `Curiosity says ${describeCuriosity(curiosity)}, so ${synthesis} minutes of Anchor time protect insight before it evaporates.`,
  ].join(" ");

  return {
    durations: {
      primer,
      pulse,
      drift,
      synthesis,
    },
    hypothesis,
  };
};

export default function Home() {
  const [intent, setIntent] = useState("Ship one convincing micro-outcome.");
  const [captureDraft, setCaptureDraft] = useState("");
  const [cycles, setCycles] = useState<CycleLog[]>([]);
  const [autoContinue, setAutoContinue] = useState(true);
  const [cycleStart, setCycleStart] = useState<Date | null>(null);
  const [settings, setSettings] = useState<InferenceSettings>({
    signal: 62,
    scatter: 48,
    curiosity: 55,
  });

  const { durations, hypothesis } = useMemo(
    () => computeDurations(settings),
    [settings],
  );

  const sequence: PhaseDefinition[] = useMemo(
    () =>
      PHASE_BLUEPRINT.map((phase) => ({
        ...phase,
        seconds: durations[phase.key] * 60,
      })),
    [durations],
  );

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(sequence[0]?.seconds ?? 0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!sequence.length) return;
    setPhaseIndex(0);
    setTimeLeft(sequence[0].seconds);
    setIsRunning(false);
    setCycleStart(null);
  }, [sequence]);

  useEffect(() => {
    if (!isRunning) return;

    const tick = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(tick);
  }, [isRunning]);

  const logCycle = useCallback(
    (capture?: string) => {
      const timestamp = new Date();
      setCycles((prev) => [
        {
          id: timestamp.valueOf(),
          completedAt: timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          hypothesis,
          settings,
          durations,
          capture,
        },
        ...prev,
      ]);
    },
    [durations, hypothesis, settings],
  );

  const handlePhaseComplete = useCallback(() => {
    setPhaseIndex((current) => {
      const nextIndex = current + 1;
      if (nextIndex >= sequence.length) {
        logCycle(captureDraft.trim() ? captureDraft.trim() : undefined);
        setCaptureDraft("");
        setCycleStart(autoContinue ? new Date() : null);
        const primerSeconds = sequence[0]?.seconds ?? 0;
        setTimeLeft(primerSeconds);
        if (!autoContinue) {
          setIsRunning(false);
        } else {
          setIsRunning(true);
        }
        return 0;
      }
      const upcomingSeconds = sequence[nextIndex]?.seconds ?? sequence[0]?.seconds ?? 0;
      setTimeLeft(upcomingSeconds);
      return nextIndex;
    });
  }, [autoContinue, captureDraft, logCycle, sequence]);

  useEffect(() => {
    if (!isRunning || timeLeft > 0) return;
    handlePhaseComplete();
  }, [handlePhaseComplete, isRunning, timeLeft]);

  const currentPhase = sequence[phaseIndex];
  const currentSeconds = currentPhase?.seconds ?? 1;
  const elapsed = currentSeconds - timeLeft;
  const progressRatio = clamp(elapsed / currentSeconds, 0, 1);

  const startTimer = () => {
    setIsRunning(true);
    setCycleStart((prev) => prev ?? new Date());
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setPhaseIndex(0);
    setTimeLeft(sequence[0]?.seconds ?? 0);
    setIsRunning(false);
    setCaptureDraft("");
    setCycleStart(null);
  };

  const skipPhase = () => {
    handlePhaseComplete();
  };

  const insightPrompts = [
    "Name the single proof that the pulse produced.",
    "Capture one friction that keeps recurring.",
    "Note a curiosity you want to chase later.",
  ];

  return (
    <main
      className={`${inter.className} min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-12`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                Abductive Tomato Engine
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-100 sm:text-4xl">
                Hypothesis-driven focus loops for restless minds
              </h1>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-ink-800/80 px-4 py-3 text-right shadow-inner">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Next Leap
              </p>
              <p className="text-lg font-semibold text-sky-200">
                {sequence
                  .map((phase) => phase.seconds / 60)
                  .reduce((acc, item) => acc + item, 0)}
                {" min"}
              </p>
              <p className="text-xs text-slate-400">
                {cycleStart
                  ? `Cycle lit at ${cycleStart.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Awaiting ignition"}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 md:max-w-3xl">
            We abduct the most plausible focus recipe from your current
            chemistry—balancing signal, scatter, and curiosity into a four-part
            loop. Run the pulse, trust the drift, and lock the pattern before it
            fades.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 shadow-lg shadow-ink-950/40 backdrop-blur">
            <h2 className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Calibrate
            </h2>
            <p className="mt-2 text-lg font-semibold text-slate-100">
              Brief the loop before you light it.
            </p>

            <label className="mt-6 block space-y-3">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Working Hypothesis
              </span>
              <textarea
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                className="w-full rounded-2xl border border-slate-700/60 bg-ink-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/40"
                rows={3}
              />
            </label>

            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Signal strength</span>
                  <span className="text-sky-200">{settings.signal}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.signal}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      signal: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full accent-sky-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Gauge your energy + conviction. Higher signal extends the
                  Pulse, lower signal nudges micro-wins.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Scatter field</span>
                  <span className="text-amber-200">{settings.scatter}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.scatter}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      scatter: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full accent-amber-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Noise floor across your thoughts. More scatter grows Drift
                  breaks to metabolize tangents.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Curiosity voltage</span>
                  <span className="text-fuchsia-200">{settings.curiosity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.curiosity}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      curiosity: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full accent-fuchsia-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Intrigue + play. High voltage earns richer Synthesis. Low
                  voltage keeps cycles tight.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Quick anchors
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Draft outline for feature spec",
                  "Untangle inbox triage in 15m",
                  "Ship first pass on UI iteration",
                  "Study two research tabs only",
                ].map((snippet) => (
                  <button
                    key={snippet}
                    type="button"
                    onClick={() => setIntent(snippet)}
                    className="rounded-full border border-slate-700/50 bg-ink-800/70 px-4 py-2 text-xs text-slate-200 transition hover:border-sky-500/60 hover:text-sky-200"
                  >
                    {snippet}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="relative flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/5 bg-ink-900/80 p-6 shadow-xl shadow-ink-950/50">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />
            <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                    Active Phase
                  </p>
                  <h2
                    className={`mt-2 text-2xl font-semibold ${currentPhase?.accent ?? "text-slate-100"}`}
                  >
                    {currentPhase?.label ?? "Ready"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    {currentPhase?.mantra ?? "Tweak the inputs then ignite the loop."}
                  </p>
                </div>
                <div
                  className="relative flex aspect-square w-40 items-center justify-center rounded-full border border-white/5 bg-ink-950/80 shadow-inner shadow-sky-900/30"
                  style={{
                    background: `conic-gradient(rgba(56,189,248,0.4) ${progressRatio * 360}deg, rgba(15,23,42,0.8) ${progressRatio * 360}deg)`,
                  }}
                >
                  <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-slate-800/80 bg-ink-900/90 text-center">
                    <span className="text-[2rem] font-semibold text-slate-100">
                      {formatTime(timeLeft)}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-slate-400">
                      Remaining
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={isRunning ? pauseTimer : startTimer}
                  className="rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-ink-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                >
                  {isRunning ? "Pause Loop" : "Ignite Loop"}
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  className="rounded-full border border-slate-700/70 px-5 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                >
                  Reset Primer
                </button>
                <button
                  type="button"
                  onClick={skipPhase}
                  className="rounded-full border border-slate-700/70 px-5 py-2 text-sm text-slate-300 transition hover:border-sky-500/60 hover:text-sky-200"
                >
                  Skip Forward
                </button>
                <label className="flex items-center gap-2 rounded-full border border-white/5 bg-ink-900/70 px-4 py-2 text-xs uppercase tracking-wide text-slate-400">
                  <input
                    type="checkbox"
                    checked={autoContinue}
                    onChange={(event) => setAutoContinue(event.target.checked)}
                    className="accent-sky-400"
                  />
                  Auto-loop
                </label>
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-white/5 bg-ink-950/40 p-5">
              <h3 className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Abductive Thesis
              </h3>
              <p className="text-sm text-slate-200">{hypothesis}</p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/5 bg-ink-950/30 p-5">
              <h3 className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Cycle Blueprint
              </h3>
              <div className="space-y-3">
                {sequence.map((phase, index) => {
                  const isActive = index === phaseIndex;
                  const minutes = Math.round(phase.seconds / 60);
                  const upcoming = index > phaseIndex;

                  return (
                    <div
                      key={phase.key}
                      className={`relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900/70 p-4 transition ${isActive ? "ring-1 ring-sky-400/60" : upcoming ? "opacity-80" : "opacity-60"}`}
                    >
                      <div
                        className={`absolute inset-0 -z-10 bg-gradient-to-r ${phase.gradient} opacity-70`}
                      />
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            {index + 1 < 10 ? `0${index + 1}` : index + 1}
                          </p>
                          <p
                            className={`text-lg font-semibold ${phase.accent}`}
                          >
                            {phase.label}
                          </p>
                          <p className="text-xs text-slate-200/90">
                            {phase.mantra}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-slate-100">
                            {minutes}m
                          </p>
                          {isActive ? (
                            <p className="text-xs text-sky-200">live</p>
                          ) : upcoming ? (
                            <p className="text-xs text-slate-400">queued</p>
                          ) : (
                            <p className="text-xs text-slate-500">logged</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6 rounded-3xl border border-white/5 bg-ink-900/70 p-6 shadow-lg shadow-ink-950/40">
            <div>
              <h2 className="text-sm uppercase tracking-[0.3em] text-slate-400">
                Capture Drift
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Park insights without leaving the loop.
              </p>
            </div>
            <label className="flex-1 rounded-2xl border border-slate-700/60 bg-ink-950/80">
              <textarea
                value={captureDraft}
                onChange={(event) => setCaptureDraft(event.target.value)}
                placeholder={insightPrompts[phaseIndex % insightPrompts.length]}
                className="h-full min-h-[160px] w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-fuchsia-500/30"
              />
            </label>
            <div className="rounded-2xl border border-white/5 bg-ink-950/30 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Completed Loops
                </h3>
                <span className="rounded-full border border-slate-700/60 px-3 py-1 text-xs text-slate-300">
                  {cycles.length}
                </span>
              </div>
              <div className="mt-4 space-y-4 max-h-60 overflow-y-auto pr-2">
                {cycles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700/60 bg-ink-900/70 p-4 text-center text-xs text-slate-500">
                    Run a loop to log your abductive trail.
                  </div>
                ) : (
                  cycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      className="rounded-2xl border border-slate-800/70 bg-ink-900/80 p-4"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                        <span>{cycle.completedAt}</span>
                        <span className="text-sky-200">
                          {cycle.durations.pulse}m pulse
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200">
                        {cycle.hypothesis}
                      </p>
                      {cycle.capture ? (
                        <p className="mt-3 text-xs text-slate-300">
                          ➜ {cycle.capture}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-ink-950/40 p-5 text-xs text-slate-400">
              <p className="font-semibold uppercase tracking-[0.3em] text-slate-300">
                Loop Notes
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  • Primer Scan should always feel frictionless—keep it under 6
                  minutes.
                </li>
                <li>
                  • Drift Break is for metabolizing noise, not doom scrolling.
                </li>
                <li>
                  • Synthesis ends the loop: type one sentence that proves it
                  happened.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
