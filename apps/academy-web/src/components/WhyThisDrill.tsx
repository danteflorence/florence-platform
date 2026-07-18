// WhyThisDrill - provenance line tying a drill to REAL employer field
// reports. Reads the learner-safe /v1/me/field-provenance aggregate (counts
// only, K>=3 per competency) and renders only when a matching competency has
// actual reports behind it. Until employer feedback exists the component
// renders nothing: the claim appears the day the data does, never before.

import { useEffect, useState } from "react";
import { call } from "../lib/academyAuth";
import { useCandidate } from "../lib/CandidateContext";

interface ProvenanceRow {
  competency: string;
  n: number;
}

let cache: Promise<ProvenanceRow[]> | null = null;
function loadProvenance(): Promise<ProvenanceRow[]> {
  cache ??= call<{ rows: ProvenanceRow[] }>("/v1/me/field-provenance")
    .then((r) => r.rows)
    .catch(() => {
      cache = null; // allow a retry on the next mount
      return [];
    });
  return cache;
}

/** Match rows whose competency mentions any of the drill's keywords. */
export function matchProvenance(rows: ProvenanceRow[], keywords: string[]): ProvenanceRow | null {
  const lowered = keywords.map((k) => k.toLowerCase());
  return rows.find((r) => lowered.some((k) => r.competency.toLowerCase().includes(k))) ?? null;
}

export default function WhyThisDrill({ keywords }: { keywords: string[] }) {
  const { candidate } = useCandidate();
  const [row, setRow] = useState<ProvenanceRow | null>(null);
  useEffect(() => {
    if (!candidate) return;
    let live = true;
    loadProvenance().then((rows) => {
      if (live) setRow(matchProvenance(rows, keywords));
    });
    return () => {
      live = false;
    };
  }, [candidate, keywords.join("|")]);
  if (!row) return null;
  return (
    <p className="mt-1 text-xs leading-relaxed text-florence-slate">
      Why this drill: {row.n} employer reports on placed Florence graduates flagged{" "}
      <span className="font-medium">{row.competency}</span>. This practice exists because of them.
    </p>
  );
}
