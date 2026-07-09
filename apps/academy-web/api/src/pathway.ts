// Florence Pathway Agent handoff.
//
// The Academy is the READINESS intake layer. When a candidate is pathway-ready,
// the API hands off a purpose-limited intake payload to the Florence Pathway
// Agent, which owns university/visa/financing/licensure routing (AI drafts →
// human QA → candidate attests). DORMANT by default: with no PATHWAY_AGENT_URL a
// mock logs the handoff (dry-run) so the flow is testable offline.

import type { Candidate, Consent, ReadinessSnapshot } from "./types.ts";

export interface PathwayIntake {
  source: "florence-academy";
  candidate: { id: string; full_name: string; email?: string; country?: string };
  readiness: {
    band: string;
    route: string;
    readiness?: number;
    focus_areas: string[];
    sections_completed: number;
    sections_total: number;
  };
  /** Purpose-limited consent flags - the Pathway Agent must honor these. */
  consent: Consent;
  occurred_at: string;
}

export interface PathwayResult {
  ok: boolean;
  dryRun: boolean;
  status?: number;
  intake: PathwayIntake;
}

export interface PathwayClient {
  readonly isMock: boolean;
  sendIntake(intake: PathwayIntake): Promise<PathwayResult>;
}

export class MockPathwayClient implements PathwayClient {
  readonly isMock = true;
  async sendIntake(intake: PathwayIntake): Promise<PathwayResult> {
    console.log(`[pathway:mock] intake ${intake.candidate.id} route=${intake.readiness.route}`);
    return { ok: true, dryRun: true, intake };
  }
}

export class HttpPathwayClient implements PathwayClient {
  readonly isMock = false;
  private url: string;
  private authHeader: string | undefined;
  constructor(url: string, authHeader: string | undefined) {
    this.url = url;
    this.authHeader = authHeader;
  }
  async sendIntake(intake: PathwayIntake): Promise<PathwayResult> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.authHeader && { authorization: this.authHeader }),
      },
      body: JSON.stringify(intake),
    });
    return { ok: res.ok, dryRun: false, status: res.status, intake };
  }
}

export function selectPathwayClient(): PathwayClient {
  const url = process.env["PATHWAY_AGENT_URL"];
  return url ? new HttpPathwayClient(url, process.env["PATHWAY_AGENT_AUTH"]) : new MockPathwayClient();
}

/** Purpose-limited intake from candidate + readiness (no financial/ARR fields). */
export function buildPathwayIntake(candidate: Candidate, snapshot: ReadinessSnapshot): PathwayIntake {
  return {
    source: "florence-academy",
    candidate: {
      id: candidate.id,
      full_name: candidate.full_name,
      ...(candidate.email && { email: candidate.email }),
      ...(candidate.country && { country: candidate.country }),
    },
    readiness: {
      band: snapshot.band,
      route: snapshot.route,
      ...(snapshot.readiness !== undefined && { readiness: snapshot.readiness }),
      focus_areas: snapshot.focus_areas,
      sections_completed: snapshot.sections_completed,
      sections_total: snapshot.sections_total,
    },
    consent: candidate.consent,
    occurred_at: new Date().toISOString(),
  };
}
