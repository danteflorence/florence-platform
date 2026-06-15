import { useState } from "react";
import { RHYTHMS, type RhythmCard } from "../data/hour7";

const GROUPS: RhythmCard["group"][] = [
  "Sinus",
  "Atrial",
  "Ventricular",
  "Arrest",
  "Block",
];

function ShockBadge({ s }: { s: RhythmCard["shockable"] }) {
  if (s === "n/a")
    return (
      <span className="fl-pill border-florence-line text-florence-slate">
        Not applicable
      </span>
    );
  if (s === "yes")
    return (
      <span className="fl-pill border-vital-danger/40 bg-red-50 text-vital-danger">
        Shockable
      </span>
    );
  return (
    <span className="fl-pill border-florence-line bg-florence-mist text-florence-slate">
      Not shockable
    </span>
  );
}

export default function RhythmDrill() {
  const [openId, setOpenId] = useState<string | null>(RHYTHMS[4].name); // SVT open by default

  return (
    <div className="my-6">
      {GROUPS.map((group) => {
        const cards = RHYTHMS.filter((r) => r.group === group);
        return (
          <div key={group} className="mb-5">
            <h4 className="fl-eyebrow mb-2">{group}</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {cards.map((r) => {
                const open = openId === r.name;
                return (
                  <button
                    key={r.name}
                    onClick={() => setOpenId(open ? null : r.name)}
                    aria-expanded={open}
                    className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                      open
                        ? "border-florence-teal bg-florence-teal-soft/50 shadow-card"
                        : "border-florence-line bg-white hover:border-florence-teal/60 hover:bg-florence-mist"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-florence-ink">
                        {r.name}
                      </span>
                      <ShockBadge s={r.shockable} />
                    </div>
                    <p className="mt-1 text-sm text-florence-slate">
                      {r.recognition}
                    </p>
                    {open && (
                      <p className="mt-3 animate-fade-up border-t border-florence-line/70 pt-3 text-sm leading-relaxed text-florence-ink/90">
                        <span className="font-semibold text-florence-teal-dark">
                          Action ·{" "}
                        </span>
                        {r.action}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
