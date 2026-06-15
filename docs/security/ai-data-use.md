# AI Data-Use Policy

**Status:** core guardrails ✅ implemented in product behavior; provider-contract + retention controls ⛔ user/legal-owned
**Maps to:** NIST AI RMF · SOC 2 CC6.1, C1.2 · OWASP LLM Top 10 (prompt injection, insecure output handling, data leakage, supply chain)

AI is used across FlorenceRN for Academy tutoring (the "FlorenceRN" voice agent +
audio rationales), Pathway draft preparation, document extraction, candidate
guidance, demand briefs, and employer outreach. AI is treated as a **controlled
subsystem**, not an open pipe to candidate data.

## Non-negotiable rules

1. **No sensitive candidate data to an LLM provider** unless the provider contract
   (a) prohibits training on our data, (b) has enterprise retention controls, and
   (c) is approved by security/legal. ⛔ *(provider contract — user-owned)*
2. **Redact/tokenize before model calls** where possible.
3. **Retrieval respects authorization** — the AI only retrieves documents the
   acting user is allowed to see. Where AI reads the Passport, it must go through
   the same `passportView` redactor as any other consumer (no raw Passport to a model).
4. **No secrets, API keys, or policy-bypass instructions in prompts.**
5. **Treat all external documents as untrusted input** (prompt-injection defense).
6. **AI drafts, humans QA, candidates attest.** ✅ Pathway already enforces this —
   no LLM output directly updates a government form, employer packet, financing
   decision, or ATS submission without human QA. This is also the security rule.
7. **Validate + sanitize all LLM output** before rendering or using downstream.
8. **Log AI inputs/outputs carefully, redacting sensitive data from logs.**
9. **Run prompt-injection + data-exfiltration tests** before shipping new AI surfaces.

## Current implementation notes
- The **readiness gate** and pass-rate engine read ability/readiness via the
  secured Passport view (purpose-tagged), not raw records.
- The voice agent / audio pipeline is **env-gated** (no key → no calls); the
  ElevenLabs grant + commercial-rights confirmation is user-owned before enabling.
- Demand Radar AI/outreach copy carries **no PII in tracked links** (opaque
  `frn_click_id` only) — see the Demand Radar compliance section.

## Approval checklist for a new AI feature
- [ ] What data does it send to a model? What class is each field?
- [ ] Is the provider approved (no-train, retention, DPA)?
- [ ] Is retrieval authorization-scoped?
- [ ] Is output validated before downstream use?
- [ ] Is there a human-QA step before any irreversible action?
- [ ] Have prompt-injection / exfiltration tests been run?
