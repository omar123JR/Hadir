# EduFlow Security Baseline

This document defines the mandatory security guarantees that **must** be preserved throughout the lifecycle of the EduFlow platform. Future developers must not bypass, weaken, or remove these enforced protections.

## 1. Enforced Protections

- **Role-Based Access Control (RBAC):** Every endpoint must strictly enforce role validation via the `authorize(role)` middleware. Students must never be able to execute Admin operations.
- **Resource Ownership Validation:** Operations targeting specific resources (e.g., submitting an assignment, editing a profile, accessing a course) must inherently validate that the logged-in user explicitly owns or is enrolled in the resource via the `ownership.ts` middleware.
- **Refresh Token Family Revocation:** Refresh tokens must rotate after every use. Any detected reuse (a replay attack) must immediately revoke the entire token family, destroying all active sessions for that user.
- **Secure File Uploads:** Uploaded files must never exceed 10MB (5MB for images). The system must validate extensions against an allowlist and strictly verify MIME types and magic bytes in the memory buffer before persisting the file.
- **Input Validation & SQLi Mitigation:** All user input must be sanitized and validated using `zod` schemas. Database queries must explicitly use parameterized queries (`mysql2` placeholders). No raw concatenation is allowed. Excessive validation failures must trigger automatic IP blocking.
- **Browser Response Hardening:** Security headers (HSTS, CSP, X-Content-Type-Options, Frame-Options) must be attached to every response via `helmet`. CORS must strictly allowlist explicitly defined frontend URLs only.

## 2. Required CI Checks

The `.github/workflows/security.yml` pipeline is mandatory and enforces the following:
- **Dependency Auditing:** `npm audit --audit-level=high` runs on every push/PR. High or critical vulnerabilities will fail the build.
- **Secret Scanning:** Gitleaks scans the repository for accidentally committed credentials.
- **Security Regression Testing:** The `npm run test:security` suite acts as an automated penetration test. It ensures that RBAC, Token Replay logic, JWT tampering protections, Malicious Upload protections, and SQLi fuzzing blocks remain functional. Any bypassed test will fail the build.
- **SAST:** CodeQL analyzes the JavaScript/TypeScript code for structural vulnerabilities (e.g., unchecked paths, command injection).

## 3. Forbidden Insecure Patterns

- **NEVER** disable `helmet` or `cors` in production.
- **NEVER** use `multer` without strict file-type and magic bytes validation.
- **NEVER** construct database queries using template strings (e.g., `` `SELECT * FROM users WHERE id = ${id}` ``). Always use parameterization.
- **NEVER** commit secrets, passwords, or valid JWT tokens into version control or `tests/`. Use `.env.example` placeholders.
- **NEVER** modify `.dockerignore` to allow `.env` files into the Docker image.

## 4. Deployment Expectations

- The production environment must supply a secure, cryptographically random `JWT_SECRET` of at least 32 characters.
- If deployed behind a reverse proxy (Nginx, Cloudflare), `TRUST_PROXY=1` must be set in the environment variables to accurately track client IP addresses for rate-limiting and audit logging.
- Audit logs (`logs/audit.log`) must be securely collected and monitored by the infrastructure layer. Logs will explicitly sanitize credentials before outputting.
