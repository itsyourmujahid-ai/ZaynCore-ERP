-- ============================================================================
-- ENTERPRISE ACCOUNTING ERP — STANDARD CHART OF ACCOUNTS SEED
-- ============================================================================

INSERT INTO chart_of_accounts (id, company_id, code, name, classification, normal_balance, is_active, is_reconciled)
VALUES
  -- 1000s: ASSETS
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1010', 'Operating Cash Account', 'asset', 'debit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1020', 'Payroll Bank Account', 'asset', 'debit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1050', 'Petty Cash Fund', 'asset', 'debit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1200', 'Accounts Receivable (Trade)', 'asset', 'debit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1300', 'Merchandise Inventory', 'asset', 'debit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1400', 'Prepaid Expenses', 'asset', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1450', 'Input VAT Receivable', 'asset', 'debit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1500', 'Property, Plant & Equipment', 'asset', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '1700', 'Accumulated Depreciation', 'asset', 'credit', true, false),

  -- 2000s: LIABILITIES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '2010', 'Accounts Payable (Trade)', 'liability', 'credit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '2050', 'Goods Received Not Invoiced (GRNI)', 'liability', 'credit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '2100', 'Accrued Payroll & Wages', 'liability', 'credit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '2110', 'Employee Payroll Withholding Payable', 'liability', 'credit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '2200', 'Output VAT Payable', 'liability', 'credit', true, true),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '2300', 'Customer Advances / Unearned Revenue', 'liability', 'credit', true, true),

  -- 3000s: EQUITY
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '3010', 'Share Capital', 'equity', 'credit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '3020', 'Retained Earnings', 'equity', 'credit', true, false),

  -- 4000s: REVENUE
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '4010', 'Sales Revenue', 'revenue', 'credit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '4020', 'Service & Consulting Revenue', 'revenue', 'credit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '4050', 'Sales Discounts & Returns', 'revenue', 'debit', true, false),

  -- 5000s: COST OF GOODS SOLD
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '5010', 'Cost of Goods Sold (COGS)', 'expense', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '5020', 'Inventory Shrinkage & Write-Off', 'expense', 'debit', true, false),

  -- 6000s: OPERATING EXPENSES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '6010', 'Salaries & Wages Expense', 'expense', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '6020', 'Employer Payroll Taxes & Benefits', 'expense', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '6030', 'Rent & Facilities Expense', 'expense', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '6040', 'Utilities & Internet Expense', 'expense', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '6050', 'Depreciation Expense', 'expense', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '6080', 'Non-Recoverable Tax Expense', 'expense', 'debit', true, false),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '6100', 'Bank Fees & Charges', 'expense', 'debit', true, false)
ON CONFLICT (company_id, code) DO NOTHING;
