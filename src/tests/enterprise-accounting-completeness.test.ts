// ============================================================================
// Enterprise Accounting Completeness & Missing Capability Audit Test Suite
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { AccrualsPrepaymentsService } from '../modules/accounting/services/accruals-prepayments.service';
import { AdvancedFinancialsService } from '../modules/accounting/services/advanced-financials.service';
import { ExpenseClaimsService } from '../modules/expenses/services/expense-claims.service';
import { GeneralLedgerService } from '../modules/accounting/services/general-ledger.service';
import { AccountingPostingService } from '../modules/accounting/services/accounting-posting.service';

describe('Enterprise Accounting Completeness Audit Suite', () => {
  let ctx: TenantContext;
  let accrualsService: AccrualsPrepaymentsService;
  let advancedFinService: AdvancedFinancialsService;
  let expenseService: ExpenseClaimsService;
  let glService: GeneralLedgerService;

  before(() => {
    ctx = {
      companyId: 'test-enterprise-corp',
      userId: 'cfo-user-1',
      userRole: 'finance_admin',
      baseCurrency: 'OMR',
    };

    accrualsService = AccrualsPrepaymentsService.getInstance();
    advancedFinService = AdvancedFinancialsService.getInstance();
    expenseService = ExpenseClaimsService.getInstance();
    glService = new GeneralLedgerService();

    // Setup base standard accounts if needed
    const ensureAccount = (payload: any) => {
      const existing = db.getAccounts(ctx).find((a) => a.code === payload.code);
      if (!existing) {
        return db.createAccount(payload, ctx);
      }
      return existing;
    };

    ensureAccount({ code: '1010', name: 'Operating Bank Account', type: 'bank', classification: 'asset', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '1015', name: 'USD Bank Account', type: 'bank', classification: 'asset', normalBalance: 'debit', currency: 'USD' });
    ensureAccount({ code: '1090', name: 'Bank Clearing Account', type: 'cash_clearing', classification: 'asset', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '1200', name: 'Accounts Receivable', type: 'accounts_receivable', classification: 'asset', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '1210', name: 'Allowance for Doubtful Accounts', type: 'allowance_doubtful_accounts', classification: 'asset', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '1410', name: 'Prepaid Expenses', type: 'prepaid_expenses', classification: 'asset', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '1420', name: 'Accrued Revenue Receivable', type: 'other_current_asset', classification: 'asset', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '2010', name: 'Accounts Payable', type: 'accounts_payable', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '2120', name: 'GRNI Clearing', type: 'grni_clearing', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '2130', name: 'Employee Payable', type: 'employee_payable', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '2210', name: 'Accrued Expenses Payable', type: 'accrued_expenses', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '2220', name: 'Payroll Clearing', type: 'payroll_clearing', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '2310', name: 'Deferred Revenue Liability', type: 'deferred_revenue', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '2410', name: 'Warranty Provision Liability', type: 'provision_liability', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '3010', name: 'Share Capital', type: 'share_capital', classification: 'equity', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '3200', name: 'Retained Earnings', type: 'retained_earnings', classification: 'equity', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '4000', name: 'Sales Revenue', type: 'revenue', classification: 'revenue', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '5000', name: 'Cost of Goods Sold', type: 'cost_of_sales', classification: 'expense', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '6100', name: 'Rent Expense', type: 'operating_expense', classification: 'expense', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '6200', name: 'Utilities Expense', type: 'operating_expense', classification: 'expense', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '6300', name: 'Software Subscription Expense', type: 'operating_expense', classification: 'expense', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '6400', name: 'Bad Debt Expense', type: 'bad_debt_expense', classification: 'expense', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '6500', name: 'Provision Expense', type: 'provision_expense', classification: 'expense', normalBalance: 'debit', currency: 'OMR' });
    ensureAccount({ code: '7100', name: 'Unrealized FX Gain/Loss', type: 'unrealized_fx_gain_loss', classification: 'revenue', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '7200', name: 'Bad Debt Recovery Income', type: 'other_income', classification: 'revenue', normalBalance: 'credit', currency: 'OMR' });
    ensureAccount({ code: '9999', name: 'General Suspense Account', type: 'suspense', classification: 'liability', normalBalance: 'credit', currency: 'OMR' });

    // Setup fiscal year
    let fy = db.getFiscalYears(ctx)[0];
    if (!fy) {
      fy = db.createFiscalYear({ name: 'FY-2026', startDate: '2026-01-01', endDate: '2026-12-31', status: 'open' }, ctx);
    }
    const ensurePeriod = (pName: string, start: string, end: string) => {
      const existing = db.getAccountingPeriods(ctx).find((p) => p.name === pName);
      if (!existing) {
        return db.createAccountingPeriod({ name: pName, fiscalYearId: fy.id, startDate: start, endDate: end, status: 'open' }, ctx);
      }
      return existing;
    };

    ensurePeriod('2026-01', '2026-01-01', '2026-01-31');
    ensurePeriod('2026-02', '2026-02-01', '2026-02-28');
    ensurePeriod('2026-06', '2026-06-01', '2026-06-30');
    ensurePeriod('2026-10', '2026-10-01', '2026-10-31');
    ensurePeriod('2026-11', '2026-11-01', '2026-11-30');
    ensurePeriod('2026-12', '2026-12-01', '2026-12-31');
    ensurePeriod('2027-01', '2027-01-01', '2027-01-31');
  });

  // ==========================================================================
  // 1. Operational Accruals & Auto-Reversals
  // ==========================================================================
  test('Capability 1: Operational Accruals & Auto-Reversals lifecycle', () => {
    const accounts = db.getAccounts(ctx);
    const expenseAcc = accounts.find((a) => a.code === '6200')!;
    const accruedLiabAcc = accounts.find((a) => a.code === '2210')!;

    // 1. Create accrual
    const accrual = accrualsService.createAccrual(
      {
        accrualNumber: 'ACC-2026-0001',
        title: 'Unbilled Electricity Utility Accrual Dec 2026',
        accrualType: 'expense',
        accrualDate: '2026-12-31',
        effectiveDate: '2026-12-31',
        autoReversalDate: '2027-01-01',
        currency: 'OMR',
        exchangeRate: '1.000000',
        amount: '450.0000',
        debitAccountId: expenseAcc.id,
        creditAccountId: accruedLiabAcc.id,
        description: 'Accrual for electricity consumed in Dec 2026',
        status: 'draft',
      },
      ctx
    );

    assert.equal(accrual.status, 'draft');

    // 2. Post Accrual
    const postedAccrual = accrualsService.postAccrual(accrual.id, ctx);
    assert.equal(postedAccrual.status, 'posted');
    assert.ok(postedAccrual.journalEntryId);

    const journal = db.getJournalEntry(postedAccrual.journalEntryId!, ctx)!;
    assert.equal(journal.totalDebit, '450.0000');
    assert.equal(journal.totalCredit, '450.0000');
    assert.equal(journal.lines.length, 2);

    // 3. Process Due Auto-Reversals as of 2027-01-01
    const reversedEntries = accrualsService.processDueAutoReversals('2027-01-01', ctx);
    assert.ok(reversedEntries.length >= 1);

    const updatedAccrual = db.getAccrualById(accrual.id, ctx)!;
    assert.equal(updatedAccrual.status, 'reversed');
    assert.ok(updatedAccrual.reversalJournalEntryId);

    const revJournal = db.getJournalEntry(updatedAccrual.reversalJournalEntryId!, ctx)!;
    assert.equal(revJournal.totalDebit, '450.0000');
    assert.equal(revJournal.totalCredit, '450.0000');
  });

  // ==========================================================================
  // 2. Prepayment Amortization Schedules
  // ==========================================================================
  test('Capability 2: Prepayment Amortization Schedules linear calculation & posting', () => {
    const accounts = db.getAccounts(ctx);
    const prepaidAssetAcc = accounts.find((a) => a.code === '1410')!;
    const rentExpenseAcc = accounts.find((a) => a.code === '6100')!;

    const schedule = accrualsService.createPrepaymentSchedule(
      {
        scheduleNumber: 'PREP-2026-0001',
        name: 'Annual Office Lease Prepaid 2026',
        prepaidAssetAccountId: prepaidAssetAcc.id,
        targetExpenseAccountId: rentExpenseAcc.id,
        totalAmount: '12000.0000',
        currency: 'OMR',
        startDate: '2026-01-01',
        totalPeriods: 12,
        frequency: 'monthly',
        status: 'active',
      },
      ctx
    );

    assert.equal(schedule.lines.length, 12);
    assert.equal(schedule.lines[0].amount, '1000.0000');
    assert.equal(schedule.remainingAmount, '12000.0000');

    // Post period 1 amortization
    const updatedSchedule = accrualsService.postPrepaymentAmortization(schedule.id, schedule.lines[0].id, ctx);
    assert.equal(updatedSchedule.recognizedAmount, '1000.0000');
    assert.equal(updatedSchedule.remainingAmount, '11000.0000');

    const journal = db.getJournalEntry(updatedSchedule.lines[0].journalEntryId!, ctx)!;
    assert.equal(journal.totalDebit, '1000.0000');
    assert.equal(journal.totalCredit, '1000.0000');
  });

  // ==========================================================================
  // 3. Deferred Revenue Recognition Schedules
  // ==========================================================================
  test('Capability 3: Deferred Revenue Recognition Schedules monthly recognition', () => {
    const accounts = db.getAccounts(ctx);
    const defRevLiabAcc = accounts.find((a) => a.code === '2310')!;
    const salesRevAcc = accounts.find((a) => a.code === '4000')!;

    const schedule = accrualsService.createDeferredRevenueSchedule(
      {
        scheduleNumber: 'DEF-2026-0001',
        name: 'Annual Enterprise SaaS Contract 2026',
        customerId: 'cust-100',
        deferredRevenueAccountId: defRevLiabAcc.id,
        targetRevenueAccountId: salesRevAcc.id,
        totalAmount: '24000.0000',
        currency: 'OMR',
        startDate: '2026-01-01',
        totalPeriods: 12,
        frequency: 'monthly',
        status: 'active',
      },
      ctx
    );

    assert.equal(schedule.lines.length, 12);
    assert.equal(schedule.lines[0].amount, '2000.0000');

    // Recognize period 1
    const updatedSchedule = accrualsService.postDeferredRevenueRecognition(schedule.id, schedule.lines[0].id, ctx);
    assert.equal(updatedSchedule.recognizedAmount, '2000.0000');
    assert.equal(updatedSchedule.remainingAmount, '22000.0000');

    const journal = db.getJournalEntry(updatedSchedule.lines[0].journalEntryId!, ctx)!;
    assert.equal(journal.totalDebit, '2000.0000');
    assert.equal(journal.totalCredit, '2000.0000');
  });

  // ==========================================================================
  // 4. Accounting Provisions Lifecycle (IAS 37)
  // ==========================================================================
  test('Capability 4: Accounting Provisions Lifecycle (IAS 37) recognition, utilization & reversal', () => {
    const accounts = db.getAccounts(ctx);
    const provExpAcc = accounts.find((a) => a.code === '6500')!;
    const provLiabAcc = accounts.find((a) => a.code === '2410')!;
    const bankAcc = accounts.find((a) => a.code === '1010')!;

    // 1. Create Provision
    const prov = accrualsService.createProvision(
      {
        provisionNumber: 'PROV-2026-0001',
        title: 'Product Warranty Liability Q4',
        provisionType: 'warranty',
        effectiveDate: '2026-10-01',
        originalAmount: '5000.0000',
        currency: 'OMR',
        expenseAccountId: provExpAcc.id,
        provisionAccountId: provLiabAcc.id,
        justification: 'Estimated 2% defect rate on hardware shipments',
      },
      ctx
    );

    assert.equal(prov.currentBalance, '5000.0000');
    const createJournal = db.getJournalEntry(prov.journalEntryId!, ctx)!;
    assert.equal(createJournal.totalDebit, '5000.0000');

    // 2. Utilize Provision ($1,200 warranty claims paid from bank)
    const utilProv = accrualsService.utilizeProvision(
      prov.id,
      '1200.0000',
      '2026-11-15',
      bankAcc.id,
      'Warranty repair parts settlement',
      ctx
    );

    assert.equal(utilProv.utilizedAmount, '1200.0000');
    assert.equal(utilProv.currentBalance, '3800.0000');

    // 3. Reverse Unused Provision ($3,800 back to P&L)
    const revProv = accrualsService.reverseProvision(
      prov.id,
      '2026-12-31',
      'Warranty period expired with no further claims',
      ctx
    );

    assert.equal(revProv.status, 'reversed');
    assert.equal(revProv.currentBalance, '0.0000');
  });

  // ==========================================================================
  // 5. Recurring Journals Engine
  // ==========================================================================
  test('Capability 5: Recurring Journals Engine template & generation', () => {
    const accounts = db.getAccounts(ctx);
    const subExpAcc = accounts.find((a) => a.code === '6300')!;
    const bankAcc = accounts.find((a) => a.code === '1010')!;

    const template = accrualsService.createRecurringTemplate(
      {
        templateCode: 'REC-CLOUD-01',
        templateName: 'Monthly Cloud Infrastructure Subscription',
        frequency: 'monthly',
        startDate: '2026-01-01',
        nextRunDate: '2026-01-01',
        currency: 'OMR',
        amount: '800.0000',
        lines: [
          { accountId: subExpAcc.id, debitAmount: '800.0000', creditAmount: '0.0000', description: 'Cloud compute services' },
          { accountId: bankAcc.id, debitAmount: '0.0000', creditAmount: '800.0000', description: 'Bank direct debit' },
        ],
      },
      ctx
    );

    assert.equal(template.amount, '800.0000');
    assert.equal(template.generatedCount, 0);

    // Execute next recurring journal
    const runRes = accrualsService.generateNextRecurringJournal(template.id, '2026-01-01', ctx);
    assert.equal(runRes.template.generatedCount, 1);
    assert.ok(runRes.journal.id);

    const journal = db.getJournalEntry(runRes.journal.id, ctx)!;
    assert.equal(journal.totalDebit, '800.0000');
    assert.equal(journal.totalCredit, '800.0000');
  });

  // ==========================================================================
  // 6. Period-End Unrealized FX Revaluation
  // ==========================================================================
  test('Capability 6: Period-End Unrealized FX Revaluation mark-to-market journal', () => {
    const accounts = db.getAccounts(ctx);
    const usdBankAcc = accounts.find((a) => a.code === '1015')!;

    // Initial deposit of $10,000 USD at book rate 0.3800 = 3,800 OMR
    db.createJournalEntry(
      {
        entryNumber: 'JE-USD-DEP',
        postingDate: '2026-01-05',
        periodId: '2026-01',
        fiscalYearId: 'fy-2026',
        sourceModule: 'banking',
        sourceDocumentType: 'deposit',
        memo: 'USD Capital Injection',
        status: 'posted',
        currency: 'USD',
        exchangeRate: '0.380000',
        totalDebit: '10000.0000',
        totalCredit: '10000.0000',
        lines: [
          { id: '1', accountId: usdBankAcc.id, debitAmount: '10000.0000', creditAmount: '0.0000', currency: 'USD', exchangeRate: '0.380000', baseDebit: '3800.0000', baseCredit: '0.0000', description: 'USD Bank' },
          { id: '2', accountId: accounts.find((a) => a.code === '3010')!.id, debitAmount: '0.0000', creditAmount: '10000.0000', currency: 'USD', exchangeRate: '0.380000', baseDebit: '0.0000', baseCredit: '3800.0000', description: 'Share Capital' },
        ],
      },
      ctx
    );

    // Current spot rate moved to 0.3850
    const calc = advancedFinService.calculateFxRevaluation('2026-01-31', [{ currency: 'USD', spotRate: '0.3850' }], ctx);
    assert.ok(calc.items.length >= 1);
    assert.ok(parseFloat(calc.totalUnrealizedGainLoss) !== 0);

    // Post Revaluation
    const postRes = advancedFinService.postFxRevaluation(
      { asOfDate: '2026-01-31', rates: [{ currency: 'USD', spotRate: '0.3850' }] },
      ctx
    );

    assert.equal(postRes.fxRevaluation.status, 'posted');
    assert.ok(postRes.journalEntryId);

    const journal = db.getJournalEntry(postRes.journalEntryId!, ctx)!;
    assert.ok(parseFloat(journal.totalDebit) > 0);
    assert.equal(journal.totalDebit, journal.totalCredit);
  });

  // ==========================================================================
  // 7. IFRS 9 ECL & Bad Debt Write-Off / Recovery
  // ==========================================================================
  test('Capability 7: IFRS 9 ECL calculation, write-off, and recovery', () => {
    const accounts = db.getAccounts(ctx);
    const bankAcc = accounts.find((a) => a.code === '1010')!;

    // 1. Post ECL Provision
    const eclPost = advancedFinService.postEclProvision({ asOfDate: '2026-01-31' }, ctx);
    assert.equal(eclPost.eclCalculation.status, 'posted');

    // 2. Submit and Approve Bad Debt Write-Off ($2,500 for bankrupt client)
    const writeOff = advancedFinService.submitBadDebtWriteOff(
      {
        customerId: 'cust-def-1',
        customerName: 'Defunct Logistics LLC',
        amount: '2500.0000',
        writeOffDate: '2026-02-15',
        reason: 'Company liquidation court order',
        writeOffType: 'allowance',
      },
      ctx
    );

    assert.equal(writeOff.status, 'submitted');

    const appRes = advancedFinService.approveAndPostBadDebtWriteOff(writeOff.id, ctx);
    assert.equal(appRes.writeOff.status, 'posted');
    const woJournal = db.getJournalEntry(appRes.journalEntryId, ctx)!;
    assert.equal(woJournal.totalDebit, '2500.0000');

    // 3. Record Debt Recovery ($1,000 received later)
    const recRes = advancedFinService.recordBadDebtRecovery(
      {
        writeOffId: writeOff.id,
        recoveryAmount: '1000.0000',
        recoveryDate: '2026-06-10',
        bankAccountId: bankAcc.id,
        notes: 'Dividend received from bankruptcy liquidator',
      },
      ctx
    );

    assert.equal(recRes.writeOff.recoveryAmount, '1000.0000');
    const recJournal = db.getJournalEntry(recRes.journalEntryId, ctx)!;
    assert.equal(recJournal.totalDebit, '1000.0000');
  });

  // ==========================================================================
  // 8. Employee Expense Claims Workflow
  // ==========================================================================
  test('Capability 8: Employee Expense Claims submit, approve, GL post & reimburse', () => {
    const accounts = db.getAccounts(ctx);
    const travelExpAcc = accounts.find((a) => a.code === '6100')!;
    const bankAcc = accounts.find((a) => a.code === '1010')!;

    // 1. Create Claim
    const claim = expenseService.createExpenseClaim(
      {
        employeeId: 'emp-007',
        employeeName: 'James Bond',
        claimDate: '2026-01-20',
        purpose: 'Client Onsite Implementation Travel',
        lines: [
          {
            category: 'travel',
            expenseAccountId: travelExpAcc.id,
            description: 'Hotel Accommodation & Meals',
            amount: '350.0000',
            taxRate: 5,
            taxAmount: '17.5000',
          },
        ],
      },
      ctx
    );

    assert.equal(claim.status, 'draft');
    assert.equal(claim.totalAmount, '367.5000');

    // 2. Submit & Approve
    expenseService.submitExpenseClaim(claim.id, ctx);
    expenseService.approveExpenseClaim(claim.id, ctx);

    // 3. Post to GL
    const postRes = expenseService.postExpenseClaimToGL(claim.id, ctx);
    assert.equal(postRes.claim.status, 'posted');

    const claimJournal = db.getJournalEntry(postRes.journalEntryId, ctx)!;
    assert.equal(claimJournal.totalDebit, '367.5000');
    assert.equal(claimJournal.totalCredit, '367.5000');

    // 4. Reimburse from Bank
    const reimbRes = expenseService.reimburseExpenseClaim(
      claim.id,
      {
        reimbursementDate: '2026-01-25',
        bankAccountId: bankAcc.id,
        referenceNumber: 'WIRE-88992',
      },
      ctx
    );

    assert.equal(reimbRes.claim.status, 'reimbursed');
    const reimbJournal = db.getJournalEntry(reimbRes.journalEntryId, ctx)!;
    assert.equal(reimbJournal.totalDebit, '367.5000');
    assert.equal(reimbJournal.totalCredit, '367.5000');
  });

  // ==========================================================================
  // 9. Year-End Closing Workflow & Nominal Accounts Close
  // ==========================================================================
  test('Capability 9: Year-End Closing Workflow & Nominal Accounts Close to Retained Earnings', () => {
    const fiscalYears = db.getFiscalYears(ctx);
    const fy = fiscalYears[0];

    // Post sample revenue and expense transactions
    const accounts = db.getAccounts(ctx);
    const bankAcc = accounts.find((a) => a.code === '1010')!;
    const revAcc = accounts.find((a) => a.code === '4000')!;
    const expAcc = accounts.find((a) => a.code === '6100')!;

    AccountingPostingService.getInstance().post(
      'MANUAL_JOURNAL_POSTED',
      {
        branchId: 'br-main',
        sourceType: 'manual_journal',
        sourceId: 'JE-TEST-REV-1',
        documentNumber: 'JE-TEST-REV-1',
        documentDate: '2026-06-15',
        memo: 'Operating Sales Revenue',
        currency: 'OMR',
        amount: '50000.0000',
        customLines: [
          { accountId: bankAcc.id, debitAmount: '50000.0000', creditAmount: '0.0000', description: 'Cash receipt' },
          { accountId: revAcc.id, debitAmount: '0.0000', creditAmount: '50000.0000', description: 'Sales revenue' },
        ],
      },
      ctx
    );

    AccountingPostingService.getInstance().post(
      'MANUAL_JOURNAL_POSTED',
      {
        branchId: 'br-main',
        sourceType: 'manual_journal',
        sourceId: 'JE-TEST-EXP-1',
        documentNumber: 'JE-TEST-EXP-1',
        documentDate: '2026-06-20',
        memo: 'Annual Rent Expense',
        currency: 'OMR',
        amount: '12000.0000',
        customLines: [
          { accountId: expAcc.id, debitAmount: '12000.0000', creditAmount: '0.0000', description: 'Rent' },
          { accountId: bankAcc.id, debitAmount: '0.0000', creditAmount: '12000.0000', description: 'Payment' },
        ],
      },
      ctx
    );

    // Pre-Closing Summary
    const summary = advancedFinService.getYearEndPreClosingSummary(fy.id, ctx);
    assert.equal(summary.canClose, true);
    assert.ok(parseFloat(summary.totalRevenue) > 0);
    assert.ok(parseFloat(summary.totalExpense) > 0);

    // Execute Year-End Close
    const closeRes = advancedFinService.executeYearEndClose(fy.id, '2026-12-31', ctx);
    assert.equal(closeRes.yearEndClose.status, 'closed');
    assert.ok(closeRes.journalEntryId);

    const closeJournal = db.getJournalEntry(closeRes.journalEntryId!, ctx)!;
    assert.equal(closeJournal.sourceType, 'fiscal_year_close');
    assert.equal(closeJournal.status, 'posted');

    // Verify Fiscal Year status is closed
    const updatedFy = db.getFiscalYears(ctx).find((f) => f.id === fy.id)!;
    assert.equal(updatedFy.status, 'closed');
  });

  // ==========================================================================
  // 10. Suspense & Clearing Accounts Health Monitor
  // ==========================================================================
  test('Capability 10: Suspense & Clearing Accounts Health Monitor', () => {
    const summary = advancedFinService.getClearingAccountsSummary(ctx);
    assert.ok(summary.accounts.length > 0);
    assert.ok(summary.totalUnclearedBalance !== undefined);
  });

  // ==========================================================================
  // 11. Immutability & Double-Entry Integrity Verification
  // ==========================================================================
  test('Capability 11: Enterprise Double-Entry & Immutability Verification', () => {
    const allJournals = db.getJournalEntries(ctx);
    assert.ok(allJournals.length > 0);

    for (const j of allJournals) {
      const totalDeb = parseFloat(j.totalDebit);
      const totalCred = parseFloat(j.totalCredit);

      assert.ok(Math.abs(totalDeb - totalCred) < 0.0001, `Journal ${j.entryNumber} debits ${totalDeb} != credits ${totalCred}`);

      let linesDeb = 0;
      let linesCred = 0;
      for (const l of j.lines) {
        linesDeb += parseFloat(l.debitAmount || '0');
        linesCred += parseFloat(l.creditAmount || '0');
      }

      assert.ok(Math.abs(linesDeb - totalDeb) < 0.0001, `Journal ${j.entryNumber} line debits ${linesDeb} != total debit ${totalDeb}`);
      assert.ok(Math.abs(linesCred - totalCred) < 0.0001, `Journal ${j.entryNumber} line credits ${linesCred} != total credit ${totalCred}`);
    }
  });
});
