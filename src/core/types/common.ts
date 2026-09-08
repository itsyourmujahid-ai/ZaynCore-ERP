// ============================================================================
// Core Shared Type Definitions for Enterprise ERP
// ============================================================================

export type CompanyTier = 'small' | 'medium' | 'enterprise';

export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export type FiscalPeriodStatus = 'open' | 'soft_closed' | 'locked' | 'closed';

export type AccountType = 
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'cost_of_sales'
  | 'expense'
  | 'other_income'
  | 'other_expense';

// Backwards-compatible alias for existing references
export type AccountClassification = AccountType;

export type NormalBalance = 'debit' | 'credit';

export type JournalStatus = 
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'posted'
  | 'reversed'
  | 'cancelled';

export type SubLedgerType = 
  | 'customer'
  | 'supplier'
  | 'inventory_item'
  | 'bank_account'
  | 'fixed_asset'
  | 'employee'
  | 'tax_code'
  | 'tax_jurisdiction'
  | 'project'
  | 'cost_center'
  | 'department'
  | 'business_unit'
  | 'intercompany'
  | 'consolidation_entity';

export type TaxType = 'input_vat' | 'output_vat' | 'exempt';

export type PostingEvent =
  | 'SALES_INVOICE_POSTED'
  | 'SALES_PAYMENT_RECEIVED'
  | 'SALES_CREDIT_NOTE_POSTED'
  | 'SALES_DELIVERY_POSTED'
  | 'PURCHASE_BILL_POSTED'
  | 'PURCHASE_PAYMENT_DISBURSED'
  | 'PURCHASE_DEBIT_NOTE_POSTED'
  | 'GOODS_RECEIPT_POSTED'
  | 'GOODS_ISSUE_POSTED'
  | 'INVENTORY_RECEIPT_POSTED'
  | 'INVENTORY_ADJUSTMENT_POSTED'
  | 'SUPPLIER_RETURN_POSTED'
  | 'CUSTOMER_RETURN_POSTED'
  | 'BANK_TRANSFER_POSTED'
  | 'BANK_CHARGE_POSTED'
  | 'BANK_INTEREST_POSTED'
  | 'GENERAL_RECEIPT_POSTED'
  | 'GENERAL_PAYMENT_POSTED'
  | 'CASH_DEPOSIT_POSTED'
  | 'CASH_WITHDRAWAL_POSTED'
  | 'CASH_COUNT_ADJUSTMENT_POSTED'
  | 'PAYROLL_RUN_POSTED'
  | 'PAYROLL_PERIOD_POSTED'
  | 'SALARY_PAYMENT_DISBURSED'
  | 'EMPLOYEE_ADVANCE_DISBURSED'
  | 'EMPLOYEE_ADVANCE_RECOVERY_POSTED'
  | 'FINAL_SETTLEMENT_POSTED'
  | 'ASSET_ACQUISITION_POSTED'
  | 'ASSET_CAPITALIZATION_POSTED'
  | 'ASSET_DEPRECIATION_POSTED'
  | 'ASSET_IMPAIRMENT_POSTED'
  | 'ASSET_DISPOSAL_POSTED'
  | 'ASSET_WRITEOFF_POSTED'
  | 'TAX_RETURN_FILED'
  | 'TAX_PAYMENT_DISBURSED'
  | 'TAX_REFUND_RECEIVED'
  | 'TAX_ADJUSTMENT_POSTED'
  | 'PROJECT_BILLING_POSTED'
  | 'PROJECT_COST_ALLOCATED'
  | 'PROJECT_WIP_CAPITALIZED'
  | 'PROJECT_WIP_TRANSFER'
  | 'COST_ALLOCATION_POSTED'
  | 'MANAGEMENT_BUDGET_APPROVED'
  | 'INTERCOMPANY_TRANSACTION_POSTED'
  | 'CONSOLIDATION_ADJUSTMENT_POSTED'
  | 'MANUAL_JOURNAL_POSTED'
  | 'MANUAL_REVERSAL_POSTED'
  | 'OPENING_BALANCE_POSTED'
  | 'ACCRUAL_ENTRY_POSTED'
  | 'ACCRUAL_REVERSAL_POSTED'
  | 'PREPAYMENT_AMORTIZATION_POSTED'
  | 'DEFERRED_REVENUE_RECOGNIZED'
  | 'PROVISION_RECOGNIZED_POSTED'
  | 'PROVISION_ADJUSTMENT_POSTED'
  | 'PROVISION_UTILIZATION_POSTED'
  | 'PROVISION_REVERSAL_POSTED'
  | 'RECURRING_JOURNAL_POSTED'
  | 'YEAR_END_CLOSING_POSTED'
  | 'UNREALIZED_FX_REVALUATION_POSTED'
  | 'REALIZED_FX_GAIN_LOSS_POSTED'
  | 'ECL_PROVISION_POSTED'
  | 'BAD_DEBT_WRITEOFF_POSTED'
  | 'BAD_DEBT_RECOVERED_POSTED'
  | 'EMPLOYEE_EXPENSE_CLAIM_POSTED'
  | 'EMPLOYEE_EXPENSE_REIMBURSED';

/**
 * TenantContext is passed down or injected into every domain service,
 * repository query, and authorization evaluator to enforce multi-tenant isolation.
 */
export interface TenantContext {
  companyId: string;
  companyName: string;
  companyTier: CompanyTier;
  baseCurrency: string;
  branchId?: string;
  branchName?: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  roles: string[];
  permissions: string[];
  isPlatformAdmin: boolean;
}

/**
 * Financial Money representation using exact decimal string to prevent floating-point errors.
 */
export interface Money {
  amount: string; // e.g. "1250.5000"
  currency: string; // ISO-4217, e.g. "USD", "OMR", "EUR", "GBP"
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  searchQuery?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
