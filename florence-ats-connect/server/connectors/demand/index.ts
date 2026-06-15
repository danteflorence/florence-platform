// Demand source connector registry. The pull orchestrator asks here by sourceType.
import type { DemandSourceType } from '../../../shared/demand-types'
import type { DemandSourceConnector } from './types'
import { greenhouseBoardConnector } from './greenhouseBoard'
import { icimsPortalConnector } from './icimsPortal'
import { careerPageConnector } from './careerPage'
import { partnerFeedConnector } from './partnerFeed'
import { leverConnector } from './lever'
import { ashbyConnector } from './ashby'
import { smartRecruitersConnector } from './smartrecruiters'

const REGISTRY: Partial<Record<DemandSourceType, DemandSourceConnector>> = {
  greenhouse_board: greenhouseBoardConnector,
  icims_portal: icimsPortalConnector,
  career_page: careerPageConnector,
  partner_feed: partnerFeedConnector,
  lever_postings: leverConnector,
  ashby: ashbyConnector,
  smartrecruiters: smartRecruitersConnector,
}

export function getDemandConnector(type: DemandSourceType): DemandSourceConnector | null {
  return REGISTRY[type] ?? null
}
