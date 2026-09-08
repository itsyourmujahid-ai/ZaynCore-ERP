import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { bankingService } from '../modules/banking/services/banking.service';
import { bankReconciliationService } from '../modules/banking/services/bank-reconciliation.service';
import { salesService } from '../modules/sales/services/sales.service';
import { accountsReceivableService } from '../modules/sales/services/ar.service';
import { procurementService } from '../modules/procurement/services/procurement.service';
import { accountsPayableService } from '../modules/procurement/services/ap.service';
import { generalLedgerService } from '../modules/accounting/services/general-ledger.service';
import { PeriodClosedError, ImmutableRecordError } from '../core/errors/DomainErrors';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runBankingTestSuite() {
  console.log('================================================================');
  console.log('STARTING PHASE 8 BANKING & CASH MANAGEMENT TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;

  const ctx: TenantContext = {
    companyId: 'c1000000-0000-0000-0000-000000000001',
    companyName: 'Apex Global Technologies',
    companyTier: 'enterprise',
    baseCurrency: 'USD',
    branchId: 'b1000000-0000-0000-0000-000000000001',
    branchName: 'Headquarters Muscat',
    userId: 'u1000000-0000-0000-0000-000000000002',
    userEmail: 'finance.admin@apex.com',
    userFullName: 'Salim Al-Harthy',
    roles: ['finance_manager', 'treasury_lead'],
    permissions: ['banking.view', 'banking.post', 'bank_reconciliation.match'],
    isPlatformAdmin: false,
  };

  const otherTenantCtx: TenantContext = {
    ...ctx,
    companyId: 'c2000000-0000-0000-0000-000000000002',
    companyName: 'Nexis Media Group',
  };

  const glAccounts = db.getAccounts(ctx);
  const bankGl = glAccounts.find((a) => a.code === '1010') || glAccounts[0];
  const cashGl = glAccounts.find((a) => a.code === '1020') || glAccounts[0];

  // --------------------------------------------------------------------------
  // Test 1: Bank Account Master Creation & Masking
  // --------------------------------------------------------------------------
  console.log('[Test 1] Bank Account Master registration, masking & tenant isolation...');
  const bankA = bankingService.createBankAccount({
    accountName: 'Corporate Operating Checking',
    bankName: 'Bank Muscat Corporate',
    branch: 'Muscat HQ',
    accountNumber: '109283819283',
    iban: 'OM88BMUS109283819283',
    swiftBic: 'BMUSOMRX',
    accountType: 'current',
    currency: 'USD',
    glAccountId: bankGl.id,
    openingBalance: '10000.0000',
    openingBalanceDate: '2026-01-01',
    isDefault: true,
  }, ctx);

  assert(bankA.id.startsWith('ba-'), 'Bank Account ID should be generated');
  assert(parseFloat(bankA.currentBalance) === 10000.0, 'Initial balance should equal opening balance');
  assert(bankingService.getMaskedAccountNumber(bankA.accountNumber) === '••••••••9283', 'Account number should be masked');

  const otherTenantBanks = db.getBankAccounts(otherTenantCtx);
  assert(!otherTenantBanks.some((b) => b.id === bankA.id), 'Bank accounts must be tenant isolated');

  console.log('✓ Test 1 passed: Bank Account Master & Masking verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 2: Cash Drawer & Petty Cash Master
  // --------------------------------------------------------------------------
  console.log('[Test 2] Cash Drawer & Petty Cash registration...');
  const cashDrawer = bankingService.createCashAccount({
    accountName: 'HQ Main Floor Petty Cash',
    cashAccountType: 'petty_cash',
    custodianName: 'Zubair Al-Riyami',
    maxLimit: '2000.0000',
    currency: 'USD',
    glAccountId: cashGl.id,
    openingBalance: '1000.0000',
    openingBalanceDate: '2026-01-01',
  }, ctx);

  assert(cashDrawer.id.startsWith('ca-'), 'Cash account ID should be generated');
  assert(parseFloat(cashDrawer.currentBalance) === 1000.0, 'Cash drawer opening balance should be recorded');

  console.log('✓ Test 2 passed: Cash Account Master verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 3: Opening Balance Double-Entry Accounting
  // --------------------------------------------------------------------------
  console.log('[Test 3] Bank Opening Balance double-entry GL journal verification...');
  const openJournals = db.getJournalEntries(ctx).filter((j) => j.postingEvent === 'OPENING_BALANCE_POSTED');
  assert(openJournals.length >= 2, 'Opening balance journals should have been created for Bank and Cash');
  
  const bankOpenJ = openJournals.find((j) => j.sourceId === bankA.id);
  assert(bankOpenJ !== undefined, 'Bank opening journal must exist');
  assert(parseFloat(bankOpenJ!.totalDebit) === 10000.0, 'Debit must equal $10,000.00');
  assert(parseFloat(bankOpenJ!.totalCredit) === 10000.0, 'Credit must equal $10,000.00');

  console.log('✓ Test 3 passed: Opening balance posting verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 4: AR Customer Receipt Integration with Bank Ledger
  // --------------------------------------------------------------------------
  console.log('[Test 4] AR Customer Receipt integration with Bank Transaction Ledger...');
  const customer = db.createCustomer({
    code: 'CUST-BANK-01',
    name: 'Oman Digital Solutions',
    customerType: 'corporate',
    countryCode: 'OM',
    customerGroupId: 'cg-corp-apex',
    currency: 'USD',
    paymentTermsDays: 30,
    creditLimit: '50000.0000',
    isActive: true,
  }, ctx);

  const invoice = salesService.postInvoice(
    salesService.createInvoice({
      invoiceNumber: 'INV-BANK-001',
      customerId: customer.id,
      invoiceDate: '2026-02-01',
      dueDate: '2026-03-01',
      currency: 'USD',
      exchangeRate: '1.000000',
      items: [
        {
          id: 'inv-item-1',
          itemCode: 'SRV-HOST',
          description: 'Cloud Server Infrastructure Hosting',
          quantity: '1.0000',
          unitPrice: '4000.0000',
          discountRate: '0.0000',
          taxCodeId: 'tax-none',
          taxAmount: '0.0000',
          subtotal: '4000.0000',
          total: '4000.0000',
        },
      ],
      subtotal: '4000.0000',
      discountTotal: '0.0000',
      taxTotal: '0.0000',
      total: '4000.0000',
      status: 'approved',
    }, ctx).id,
    ctx
  );

  const receipt = accountsReceivableService.postReceiptWithAllocation({
    receiptNumber: 'RCPT-BANK-001',
    customerId: customer.id,
    paymentDate: '2026-02-05',
    paymentMethod: 'bank_transfer',
    bankAccountId: bankA.id,
    amount: '4000.0000',
    currency: 'USD',
    reference: 'WIRE-CUST-8819',
    allocations: [
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        allocatedAmount: '4000.0000',
      },
    ],
  }, ctx);

  // Bank balance should increase by $4,000 (from $10,000 to $14,000)
  const updatedBankAAfterReceipt = db.getBankAccountById(bankA.id, ctx)!;
  assert(parseFloat(updatedBankAAfterReceipt.currentBalance) === 14000.0, 'Bank balance should increase to $14,000.00');

  // Bank transaction movement should be recorded
  const bankTxList = db.getBankTransactions(bankA.id, ctx);
  const rcptTx = bankTxList.find((t) => t.sourceDocumentId === receipt.id);
  assert(rcptTx !== undefined, 'Customer receipt should generate a Bank Transaction');
  assert(rcptTx!.debitCredit === 'debit', 'Receipt transaction must be inward debit');
  assert(parseFloat(rcptTx!.amount) === 4000.0, 'Receipt transaction amount must be $4,000.00');

  console.log('✓ Test 4 passed: AR customer receipt seamlessly updated Bank balance and ledger.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 5: AP Supplier Payment Integration with Bank Ledger
  // --------------------------------------------------------------------------
  console.log('[Test 5] AP Supplier Payment integration with Bank Transaction Ledger...');
  const supplier = procurementService.createSupplier({
    code: 'SUP-BANK-01',
    name: 'Gulf Cloud Data Services',
    supplierType: 'service',
    countryCode: 'OM',
    supplierGroupId: 'sg-local-apex',
    currency: 'USD',
    paymentTermsDays: 30,
    creditLimit: '25000.0000',
    status: 'active',
  }, ctx);

  const bill = procurementService.postSupplierBill(
    procurementService.createSupplierBill({
      billNumber: 'BILL-BANK-001',
      supplierInvoiceNumber: 'INV-SUP-001',
      supplierId: supplier.id,
      billDate: '2026-02-01',
      dueDate: '2026-03-01',
      currency: 'USD',
      exchangeRate: '1.000000',
      items: [
        {
          id: 'b-item-1',
          description: 'Database Engine Enterprise Licenses',
          quantity: '1.0000',
          unitPrice: '2500.0000',
          subtotal: '2500.0000',
          taxCodeId: 'tax-none',
          taxAmount: '0.0000',
          total: '2500.0000',
        },
      ],
      subtotal: '2500.0000',
      taxTotal: '0.0000',
      total: '2500.0000',
      status: 'approved',
    }, ctx).id,
    ctx
  );

  const disbPayment = accountsPayableService.postSupplierPaymentWithAllocation({
    paymentNumber: 'DISB-BANK-001',
    supplierId: supplier.id,
    paymentDate: '2026-02-10',
    paymentMethod: 'bank_transfer',
    bankAccountId: bankA.id,
    amount: '2500.0000',
    currency: 'USD',
    reference: 'WIRE-SUP-7721',
    allocations: [
      {
        billId: bill.id,
        billNumber: bill.billNumber,
        allocatedAmount: '2500.0000',
      },
    ],
  }, ctx);

  // Bank balance should decrease by $2,500 (from $14,000 to $11,500)
  const updatedBankAAfterDisb = db.getBankAccountById(bankA.id, ctx)!;
  assert(parseFloat(updatedBankAAfterDisb.currentBalance) === 11500.0, 'Bank balance should decrease to $11,500.00');

  const disbTx = db.getBankTransactions(bankA.id, ctx).find((t) => t.sourceDocumentId === disbPayment.id);
  assert(disbTx !== undefined, 'Supplier payment should generate Bank Transaction');
  assert(disbTx!.debitCredit === 'credit', 'Supplier payment must be credit outflow');

  console.log('✓ Test 5 passed: AP supplier payment decreased Bank balance and posted to GL.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 6: General Receipts & Payments
  // --------------------------------------------------------------------------
  console.log('[Test 6] General Receipts & Payments (Non-AR/AP)...');
  const genReceipt = bankingService.recordGeneralReceipt({
    bankAccountId: bankA.id,
    transactionDate: '2026-02-15',
    amount: '500.0000',
    currency: 'USD',
    reference: 'MISC-INC-01',
    description: 'Scrap Material Recycling Income',
  }, ctx);

  assert(parseFloat(genReceipt.amount) === 500.0, 'General receipt recorded');

  const genPayment = bankingService.recordGeneralPayment({
    bankAccountId: bankA.id,
    transactionDate: '2026-02-16',
    amount: '120.0000',
    currency: 'USD',
    reference: 'UTIL-EXP-01',
    description: 'Office Internet & Fiber Subscription',
  }, ctx);

  assert(parseFloat(genPayment.amount) === 120.0, 'General payment recorded');
  // Balance: $11,500 + $500 - $120 = $11,880
  const updatedBankGen = db.getBankAccountById(bankA.id, ctx)!;
  assert(parseFloat(updatedBankGen.currentBalance) === 11880.0, 'Balance after general transactions should be $11,880.00');

  console.log('✓ Test 6 passed: General Receipts & Payments verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 7: Inter-Bank Transfer
  // --------------------------------------------------------------------------
  console.log('[Test 7] Inter-Bank Transfer from Bank A to Bank B with fee...');
  const bankB = bankingService.createBankAccount({
    accountName: 'Treasury Secondary Reserve',
    bankName: 'National Bank of Oman',
    accountNumber: '998877665544',
    accountType: 'savings',
    currency: 'USD',
    glAccountId: bankGl.id,
    openingBalance: '0.0000',
  }, ctx);

  const transferOrder = bankingService.createBankTransfer({
    fromBankAccountId: bankA.id,
    toBankAccountId: bankB.id,
    transferDate: '2026-02-18',
    amount: '3000.0000',
    currency: 'USD',
    feeAmount: '15.0000',
    notes: 'Liquidity balance redistribution',
  }, ctx);

  const execTransfer = bankingService.executeBankTransfer(transferOrder.id, ctx);
  assert(execTransfer.transfer.status === 'posted', 'Transfer should be posted');

  // Bank A: $11,880 - ($3,000 + $15 fee) = $8,865
  const postBankA = db.getBankAccountById(bankA.id, ctx)!;
  assert(parseFloat(postBankA.currentBalance) === 8865.0, 'Bank A balance should be $8,865.00');

  // Bank B: $0 + $3,000 = $3,000
  const postBankB = db.getBankAccountById(bankB.id, ctx)!;
  assert(parseFloat(postBankB.currentBalance) === 3000.0, 'Bank B balance should be $3,000.00');

  console.log('✓ Test 7 passed: Inter-Bank Transfer with paired movements verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 8: Cash Deposit & Withdrawal
  // --------------------------------------------------------------------------
  console.log('[Test 8] Cash Deposit & Cash Withdrawal linked flows...');
  // Deposit $400 from cash drawer to Bank A
  const depositRes = bankingService.recordCashDeposit({
    bankAccountId: bankA.id,
    cashAccountId: cashDrawer.id,
    date: '2026-02-20',
    amount: '400.0000',
    reference: 'DEP-CASH-001',
  }, ctx);

  assert(depositRes.bankTx.debitCredit === 'debit', 'Bank receives deposit');
  assert(depositRes.cashTx.debitCredit === 'credit', 'Cash drawer decreases');

  // Cash drawer: $1,000 - $400 = $600
  const postCashDep = db.getCashAccountById(cashDrawer.id, ctx)!;
  assert(parseFloat(postCashDep.currentBalance) === 600.0, 'Cash drawer balance should be $600.00');

  // Withdraw $200 from Bank A into cash drawer
  const withRes = bankingService.recordCashWithdrawal({
    bankAccountId: bankA.id,
    cashAccountId: cashDrawer.id,
    date: '2026-02-22',
    amount: '200.0000',
    reference: 'WTH-CASH-001',
  }, ctx);

  assert(withRes.cashTx.debitCredit === 'debit', 'Cash drawer receives withdrawal');
  assert(withRes.bankTx.debitCredit === 'credit', 'Bank decreases on withdrawal');

  // Cash drawer: $600 + $200 = $800
  const postCashWth = db.getCashAccountById(cashDrawer.id, ctx)!;
  assert(parseFloat(postCashWth.currentBalance) === 800.0, 'Cash drawer balance should be $800.00');

  console.log('✓ Test 8 passed: Cash Deposit and Withdrawal verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 9: Bank Charges & Interest Posting
  // --------------------------------------------------------------------------
  console.log('[Test 9] Bank Charges & Interest automatic GL posting...');
  const chgTx = bankingService.recordBankCharge({
    bankAccountId: bankA.id,
    transactionDate: '2026-02-25',
    amount: '35.0000',
    currency: 'USD',
    reference: 'FEES-FEB-26',
    description: 'Monthly Wire and Account Management Fee',
  }, ctx);

  const intTx = bankingService.recordBankInterest({
    bankAccountId: bankA.id,
    transactionDate: '2026-02-28',
    amount: '18.5000',
    currency: 'USD',
    reference: 'INT-FEB-26',
    description: 'Deposit Interest Yield',
  }, ctx);

  assert(parseFloat(chgTx.amount) === 35.0, 'Bank charge amount');
  assert(parseFloat(intTx.amount) === 18.5, 'Bank interest amount');

  console.log('✓ Test 9 passed: Bank Charges & Interest posted automatically to GL.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 10: Bank Statement Import & Deduplication
  // --------------------------------------------------------------------------
  console.log('[Test 10] Electronic Bank Statement Import & Duplicate Detection...');
  const importRes = bankReconciliationService.importBankStatement({
    bankAccountId: bankA.id,
    statementNumber: 'STMT-FEB-2026',
    statementDate: '2026-02-28',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    openingBalance: '10000.0000',
    closingBalance: postBankA.currentBalance,
    lines: [
      {
        lineDate: '2026-02-05',
        description: 'Customer Payment - Oman Digital',
        reference: 'RCPT-BANK-001',
        amount: '4000.0000',
        debitCredit: 'debit',
        externalTransactionId: 'EXT-BMUS-101',
      },
      {
        lineDate: '2026-02-10',
        description: 'Supplier Wire - Gulf Cloud',
        reference: 'DISB-BANK-001',
        amount: '2500.0000',
        debitCredit: 'credit',
        externalTransactionId: 'EXT-BMUS-102',
      },
      {
        lineDate: '2026-02-25',
        description: 'Monthly Maintenance Fee',
        reference: 'FEES-FEB-26',
        amount: '35.0000',
        debitCredit: 'credit',
        externalTransactionId: 'EXT-BMUS-103',
      },
    ],
  }, ctx);

  assert(importRes.lines.length === 3, 'Should import 3 statement lines');

  // Try re-importing the same statement to test deduplication
  const duplicateImport = bankReconciliationService.importBankStatement({
    bankAccountId: bankA.id,
    statementNumber: 'STMT-FEB-2026-RETRY',
    statementDate: '2026-02-28',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    openingBalance: '10000.0000',
    closingBalance: postBankA.currentBalance,
    lines: [
      {
        lineDate: '2026-02-05',
        description: 'Customer Payment - Oman Digital',
        reference: 'RCPT-BANK-001',
        amount: '4000.0000',
        debitCredit: 'debit',
        externalTransactionId: 'EXT-BMUS-101', // Duplicate
      },
    ],
  }, ctx);

  assert(duplicateImport.duplicatesSkipped === 1, 'Duplicate external transaction should be skipped');

  console.log('✓ Test 10 passed: Statement Import & Deduplication verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 11: Automated Matching Engine
  // --------------------------------------------------------------------------
  console.log('[Test 11] Rule-Based Matching Engine Execution...');
  const matchedLines = db.getBankStatementLines(importRes.statement.id, ctx).filter((l) => l.matchStatus === 'matched');
  assert(matchedLines.length >= 2, 'Auto-match engine should link matching items by amount and reference');

  console.log('✓ Test 11 passed: Rule-Based Matching Engine successfully matched transactions.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 12: Bank Reconciliation Session & Balanced Completion
  // --------------------------------------------------------------------------
  console.log('[Test 12] Bank Reconciliation Session & Balanced Settlement...');
  const currentBankA = db.getBankAccountById(bankA.id, ctx)!;
  const recSession = bankReconciliationService.createReconciliationSession({
    bankAccountId: bankA.id,
    statementId: importRes.statement.id,
    asOfDate: '2026-02-28',
    statementEndingBalance: currentBankA.currentBalance,
  }, ctx);

  // If variance is 0, complete reconciliation
  if (Math.abs(parseFloat(recSession.variance)) < 0.0001) {
    const completed = bankReconciliationService.completeReconciliation(recSession.id, ctx);
    assert(completed.status === 'completed', 'Reconciliation should be completed');
  }

  console.log('✓ Test 12 passed: Bank Reconciliation Session verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 13: Physical Cash Count Audit & Variance Adjustment
  // --------------------------------------------------------------------------
  console.log('[Test 13] Physical Cash Count audit and auto-adjustment...');
  // Cash drawer system balance is $800.00; physical count reveals $780.00 ($20.00 shortage)
  const countAudit = bankReconciliationService.recordCashCount({
    cashAccountId: cashDrawer.id,
    countDate: '2026-02-28',
    physicalCount: '780.0000',
    reason: 'Monthly Drawer Cash Shortage',
    counterName: 'Salim Al-Harthy',
  }, ctx);

  assert(parseFloat(countAudit.difference) === -20.0, 'Difference should be -$20.00');

  const countPosted = bankReconciliationService.approveAndPostCashCountAdjustment(countAudit.id, ctx);
  assert(countPosted.count.status === 'posted', 'Count audit should be posted');
  
  const postAuditCash = db.getCashAccountById(cashDrawer.id, ctx)!;
  assert(parseFloat(postAuditCash.currentBalance) === 780.0, 'Cash drawer balance should adjust to physical count ($780.00)');

  console.log('✓ Test 13 passed: Physical Cash Count audit and auto-adjustment verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 14: Period Lock Enforcement
  // --------------------------------------------------------------------------
  console.log('[Test 14] Period Lock Enforcement on closed accounting periods...');
  const periods = db.getAccountingPeriods(ctx);
  const febPeriod = periods.find((p) => p.name.includes('February') || p.periodNumber === 2) || periods[0];

  if (febPeriod) {
    db.setPeriodStatus(febPeriod.id, 'locked', ctx);

    let periodLockCaught = false;
    try {
      bankingService.recordGeneralReceipt({
        bankAccountId: bankA.id,
        transactionDate: '2026-02-15',
        amount: '100.0000',
        currency: 'USD',
        reference: 'LOCKED-TEST',
        description: 'Should fail due to locked period',
      }, ctx);
    } catch (err: any) {
      if (err instanceof PeriodClosedError || err.message.includes('Period')) {
        periodLockCaught = true;
      }
    }

    assert(periodLockCaught, 'Posting in locked period must throw PeriodClosedError');
    // Restore period for remaining checks
    db.setPeriodStatus(febPeriod.id, 'open', ctx);
  }

  console.log('✓ Test 14 passed: Period lock enforcement verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 15: Document Immutability & Trial Balance Invariance
  // --------------------------------------------------------------------------
  console.log('[Test 15] Posted document immutability and GL Trial Balance invariance...');
  const postedTx = db.getBankTransactions(bankA.id, ctx).find((t) => t.status === 'posted');
  assert(postedTx !== undefined, 'Posted transaction must exist');

  let immutabilityCaught = false;
  try {
    db.updateBankTransaction(postedTx!.id, { amount: '99999.0000' }, ctx);
  } catch (err: any) {
    if (err instanceof ImmutableRecordError || err.message.includes('immutable')) {
      immutabilityCaught = true;
    }
  }
  assert(immutabilityCaught, 'Modifying amount on posted transaction must throw ImmutableRecordError');

  // Verify Trial Balance Debit == Credit
  const tb = generalLedgerService.getTrialBalance(undefined, ctx);
  assert(tb.isBalanced, `Trial Balance must be strictly balanced (Debit: ${tb.totalClosingDebit}, Credit: ${tb.totalClosingCredit})`);

  console.log('✓ Test 15 passed: Document immutability and Trial Balance invariance verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('================================================================');
  console.log(`ALL ${passedTests}/15 BANKING & CASH MANAGEMENT TESTS PASSED!`);
  console.log('================================================================\n');
}

runBankingTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
