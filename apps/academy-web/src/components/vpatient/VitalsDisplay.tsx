// Props-driven vitals monitor strip - renders a LIVE set of numeric vitals as
// a bedside-monitor readout row. Used by the virtual-patient sim (fed from the
// engine's state each tick). Deliberately separate from VitalsMonitor.tsx,
// which plays a pre-computed recharts trace; this one just shows the current
// numbers, which is what a running sim needs on a phone.

import type { VitalsState } from "../../data/vpatient/types";

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
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  alarm?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-florence-line bg-florence-ink px-2 py-2 sm:px-3 sm:py-2.5 ${
        alarm ? "animate-pulse-dot ring-1 ring-vital-danger/60" : ""
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
        <span className="mt-0.5 block text-[9px] font-medium leading-none text-white/50 sm:ml-1 sm:mt-0 sm:inline sm:text-[11px]">
          {unit}
        </span>
      </p>
    </div>
  );
}

export default function VitalsDisplay({
  vitals,
  clockSec,
}: {
  vitals: VitalsState;
  clockSec?: number;
}) {
  return (
    <div className="rounded-2xl border border-florence-line bg-florence-ink/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-florence-ink px-2.5 py-1 text-[11px] font-medium text-white/80">
          <span className="h-2 w-2 rounded-full bg-vital-ok animate-pulse-dot" />
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
        <Readout label="HR" value={String(Math.round(vitals.hr))} unit="bpm" color="#FF5C61" alarm={isAlarming("hr", vitals)} />
        <Readout label="NIBP" value={`${Math.round(vitals.sbp)}/${Math.round(vitals.dbp)}`} unit="mmHg" color="#9D8BE6" alarm={isAlarming("sbp", vitals)} />
        <Readout label="SpO₂" value={String(Math.round(vitals.spo2))} unit="%" color="#2EE0BD" alarm={isAlarming("spo2", vitals)} />
        <Readout label="RR" value={String(Math.round(vitals.rr))} unit="/min" color="#6CC7FF" alarm={isAlarming("rr", vitals)} />
        <Readout label="Temp" value={vitals.tempC.toFixed(1)} unit="°C" color="#FFB020" alarm={isAlarming("tempC", vitals)} />
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
