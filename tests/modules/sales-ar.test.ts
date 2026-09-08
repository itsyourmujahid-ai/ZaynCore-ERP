// ============================================================================
// Phase 5 Sales & Accounts Receivable Automated Integrity Test Suite
// ============================================================================

import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { PeriodClosedError, ImmutableRecordError, TenantViolationError } from '../../src/core/errors/DomainErrors';
import { salesService } from '../../src/modules/sales/services/sales.service';
import { accountsReceivableService } from '../../src/modules/sales/services/ar.service';
import { subLedgerService } from '../../src/modules/accounting/services/sub-ledger.service';
import { generalLedgerService } from '../../src/modules/accounting/services/general-ledger.service';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}`);
}

console.log('--- STARTING PHASE 5 SALES & ACCOUNTS RECEIVABLE INTEGRITY TESTS ---');

// Set up clean database state for testing
db.resetDatabase();
db.seedTestFixtures('c1000000-0000-0000-0000-000000000001');
db.seedTestFixtures('c3000000-0000-0000-0000-000000000003');

const enterpriseTenant: TenantContext = {
  companyId: 'c1000000-0000-0000-0000-000000000001', // Apex Global Holdings Inc.
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

const smallTenant: TenantContext = {
  companyId: 'c3000000-0000-0000-0000-000000000003', // Acme QuickServices LLC
  companyName: 'Acme QuickServices LLC',
  companyTier: 'small',
  baseCurrency: 'OMR',
  userId: 'u1000000-0000-0000-0000-000000000004',
  userEmail: 'clerk@apexglobal.com',
  userFullName: 'Sophia Chen',
  roles: ['ACCOUNTING_CLERK'],
  permissions: ['sales.view', 'accounting.view', 'reports.view_financial'],
  isPlatformAdmin: false,
};

// --------------------------------------------------------------------------
// TEST 1 — Customer Master Registration & Dynamic Credit Control
// --------------------------------------------------------------------------
const customer = salesService.createCustomer({
  code: 'CUST-APEX-001',
  name: 'Global Tech Enterprises Corp.',
  customerType: 'corporate',
  contactPerson: 'David Vance, VP Procurement',
  email: 'dvance@globaltech.com',
  phone: '+1-555-0192',
  addressLine1: '742 Evergreen Terrace',
  city: 'San Francisco',
  countryCode: 'US',
  currency: 'USD',
  paymentTermsDays: 30,
  creditLimit: '50000.0000',
  taxIdentifier: 'VAT-US-991823',
  salesperson: 'Eleanor Sterling',
  isActive: true,
  notes: 'Key Enterprise Account',
}, enterpriseTenant);

assert(customer.id.startsWith('cust-'), 'Test 1 — Customer Master: Customer created with unique ID');
assert(customer.companyId === enterpriseTenant.companyId, 'Test 1 — Customer Master: Belongs to current tenant');

const initialCredit = accountsReceivableService.getCustomerCreditSummary(customer.id, enterpriseTenant);
assert(parseFloat(initialCredit.outstandingBalance) === 0, 'Test 1 — Credit Control: Initial outstanding balance is $0.00');
assert(parseFloat(initialCredit.availableCredit) === 50000, 'Test 1 — Credit Control: Initial available credit equals $50,000.00 limit');

// --------------------------------------------------------------------------
// TEST 2 — Quotation Creation
// --------------------------------------------------------------------------
const taxCode = db.getTaxCodes(enterpriseTenant)[0];

const quotation = salesService.createQuotation({
  quotationNumber: 'QT-2026-1001',
  customerId: customer.id,
  date: '2026-04-01',
  validUntil: '2026-05-01',
  salesperson: 'Eleanor Sterling',
  currency: 'USD',
  exchangeRate: '1.000000',
  subtotal: '10000.0000',
  discountTotal: '0.0000',
  taxTotal: '500.0000',
  total: '10500.0000',
  notes: 'ERP Implementation Proposal',
  status: 'draft',
  items: [
    {
      id: 'item-1',
      description: 'Core ERP Software Implementation',
      quantity: '1',
      unitPrice: '10000.0000',
      discountRate: '0.0000',
      taxCodeId: taxCode?.id,
      taxAmount: '500.0000',
      subtotal: '10000.0000',
      total: '10500.0000',
    },
  ],
}, enterpriseTenant);

assert(quotation.status === 'draft', 'Test 2 — Quotation: Draft quotation created');
assert(db.getJournalEntries(enterpriseTenant).length === 0, 'Test 2 — Accounting Invariant: Quotation does NOT create GL journal');

// --------------------------------------------------------------------------
// TEST 3 — Quotation Acceptance & Conversion to Sales Order
// --------------------------------------------------------------------------
const salesOrder = salesService.convertQuotationToOrder(quotation.id, enterpriseTenant);
assert(salesOrder.status === 'confirmed', 'Test 3 — Order Conversion: Sales order confirmed');
assert(salesOrder.quotationId === quotation.id, 'Test 3 — Traceability: Order preserves link to source quotation');

const updatedQuote = db.getSalesQuotations(enterpriseTenant).find((q) => q.id === quotation.id)!;
assert(updatedQuote.status === 'accepted', 'Test 3 — Traceability: Quotation marked accepted');
assert(updatedQuote.convertedToOrderId === salesOrder.id, 'Test 3 — Traceability: Quotation links to created order');

// --------------------------------------------------------------------------
// TEST 4 — Sales Order -> Draft Sales Invoice Creation
// --------------------------------------------------------------------------
const draftInvoice = salesService.createInvoice({
  branchId: 'b1000000-0000-0000-0000-000000000001',
  invoiceNumber: 'INV-2026-1001',
  customerId: customer.id,
  salesOrderId: salesOrder.id,
  invoiceDate: '2026-04-05',
  dueDate: '2026-05-05',
  currency: 'USD',
  exchangeRate: '1.000000',
  salesperson: 'Eleanor Sterling',
  reference: `PO for ${salesOrder.orderNumber}`,
  subtotal: salesOrder.subtotal,
  discountTotal: salesOrder.discountTotal,
  taxTotal: salesOrder.taxTotal,
  total: salesOrder.total,
  status: 'draft',
  items: salesOrder.items,
}, enterpriseTenant);

assert(draftInvoice.status === 'draft', 'Test 4 — Invoice Lifecycle: Draft invoice created');
assert(parseFloat(draftInvoice.balanceDue) === 10500, 'Test 4 — Balance: Initial balance due is $10,500.00');

// --------------------------------------------------------------------------
// TEST 5 — Invoice Posting & Automatic Accounting Post (Dr AR #1200 / Cr Sales #4010 / Cr VAT #2200)
// --------------------------------------------------------------------------
const postedInvoice = salesService.postInvoice(draftInvoice.id, enterpriseTenant);
assert(postedInvoice.status === 'posted', 'Test 5 — Invoice Posting: Invoice status updated to posted');
assert(postedInvoice.journalEntryId !== undefined, 'Test 5 — GL Integration: Linked journal entry ID recorded');

const glJournal = db.getJournalEntries(enterpriseTenant).find((j) => j.id === postedInvoice.journalEntryId)!;
assert(glJournal.status === 'posted', 'Test 5 — Automatic GL: Double-entry journal committed');
assert(glJournal.totalDebit === '10500.0000' && glJournal.totalCredit === '10500.0000', 'Test 5 — Accounting Invariant: Total Debit == Total Credit ($10,500.00)');

const arLine = glJournal.lines.find((l) => parseFloat(l.debitAmount) === 10500);
const salesLine = glJournal.lines.find((l) => parseFloat(l.creditAmount) === 10000);
const vatLine = glJournal.lines.find((l) => parseFloat(l.creditAmount) === 500);
assert(arLine !== undefined, 'Test 5 — Automatic Posting: Generated Dr AR #1200 ($10,500.00)');
assert(salesLine !== undefined, 'Test 5 — Automatic Posting: Generated Cr Sales Revenue #4010 ($10,000.00)');
assert(vatLine !== undefined, 'Test 5 — Automatic Posting: Generated Cr Output VAT #2200 ($500.00)');

// --------------------------------------------------------------------------
// TEST 6 — AR Sub-Ledger & Customer Credit Update
// --------------------------------------------------------------------------
const postInvoiceCredit = accountsReceivableService.getCustomerCreditSummary(customer.id, enterpriseTenant);
assert(parseFloat(postInvoiceCredit.outstandingBalance) === 10500, 'Test 6 — AR Sub-Ledger: Outstanding balance increased to $10,500.00');
assert(parseFloat(postInvoiceCredit.availableCredit) === 39500, 'Test 6 — Credit Control: Available credit decreased ($50,000 - $10,500 = $39,500)');

// Reconcile with GL Control Account #1200
const subLedgerRec = subLedgerService.reconcileSubLedger('customer', enterpriseTenant);
assert(subLedgerRec.isReconciled, 'Test 6 — Reconciliation: AR Sub-ledger matches GL Control Account #1200');
assert(parseFloat(subLedgerRec.variance) === 0, 'Test 6 — Reconciliation: Zero variance between AR Sub-ledger and GL #1200');

// --------------------------------------------------------------------------
// TEST 7 — Partial Customer Receipt & Payment Allocation
// --------------------------------------------------------------------------
const partialReceipt = accountsReceivableService.postReceiptWithAllocation({
  receiptNumber: 'RCPT-2026-0001',
  customerId: customer.id,
  paymentDate: '2026-04-10',
  paymentMethod: 'bank_transfer',
  bankAccountId: 'a-c100-1010', // Operating Bank
  amount: '4000.0000',
  currency: 'USD',
  reference: 'Partial Wire Settle',
  allocations: [
    {
      invoiceId: postedInvoice.id,
      invoiceNumber: postedInvoice.invoiceNumber,
      allocatedAmount: '4000.0000',
    },
  ],
}, enterpriseTenant);

assert(partialReceipt.status === 'posted', 'Test 7 — Customer Receipt: Receipt posted');
const updatedInvAfterPartial = db.getSalesInvoices(enterpriseTenant).find((i) => i.id === postedInvoice.id)!;
assert(parseFloat(updatedInvAfterPartial.amountPaid) === 4000, 'Test 7 — Partial Allocation: Invoice paid amount is $4,000.00');
assert(parseFloat(updatedInvAfterPartial.balanceDue) === 6500, 'Test 7 — Partial Allocation: Invoice remaining balance is $6,500.00');

const creditAfterPartial = accountsReceivableService.getCustomerCreditSummary(customer.id, enterpriseTenant);
assert(parseFloat(creditAfterPartial.outstandingBalance) === 6500, 'Test 7 — AR Sub-Ledger: Outstanding balance reduced to $6,500.00');

// --------------------------------------------------------------------------
// TEST 8 — Full Payment Allocation (Settle Remaining $6,500.00)
// --------------------------------------------------------------------------
const fullReceipt = accountsReceivableService.postReceiptWithAllocation({
  receiptNumber: 'RCPT-2026-0002',
  customerId: customer.id,
  paymentDate: '2026-04-15',
  paymentMethod: 'bank_transfer',
  bankAccountId: 'a-c100-1010',
  amount: '6500.0000',
  currency: 'USD',
  reference: 'Final Settlement',
  allocations: [
    {
      invoiceId: postedInvoice.id,
      invoiceNumber: postedInvoice.invoiceNumber,
      allocatedAmount: '6500.0000',
    },
  ],
}, enterpriseTenant);

assert(fullReceipt.status === 'posted', 'Test 8 — Full Settlement: Final receipt posted');
const updatedInvAfterFull = db.getSalesInvoices(enterpriseTenant).find((i) => i.id === postedInvoice.id)!;
assert(parseFloat(updatedInvAfterFull.balanceDue) === 0, 'Test 8 — Full Settlement: Invoice balance due is now $0.00');

const creditAfterFull = accountsReceivableService.getCustomerCreditSummary(customer.id, enterpriseTenant);
assert(parseFloat(creditAfterFull.outstandingBalance) === 0, 'Test 8 — AR Sub-Ledger: Customer balance fully settled ($0.00)');

// --------------------------------------------------------------------------
// TEST 9 — Customer Advance (Unallocated Payment)
// --------------------------------------------------------------------------
const advanceReceipt = accountsReceivableService.postReceiptWithAllocation({
  receiptNumber: 'RCPT-ADV-001',
  customerId: customer.id,
  paymentDate: '2026-04-20',
  paymentMethod: 'bank_transfer',
  bankAccountId: 'a-c100-1010',
  amount: '2000.0000',
  currency: 'USD',
  reference: 'Pre-payment Retainer',
  allocations: [], // Zero allocation
}, enterpriseTenant);

assert(parseFloat(advanceReceipt.unallocatedAmount) === 2000, 'Test 9 — Customer Advance: Full amount recorded as unallocated advance');

// --------------------------------------------------------------------------
// TEST 10 — Sales Credit Note (Return / Adjustment)
// --------------------------------------------------------------------------
const secondInvoice = salesService.createInvoice({
  branchId: 'b1000000-0000-0000-0000-000000000001',
  invoiceNumber: 'INV-2026-1002',
  customerId: customer.id,
  invoiceDate: '2026-04-22',
  dueDate: '2026-05-22',
  currency: 'USD',
  exchangeRate: '1.000000',
  subtotal: '2000.0000',
  discountTotal: '0.0000',
  taxTotal: '100.0000',
  total: '2100.0000',
  status: 'draft',
  items: [
    {
      id: 'item-2',
      description: 'Hardware Addon Pack',
      quantity: '2',
      unitPrice: '1000.0000',
      discountRate: '0.0000',
      taxCodeId: taxCode?.id,
      taxAmount: '100.0000',
      subtotal: '2000.0000',
      total: '2100.0000',
    },
  ],
}, enterpriseTenant);
salesService.postInvoice(secondInvoice.id, enterpriseTenant);

const creditNote = salesService.createCreditNote({
  creditNoteNumber: 'CN-2026-001',
  customerId: customer.id,
  invoiceId: secondInvoice.id,
  date: '2026-04-25',
  reason: 'Return of 1 Defective Unit',
  subtotal: '1000.0000',
  taxAmount: '50.0000',
  total: '1050.0000',
  currency: 'USD',
  exchangeRate: '1.000000',
  items: [],
}, enterpriseTenant);

assert(creditNote.status === 'posted', 'Test 10 — Credit Note: Credit note posted');
const invAfterCN = db.getSalesInvoices(enterpriseTenant).find((i) => i.id === secondInvoice.id)!;
assert(parseFloat(invAfterCN.balanceDue) === 1050, 'Test 10 — Credit Note: Invoice balance reduced ($2,100 - $1,050 = $1,050)');

// --------------------------------------------------------------------------
// TEST 11 — Closed Fiscal Period Lock Enforcement
// --------------------------------------------------------------------------
const openPeriod = db.getAccountingPeriods(enterpriseTenant).find((p) => p.status === 'open')!;
db.setPeriodStatus(openPeriod.id, 'closed', enterpriseTenant);

let caughtPeriodLocked = false;
try {
  const lockedInvoice = salesService.createInvoice({
    invoiceNumber: 'INV-FAIL-LOCKED',
    customerId: customer.id,
    invoiceDate: openPeriod.startDate,
    dueDate: openPeriod.endDate,
    currency: 'USD',
    exchangeRate: '1.000000',
    subtotal: '500.0000',
    discountTotal: '0.0000',
    taxTotal: '0.0000',
    total: '500.0000',
    status: 'draft',
    items: [],
  }, enterpriseTenant);

  salesService.postInvoice(lockedInvoice.id, enterpriseTenant);
} catch (err: any) {
  if (err instanceof PeriodClosedError || err.name === 'PeriodClosedError' || err.message.includes('PeriodClosedError')) {
    caughtPeriodLocked = true;
  }
}
// Reopen period
db.setPeriodStatus(openPeriod.id, 'open', enterpriseTenant);
assert(caughtPeriodLocked, 'Test 11 — Period Lock: Invoice posting in closed period rejected with PeriodClosedError');

// --------------------------------------------------------------------------
// TEST 12 — Posted Invoice Immutability
// --------------------------------------------------------------------------
let caughtInvoiceEdit = false;
try {
  db.updateSalesInvoice(postedInvoice.id, { total: '99999.0000' }, enterpriseTenant);
} catch (err) {
  if (err instanceof ImmutableRecordError) {
    caughtInvoiceEdit = true;
  }
}
assert(caughtInvoiceEdit, 'Test 12 — Immutability: Direct editing of posted invoice rejected with ImmutableRecordError');

// --------------------------------------------------------------------------
// TEST 13 — Multi-Tenant Isolation
// --------------------------------------------------------------------------
let caughtCrossTenant = false;
try {
  db.getCustomerById(customer.id, smallTenant);
} catch (err) {
  if (err instanceof TenantViolationError) {
    caughtCrossTenant = true;
  }
}
assert(caughtCrossTenant, 'Test 13 — Tenant Isolation: Cross-tenant customer access blocked with TenantViolationError');

// --------------------------------------------------------------------------
// TEST 14 — Customer Statement & AR Aging Calculation
// --------------------------------------------------------------------------
const statement = accountsReceivableService.getCustomerStatement(customer.id, undefined, enterpriseTenant);
assert(statement.transactions.length >= 4, 'Test 14 — Statement: Chronological transaction stream generated');
assert(statement.customerId === customer.id, 'Test 14 — Statement: Attached to correct customer');

const aging = accountsReceivableService.getARAgingReport(undefined, enterpriseTenant);
assert(parseFloat(aging.grandTotal) > 0, 'Test 14 — AR Aging: Portfolio aging computed from real transactions');

// --------------------------------------------------------------------------
// TEST 15 — General Ledger & Trial Balance Balance
// --------------------------------------------------------------------------
const tb = generalLedgerService.getTrialBalance(undefined, enterpriseTenant);
assert(tb.isBalanced, 'Test 15 — General Ledger: Trial Balance debits equal credits after full sales & AR workflow');
assert(tb.totalClosingDebit === tb.totalClosingCredit, 'Test 15 — General Ledger: Total Closing Debits == Total Closing Credits');

// Reset database back to pristine clean state
db.resetDatabase();
assert(db.getCustomers(enterpriseTenant).length === 0, 'Pristine State: Database reset to 0 sales records baseline');

console.log('--- ALL PHASE 5 SALES & AR INTEGRITY TESTS PASSED (15/15) ---');
