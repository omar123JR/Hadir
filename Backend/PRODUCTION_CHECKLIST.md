# EduFlow Production Security Checklist

**Target:** `eduflow-platform-main`  
**Purpose:** Final verification checklist before releasing the EduFlow platform to a live institutional environment.

---

## 1. Network & Infrastructure
- [ ] **HTTPS Enforced:** TLS 1.2+ is configured on the reverse proxy/load balancer.
- [ ] **Reverse Proxy Configured:** Nginx or HAProxy is stripping server headers and forwarding the correct IP (`X-Forwarded-For`).
- [ ] **TRUST_PROXY Variable:** `TRUST_PROXY=1` is set in production to ensure rate limits track real client IPs.
- [ ] **Database Network Isolation:** The MySQL database is on a private subnet and NOT publicly accessible over the internet.
- [ ] **Firewall Rules (WAF):** Cloudflare or AWS WAF is configured to drop known bad bots, volumetric DDoS, and explicit SQLi payloads.

## 2. Secrets Management
- [ ] **No Hardcoded Credentials:** The `.env` file does not contain placeholder secrets or weak developer keys.
- [ ] **JWT Entropy:** Both `JWT_SECRET` and `JWT_REFRESH_SECRET` are generated via CSPRNG (e.g., `openssl rand -hex 64`).
- [ ] **Database Credentials:** `DB_PASSWORD` uses a highly random, long password.
- [ ] **Backup Keys:** `BACKUP_ENCRYPTION_KEY` is securely stored and physically backed up offline for disaster recovery.

## 3. Application Security (Verified via automated CI/CD)
- [ ] **RBAC Enforcement:** Admin, Teacher, and Student roles strictly segregated.
- [ ] **Auth Hardening:** Refresh token rotation and replay protection are fully active.
- [ ] **Upload Restrictions:** 5MB limit, strict MIME/magic-number validation, and `noexec` isolation on the `uploads/` directory.
- [ ] **Input Sanitization:** All user inputs pass through strict Zod schemas.
- [ ] **Security Headers:** Helmet is active (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).

## 4. Monitoring & Observability
- [ ] **Audit Logs Exported:** `logs/audit.jsonl` is being rotated by `logrotate` and forwarded to a secure log aggregator (e.g., DataDog, ELK, Splunk).
- [ ] **Active Defense Alerts:** `ALERT_DISCORD_WEBHOOK` or `ALERT_SLACK_WEBHOOK` is configured and alerts are actively monitored by the engineering team.
- [ ] **Health Endpoints Checked:** Uptime monitors are polling `/health/liveness` and `/health/readiness`.

## 5. Operations & Disaster Recovery
- [ ] **Cron Backups Enabled:** `npm run backup:db` and `npm run backup:storage` are scheduled to run nightly.
- [ ] **Restore Tested:** A dry-run of restoring from an encrypted backup tarball has been successfully performed in a staging environment.
- [ ] **Graceful Shutdown:** The container orchestration system (e.g., Docker Swarm, Kubernetes, systemd) uses SIGTERM and waits for the connection pool to drain.
- [ ] **Container Scanning:** The Docker image has zero `CRITICAL` or `HIGH` vulnerabilities (verified via Trivy).
