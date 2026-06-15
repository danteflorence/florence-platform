import type { JurisdictionRule, WorkflowType } from '../types'
import { sevisI20Rule } from './sevis-i20'
import { ds160Rule } from './ds160'
import { nclexRule } from './nclex'
import { floridaRule } from './florida'
import { newYorkRule } from './newyork'
import { texasRule } from './texas'
import { californiaRule } from './california'
import { arizonaRule } from './arizona'
import { cgfnsCesRule } from './cgfns-visascreen'
import { endorsementRule } from './endorsement'
import { visaAppointmentRule } from './visa-appointment'
import { universityAdmissionRule, financingPacketRule, employerPacketRule } from './pathway-os-domains'
import { rnExamRule } from './rn-exam'

export const RULES: Record<WorkflowType, JurisdictionRule> = {
  sevis_i20: sevisI20Rule,
  ds160: ds160Rule,
  visa_appointment: visaAppointmentRule,
  nclex_att: nclexRule,
  florida_rn_exam: floridaRule,
  newyork_rn_exam: newYorkRule,
  texas_rn_exam: texasRule,
  california_rn_exam: californiaRule,
  arizona_rn_exam: arizonaRule,
  endorsement: endorsementRule,
  cgfns_ces: cgfnsCesRule,
  rn_exam: rnExamRule,
  university_admission: universityAdmissionRule,
  financing_packet: financingPacketRule,
  employer_packet: employerPacketRule,
}

export function getRule(type: WorkflowType): JurisdictionRule {
  return RULES[type]
}

export const ALL_RULES: JurisdictionRule[] = Object.values(RULES)
