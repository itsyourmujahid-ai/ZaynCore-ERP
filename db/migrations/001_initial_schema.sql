-- ============================================================================
-- ENTERPRISE ACCOUNTING ERP — MASTER POSTGRESQL DDL SCHEMA
-- ============================================================================
-- Enables standard extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PLATFORM & TENANT MANAGEMENT
-- ----------------------------------------------------------------------------
CREATE TYPE company_tier AS ENUM ('small', 'medium', 'enterprise');
CREATE TYPE entity_status AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE fiscal_period_status AS ENUM ('open', 'locked', 'closed');
CREATE TYPE journal_status AS ENUM ('draft', 'posted', 'reversed');
CREATE TYPE account_classification AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- Master Company (Tenant) Table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'US',
    industry VARCHAR(128) NOT NULL,
    tier company_tier NOT NULL DEFAULT 'enterprise',
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    tax_identifier VARCHAR(64),
    status entity_status NOT NULL DEFAULT 'active',
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Branches / Locations
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(128),
    state_province VARCHAR(128),
    postal_code VARCHAR(32),
    country_code VARCHAR(2) NOT NULL DEFAULT 'US',
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_branches_company_code UNIQUE (company_id, code)
);

-- Departments & Cost Centers
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    manager_user_id UUID,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_departments_company_code UNIQUE (company_id, code)
);

CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_cost_centers_company_code UNIQUE (company_id, code)
);

-- ----------------------------------------------------------------------------
-- 2. FISCAL YEARS & ACCOUNTING PERIODS
-- ----------------------------------------------------------------------------
CREATE TABLE fiscal_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    name VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_fiscal_years_company_name UNIQUE (company_id, name),
    CONSTRAINT chk_fiscal_year_dates CHECK (end_date >= start_date)
);

CREATE TABLE accounting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
    period_number INT NOT NULL,
    name VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status fiscal_period_status NOT NULL DEFAULT 'open',
    locked_at TIMESTAMPTZ,
    locked_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_periods_company_fy_number UNIQUE (company_id, fiscal_year_id, period_number),
    CONSTRAINT chk_period_dates CHECK (end_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 3. USERS, ROLES & PERMISSIONS
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_platform_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    status entity_status NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL for platform global roles
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_roles_company_code UNIQUE (company_id, code)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(128) NOT NULL UNIQUE, -- e.g. "accounting.journal.post"
    module_key VARCHAR(64) NOT NULL,   -- e.g. "accounting"
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE company_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    is_primary_company BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_membership_company_user UNIQUE (company_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 4. MODULE CAPABILITY & FEATURE FLAGS
-- ----------------------------------------------------------------------------
CREATE TABLE company_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_key VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    configured_by UUID REFERENCES users(id),
    CONSTRAINT uk_company_module UNIQUE (company_id, module_key)
);

CREATE TABLE company_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_key VARCHAR(128) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    settings_json JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_company_feature UNIQUE (company_id, feature_key)
);

-- ----------------------------------------------------------------------------
-- 5. CHART OF ACCOUNTS & GENERAL LEDGER FOUNDATION
-- ----------------------------------------------------------------------------
CREATE TABLE account_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    classification account_classification NOT NULL,
    parent_group_id UUID REFERENCES account_groups(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_account_groups_company_code UNIQUE (company_id, code)
);

CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL REFERENCES account_groups(id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    classification account_classification NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_reconciliation_account BOOLEAN NOT NULL DEFAULT FALSE,
    allow_manual_journal BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_coa_company_code UNIQUE (company_id, code)
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE RESTRICT,
    entry_number VARCHAR(64) NOT NULL,
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    status journal_status NOT NULL DEFAULT 'draft',
    source_module VARCHAR(64) NOT NULL DEFAULT 'manual', -- 'sales', 'purchases', 'payroll', etc.
    source_document_id UUID,
    source_document_number VARCHAR(128),
    memo TEXT,
    total_debit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total_credit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    posted_at TIMESTAMPTZ,
    posted_by UUID REFERENCES users(id),
    reversed_by_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_journal_company_number UNIQUE (company_id, entry_number),
    CONSTRAINT chk_journal_balanced CHECK (total_debit = total_credit)
);

CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE RESTRICT,
    line_number INT NOT NULL,
    description TEXT,
    debit_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    credit_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    base_debit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    base_credit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    sub_ledger_type VARCHAR(64), -- 'customer', 'supplier', 'inventory_item', 'bank_account'
    sub_ledger_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_line_amount_exclusive CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);

-- ----------------------------------------------------------------------------
-- 6. IMMUTABLE AUDIT TRAIL LOG
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,       -- 'CREATE', 'UPDATE', 'POST', 'REVERSE', 'LOCK_PERIOD'
    entity_type VARCHAR(64) NOT NULL,  -- 'Company', 'JournalEntry', 'FiscalPeriod', 'Role'
    entity_id VARCHAR(128) NOT NULL,
    details TEXT,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B-Tree Indexes for High Performance Tenant & Accounting Queries
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_branches_company ON branches(company_id);
CREATE INDEX idx_coa_company_code ON chart_of_accounts(company_id, code);
CREATE INDEX idx_journal_company_period ON journal_entries(company_id, period_id);
CREATE INDEX idx_journal_company_status ON journal_entries(company_id, status);
CREATE INDEX idx_journal_lines_account ON journal_lines(company_id, account_id);
CREATE INDEX idx_journal_lines_subledger ON journal_lines(company_id, sub_ledger_type, sub_ledger_entity_id);
CREATE INDEX idx_audit_logs_company_date ON audit_logs(company_id, created_at DESC);
-- ============================================================================
-- POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES FOR ENTERPRISE MULTI-TENANCY
-- ============================================================================

-- Enable RLS on all tenant-specific tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Standard Tenant Policy Definition
-- Checks session setting 'app.current_company_id' or Platform Super Admin bypass
-- ----------------------------------------------------------------------------

-- Companies: Users can only see companies they belong to or if platform admin
CREATE POLICY tenant_company_isolation ON companies
    FOR ALL
    USING (
        id = current_setting('app.current_company_id', true)::uuid
        OR current_setting('app.is_platform_admin', true)::boolean = TRUE
    );

-- Branches
CREATE POLICY tenant_branch_isolation ON branches
    FOR ALL
    USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Fiscal Years
CREATE POLICY tenant_fiscal_years_isolation ON fiscal_years
    FOR ALL
    USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Accounting Periods
CREATE POLICY tenant_periods_isolation ON accounting_periods
    FOR ALL
    USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Chart of Accounts
CREATE POLICY tenant_coa_isolation ON chart_of_accounts
    FOR ALL
    USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Journal Entries (General Ledger)
CREATE POLICY tenant_journal_isolation ON journal_entries
    FOR ALL
    USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Journal Lines
CREATE POLICY tenant_journal_lines_isolation ON journal_lines
    FOR ALL
    USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- Audit Logs
CREATE POLICY tenant_audit_isolation ON audit_logs
    FOR ALL
    USING (
        company_id = current_setting('app.current_company_id', true)::uuid
        OR (company_id IS NULL AND current_setting('app.is_platform_admin', true)::boolean = TRUE)
    );
