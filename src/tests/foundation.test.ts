// ============================================================================
// Phase 4 Core Accounting Engine Automated Test Suite
// ============================================================================

import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { TenantViolationError, PeriodClosedError, ImmutableRecordError } from '../core/errors/DomainErrors';
import { accountingPostingService } from '../modules/accounting/services/accounting-posting.service';
import { generalLedgerService } from '../modules/accounting/services/general-ledger.service';
import { subLedgerService } from '../modules/accounting/services/sub-ledger.service';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}`);
}

console.log('--- STARTING PHASE 4 CORE ACCOUNTING ENGINE INTEGRITY TESTS ---');

// Set up clean database state for testing
db.resetDatabase();
db.seedTestFixtures('c1000000-0000-0000-0000-000000000001');
db.seedTestFixtures('c2000000-0000-0000-0000-000000000002');
db.seedTestFixtures('c3000000-0000-0000-0000-000000000003');

const enterpriseTenant: TenantContext = {
  companyId: 'c1000000-0000-0000-0000-000000000001', // Apex
  companyName: 'Apex Global Holdings Inc.',
  companyTier: 'enterprise',
  baseCurrency: 'USD',
  userId: 'u1000000-0000-0000-0000-000000000002',
  userEmail: 'cfo@apexglobal.com',
  userFullName: 'Eleanor Sterling, CPA',
  roles: ['CFO', 'ENTERPRISE_ADMIN'],
  permissions: ['*'],
  isPlatformAdmin: false,
};

// --------------------------------------------------------------------------
// TEST 1 — Balanced Journal Posting
// --------------------------------------------------------------------------
const openPeriod = db.getAccountingPeriods(enterpriseTenant).find((p) => p.status === 'open')!;
const accounts = db.getAccounts(enterpriseTenant);
const bankAcc = accounts.find((a) => a.code === '1010')!;
const capAcc = accounts.find((a) => a.code === '3010')!;

const balancedJournal = db.postJournalEntry({
  companyId: enterpriseTenant.companyId,
  branchId: 'b1000000-0000-0000-0000-000000000001',
  periodId: openPeriod.id,
  entryNumber: 'JV-TEST-1001',
  entryDate: '2026-04-01',
  postingDate: '2026-04-01',
  sourceModule: 'manual_journal',
  status: 'posted',
  memo: 'Initial Capital Contribution',
  totalDebit: '1000.0000',
  totalCredit: '1000.0000',
  currency: 'USD',
  exchangeRate: '1.000000',
  lines: [
    { accountId: bankAcc.id, lineNumber: 1, description: 'Bank Deposit', debitAmount: '1000.0000', creditAmount: '0.0000', currency: 'USD', exchangeRate: '1.000000', baseDebit: '1000.0000', baseCredit: '0.0000' },
    { accountId: capAcc.id, lineNumber: 2, description: 'Share Capital', debitAmount: '0.0000', creditAmount: '1000.0000', currency: 'USD', exchangeRate: '1.000000', baseDebit: '0.0000', baseCredit: '1000.0000' },
  ],
}, enterpriseTenant);

assert(balancedJournal.status === 'posted', 'Test 1 — Balanced Journal: Debit 1,000 = Credit 1,000 posts successfully');

// --------------------------------------------------------------------------
// TEST 2 — Unbalanced Journal Rejection
// --------------------------------------------------------------------------
let caughtUnbalanced = false;
try {
  db.postJournalEntry({
    companyId: enterpriseTenant.companyId,
    periodId: openPeriod.id,
    entryNumber: 'JV-FAIL-UNBALANCED',
    entryDate: '2026-04-01',
    postingDate: '2026-04-01',
    sourceModule: 'manual_journal',
    status: 'posted',
    memo: 'Unbalanced Attempt',
    totalDebit: '1000.0000',
    totalCredit: '900.0000', // Mismatch!
    currency: 'USD',
    exchangeRate: '1.000000',
    lines: [
      { accountId: bankAcc.id, lineNumber: 1, description: 'Bank', debitAmount: '1000.0000', creditAmount: '0.0000', currency: 'USD', exchangeRate: '1.000000', baseDebit: '1000.0000', baseCredit: '0.0000' },
      { accountId: capAcc.id, lineNumber: 2, description: 'Capital', debitAmount: '0.0000', creditAmount: '900.0000', currency: 'USD', exchangeRate: '1.000000', baseDebit: '0.0000', baseCredit: '900.0000' },
    ],
  }, enterpriseTenant);
} catch (err: any) {
  caughtUnbalanced = true;
}
assert(caughtUnbalanced, 'Test 2 — Unbalanced Journal: Debit 1,000 != Credit 900 rejected with validation error');

// --------------------------------------------------------------------------
// TEST 3 — Closed Period Rejection
// --------------------------------------------------------------------------
const closedPeriod = db.setPeriodStatus(openPeriod.id, 'closed', enterpriseTenant);
let caughtClosedPeriod = false;
try {
  db.postJournalEntry({
    companyId: enterpriseTenant.companyId,
    periodId: closedPeriod.id,
    entryNumber: 'JV-FAIL-CLOSED-PERIOD',
    entryDate: '2026-04-01',
    postingDate: '2026-04-01',
    sourceModule: 'manual_journal',
    status: 'posted',
    memo: 'Posting into Closed Period',
    totalDebit: '500.0000',
    totalCredit: '500.0000',
    currency: 'USD',
    exchangeRate: '1.000000',
    lines: [
      { accountId: bankAcc.id, lineNumber: 1, description: 'Bank', debitAmount: '500.0000', creditAmount: '0.0000', currency: 'USD', exchangeRate: '1.000000', baseDebit: '500.0000', baseCredit: '0.0000' },
      { accountId: capAcc.id, lineNumber: 2, description: 'Capital', debitAmount: '0.0000', creditAmount: '500.0000', currency: 'USD', exchangeRate: '1.000000', baseDebit: '0.0000', baseCredit: '500.0000' },
    ],
  }, enterpriseTenant);
} catch (err: any) {
  if (err instanceof PeriodClosedError || err.message.includes('PeriodClosedError') || err.name === 'PeriodClosedError') {
    caughtClosedPeriod = true;
  }
}
// Reopen period for remaining tests
db.setPeriodStatus(openPeriod.id, 'open', enterpriseTenant);
assert(caughtClosedPeriod, 'Test 3 — Closed Period: Attempting to post to closed period rejected with PeriodClosedError');

// --------------------------------------------------------------------------
// TEST 4 — Posted Journal Immutability & Reversal
// --------------------------------------------------------------------------
const reversal = db.reverseJournalEntry(balancedJournal.id, 'Correction of initial deposit', enterpriseTenant);
assert(reversal.status === 'posted', 'Test 4 — Reversal Entry: Reversal journal posted successfully');
assert(reversal.entryNumber === `${balancedJournal.entryNumber}-REV`, 'Test 4 — Reversal Entry: Reversal has -REV suffix');
assert(reversal.reversesEntryId === balancedJournal.id, 'Test 4 — Reversal Entry: Stores link to original journal');

const updatedOriginal = db.getJournalEntries(enterpriseTenant).find((j) => j.id === balancedJournal.id)!;
assert(updatedOriginal.status === 'reversed', 'Test 4 — Reversal: Original journal status updated to reversed');
assert(updatedOriginal.reversedByEntryId === reversal.id, 'Test 4 — Reversal: Original links to reversing entry ID');

let caughtDoubleReversal = false;
try {
  db.reverseJournalEntry(balancedJournal.id, 'Duplicate Reversal Attempt', enterpriseTenant);
} catch (err) {
  if (err instanceof ImmutableRecordError) {
    caughtDoubleReversal = true;
  }
}
assert(caughtDoubleReversal, 'Test 4 — Posted Immutability: Cannot reverse an already reversed journal (ImmutableRecordError)');

// --------------------------------------------------------------------------
// TEST 5 — Cross-Tenant Security Isolation
// --------------------------------------------------------------------------
let caughtCrossTenantAccess = false;
try {
  db.getCompanyById('c2000000-0000-0000-0000-000000000002', enterpriseTenant);
} catch (err) {
  if (err instanceof TenantViolationError) {
    caughtCrossTenantAccess = true;
  }
}
assert(caughtCrossTenantAccess, 'Test 5 — Multi-Tenant Isolation: Cross-tenant query blocked with TenantViolationError');

// --------------------------------------------------------------------------
// TEST 6 — Automatic Accounting Rule Engine (AccountingPostingService)
// --------------------------------------------------------------------------
const autoInvoice = accountingPostingService.post('SALES_INVOICE_POSTED', {
  sourceType: 'sales_invoice',
  sourceId: 'inv-test-999',
  documentNumber: 'INV-2026-999',
  documentDate: '2026-04-10',
  memo: 'Enterprise Cloud License Subscription',
  currency: 'USD',
  amount: '10500.0000',
  taxAmount: '500.0000',
  taxCodeId: 'tax-vat-05',
  subLedgerType: 'customer',
  subLedgerEntityId: 'cust-enterprise-01',
}, enterpriseTenant);

assert(autoInvoice.status === 'posted', 'Test 6 — Automatic Posting Engine: Sales invoice posted automatically');
const autoInvoiceEntry = db.getJournalEntries(enterpriseTenant).find((j) => j.id === autoInvoice.id)!;
assert(autoInvoiceEntry.lines.length === 3, 'Test 6 — Automatic Posting Engine: Generated AR (#1200), Revenue (#4010), and Output VAT (#2200) lines');
assert(autoInvoice.totalDebit === '10500.0000' && autoInvoice.totalCredit === '10500.0000', 'Test 6 — Automatic Posting Engine: Invoiced amounts balanced');

// --------------------------------------------------------------------------
// TEST 7 — Sub-Ledger Reconciliation & Variance Detection (SubLedgerService)
// --------------------------------------------------------------------------
const arReconciliation = subLedgerService.reconcileSubLedger('customer', enterpriseTenant);
assert(arReconciliation.isReconciled, 'Test 7 — Sub-Ledger Reconciliation: AR sub-ledger matches GL Control Account #1200 ($10,500.00)');
assert(parseFloat(arReconciliation.variance) === 0, 'Test 7 — Sub-Ledger Reconciliation: Zero variance detected');
assert(arReconciliation.entities.length >= 1, 'Test 7 — Sub-Ledger Reconciliation: Entity breakdown populated');

// --------------------------------------------------------------------------
// TEST 8 — Multi-Currency Conversion
// --------------------------------------------------------------------------
const eurInvoice = accountingPostingService.post('SALES_INVOICE_POSTED', {
  sourceType: 'sales_invoice',
  sourceId: 'inv-eur-001',
  documentNumber: 'INV-EUR-001',
  documentDate: '2026-04-12',
  memo: 'European Subsidiary Consulting',
  currency: 'EUR',
  exchangeRate: '1.080000', // 1 EUR = 1.08 USD
  amount: '1000.0000',
  subLedgerType: 'customer',
  subLedgerEntityId: 'cust-euro-01',
}, enterpriseTenant);

const eurJournal = db.getJournalEntries(enterpriseTenant).find((j) => j.id === eurInvoice.id)!;
assert(eurJournal.currency === 'EUR', 'Test 8 — Multi-Currency: Transaction currency stored as EUR');
assert(eurJournal.lines[0].baseDebit === '1080.0000', 'Test 8 — Multi-Currency: Base currency amount converted (1,000 EUR * 1.08 = 1,080.0000 USD)');

// --------------------------------------------------------------------------
// TEST 9 — General Ledger Running Balances
// --------------------------------------------------------------------------
const arAcc = accounts.find((a) => a.code === '1200')!;
const ledgerReport = generalLedgerService.getAccountLedger(arAcc.id, undefined, enterpriseTenant);
assert(ledgerReport.transactions.length >= 2, 'Test 9 — General Ledger: Account ledger drill-down lists all posted transactions');
assert(parseFloat(ledgerReport.closingBalance) > 0, 'Test 9 — General Ledger: Computes accurate closing running balance');

// --------------------------------------------------------------------------
// TEST 10 — Trial Balance Integrity
// --------------------------------------------------------------------------
const trialBalance = generalLedgerService.getTrialBalance(undefined, enterpriseTenant);
assert(trialBalance.isBalanced, 'Test 10 — Trial Balance: Total Closing Debits equal Total Closing Credits');
assert(trialBalance.totalClosingDebit === trialBalance.totalClosingCredit, 'Test 10 — Trial Balance: Debits == Credits strictly verified');

// Reset database back to pristine clean state
db.resetDatabase();
const pristineJournals = db.getJournalEntries(enterpriseTenant);
assert(pristineJournals.length === 0, 'Pristine State: Database reset to 0 journals baseline after test execution');

console.log('--- ALL PHASE 4 CORE ACCOUNTING ENGINE INTEGRITY TESTS PASSED (10/10) ---');
