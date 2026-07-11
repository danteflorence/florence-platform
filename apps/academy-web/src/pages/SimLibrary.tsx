// ───────────────────────────────────────────────────────────────────────────
// Sim Library - the learner's front door to the virtual-patient scenarios.
// Until now sims were reachable only by direct URL (/sim/:id); this lists every
// APPROVED scenario, grouped by care setting (the AMC units), each a card that
// launches the run. Draft scenarios never appear - same gate as the registry.
// ───────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { approvedScenarios } from "../data/vpatient/registry";
import { CARE_SETTING_BY_ID, CARE_CATEGORY_LABEL, type CareCategory } from "../data/vpatient/careSettings";
import { CLIENT_NEED_LABEL } from "../data/blueprint";
import type { VPatientScenario } from "../data/vpatient/types";

const CATEGORY_ORDER: CareCategory[] = [
  "critical_care",
  "acute_inpatient",
  "procedural",
  "womens_childrens",
  "outpatient",
  "community",
];

function categoryOf(sc: VPatientScenario): CareCategory | "other" {
  const setting = sc.careSettingId ? CARE_SETTING_BY_ID.get(sc.careSettingId) : undefined;
  return setting?.category ?? "other";
}

export default function SimLibrary() {
  const scenarios = useMemo(() => approvedScenarios(), []);
  const groups = useMemo(() => {
    const byCat = new Map<CareCategory | "other", VPatientScenario[]>();
    for (const sc of scenarios) {
      const cat = categoryOf(sc);
      const list = byCat.get(cat) ?? [];
      list.push(sc);
      byCat.set(cat, list);
    }
    const ordered: { cat: CareCategory | "other"; label: string; items: VPatientScenario[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = byCat.get(cat);
      if (items && items.length) ordered.push({ cat, label: CARE_CATEGORY_LABEL[cat], items });
    }
    const other = byCat.get("other");
    if (other && other.length) ordered.push({ cat: "other", label: "Other", items: other });
    return ordered;
  }, [scenarios]);

  return (
    <div className="min-h-screen bg-florence-mist">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm font-medium text-florence-slate">Virtual patients</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-florence-ink">Sim Library</h1>
        <p className="mt-1 max-w-prose text-sm text-florence-slate">
          Step into a real unit and manage a deteriorating patient in real time. Each run scores your
          clinical judgment and debriefs you against the optimal path.
        </p>

        {scenarios.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-florence-line bg-white p-6 text-center">
            <p className="text-sm text-florence-slate">No approved scenarios yet. Check back soon.</p>
          </div>
        )}

        <div className="mt-6 space-y-7">
          {groups.map((g) => (
            <section key={g.cat}>
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-florence-slate">{g.label}</h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {g.items.map((sc) => {
                  const setting = sc.careSettingId ? CARE_SETTING_BY_ID.get(sc.careSettingId) : undefined;
                  return (
                    <Link
                      key={sc.id}
                      to={`/sim/${sc.id}`}
                      className="group flex flex-col rounded-2xl border border-florence-line bg-white p-4 transition-shadow hover:shadow-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-florence-ink group-hover:text-florence-teal-dark">
                          {sc.title}
                        </p>
                        {setting && (
                          <span className="shrink-0 rounded-full bg-florence-mist px-2 py-0.5 text-[10px] font-medium text-florence-slate">
                            {setting.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-florence-slate">{sc.setting}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-florence-slate">
                          {CLIENT_NEED_LABEL[sc.clientNeed]}
                        </span>
                        <span className="text-xs font-semibold text-florence-teal-dark">Start →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8">
          <Link to="/academy" className="text-sm font-semibold text-florence-teal-dark hover:underline">
            ← Back to the Academy
          </Link>
        </div>
      </div>
    </div>
  );
}
