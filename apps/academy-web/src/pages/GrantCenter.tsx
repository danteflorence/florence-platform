import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApplyProgramsCta } from "../components/ApplyProgramsCta";
import {
  Badge as FlorenceBadge,
  Button,
  Card as FlorenceCard,
  DataTable,
  StatusPill,
  buttonClassName,
  type FlorenceTone,
} from "@florence/design-system";
import {
  ApiError,
  createGrantGap,
  fetchMyAccessGrants,
  storedCandidate,
  type AccessGrant,
} from "../lib/academyAuth";

const sponsoredAccessRows = [
  { item: "Academy", coverage: "Free", status: "Available" },
  { item: "Global Live Access", coverage: "$100 university sponsorship", status: "$100 student price" },
  { item: "Application fee", coverage: "Covered by Florence", status: "Tracked" },
  { item: "Access Grant", coverage: "Usually up to about $5,000", status: "Review required" },
];

const pathwayStages = [
  { value: "university_application", label: "University application" },
  { value: "visa_screen", label: "VisaScreen" },
  { value: "licensure", label: "Licensure" },
  { value: "pathway_start", label: "Pathway start" },
];

function grantTone(status: AccessGrant["status"] | string): FlorenceTone {
  if (["approved", "disbursed", "receipt_qa_approved"].includes(status)) return "success";
  if (["declined", "cancelled_refunded"].includes(status)) return "danger";
  if (["documents_missing", "eligible_for_review", "disbursement_pending"].includes(status)) return "warning";
  return "neutral";
}

export default function GrantCenter() {
  const [estimatedGap, setEstimatedGap] = useState("5200");
  const [verifiedGap, setVerifiedGap] = useState("5000");
  const [pathwayStage, setPathwayStage] = useState("visa_screen");
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const candidate = storedCandidate();

  useEffect(() => {
    if (!candidate) return;
    let alive = true;
    void fetchMyAccessGrants()
      .then((data) => {
        if (alive) setGrants(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [candidate?.id]);

  async function submitGap(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!candidate) {
      setMessage("Sign in or create an account before sending a grant gap for review.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await createGrantGap({
        pathway_stage: pathwayStage,
        estimated_gap_usd: Number(estimatedGap),
        verified_gap_usd: Number(verifiedGap),
        status: "gap_verified",
        documents_required: [],
      });
      setGrants((current) => [response.grant, ...current.filter((grant) => grant.id !== response.grant.id)]);
      setMessage(
        response.eligibility.eligible
          ? "Verified gap is eligible for grant review."
          : response.eligibility.reason,
      );
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not send this gap for review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <FlorenceBadge tone="accent">Grant center</FlorenceBadge>
      <div className="mt-4 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <section>
          <h1 className="text-3xl font-semibold text-florence-ink sm:text-4xl">
            Florence Access Grants cover verified last-dollar gaps.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-florence-slate">
            Access Grants are reviewed for pathway gaps and usually cap near
            $5,000. They do not require repayment or employment with Florence,
            AMN, Kaiser, Tenet, or any employer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/signup" className={buttonClassName({ variant: "accent", size: "lg" })}>
              Start Global Live access
            </Link>
            <Link to="/academy/residency" className={buttonClassName({ variant: "secondary", size: "lg" })}>
              Residency reserve
            </Link>
          </div>
          <ApplyProgramsCta placement="grant_center" compact className="mt-5 max-w-2xl" />
        </section>

        <FlorenceCard title="Sponsored Global Live Access" subtitle="$200 true value, $100 sponsored, $100 student price." className="p-5">
          <DataTable
            rows={sponsoredAccessRows}
            getRowKey={(row) => row.item}
            columns={[
              { id: "item", header: "Item", render: (row) => row.item },
              { id: "coverage", header: "Coverage", render: (row) => row.coverage },
              {
                id: "status",
                header: "Status",
                render: (row) => (
                  <StatusPill tone={row.status === "Tracked" ? "success" : "primary"}>
                    {row.status}
                  </StatusPill>
                ),
              },
            ]}
          />
        </FlorenceCard>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <FlorenceCard title="Gap review" subtitle="Verified gaps route to human review." className="p-5">
          <form className="space-y-4" onSubmit={(event) => void submitGap(event)}>
            <label className="block text-sm font-medium text-florence-slate">
              Pathway stage
              <select
                value={pathwayStage}
                onChange={(event) => setPathwayStage(event.currentTarget.value)}
                className="mt-1 w-full rounded-lg border border-florence-line bg-white px-3 py-2 text-sm text-florence-ink"
              >
                {pathwayStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-florence-slate">
              Estimated gap
              <input
                type="number"
                min="0"
                max="50000"
                value={estimatedGap}
                onChange={(event) => setEstimatedGap(event.currentTarget.value)}
                className="mt-1 w-full rounded-lg border border-florence-line px-3 py-2 text-sm text-florence-ink"
              />
            </label>
            <label className="block text-sm font-medium text-florence-slate">
              Verified last-dollar gap
              <input
                type="number"
                min="0"
                max="50000"
                value={verifiedGap}
                onChange={(event) => setVerifiedGap(event.currentTarget.value)}
                className="mt-1 w-full rounded-lg border border-florence-line px-3 py-2 text-sm text-florence-ink"
              />
            </label>
            <Button type="submit" variant="accent" disabled={busy}>
              {busy ? "Sending" : "Send for review"}
            </Button>
            {message && <p className="text-sm text-florence-slate">{message}</p>}
            {!candidate && (
              <p className="text-sm text-florence-slate">
                <Link to="/signup" className="font-semibold text-florence-purple">Create an account</Link> to start a grant review.
              </p>
            )}
          </form>
        </FlorenceCard>

        <FlorenceCard title="My grant requests" subtitle="Ops can approve, disburse, verify receipts, cancel, or refund." className="p-5">
          <DataTable
            rows={grants}
            empty="Grant requests will appear here after a verified gap is submitted."
            getRowKey={(row) => row.id}
            columns={[
              { id: "amount", header: "Request", render: (row) => `$${row.requested_amount_usd.toLocaleString()}` },
              {
                id: "approved",
                header: "Approved",
                render: (row) => row.approved_amount_usd ? `$${row.approved_amount_usd.toLocaleString()}` : "-",
              },
              {
                id: "status",
                header: "Status",
                render: (row) => <StatusPill tone={grantTone(row.status)}>{row.status.replace(/_/g, " ")}</StatusPill>,
              },
              { id: "repayment", header: "Repayment", render: () => "No repayment" },
              { id: "employment", header: "Employment", render: () => "No employer requirement" },
            ]}
          />
        </FlorenceCard>
      </div>
    </div>
  );
}
