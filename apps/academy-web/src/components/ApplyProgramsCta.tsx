import { useEffect, useState } from "react";
import {
  APPLY_CAMPAIGN,
  APPLY_LABEL,
  APPLY_SUBTEXT,
  type ApplyPlacement,
  fetchApplyCta,
  trackApplyCta,
} from "../lib/applyCta";

interface ApplyProgramsCtaProps {
  placement: ApplyPlacement;
  compact?: boolean;
  className?: string;
}

export function ApplyProgramsCta({
  placement,
  compact = false,
  className = "",
}: ApplyProgramsCtaProps) {
  const [cta, setCta] = useState({
    label: APPLY_LABEL,
    subtext: APPLY_SUBTEXT,
    destination_url: "https://www.florenceedu.com/apply?source=academy&campaign=global-live-access&session_id=anon_session0",
    campaign_id: APPLY_CAMPAIGN,
  });

  useEffect(() => {
    let alive = true;
    void fetchApplyCta(placement).then((next) => {
      if (alive) setCta(next);
    });
    void trackApplyCta("view", placement, cta.campaign_id);
    return () => {
      alive = false;
    };
  }, [placement]);

  return (
    <div
      className={[
        compact
          ? "rounded-lg border border-florence-line bg-white px-4 py-3"
          : "fl-card border-florence-teal/20 bg-white p-5",
        className,
      ].join(" ")}
    >
      <div className={compact ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"}>
        <div>
          <h2 className={compact ? "text-sm font-semibold text-florence-ink" : "text-lg font-semibold text-florence-ink"}>
            {cta.label}
          </h2>
          <p className="mt-1 text-sm text-florence-slate">{cta.subtext}</p>
        </div>
        <a
          href={cta.destination_url}
          target="_blank"
          rel="noreferrer"
          onClick={() => void trackApplyCta("click", placement, cta.campaign_id)}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-florence-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-florence-teal-dark"
        >
          {cta.label}
        </a>
      </div>
    </div>
  );
}
