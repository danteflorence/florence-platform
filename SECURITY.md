# Security Policy

Florence Education is a high-sensitivity healthcare, education, immigration, financing, and workforce platform. Treat suspected security issues as confidential.

## Reporting A Vulnerability

Report vulnerabilities by emailing `security@florenceedu.com` or by opening a private GitHub security advisory if you have repository access.

Do not include real candidate, employer, lender, university, passport, SEVIS, DS-160, visa, credit, loan, ATS, VMS, packet, audio, tutor, or Production Ledger data in the report. Use synthetic examples only.

Please include:

- A short description of the issue.
- Affected component or file path, if known.
- Reproduction steps using synthetic data.
- Security impact and required preconditions.
- Any suggested safe fix.

## Handling Rules

- Do not publicly disclose the issue until Florence Education confirms remediation.
- Do not access, download, modify, or exfiltrate data that is not yours.
- Do not attempt persistence, lateral movement, denial of service, social engineering, or attacks against third-party partners.
- Stop testing immediately if restricted data is exposed and report the minimum evidence needed to validate the issue.
- Do not place production data, restricted documents, screenshots containing real records, real IDs, secrets, access tokens, or partner payloads in GitHub issues, pull requests, test fixtures, logs, prompts, docs, or CI artifacts.
- Use synthetic data only for reproduction, tests, local development, and security reports.
- If a vulnerability can only be explained with sensitive evidence, redact the value and share the minimum metadata needed for Florence Education to reproduce the issue safely.

## Expected Response

Florence Education will acknowledge credible reports, triage severity, and coordinate remediation. Critical issues include restricted data exposure, authentication bypass, tenant isolation bypass, Application Gate bypass, secret leakage, and unauthorized document access.

## Repository Data Rules

- `.env` files, secret manager exports, service account keys, private keys, local databases, WAL/SHM files, logs, generated media, build artifacts, and dependency folders must not be committed.
- `.env.example` files must contain placeholders only.
- CI must install dependencies from package manifests and lockfiles on Linux runners; copied macOS `node_modules` folders are not allowed.
- Restricted data must never be used to make a test pass. Preserve the security control and create a synthetic fixture instead.
