// Gateway module: Nurses + Passport. The Passport is the central Platform-API
// object; this exposes the permissioned read at `/v1/nurses/:id/passport?view=...`
// (the feedback's contract) over Core's ONE canonical read path (passportRead.ts).
// The route self-gates on scope (audience-dependent), so scope:null here.

import { compileGw, type GwRoute } from "../router.ts";
import { readPassportView } from "../../passportRead.ts";
import { isRole, type Role } from "../../roles.ts";
import type { Audience } from "../../passportView.ts";
import type { Store } from "../../store.ts";
import type { Audit } from "../../audit.ts";

// The public API uses friendly `view` names; map them to Core audiences. Raw Core
// audience names are also accepted (passed through audienceForClaims downstream).
const VIEW_TO_AUDIENCE: Record<string, Audience> = {
  internal: "internal_ops",
  internal_ops: "internal_ops",
  employer: "employer",
  candidate: "self",
  self: "self",
  lender: "lender",
  university: "university",
  investor: "investor",
  instructor: "instructor",
};

export function nursesModule(store: Store, audit: Audit): GwRoute[] {
  return [
    compileGw({
      method: "GET",
      pattern: "/v1/nurses/:id/passport",
      auth: true,
      scope: null, // audience-dependent — readPassportView enforces the right scope
      summary: "Permissioned Nurse Passport view (?view=internal|employer|candidate|lender|university|investor).",
      handler: async (ctx) => {
        const claims = ctx.claims!;
        let role: Role = isRole(String(claims.role ?? "")) ? (claims.role as Role) : "candidate";
        const viewParam = ctx.query.get("view") ?? ctx.query.get("audience") ?? undefined;
        const requestedAudience = viewParam ? VIEW_TO_AUDIENCE[viewParam] ?? viewParam : undefined;
        // An org-bound M2M partner (a bank) presenting the lender view acts AS a lender:
        // pin to the lender audience so relationship=org_matched + the consent gate applies.
        // It still needs the passport:read:lender scope + a live underwriting consent.
        if (role === "service" && requestedAudience === "lender" && claims.org_id) role = "lender";
        return readPassportView(store, audit, {
          selector: { nurseId: ctx.params.id },
          role,
          scopes: String(claims.scope ?? "").split(/\s+/).filter(Boolean),
          ...(claims.org_id ? { orgId: claims.org_id } : {}),
          ...(claims.cand ? { cand: claims.cand } : {}),
          actor: String(claims.email ?? claims.sub ?? "service"),
          ...(requestedAudience ? { requestedAudience } : {}),
          ...(ctx.query.get("purpose") ? { purpose: ctx.query.get("purpose")! } : {}),
        });
      },
    }),
  ];
}
