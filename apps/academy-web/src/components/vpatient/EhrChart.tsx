// ───────────────────────────────────────────────────────────────────────────
// EhrChart - the chart drawer as an EHR-lite. US-style tabs a new-to-America
// nurse must learn to navigate under pressure:
//   Notes     - the scenario's chart tabs (handoff, history, ...)
//   MAR       - home meds + everything ADMINISTERED this shift (from the
//               action log - real engine state, not copy)
//   Orders    - standing orders + NEW orders that appeared when the provider
//               gave them (locked actions that unlocked mid-run)
//   Flowsheet - charted vitals over time (the player's trend samples)
//   Labs      - resulted panels (LabsPanel, flags + criticals)
// Navigating an Epic-like chart IS transition-to-practice training; keeping
// each tab thin keeps it phone-friendly.
// ───────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { VPatientScenario, LabPanel } from "../../data/vpatient/types";
import type { SimState } from "../../lib/vpatient/engine";
import type { VitalsSample } from "./VitalsDisplay";
import LabsPanel from "./LabsPanel";

type Tab = "notes" | "mar" | "orders" | "flowsheet" | "labs";

const TABS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "mar", label: "MAR" },
  { id: "orders", label: "Orders" },
  { id: "flowsheet", label: "Flowsheet" },
  { id: "labs", label: "Labs" },
];

function mmss(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export default function EhrChart({
  scenario,
  state,
  history,
  resultedPanels,
}: {
  scenario: VPatientScenario;
  state: SimState;
  history: VitalsSample[];
  resultedPanels: LabPanel[];
}) {
  const [tab, setTab] = useState<Tab>("notes");

  // MAR: meds ADMINISTERED this shift = med-category actions in the log.
  const administered = state.actionLog
    .map((e) => ({ e, action: scenario.actions.find((a) => a.id === e.actionId) }))
    .filter((x) => x.action?.category === "med");

  // Orders: standing orders from the chart + new orders that unlocked mid-run.
  const standingOrders = scenario.patient.chart.filter((t) => /order/i.test(t.label));
  const noteTabs = scenario.patient.chart.filter((t) => !/order/i.test(t.label));
  // Every fired unlockAction = a provider-given order this shift (whether or
  // not the action started locked - some scenarios gate by flag instead).
  const newOrders = state.unlockedActionIds
    .map((id) => scenario.actions.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  // Flowsheet: sparse rows (every ~30s) so the table stays scannable.
  const rows = history.filter((s) => s.atSec % 30 === 0).slice(-10);

  return (
    <div className="rounded-2xl border border-florence-line bg-white">
      {/* Patient banner */}
      <div className="border-b border-florence-line px-4 py-2.5">
        <p className="text-sm font-semibold text-florence-ink">
          {scenario.patient.name}, {scenario.patient.age} {scenario.patient.sex}
        </p>
        <p className="mt-0.5 text-[11px] text-florence-slate">
          Allergies: <span className="font-semibold text-red-700">{scenario.patient.allergies.join(", ")}</span>
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-florence-line px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-t-lg px-3 py-1.5 text-xs font-semibold ${
              tab === t.id
                ? "border border-b-0 border-florence-line bg-white text-florence-teal-dark"
                : "text-florence-slate hover:text-florence-ink"
            }`}
          >
            {t.label}
            {t.id === "labs" && resultedPanels.length > 0 && (
              <span className="ml-1 rounded-full bg-vital-danger px-1.5 text-[9px] font-bold text-white">
                {resultedPanels.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-h-72 overflow-y-auto p-3">
        {tab === "notes" && (
          <div className="space-y-2">
            {noteTabs.map((t) => (
              <details key={t.id} open={noteTabs.length === 1} className="rounded-lg border border-florence-line bg-florence-mist/40 p-2.5">
                <summary className="cursor-pointer text-sm font-medium text-florence-ink">{t.label}</summary>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-florence-ink/85">{t.body}</p>
              </details>
            ))}
          </div>
        )}

        {tab === "mar" && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-florence-slate">Home medications</p>
              <ul className="mt-1 space-y-1">
                {scenario.patient.meds.map((m) => (
                  <li key={m} className="flex items-center justify-between rounded-lg bg-florence-mist/40 px-2.5 py-1.5 text-xs text-florence-ink">
                    <span>{m}</span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase text-florence-slate">home</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-florence-slate">Administered this shift</p>
              {administered.length === 0 ? (
                <p className="mt-1 text-xs text-florence-slate">Nothing administered yet.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {administered.map(({ e, action }) => (
                    <li key={`${e.actionId}-${e.atSec}`} className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900">
                      <span>{action!.label}</span>
                      <span className="font-mono text-[10px]">{mmss(e.atSec)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-3">
            {newOrders.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-florence-slate">New orders this shift</p>
                <ul className="mt-1 space-y-1">
                  {newOrders.map((a) => {
                    const done = state.actionLog.some((e) => e.actionId === a.id);
                    return (
                      <li key={a.id} className="flex items-center justify-between rounded-lg bg-florence-teal-soft/40 px-2.5 py-1.5 text-xs text-florence-ink">
                        <span>{a.label}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {done ? "done" : "active"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {standingOrders.map((t) => (
              <div key={t.id}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-florence-slate">{t.label}</p>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-florence-mist/40 px-2.5 py-1.5 text-xs leading-relaxed text-florence-ink/85">{t.body}</p>
              </div>
            ))}
            {newOrders.length === 0 && standingOrders.length === 0 && (
              <p className="text-xs text-florence-slate">No active orders. New orders appear here when the provider gives them.</p>
            )}
          </div>
        )}

        {tab === "flowsheet" && (
          <div>
            {rows.length === 0 ? (
              <p className="text-xs text-florence-slate">Vitals chart here as the shift runs (every 30s).</p>
            ) : (
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wide text-florence-slate">
                    <th className="py-1 pr-2">Time</th>
                    <th className="py-1 pr-2">HR</th>
                    <th className="py-1 pr-2">SBP</th>
                    <th className="py-1 pr-2">SpO₂</th>
                    <th className="py-1 pr-2">RR</th>
                    <th className="py-1">T°C</th>
                  </tr>
                </thead>
                <tbody className="text-florence-ink/90">
                  {rows.map((s) => (
                    <tr key={s.atSec} className="border-t border-florence-line/60">
                      <td className="py-1 pr-2 font-mono text-[11px]">{mmss(s.atSec)}</td>
                      <td className="py-1 pr-2">{Math.round(s.hr)}</td>
                      <td className="py-1 pr-2">{Math.round(s.sbp)}</td>
                      <td className="py-1 pr-2">{Math.round(s.spo2)}</td>
                      <td className="py-1 pr-2">{Math.round(s.rr)}</td>
                      <td className="py-1">{s.tempC.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "labs" &&
          (resultedPanels.length > 0 ? (
            <LabsPanel panels={resultedPanels} />
          ) : (
            <p className="text-xs text-florence-slate">
              {(scenario.labPanels?.length ?? 0) > 0
                ? "No labs back yet. Order a panel from the action menu; results post after the turnaround."
                : "No labs are orderable in this scenario."}
            </p>
          ))}
      </div>
    </div>
  );
}
