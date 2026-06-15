// Native connector registry. Add Workday/Taleo/etc. here as they're built.
import type { ATSConnector } from './types'
import { icimsConnector } from './icims'
import { workdayConnector } from './workday'
import { taleoConnector } from './taleo'
import { greenhouseConnector } from './greenhouse'
import { sapConnector } from './sap'
import { ukgConnector } from './ukg'
import { mergeConnector } from './merge'

const REGISTRY: Record<string, ATSConnector> = {
  icims: icimsConnector,
  workday: workdayConnector,
  oracle_taleo: taleoConnector,
  greenhouse: greenhouseConnector,
  sap_successfactors: sapConnector,
  ukg_pro: ukgConnector,
  merge: mergeConnector,
}

/** Providers with a registered native connector — used by the ops UI. */
export const CONNECTOR_PROVIDERS = Object.keys(REGISTRY)

export function getConnector(provider: string): ATSConnector | null {
  return REGISTRY[provider] ?? null
}

export type { ATSConnector } from './types'
