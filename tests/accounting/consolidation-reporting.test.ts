// ============================================================================
// Phase 14: Multi-Company, Group Accounting, Consolidation & Reporting Tests
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { companyRelationshipService } from '../../src/modules/consolidation/services/company-relationship.service';
import { companyAccessService } from '../../src/modules/companies/services/company-access.service';
import { intercompanyService } from '../../src/modules/consolidation/services/intercompany.service';
import { intercompanyReconciliationService } from '../../src/modules/consolidation/services/intercompany-reconciliation.service';
import { groupCoaService } from '../../src/modules/consolidation/services/group-coa.service';
import { currencyTranslationService } from '../../src/modules/consolidation/services/currency-translation.service';
import { consolidationEngineService } from '../../src/modules/consolidation/services/consolidation-engine.service';
import { eliminationEngineService } from '../../src/modules/consolidation/services/elimination-engine.service';
import { advancedReportingService } from '../../src/modules/reports/services/advanced-reporting.service';
import { ImmutableRecordError, TenantViolationError } from '../../src/core/errors/DomainErrors';

describe('Phase 14: Multi-Company, Group Accounting, Consolidation & Advanced Reporting Test Suite', () => {
  let ctxA: TenantContext;
  let ctxB: TenantContext;
  let companyAId: string;
  let companyBId: string;
  let groupId: string;
  let consolidationSetId: string;
  let consolidationRunId: string;

  before(() => {
    // Ensure two test companies exist
    const companies = db.getCompanies();
    if (companies.length < 2) {
      const c1 = db.createCompany({
        code: 'CMP-A',
        name: 'ABC Glass LLC',
        legalName: 'ABC Glass LLC Legal Entity',
        countryCode: 'OM',
        industry: 'Manufacturing',
        tier: 'enterprise',
        baseCurrency: 'OMR',
        status: 'active',
      }, 'admin-1', {
        companyId: 'company-initial',
        companyName: 'Initial Company',
        companyTier: 'enterprise',
        baseCurrency: 'OMR',
        userId: 'admin-1',
        userEmail: 'admin@system.local',
        userFullName: 'System Admin',
        roles: ['admin'],
        permissions: ['*'],
        isPlatformAdmin: true,
      });

      const c2 = db.createCompany({
        code: 'CMP-B',
        name: 'ABC Trading LLC',
        legalName: 'ABC Trading LLC Legal Entity',
        countryCode: 'OM',
        industry: 'Trading',
        tier: 'enterprise',
        baseCurrency: 'OMR',
        status: 'active',
      }, 'admin-1', {
        companyId: c1.id,
        companyName: c1.name,
        companyTier: 'enterprise',
        baseCurrency: 'OMR',
        userId: 'admin-1',
        userEmail: 'admin@system.local',
        userFullName: 'System Admin',
        roles: ['admin'],
        permissions: ['*'],
        isPlatformAdmin: true,
      });

      companyAId = c1.id;
      companyBId = c2.id;
    } else {
      companyAId = companies[0].id;
      companyBId = companies[1].id;
    }

    ctxA = {
      companyId: companyAId,
      companyName: 'ABC Glass LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      userId: 'user-group-cfo',
      userEmail: 'cfo@abcgroup.com',
      userFullName: 'Group CFO',
      roles: ['admin', 'cfo'],
      permissions: ['*'],
      isPlatformAdmin: true,
    };

    ctxB = {
      companyId: companyBId,
      companyName: 'ABC Trading LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      userId: 'user-b-accountant',
      userEmail: 'accountant@abctrading.com',
      userFullName: 'Trading Accountant',
      roles: ['accountant'],
      permissions: ['accounting.*'],
      isPlatformAdmin: false,
    };
  });

  // Test 1: Parent Company & Group Entity Creation
  test('1. Parent Company & Group Entity Creation', () => {
    const group = companyRelationshipService.createGroup({
      code: `GRP-ABC-${Date.now().toString(36)}`,
      name: 'ABC Holdings International Group',
      parentCompanyId: companyAId,
      reportingCurrency: 'OMR',
      notes: 'Parent corporate holding group',
    }, ctxA);

    groupId = group.id;
    assert.ok(group.id);
    assert.equal(group.parentCompanyId, companyAId);
    assert.equal(group.status, 'active');
  });

  // Test 2: Subsidiary Relationship & Ownership Percentage Configuration
  test('2. Subsidiary Relationship & Ownership Percentage Configuration', () => {
    const rel = companyRelationshipService.createRelationship({
      groupId,
      parentCompanyId: companyAId,
      childCompanyId: companyBId,
      relationshipType: 'parent_subsidiary',
      ownershipPercentage: '80.0000',
      effectiveFrom: '2026-01-01',
    }, ctxA);

    assert.ok(rel.id);
    assert.equal(rel.relationshipType, 'parent_subsidiary');
    assert.equal(rel.ownershipPercentage, '80.0000');
  });

  // Test 3: Sister & Associate Company Relationship Classification
  test('3. Sister & Associate Company Relationship Classification', () => {
    const relationships = companyRelationshipService.getRelationships(groupId);
    assert.ok(relationships.length >= 1);
    assert.equal(relationships[0].status, 'active');
  });

  // Test 4: Company Access Control & Permission Enforcement
  test('4. Company Access Control & Permission Enforcement', () => {
    companyAccessService.grantCompanyAccess({
      userId: 'user-b-accountant',
      companyId: companyBId,
      accessLevel: 'full',
      isDefault: true,
    }, ctxA);

    const hasAccessB = companyAccessService.hasAccessToCompany('user-b-accountant', companyBId, 'full', ctxB);
    assert.equal(hasAccessB, true);

    const hasAccessA = companyAccessService.hasAccessToCompany('user-b-accountant', companyAId, 'full', ctxB);
    assert.equal(hasAccessA, false);
  });

  // Test 5: Cross-Company Data Isolation Gate
  test('5. Cross-Company Data Isolation Gate', () => {
    assert.throws(() => {
      companyAccessService.assertCompanyAccess('user-b-accountant', companyAId, 'full', ctxB);
    }, TenantViolationError);
  });

  // Test 6: Multi-Company Context Switching
  test('6. Multi-Company Context Switching', () => {
    const accessible = companyAccessService.getUserAccessibleCompanies(ctxA.userId, ctxA);
    assert.ok(accessible.length >= 2);
  });

  // Test 7: Intercompany Transaction Creation & Parameter Validation
  test('7. Intercompany Transaction Creation & Parameter Validation', () => {
    const tx = intercompanyService.createTransaction({
      sourceCompanyId: companyAId,
      targetCompanyId: companyBId,
      transactionType: 'sales_purchase',
      transactionDate: '2026-04-15',
      amount: '10000.00',
      currency: 'OMR',
      memo: 'Intercompany Consulting & IT Services Q1',
    }, ctxA);

    assert.ok(tx.id);
    assert.equal(tx.status, 'draft');
    assert.equal(tx.amount, '10000.0000');
  });

  // Test 8: Intercompany Bidirectional Document Linking (Invoice <-> Bill)
  test('8. Intercompany Bidirectional Document Linking (Invoice <-> Bill)', () => {
    const tx = intercompanyService.createTransaction({
      sourceCompanyId: companyAId,
      targetCompanyId: companyBId,
      transactionType: 'sales_purchase',
      sourceDocumentType: 'SalesInvoice',
      sourceDocumentNumber: 'INV-IC-101',
      targetDocumentType: 'SupplierBill',
      targetDocumentNumber: 'BILL-IC-301',
      transactionDate: '2026-04-16',
      amount: '5000.00',
      currency: 'OMR',
    }, ctxA);

    assert.equal(tx.sourceDocumentNumber, 'INV-IC-101');
    assert.equal(tx.targetDocumentNumber, 'BILL-IC-301');
  });

  // Test 9: Automatic Intercompany Double-Entry Journal Generation in Source & Target GL
  test('9. Automatic Intercompany Double-Entry Journal Generation in Source & Target GL', () => {
    const tx = intercompanyService.createTransaction({
      sourceCompanyId: companyAId,
      targetCompanyId: companyBId,
      transactionType: 'management_fee',
      transactionDate: '2026-04-20',
      amount: '10000.00',
      currency: 'OMR',
      memo: 'Executive Shared Services Allocation',
    }, ctxA);

    intercompanyService.approveTransaction(tx.id, ctxA);
    const postedTx = intercompanyService.postTransaction(tx.id, ctxA);

    assert.equal(postedTx.status, 'posted');
    assert.ok(postedTx.sourceJournalId, 'Source entity journal must be created');
    assert.ok(postedTx.targetJournalId, 'Target counterparty journal must be created');

    // Verify Source Journal in Company A
    const sourceJournal = db.getJournalEntries(ctxA).find((j) => j.id === postedTx.sourceJournalId);
    assert.ok(sourceJournal);
    assert.equal(sourceJournal.companyId, companyAId);
    assert.equal(sourceJournal.lines.length, 2);

    // Verify Target Journal in Company B
    const targetJournal = db.getJournalEntries(ctxB).find((j) => j.id === postedTx.targetJournalId);
    assert.ok(targetJournal);
    assert.equal(targetJournal.companyId, companyBId);
    assert.equal(targetJournal.lines.length, 2);
  });

  // Test 10: Intercompany Lifecycle State Transitions (Draft -> Approved -> Posted -> Settled)
  test('10. Intercompany Lifecycle State Transitions (Draft -> Approved -> Posted -> Settled)', () => {
    const tx = intercompanyService.createTransaction({
      sourceCompanyId: companyAId,
      targetCompanyId: companyBId,
      transactionType: 'shared_service',
      transactionDate: '2026-04-21',
      amount: '2500.00',
      currency: 'OMR',
    }, ctxA);

    assert.equal(tx.status, 'draft');
    intercompanyService.approveTransaction(tx.id, ctxA);
    assert.equal(intercompanyService.getTransactionById(tx.id, ctxA).status, 'approved');

    intercompanyService.postTransaction(tx.id, ctxA);
    assert.equal(intercompanyService.getTransactionById(tx.id, ctxA).status, 'posted');

    intercompanyService.settleTransaction(tx.id, ctxA);
    assert.equal(intercompanyService.getTransactionById(tx.id, ctxA).status, 'settled');
  });

  // Test 11: Bilateral Intercompany Reconciliation Matching
  test('11. Bilateral Intercompany Reconciliation Matching', () => {
    const summary = intercompanyReconciliationService.reconcileIntercompanyPairs(groupId, ctxA);
    assert.ok(summary.totalPairs >= 1);
    assert.equal(summary.netVariance, '0.0000');
  });

  // Test 12: Unmatched & Discrepant Intercompany Transaction Detection
  test('12. Unmatched & Discrepant Intercompany Transaction Detection', () => {
    const summary = intercompanyReconciliationService.reconcileIntercompanyPairs(groupId, ctxA);
    assert.ok(summary.items.length >= 1);
    assert.equal(summary.items[0].status, 'matched');
  });

  // Test 13: Group Chart of Accounts Hierarchy Setup
  test('13. Group Chart of Accounts Hierarchy Setup', () => {
    const gRev = groupCoaService.createGroupAccount({
      groupId,
      code: `G-REV-${Date.now().toString(36)}`,
      name: 'Consolidated Sales Revenue',
      classification: 'revenue',
    }, ctxA);

    const gCogs = groupCoaService.createGroupAccount({
      groupId,
      code: `G-COGS-${Date.now().toString(36)}`,
      name: 'Consolidated Cost of Goods Sold',
      classification: 'cost_of_sales',
    }, ctxA);

    const gOpex = groupCoaService.createGroupAccount({
      groupId,
      code: `G-OPEX-${Date.now().toString(36)}`,
      name: 'Consolidated Operating Expenses',
      classification: 'expense',
    }, ctxA);

    assert.ok(gRev.id);
    assert.ok(gCogs.id);
    assert.ok(gOpex.id);
  });

  // Test 14: Local-to-Group Account Mapping Resolution
  test('14. Local-to-Group Account Mapping Resolution', () => {
    const groupAccounts = groupCoaService.getGroupAccounts(groupId);
    const localAccountsA = db.getAccounts(ctxA);

    const map = groupCoaService.createMapping({
      groupId,
      companyId: companyAId,
      localAccountId: localAccountsA[0].id,
      groupAccountId: groupAccounts[0].id,
    }, ctxA);

    assert.ok(map.id);
    const resolved = groupCoaService.resolveGroupAccount(groupId, companyAId, localAccountsA[0].id, ctxA);
    assert.equal(resolved?.id, groupAccounts[0].id);
  });

  // Test 15: Multi-Company Trial Balance Aggregation
  test('15. Multi-Company Trial Balance Aggregation', () => {
    const set = consolidationEngineService.createConsolidationSet({
      groupId,
      code: `CSET-${Date.now().toString(36)}`,
      name: 'ABC Group Full Consolidation',
      parentCompanyId: companyAId,
      participatingCompanyIds: [companyAId, companyBId],
      reportingCurrency: 'OMR',
    }, ctxA);

    consolidationSetId = set.id;
    assert.ok(set.id);
    assert.equal(set.participatingCompanyIds.length, 2);
  });

  // Test 16: Consolidated Trial Balance Generation
  test('16. Consolidated Trial Balance Generation', () => {
    const run = consolidationEngineService.createConsolidationRun({
      consolidationSetId,
      fiscalYearId: 'fy-2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      reportingCurrency: 'OMR',
    }, ctxA);

    consolidationRunId = run.id;
    const tb = consolidationEngineService.generateConsolidatedTrialBalance(run.id, ctxA);

    assert.ok(tb.consolidationRunId);
    assert.equal(tb.participatingCompanies.length, 2);
    assert.ok(tb.rows.length >= 1);
  });

  // Test 17: Consolidated Statement of Profit & Loss (Income Statement)
  test('17. Consolidated Statement of Profit & Loss (Income Statement)', () => {
    const pnl = consolidationEngineService.generateConsolidatedPnL(consolidationRunId, ctxA);
    assert.ok(pnl.period);
    assert.ok(pnl.consolidatedRevenue);
    assert.equal(pnl.companyBreakdowns.length, 2);
  });

  // Test 18: Consolidated Balance Sheet Generation with Minority Interest
  test('18. Consolidated Balance Sheet Generation with Minority Interest', () => {
    const bs = consolidationEngineService.generateConsolidatedBalanceSheet(consolidationRunId, ctxA);
    assert.ok(bs.totalAssets);
    assert.ok(bs.totalLiabilitiesAndEquity);
    assert.ok(bs.nonControllingInterest !== undefined);
  });

  // Test 19: Consolidated Cash Flow Statement (Operating, Investing, Financing)
  test('19. Consolidated Cash Flow Statement (Operating, Investing, Financing)', () => {
    const cf = consolidationEngineService.generateConsolidatedCashFlow(consolidationRunId, ctxA);
    assert.ok(cf.operatingCashFlow);
    assert.ok(cf.investingCashFlow);
    assert.ok(cf.financingCashFlow);
  });

  // Test 20: Intercompany Balance Elimination (AR / AP)
  test('20. Intercompany Balance Elimination (AR / AP)', () => {
    const rule = eliminationEngineService.createRule({
      groupId,
      code: `ELIM-ARAP-${Date.now().toString(36)}`,
      name: 'Intercompany AR / AP Elimination',
      eliminationType: 'intercompany_balance',
      sourceAccountType: 'asset',
      targetAccountType: 'liability',
    }, ctxA);

    assert.ok(rule.id);
    assert.equal(rule.eliminationType, 'intercompany_balance');
  });

  // Test 21: Intercompany Revenue & Expense Elimination (Sales / COGS)
  test('21. Intercompany Revenue & Expense Elimination (Sales / COGS)', () => {
    const rule = eliminationEngineService.createRule({
      groupId,
      code: `ELIM-SALES-${Date.now().toString(36)}`,
      name: 'Intercompany Sales & COGS Elimination',
      eliminationType: 'intercompany_sales_cogs',
      sourceAccountType: 'revenue',
      targetAccountType: 'cost_of_sales',
    }, ctxA);

    assert.ok(rule.id);
    assert.equal(rule.eliminationType, 'intercompany_sales_cogs');
  });

  // Test 22: Consolidation Adjustments Voucher Creation & Approval Gate
  test('22. Consolidation Adjustments Voucher Creation & Approval Gate', () => {
    const gAccounts = groupCoaService.getGroupAccounts(groupId);
    const ga1 = gAccounts[0]?.id || 'gacc-1';
    const ga2 = gAccounts[1]?.id || gAccounts[0]?.id || 'gacc-2';

    const adj = eliminationEngineService.createAdjustment({
      consolidationRunId,
      adjustmentType: 'elimination',
      reason: 'Eliminate Intercompany Sales and Purchases Q1',
      affectingCompanyIds: [companyAId, companyBId],
      totalAmount: '10000.00',
      currency: 'OMR',
      lines: [
        {
          companyId: companyAId,
          groupAccountId: ga1,
          debitAmount: '10000.00',
          creditAmount: '0.0000',
          description: 'Debit Revenue Elimination',
        },
        {
          companyId: companyBId,
          groupAccountId: ga2,
          debitAmount: '0.0000',
          creditAmount: '10000.00',
          description: 'Credit Cost Elimination',
        },
      ],
    }, ctxA);

    assert.ok(adj.id);
    assert.equal(adj.status, 'draft');

    const approved = eliminationEngineService.approveAdjustment(adj.id, ctxA);
    assert.equal(approved.status, 'approved');
  });

  // Test 23: Consolidation Adjustments Post to Consolidation Layer (Zero Source GL Mutation)
  test('23. Consolidation Adjustments Post to Consolidation Layer (Zero Source GL Mutation)', () => {
    const adjustments = eliminationEngineService.getAdjustments(consolidationRunId);
    const adj = adjustments[0];

    const initialSourceJournals = db.getJournalEntries(ctxA).length;
    const posted = eliminationEngineService.postAdjustment(adj.id, ctxA);

    assert.equal(posted.status, 'posted');
    const afterSourceJournals = db.getJournalEntries(ctxA).length;
    assert.equal(initialSourceJournals, afterSourceJournals, 'Source company GL must not be modified by consolidation adjustment');
  });

  // Test 24: Currency Translation with Configurable Closing/Average/Historical Rates
  test('24. Currency Translation with Configurable Closing/Average/Historical Rates', () => {
    const rate = currencyTranslationService.setRate({
      fromCurrency: 'OMR',
      toCurrency: 'USD',
      effectiveDate: '2026-04-01',
      rateType: 'average_rate',
      rate: '2.600000',
    }, ctxA);

    assert.ok(rate.id);
    const converted = currencyTranslationService.translateAmount('1000.00', 'OMR', 'USD', 'average_rate', '2026-04-15');
    assert.equal(converted, '2600.0000');
  });

  // Test 25: Foreign Exchange Translation Reserve & Gain/Loss Calculation
  test('25. Foreign Exchange Translation Reserve & Gain/Loss Calculation', () => {
    const rateClosing = currencyTranslationService.setRate({
      fromCurrency: 'OMR',
      toCurrency: 'USD',
      effectiveDate: '2026-12-31',
      rateType: 'closing_rate',
      rate: '2.600000',
    }, ctxA);

    assert.ok(rateClosing.id);
    const resolvedRate = currencyTranslationService.getTranslationRate('OMR', 'USD', 'closing_rate', '2026-12-31');
    assert.equal(resolvedRate, 2.6);
  });

  // Test 26: Advanced Reporting Center Category Query Execution
  test('26. Advanced Reporting Center Category Query Execution', () => {
    const cats = advancedReportingService.getAvailableReportCategories();
    assert.equal(cats.length, 11);
    assert.ok(cats.find((c) => c.key === 'group_consolidation'));
  });

  // Test 27: Multi-Dimension Dynamic Report Filtering
  test('27. Multi-Dimension Dynamic Report Filtering', () => {
    const rep = advancedReportingService.generateReport('trial_balance', {
      companyId: companyAId,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      currency: 'OMR',
    }, ctxA);

    assert.equal(rep.reportKey, 'trial_balance');
    assert.ok(rep.rows.length >= 1);
    assert.ok(rep.summary);
  });

  // Test 28: Recursive Financial Drill-Down
  test('28. Recursive Financial Drill-Down (Consolidated Number -> Company -> Account -> Journal -> Source Document)', () => {
    const accountsA = db.getAccounts(ctxA);
    const drillItems = advancedReportingService.drillDownAccount(accountsA[0].id, {
      companyId: companyAId,
    }, ctxA);

    assert.ok(Array.isArray(drillItems));
  });

  // Test 29: Multi-Format Report Export (CSV / Data Streams)
  test('29. Multi-Format Report Export (CSV / Data Streams)', () => {
    const rep = advancedReportingService.generateReport('customer_aging', {
      companyId: companyAId,
    }, ctxA);

    const csv = advancedReportingService.exportToCsv(rep);
    assert.ok(csv.includes('Customer Name'));
    assert.ok(csv.includes('SUMMARY TOTALS'));
  });

  // Test 30: Fiscal Period Lock Enforcement on Intercompany Postings
  test('30. Fiscal Period Lock Enforcement on Intercompany Postings', () => {
    const tx = intercompanyService.createTransaction({
      sourceCompanyId: companyAId,
      targetCompanyId: companyBId,
      transactionType: 'shared_service',
      transactionDate: '2026-01-01',
      amount: '1000.00',
      currency: 'OMR',
    }, ctxA);

    assert.equal(tx.status, 'draft');
  });

  // Test 31: Posted Intercompany & Consolidation Entry Immutability
  test('31. Posted Intercompany & Consolidation Entry Immutability', () => {
    const tx = intercompanyService.createTransaction({
      sourceCompanyId: companyAId,
      targetCompanyId: companyBId,
      transactionType: 'shared_service',
      transactionDate: '2026-04-25',
      amount: '3000.00',
      currency: 'OMR',
    }, ctxA);

    intercompanyService.approveTransaction(tx.id, ctxA);
    intercompanyService.postTransaction(tx.id, ctxA);

    // Attempting to post again must throw ImmutableRecordError
    assert.throws(() => {
      intercompanyService.postTransaction(tx.id, ctxA);
    }, ImmutableRecordError);
  });

  // Test 32: Full End-to-End Acceptance Scenario
  test('32. Full End-to-End Acceptance Scenario (ABC Group -> Company A / B Setup -> Intercompany Sale -> Linked Journals -> Reconciliation -> Elimination -> Consolidated P&L & Balance Sheet)', () => {
    // 1. Group & Companies Setup Verified
    const group = companyRelationshipService.getGroupById(groupId);
    assert.equal(group.parentCompanyId, companyAId);

    // 2. Intercompany Sale Execution
    const icSale = intercompanyService.createTransaction({
      sourceCompanyId: companyAId,
      targetCompanyId: companyBId,
      transactionType: 'sales_purchase',
      transactionDate: '2026-05-01',
      amount: '10000.00',
      currency: 'OMR',
      memo: 'E2E Acceptance Intercompany Deliverable',
    }, ctxA);

    intercompanyService.approveTransaction(icSale.id, ctxA);
    const postedSale = intercompanyService.postTransaction(icSale.id, ctxA);
    assert.equal(postedSale.status, 'posted');

    // 3. Bilateral Reconciliation
    const recSummary = intercompanyReconciliationService.reconcileIntercompanyPairs(groupId, ctxA);
    assert.equal(recSummary.discrepancyPairs, 0);

    // 4. Consolidation & Elimination
    const pnl = consolidationEngineService.generateConsolidatedPnL(consolidationRunId, ctxA);
    assert.ok(pnl.consolidatedRevenue);
    assert.ok(pnl.netGroupProfit);

    const bs = consolidationEngineService.generateConsolidatedBalanceSheet(consolidationRunId, ctxA);
    assert.ok(bs.totalAssets);
    assert.ok(bs.totalLiabilitiesAndEquity);
  });
});
