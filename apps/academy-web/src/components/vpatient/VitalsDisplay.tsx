// Props-driven vitals monitor strip - renders a LIVE set of numeric vitals as
// a bedside-monitor readout row. Used by the virtual-patient sim (fed from the
// engine's state each tick). Deliberately separate from VitalsMonitor.tsx,
// which plays a pre-computed recharts trace; this one just shows the current
// numbers, which is what a running sim needs on a phone.
//
// Trends: pass `history` (the player samples it) and each tile draws a tiny
// hand-rolled SVG sparkline - a learner should SEE the BP drifting down, not
// just notice a lower number. No chart library: a polyline is enough and it
// stays cheap at 1 Hz on a low-end phone.

import type { VitalsState } from "../../data/vpatient/types";

/** One time-sample of the numeric vitals the sparklines trend. */
export interface VitalsSample {
  atSec: number;
  hr: number;
  sbp: number;
  spo2: number;
  rr: number;
  tempC: number;
}

function Spark({ points, color }: { points: number[]; color: string }) {
  if (points.length < 3) return null;
  const w = 56;
  const h = 12;
  let min = Math.min(...points);
  let max = Math.max(...points);
  // Pad a near-flat series so noise doesn't render as a cliff.
  const minSpan = Math.max(2, Math.abs(max) * 0.06);
  if (max - min < minSpan) {
    const mid = (max + min) / 2;
    min = mid - minSpan / 2;
    max = mid + minSpan / 2;
  }
  const step = w / (points.length - 1);
  const path = points
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / (max - min)) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-3 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={path} fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Alarm thresholds - a readout pulses red when its value leaves the safe band. */
function isAlarming(key: keyof VitalsState, v: VitalsState): boolean {
  switch (key) {
    case "hr":
      return v.hr < 50 || v.hr > 120;
    case "sbp":
      return v.sbp < 90 || v.sbp > 180;
    case "spo2":
      return v.spo2 < 92;
    case "rr":
      return v.rr < 10 || v.rr > 24;
    case "tempC":
      return v.tempC >= 38.3 || v.tempC < 35;
    default:
      return false;
  }
}

function Readout({
  label,
  value,
  unit,
  color,
  alarm,
  trend,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  alarm?: boolean;
  trend?: number[];
}) {
  return (
    <div
      className={`rounded-xl border border-florence-line bg-florence-ink px-2 py-2 sm:px-3 sm:py-2.5 ${
        alarm ? "animate-pulse-dot motion-reduce:animate-none ring-1 ring-vital-danger/60" : ""
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55">
        {label}
      </p>
      <p
        className="whitespace-nowrap font-mono text-xl font-bold leading-none sm:text-2xl"
        style={{ color }}
      >
        {value}
        <span className="mt-0.5 block text-[9px] font-medium leading-none text-white/50 sm:ml-1 sm:mt-0 sm:inline sm:text-xs">
          {unit}
        </span>
      </p>
      {trend && <Spark points={trend} color={color} />}
    </div>
  );
}

export default function VitalsDisplay({
  vitals,
  clockSec,
  history,
}: {
  vitals: VitalsState;
  clockSec?: number;
  /** Optional trend samples (the sim player accumulates these). */
  history?: VitalsSample[];
}) {
  const trendOf = (key: keyof Omit<VitalsSample, "atSec">): number[] | undefined =>
    history && history.length >= 3 ? history.map((s) => s[key]) : undefined;
  return (
    <div className="rounded-2xl border border-florence-line bg-florence-ink/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-florence-ink px-2.5 py-1 text-xs font-medium text-white/80">
          <span className="h-2 w-2 rounded-full bg-vital-ok animate-pulse-dot motion-reduce:animate-none" />
          {vitals.rhythm}
        </span>
        {clockSec !== undefined && (
          <span className="font-mono text-xs text-florence-slate">
            {String(Math.floor(clockSec / 60)).padStart(2, "0")}:
            {String(clockSec % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Readout label="HR" value={String(Math.round(vitals.hr))} unit="bpm" color="#FF5C61" alarm={isAlarming("hr", vitals)} trend={trendOf("hr")} />
        <Readout label="NIBP" value={`${Math.round(vitals.sbp)}/${Math.round(vitals.dbp)}`} unit="mmHg" color="#9D8BE6" alarm={isAlarming("sbp", vitals)} trend={trendOf("sbp")} />
        <Readout label="SpO₂" value={String(Math.round(vitals.spo2))} unit="%" color="#2EE0BD" alarm={isAlarming("spo2", vitals)} trend={trendOf("spo2")} />
        <Readout label="RR" value={String(Math.round(vitals.rr))} unit="/min" color="#6CC7FF" alarm={isAlarming("rr", vitals)} trend={trendOf("rr")} />
        <Readout label="Temp" value={vitals.tempC.toFixed(1)} unit="°C" color="#FFB020" alarm={isAlarming("tempC", vitals)} trend={trendOf("tempC")} />
        <Readout label="Pain" value={String(Math.round(vitals.pain))} unit="/10" color="#F0F4FF" />
      </div>
      {vitals.loc !== "alert" && (
        <p className="mt-2 rounded-lg bg-vital-danger/10 px-3 py-1.5 text-xs font-medium text-red-800">
          Mental status: {vitals.loc}
        </p>
      )}
    </div>
  );
}
