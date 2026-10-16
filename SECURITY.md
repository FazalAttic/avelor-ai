# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Avelor AI seriously. If you discover a vulnerability or potential security issue, please do **not** open a public issue.

Instead, please report security issues responsibly:
- Email: security@avelor.ai (or open a private security advisory on GitHub)
- Include detailed steps to reproduce the issue
- Include proof-of-concept code or payloads where applicable

We will acknowledge receipt within 48 hours and provide a timeline for remediation.

## Security Baseline

Avelor AI is built under a **secure-by-default** model:
- All external input must be validated and parsed at system boundaries.
- Database access, vector search, and background tasks are strictly tenant-isolated.
- Authentication context is authoritative; identity is never derived from LLM arguments.
- Secrets and credentials must remain server-side and never be committed or logged.
- Arbitrary SQL, shell commands, or unverified code execution by LLMs is strictly prohibited.
- Payment webhooks must be cryptographically verified and idempotent.
