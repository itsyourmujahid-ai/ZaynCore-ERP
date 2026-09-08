// ============================================================================
// Master Database Seed Bootstrapper (Production-Ready Clean Baseline)
// ============================================================================

import { 
  DbCompany, 
  DbBranch, 
  DbDepartment, 
  DbCostCenter, 
  DbFiscalYear, 
  DbAccountingPeriod, 
  DbUser, 
  DbRole, 
  DbCompanyMembership, 
  DbCompanyModule, 
  DbAccountGroup, 
  DbAccount, 
  DbTaxCode,
  DbTaxJurisdiction,
  DbTaxRegistration,
  DbTaxType,
  DbProjectType,
  DbAccountingRule,
  DbJournalEntry, 
  DbJournalLine, 
  DbAuditLog 
} from './types';
import { ERP_MODULE_REGISTRY } from '@/modules/registry/registry';

// Baseline Customer Organizations (FRESH BASELINE: ZERO DEMO COMPANIES)
export const INITIAL_COMPANIES: DbCompany[] = [];

// Baseline Operating Branches (FRESH BASELINE)
export const INITIAL_BRANCHES: DbBranch[] = [];

export const INITIAL_DEPARTMENTS: DbDepartment[] = [];

export const INITIAL_COST_CENTERS: DbCostCenter[] = [];

export const INITIAL_FISCAL_YEARS: DbFiscalYear[] = [];

export const INITIAL_ACCOUNTING_PERIODS: DbAccountingPeriod[] = [];

export const INITIAL_ROLES: DbRole[] = [
  {
    id: 'role-superadmin',
    code: 'SUPER_ADMIN',
    name: 'Platform Super Administrator',
    description: 'Complete cross-platform oversight, tenant provisioning, and capability management',
    isSystemRole: true,
    permissions: ['*'],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-company-admin',
    code: 'COMPANY_ADMIN',
    name: 'Company Administrator',
    description: 'Full organizational administration for company workspace and master data',
    isSystemRole: true,
    permissions: ['*'],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-cfo',
    code: 'CFO',
    name: 'Chief Financial Officer',
    description: 'Full financial authority: period closing, chart of accounts management, consolidated reports',
    isSystemRole: true,
    permissions: [
      'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.submit', 'accounting.approve', 'accounting.post', 
      'accounting.reverse', 'accounting.lock_period', 'accounting.manage_coa', 'accounting.configure',
      'ar.view', 'ar.post', 'ap.view', 'ap.post', 'banking.view', 'banking.reconcile',
      'projects.view', 'projects.create', 'projects.edit', 'projects.approve', 'projects.budget', 'projects.costs', 'projects.billing', 'projects.profitability', 'projects.close', 'projects.reports', 'projects.configure',
      'reports.view_financial', 'reports.view_audit', 'consolidation.run'
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-senior-accountant',
    code: 'SENIOR_ACCOUNTANT',
    name: 'Senior Accountant',
    description: 'Prepares, reviews, and posts general journal entries, reconciliations, and tax summaries',
    isSystemRole: true,
    permissions: [
      'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.submit', 'accounting.approve', 'accounting.post',
      'ar.view', 'ar.create', 'ar.post', 'ap.view', 'ap.create', 'ap.post',
      'banking.view', 'banking.reconcile', 'projects.view', 'projects.create', 'projects.edit', 'projects.costs', 'projects.billing', 'projects.profitability', 'reports.view_financial'
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-junior-clerk',
    code: 'ACCOUNTING_CLERK',
    name: 'Accounting Clerk',
    description: 'Data entry for draft invoices, journal drafts, and vendor bills (cannot post to general ledger)',
    isSystemRole: true,
    permissions: [
      'accounting.view', 'accounting.create', 'accounting.submit',
      'ar.view', 'ar.create',
      'ap.view', 'ap.create',
      'banking.view'
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-auditor',
    code: 'EXTERNAL_AUDITOR',
    name: 'External Auditor',
    description: 'Strictly read-only access to general ledger, sub-ledgers, and immutable audit logs',
    isSystemRole: true,
    permissions: [
      'accounting.view', 'ar.view', 'ap.view', 'banking.view', 
      'reports.view_financial', 'reports.view_audit'
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// FRESH BASELINE: Only Platform Super Admin / VVIP Owner exists
export const INITIAL_USERS: DbUser[] = [
  {
    id: 'u1000000-0000-0000-0000-000000000001',
    username: 'admin@mujahid.com',
    email: 'admin@mujahid.com',
    fullName: 'Platform Super Administrator (VVIP Owner)',
    passwordHash: 'argon2:$bahwanmge$',
    password: 'bahwanmge',
    isPlatformSuperAdmin: true,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_MEMBERSHIPS: DbCompanyMembership[] = [];

// Configurable Account Groups Supporting 8 Account Types
export const INITIAL_ACCOUNT_GROUPS: DbAccountGroup[] = [
  { id: 'g1000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '1000', name: 'Current Assets', classification: 'asset', accountType: 'asset', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g1500', companyId: 'c1000000-0000-0000-0000-000000000001', code: '1500', name: 'Non-Current & Fixed Assets', classification: 'asset', accountType: 'asset', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g2000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '2000', name: 'Current Liabilities', classification: 'liability', accountType: 'liability', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g2500', companyId: 'c1000000-0000-0000-0000-000000000001', code: '2500', name: 'Long-Term Liabilities', classification: 'liability', accountType: 'liability', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g3000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '3000', name: 'Equity & Retained Earnings', classification: 'equity', accountType: 'equity', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g4000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '4000', name: 'Operating Revenue', classification: 'revenue', accountType: 'revenue', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g5000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '5000', name: 'Cost of Goods Sold (COGS)', classification: 'cost_of_sales', accountType: 'cost_of_sales', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g6000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '6000', name: 'Operating & Admin Expenses', classification: 'expense', accountType: 'expense', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g7000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '7000', name: 'Other Income & Financial Gains', classification: 'other_income', accountType: 'other_income', level: 1, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'g8000', companyId: 'c1000000-0000-0000-0000-000000000001', code: '8000', name: 'Other Expenses & Financial Charges', classification: 'other_expense', accountType: 'other_expense', level: 1, createdAt: '2026-01-01T00:00:00Z' },
];

// Standard Hierarchical Chart of Accounts Template
export const INITIAL_ACCOUNTS: DbAccount[] = [
  // 1000: Current Assets (Normal Balance: DEBIT)
  { id: 'a-1010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1010', name: 'Operating Bank Account (Main Treasury)', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: true, description: 'Primary clearing and operating bank account', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1020', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1020', name: 'Petty Cash Drawer', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: false, allowManualJournal: true, description: 'Office cash on hand vault', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1200', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1200', name: 'Accounts Receivable (Trade Debtors Control)', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: false, description: 'Sub-ledger control account for customer receivables', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1250', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1250', name: 'Employee Advances & Staff Loans', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: true, description: 'Sub-ledger control account for employee advances and salary loans', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1300', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1300', name: 'Merchandise Inventory Asset', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: false, description: 'Perpetual stock valuation asset', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1350', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1350', name: 'Work in Progress (WIP) Projects', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Capitalized project contract costs in progress', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1400', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1400', name: 'Prepaid Expenses & Advances', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Unamortized prepaid rent and insurance', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1450', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1450', name: 'Input Tax / VAT Recoverable', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Input VAT paid on supplier purchases', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1460', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1000', code: '1460', name: 'Net Tax / VAT Refund Receivable', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Net refundable tax receivable from tax authority', createdAt: '2026-01-01T00:00:00Z' },

  // 1500: Non-Current & Fixed Assets
  { id: 'a-1510', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1500', code: '1510', name: 'Property, Plant & Equipment / Fixed Assets', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: true, description: 'Capitalized fixed assets and equipment control', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1520', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1500', code: '1520', name: 'Accumulated Depreciation - Fixed Assets', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: true, description: 'Contra-asset account for fixed asset depreciation', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1530', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1500', code: '1530', name: 'Accumulated Asset Impairment', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: true, description: 'Contra-asset account for asset carrying value impairments', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-1590', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g1500', code: '1590', name: 'Asset Clearing & Capital WIP (CWIP)', classification: 'asset', accountType: 'asset', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Clearing account for asset capitalization and work in progress', createdAt: '2026-01-01T00:00:00Z' },

  // 2000: Current Liabilities (Normal Balance: CREDIT)
  { id: 'a-2010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g2000', code: '2010', name: 'Accounts Payable (Trade Creditors Control)', classification: 'liability', accountType: 'liability', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: false, description: 'Sub-ledger control account for supplier payables', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-2020', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g2000', code: '2020', name: 'Goods Received Not Invoiced (GRIR Clearing)', classification: 'liability', accountType: 'liability', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: true, isSystemAccount: true, allowManualJournal: false, description: 'Clearing account for unbilled goods receipts', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-2200', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g2000', code: '2200', name: 'Output Tax / VAT Payable', classification: 'liability', accountType: 'liability', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Output VAT collected on sales invoices', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-2210', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g2000', code: '2210', name: 'Net Tax / VAT Payable Control', classification: 'liability', accountType: 'liability', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Net settled tax payable awaiting tax authority disbursement', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-2040', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g2000', code: '2040', name: 'Employee Withholdings & Statutory Taxes Payable', classification: 'liability', accountType: 'liability', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Statutory income tax and social security withholdings payable', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-2045', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g2000', code: '2045', name: 'Employer Social Security Contribution Payable', classification: 'liability', accountType: 'liability', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Employer statutory social fund liability', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-2300', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g2000', code: '2300', name: 'Accrued Payroll & Salaries Payable', classification: 'liability', accountType: 'liability', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: true, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Net salaries accrued awaiting payroll disbursement', createdAt: '2026-01-01T00:00:00Z' },

  // 3000: Equity (Normal Balance: CREDIT)
  { id: 'a-3010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g3000', code: '3010', name: 'Common Share Capital', classification: 'equity', accountType: 'equity', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Initial shareholder paid-in capital', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-3200', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g3000', code: '3200', name: 'Retained Earnings', classification: 'equity', accountType: 'equity', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: true, allowManualJournal: true, description: 'Accumulated annual net operating profit/loss', createdAt: '2026-01-01T00:00:00Z' },

  // 4000: Operating Revenue (Normal Balance: CREDIT)
  { id: 'a-4010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g4000', code: '4010', name: 'SaaS Software & Product Sales Revenue', classification: 'revenue', accountType: 'revenue', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Primary operating sales revenue', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-4020', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g4000', code: '4020', name: 'Consulting & Professional Services Revenue', classification: 'revenue', accountType: 'revenue', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Implementation and advisory fees', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-4080', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g4000', code: '4080', name: 'Tax Rounding & Adjustment Income', classification: 'other_income', accountType: 'other_income', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Favorable tax rounding and adjustment credits', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-4085', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g4000', code: '4085', name: 'Gain on Disposal of Fixed Assets', classification: 'other_income', accountType: 'other_income', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Net gain realized on sale/disposal of capital assets', createdAt: '2026-01-01T00:00:00Z' },

  // 5000: Cost of Goods Sold (Normal Balance: DEBIT)
  { id: 'a-5010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g5000', code: '5010', name: 'Direct Material & Hosting Costs (COGS)', classification: 'cost_of_sales', accountType: 'cost_of_sales', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Cost of goods dispatched and direct infrastructure', createdAt: '2026-01-01T00:00:00Z' },

  // 6000: Operating & Administrative Expenses (Normal Balance: DEBIT)
  { id: 'a-6010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6010', name: 'Salaries & Staff Basic Compensation', classification: 'expense', accountType: 'expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Basic payroll compensation expense', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-6012', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6012', name: 'Housing, Transport & Living Allowances', classification: 'expense', accountType: 'expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Employee allowances for housing, transport, food', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-6015', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6015', name: 'Overtime, Performance Bonuses & Commissions', classification: 'expense', accountType: 'expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Variable pay, overtime hours and employee bonuses', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-6018', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6018', name: 'Employee End of Service Gratuity / EOSB Expense', classification: 'expense', accountType: 'expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'End of service gratuity and severance compensation', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-6020', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6020', name: 'Office Rent & Operating Expenses', classification: 'expense', accountType: 'expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Facility occupancy and operating expenses', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-6080', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6080', name: 'Tax Rounding & Adjustment Expense', classification: 'expense', accountType: 'expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Non-recoverable tax adjustments and rounding differences', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-6085', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6085', name: 'Loss on Disposal & Impairment of Fixed Assets', classification: 'other_expense', accountType: 'other_expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Loss on fixed asset retirement, write-off and impairment', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a-6090', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g6000', code: '6090', name: 'Depreciation & Amortization Expense', classification: 'expense', accountType: 'expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Monthly fixed asset straight-line depreciation', createdAt: '2026-01-01T00:00:00Z' },

  // 7000: Other Income
  { id: 'a-7010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g7000', code: '7010', name: 'Interest Income & Foreign Exchange Gains', classification: 'other_income', accountType: 'other_income', level: 2, normalBalance: 'credit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Non-operating treasury interest and FX gains', createdAt: '2026-01-01T00:00:00Z' },

  // 8000: Other Expense
  { id: 'a-8010', companyId: 'c1000000-0000-0000-0000-000000000001', groupId: 'g8000', code: '8010', name: 'Bank Charges & Foreign Exchange Losses', classification: 'other_expense', accountType: 'other_expense', level: 2, normalBalance: 'debit', currency: 'USD', isActive: true, isControlAccount: false, isReconciliationAccount: false, isSystemAccount: false, allowManualJournal: true, description: 'Bank transfer fees and currency revaluation losses', createdAt: '2026-01-01T00:00:00Z' },
];

// Baseline Tax Jurisdictions (FRESH BASELINE)
export const INITIAL_TAX_JURISDICTIONS: DbTaxJurisdiction[] = [];

// Baseline Tax Registrations (FRESH BASELINE)
export const INITIAL_TAX_REGISTRATIONS: DbTaxRegistration[] = [];

// Baseline Tax Types
export const INITIAL_TAX_TYPES: DbTaxType[] = [
  {
    id: 'tt-vat',
    companyId: 'c1000000-0000-0000-0000-000000000001',
    code: 'VAT',
    name: 'Value Added Tax',
    category: 'vat',
    description: 'Indirect multi-stage consumption tax',
    isRecoverableByDefault: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tt-sales-tax',
    companyId: 'c1000000-0000-0000-0000-000000000001',
    code: 'SALES_TAX',
    name: 'Sales & Use Tax',
    category: 'sales_tax',
    description: 'Single-stage retail sales tax',
    isRecoverableByDefault: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tt-wht',
    companyId: 'c1000000-0000-0000-0000-000000000001',
    code: 'WHT',
    name: 'Withholding Tax',
    category: 'withholding_tax',
    description: 'Statutory cross-border or vendor withholding tax',
    isRecoverableByDefault: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// Baseline Tax Codes (FRESH BASELINE)
export const INITIAL_TAX_CODES: DbTaxCode[] = [];

// Master Automated Accounting Rules
export const INITIAL_ACCOUNTING_RULES: DbAccountingRule[] = [
  {
    id: 'rule-sales-inv',
    event: 'SALES_INVOICE_POSTED',
    name: 'Standard Sales Tax Invoicing',
    version: 1,
    priority: 100,
    isActive: true,
    description: 'Debit Accounts Receivable (#1200), Credit Sales Revenue (#4010) and Output VAT (#2200)',
    debitAccountSelector: '1200',
    creditAccountSelector: '4010',
    taxTreatment: 'exclusive',
    currencyTreatment: 'multi_currency',
    reversalBehavior: 'standard_inversion',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rule-sales-receipt',
    event: 'SALES_PAYMENT_RECEIVED',
    name: 'Customer Invoice Receipt Settlement',
    version: 1,
    priority: 100,
    isActive: true,
    description: 'Debit Operating Bank Account (#1010), Credit Accounts Receivable (#1200)',
    debitAccountSelector: '1010',
    creditAccountSelector: '1200',
    taxTreatment: 'exempt',
    currencyTreatment: 'multi_currency',
    reversalBehavior: 'standard_inversion',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rule-purch-bill',
    event: 'PURCHASE_BILL_POSTED',
    name: 'Supplier AP Bill Recognition',
    version: 1,
    priority: 100,
    isActive: true,
    description: 'Debit Expense/Inventory (#5010/1300) + Input VAT (#1450), Credit Accounts Payable (#2010)',
    debitAccountSelector: '5010',
    creditAccountSelector: '2010',
    taxTreatment: 'exclusive',
    currencyTreatment: 'multi_currency',
    reversalBehavior: 'standard_inversion',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rule-payroll-run',
    event: 'PAYROLL_RUN_POSTED',
    name: 'Monthly Payroll Accrual & Expense',
    version: 1,
    priority: 100,
    isActive: true,
    description: 'Debit Salaries Expense (#6010), Credit Net Salaries Payable (#2300)',
    debitAccountSelector: '6010',
    creditAccountSelector: '2300',
    taxTreatment: 'exempt',
    currencyTreatment: 'base_only',
    reversalBehavior: 'standard_inversion',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rule-asset-depr',
    event: 'ASSET_DEPRECIATION_POSTED',
    name: 'Monthly Fixed Asset Straight-Line Depreciation',
    version: 1,
    priority: 100,
    isActive: true,
    description: 'Debit Depreciation Expense (#6090), Credit Accumulated Depreciation (#1590)',
    debitAccountSelector: '6090',
    creditAccountSelector: '1590',
    taxTreatment: 'exempt',
    currencyTreatment: 'base_only',
    reversalBehavior: 'standard_inversion',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// Baseline Project Types
export const INITIAL_PROJECT_TYPES: DbProjectType[] = [
  {
    id: 'pt-cust-impl',
    code: 'CUST_IMPL',
    name: 'Customer Implementation Project',
    description: 'Commercial client software deployment and systems integration',
    category: 'customer',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pt-internal-rd',
    code: 'INTERNAL_RD',
    name: 'Internal R&D & Capital Software',
    description: 'Internal capital development and platform innovation',
    category: 'internal',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pt-construction',
    code: 'CONSTRUCTION',
    name: 'Civil Construction & Infrastructure',
    description: 'Physical building, MEP, and facility construction contracts',
    category: 'construction',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pt-consulting',
    code: 'CONSULTING',
    name: 'Management & Technology Consulting',
    description: 'Advisory, financial architecture, and professional services',
    category: 'consulting',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pt-service',
    code: 'MANAGED_SERVICE',
    name: 'Enterprise Managed SLA Service',
    description: 'Ongoing technical operations and infrastructure support',
    category: 'service',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// CLEAN BASELINE: 0 Initial Fake Journal Entries
export const INITIAL_JOURNAL_ENTRIES: DbJournalEntry[] = [];

// CLEAN BASELINE: 0 Initial Fake Journal Lines
export const INITIAL_JOURNAL_LINES: DbJournalLine[] = [];

// CLEAN BASELINE: 0 Initial Fake Audit Logs
export const INITIAL_AUDIT_LOGS: DbAuditLog[] = [];

/**
 * Builds default module entitlements based on company tier and master registry
 */
export function generateCompanyModuleEntitlements(companyId: string, tier: 'small' | 'medium' | 'enterprise'): DbCompanyModule[] {
  return ERP_MODULE_REGISTRY.map((mod) => ({
    id: `cm-${companyId.slice(0, 4)}-${mod.key}`,
    companyId,
    moduleKey: mod.key,
    isEnabled: mod.defaultEnabledTiers.includes(tier),
    enabledAt: '2026-01-01T00:00:00Z',
  }));
}
