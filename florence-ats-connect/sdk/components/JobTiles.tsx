// Embeddable JobTiles widget — renders open opportunities from the Platform API.
// Consumes the typed SDK; client-injectable for embedding/testing. CTA is gate-aware
// (express_interest vs apply_with_packet) — "apply" only when the API says so.
import { useEffect, useState } from "react"
import { FlorenceRN } from "../florencern"
import { jobTilesModel, type JobTile } from "./widgetModels"

export interface JobTilesProps {
  client?: FlorenceRN
  /** Pre-loaded opportunities (skips fetch — SSR/tests). */
  initialOpportunities?: Array<Record<string, unknown>>
  onSelect?: (jobId: string) => void
}

export function JobTiles({ client, initialOpportunities, onSelect }: JobTilesProps) {
  const [tiles, setTiles] = useState<JobTile[] | null>(initialOpportunities ? jobTilesModel(initialOpportunities) : null)
  useEffect(() => {
    if (initialOpportunities) return
    let live = true
    ;(client ?? new FlorenceRN()).opportunities()
      .then((o) => { if (live) setTiles(jobTilesModel(o as Array<Record<string, unknown>>)) })
      .catch(() => { if (live) setTiles([]) })
    return () => { live = false }
  }, [client, initialOpportunities])
  if (!tiles) return <div className="frn-job-tiles frn-job-tiles--loading">Loading…</div>
  return (
    <div className="frn-job-tiles">
      {tiles.map((t) => (
        <button key={t.id} className="frn-job-tile" data-cta={t.cta} onClick={() => onSelect?.(t.id)}>
          <span className="frn-job-tile__title">{t.title}</span>
          {t.employer && <span className="frn-job-tile__employer">{t.employer}</span>}
          {t.location && <span className="frn-job-tile__loc">{t.location}</span>}
          <span className="frn-job-tile__cta">{t.cta === "apply_with_packet" ? "Apply with FlorenceRN packet" : "Express interest"}</span>
        </button>
      ))}
    </div>
  )
}

export default JobTiles
