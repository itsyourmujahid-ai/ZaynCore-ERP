# Master Architecture & Technical Specification

## QuantumCore Enterprise ERP

---

## 1. System Architecture Overview

QuantumCore ERP is architected as a modular, multi-tenant enterprise system with a clear separation of concerns across presentation, API routing, business domain logic, and persistent storage layers.

```
+-----------------------------------------------------------------------------------+
|                                  USER / CLIENT                                    |
|                   (Web Browser / Mobile View / Desktop PWA)                       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ HTTPS / WSS
+-----------------------------------------------------------------------------------+
|                             VERCEL / FRONTEND CDN                                 |
|   • React 19 Single Page Application (SPA) bundled via Vite                       |
|   • Semantic Tailwind Design Token Engine (WCAG AAA Light / Dark Modes)           |
|   • Client-side State & Role-Based UI Guard Projection                            |
|   • Centralized API Client (Axios / Fetch with JWT Auth Header)                   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ REST API / HTTPS
+-----------------------------------------------------------------------------------+
|                        BACKEND REST API (NODE.JS / EXPRESS)                       |
|   • Express Server (Modular Monolith architecture)                                |
|   • Security Middlewares: Helmet, Strict CORS, Rate Limiting, Request Correlation |
|   • Authentication & Session Middleware (Server-side JWT cryptographic validation)|
|   • Multi-Tenant Resolver (Derives Tenant ID from verified server membership)     |
|   • Role-Based Access Control (RBAC) & Separation of Duties (SoD) Validator       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        DOMAIN & APPLICATION SERVICES LAYER                        |
|   • Central Accounting Engine (Double-Entry Invariants, Multi-Currency, Forex)    |
|   • AR / Sales Service (2-Step Payment Proof Guard & Receipt Settlement)          |
|   • AP / Procurement Service (3-Way Matching: PO -> GRN -> Supplier Bill)         |
|   • Inventory & Warehouse Subledger (FIFO Valuation, Transfers, Shrinkage)        |
|   • Banking & Reconciliation Engine (Statement Parsing, Match Matrix)             |
|   • Sovereign Tax / VAT Authority (Pure Tax Engine & Sub-Ledger Posting)         |
|   • Payroll & Compensation Engine (Salary Calculation, PASI Statutory Clearing)   |
|   • Fixed Asset Lifecycle (Capitalization, Straight-line Depreciation, Disposal)  |
|   • Project Accounting & Job Costing Engine                                       |
|   • Cryptographic Audit Trail Engine (SHA-256 State Diffs, Immutability Guard)    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                     POSTGRESQL REPOSITORY & PERSISTENCE LAYER                     |
|   • PostgreSQL Client Connection Pool (`pg.Pool` with SSL support)                |
|   • Transaction Manager (`withTransaction` with ACID guarantee)                   |
|   • Session Context Setter (`SET LOCAL app.current_company_id = '...'`)           |
|   • Schema Migrations Tracker (`schema_migrations` table)                         |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ PostgreSQL Wire Protocol / Pooler (Port 5432 / 6543)
+-----------------------------------------------------------------------------------+
|                           SUPABASE MANAGED POSTGRESQL (PG17)                      |
|   • Relational Tables with Referential Integrity & Check Constraints              |
|   • Row-Level Security (RLS) Policies on all tenant-owned entities                |
|   • Native UUIDv4 and Cryptographic Extensions (`uuid-ossp`, `pgcrypto`)          |
|   • Provider-Managed Write-Ahead Logs (WAL) & Point-in-Time Recovery (PITR)       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Layered Component Boundaries

### 2.1 Presentation Layer (`@enterprise/frontend`)
- **Technology**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Responsibilities**:
  - Render high-contrast accessible UI components (WCAG AAA compliant).
  - Manage application routing, views, modal state, and theme switching.
  - Intercept API requests to attach server-issued JWT tokens.
  - Provide offline-safe optimistic UI states and error boundary handling.
  - Enforce stealth VVIP Super Admin trigger (`CTRL + Mouse Left Click`).

### 2.2 Shared Contracts Layer (`@enterprise/shared`)
- **Technology**: TypeScript Library (`@enterprise/shared`).
- **Responsibilities**:
  - Expose universal TypeScript interfaces, DTOs, Enums, and Constants.
  - Define API request/response contracts ensuring end-to-end type safety.
  - Reusable across frontend, backend, and automated test runners.

### 2.3 API & Middleware Layer (`@enterprise/backend`)
- **Technology**: Express.js, TypeScript, Node.js (ESM).
- **Responsibilities**:
  - Verify JWT signatures using server-side secret (`JWT_SECRET`).
  - Lookup authenticated user's active company membership in database.
  - Block untrusted frontend headers (e.g. rejects arbitrary `x-user-id` or `x-user-role`).
  - Route validated requests to domain controllers.

### 2.4 Domain Services & Accounting Engine
- **Invariants**:
  - **Double-Entry Equilibrium**: Every journal entry satisfies Sum(Debits) = Sum(Credits) at exact 4-decimal precision.
  - **Document Immutability**: Posted documents cannot be updated or deleted in-place; adjustments require audited reversal journals.
  - **Closed Period Lock**: Mutations within locked or closed fiscal periods are strictly rejected.
  - **Two-Step Payment Proof Guard**: Sales receipts require accountant verification and attachment validation before posting to the GL.
  - **Three-Way Match**: Supplier Bills must match Purchase Orders and Goods Receipt Notes (GRN) before AP settlement.

### 2.5 Persistence & Database Layer
- **Technology**: PostgreSQL 17 (Supabase Managed or Self-Hosted standard PostgreSQL).
- **Security**: Row-Level Security (RLS) policies enforce logical data separation per tenant company.

---

## 3. Multi-Tenant Isolation Model

Every tenant entity carries a non-nullable `company_id UUID REFERENCES companies(id)`.

```sql
-- Standard Tenant Policy Definition
CREATE POLICY tenant_isolation_policy ON journal_entries
    FOR ALL
    USING (
        company_id = current_setting('app.current_company_id', true)::uuid
        OR current_setting('app.is_platform_admin', true)::boolean = TRUE
    );
```

Before executing tenant queries within a database transaction, the backend executes:
```sql
SET LOCAL app.current_company_id = '<VERIFIED_COMPANY_UUID>';
```

---

## 4. Role-Based Access Control (RBAC) & SoD

| Role Code | Scope | Primary Capabilities |
| :--- | :--- | :--- |
| `PLATFORM_SUPER_ADMIN` | Global / Cross-Tenant | Manage tenant organizations, module licensing, provisioning, system monitoring. |
| `COMPANY_ADMIN` | Single Tenant | Configure company settings, users, branches, chart of accounts, tax setup. |
| `CHIEF_ACCOUNTANT` | Single Tenant | Approve journals, manage fiscal period locks, execute financial year-end closing. |
| `ACCOUNTANT` | Single Tenant | Post journals, verify customer payment proofs, reconcile bank statements, process bills. |
| `SALES_OFFICER` | Single Tenant | Create quotations, sales orders, draft invoices, submit customer payment proofs. |
| `WAREHOUSE_MANAGER` | Single Tenant | Process Goods Receipts (GRN), inventory stock transfers, count adjustments. |
| `HR_PAYROLL_OFFICER`| Single Tenant | Manage employee records, run monthly payroll batches, statutory PASI clearing. |
| `AUDITOR_VIEWER` | Single Tenant | Read-only access across general ledger, sub-ledgers, audit trails, and tax reports. |

---

## 5. Security Architecture & Threat Mitigation

1. **Zero Secret Exposure**: Production credentials (`DATABASE_URL`, `JWT_SECRET`, database passwords) are strictly server-side and never bundled into frontend static assets.
2. **Cryptographic Signatures**: All authentication tokens use HMAC-SHA256 signatures with expiration validation.
3. **Audit Trail**: All state mutations generate immutable audit logs with JSON diffs and user attribution.
4. **CORS & CSRF**: API restricts cross-origin access to explicitly configured origins (`CORS_ORIGIN`).
