import {
  AlertBanner,
  AppShell,
  Badge,
  Button,
  Card,
  DataTable,
  DocumentCard,
  EmptyState,
  FileUpload,
  FormField,
  LegalDisclaimer,
  MetricCard,
  Modal,
  PartnerLogoBar,
  ProfileCard,
  Sidebar,
  StageStepper,
  StatusPill,
  Timeline,
  TopNav,
} from "./index";

const sampleRows = [
  { stage: "Academy", owner: "Student Success", status: "In rollout" },
  { stage: "Pathway", owner: "Operations", status: "Token wiring" },
  { stage: "Employer Connect", owner: "Partnerships", status: "Token wiring" },
];

export function DesignSystemPreview() {
  return (
    <AppShell
      sidebar={
        <Sidebar
          title="Florence OS"
          subtitle="Design system"
          items={[
            { label: "Tokens", active: true },
            { label: "Components" },
            { label: "Patterns", badge: <Badge tone="accent">New</Badge> },
          ]}
        />
      }
      topNav={
        <TopNav
          title="Florence Education"
          subtitle="Shared product language"
          actions={
            <>
              <Button variant="secondary">Docs</Button>
              <Button>Start</Button>
            </>
          }
        />
      }
      footer={
        <div className="fds-app-shell__content">
          <LegalDisclaimer compact>
            Demo content uses synthetic data only. Product teams must keep tenant scope, consent, audit, and human review controls in app logic.
          </LegalDisclaimer>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 20 }}>
        <AlertBanner title="Florence design language">
          Tiffany blue is the primary field color, royal purple is the strategic accent, and ivory or white surfaces carry the product.
        </AlertBanner>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <MetricCard label="Shared tokens" value="13" hint="Brand and semantic colors" />
          <MetricCard label="Components" value="19" hint="Source-only React primitives" tone="primary" />
          <MetricCard label="Surfaces" value="4" hint="Academy, Pathway, Core, Employer" tone="accent" />
        </div>

        <Card title="Core primitives" subtitle="Buttons, badges, cards, status, and stage patterns">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Button>Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <StatusPill tone="success">Ready</StatusPill>
            <StatusPill tone="warning">Needs review</StatusPill>
            <StatusPill tone="danger">Blocked</StatusPill>
          </div>
        </Card>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Card title="Workflow">
            <StageStepper
              steps={[
                { label: "Create passport", description: "Core identity and consent", state: "complete" },
                { label: "Review packet", description: "Human QA before sharing", state: "active" },
                { label: "Submit", description: "Fails closed until gates pass", state: "pending" },
              ]}
            />
          </Card>
          <Card title="Timeline">
            <Timeline
              items={[
                { title: "Consent captured", meta: "Today", body: "Purpose-specific share approved." },
                { title: "Document reviewed", meta: "Today", body: "Vault access remains signed and short-lived." },
                { title: "Human approval", meta: "Next", body: "Reviewer must approve high-stakes output." },
              ]}
            />
          </Card>
        </div>

        <DataTable
          rows={sampleRows}
          getRowKey={(row) => row.stage}
          columns={[
            { id: "stage", header: "Stage", render: (row) => row.stage },
            { id: "owner", header: "Owner", render: (row) => row.owner },
            { id: "status", header: "Status", render: (row) => <StatusPill tone="primary">{row.status}</StatusPill> },
          ]}
        />

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <ProfileCard name="Florence Nurse" title="Academy learner" meta="Readiness and consent visible to the candidate" />
          <DocumentCard title="Nurse Passport summary" description="Employer-safe only after consent and QA." status={<StatusPill tone="success">Safe</StatusPill>} />
        </div>

        <Card title="Forms and empty states">
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <FormField label="Program" hint="Required">
              <input className="fl-input" placeholder="Global Live NCLEX Access" />
            </FormField>
            <FileUpload title="Upload restricted document" description="Use signed URLs and audit logging in app workflows." />
          </div>
        </Card>

        <PartnerLogoBar partners={[{ name: "Academy" }, { name: "Pathway" }, { name: "Employer Connect" }, { name: "Core" }]} />
        <EmptyState title="Nothing queued">
          When a surface has no records, use one clear action and avoid exposing sensitive details.
        </EmptyState>
        <Modal open={false} title="Preview modal">
          This hidden modal keeps the preview export covering the component API without rendering an overlay.
        </Modal>
      </div>
    </AppShell>
  );
}
