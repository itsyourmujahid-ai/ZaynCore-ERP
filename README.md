# Enterprise Accounting & Business Management ERP (Monorepo)

An enterprise-grade, multi-tenant Accounting and Enterprise Resource Planning (ERP) platform architected for scale, compliance, and deterministic double-entry financial integrity.

---

## 🏗️ Architecture Overview

The system is organized as a production-grade **Monorepo** using standard npm workspaces:

\\\
enterprise-erp-core/
├── frontend/               # React 19 + Vite SPA application
│   ├── src/
│   │   ├── api/            # Typed API client adapter
│   │   ├── core/           # UI contexts (Auth, Theme), layout & config
│   │   ├── modules/        # UI Workspaces (Accounting, Sales, Purchases, Inventory, etc.)
│   │   └── ui/             # Enterprise shell, navigation, global search, components
│   └── package.json        # @enterprise/frontend
│
├── backend/                # Express REST API application
│   ├── src/
│   │   ├── api/            # REST Controllers, Routes & Middleware
│   │   ├── database/       # Relational storage engine & seeds
│   │   ├── modules/        # Domain business services (Posting, Tax, Inventory, Payroll...)
│   │   └── server.ts       # Server entrypoint & lifecycle
│   └── package.json        # @enterprise/backend
│
├── shared/                 # Shared domain types, zero-float money engine & contracts
│   ├── src/
│   │   ├── types/          # Domain models, database entities, enums
│   │   ├── utils/          # Zero-float deterministic Money engine
│   │   ├── errors/         # Typed domain errors (TenantViolation, PeriodClosed, OutOfBalance...)
│   │   └── contracts/      # Request/response interfaces & headers
│   └── package.json        # @enterprise/shared
│
├── db/                     # PostgreSQL DDL migrations, RLS policies & seeds
│   ├── migrations/         # Numbered SQL migrations (001_initial_schema.sql)
│   ├── seeds/              # Seed scripts (001_chart_of_accounts.sql)
│   └── README.md           # Database administration guide
│
├── tests/                  # Categorized automated test suites (257 tests / 35 suites)
│   ├── accounting/         # Double-entry invariant, GL, Cost Accounting, Consolidation
│   ├── modules/            # Sales AR, Procurement AP, Inventory, Banking, Assets, Payroll, Tax
│   ├── onboarding/         # Company onboarding, admin setup, user access hardening
│   ├── security/           # Production readiness, RBAC, tenant isolation, SoD
│   └── uat/                # Real-world business UAT & transaction lifecycles
│
├── .env.example            # Environment configuration template
├── package.json            # Root workspace configuration & orchestration scripts
└── tsconfig.json           # Root TypeScript configuration
\\\

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.x or v22.x+
- **npm**: v10.x+
- **PostgreSQL**: v14.x+ (for production deployments)

### 2. Installation
Install all workspace dependencies from the root directory:
\\\ash
npm install
\\\

### 3. Environment Configuration
Copy the environment template and set your configuration:
\\\ash
cp .env.example .env
\\\

### 4. Database Initialization
Run PostgreSQL schema migrations and chart of accounts seed:
\\\ash
psql -U postgres -d enterprise_erp -f db/migrations/001_initial_schema.sql
psql -U postgres -d enterprise_erp -f db/seeds/001_chart_of_accounts.sql
\\\

### 5. Running the Application

- **Run Frontend in Development**:
  \\\ash
  npm run dev:frontend
  # or from root: npm run dev
  \\\

- **Run Backend API in Development**:
  \\\ash
  npm run dev:backend
  \\\

---

## 🧪 Automated Testing

The ERP includes **257 automated tests** across **35 suites** covering every control dimension:

\\\ash
# Run all test suites
npm test

# Run specific domain test groups
npm run test:accounting   # Foundation, GL, Cost Accounting, Consolidation
npm run test:modules      # Sales, Purchases, Inventory, Banking, Tax, Payroll, Assets
npm run test:onboarding   # Company Onboarding, Multi-tier Provisioning, Role Setup
npm run test:security     # Multi-Tenant Isolation, RBAC, Period Locks, 10-Point Reconciliation
npm run test:uat          # End-to-End Real-World Business UAT Lifecycle
\\\

---

## 📦 Production Build

To compile all monorepo packages (shared, ackend, rontend) for production:
\\\ash
npm run build:all
\\\

Outputs:
- @enterprise/shared: shared/dist/ (TypeScript declarations & ESM modules)
- @enterprise/backend: verified clean TypeScript compilation
- @enterprise/frontend: rontend/dist/ (Vite-optimized production bundle)

---

## 🛡️ Core Financial & Security Invariants
1. **Deterministic Double-Entry**: Every posted financial transaction maintains Total Debits == Total Credits with zero floating-point inaccuracies (Money string math).
2. **Multi-Tenant Isolation**: Tenant boundary enforced at database, service, and API layers.
3. **Accounting Immutability**: Posted journal entries and filed tax returns cannot be modified or deleted directly; audit adjustments and reversals are required.
4. **10-Point Reconciliation**: Automated real-time verification across AR, AP, Bank, Inventory, Fixed Assets, Payroll, Tax, Intercompany, GRNI, and Suspense accounts.
5. **Segregation of Duties (SoD)**: Sales payment submissions require independent accountant proof verification before GL posting.