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
}

export interface LlmProvider {
  readonly mode: 'model_gateway' | 'heuristic'
  explainStep(i: ExplainStepInput): Promise<string>
  summarizeForQa(i: QaSummaryInput): Promise<string>
  classifyDeficiency(items: string[]): Promise<{ classification: string; responseDraft: string }>
  chat(i: ChatInput): Promise<string>
}

let cached: LlmProvider | null = null

export function getLlm(): LlmProvider {
  if (cached) return cached
  cached = modelGatewayConfigured() ? createModelGatewayProvider() : heuristicProvider
  return cached
}
