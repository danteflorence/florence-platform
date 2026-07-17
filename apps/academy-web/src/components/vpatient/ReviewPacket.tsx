// ───────────────────────────────────────────────────────────────────────────
// Review packet - the human-readable one-pager an SME reads to approve a
// scenario. The design-critique's key call: the SME approves the MEDICINE, not
// the schema, so the clinical story leads and the technical detail (BioGears
// parameters, raw rubric, JSON) is collapsed behind a disclosure.
//
// Derives everything from the scenario itself: the correct-path narrative,
// the optimal action timeline, the escalation chain, the team roles, and the
// BioGears physiology references (via the clinical model) for each intervention.
// ───────────────────────────────────────────────────────────────────────────

import type { VPatientScenario } from "../../data/vpatient/types";
import { CLIENT_NEED_LABEL } from "../../data/blueprint";
import type { ClientNeed } from "../../types/question";
import { INTERVENTIONS } from "../../data/vpatient/clinicalModel";

function mmss(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

/** Best-effort BioGears reference for an action label (fuzzy match on the
 *  clinical-model interventions - shown to ground the physiology for the SME). */
function bioGearsRefFor(label: string): string | null {
  const l = label.toLowerCase();
  const hit = INTERVENTIONS.find((i) =>
    i.label.toLowerCase().split(/\W+/).some((w) => w.length > 3 && l.includes(w)),
  );
  return hit ? hit.bioGearsAction : null;
}

export default function ReviewPacket({ scenario }: { scenario: VPatientScenario }) {
  const v = scenario.initialVitals;
  const interventions = scenario.actions.filter((a) => a.category === "intervene" || a.category === "med");

  return (
    <div className="space-y-4 text-sm">
      {/* Clinical header */}
      <div>
        <h3 className="text-lg font-semibold text-florence-ink">{scenario.title}</h3>
        <p className="text-florence-slate">{scenario.setting}</p>
        <p className="mt-1 text-florence-ink">
          <strong>{scenario.patient.name}</strong>, {scenario.patient.age} {scenario.patient.sex} ·{" "}
          {CLIENT_NEED_LABEL[scenario.clientNeed as ClientNeed] ?? scenario.clientNeed}
        </p>
        <p className="mt-0.5 text-xs text-florence-slate">
          Opening vitals: HR {v.hr} · BP {Math.round(v.sbp)}/{Math.round(v.dbp)} · RR {v.rr} · SpO₂ {v.spo2}% · {v.rhythm}
        </p>
      </div>

      {/* The correct path (narrative + timeline) */}
      <div className="rounded-xl border border-florence-teal/30 bg-florence-teal-soft/20 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-florence-teal-dark">The expected clinical path</p>
        <p className="mt-1 text-florence-ink/90">{scenario.debrief.outcomeSummaries.stabilized}</p>
        <ol className="mt-2 space-y-1">
          {scenario.debrief.optimalTimeline.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-florence-teal-dark">{mmss(t.atSec)}</span>
              <span className="text-florence-ink">{t.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Escalation chain */}
      {scenario.escalationChain && scenario.escalationChain.length > 0 && (
        <div className="rounded-xl border border-florence-line p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-florence-slate">Escalation</p>
          <ul className="mt-1.5 space-y-1.5">
            {scenario.escalationChain.map((e, i) => (
              <li key={i}>
                <span className="font-medium text-florence-ink">{e.trigger}</span> → {e.contact}
                <span className="block text-xs text-florence-slate">SBAR: {e.sbar}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Team roles */}
      {scenario.teamRoles && scenario.teamRoles.length > 0 && (
        <div className="rounded-xl border border-florence-line p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-florence-slate">Team</p>
          <ul className="mt-1.5 space-y-1">
            {scenario.teamRoles.map((r, i) => (
              <li key={i}><span className="font-medium text-florence-ink">{r.role}:</span> {r.responsibility}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical detail - collapsed. The SME opens this only if they want it. */}
      <details className="rounded-xl border border-florence-line p-3">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-florence-slate">
          Technical detail (BioGears refs, scored decisions)
        </summary>
        <div className="mt-2 space-y-3">
          <div>
            <p className="text-xs font-semibold text-florence-slate">Interventions → BioGears physiology</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {interventions.map((a) => {
                const ref = bioGearsRefFor(a.label);
                return (
                  <li key={a.id} className="text-florence-ink/85">
                    {a.label}{ref ? <span className="text-florence-slate"> · {ref}</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-florence-slate">Scored decisions</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {scenario.rubric.map((d) => (
                <li key={d.decisionId} className="text-florence-ink/85">
                  {d.label} <span className="text-florence-slate">· {d.ncjmmStep} · weight {d.weight}</span>
                  {d.citation ? <span className="block text-xs text-florence-slate/80">{d.citation}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
