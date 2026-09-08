// ============================================================================
// Automated Test Suite: Phase 6 — Procurement & Accounts Payable (AP)
// ============================================================================

import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { procurementService } from '../modules/procurement/services/procurement.service';
import { accountsPayableService } from '../modules/procurement/services/ap.service';
import { subLedgerService } from '../modules/accounting/services/sub-ledger.service';
import { generalLedgerService } from '../modules/accounting/services/general-ledger.service';
import { PeriodClosedError, ImmutableRecordError } from '../core/errors/DomainErrors';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${message}`);
  }
}

async function runProcurementAndAPTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 6 PROCUREMENT & ACCOUNTS PAYABLE (AP) TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 15;

  db.resetDatabase();
  db.seedTestFixtures('c1000000-0000-0000-0000-000000000001');
  db.seedTestFixtures('c2000000-0000-0000-0000-000000000002');

  const ctx: TenantContext = {
    companyId: 'c1000000-0000-0000-0000-000000000001',
    companyName: 'Apex Global Holdings',
    userId: 'u1000000-0000-0000-0000-000000000001',
    userEmail: 'admin@apex-global.com',
    userFullName: 'Platform Administrator',
    roles: ['admin', 'cfo'],
    permissions: ['*'],
    companyTier: 'enterprise',
    baseCurrency: 'USD',
    isPlatformAdmin: true,
  };

  const otherTenantCtx: TenantContext = {
    companyId: 'c2000000-0000-0000-0000-000000000002',
    companyName: 'Nexus Tech Systems',
    userId: 'u2000000-0000-0000-0000-000000000002',
    userEmail: 'finance@nexus-tech.com',
    userFullName: 'Nexus Finance Officer',
    roles: ['accountant'],
    permissions: ['*'],
    companyTier: 'medium',
    baseCurrency: 'EUR',
    isPlatformAdmin: false,
  };

  // --------------------------------------------------------------------------
  // Test 1: Supplier Master Registration & Code Uniqueness
  // --------------------------------------------------------------------------
  console.log('[Test 1] Supplier Master registration, uniqueness & tenant isolation...');
  const supCode = `SUP-TEST-${Date.now()}`;
  const supplier1 = procurementService.createSupplier({
    code: supCode,
    name: 'Industrial Tooling Co LLC',
    supplierType: 'local',
    countryCode: 'OM',
    currency: 'USD',
    paymentTermsDays: 30,
    creditLimit: '100000.0000',
    taxIdentifier: 'VAT-OM-998811',
    bankDetails: {
      bankName: 'Bank Muscat',
      accountNumber: '042100001234',
    },
    status: 'active',
  }, ctx);

  assert(supplier1.id.startsWith('sup-'), 'Supplier ID should be generated');
  assert(supplier1.code === supCode, 'Supplier code should match');

  // Verify unique supplier code per company
  let duplicateThrew = false;
  try {
    procurementService.createSupplier({
      code: supCode,
      name: 'Duplicate Tooling',
      supplierType: 'local',
      countryCode: 'OM',
      currency: 'USD',
      paymentTermsDays: 30,
      status: 'active',
    }, ctx);
  } catch (e: any) {
    duplicateThrew = true;
    assert(e.message.includes('already exists'), 'Duplicate code error expected');
  }
  assert(duplicateThrew, 'Duplicate supplier code should be blocked within company');

  // Verify tenant isolation: other company should not see this supplier
  const otherSuppliers = db.getSuppliers(otherTenantCtx);
  assert(!otherSuppliers.some((s) => s.id === supplier1.id), 'Supplier should not leak across tenants');

  console.log('✓ Test 1 passed: Supplier Master registration and tenant isolation verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 2: Purchase Request Lifecycle & Approval Workflow (No Premature GL)
  // --------------------------------------------------------------------------
  console.log('[Test 2] Purchase Request creation, submission, approval, and rejection...');
  const initialJournalsCount = db.getJournalEntries(ctx).length;

  const pr = procurementService.createPurchaseRequest({
    requestNumber: `PR-TEST-${Date.now()}`,
    requestDate: '2026-03-01',
    requiredDate: '2026-03-15',
    requesterId: ctx.userId,
    requesterName: 'Jane Buyer',
    priority: 'high',
    description: 'Critical facility hardware spares',
    status: 'draft',
    items: [
      {
        id: 'pr-item-1',
        description: 'High-Torque Pneumatic Valves',
        quantity: '4',
        estimatedUnitPrice: '500.0000',
        estimatedTotal: '2000.0000',
      },
    ],
    totalEstimatedCost: '2000.0000',
  }, ctx);

  assert(pr.status === 'draft', 'PR should start as draft');

  const submittedPR = procurementService.submitPurchaseRequest(pr.id, ctx);
  assert(submittedPR.status === 'submitted', 'PR status should transition to submitted');

  const approvedPR = procurementService.approvePurchaseRequest(pr.id, 'Approved by Operations Director', ctx);
  assert(approvedPR.status === 'approved', 'PR status should transition to approved');
  assert(approvedPR.approvedById === ctx.userId, 'Approver ID should be stamped');

  // Verify zero premature General Ledger journals generated
  const currentJournalsCount = db.getJournalEntries(ctx).length;
  assert(currentJournalsCount === initialJournalsCount, 'Purchase Requisitions must NOT create General Ledger entries');

  console.log('✓ Test 2 passed: Purchase Request workflow verified without premature GL postings.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 3: RFQ & Multi-Supplier Quotation Comparison Matrix
  // --------------------------------------------------------------------------
  console.log('[Test 3] RFQ creation, quote recording, comparison, and winner selection...');
  const sup2 = procurementService.createSupplier({
    code: `SUP-B-${Date.now()}`,
    name: 'Global Valve Technologies Ltd',
    supplierType: 'international',
    countryCode: 'OM',
    currency: 'USD',
    paymentTermsDays: 60,
    status: 'active',
  }, ctx);

  const rfq = procurementService.createRFQ({
    rfqNumber: `RFQ-TEST-${Date.now()}`,
    date: '2026-03-02',
    requiredDate: '2026-03-15',
    purchaseRequestId: approvedPR.id,
    buyerName: 'Jane Buyer',
    invitedSupplierIds: [supplier1.id, sup2.id],
    deadlineDate: '2026-03-05',
    status: 'draft',
    items: approvedPR.items,
  }, ctx);

  // Record Vendor 1 Quote
  const quote1 = procurementService.recordSupplierQuotation({
    rfqId: rfq.id,
    quotationNumber: `Q-V1-${Date.now()}`,
    supplierId: supplier1.id,
    quotationDate: '2026-03-03',
    validUntil: '2026-04-01',
    currency: 'USD',
    exchangeRate: '1.000000',
    paymentTermsDays: 30,
    deliveryLeadTimeDays: 7,
    subtotal: '2000.0000',
    taxAmount: '100.0000',
    freightCharges: '50.0000',
    otherCharges: '0.0000',
    total: '2150.0000',
    isSelected: false,
    items: [
      {
        id: 'qi-1',
        description: 'High-Torque Pneumatic Valves',
        quantity: '4',
        unitPrice: '500.0000',
        discountRate: '0',
        subtotal: '2000.0000',
        taxCodeId: 'tc-vat5',
        taxAmount: '100.0000',
        total: '2100.0000',
      },
    ],
  }, ctx);

  // Record Vendor 2 Quote
  const quote2 = procurementService.recordSupplierQuotation({
    rfqId: rfq.id,
    quotationNumber: `Q-V2-${Date.now()}`,
    supplierId: sup2.id,
    quotationDate: '2026-03-03',
    validUntil: '2026-04-01',
    currency: 'USD',
    exchangeRate: '1.000000',
    paymentTermsDays: 60,
    deliveryLeadTimeDays: 14,
    subtotal: '2200.0000',
    taxAmount: '110.0000',
    freightCharges: '0.0000',
    otherCharges: '0.0000',
    total: '2310.0000',
    isSelected: false,
    items: [
      {
        id: 'qi-2',
        description: 'High-Torque Pneumatic Valves',
        quantity: '4',
        unitPrice: '550.0000',
        discountRate: '0',
        subtotal: '2200.0000',
        taxCodeId: 'tc-vat5',
        taxAmount: '110.0000',
        total: '2310.0000',
      },
    ],
  }, ctx);

  // Award RFQ to Vendor 1 (shorter lead time and lower total)
  const awardedQuote = procurementService.selectWinningQuotation(
    rfq.id, 
    quote1.id, 
    'Lowest evaluated compliant bidder with 7-day lead time', 
    ctx
  );

  assert(awardedQuote.isSelected === true, 'Winning quote should be marked selected');
  const otherQuote = db.getSupplierQuotationById(quote2.id, ctx);
  assert(otherQuote?.isSelected === false, 'Unselected quote should remain unselected');

  console.log('✓ Test 3 passed: RFQ and multi-vendor comparison matrix verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 4: Purchase Order Creation & Approval
  // --------------------------------------------------------------------------
  console.log('[Test 4] Purchase Order creation from quotation and approval...');
  const po = procurementService.createPurchaseOrder({
    poNumber: `PO-TEST-${Date.now()}`,
    supplierId: supplier1.id,
    purchaseRequestId: approvedPR.id,
    rfqId: rfq.id,
    supplierQuotationId: awardedQuote.id,
    poDate: '2026-03-04',
    expectedDeliveryDate: '2026-03-11',
    currency: 'USD',
    exchangeRate: '1.000000',
    buyerName: 'Jane Buyer',
    paymentTermsDays: 30,
    subtotal: '2000.0000',
    discountTotal: '0.0000',
    taxTotal: '100.0000',
    freightTotal: '50.0000',
    total: '2150.0000',
    status: 'draft',
    items: [
      {
        id: 'poi-1',
        description: 'High-Torque Pneumatic Valves',
        quantity: '4',
        receivedQuantity: '0.0000',
        billedQuantity: '0.0000',
        unitPrice: '500.0000',
        discountRate: '0',
        subtotal: '2000.0000',
        taxCodeId: 'tc-vat5',
        taxAmount: '100.0000',
        total: '2100.0000',
      },
    ],
  }, ctx);

  assert(po.status === 'draft', 'PO should start in draft');
  const approvedPO = procurementService.approvePurchaseOrder(po.id, ctx);
  assert(approvedPO.status === 'approved', 'PO should transition to approved');

  console.log('✓ Test 4 passed: Purchase Order created and approved.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 5: Goods Receiving Foundation (Partial & Full Receiving)
  // --------------------------------------------------------------------------
  console.log('[Test 5] Goods receipt recording with partial & full receiving quantities...');
  // Receiving 2 of 4 valves (partial)
  const gr1 = procurementService.receiveGoods({
    receiptNumber: `GRN-01-${Date.now()}`,
    purchaseOrderId: approvedPO.id,
    supplierId: supplier1.id,
    receivingLocation: 'Central Receiving Dock',
    receiptDate: '2026-03-08',
    receivedBy: 'Warehouse Team A',
    items: [
      {
        poItemId: 'poi-1',
        description: 'High-Torque Pneumatic Valves',
        orderedQuantity: '4',
        receivedQuantity: '2',
        rejectedQuantity: '0',
        acceptedQuantity: '2',
      },
    ],
    status: 'received',
  }, ctx);

  assert(gr1.id.startsWith('gr-'), 'Goods receipt should be created');
  let poAfterGR1 = db.getPurchaseOrderById(approvedPO.id, ctx);
  assert(poAfterGR1?.status === 'partially_received', 'PO status should be partially_received');
  assert(parseFloat(poAfterGR1?.items[0]?.receivedQuantity || '0') === 2, 'PO received quantity should be 2');

  // Receiving remaining 2 valves (full)
  procurementService.receiveGoods({
    receiptNumber: `GRN-02-${Date.now()}`,
    purchaseOrderId: approvedPO.id,
    supplierId: supplier1.id,
    receivingLocation: 'Central Receiving Dock',
    receiptDate: '2026-03-09',
    receivedBy: 'Warehouse Team A',
    items: [
      {
        poItemId: 'poi-1',
        description: 'High-Torque Pneumatic Valves',
        orderedQuantity: '4',
        receivedQuantity: '2',
        rejectedQuantity: '0',
        acceptedQuantity: '2',
      },
    ],
    status: 'received',
  }, ctx);

  const poAfterGR2 = db.getPurchaseOrderById(approvedPO.id, ctx);
  assert(poAfterGR2?.status === 'fully_received', 'PO status should be fully_received');
  assert(parseFloat(poAfterGR2?.items[0]?.receivedQuantity || '0') === 4, 'PO received quantity should equal ordered quantity (4)');

  console.log('✓ Test 5 passed: Receiving foundation and PO quantity tracking verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 6: Supplier Bill & 3-Way Match Evaluation
  // --------------------------------------------------------------------------
  console.log('[Test 6] Supplier Bill creation & 3-Way Match evaluation (PO vs GR vs Bill)...');
  // Evaluate 3-Way Match within 5% tolerance
  const matchResult = procurementService.evaluate3WayMatch(
    [
      {
        poItemId: 'poi-1',
        quantity: '4',
        unitPrice: '500.0000',
        total: '2000.0000',
      },
    ],
    approvedPO.id,
    gr1.id,
    ctx
  );

  assert(matchResult.matchStatus === 'matched', '3-Way Match should be MATCHED for identical PO and Bill quantities');
  assert(matchResult.toleranceExceeded === false, 'Tolerance should not be exceeded');

  // Create Bill
  const bill = procurementService.createSupplierBill({
    billNumber: `BILL-TEST-${Date.now()}`,
    supplierId: supplier1.id,
    supplierInvoiceNumber: `VEND-INV-8899`,
    purchaseOrderId: approvedPO.id,
    goodsReceiptId: gr1.id,
    billDate: '2026-03-10',
    dueDate: '2026-04-09',
    currency: 'USD',
    exchangeRate: '1.000000',
    subtotal: '2000.0000',
    taxTotal: '100.0000',
    freightTotal: '0.0000',
    total: '2100.0000',
    amountPaid: '0.0000',
    balanceDue: '2100.0000',
    status: 'draft',
    matchStatus: matchResult.matchStatus,
    items: [
      {
        id: 'bi-1',
        poItemId: 'poi-1',
        description: 'High-Torque Pneumatic Valves',
        quantity: '4',
        unitPrice: '500.0000',
        subtotal: '2000.0000',
        taxCodeId: 'tc-vat5',
        taxAmount: '100.0000',
        total: '2100.0000',
      },
    ],
  }, ctx);

  assert(bill.matchStatus === 'matched', 'Bill match status should be recorded');
  assert(bill.status === 'draft', 'Bill should start in draft');

  console.log('✓ Test 6 passed: Supplier Bill and 3-Way Match evaluation verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 7: Automatic Accounting Posting on Supplier Bill
  // --------------------------------------------------------------------------
  console.log('[Test 7] Posting Supplier Bill to General Ledger (Dr COGS/Expense #5010, Dr Input VAT #1450, Cr AP #2010)...');
  const postedBill = procurementService.postSupplierBill(bill.id, ctx);
  assert(postedBill.status === 'posted', 'Bill status should update to posted');
  assert(!!postedBill.journalEntryId, 'Journal Entry ID should be stamped on posted bill');

  const journal = db.getJournalEntries(ctx).find((j) => j.id === postedBill.journalEntryId);
  assert(!!journal, 'Journal entry must exist in General Ledger');
  assert(journal?.status === 'posted', 'Journal entry must be posted');

  // Verify Debit Purchases/Expense (#5010) = $2,000.00
  const expLine = journal?.lines.find((l) => {
    const acc = db.getAccounts(ctx).find((a) => a.id === l.accountId);
    return acc?.code === '5010';
  });
  assert(!!expLine, 'Journal must contain debit to Cost of Sales / Purchases (#5010)');
  assert(parseFloat(expLine?.debitAmount || '0') === 2000, 'Purchases debit must equal net bill amount ($2,000.00)');

  // Verify Debit Input VAT Recoverable (#1450) = $100.00
  const vatLine = journal?.lines.find((l) => {
    const acc = db.getAccounts(ctx).find((a) => a.id === l.accountId);
    return acc?.code === '1450';
  });
  assert(!!vatLine, 'Journal must contain debit to Input VAT Recoverable (#1450)');
  assert(parseFloat(vatLine?.debitAmount || '0') === 100, 'Input VAT debit must equal $100.00');

  // Verify Credit Accounts Payable Control (#2010) = $2,100.00 with supplier sub-ledger tag
  const apLine = journal?.lines.find((l) => {
    const acc = db.getAccounts(ctx).find((a) => a.id === l.accountId);
    return acc?.code === '2010';
  });
  assert(!!apLine, 'Journal must contain credit to Accounts Payable Control (#2010)');
  assert(parseFloat(apLine?.creditAmount || '0') === 2100, 'AP credit must equal gross bill total ($2,100.00)');
  assert(apLine?.subLedgerType === 'supplier', 'AP line must tag subLedgerType as supplier');
  assert(apLine?.subLedgerEntityId === supplier1.id, 'AP line must tag subLedgerEntityId with supplier ID');

  console.log('✓ Test 7 passed: Automatic GL double-entry posting verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 8: Accounts Payable Sub-Ledger Reconciliation (Zero Variance)
  // --------------------------------------------------------------------------
  console.log('[Test 8] AP Sub-Ledger reconciliation against GL Account #2010...');
  const apRecon = subLedgerService.reconcileSubLedger('supplier', ctx);
  assert(apRecon.isReconciled === true, 'AP Sub-Ledger must reconcile with GL #2010');
  assert(parseFloat(apRecon.variance) === 0, 'Variance between AP sub-ledger and GL control account must be 0.0000');
  assert(parseFloat(apRecon.subLedgerTotalBalance) >= 2100, 'Sub-ledger balance must reflect posted bill');

  console.log('✓ Test 8 passed: AP Sub-Ledger perfectly reconciled with GL #2010 (0 variance).\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 9: Supplier Partial Payment & Bill Allocation
  // --------------------------------------------------------------------------
  console.log('[Test 9] Supplier partial payment disbursement and multi-bill allocation...');
  const partialPayment = accountsPayableService.postSupplierPaymentWithAllocation({
    supplierId: supplier1.id,
    paymentNumber: `SPAY-PARTIAL-${Date.now()}`,
    paymentDate: '2026-03-12',
    paymentMethod: 'bank_transfer',
    bankAccountId: db.getAccounts(ctx).find((a) => a.code === '1010')?.id || '',
    amount: '1000.0000',
    reference: 'WIRE-PART-01',
    allocations: [
      {
        billId: postedBill.id,
        billNumber: postedBill.billNumber,
        allocatedAmount: '1000.0000',
      },
    ],
  }, ctx);

  assert(partialPayment.status === 'posted', 'Payment status should be posted');

  // Verify bill balance was reduced
  const billAfterPartial = db.getSupplierBillById(postedBill.id, ctx);
  assert(parseFloat(billAfterPartial?.amountPaid || '0') === 1000, 'Bill amountPaid should be $1,000.00');
  assert(parseFloat(billAfterPartial?.balanceDue || '0') === 1100, 'Bill balanceDue should be $1,100.00');

  // Verify Payment GL Journal (Dr AP #2010 $1,000, Cr Bank #1010 $1,000)
  const pmtJournal = db.getJournalEntries(ctx).find((j) => j.id === partialPayment.journalEntryId);
  assert(!!pmtJournal, 'Payment must generate GL journal entry');

  const pmtApLine = pmtJournal?.lines.find((l) => {
    const acc = db.getAccounts(ctx).find((a) => a.id === l.accountId);
    return acc?.code === '2010';
  });
  assert(parseFloat(pmtApLine?.debitAmount || '0') === 1000, 'Payment must debit AP Control #2010 for $1,000.00');

  console.log('✓ Test 9 passed: Partial payment allocation and bill balance reduction verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 10: Supplier Final Payment & Full Settlement ($0.00 Balance)
  // --------------------------------------------------------------------------
  console.log('[Test 10] Full settlement of supplier bill to $0.00 balance...');
  const finalPayment = accountsPayableService.postSupplierPaymentWithAllocation({
    supplierId: supplier1.id,
    paymentNumber: `SPAY-FINAL-${Date.now()}`,
    paymentDate: '2026-03-15',
    paymentMethod: 'bank_transfer',
    bankAccountId: db.getAccounts(ctx).find((a) => a.code === '1010')?.id || '',
    amount: '1100.0000',
    reference: 'WIRE-FINAL-02',
    allocations: [
      {
        billId: postedBill.id,
        billNumber: postedBill.billNumber,
        allocatedAmount: '1100.0000',
      },
    ],
  }, ctx);

  assert(finalPayment.status === 'posted', 'Final payment should be posted');
  const billAfterFinal = db.getSupplierBillById(postedBill.id, ctx);
  assert(parseFloat(billAfterFinal?.amountPaid || '0') === 2100, 'Bill amountPaid should equal gross total ($2,100.00)');
  assert(parseFloat(billAfterFinal?.balanceDue || '0') === 0, 'Bill balanceDue must be exactly $0.00');

  console.log('✓ Test 10 passed: Full supplier bill settlement verified ($0.00 balance due).\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 11: Supplier Advance Prepayment (Unallocated Disbursement)
  // --------------------------------------------------------------------------
  console.log('[Test 11] Supplier advance payment recording unallocated advance...');
  const advancePayment = accountsPayableService.postSupplierPaymentWithAllocation({
    supplierId: supplier1.id,
    paymentNumber: `SPAY-ADV-${Date.now()}`,
    paymentDate: '2026-03-16',
    paymentMethod: 'bank_transfer',
    bankAccountId: db.getAccounts(ctx).find((a) => a.code === '1010')?.id || '',
    amount: '500.0000',
    reference: 'ADV-DEPOSIT-01',
    allocations: [], // No bill allocated
  }, ctx);

  assert(advancePayment.isAdvance === true, 'Payment with 0 allocations should be marked isAdvance: true');
  assert(parseFloat(advancePayment.unallocatedAmount) === 500, 'Unallocated advance amount should be $500.00');

  const creditSummary = accountsPayableService.getSupplierCreditSummary(supplier1.id, ctx);
  assert(parseFloat(creditSummary.unallocatedAdvances) >= 500, 'Credit summary must reflect supplier advances');

  console.log('✓ Test 11 passed: Supplier advance prepayment handling verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 12: Supplier Credit Note & Reversals
  // --------------------------------------------------------------------------
  console.log('[Test 12] Supplier Credit Note creation & GL posting...');
  // Create a second bill of $500
  const bill2 = procurementService.createSupplierBill({
    billNumber: `BILL-ADJ-${Date.now()}`,
    supplierId: supplier1.id,
    supplierInvoiceNumber: `VEND-INV-9900`,
    billDate: '2026-03-18',
    dueDate: '2026-04-18',
    currency: 'USD',
    exchangeRate: '1.000000',
    subtotal: '500.0000',
    taxTotal: '25.0000',
    freightTotal: '0.0000',
    total: '525.0000',
    amountPaid: '0.0000',
    balanceDue: '525.0000',
    status: 'draft',
    matchStatus: 'matched',
    items: [
      {
        id: 'bi-2',
        description: 'Spare Valves',
        quantity: '1',
        unitPrice: '500.0000',
        subtotal: '500.0000',
        taxCodeId: 'tc-vat5',
        taxAmount: '25.0000',
        total: '525.0000',
      },
    ],
  }, ctx);
  procurementService.postSupplierBill(bill2.id, ctx);

  // Issue Credit Note of $200 against bill2
  const cn = procurementService.createCreditNote({
    creditNoteNumber: `SCN-TEST-${Date.now()}`,
    supplierId: supplier1.id,
    billId: bill2.id,
    date: '2026-03-19',
    reason: 'Defective unit returned to vendor',
    subtotal: '200.0000',
    taxAmount: '10.0000',
    total: '210.0000',
    currency: 'USD',
    exchangeRate: '1.000000',
    items: [
      {
        description: 'Defective unit credit',
        quantity: '1',
        unitPrice: '200.0000',
        subtotal: '200.0000',
        taxAmount: '10.0000',
        total: '210.0000',
      },
    ],
  }, ctx);

  assert(cn.status === 'posted', 'Credit Note should be posted');
  const bill2AfterCN = db.getSupplierBillById(bill2.id, ctx);
  assert(parseFloat(bill2AfterCN?.balanceDue || '0') === 315, 'Bill balance due should decrease from $525.00 to $315.00');

  console.log('✓ Test 12 passed: Supplier Credit Note and bill adjustment verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 13: Accounting Period Lock Enforcement
  // --------------------------------------------------------------------------
  console.log('[Test 13] Period lock enforcement on closed accounting periods...');
  const lockedBill = procurementService.createSupplierBill({
    billNumber: `BILL-LOCKED-${Date.now()}`,
    supplierId: supplier1.id,
    supplierInvoiceNumber: `VEND-CLOSED-01`,
    billDate: '2025-01-15', // Past closed year 2025
    dueDate: '2025-02-15',
    currency: 'USD',
    exchangeRate: '1.000000',
    subtotal: '1000.0000',
    taxTotal: '0.0000',
    freightTotal: '0.0000',
    total: '1000.0000',
    amountPaid: '0.0000',
    balanceDue: '1000.0000',
    status: 'draft',
    matchStatus: 'matched',
    items: [
      {
        id: 'bi-locked',
        description: 'Past Period Invoice',
        quantity: '1',
        unitPrice: '1000.0000',
        subtotal: '1000.0000',
        taxAmount: '0.0000',
        total: '1000.0000',
      },
    ],
  }, ctx);

  let periodLockThrew = false;
  try {
    procurementService.postSupplierBill(lockedBill.id, ctx);
  } catch (e: any) {
    periodLockThrew = true;
    assert(e instanceof PeriodClosedError || e.message.includes('closed') || e.message.includes('period'), 'Should throw PeriodClosedError');
  }
  assert(periodLockThrew, 'Posting in closed fiscal period must be blocked by engine');

  console.log('✓ Test 13 passed: Period lock enforcement verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 14: Posted Document Immutability Guard
  // --------------------------------------------------------------------------
  console.log('[Test 14] Posted document immutability guard...');
  let immutabilityThrew = false;
  try {
    db.updateSupplierBill(postedBill.id, {
      total: '9999.0000',
      supplierInvoiceNumber: 'TAMPERED-INVOICE',
    }, ctx);
  } catch (e: any) {
    immutabilityThrew = true;
    assert(e instanceof ImmutableRecordError || e.message.includes('immutable'), 'Should throw ImmutableRecordError');
  }
  assert(immutabilityThrew, 'Direct modification of posted supplier bill must be blocked');

  console.log('✓ Test 14 passed: Posted document immutability verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 15: General Ledger Trial Balance Balance Invariance
  // --------------------------------------------------------------------------
  console.log('[Test 15] Full General Ledger Trial Balance balance invariance (Debit == Credit)...');
  const trialBalance = generalLedgerService.getTrialBalance(undefined, ctx);
  assert(trialBalance.isBalanced === true, 'General Ledger Trial Balance MUST remain strictly balanced');
  assert(
    parseFloat(trialBalance.totalClosingDebit) === parseFloat(trialBalance.totalClosingCredit),
    `Trial Balance closing debits (${trialBalance.totalClosingDebit}) must equal credits (${trialBalance.totalClosingCredit})`
  );

  const statement = accountsPayableService.getSupplierStatement(supplier1.id, undefined, ctx);
  assert(statement.lines.length >= 3, 'Supplier statement must show bills, payments, and credit note lines');

  console.log('✓ Test 15 passed: General Ledger Trial Balance balance invariance verified.\n');
  passedTests++;

  console.log('================================================================');
  console.log(`ALL ${passedTests}/${totalTests} PROCUREMENT & AP TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runProcurementAndAPTests().catch((err) => {
  console.error('\n❌ TEST SUITE RUNNER FAILED WITH ERROR:\n', err);
  process.exit(1);
});
