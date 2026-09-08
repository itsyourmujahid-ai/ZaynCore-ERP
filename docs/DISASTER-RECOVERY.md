# Disaster Recovery & Business Continuity Guide

## QuantumCore Enterprise ERP

---

## 1. Disaster Recovery Overview

This guide details the procedures required to rebuild, restore, and verify the QuantumCore ERP from scratch in the event of:
- Complete loss of local development environments (e.g. Antigravity AI environment unavailable).
- Hosting server / container provider outages.
- Database corruption, accidental deletion, or security breach.

### Portability Guarantees
The ERP relies **strictly on standard open-source tools**:
- **Source Code**: GitHub Repository (Single Source of Truth).
- **Database Engine**: Standard PostgreSQL 15/16/17 (Supabase or Self-Hosted).
- **Runtime**: Standard Node.js 20+ & npm workspaces.
- **Frontend CDN**: Vercel or any static HTTP web server (Nginx/Caddy/S3/Cloudflare Pages).

---

## 2. Backup Strategy & Methods

### 2.1 Provider-Managed Backups (Supabase PITR)
Supabase automatically provides continuous Write-Ahead Log (WAL) archiving and Point-in-Time Recovery (PITR) up to 7 to 30 days depending on project tier:
- Backups are managed at the PostgreSQL infrastructure layer.
- Restoration can be executed directly to any millisecond timestamp via the Supabase Dashboard (`Project Settings -> Database -> Backups`).

### 2.2 Logical SQL Backups (`pg_dump`)
For independent off-site archiving, execute logical backups on a recurring schedule (e.g. daily cron):

```bash
# Export full compressed PostgreSQL database backup
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="erp_backup_$(date +%Y%m%d_%H%M%S).dump"
```

To export plain SQL:
```bash
pg_dump "$DATABASE_URL" \
  --clean \
  --if-exists \
  --file="erp_backup_$(date +%Y%m%d_%H%M%S).sql"
```

---

## 3. Disaster Recovery Scenario Walkthrough

### Scenario: "Hosting Environment Lost, Antigravity Unavailable"
**Available Assets**: GitHub Repository + Supabase Project.

#### Step 1: Clone Repository on Fresh Machine
```bash
git clone https://github.com/your-org/enterprise-erp-core.git
cd enterprise-erp-core
```

#### Step 2: Install Dependencies & Verify Build
```bash
npm install
npm run build:all
```

#### Step 3: Configure Environment Variables
Create `.env` using `.env.example`:
```bash
cp .env.example .env
```
Populate `.env` with your secure credentials:
```ini
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres
JWT_SECRET=[GENERATE_NEW_64_CHAR_SECRET]
CORS_ORIGIN=https://your-frontend-domain.vercel.app
VITE_API_URL=https://your-backend-api.com/api
```

#### Step 4: Schema Restoration / Migration
If connecting to a brand new empty database:
```bash
npm run db:migrate
```
If restoring from a logical `pg_dump` snapshot:
```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" erp_backup.dump
```

#### Step 5: Start & Verify Backend Service
```bash
npm run dev:backend
# Or for production:
# node backend/dist/server.js
```
Verify health:
```bash
curl http://localhost:3000/api/health
```

#### Step 6: Deploy & Verify Frontend
Deploy to Vercel or start locally:
```bash
npm run dev:frontend
```

---

## 4. Post-Incident Secret Rotation Procedure

Following a security event or host compromise, rotate all credentials in this exact sequence:

1. **Rotate Supabase Database Password**:
   - Navigate to Supabase Dashboard -> Project Settings -> Database.
   - Click **Reset database password**.
   - Copy the new connection string into the Backend hosting environment (`DATABASE_URL`).
2. **Rotate JWT Secret Key**:
   - Generate a new 256-bit cryptographically secure secret (`openssl rand -hex 32`).
   - Update `JWT_SECRET` on the Backend hosting environment.
   - *Note: This will safely invalidate all active user sessions, requiring re-login.*
3. **Redeploy Backend Service**:
   - Restart the Backend process to pick up new environment variables.
4. **Audit Audit Logs**:
   - Query `audit_logs` table for any unauthorized mutations prior to secret rotation.

---

## 5. Recovery Verification Checklist

Execute these verification checks before reopening system access to business users:

- [ ] Database connectivity returns `200 OK` via `/api/health`.
- [ ] All 25 core database tables exist with proper constraints (`npm test`).
- [ ] Central Trial Balance equality verified ($\sum \text{Debits} = \sum \text{Credits}$).
- [ ] Sub-ledger balances reconcile against GL Control accounts (AR vs 1200, AP vs 2010).
- [ ] Hidden VVIP Admin login accessible via `CTRL + Mouse Left Click`.
- [ ] Standard company login authenticates registered users.
- [ ] Multi-tenant isolation verified (Company A cannot query Company B records).
