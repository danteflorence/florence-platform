// Central data classification and redaction registry for FlorenceRN.
// Unknown fields fail closed to SECRET so new regulated data is not accidentally
// exposed before it is explicitly classified.

export const DATA_CLASSES = [
  "PUBLIC",
  "INTERNAL",
  "CANDIDATE_PERSONAL",
  "RESTRICTED_EDUCATION",
  "RESTRICTED_EMPLOYER_PACKET",
  "RESTRICTED_IMMIGRATION",
  "RESTRICTED_IDENTITY",
  "RESTRICTED_FINANCING",
  "PARTNER_RESTRICTED",
  "SECRET",
] as const;

export type DataClass = (typeof DATA_CLASSES)[number];

export const DATA_CLASS_RANK: Record<DataClass, number> = {
  PUBLIC: 0,
  INTERNAL: 10,
  CANDIDATE_PERSONAL: 20,
  RESTRICTED_EDUCATION: 30,
  RESTRICTED_EMPLOYER_PACKET: 40,
  RESTRICTED_IMMIGRATION: 50,
  RESTRICTED_IDENTITY: 60,
  RESTRICTED_FINANCING: 70,
  PARTNER_RESTRICTED: 80,
  SECRET: 90,
};

export const ALL_DATA_CLASSES = DATA_CLASSES;

const LEGACY_DATA_CLASS_ALIASES: Record<string, DataClass> = {
  public: "PUBLIC",
  internal_business: "INTERNAL",
  candidate_personal: "CANDIDATE_PERSONAL",
  restricted_pathway_financial: "RESTRICTED_FINANCING",
  regulated_partner: "PARTNER_RESTRICTED",
};

export type FieldTag =
  | "passport"
  | "dob"
  | "address"
  | "phone"
  | "ssn_itin"
  | "sevis_id"
  | "i20"
  | "ds160"
  | "visa_status"
  | "credit"
  | "loan"
  | "underwriting"
  | "lender_application_id"
  | "employer_packet"
  | "school_record"
  | "nclex"
  | "license"
  | "document_id"
  | "document_path"
  | "request_body"
  | "response_body"
  | "signed_url"
  | "secret"
  | "audit_safe";

export interface FieldClassification {
  dataClass: DataClass;
  tags: FieldTag[];
  description: string;
}

const fc = (dataClass: DataClass, tags: FieldTag[], description: string): FieldClassification => ({
  dataClass,
  tags,
  description,
});

export const DATA_CLASSIFICATION_REGISTRY: Record<string, FieldClassification> = {
  aggregate: fc("INTERNAL", [], "Aggregate report marker."),
  anonymized: fc("INTERNAL", [], "Anonymized report marker."),
  total: fc("INTERNAL", [], "Aggregate count."),
  readinessBands: fc("INTERNAL", [], "Aggregate readiness band counts."),
  nclexStatuses: fc("INTERNAL", [], "Aggregate NCLEX status counts."),
  licensureStates: fc("INTERNAL", [], "Aggregate licensure state counts."),
  funnelStages: fc("INTERNAL", [], "Aggregate funnel stage counts."),
  nurseId: fc("INTERNAL", [], "Internal nurse identifier."),
  refs: fc("INTERNAL", [], "Internal cross-app references."),
  eventCount: fc("INTERNAL", [], "Operational event count."),
  funnelStage: fc("INTERNAL", [], "Internal funnel state."),
  funnelRank: fc("INTERNAL", [], "Internal funnel rank."),
  updatedAt: fc("INTERNAL", [], "Operational update timestamp."),

  name: fc("CANDIDATE_PERSONAL", [], "Candidate legal or display name."),
  email: fc("CANDIDATE_PERSONAL", [], "Candidate email address."),
  phone: fc("CANDIDATE_PERSONAL", ["phone"], "Candidate phone number."),
  phoneNumber: fc("CANDIDATE_PERSONAL", ["phone"], "Candidate phone number."),
  ssn: fc("RESTRICTED_IDENTITY", ["ssn_itin"], "Social Security number."),
  ssnLast4: fc("RESTRICTED_IDENTITY", ["ssn_itin"], "Partial Social Security number."),
  itin: fc("RESTRICTED_IDENTITY", ["ssn_itin"], "Individual Taxpayer Identification Number."),
  dateOfBirth: fc("RESTRICTED_IDENTITY", ["dob"], "Date of birth."),
  dob: fc("RESTRICTED_IDENTITY", ["dob"], "Date of birth."),
  address: fc("RESTRICTED_IDENTITY", ["address"], "Candidate address."),
  "profile.address": fc("RESTRICTED_IDENTITY", ["address"], "Candidate address."),
  "address.line1": fc("RESTRICTED_IDENTITY", ["address"], "Candidate street address."),
  "address.line2": fc("RESTRICTED_IDENTITY", ["address"], "Candidate street address."),
  "address.street": fc("RESTRICTED_IDENTITY", ["address"], "Candidate street address."),
  "address.city": fc("RESTRICTED_IDENTITY", ["address"], "Candidate city."),
  "address.state": fc("RESTRICTED_IDENTITY", ["address"], "Candidate state."),
  "address.postalCode": fc("RESTRICTED_IDENTITY", ["address"], "Candidate postal code."),
  "address.zip": fc("RESTRICTED_IDENTITY", ["address"], "Candidate postal code."),
  "address.country": fc("RESTRICTED_IDENTITY", ["address"], "Candidate country."),
  passport: fc("RESTRICTED_IDENTITY", ["passport"], "Passport data."),
  passportNumber: fc("RESTRICTED_IDENTITY", ["passport"], "Passport number."),
  "passport.number": fc("RESTRICTED_IDENTITY", ["passport"], "Passport number."),

  documentId: fc("RESTRICTED_IDENTITY", ["document_id"], "Document metadata identifier."),
  documentIds: fc("RESTRICTED_IDENTITY", ["document_id"], "Document metadata identifiers."),
  documents: fc("RESTRICTED_IDENTITY", ["document_id"], "Candidate document metadata."),
  "documents.i20": fc("RESTRICTED_IMMIGRATION", ["i20", "document_id"], "I-20 document metadata."),
  documentPath: fc("SECRET", ["document_path", "secret"], "Internal restricted document storage path."),
  filePath: fc("SECRET", ["document_path", "secret"], "Internal restricted file path."),
  storageKey: fc("SECRET", ["document_path", "secret"], "Internal restricted storage key."),
  signedUrl: fc("SECRET", ["signed_url", "secret"], "Short-lived signed document URL."),
  signedUrls: fc("SECRET", ["signed_url", "secret"], "Short-lived signed document URLs."),
  url: fc("SECRET", ["signed_url"], "Potential document or partner URL."),
  rawBody: fc("SECRET", ["request_body", "secret"], "Raw request body."),
  requestBody: fc("SECRET", ["request_body", "secret"], "Raw request body."),
  responseBody: fc("SECRET", ["response_body", "secret"], "Raw response body."),

  sevisId: fc("RESTRICTED_IMMIGRATION", ["sevis_id"], "SEVIS identifier."),
  "sevis.id": fc("RESTRICTED_IMMIGRATION", ["sevis_id"], "SEVIS identifier."),
  i20: fc("RESTRICTED_IMMIGRATION", ["i20"], "I-20 data."),
  "i20.sevisId": fc("RESTRICTED_IMMIGRATION", ["i20", "sevis_id"], "I-20 SEVIS identifier."),
  ds160: fc("RESTRICTED_IMMIGRATION", ["ds160"], "DS-160 data."),
  ds160Draft: fc("RESTRICTED_IMMIGRATION", ["ds160"], "DS-160 draft data."),
  "ds160.confirmationNumber": fc("RESTRICTED_IMMIGRATION", ["ds160"], "DS-160 confirmation number."),
  "ds160.applicationId": fc("RESTRICTED_IMMIGRATION", ["ds160"], "DS-160 application identifier."),
  visa: fc("RESTRICTED_IMMIGRATION", ["visa_status"], "Visa status and immigration pathway data."),
  visaStatus: fc("RESTRICTED_IMMIGRATION", ["visa_status"], "Visa status."),
  "visa.stage": fc("RESTRICTED_IMMIGRATION", ["visa_status"], "Visa stage."),
  "visa.outcome": fc("RESTRICTED_IMMIGRATION", ["visa_status"], "Visa outcome."),

  readiness: fc("RESTRICTED_EDUCATION", ["school_record"], "Academy readiness record."),
  "readiness.band": fc("CANDIDATE_PERSONAL", [], "High-level readiness band."),
  "readiness.passProbability": fc("RESTRICTED_EDUCATION", ["school_record"], "Exam pass probability."),
  "readiness.theta": fc("RESTRICTED_EDUCATION", ["school_record"], "Raw ability score."),
  "readiness.subscaleMastery": fc("RESTRICTED_EDUCATION", ["school_record"], "Academy remediation and subscale mastery."),
  academyRemediationHistory: fc("RESTRICTED_EDUCATION", ["school_record"], "Academy remediation history."),
  schoolRecords: fc("RESTRICTED_EDUCATION", ["school_record"], "School records."),
  transcript: fc("RESTRICTED_EDUCATION", ["school_record"], "Transcript data."),
  transcripts: fc("RESTRICTED_EDUCATION", ["school_record"], "Transcript data."),
  nclex: fc("RESTRICTED_EDUCATION", ["nclex"], "NCLEX records."),
  licensure: fc("RESTRICTED_EDUCATION", ["license"], "Licensure records."),
  license: fc("RESTRICTED_EDUCATION", ["license"], "License record."),
  licenseNumber: fc("RESTRICTED_EDUCATION", ["license"], "License number."),

  billing: fc("RESTRICTED_FINANCING", ["loan"], "Billing and repayment data."),
  financing: fc("RESTRICTED_FINANCING", ["loan"], "Financing data."),
  credit: fc("RESTRICTED_FINANCING", ["credit"], "Credit data."),
  creditScore: fc("RESTRICTED_FINANCING", ["credit"], "Credit score."),
  loan: fc("RESTRICTED_FINANCING", ["loan"], "Loan data."),
  loanAmount: fc("RESTRICTED_FINANCING", ["loan"], "Loan amount."),
  underwriting: fc("RESTRICTED_FINANCING", ["underwriting"], "Underwriting data."),
  internalUnderwriting: fc("RESTRICTED_FINANCING", ["underwriting"], "Internal underwriting data."),
  lenderPacket: fc("PARTNER_RESTRICTED", ["loan"], "Consented lender packet."),
  lenderApplicationId: fc("RESTRICTED_FINANCING", ["lender_application_id"], "Sensitive lender application identifier."),
  "lender.applicationId": fc("RESTRICTED_FINANCING", ["lender_application_id"], "Sensitive lender application identifier."),
  lendKey: fc("PARTNER_RESTRICTED", ["loan"], "LendKey handoff data."),
  lendKeyHandoff: fc("PARTNER_RESTRICTED", ["loan"], "LendKey handoff data."),

  placement: fc("RESTRICTED_EMPLOYER_PACKET", ["employer_packet"], "Employer placement packet data."),
  "placement.employer": fc("PARTNER_RESTRICTED", ["employer_packet"], "Employer identity."),
  "placement.employerId": fc("PARTNER_RESTRICTED", ["employer_packet"], "Employer tenant identifier."),
  "placement.jobReqId": fc("PARTNER_RESTRICTED", ["employer_packet"], "Employer requisition identifier."),
  employerPacket: fc("RESTRICTED_EMPLOYER_PACKET", ["employer_packet"], "Employer packet data."),
  employerNotes: fc("RESTRICTED_EMPLOYER_PACKET", ["employer_packet"], "Employer notes."),
  ats: fc("RESTRICTED_EMPLOYER_PACKET", ["employer_packet"], "ATS submission data."),
  vms: fc("RESTRICTED_EMPLOYER_PACKET", ["employer_packet"], "VMS submission data."),
  amnVms: fc("PARTNER_RESTRICTED", ["employer_packet"], "AMN/VMS partner data."),
  retention: fc("INTERNAL", [], "Production Ledger retention milestone data."),

  demand: fc("INTERNAL", [], "Demand Radar internal signal data."),
  onboarding: fc("INTERNAL", [], "Internal onboarding risk facet."),
  "onboarding.startSignals": fc("INTERNAL", [], "Internal onboarding start signals."),
  "onboarding.readinessGate": fc("INTERNAL", [], "Internal readiness gate state."),
  consents: fc("INTERNAL", [], "Consent state summary."),

  token: fc("SECRET", ["secret"], "Token value."),
  accessToken: fc("SECRET", ["secret"], "Access token."),
  refreshToken: fc("SECRET", ["secret"], "Refresh token."),
  secret: fc("SECRET", ["secret"], "Secret value."),
  apiKey: fc("SECRET", ["secret"], "API key."),
  password: fc("SECRET", ["secret"], "Password value."),
};

export type RecipientView =
  | "candidate"
  | "internal_ops"
  | "employer"
  | "lender"
  | "university"
  | "amn_vms_partner"
  | "investor_board_aggregate";

const RECIPIENT_ALLOWED_CLASSES: Record<RecipientView, readonly DataClass[]> = {
  candidate: ["PUBLIC", "INTERNAL", "CANDIDATE_PERSONAL", "RESTRICTED_EDUCATION", "RESTRICTED_IMMIGRATION", "RESTRICTED_IDENTITY", "RESTRICTED_FINANCING", "RESTRICTED_EMPLOYER_PACKET", "PARTNER_RESTRICTED"],
  internal_ops: DATA_CLASSES.filter((dataClass) => dataClass !== "SECRET"),
  employer: ["PUBLIC", "INTERNAL", "CANDIDATE_PERSONAL", "RESTRICTED_EDUCATION", "RESTRICTED_EMPLOYER_PACKET"],
  lender: ["PUBLIC", "INTERNAL", "CANDIDATE_PERSONAL", "RESTRICTED_EDUCATION", "RESTRICTED_IMMIGRATION", "RESTRICTED_FINANCING", "PARTNER_RESTRICTED"],
  university: ["PUBLIC", "INTERNAL"],
  amn_vms_partner: ["PUBLIC", "INTERNAL", "CANDIDATE_PERSONAL", "RESTRICTED_EDUCATION", "RESTRICTED_EMPLOYER_PACKET", "PARTNER_RESTRICTED"],
  investor_board_aggregate: ["PUBLIC", "INTERNAL"],
};

const RECIPIENT_DENY_KEYS: Record<RecipientView, readonly RegExp[]> = {
  candidate: [/secret/i, /token/i, /signedUrl/i, /apiKey/i, /password/i],
  internal_ops: [],
  employer: [/passport/i, /\bds160\b/i, /visa/i, /sevis/i, /i20/i, /financ/i, /credit/i, /loan/i, /underwriting/i, /employerNotes/i, /academy|remediation|schoolRecords|transcript/i, /theta|passProbability|subscaleMastery|attNumber|licenseNumber/i],
  lender: [/employerNotes/i, /ats/i, /vms/i],
  university: [/nurseId/i, /^name$/i, /email/i, /passport/i, /dob|dateOfBirth/i, /address/i, /sevis/i, /i20/i, /ds160/i, /visa/i, /credit/i, /loan/i, /underwriting/i, /employer/i],
  amn_vms_partner: [/passport/i, /\bds160\b/i, /sevis/i, /i20/i, /financ/i, /credit/i, /loan/i, /underwriting/i, /employerNotes/i, /academy|remediation|schoolRecords|transcript/i, /theta|passProbability|subscaleMastery|attNumber|licenseNumber/i],
  investor_board_aggregate: [/nurseId/i, /^name$/i, /email/i, /phone/i, /passport/i, /dob|dateOfBirth/i, /address/i, /sevis/i, /i20/i, /ds160/i, /visa/i, /document/i, /signedUrl/i, /credit/i, /loan/i, /employer/i],
};

const SENSITIVE_KEY_RE =
  /passport|sevis|ssn|itin|ds160|i20|visa|dob|dateOfBirth|date\s+of\s+birth|birthDate|address|phone|credit|loan|underwriting|lenderApplication|employerPacket|employerNotes|schoolRecords|transcript|nclex|licen[cs]e|documentId|documentPath|storageKey|filePath|signedUrl|rawBody|requestBody|responseBody|token|secret|apiKey|password|authorization|cookie/i;

const SAFE_LOG_METADATA_KEYS = new Set([
  "action",
  "alertKind",
  "audience",
  "bulk",
  "cached",
  "candidateAttestationRequired",
  "classes",
  "code",
  "component",
  "consentOk",
  "count",
  "costUsd",
  "dataClassesUsed",
  "decision",
  "distinctSubjects",
  "event",
  "errorName",
  "field",
  "failedCount",
  "humanQaRequired",
  "inputHash",
  "kind",
  "canonicalAction",
  "legacyAction",
  "message",
  "method",
  "model",
  "outputSchema",
  "outputSchemaValid",
  "path",
  "promptInjectionSignals",
  "promptVersion",
  "purpose",
  "reason",
  "requestId",
  "reviewerStatus",
  "role",
  "route",
  "rowCount",
  "rows",
  "scope",
  "scopes",
  "safeCount",
  "service",
  "status",
  "statusCode",
  "task",
  "threshold",
  "tokenCost",
  "type",
  "untrustedSources",
  "windowSec",
  "withheld",
]);

export function normalizeDataClass(value: unknown): DataClass | undefined {
  if (typeof value !== "string") return undefined;
  const direct = value as DataClass;
  if ((DATA_CLASSES as readonly string[]).includes(direct)) return direct;
  return LEGACY_DATA_CLASS_ALIASES[value];
}

function redactText(input: string): string {
  return input
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED]")
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[REDACTED]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED]")
    .replace(/\b(?:ssn|itin)\s*(?::|=|\s)\s*\d{9}\b/gi, "[REDACTED]")
    .replace(/\bN\d{10}\b/g, "[REDACTED]")
    .replace(/\b(?:passport|sevis|ssn|itin|ds-?160|i-?20|credit|loan|lender(?:\s+application)?|token|secret|api[_ -]?key)(?:\s+(?:number|id|confirmation|application|value))?\s*(?::|=|\s)\s*[A-Z0-9][A-Z0-9_-]{2,}/gi, "[REDACTED]")
    .replace(/\b(?:dob|date\s+of\s+birth|birthDate)\s*(?::|=|\s)\s*[^;,\n]+/gi, "[REDACTED]")
    .replace(/\baddress\s*(?::|=|\s)\s*[^;\n]+/gi, "[REDACTED]")
    .replace(/https?:\/\/[^\s"'<>]*(?:X-Amz-Signature|Signature|token|signed)[^\s"'<>]*/gi, "[REDACTED]")
    .replace(/\/v1\/document-vault\/signed\/[A-Za-z0-9_-]+/g, "/v1/document-vault/signed/[REDACTED]")
    .replace(/\b(?:s3|gs|file):\/\/[^\s"'<>]+/gi, "[REDACTED]")
    .replace(/(?:\/(?:private|tmp|var|Users|vault|documents|restricted-documents)\/[^\s"'<>]+)/g, "[REDACTED]")
    .replace(/\b(?:documentPath|storageKey|filePath)\s*(?::|=|\s)\s*[^\s"'<>;]+/gi, "[REDACTED]");
}

function redactLogText(input: string): string {
  const redacted = redactText(input);
  return redacted === input && SENSITIVE_KEY_RE.test(input) ? "[REDACTED]" : redacted;
}

function pathCandidates(path: string): string[] {
  const parts = path.split(".").filter(Boolean);
  const out: string[] = [];
  for (let i = parts.length; i > 0; i -= 1) out.push(parts.slice(0, i).join("."));
  for (let i = 0; i < parts.length; i += 1) out.push(parts.slice(i).join("."));
  for (const p of parts) out.push(p);
  return out;
}

export function classificationFor(path: string): FieldClassification {
  for (const candidate of pathCandidates(path)) {
    const found = DATA_CLASSIFICATION_REGISTRY[candidate];
    if (found) return found;
  }
  return fc("SECRET", ["secret"], "Unclassified field; fail closed.");
}

export function classOf(path: string): DataClass {
  return classificationFor(path).dataClass;
}

export function classAtOrBelow(actual: DataClass, max: DataClass): boolean {
  return DATA_CLASS_RANK[actual] <= DATA_CLASS_RANK[max];
}

export function fieldsAtOrBelow(fields: string[], max: DataClass): string[] {
  return fields.filter((f) => classAtOrBelow(classOf(f), max));
}

export function fieldPathsForValue(value: unknown, base = ""): string[] {
  if (value === null || value === undefined || typeof value !== "object") return base ? [base] : [];
  if (Array.isArray(value)) {
    if (value.length === 0) return base ? [base] : [];
    return value.flatMap((item) => fieldPathsForValue(item, base));
  }
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = base ? `${base}.${key}` : key;
    const childPaths = fieldPathsForValue(child, path);
    paths.push(...(childPaths.length > 0 ? childPaths : [path]));
  }
  return paths;
}

export function classesForFields(fields: string[]): DataClass[] {
  return [...new Set(fields.map(classOf))].sort((a, b) => DATA_CLASS_RANK[a] - DATA_CLASS_RANK[b]);
}

export function classesForValue(value: unknown): DataClass[] {
  return classesForFields(fieldPathsForValue(value));
}

function normalizeRecipient(recipient: RecipientView | string): RecipientView {
  if (recipient === "self") return "candidate";
  if (recipient === "investor") return "investor_board_aggregate";
  if ((["candidate", "internal_ops", "employer", "lender", "university", "amn_vms_partner", "investor_board_aggregate"] as string[]).includes(recipient)) {
    return recipient as RecipientView;
  }
  return "investor_board_aggregate";
}

function explicitlyAllowed(path: string, key: string, fields: readonly string[] | undefined): boolean {
  return Boolean(fields?.some((field) => path === field || path.startsWith(`${field}.`) || key === field));
}

function shouldRedactForRecipient(path: string, key: string, recipient: RecipientView, explicitlyAllowedFields?: readonly string[]): boolean {
  if (recipient === "lender" && /employerNotes|employerPacket\.notes/i.test(path) && explicitlyAllowed(path, key, explicitlyAllowedFields) && classOf(path) !== "SECRET") return false;
  if (RECIPIENT_DENY_KEYS[recipient].some((re) => re.test(key) || re.test(path))) return true;
  const dataClass = classOf(path);
  if (dataClass === "SECRET") return true;
  return !RECIPIENT_ALLOWED_CLASSES[recipient].includes(dataClass);
}

function recordsFrom(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  return value && typeof value === "object" && !Array.isArray(value) ? [value as Record<string, unknown>] : [];
}

function nestedValue(record: Record<string, unknown>, path: string): string {
  let current: unknown = record;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return "unknown";
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" && current ? current : "unknown";
}

function counts(records: Record<string, unknown>[], path: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const record of records) {
    const key = nestedValue(record, path);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function aggregateForRecipient(value: unknown, recipient: RecipientView): Record<string, unknown> | undefined {
  if (recipient !== "university" && recipient !== "investor_board_aggregate") return undefined;
  if (value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).aggregate === true) return undefined;
  const records = recordsFrom(value);
  if (records.length === 0) return undefined;
  const base: Record<string, unknown> = {
    aggregate: true,
    anonymized: true,
    total: records.length,
    funnelStages: counts(records, "funnelStage"),
  };
  if (recipient === "university") {
    base.readinessBands = counts(records, "readiness.band");
    base.nclexStatuses = counts(records, "nclex.status");
    base.licensureStates = counts(records, "licensure.state");
  }
  return base;
}

function redactValue(value: unknown, mode: "log" | "api", recipient: RecipientView, path: string[] = [], explicitlyAllowedFields?: readonly string[]): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item, i) => redactValue(item, mode, recipient, [...path, String(i)], explicitlyAllowedFields));
  if (typeof value === "string" && mode === "log") return redactLogText(value);
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = [...path, key].join(".");

    if (mode === "log") {
      if (SAFE_LOG_METADATA_KEYS.has(key)) {
        out[key] = typeof child === "string" ? redactLogText(child) : child;
        continue;
      }
      if (SENSITIVE_KEY_RE.test(key) || SENSITIVE_KEY_RE.test(childPath) || DATA_CLASS_RANK[classOf(childPath)] >= DATA_CLASS_RANK.CANDIDATE_PERSONAL) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = redactValue(child, mode, recipient, [...path, key], explicitlyAllowedFields);
      continue;
    }

    if (shouldRedactForRecipient(childPath, key, recipient, explicitlyAllowedFields)) continue;
    out[key] = redactValue(child, mode, recipient, [...path, key], explicitlyAllowedFields);
  }
  return out;
}

export function serializeForRecipient(
  value: unknown,
  opts: RecipientView | string | { recipient: RecipientView | string; explicitlyAllowedFields?: readonly string[] },
): Record<string, unknown> {
  const normalized = typeof opts === "string" ? { recipient: opts } : opts;
  const recipient = normalizeRecipient(normalized.recipient);
  const aggregate = aggregateForRecipient(value, recipient);
  const out = redactValue(aggregate ?? value, "api", recipient, [], normalized.explicitlyAllowedFields);
  return out && typeof out === "object" && !Array.isArray(out) ? (out as Record<string, unknown>) : {};
}

export function redactApiResponse(value: unknown, opts: { recipient: RecipientView | string; explicitlyAllowedFields?: readonly string[] }): unknown {
  const recipient = normalizeRecipient(opts.recipient);
  const aggregate = aggregateForRecipient(value, recipient);
  return redactValue(aggregate ?? value, "api", recipient, [], opts.explicitlyAllowedFields);
}

export function redactExportRow(value: unknown, opts: { recipient: RecipientView | string; explicitlyAllowedFields?: readonly string[] }): unknown {
  return redactApiResponse(value, opts);
}

export function redactExport(value: unknown, opts: { recipient: RecipientView | string; explicitlyAllowedFields?: readonly string[] }): unknown {
  return redactApiResponse(value, opts);
}

export function redactAnalyticsEvent(value: unknown): unknown {
  return redactForLog(value);
}

export function redactForAnalytics(value: unknown): unknown {
  return redactAnalyticsEvent(value);
}

export function redactForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return redactLogText(value);
  }
  return redactValue(value, "log", "internal_ops");
}

export function redactError(error: unknown): { error: string; message: string } {
  const message = error instanceof Error ? String(redactForLog(error.message)) : "server_error";
  return { error: "server_error", message };
}
