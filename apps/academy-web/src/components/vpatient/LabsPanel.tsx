// ───────────────────────────────────────────────────────────────────────────
// LabsPanel - renders resulted lab panels with each value flagged against its
// reference + critical range. Shared by the sim player (chart drawer) and the
// debrief ("labs you saw"). Mobile-first: a scannable two-column row per value,
// flags carried by a TEXT chip + color (never color alone) for accessibility.
// ───────────────────────────────────────────────────────────────────────────

import type { LabPanel } from "../../data/vpatient/types";
import { flagOf, isAbnormal, isCritical, type InterpretedValue } from "../../lib/vpatient/labs";
import { interpretPanel } from "../../lib/vpatient/labs";

const FLAG_CHIP: Record<string, { label: string; cls: string }> = {
  "critical-high": { label: "CRIT ↑", cls: "bg-vital-danger text-white" },
  "critical-low": { label: "CRIT ↓", cls: "bg-vital-danger text-white" },
  high: { label: "H", cls: "bg-vital-warn/20 text-amber-800 ring-1 ring-vital-warn/40" },
  low: { label: "L", cls: "bg-vital-warn/20 text-amber-800 ring-1 ring-vital-warn/40" },
  abnormal: { label: "abn", cls: "bg-vital-warn/20 text-amber-800 ring-1 ring-vital-warn/40" },
};

function refText(v: InterpretedValue): string {
  if (v.refLow !== undefined && v.refHigh !== undefined) return `${v.refLow}–${v.refHigh}`;
  if (v.refHigh !== undefined) return `<${v.refHigh}`;
  if (v.refLow !== undefined) return `>${v.refLow}`;
  return "";
}

export default function LabsPanel({ panels, compact = false }: { panels: LabPanel[]; compact?: boolean }) {
  if (panels.length === 0) return null;
  return (
    <div className="space-y-3">
      {panels.map((panel) => {
        const values = interpretPanel(panel);
        const criticalCount = values.filter((v) => isCritical(v.computedFlag)).length;
        return (
          <div key={panel.id} className="rounded-xl border border-florence-line bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-florence-line px-3 py-2">
              <p className="text-sm font-semibold text-florence-ink">{panel.label}</p>
              {criticalCount > 0 && (
                <span className="rounded-full bg-vital-danger px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  {criticalCount} critical
                </span>
              )}
            </div>
            <ul className="divide-y divide-florence-line/70">
              {values.map((v) => {
                const flag = v.computedFlag;
                const chip = isAbnormal(flag) ? FLAG_CHIP[flag] : undefined;
                return (
                  <li
                    key={v.id}
                    className={`flex items-center justify-between gap-3 px-3 py-1.5 ${
                      isCritical(flag) ? "bg-red-50/70" : ""
                    }`}
                  >
                    <span className={`text-sm ${isAbnormal(flag) ? "font-medium text-florence-ink" : "text-florence-ink/80"}`}>
                      {v.label}
                    </span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {!compact && refText(v) && (
                        <span className="text-[11px] text-florence-slate/70">{refText(v)}</span>
                      )}
                      <span className={`text-sm ${isAbnormal(flag) ? "font-semibold text-florence-ink" : "text-florence-ink/80"}`}>
                        {v.value}
                        {v.unit ? <span className="ml-0.5 text-[11px] font-normal text-florence-slate">{v.unit}</span> : null}
                      </span>
                      {chip && (
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${chip.cls}`} aria-label={flag}>
                          {chip.label}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Which panels hold a critical value the learner should have caught - used by
 *  the debrief to name a missed-lab opportunity. */
export function panelsWithCritical(panels: LabPanel[]): LabPanel[] {
  return panels.filter((p) => p.values.some((v) => isCritical(flagOf({ ...v }))));
}
