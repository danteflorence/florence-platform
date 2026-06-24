import { heuristicProvider } from './heuristic'
import type { ChatInput, ExplainStepInput, LlmProvider, QaSummaryInput } from './provider'

type GatewayResponse = {
  ok?: boolean
  reviewerStatus?: string
  reviewer_status?: string
  promptInjectionSignals?: string[]
  prompt_injection_signals?: string[]
}

function gatewayConfig(): { url: string; token: string } | undefined {
  const url = process.env.CORE_MODEL_GATEWAY_URL
  const token = process.env.CORE_MODEL_GATEWAY_TOKEN ?? process.env.CORE_SERVICE_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ''), token } : undefined
}

export function modelGatewayConfigured(): boolean {
  return Boolean(gatewayConfig())
}

async function runGatewayTask(args: {
  task: string
  input: unknown
  dataClass?: string
  sourceTypes?: string[]
  requestedAction?: string
}): Promise<GatewayResponse | undefined> {
  const cfg = gatewayConfig()
  if (!cfg) return undefined
  try {
    const response = await fetch(`${cfg.url}/v1/model-gateway/tasks`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify({
        task: args.task,
        data_class: args.dataClass ?? 'CANDIDATE_PERSONAL',
        source_types: args.sourceTypes ?? ['internal_record'],
        requested_action: args.requestedAction,
        input: args.input,
      }),
    })
    const body = await response.json().catch(() => ({}))
    return { ok: response.ok, ...(body && typeof body === 'object' ? body : {}) }
  } catch {
    return undefined
  }
}

function needsHumanReview(result: GatewayResponse | undefined): boolean {
  return result?.reviewerStatus === 'human_review_required' || result?.reviewer_status === 'human_review_required'
}

function humanReviewMessage(): string {
  return 'I cannot answer that request directly here. A FlorenceRN team member can review it if it relates to your file.'
}

// Legacy filename kept so existing imports do not break. Live model providers are
// intentionally not called from Pathway; configured AI work goes through Core's
// Model Gateway and otherwise falls back to deterministic local prose.
export function createModelGatewayProvider(): LlmProvider {
  return {
    mode: 'model_gateway',
    async explainStep(i: ExplainStepInput) {
      const fallback = await heuristicProvider.explainStep(i)
      await runGatewayTask({
        task: 'pathway_guidance_draft',
        sourceTypes: ['internal_record'],
        input: {
          workflowTitle: i.workflowTitle,
          stepTitle: i.stepTitle,
          ruleSummary: i.ruleSummary,
          guardrailCount: i.guardrails.length,
        },
      })
      return fallback
    },
    async summarizeForQa(i: QaSummaryInput) {
      const fallback = await heuristicProvider.summarizeForQa(i)
      await runGatewayTask({
        task: 'pathway_guidance_draft',
        sourceTypes: ['internal_record'],
        input: {
          workflowTitle: i.workflowTitle,
          flagCount: i.flagLabels.length,
          missingCount: i.missingLabels.length,
          sensitiveCount: i.sensitiveCount,
          escalateCount: i.escalateCount,
        },
      })
      return fallback
    },
    async classifyDeficiency(items: string[]) {
      const fallback = await heuristicProvider.classifyDeficiency(items)
      const result = await runGatewayTask({
        task: 'pathway_guidance_draft',
        sourceTypes: ['uploaded_file'],
        input: {
          deficiencyItemCount: items.length,
          deficiencyText: items.join('\n'),
        },
      })
      if (needsHumanReview(result)) {
        return {
          classification: fallback.classification,
          responseDraft: `${fallback.responseDraft}\n\nHuman review required before this response is sent.`,
        }
      }
      return fallback
    },
    async chat(i: ChatInput) {
      const result = await runGatewayTask({
        task: 'pathway_guidance_draft',
        sourceTypes: ['user_message'],
        input: {
          question: i.question,
          context: i.context,
        },
      })
      if (needsHumanReview(result)) return humanReviewMessage()
      return heuristicProvider.chat(i)
    },
  }
}
