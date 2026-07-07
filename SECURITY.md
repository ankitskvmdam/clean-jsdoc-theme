# Security Policy

## Supported Versions

`clean-jsdoc-theme` is a monorepo; all published packages
(`clean-jsdoc-theme` and the `@clean-jsdoc-theme/*` scope) share a single,
lockstep version. Security fixes are applied to the current major line.

| Version | Supported          |
| ------- | ------------------ |
| 5.x     | :white_check_mark: |
| < 5.0   | :x:                |

If you are on an older release, please upgrade to the latest 5.x before
reporting — the issue may already be resolved. See [`MIGRATION.md`](./MIGRATION.md)
for the v4 → v5 upgrade guide.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report them privately by email to **hello@ankdev.me**.

Please include as much of the following as you can, to help us triage quickly:

- The affected package(s) and version(s).
- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof-of-concept.
- Any known mitigations or workarounds.

## What to Expect

- **Acknowledgement:** we aim to acknowledge your report within **72 hours**.
- **Assessment:** we will investigate and keep you informed of our progress.
- **Fix & disclosure:** once a fix is ready, we will release it and, with your
  permission, credit you in the release notes.

Because this is a documentation-generation theme (it produces static HTML/CSS/JS
at build time and has no server-side runtime), reports about generated-output
handling — e.g. improper escaping of author-controlled content, sanitization
gaps, or dependency vulnerabilities — are especially welcome.

Thank you for helping keep `clean-jsdoc-theme` and its users safe.
