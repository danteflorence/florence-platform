import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  phaseAt,
  SIM_DURATION,
  SIM_EVENTS,
  VITALS,
  type PhaseTone,
} from "../data/vitals";

const TONE_RING: Record<PhaseTone, string> = {
  baseline: "border-florence-line",
  intervention: "border-florence-indigo/50 bg-florence-indigo-soft/40",
  critical: "border-vital-danger/50 bg-red-50",
  recovery: "border-vital-ok/40 bg-emerald-50",
};

const TONE_DOT: Record<PhaseTone, string> = {
  baseline: "bg-florence-slate",
  intervention: "bg-florence-indigo",
  critical: "bg-vital-danger",
  recovery: "bg-vital-ok",
};

function Readout({
  label,
  value,
  unit,
  color,
  alarm,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  alarm?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-florence-line bg-florence-ink px-2.5 py-2.5 sm:px-4 sm:py-3 ${
        alarm ? "animate-pulse-dot" : ""
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <p
        className="whitespace-nowrap font-mono text-2xl font-bold leading-none sm:text-3xl"
        style={{ color }}
      >
        {value}
        {/* Unit stacks under the value on narrow phones so the tightest card
            (NIBP "98/64 mmHg") never clips; sits inline from sm: upward. */}
        <span className="mt-0.5 block text-[10px] font-medium leading-none text-white/50 sm:ml-1 sm:mt-0 sm:inline sm:text-xs">
          {unit}
        </span>
      </p>
    </div>
  );
}

export default function VitalsMonitor() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  const idx = Math.min(VITALS.length - 1, Math.round(t));
  const sample = VITALS[idx];
  const phase = phaseAt(t);
  const asystole = sample.hr === 0;
  const finished = t >= SIM_DURATION;

  // Animation loop (time-based so it is frame-rate independent).
  const tick = useCallback(
    (now: number) => {
      if (last.current === 0) last.current = now;
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((prev) => {
        const next = prev + dt * 5 * speed; // ~24s playback at 1×
        if (next >= SIM_DURATION) {
          setPlaying(false);
          return SIM_DURATION;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    },
    [speed],
  );

  useEffect(() => {
    if (playing) {
      last.current = 0;
      raf.current = requestAnimationFrame(tick);
    }
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, tick]);

  const chartData = useMemo(() => VITALS.slice(0, idx + 1), [idx]);

  const toggle = () => {
    if (finished) {
      setT(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  return (
    <div className="fl-card my-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-florence-line px-5 py-3">
        <div>
          <p className="fl-eyebrow">Bedside simulation</p>
          <h3 className="text-lg font-semibold">SVT → adenosine monitor</h3>
        </div>
        <span className="fl-pill">
          <span
            className={`h-2 w-2 rounded-full ${TONE_DOT[phase.tone]} ${
              playing ? "animate-pulse-dot" : ""
            }`}
          />
          {sample.rhythm}
        </span>
      </div>

      {/* grid-cols-1 on mobile constrains the column to the card width; without it
          the implicit auto track grows to the readout content and clips on phones. */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
        {/* Monitor */}
        <div className="bg-florence-ink/[0.03] p-4">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Readout
              label="HR"
              value={asystole ? "- -" : String(sample.hr)}
              unit="bpm"
              color="#FF5C61"
              alarm={asystole}
            />
            <Readout
              label="NIBP"
              value={`${sample.sbp}/${sample.dbp}`}
              unit="mmHg"
              color="#9D8BE6"
            />
            <Readout
              label="SpO₂"
              value={String(sample.spo2)}
              unit="%"
              color="#2EE0BD"
            />
          </div>

          <div className="rounded-xl border border-florence-line bg-florence-ink p-2">
            <ResponsiveContainer width="100%" height={170}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 10, bottom: 0, left: -20 }}
              >
                <CartesianGrid stroke="#ffffff14" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, SIM_DURATION]}
                  ticks={[0, 30, 60, 90, 120]}
                  tick={{ fill: "#ffffff66", fontSize: 10 }}
                  tickFormatter={(v) => `${v}s`}
                  stroke="#ffffff22"
                />
                <YAxis
                  domain={[0, 220]}
                  ticks={[0, 60, 120, 180]}
                  tick={{ fill: "#ffffff66", fontSize: 10 }}
                  stroke="#ffffff22"
                />
                {SIM_EVENTS.filter((e) => e.t <= t).map((e) => (
                  <ReferenceLine
                    key={e.label}
                    x={e.t}
                    stroke="#ffffff44"
                    strokeDasharray="3 3"
                    label={{
                      value: e.label,
                      fill: "#ffffffaa",
                      fontSize: 9,
                      position: "insideTopRight",
                    }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke="#FF5C61"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Transport controls */}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={toggle}
              className="rounded-lg bg-florence-teal px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-florence-teal-dark"
            >
              {finished ? "Replay" : playing ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setT(0);
              }}
              className="rounded-lg border border-florence-line px-3 py-2 text-sm font-medium text-florence-slate hover:bg-florence-mist"
            >
              Reset
            </button>
            <input
              type="range"
              min={0}
              max={SIM_DURATION}
              step={0.5}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
              aria-label="Scrub timeline"
              className="h-1 flex-1 cursor-pointer accent-florence-teal"
            />
            <div className="inline-flex overflow-hidden rounded-lg border border-florence-line text-xs">
              {[1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1.5 font-semibold ${
                    speed === s
                      ? "bg-florence-indigo text-white"
                      : "text-florence-slate hover:bg-florence-mist"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Narration */}
        <div className="border-t border-florence-line p-5 lg:border-l lg:border-t-0">
          <div className={`rounded-xl border p-4 transition-colors ${TONE_RING[phase.tone]}`}>
            <div className="mb-1 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[phase.tone]}`} />
              <span className="font-mono text-xs text-florence-slate">
                t = {Math.round(t)}s
              </span>
            </div>
            <h4 className="font-serif text-base text-florence-ink">
              {phase.label}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-florence-ink/90">
              {phase.detail}
            </p>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-florence-slate/80">
            Illustrative trace for teaching the adenosine response - not a real
            patient recording.
          </p>
        </div>
      </div>
    </div>
  );
}
