# EduFlow — Disaster Recovery & Business Continuity Plan

This document defines the operational procedures for backup execution, restore verification, encryption handling, recovery timelines, and incident response steps for the EduFlow platform.

---

## 1. Backup Procedures

### Database Backups

Run manually or via cron scheduler:

```bash
npm run backup:db
```

- Uses `mysqldump` with `--single-transaction` for a consistent, non-locking snapshot.
- DB credentials are passed via `MYSQL_PWD` environment variable — they **never appear in logs or shell history**.
- Output: `backups/db/eduflow-YYYY-MM-DD-HH-mm.sql.gz[.enc]`
- File permissions: `0o600` (owner read/write only)

**Recommended cron schedule** (Linux/Mac):

```cron
0 2 * * *  cd /opt/eduflow && npm run backup:db   # Daily at 2 AM
0 3 * * 0  cd /opt/eduflow && npm run backup:cleanup  # Weekly cleanup on Sunday
```

### Storage (Uploads) Backups

```bash
npm run backup:storage
```

- Archives `uploads/` as a `tar.gz`.
- Includes symlink traversal protection (will refuse to archive if symlinks are found at top level).
- Output: `backups/storage/storage-YYYY-MM-DD-HH-mm.tar.gz[.enc]`

---

## 2. Encryption

If `BACKUP_ENCRYPTION_KEY` is set, all backups are encrypted using **AES-256-GCM** before being written to disk.

**Key format:** 64 hexadecimal characters (32 bytes). Generate a key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Encrypted file format:**
```
[16 bytes IV] + [16 bytes GCM Auth Tag] + [ciphertext]
```

> [!CAUTION]
> **Store the encryption key separately from the backups.** If you lose the key, the encrypted backups are unrecoverable. Use a secrets manager (AWS Secrets Manager, Vault, etc.) to store the key in production.

---

## 3. Restore Procedures

### Verify Backup Integrity First

```bash
npm run backup:verify
```

This validates:
- Archive is not empty.
- gzip/tar archives can be decompressed without errors.
- Encrypted archives can be decrypted (if `BACKUP_ENCRYPTION_KEY` is present).
- SQL dumps contain a valid MySQL dump header.

### Restore Database

```bash
# 1. Decompress (and decrypt if encrypted)
gzip -d backups/db/eduflow-YYYY-MM-DD-HH-mm.sql.gz

# 2. Restore into a fresh database
mysql -u root -p eduflow_production < backups/db/eduflow-YYYY-MM-DD-HH-mm.sql

# 3. Verify critical tables
mysql -u root -p eduflow_production -e "SHOW TABLES;"
```

### Restore Storage

```bash
# 1. Extract the archive
tar -xzf backups/storage/storage-YYYY-MM-DD-HH-mm.tar.gz -C /tmp/restore

# 2. Compare and copy files
rsync -av /tmp/restore/uploads/ uploads/

# 3. Verify file count matches
find uploads/ -type f | wc -l
```

---

## 4. Retention Policy

Managed automatically by:

```bash
npm run backup:cleanup
```

| Age Range        | Policy                              |
|-----------------|-------------------------------------|
| 0–14 days       | All daily backups are kept          |
| 14 days–8 weeks | One backup per week is retained     |
| > 8 weeks       | Automatically deleted               |
| Newest backup   | **Always protected from deletion**  |

---

## 5. Health Monitoring

EduFlow exposes unauthenticated operational endpoints for monitoring:

### `GET /health/live`

Lightweight liveness check — confirms the Node.js process is alive.

```json
{ "status": "ok", "api": "EduFlow Backend", "version": "1.0.0", "uptime": "3600s" }
```

### `GET /health/ready`

Deep readiness probe — verifies database connectivity, storage accessibility, and backup directory writability.

Returns **`200 OK`** when all dependencies are healthy.  
Returns **`503 Service Unavailable`** if any dependency fails:

```json
{
  "status": "not ready",
  "checks": {
    "database": { "status": "error", "detail": "Database unreachable" },
    "storage": { "status": "ok" },
    "backups": { "status": "ok" }
  }
}
```

---

## 6. Graceful Shutdown

The EduFlow server responds to OS signals safely:

| Signal             | Behavior                                         |
|--------------------|--------------------------------------------------|
| `SIGTERM`          | Graceful drain → close HTTP → close DB pool      |
| `SIGINT`           | Same as SIGTERM (Ctrl+C in development)          |
| `uncaughtException`| Logs the error, initiates graceful shutdown      |
| `unhandledRejection` (prod) | Logs the error, initiates graceful shutdown |

A 10-second hard timeout forces exit if the drain takes too long.

---

## 7. Recovery Timelines (Targets)

| Scenario                   | RTO (Recovery Time) | RPO (Data Loss)   |
|----------------------------|--------------------|--------------------|
| Application restart        | < 30 seconds       | None               |
| Database restore from backup | < 30 minutes    | Up to 24 hours     |
| Full server rebuild        | 1–4 hours          | Up to 24 hours     |

---

## 8. Production Recovery Checklist

Use this checklist during an incident:

- [ ] Determine scope of incident (application bug, data corruption, server compromise).
- [ ] If server compromise: **rotate all credentials immediately** (DB password, JWT secrets, backup encryption key).
- [ ] Stop EduFlow gracefully: `kill -SIGTERM <pid>` or `docker stop`.
- [ ] Run `npm run backup:verify` to confirm latest backup is restorable.
- [ ] Restore database from latest verified backup.
- [ ] Restore uploads from latest verified storage backup.
- [ ] Run `npm run test:security` against restored environment to confirm security posture is intact.
- [ ] Bring service back online and confirm `/health/ready` returns `200`.
- [ ] Document the incident and update this runbook if necessary.
