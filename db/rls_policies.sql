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
