# Database Architecture & Management Guide

## QuantumCore Enterprise ERP

---

## 1. PostgreSQL Engine & Version Compatibility

QuantumCore ERP is built against standard ANSI SQL and PostgreSQL enterprise standards.

- **Supported PostgreSQL Versions**: PostgreSQL 15, 16, 17+
- **Current Production Provider**: Supabase Managed PostgreSQL (PG17)
- **Portability**: 100% standard PostgreSQL compatible; can run on self-hosted PostgreSQL, AWS RDS Aurora, Google Cloud SQL, or Azure Database for PostgreSQL without code changes.

### Required PostgreSQL Extensions
The initial migration automatically enables:
1. `uuid-ossp`: Native UUIDv4 generation (`uuid_generate_v4()`).
2. `pgcrypto`: Cryptographic hashing and random token generators.

---

## 2. Master Schema & Entity Directory

The database consists of 25 core tables organized into logical subledger domains:

### 2.1 Platform & Multi-Tenant Management
- `companies`: Master organization/tenant profiles (`tier`, `base_currency`, `tax_identifier`).
- `branches`: Multi-location operating branches with HQ designations.
- `departments`: Departmental operating units.
- `cost_centers`: Granular accounting cost centers linked to departments.
- `company_memberships`: User-to-company role bindings with primary tenant pointers.
- `company_modules`: Entitlement matrix for ERP modules per tenant.
- `company_feature_flags`: Granular operational toggles.

### 2.2 Security & RBAC
- `users`: User identities with password hashes and super-admin flags.
- `roles`: Role definitions (`PLATFORM_SUPER_ADMIN`, `COMPANY_ADMIN`, `ACCOUNTANT`, etc.).
- `permissions`: Fine-grained permission definitions (`journals:post`, `sales:approve`, etc.).
- `role_permissions`: Association table between roles and permissions.
- `audit_logs`: Immutable cryptographic audit trail with state JSON diffs.

### 2.3 General Ledger & Fiscal Governance
- `fiscal_years`: Fiscal year boundary tracking.
- `accounting_periods`: Monthly/quarterly periods with `open`, `locked`, and `closed` states.
- `account_groups`: Chart of accounts parent grouping and categorization.
- `chart_of_accounts`: Master GL accounts with classification, normal balance, and reconciliation flags.
- `journal_entries`: Master double-entry journal headers with cryptographic sequence numbering.
- `journal_lines`: Line-item debits and credits with currency conversion and subledger references.

### 2.4 Commercial Operations Subledgers
- `customer_groups` & `customers`: Accounts Receivable (AR) subledger entities.
- `sales_invoices`: Customer sales billing with line-item tax and balance tracking.
- `customer_payments`: 2-Step payment receipts with document proof validation.
- `supplier_groups` & `suppliers`: Accounts Payable (AP) subledger entities.

---

## 3. Migration Sequence & Determinism

All database migrations reside in `db/migrations/` and follow a strict numerical ordering:

```
db/
├── migrations/
│   ├── 001_initial_schema.sql                  # Core types, tables, constraints, GL
│   ├── 002_commercial_operations_schema.sql    # Customers, Suppliers, Invoices, Payments
│   └── 003_align_schema.sql                    # Column additions & reconciliation flags
└── seeds/
    ├── 000_default_company.sql                 # Baseline tenant seed
    └── 001_chart_of_accounts.sql               # Standard commercial chart of accounts
```

### Automated Migration Execution
Run from repository root:
```bash
npm run db:migrate
```

The migration runner:
1. Creates the `schema_migrations` table if not present.
2. Acquires a database lock and runs pending `.sql` files inside isolated database transactions (`BEGIN ... COMMIT / ROLLBACK`).
3. Logs execution timestamps and skips already-applied migrations.

---

## 4. Connection Pooling & Transaction Management

The backend utilizes `pg.Pool` (`backend/src/database/pg-client.ts`) configured for high concurrency:

```typescript
export const pgPool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

### Transaction Boundary Helper
Atomic operations utilize `withTransaction`:
```typescript
await withTransaction(async (client) => {
  // 1. Post Journal Entry
  // 2. Adjust Account Balances
  // 3. Write Audit Trail
}, { companyId: tenant.id });
```

---

## 5. Row-Level Security (RLS) Policies

All tenant-scoped tables enforce PostgreSQL Row-Level Security (RLS) as defined in [`db/rls_policies.sql`](file:///C:/Users/Win%2011%20Pro/.gemini/antigravity/scratch/enterprise-erp-core/db/rls_policies.sql).

- Tenant sessions execute:
  ```sql
  SET LOCAL app.current_company_id = '<COMPANY_UUID>';
  ```
- Platform Super Admin sessions execute:
  ```sql
  SET LOCAL app.is_platform_admin = 'true';
  ```
- Any unauthorized cross-tenant query returns zero rows or raises an immediate policy violation.
