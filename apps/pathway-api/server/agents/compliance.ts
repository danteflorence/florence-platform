import type { CandidateDossier, ConsistencyFlag, FlagType, FormDraft, WorkflowType } from '../../shared/types'
import { uid } from './util'

// Which workflows each escalation fact is actually relevant to. A prior visa
// refusal blocks the visa application, not a state licensure packet; license
// discipline blocks licensure, not the DS-160; criminal history blocks both.
const VISA_WF: WorkflowType[] = ['sevis_i20', 'ds160', 'visa_appointment']
const LICENSE_WF: WorkflowType[] = ['nclex_att', 'florida_rn_exam', 'newyork_rn_exam', 'texas_rn_exam', 'california_rn_exam', 'arizona_rn_exam', 'endorsement', 'cgfns_ces']
const ALL_WF: WorkflowType[] = ['sevis_i20', 'ds160', 'visa_appointment', 'nclex_att', 'florida_rn_exam', 'newyork_rn_exam', 'texas_rn_exam', 'california_rn_exam', 'arizona_rn_exam', 'endorsement', 'cgfns_ces']
const BLOCK_SCOPE: Partial<Record<FlagType, WorkflowType[]>> = {
  prior_refusal: VISA_WF,
  overstay: VISA_WF,
  unauthorized_work: VISA_WF,
  license_discipline: LICENSE_WF,
  education_concern: ALL_WF,
  criminal_history: ALL_WF,
}
export function flagBlocks(flagType: FlagType, wf: WorkflowType): boolean {
  const scope = BLOCK_SCOPE[flagType]
  return scope ? scope.includes(wf) : true // unknown escalation types block by default (safe)
}

// Compliance Agent
// ----------------
// The guardrail layer. Enforces: the applicant must personally sign the DS-160;
// no fabricated answers; sensitive answers cannot be auto-filled; submission
// requires attestation; and escalation facts block automated progress.

export interface ComplianceResult {
  blocked: boolean
  blocks: ConsistencyFlag[]
  requiresApplicantSignature: boolean
  requiresAttestation: boolean
  notes: string[]
}

const SIGNATURE_REQUIRED: WorkflowType[] = ['ds160']
const ATTESTATION_REQUIRED: WorkflowType[] = [
  'florida_rn_exam', 'newyork_rn_exam', 'texas_rn_exam', 'california_rn_exam', 'arizona_rn_exam', 'endorsement',
]

export function complianceCheck(
  type: WorkflowType,
  draft: FormDraft,
  _d: CandidateDossier,
  flags: ConsistencyFlag[],
): ComplianceResult {
  const blocks: ConsistencyFlag[] = []
  const notes: string[] = []

  // Fabrication guard: a populated, non-sensitive answer with NO evidence and
  // not candidate-entered would be an invented answer — never allowed.
  for (const s of draft.sections) {
    for (const a of s.answers) {
      const invented = a.value != null && a.value !== '' && !a.sensitive && a.evidence.length === 0
      if (invented) {
        blocks.push({
          id: uid(),
          type: 'compliance_block',
          severity: 'escalate',
          field: a.fieldId,
          message: `Answer "${a.label}" has a value with no evidence — blocked as potential fabrication.`,
          involved: [`${a.label}: ${a.value}`],
          requiresEscalation: true,
          suggestedAction: 'Attach evidence or clear the value; agents must never invent answers.',
        })
      }
    }
  }

  // Escalation facts block automated progress until counsel handles them — but
  // only for the workflows they are actually relevant to.
  const escalationFlags = flags.filter((f) => f.requiresEscalation && flagBlocks(f.type, type))
  if (escalationFlags.length) {
    notes.push(`${escalationFlags.length} escalation flag(s) must be reviewed by counsel/specialist before this workflow proceeds.`)
  }

  // Sensitive answers must be confirmed by the candidate, never auto-answered.
  const sensitiveUnconfirmed = draft.sections
    .flatMap((s) => s.answers)
    .filter((a) => a.sensitive && !a.candidateAttested)
  if (sensitiveUnconfirmed.length) {
    notes.push(`${sensitiveUnconfirmed.length} sensitive answer(s) require explicit candidate confirmation — not auto-answered.`)
  }

  const requiresApplicantSignature = SIGNATURE_REQUIRED.includes(type)
  if (requiresApplicantSignature) {
    notes.push('The applicant must personally sign and submit the DS-160 in CEAC. Florence never signs for them.')
  }
  const requiresAttestation = ATTESTATION_REQUIRED.includes(type)

  const blocked = blocks.length > 0 || escalationFlags.length > 0
  return {
    blocked,
    blocks: [...blocks, ...escalationFlags],
    requiresApplicantSignature,
    requiresAttestation,
    notes,
  }
}
