// Career-page connector — broad coverage, but the COMPLIANCE GATE is the whole
// point: it refuses to fetch unless the source has been robots/ToS-reviewed AND
// explicitly marked crawlAllowed. Large-scale career-page crawling needs counsel
// review before it's switched on; until then this returns 'blocked'.
import type { DemandSource } from '../../../shared/demand-types'
import type { DemandSourceConnector, PullResult } from './types'

export const careerPageConnector: DemandSourceConnector = {
  sourceType: 'career_page',
  async listJobs(source: DemandSource): Promise<PullResult> {
    if (!source.crawlAllowed || source.robotsStatus !== 'reviewed_ok' || source.tosStatus !== 'reviewed_ok') {
      return {
        rows: [],
        mode: 'blocked',
        note: `Crawl blocked for ${source.name}: crawlAllowed=${source.crawlAllowed}, robots=${source.robotsStatus}, tos=${source.tosStatus}. Review robots.txt + ToS and set crawlAllowed before pulling.`,
      }
    }
    // Approved-source fetch would run here (rate-limited per source.rateLimitPerMin,
    // honoring robots.txt). Left as a reviewed-source extension point.
    return { rows: [], mode: 'live', note: `Career-page crawl approved for ${source.name} — connector implementation pending per-domain parser.` }
  },
}
