import Anthropic from '@anthropic-ai/sdk'
import type { LlmProvider } from './provider'
import { heuristicProvider } from './heuristic'

// Live Claude provider. Used only when ANTHROPIC_API_KEY is set. Every method
// degrades to the deterministic heuristic on error, so the app never hard-fails
// because of a model/network issue.
export function createAnthropicProvider(apiKey: string): LlmProvider {
  const client = new Anthropic({ apiKey })
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'

  async function complete(system: string, user: string, maxTokens = 700): Promise<string> {
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    })
    const block = msg.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined
    return block?.text?.trim() ?? ''
  }

  const SYSTEM_GUARDRAIL =
    'You are the Florence Pathway Agent assistant. You help internationally-educated nurses with U.S. immigration and licensure administration. ' +
    'You never fabricate facts, never give legal conclusions, never tell a candidate to answer a government question untruthfully, and always remind the candidate that they are responsible for the truth and completeness of their own filings and signatures. ' +
    'Be warm, plain-spoken, and concise.'

  return {
    mode: 'anthropic',
    async explainStep(i) {
      try {
        return await complete(
          SYSTEM_GUARDRAIL,
          `Explain this step to ${i.candidateName} in 2-3 short sentences, plain language.\nWorkflow: ${i.workflowTitle}\nStep: ${i.stepTitle}\nRule: ${i.ruleSummary}\nGuardrail to honor: ${i.guardrails[0] ?? 'none'}`,
        )
      } catch { return heuristicProvider.explainStep(i) }
    },
    async summarizeForQa(i) {
      try {
        return await complete(
          SYSTEM_GUARDRAIL,
          `Write a brief QA reviewer summary for ${i.candidateName} — ${i.workflowTitle}.\nConsistency flags: ${i.flagLabels.join(', ') || 'none'}\nMissing: ${i.missingLabels.join(', ') || 'none'}\nSensitive answers: ${i.sensitiveCount}\nEscalation items: ${i.escalateCount}\nEnd with a clear recommendation (approve / request changes / escalate).`,
        )
      } catch { return heuristicProvider.summarizeForQa(i) }
    },
    async classifyDeficiency(items) {
      try {
        const out = await complete(
          SYSTEM_GUARDRAIL,
          `A board issued a deficiency notice with these items:\n${items.map((x) => '- ' + x).join('\n')}\nReturn a one-line classification, then a numbered, candidate-friendly response plan. The candidate must review before anything is sent.`,
          900,
        )
        const classification = out.split('\n')[0].replace(/^classification:?\s*/i, '').trim() || 'General deficiency'
        return { classification, responseDraft: out }
      } catch { return heuristicProvider.classifyDeficiency(items) }
    },
    async chat(i) {
      try {
        return await complete(
          SYSTEM_GUARDRAIL,
          `Candidate ${i.candidateName} asks: "${i.question}"\n\nHere is their current pathway state and next actions:\n${i.context}\n\nAnswer helpfully in 1-4 sentences. If they ask you to do something that requires their signature or that bypasses an official process, explain why they must do it themselves.`,
        )
      } catch { return heuristicProvider.chat(i) }
    },
  }
}
