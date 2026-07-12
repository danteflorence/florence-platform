// The agent layer is mostly deterministic. The LLM is used only where natural
// language genuinely helps: candidate-facing explanations, the QA narrative,
// deficiency classification, and the copilot chat. This interface keeps those
// pluggable. Live AI calls must go through Core's Model Gateway; an honest
// heuristic fallback keeps the product running with no gateway or model key.
import { heuristicProvider } from './heuristic'
import { createModelGatewayProvider, modelGatewayConfigured } from './anthropic'

export interface ExplainStepInput {
  candidateName: string
  workflowTitle: string
  stepTitle: string
  ruleSummary: string
  guardrails: string[]
}

export interface QaSummaryInput {
  candidateName: string
  workflowTitle: string
  flagLabels: string[]
  missingLabels: string[]
  sensitiveCount: number
  escalateCount: number
}

export interface ChatInput {
  candidateName: string
  question: string
  /** A compiled briefing of the candidate's current state and next actions. */
  context: string
  /** ISO 639-1 reply language (shared/languages.ts). Heuristic mode frames the
   *  answer in this language; gateway mode translates the full reply. */
  language?: string
}

export interface ExtractDocumentInput {
  kind: string
  filename: string
  /** Base64 page image (png/jpeg/webp) — sent ONLY through the Model Gateway. */
  imageBase64?: string
  mediaType?: string
  /** Machine-readable text when available (e.g. the passport MRZ lines). */
  textContent?: string
}

/** Proposed fields from a document — a DRAFT the candidate must confirm.
 *  Document numbers are truncated to last-4 at the seam; the full number is
 *  typed by the candidate in the official flow, never taken from a model. */
export interface ExtractedDocumentProposal {
  fields: Record<string, string>
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  notes: string[]
}

export interface LlmProvider {
  readonly mode: 'model_gateway' | 'heuristic'
  explainStep(i: ExplainStepInput): Promise<string>
  summarizeForQa(i: QaSummaryInput): Promise<string>
  classifyDeficiency(items: string[]): Promise<{ classification: string; responseDraft: string }>
  chat(i: ChatInput): Promise<string>
  extractDocument(i: ExtractDocumentInput): Promise<ExtractedDocumentProposal>
}

let cached: LlmProvider | null = null

export function getLlm(): LlmProvider {
  if (cached) return cached
  cached = modelGatewayConfigured() ? createModelGatewayProvider() : heuristicProvider
  return cached
}
