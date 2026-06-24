// Gateway module: Partner program workspaces. Program and packet reads are
// tenant-scoped by route-level AccessPolicy before any handler can disclose data.

import { compileGw, type GwCtx, type GwRoute } from "../router.ts";
import type { Audit } from "../../audit.ts";
import { readPassportView } from "../../passportRead.ts";
import { isRole, type Role } from "../../roles.ts";
import type { Store } from "../../store.ts";

const scopesOf = (claims: GwCtx["claims"]) => String(claims?.scope ?? "").split(/\s+/).filter(Boolean);
const actorOf = (claims: GwCtx["claims"]) => String(claims?.email ?? claims?.sub ?? "service");

function employerRole(claims: GwCtx["claims"]): Role {
  let role: Role = isRole(String(claims?.role ?? "")) ? (claims!.role as Role) : "candidate";
  if (role === "service" && claims?.org_id) role = "employer";
  return role;
}

export function programsModule(store: Store, audit: Audit): GwRoute[] {
  return [
    compileGw({
      method: "GET",
      pattern: "/v1/programs/:id",
      auth: true,
      scope: "programs:read",
      accessPolicy: (ctx) => ({
        resource: "program",
        action: "program.read",
        programId: ctx.params.id,
        purpose: "program_workspace",
      }),
      summary: "Tenant-scoped program workspace metadata.",
      handler: async (ctx) => {
        const p = await store.getProgramScope(ctx.params.id);
        if (!p) return { status: 404, body: { error: "program_not_found" } };
        return {
          status: 200,
          body: {
            id: p.id,
            name: p.name,
            ownerOrgId: p.owner_org_id,
            employerOrgId: p.employer_org_id,
            status: p.status,
          },
        };
      },
    }),
    compileGw({
      method: "GET",
      pattern: "/v1/programs/:id/packets/:nurseId",
      auth: true,
      scope: "passport:read:employer",
      accessPolicy: (ctx) => ({
        resource: "employer_packet",
        action: "packet.read",
        programId: ctx.params.id,
        nurseId: ctx.params.nurseId,
        purpose: "employer_share",
      }),
      summary: "Tenant-scoped approved employer-safe packet view.",
      handler: async (ctx) => {
        return readPassportView(store, audit, {
          selector: { nurseId: ctx.params.nurseId },
          role: employerRole(ctx.claims),
          scopes: scopesOf(ctx.claims),
          ...(ctx.claims?.org_id ? { orgId: ctx.claims.org_id } : {}),
          actor: actorOf(ctx.claims),
          requestedAudience: "employer",
          purpose: "employer_share",
          applicationGate: {
            action: "release_employer_packet",
            programId: ctx.params.id,
            channel: "direct",
          },
        });
      },
    }),
  ];
}
