# Production Deployment Guide

## QuantumCore Enterprise ERP

---

## 1. Deployment Architecture Summary

QuantumCore ERP is decoupled into two independent production targets:
1. **Frontend (Vercel)**: Static Single-Page Application (SPA) served globally via Vercel Edge CDN.
2. **Backend API (Node.js / Container / VM)**: Express REST API hosted on any standard Node.js runtime (e.g. Render, Railway, Fly.io, AWS ECS, or Ubuntu VM).
3. **Database (Supabase PostgreSQL)**: Managed PostgreSQL 17 database instance with session/transaction pooling.

---

## 2. Environment Variables Matrix

| Environment Variable | Target Component | Production Location | Description | Example / Safe Template |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Frontend | Vercel Environment Variables | Public HTTPS endpoint of your backend REST API | `https://api.yourcompany.com/api` |
| `PORT` | Backend | Backend Host Configuration | TCP port the Express server listens on | `3000` (or host provided) |
| `NODE_ENV` | Backend | Backend Host Configuration | Runtime environment identifier | `production` |
| `DATABASE_URL` | Backend | Backend Secret Manager | PostgreSQL Connection String (Session Pooler) | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Backend | Backend Secret Manager | 256-bit secret key for signing auth tokens | `[RANDOM_64_CHAR_HEX_STRING]` |
| `JWT_EXPIRES_IN` | Backend | Backend Configuration | Token validity duration | `7d` |
| `CORS_ORIGIN` | Backend | Backend Secret Manager | Allowed Frontend domains (comma-separated) | `https://erp.yourcompany.com,https://your-app.vercel.app` |

> **IMPORTANT SECURITY RULE**:
> Never provide `DATABASE_URL`, `JWT_SECRET`, or database passwords to Vercel or frontend build environments. Only `VITE_API_URL` is exposed to the client.

---

## 3. Database Initialization & Migration

### Step 1: Provision PostgreSQL on Supabase
1. Create a new Supabase project (select PostgreSQL 15, 16, or 17).
2. Note the **Database Password** and **Connection String** (use the IPv4 compatible Session Pooler on port 5432 or 6543).

### Step 2: Execute Schema Migrations
From any machine with Node.js 20+:
```bash
# Set your production database URL
export DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Execute migrations deterministically
npm run db:migrate
```

This runs the automated migration runner (`backend/src/database/migrate.ts`):
- Creates `schema_migrations` tracking table.
- Executes `db/migrations/001_initial_schema.sql` (Tables, ENUMs, UUIDs, Foreign Keys).
- Executes `db/migrations/002_commercial_operations_schema.sql` (AR/AP, Subledgers, Payments).
- Executes `db/migrations/003_align_schema.sql` (Column alignments & constraints).
- Executes seeds in `db/seeds/` (Default organization baseline and standard Chart of Accounts).

---

## 4. Frontend Deployment on Vercel

### Step 1: Connect Repository to Vercel
1. Import the GitHub repository into your Vercel team account.
2. Select **Framework Preset**: `Vite`.
3. Set **Root Directory**: `./` (or `frontend`).
4. Set **Build Command**: `npm run build:frontend`
5. Set **Output Directory**: `frontend/dist`
6. Set **Install Command**: `npm install`

### Step 2: Configure Vercel Environment Variables
Add the single public variable:
- `VITE_API_URL` = `https://api.yourcompany.com/api`

### Step 3: Deploy & Verify SPA Routing
Vercel reads [`vercel.json`](file:///C:/Users/Win%2011%20Pro/.gemini/antigravity/scratch/enterprise-erp-core/vercel.json) at project root:
```json
{
  "version": 2,
  "buildCommand": "npm run build:frontend",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
Deploy and verify that reloading nested routes (e.g. `/dashboard`, `/reports`) does not return 404 errors.

---

## 5. Backend API Deployment

### Option A: Standard Node.js Host (Render / Railway / Fly.io)
1. Set **Build Command**: `npm install && npm run build:backend`
2. Set **Start Command**: `node backend/dist/server.js` (or `npx tsx backend/src/server.ts`)
3. Inject the Backend Environment Variables:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_URL=postgresql://...`
   - `JWT_SECRET=[RANDOM_SECRET]`
   - `CORS_ORIGIN=https://your-app.vercel.app`

### Option B: Linux Virtual Machine (Ubuntu 22.04 / 24.04 LTS)
```bash
# 1. Clone repository
git clone https://github.com/your-org/enterprise-erp-core.git
cd enterprise-erp-core

# 2. Install dependencies & build
npm install
npm run build:all

# 3. Create production .env file
cat <<EOF > .env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://erp.yourcompany.com
EOF

# 4. Start service with PM2 or systemd
pm2 start "node backend/dist/server.js" --name "enterprise-erp-api"
pm2 save
pm2 startup
```

---

## 6. Verification & Health Check

After deployment, perform non-destructive sanity verification:

1. **Backend Health Check**:
   ```bash
   curl -i https://api.yourcompany.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "enterprise-erp-api",
     "version": "1.0.0"
   }
   ```

2. **Frontend UI Connectivity**:
   - Open your Vercel URL in a browser.
   - Hold `CTRL` and **Left Click** to reveal the VVIP Super Admin modal.
   - Test login with admin credentials.
   - Verify theme switching between Light/Dark and Green/Blue/Black palettes.
