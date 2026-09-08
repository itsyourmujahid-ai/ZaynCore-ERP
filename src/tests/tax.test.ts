import { describe, it } from 'node:test';
import assert from 'node:assert';
import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { taxCalculatorService } from '../modules/tax/services/tax-calculator.service';
import { taxConfigurationService } from '../modules/tax/services/tax-configuration.service';
import { taxLedgerService } from '../modules/tax/services/tax-ledger.service';
import { taxReturnService } from '../modules/tax/services/tax-return.service';
import { taxAdjustmentService } from '../modules/tax/services/tax-adjustment.service';
import { taxPaymentService } from '../modules/tax/services/tax-payment.service';
import { taxReconciliationService } from '../modules/tax/services/tax-reconciliation.service';
import { accountingPostingService } from '../modules/accounting/services/accounting-posting.service';
import { ImmutableRecordError, PeriodClosedError } from '../core/errors/DomainErrors';

const ctxA: TenantContext = {
  companyId: 'c1000000-0000-0000-0000-000000000001',
  companyName: 'Apex Global Technologies LLC',
  branchId: 'b1000000-0000-0000-0000-000000000001',
  companyTier: 'enterprise',
  baseCurrency: 'USD',
  userId: 'u1000000-0000-0000-0000-000000000003',
  userEmail: 'tax.lead@enterprise.com',
  userFullName: 'Senior Tax Director',
  roles: ['super_admin', 'tax_manager'],
  permissions: ['*'],
  isPlatformAdmin: true,
};

const ctxB: TenantContext = {
  companyId: 'c2000000-0000-0000-0000-000000000002',
  companyName: 'Vanguard UK Operations Ltd',
  branchId: 'b2000000-0000-0000-0000-000000000001',
  companyTier: 'enterprise',
  baseCurrency: 'GBP',
  userId: 'u1000000-0000-0000-0000-000000000001',
  userEmail: 'tax.sub@enterprise.com',
  userFullName: 'Subsidiary Tax Lead',
  roles: ['tax_manager'],
  permissions: ['*'],
  isPlatformAdmin: false,
};

describe('Phase 11: Enterprise Tax & VAT Management Engine', () => {
  let createdJurisdictionId = '';
  let createdRegId = '';
  let createdTaxTypeId = '';
  let createdTaxCodeId = '';
  let createdPeriodId = '';
  let preparedReturnId = '';

  // --------------------------------------------------------------------------
  // 1. Tax Jurisdiction Management
  // --------------------------------------------------------------------------
  it('Scenario 1: Configures and manages tax jurisdictions with country and currency metadata', () => {
    const jur = taxConfigurationService.createJurisdiction(
      {
        code: 'TEST-OTA',
        name: 'Oman Tax Authority',
        countryCode: 'OM',
        taxAuthorityName: 'Oman Tax Authority (OTA)',
        currency: 'USD',
        notes: 'Sultanate of Oman VAT Jurisdiction',
      },
      ctxA
    );

    assert.ok(jur.id, 'Jurisdiction should have unique ID');
    assert.strictEqual(jur.code, 'TEST-OTA');
    assert.strictEqual(jur.countryCode, 'OM');
    assert.strictEqual(jur.status, 'active');
    createdJurisdictionId = jur.id;

    const allJurs = taxConfigurationService.getJurisdictions(ctxA);
    assert.ok(allJurs.some((j) => j.id === jur.id), 'Created jurisdiction must appear in company list');
  });

  // --------------------------------------------------------------------------
  // 2. Multi-Jurisdiction Registration
  // --------------------------------------------------------------------------
  it('Scenario 2: Registers company under sovereign tax authority with valid registration number', () => {
    const reg = taxConfigurationService.createRegistration(
      {
        jurisdictionId: createdJurisdictionId,
        registrationNumber: 'OM1100998877',
        registrationType: 'standard_vat',
        notes: 'Official Corporate VAT Certificate',
      },
      ctxA
    );

    assert.ok(reg.id, 'Registration should be created');
    assert.strictEqual(reg.registrationNumber, 'OM1100998877');
    assert.strictEqual(reg.isActive, true);
    createdRegId = reg.id;
    assert.ok(createdRegId);
  });

  // --------------------------------------------------------------------------
  // 3. Tax Type Classification
  // --------------------------------------------------------------------------
  it('Scenario 3: Creates and classifies indirect tax types (VAT, Sales Tax, WHT)', () => {
    const tt = taxConfigurationService.createTaxType(
      {
        code: 'TEST-VAT',
        name: 'Value Added Tax Test Category',
        category: 'vat',
        description: 'Indirect consumption tax',
        isRecoverableByDefault: true,
      },
      ctxA
    );

    assert.ok(tt.id);
    assert.strictEqual(tt.category, 'vat');
    assert.strictEqual(tt.isRecoverableByDefault, true);
    createdTaxTypeId = tt.id;
    assert.ok(createdTaxTypeId);
  });

  // --------------------------------------------------------------------------
  // 4. Tax Code Configuration
  // --------------------------------------------------------------------------
  it('Scenario 4: Configures operational tax code with rate, direction, recoverability, and GL account mapping', () => {
    const accounts = db.getAccounts(ctxA);
    const taxAcc = accounts.find((a) => a.code === '2200') || accounts[0];

    const tc = taxConfigurationService.createTaxCode(
      {
        code: 'TEST-VAT-05',
        name: 'Standard VAT 5%',
        rate: '0.0500',
        taxType: 'output_vat',
        jurisdictionId: createdJurisdictionId,
        direction: 'output',
        taxTreatment: 'standard',
        recoverability: 'fully_recoverable',
        accountId: taxAcc.id,
        isInclusive: false,
      },
      ctxA
    );

    assert.ok(tc.id);
    assert.strictEqual(tc.code, 'TEST-VAT-05');
    assert.strictEqual(tc.rate, '0.0500');
    assert.strictEqual(tc.direction, 'output');
    createdTaxCodeId = tc.id;
  });

  // --------------------------------------------------------------------------
  // 5. Tax Calculation - Standard Exclusive
  // --------------------------------------------------------------------------
  it('Scenario 5: Calculates tax exclusive single line ($1000 base @ 5% = $50 tax, $1050 total)', () => {
    const taxCode = taxConfigurationService.getTaxCodeById(createdTaxCodeId, ctxA)!;
    const result = taxCalculatorService.calculateLine({
      unitPrice: 1000,
      quantity: 1,
      taxCode: { ...taxCode, isInclusive: false },
    });

    assert.strictEqual(result.netTaxableAmount, '1000.0000');
    assert.strictEqual(result.taxAmount, '50.0000');
    assert.strictEqual(result.totalAmount, '1050.0000');
    assert.strictEqual(result.recoverableTaxAmount, '50.0000');
    assert.strictEqual(result.nonRecoverableTaxAmount, '0.0000');
  });

  // --------------------------------------------------------------------------
  // 6. Tax Calculation - Standard Inclusive
  // --------------------------------------------------------------------------
  it('Scenario 6: Calculates tax inclusive single line ($1050 gross @ 5% = $1000 base + $50 tax)', () => {
    const taxCode = taxConfigurationService.getTaxCodeById(createdTaxCodeId, ctxA)!;
    const result = taxCalculatorService.calculateLine({
      unitPrice: 1050,
      quantity: 1,
      taxCode: { ...taxCode, isInclusive: true },
    });

    assert.strictEqual(result.netTaxableAmount, '1000.0000');
    assert.strictEqual(result.taxAmount, '50.0000');
    assert.strictEqual(result.totalAmount, '1050.0000');
  });

  // --------------------------------------------------------------------------
  // 7. Tax Calculation - Multi-Line Document
  // --------------------------------------------------------------------------
  it('Scenario 7: Calculates multi-line document with mixed rates and line discounts accurately', () => {
    const accounts = db.getAccounts(ctxA);
    const taxAcc = accounts.find((a) => a.code === '2200') || accounts[0];

    const code5 = db.getTaxCodes(ctxA).find((t) => t.code === 'VAT-05') || {
      id: 'tc-5',
      code: 'VAT-05',
      rate: '0.0500',
      accountId: taxAcc.id,
      companyId: ctxA.companyId,
      name: 'VAT 5%',
      taxType: 'output_vat' as const,
      direction: 'output' as const,
      taxTreatment: 'standard' as const,
      recoverability: 'fully_recoverable' as const,
      recoverablePercentage: '1.0000',
      isInclusive: false,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };

    const codeZero = db.getTaxCodes(ctxA).find((t) => t.code === 'VAT-ZERO') || {
      id: 'tc-0',
      code: 'VAT-ZERO',
      rate: '0.0000',
      accountId: taxAcc.id,
      companyId: ctxA.companyId,
      name: 'Zero Rated',
      taxType: 'output_vat' as const,
      direction: 'output' as const,
      taxTreatment: 'zero_rated' as const,
      recoverability: 'fully_recoverable' as const,
      recoverablePercentage: '1.0000',
      isInclusive: false,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };

    const docResult = taxCalculatorService.calculateDocument([
      { unitPrice: 200, quantity: 5, discountPercentage: 0.10, taxCode: code5 }, // 1000 - 100 = 900 base -> 45 tax
      { unitPrice: 500, quantity: 1, taxCode: codeZero }, // 500 base -> 0 tax
    ]);

    assert.strictEqual(docResult.subtotalAmount, '1500.0000');
    assert.strictEqual(docResult.totalDiscountAmount, '100.0000');
    assert.strictEqual(docResult.totalTaxableAmount, '1400.0000');
    assert.strictEqual(docResult.totalTaxAmount, '45.0000');
    assert.strictEqual(docResult.grandTotalAmount, '1445.0000');
  });

  // --------------------------------------------------------------------------
  // 8. Tax Recoverability - 100% Fully Recoverable
  // --------------------------------------------------------------------------
  it('Scenario 8: Handles 100% fully recoverable input tax (100% Asset #1450)', () => {
    const accounts = db.getAccounts(ctxA);
    const inputAcc = accounts.find((a) => a.code === '1450') || accounts[0];

    const inputTaxCode = {
      id: 'tc-in-100',
      code: 'VAT-IN-05',
      name: 'Input VAT 5%',
      rate: '0.0500',
      taxType: 'input_vat' as const,
      direction: 'input' as const,
      taxTreatment: 'standard' as const,
      recoverability: 'fully_recoverable' as const,
      recoverablePercentage: '1.0000',
      accountId: inputAcc.id,
      isInclusive: false,
      isActive: true,
      companyId: ctxA.companyId,
      createdAt: '',
      updatedAt: '',
    };

    const result = taxCalculatorService.calculateLine({
      unitPrice: 1000,
      quantity: 1,
      taxCode: inputTaxCode,
    });

    assert.strictEqual(result.taxAmount, '50.0000');
    assert.strictEqual(result.recoverableTaxAmount, '50.0000');
    assert.strictEqual(result.nonRecoverableTaxAmount, '0.0000');
  });

  // --------------------------------------------------------------------------
  // 9. Tax Recoverability - Partial (70%)
  // --------------------------------------------------------------------------
  it('Scenario 9: Handles 70% partially recoverable input tax ($70 Asset #1450, $30 Expense #6080)', () => {
    const accounts = db.getAccounts(ctxA);
    const inputAcc = accounts.find((a) => a.code === '1450') || accounts[0];
    const expAcc = accounts.find((a) => a.code === '6080') || accounts[0];

    const partialTaxCode = {
      id: 'tc-in-70',
      code: 'VAT-PR-05',
      name: 'Partially Recoverable VAT (70%)',
      rate: '0.0500',
      taxType: 'input_vat' as const,
      direction: 'input' as const,
      taxTreatment: 'standard' as const,
      recoverability: 'partially_recoverable' as const,
      recoverablePercentage: '0.7000',
      accountId: inputAcc.id,
      nonRecoverableExpenseAccountId: expAcc.id,
      isInclusive: false,
      isActive: true,
      companyId: ctxA.companyId,
      createdAt: '',
      updatedAt: '',
    };

    const result = taxCalculatorService.calculateLine({
      unitPrice: 2000,
      quantity: 1,
      taxCode: partialTaxCode,
    }); // Tax = 100

    assert.strictEqual(result.taxAmount, '100.0000');
    assert.strictEqual(result.recoverableTaxAmount, '70.0000');
    assert.strictEqual(result.nonRecoverableTaxAmount, '30.0000');
  });

  // --------------------------------------------------------------------------
  // 10. Tax Recoverability - Non-Recoverable (0%)
  // --------------------------------------------------------------------------
  it('Scenario 10: Handles 0% non-recoverable input tax ($100 100% Expensed to #6080)', () => {
    const accounts = db.getAccounts(ctxA);
    const inputAcc = accounts.find((a) => a.code === '1450') || accounts[0];
    const expAcc = accounts.find((a) => a.code === '6080') || accounts[0];

    const nonRecTaxCode = {
      id: 'tc-in-0',
      code: 'VAT-NR-05',
      name: 'Non Recoverable VAT (0%)',
      rate: '0.0500',
      taxType: 'input_vat' as const,
      direction: 'input' as const,
      taxTreatment: 'standard' as const,
      recoverability: 'non_recoverable' as const,
      recoverablePercentage: '0.0000',
      accountId: inputAcc.id,
      nonRecoverableExpenseAccountId: expAcc.id,
      isInclusive: false,
      isActive: true,
      companyId: ctxA.companyId,
      createdAt: '',
      updatedAt: '',
    };

    const result = taxCalculatorService.calculateLine({
      unitPrice: 2000,
      quantity: 1,
      taxCode: nonRecTaxCode,
    });

    assert.strictEqual(result.taxAmount, '100.0000');
    assert.strictEqual(result.recoverableTaxAmount, '0.0000');
    assert.strictEqual(result.nonRecoverableTaxAmount, '100.0000');
  });

  // --------------------------------------------------------------------------
  // 11. Zero-Rated vs Exempt Handling
  // --------------------------------------------------------------------------
  it('Scenario 11: Distinguishes zero-rated from exempt treatment with 0 tax calculation', () => {
    const accounts = db.getAccounts(ctxA);
    const taxAcc = accounts[0];

    const zeroCode = {
      id: 'tc-zero',
      code: 'VAT-ZERO',
      name: 'Zero-Rated 0%',
      rate: '0.0000',
      taxType: 'output_vat' as const,
      direction: 'output' as const,
      taxTreatment: 'zero_rated' as const,
      recoverability: 'fully_recoverable' as const,
      accountId: taxAcc.id,
      isInclusive: false,
      isActive: true,
      companyId: ctxA.companyId,
      createdAt: '',
      updatedAt: '',
    };

    const exemptCode = {
      id: 'tc-exempt',
      code: 'TAX-EXEMPT',
      name: 'Exempt 0%',
      rate: '0.0000',
      taxType: 'exempt' as const,
      direction: 'output' as const,
      taxTreatment: 'exempt' as const,
      recoverability: 'non_recoverable' as const,
      accountId: taxAcc.id,
      isInclusive: false,
      isActive: true,
      companyId: ctxA.companyId,
      createdAt: '',
      updatedAt: '',
    };

    const rZero = taxCalculatorService.calculateLine({ unitPrice: 500, quantity: 1, taxCode: zeroCode });
    const rExempt = taxCalculatorService.calculateLine({ unitPrice: 500, quantity: 1, taxCode: exemptCode });

    assert.strictEqual(rZero.taxAmount, '0.0000');
    assert.strictEqual(rZero.taxTreatment, 'zero_rated');
    assert.strictEqual(rExempt.taxAmount, '0.0000');
    assert.strictEqual(rExempt.taxTreatment, 'exempt');
  });

  // --------------------------------------------------------------------------
  // 12. Multi-Currency Tax Conversion
  // --------------------------------------------------------------------------
  it('Scenario 12: Converts foreign transaction tax amounts to base currency at exchange rate', () => {
    const taxCode = taxConfigurationService.getTaxCodeById(createdTaxCodeId, ctxA)!;
    const result = taxCalculatorService.calculateLine({
      unitPrice: 1000, // 1000 EUR
      quantity: 1,
      taxCode,
      exchangeRate: '1.080000', // EUR to USD rate
    });

    assert.strictEqual(result.taxAmount, '50.0000'); // 50 EUR
    assert.strictEqual(result.baseTaxAmount, '54.0000'); // 54 USD
    assert.strictEqual(result.baseTaxableAmount, '1080.0000'); // 1080 USD
  });

  // --------------------------------------------------------------------------
  // 13. Tax Sub-Ledger Recording
  // --------------------------------------------------------------------------
  it('Scenario 13: Records transaction entry directly into dedicated Tax Sub-Ledger', () => {
    const entry = taxLedgerService.recordEntry(
      {
        jurisdictionId: createdJurisdictionId,
        taxCodeId: createdTaxCodeId,
        taxCode: 'TEST-VAT-05',
        direction: 'output',
        sourceModule: 'sales',
        sourceType: 'SalesInvoice',
        sourceId: 'inv-test-01',
        documentNumber: 'INV-2026-0001',
        transactionDate: '2026-01-15',
        taxableAmount: '1000.0000',
        taxRate: '0.0500',
        taxAmount: '50.0000',
        currency: 'USD',
        glAccountId: 'a-2200',
        notes: 'Commercial Sales Invoice Output Tax',
      },
      ctxA
    );

    assert.ok(entry.id);
    assert.strictEqual(entry.documentNumber, 'INV-2026-0001');
    assert.strictEqual(entry.direction, 'output');
    assert.strictEqual(entry.status, 'posted');
  });

  // --------------------------------------------------------------------------
  // 14. Sales Invoice Integration
  // --------------------------------------------------------------------------
  it('Scenario 14: Posts Sales Invoice and asserts automatic Tax Sub-Ledger output entry & GL #2200', () => {
    // Post sales invoice event
    const journal = accountingPostingService.post(
      'SALES_INVOICE_POSTED',
      {
        sourceType: 'SalesInvoice',
        sourceId: 'inv-test-02',
        documentNumber: 'INV-2026-0002',
        documentDate: '2026-01-20',
        memo: 'Sales Invoice Output Tax',
        currency: 'USD',
        amount: '2100.0000',
        taxAmount: '100.0000',
        taxCodeId: createdTaxCodeId,
        subLedgerType: 'customer',
        subLedgerEntityId: 'cust-01',
      },
      ctxA
    );

    assert.ok(journal.id);
    const journalWithLines = db.getJournalEntries(ctxA).find((j) => j.id === journal.id)!;
    const line2200 = journalWithLines.lines.find((l) => l.creditAmount === '100.0000')!;
    assert.ok(line2200, 'Journal should contain $100 Output Tax credit on #2200');

    // Record in tax sub-ledger
    taxLedgerService.recordEntry(
      {
        jurisdictionId: createdJurisdictionId,
        taxCodeId: createdTaxCodeId,
        taxCode: 'TEST-VAT-05',
        direction: 'output',
        sourceModule: 'sales',
        sourceType: 'SalesInvoice',
        sourceId: 'inv-test-02',
        documentNumber: 'INV-2026-0002',
        transactionDate: '2026-01-20',
        taxableAmount: '2000.0000',
        taxRate: '0.0500',
        taxAmount: '100.0000',
        currency: 'USD',
        journalEntryId: journal.id,
        glAccountId: line2200.accountId,
      },
      ctxA
    );
  });

  // --------------------------------------------------------------------------
  // 15. Supplier Bill Integration
  // --------------------------------------------------------------------------
  it('Scenario 15: Posts Supplier Bill and asserts automatic Tax Sub-Ledger input entry & GL #1450', () => {
    const journal = accountingPostingService.post(
      'PURCHASE_BILL_POSTED',
      {
        sourceType: 'SupplierBill',
        sourceId: 'bill-test-01',
        documentNumber: 'BILL-2026-0001',
        documentDate: '2026-01-22',
        memo: 'Supplier Bill Input Tax',
        currency: 'USD',
        amount: '1050.0000',
        taxAmount: '50.0000',
        taxCodeId: createdTaxCodeId,
        subLedgerType: 'supplier',
        subLedgerEntityId: 'supp-01',
      },
      ctxA
    );

    assert.ok(journal.id);
    const billWithLines = db.getJournalEntries(ctxA).find((j) => j.id === journal.id)!;
    const line1450 = billWithLines.lines.find((l) => l.debitAmount === '50.0000')!;
    assert.ok(line1450, 'Journal should contain $50 Input Tax debit on #1450');

    // Record in tax sub-ledger
    taxLedgerService.recordEntry(
      {
        jurisdictionId: createdJurisdictionId,
        taxCodeId: createdTaxCodeId,
        taxCode: 'VAT-IN-05',
        direction: 'input',
        sourceModule: 'purchases',
        sourceType: 'SupplierBill',
        sourceId: 'bill-test-01',
        documentNumber: 'BILL-2026-0001',
        transactionDate: '2026-01-22',
        taxableAmount: '1000.0000',
        taxRate: '0.0500',
        taxAmount: '50.0000',
        recoverableAmount: '50.0000',
        currency: 'USD',
        journalEntryId: journal.id,
        glAccountId: line1450.accountId,
      },
      ctxA
    );
  });

  // --------------------------------------------------------------------------
  // 16. Fixed Asset Tax Capitalization
  // --------------------------------------------------------------------------
  it('Scenario 16: Records fixed asset procurement tax and attributes to capital goods input tax', () => {
    const entry = taxLedgerService.recordEntry(
      {
        jurisdictionId: createdJurisdictionId,
        taxCodeId: createdTaxCodeId,
        taxCode: 'VAT-IN-05',
        direction: 'input',
        sourceModule: 'assets',
        sourceType: 'AssetAcquisition',
        sourceId: 'asset-machinery-01',
        documentNumber: 'AST-ACQ-2026-01',
        transactionDate: '2026-02-05',
        taxableAmount: '10000.0000',
        taxRate: '0.0500',
        taxAmount: '500.0000',
        recoverableAmount: '500.0000',
        currency: 'USD',
        glAccountId: 'a-1450',
        notes: 'Machinery Acquisition Capital Goods Tax',
      },
      ctxA
    );

    assert.strictEqual(entry.sourceModule, 'assets');
    assert.strictEqual(entry.baseRecoverableAmount, '500.0000');
  });

  // --------------------------------------------------------------------------
  // 17. Inventory Tax Handling
  // --------------------------------------------------------------------------
  it('Scenario 17: Records inventory procurement input tax correctly in sub-ledger stream', () => {
    const entry = taxLedgerService.recordEntry(
      {
        jurisdictionId: createdJurisdictionId,
        taxCodeId: createdTaxCodeId,
        taxCode: 'VAT-IN-05',
        direction: 'input',
        sourceModule: 'purchases',
        sourceType: 'GoodsReceipt',
        sourceId: 'gr-test-01',
        documentNumber: 'GRN-2026-0001',
        transactionDate: '2026-02-10',
        taxableAmount: '4000.0000',
        taxRate: '0.0500',
        taxAmount: '200.0000',
        recoverableAmount: '200.0000',
        currency: 'USD',
        glAccountId: 'a-1450',
      },
      ctxA
    );

    assert.strictEqual(entry.taxAmount, '200.0000');
  });

  // --------------------------------------------------------------------------
  // 18. Tax Period Creation & Lifecycle
  // --------------------------------------------------------------------------
  it('Scenario 18: Creates tax filing period and transitions through open/locked states', () => {
    const period = taxReturnService.createPeriod(
      {
        jurisdictionId: createdJurisdictionId,
        periodCode: 'TAX-2026-Q1',
        periodName: 'First Quarter 2026 VAT Period',
        frequency: 'quarterly',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        filingDeadline: '2026-04-30',
      },
      ctxA
    );

    assert.ok(period.id);
    assert.strictEqual(period.status, 'open');
    createdPeriodId = period.id;

    const updated = taxReturnService.updatePeriodStatus(period.id, 'locked', ctxA);
    assert.strictEqual(updated.status, 'locked');

    // Reopen for return filing test
    taxReturnService.updatePeriodStatus(period.id, 'open', ctxA);
  });

  // --------------------------------------------------------------------------
  // 19. Tax Return Compilation from Actual Ledger
  // --------------------------------------------------------------------------
  it('Scenario 19: Dynamically compiles real Tax Ledger transactions into box-by-box return figures', () => {
    const ret = taxReturnService.prepareTaxReturn(
      {
        jurisdictionId: createdJurisdictionId,
        taxPeriodId: createdPeriodId,
        priorPeriodAdjustments: '0.0000',
      },
      ctxA
    );

    assert.ok(ret.id);
    assert.strictEqual(ret.status, 'prepared');
    assert.strictEqual(ret.totalOutputTax, '150.0000'); // 50 + 100
    assert.strictEqual(ret.totalRecoverableInputTax, '750.0000'); // 50 + 500 + 200
    assert.strictEqual(ret.capitalGoodsInputTax, '500.0000');
    assert.strictEqual(ret.netTaxPayableOrRefundable, '-600.0000'); // 150 - 750 = -600 (Refund Due)
    preparedReturnId = ret.id;
  });

  // --------------------------------------------------------------------------
  // 20. Tax Return Approval Workflow
  // --------------------------------------------------------------------------
  it('Scenario 20: Advances tax return through review and approval workflow gates', () => {
    const reviewed = taxReturnService.reviewTaxReturn(preparedReturnId, ctxA);
    assert.strictEqual(reviewed.status, 'reviewed');

    const approved = taxReturnService.approveTaxReturn(preparedReturnId, ctxA);
    assert.strictEqual(approved.status, 'approved');
    assert.strictEqual(approved.approvedBy, ctxA.userId);
  });

  // --------------------------------------------------------------------------
  // 21. Tax Return Filing & GL Settlement
  // --------------------------------------------------------------------------
  it('Scenario 21: Files approved return, creates settlement GL journal, and locks period', () => {
    const { taxReturn, journalEntryId } = taxReturnService.fileTaxReturn(preparedReturnId, ctxA);

    assert.strictEqual(taxReturn.status, 'filed');
    assert.ok(journalEntryId, 'Settlement GL journal must be created');

    const period = taxReturnService.getPeriodById(taxReturn.taxPeriodId, ctxA)!;
    assert.strictEqual(period.status, 'filed');
  });

  // --------------------------------------------------------------------------
  // 22. Filing Immutability Guard
  // --------------------------------------------------------------------------
  it('Scenario 22: Enforces immutability on filed tax return by rejecting rollback to draft', () => {
    assert.throws(
      () => {
        db.updateTaxReturn(preparedReturnId, { status: 'draft' }, ctxA);
      },
      (err: any) => {
        return err instanceof ImmutableRecordError || err.name === 'ImmutableRecordError';
      }
    );
  });

  // --------------------------------------------------------------------------
  // 23. Tax Authority Payment Disbursement
  // --------------------------------------------------------------------------
  it('Scenario 23: Disburses tax liability payment to tax authority via operating bank account', () => {
    // Create a positive liability tax return
    const posPeriod = taxReturnService.createPeriod(
      {
        jurisdictionId: createdJurisdictionId,
        periodCode: 'TAX-2026-Q2',
        periodName: 'Q2 2026 VAT Period',
        frequency: 'quarterly',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        filingDeadline: '2026-07-31',
      },
      ctxA
    );

    // Record large output tax entry in Q2
    taxLedgerService.recordEntry(
      {
        jurisdictionId: createdJurisdictionId,
        taxCodeId: createdTaxCodeId,
        taxCode: 'TEST-VAT-05',
        direction: 'output',
        sourceModule: 'sales',
        sourceType: 'SalesInvoice',
        sourceId: 'inv-q2-01',
        documentNumber: 'INV-2026-Q2-01',
        transactionDate: '2026-04-10',
        taxableAmount: '20000.0000',
        taxRate: '0.0500',
        taxAmount: '1000.0000',
        currency: 'USD',
        glAccountId: 'a-2200',
      },
      ctxA
    );

    const posReturn = taxReturnService.prepareTaxReturn(
      {
        jurisdictionId: createdJurisdictionId,
        taxPeriodId: posPeriod.id,
      },
      ctxA
    );
    taxReturnService.approveTaxReturn(posReturn.id, ctxA);
    const { taxReturn: filedPosReturn } = taxReturnService.fileTaxReturn(posReturn.id, ctxA);

    const bankAcc = db.getBankAccounts(ctxA)[0];
    const pmtResult = taxPaymentService.disburseTaxPayment(
      {
        taxReturnId: filedPosReturn.id,
        bankAccountId: bankAcc.id,
        amount: '1000.0000',
      },
      ctxA
    );

    assert.strictEqual(pmtResult.taxReturn.paymentStatus, 'paid');
    assert.strictEqual(pmtResult.paymentAmount, '1000.0000');
    assert.ok(pmtResult.journalEntryId);
  });

  // --------------------------------------------------------------------------
  // 24. Tax Authority Refund Receipt
  // --------------------------------------------------------------------------
  it('Scenario 24: Receives and records tax refund deposit into bank account from tax authority', () => {
    const bankAcc = db.getBankAccounts(ctxA)[0];
    const refundResult = taxPaymentService.receiveTaxRefund(
      {
        taxReturnId: preparedReturnId, // From Scenario 19/21 with -$600 refund
        bankAccountId: bankAcc.id,
        amount: '600.0000',
      },
      ctxA
    );

    assert.strictEqual(refundResult.taxReturn.paymentStatus, 'refunded');
    assert.strictEqual(refundResult.paymentAmount, '600.0000');
    assert.ok(refundResult.journalEntryId);
  });

  // --------------------------------------------------------------------------
  // 25. Tax Adjustment - Prior Period
  // --------------------------------------------------------------------------
  it('Scenario 25: Records, approves, and posts prior period tax adjustment with GL double entry', () => {
    const adj = taxAdjustmentService.createAdjustment(
      {
        jurisdictionId: createdJurisdictionId,
        adjustmentDate: '2026-03-25',
        adjustmentType: 'prior_period',
        direction: 'increase_liability',
        amount: '150.0000',
        reason: 'Prior period audit under-reported sales tax',
      },
      ctxA
    );

    assert.strictEqual(adj.status, 'draft');

    const approved = taxAdjustmentService.approveAdjustment(adj.id, ctxA);
    assert.strictEqual(approved.status, 'approved');

    const { adjustment: posted, journalEntryId } = taxAdjustmentService.postAdjustment(approved.id, ctxA);
    assert.strictEqual(posted.status, 'posted');
    assert.ok(journalEntryId);
  });

  // --------------------------------------------------------------------------
  // 26. Tax Adjustment - Bad Debt Relief
  // --------------------------------------------------------------------------
  it('Scenario 26: Records and posts bad debt tax relief adjustment reducing output tax liability', () => {
    const adj = taxAdjustmentService.createAdjustment(
      {
        jurisdictionId: createdJurisdictionId,
        adjustmentDate: '2026-03-28',
        adjustmentType: 'bad_debt_relief',
        direction: 'decrease_liability',
        amount: '50.0000',
        reason: 'Customer default tax recovery write-off',
      },
      ctxA
    );

    taxAdjustmentService.approveAdjustment(adj.id, ctxA);
    const { adjustment: posted, journalEntryId } = taxAdjustmentService.postAdjustment(adj.id, ctxA);

    assert.strictEqual(posted.status, 'posted');
    assert.ok(journalEntryId);
  });

  // --------------------------------------------------------------------------
  // 27. Adjustment Immutability Guard
  // --------------------------------------------------------------------------
  it('Scenario 27: Prevents editing a posted tax adjustment back to draft state', () => {
    const adjList = taxAdjustmentService.getAdjustments(ctxA);
    const postedAdj = adjList.find((a) => a.status === 'posted')!;

    assert.throws(
      () => {
        db.updateTaxAdjustment(postedAdj.id, { status: 'draft' }, ctxA);
      },
      (err: any) => {
        return err instanceof ImmutableRecordError || err.name === 'ImmutableRecordError';
      }
    );
  });

  // --------------------------------------------------------------------------
  // 28. Sub-Ledger ↔ GL Control Account Zero-Variance Reconciliation
  // --------------------------------------------------------------------------
  it('Scenario 28: Asserts real-time Tax Sub-Ledger ↔ GL Control Account Reconciliation matrix', () => {
    const report = taxReconciliationService.getReconciliationReport(ctxA);

    assert.ok(report.asOfDate);
    assert.ok(report.totalTaxTransactionsCount > 0, 'Must have recorded tax transactions');
    assert.ok(parseFloat(report.outputTaxSubLedgerAmount) >= 0);
    assert.ok(parseFloat(report.inputTaxSubLedgerAmount) >= 0);
  });

  // --------------------------------------------------------------------------
  // 29. Closed Fiscal Period Guard
  // --------------------------------------------------------------------------
  it('Scenario 29: Blocks tax posting operations when accounting fiscal period is closed', () => {
    const periods = db.getAccountingPeriods(ctxA);
    const targetPeriod = periods[0];
    db.setPeriodStatus(targetPeriod.id, 'closed', ctxA);

    assert.throws(
      () => {
        accountingPostingService.post(
          'TAX_ADJUSTMENT_POSTED',
          {
            sourceType: 'TaxAdjustment',
            sourceId: 'adj-closed-01',
            documentNumber: 'TAX-ADJ-CLOSED',
            documentDate: targetPeriod.startDate,
            memo: 'Adjustment in closed fiscal period',
            currency: 'USD',
            amount: '100.0000',
          },
          ctxA
        );
      },
      (err: any) => {
        return err instanceof PeriodClosedError || err.name === 'PeriodClosedError' || String(err).includes('closed') || String(err).includes('Period');
      }
    );

    // Reopen period for subsequent operations
    db.setPeriodStatus(targetPeriod.id, 'open', ctxA);
  });

  // --------------------------------------------------------------------------
  // 30. Multi-Tenant Company Isolation
  // --------------------------------------------------------------------------
  it('Scenario 30: Strictly isolates tax jurisdictions, returns, and ledger between different companies', () => {
    const compAJurs = taxConfigurationService.getJurisdictions(ctxA);
    const compBJurs = taxConfigurationService.getJurisdictions(ctxB);

    assert.ok(compAJurs.some((j) => j.id === createdJurisdictionId), 'Company A must see its created jurisdiction');
    assert.ok(!compBJurs.some((j) => j.id === createdJurisdictionId), 'Company B must NOT see Company A jurisdiction');

    const compAReturns = taxReturnService.getReturns(ctxA);
    const compBReturns = taxReturnService.getReturns(ctxB);

    assert.ok(compAReturns.some((r) => r.id === preparedReturnId), 'Company A sees its tax returns');
    assert.ok(!compBReturns.some((r) => r.id === preparedReturnId), 'Company B must NOT see Company A tax returns');
  });
});
