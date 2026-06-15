// The agent layer is mostly deterministic. The LLM is used only where natural
// language genuinely helps: candidate-facing explanations, the QA narrative,
// deficiency classification, and the copilot chat. This interface keeps those
// pluggable — live Claude when ANTHROPIC_API_KEY is set, an honest heuristic
// fallback otherwise, so the whole product runs with no key at all.
import { heuristicProvider } from './heuristic'
import { createAnthropicProvider } from './anthropic'

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
  readonly mode: 'anthropic' | 'heuristic'
  explainStep(i: ExplainStepInput): Promise<string>
  summarizeForQa(i: QaSummaryInput): Promise<string>
  classifyDeficiency(items: string[]): Promise<{ classification: string; responseDraft: string }>
  chat(i: ChatInput): Promise<string>
}

let cached: LlmProvider | null = null

export function getLlm(): LlmProvider {
  if (cached) return cached
  const key = process.env.ANTHROPIC_API_KEY
  cached = key ? createAnthropicProvider(key) : heuristicProvider
  return cached
}
