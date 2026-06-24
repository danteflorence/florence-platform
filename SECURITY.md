# Security Policy

FlorenceRN is a high-sensitivity healthcare, education, immigration, financing, and workforce platform. Treat suspected security issues as confidential.

## Reporting A Vulnerability

Report vulnerabilities by emailing `security@florencern.com` or by opening a private GitHub security advisory if you have repository access.

Do not include real candidate, employer, lender, university, passport, SEVIS, DS-160, visa, credit, loan, ATS, VMS, packet, audio, tutor, or Production Ledger data in the report. Use synthetic examples only.

Please include:

- A short description of the issue.
- Affected component or file path, if known.
- Reproduction steps using synthetic data.
- Security impact and required preconditions.
- Any suggested safe fix.

## Handling Rules

- Do not publicly disclose the issue until FlorenceRN confirms remediation.
- Do not access, download, modify, or exfiltrate data that is not yours.
- Do not attempt persistence, lateral movement, denial of service, social engineering, or attacks against third-party partners.
- Stop testing immediately if restricted data is exposed and report the minimum evidence needed to validate the issue.

## Expected Response

FlorenceRN will acknowledge credible reports, triage severity, and coordinate remediation. Critical issues include restricted data exposure, authentication bypass, tenant isolation bypass, Application Gate bypass, secret leakage, and unauthorized document access.
