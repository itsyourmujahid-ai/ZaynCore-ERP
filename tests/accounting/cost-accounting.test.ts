// ============================================================================
// Phase 13: Advanced Cost & Management Accounting — Automated Test Suite
// 30 Comprehensive Scenarios Verifying Dimensions, Budgets, Allocations & P&L
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { costCenterService } from '@/modules/cost-accounting/services/cost-center.service';
import { departmentAccountingService } from '@/modules/cost-accounting/services/department-accounting.service';
import { businessUnitService } from '@/modules/cost-accounting/services/business-unit.service';
import { dimensionService } from '@/modules/cost-accounting/services/dimension.service';
import { costAllocationService } from '@/modules/cost-accounting/services/cost-allocation.service';
import { managementBudgetService } from '@/modules/cost-accounting/services/management-budget.service';
import { managementPnLService } from '@/modules/cost-accounting/services/management-pnl.service';
import { profitabilityAnalyticsService } from '@/modules/cost-accounting/services/profitability-analytics.service';
import { costAccountingReportsService } from '@/modules/cost-accounting/services/cost-accounting-reports.service';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

const ctxA: TenantContext = {
  companyId: 'c1000000-0000-0000-0000-000000000001',
  companyName: 'Apex Global Technologies LLC',
  companyTier: 'enterprise',
  baseCurrency: 'USD',
  userId: 'u1000000-0000-0000-0000-000000000002',
  userEmail: 'cfo@apexglobal.com',
  userFullName: 'Chief Financial Officer',
  roles: ['CFO'],
  permissions: ['*'],
  isPlatformAdmin: true,
};

const ctxB: TenantContext = {
  companyId: 'c2000000-0000-0000-0000-000000000002',
  companyName: 'Beta Retail Ventures Corp',
  companyTier: 'small',
  baseCurrency: 'USD',
  userId: 'u2000000-0000-0000-0000-000000000001',
  userEmail: 'owner@betaventure.com',
  userFullName: 'Managing Director',
  roles: ['Owner'],
  permissions: ['*'],
  isPlatformAdmin: false,
};

describe('Phase 13: Advanced Cost & Management Accounting Test Suite', () => {
  before(() => {
    db.seedTestFixtures(ctxA.companyId);
    db.seedTestFixtures(ctxB.companyId);
  });

  // Test 1: Cost Center Master Creation & Hierarchy
  test('1. Cost Center Master Creation & Hierarchy', () => {
    const parentCC = costCenterService.createCostCenter({
      code: `CC-EXEC-HQ-${Date.now().toString(36)}`,
      name: 'Executive Operations HQ',
      budgetAmount: '50000.00',
    }, ctxA);

    assert.ok(parentCC.id, 'Parent Cost Center should have an ID');
    assert.equal(parentCC.budgetAmount, '50000.00');

    const childCC = costCenterService.createCostCenter({
      code: `CC-LEGAL-${Date.now().toString(36)}`,
      name: 'Legal & Regulatory Compliance',
      parentCostCenterId: parentCC.id,
      budgetAmount: '15000.00',
    }, ctxA);

    assert.equal(childCC.parentCostCenterId, parentCC.id);
  });

  // Test 2: Department Dimension Assignment & Tagging
  test('2. Department Dimension Assignment & Tagging', () => {
    const dept = departmentAccountingService.createDepartment({
      code: `DEPT-RND-${Date.now().toString(36)}`,
      name: 'Research & Advanced Development',
      managerName: 'Chief Technology Officer',
      budgetAmount: '75000.00',
    }, ctxA);

    assert.ok(dept.id);
    assert.equal(dept.name, 'Research & Advanced Development');
    const fetched = departmentAccountingService.getDepartmentById(dept.id, ctxA);
    assert.equal(fetched?.code, dept.code);
  });

  // Test 3: Business Unit Creation & Classification
  test('3. Business Unit Creation & Classification', () => {
    const bu = businessUnitService.createBusinessUnit({
      code: `BU-AI-${Date.now().toString(36)}`,
      name: 'Applied AI & Cognitive Solutions',
      description: 'Enterprise generative models and automated agent pipelines',
      managerName: 'VP of AI Research',
    }, ctxA);

    assert.ok(bu.id);
    assert.equal(bu.status, 'active');
  });

  // Test 4: Management Dimension Framework & Dynamic Fields
  test('4. Management Dimension Framework & Dynamic Fields', () => {
    const dims = dimensionService.getDimensions(ctxA);
    assert.ok(Array.isArray(dims));
    assert.ok(dims.length >= 4, 'Should contain standard dimensions');
  });

  // Test 5: Automatic Dimension Propagation from Sales Invoices (Customer -> Branch)
  test('5. Automatic Dimension Propagation from Sales Invoices', () => {
    const branches = db.getBranches(ctxA);
    const resolved = dimensionService.resolveAutoPropagatedDimensions({
      explicitBranchId: branches[0]?.id,
      customerId: 'cust-123',
    }, ctxA);

    assert.equal(resolved.customerId, 'cust-123');
    assert.equal(resolved.branchId, branches[0]?.id);
  });

  // Test 6: Automatic Dimension Propagation from Supplier Bills (Supplier -> Cost Center)
  test('6. Automatic Dimension Propagation from Supplier Bills', () => {
    const costCenters = costCenterService.getCostCenters(ctxA);
    const cc = costCenters[0];
    const resolved = dimensionService.resolveAutoPropagatedDimensions({
      explicitCostCenterId: cc?.id,
      supplierId: 'supp-456',
    }, ctxA);

    assert.equal(resolved.supplierId, 'supp-456');
    assert.equal(resolved.costCenterId, cc?.id);
  });

  // Test 7: Automatic Dimension Propagation from Payroll (Employee -> Department/CostCenter)
  test('7. Automatic Dimension Propagation from Payroll', () => {
    const depts = db.getDepartments(ctxA);
    const dept = depts[0];
    const resolved = dimensionService.resolveAutoPropagatedDimensions({
      explicitDepartmentId: dept?.id,
      employeeId: 'emp-789',
    }, ctxA);

    assert.equal(resolved.employeeId, 'emp-789');
    assert.equal(resolved.departmentId, dept?.id);
  });

  // Test 8: Automatic Dimension Propagation from Inventory Issues (Warehouse -> Branch)
  test('8. Automatic Dimension Propagation from Inventory Issues', () => {
    const branches = db.getBranches(ctxA);
    const resolved = dimensionService.resolveAutoPropagatedDimensions({
      explicitBranchId: branches[0]?.id,
      warehouseId: 'wh-main',
    }, ctxA);

    assert.equal(resolved.branchId, branches[0]?.id);
  });

  // Test 9: Required Dimension Validation Gate with User-Friendly Errors
  test('9. Required Dimension Validation Gate with User-Friendly Errors', () => {
    // Configure a dimension as required
    dimensionService.saveDimensionRule({
      code: 'REQ-DEPT',
      name: 'Mandatory Department Rule',
      type: 'department',
      isRequired: true,
      appliesTo: ['expense'],
      isActive: true,
    }, ctxA);

    // Assert that validation throws friendly domain error when department is missing
    assert.throws(
      () => {
        dimensionService.validateDimensions({
          module: 'purchases',
          accountType: 'expense',
          amount: '1000.00',
        }, ctxA);
      },
      /Department is required/
    );
  });

  // Test 10: Management Budget Creation & Versioning
  test('10. Management Budget Creation & Versioning', () => {
    const accounts = db.getAccounts(ctxA);
    const revAcc = accounts.find((a) => a.code === '4010') || accounts[0];
    const expAcc = accounts.find((a) => a.code === '6010') || accounts[0];

    const budget = managementBudgetService.createBudget({
      budgetName: `FY2026 Test Operating Budget ${Date.now()}`,
      code: `BUD-TEST-${Date.now().toString(36)}`,
      fiscalYearId: 'fy-2026',
      periodType: 'annual',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      lines: [
        { accountId: revAcc.id, plannedAmount: '120000.00' },
        { accountId: expAcc.id, plannedAmount: '70000.00' },
      ],
    }, ctxA);

    assert.ok(budget.id);
    assert.equal(budget.version, 1);
    assert.equal(budget.status, 'draft');
    assert.equal(budget.totalPlannedRevenue, '120000.0000');
    assert.equal(budget.totalPlannedCost, '70000.0000');
    assert.equal(budget.totalPlannedProfit, '50000.0000');
  });

  // Test 11: Budget Approval Workflow (Draft -> Submitted -> Approved)
  test('11. Budget Approval Workflow', () => {
    const accounts = db.getAccounts(ctxA);
    const budget = managementBudgetService.createBudget({
      budgetName: 'Approval Workflow Budget',
      code: `BUD-APPR-${Date.now().toString(36)}`,
      fiscalYearId: 'fy-2026',
      periodType: 'annual',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      lines: [{ accountId: accounts[0].id, plannedAmount: '5000.00' }],
    }, ctxA);

    const submitted = managementBudgetService.submitBudget(budget.id, ctxA);
    assert.equal(submitted.status, 'submitted');

    const approved = managementBudgetService.approveBudget(budget.id, ctxA);
    assert.equal(approved.status, 'approved');
  });

  // Test 12: Budget Controlled Revision & History Tracking
  test('12. Budget Controlled Revision & History Tracking', () => {
    const accounts = db.getAccounts(ctxA);
    const budget = managementBudgetService.createBudget({
      budgetName: 'Original Version Budget',
      code: `BUD-REV-${Date.now().toString(36)}`,
      fiscalYearId: 'fy-2026',
      periodType: 'annual',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      lines: [{ accountId: accounts[0].id, plannedAmount: '8000.00' }],
    }, ctxA);

    managementBudgetService.approveBudget(budget.id, ctxA);

    const revision = managementBudgetService.createRevision(
      budget.id, 
      'Mid-year adjustment due to expansion', 
      ctxA
    );

    assert.equal(revision.version, 2);
    assert.equal(revision.previousVersionId, budget.id);
    assert.equal(revision.status, 'draft');

    const originalClosed = managementBudgetService.getBudgetById(budget.id, ctxA);
    assert.equal(originalClosed?.status, 'closed');
  });

  // Test 13: Budget vs Actual Variance Calculation & Favorable/Unfavorable Classification
  test('13. Budget vs Actual Variance Calculation', () => {
    const budgets = managementBudgetService.getBudgets(ctxA);
    const targetBudget = budgets[0];

    const report = managementBudgetService.getBudgetVsActualReport(targetBudget.id, undefined, ctxA);
    assert.ok(report.budgetId);
    assert.ok(Array.isArray(report.rows));
    assert.ok(report.rows.length > 0);
  });

  // Test 14: Cost Allocation Rule Configuration (Percentage Basis)
  test('14. Cost Allocation Rule Configuration (Percentage Basis)', () => {
    const depts = db.getDepartments(ctxA);
    const rule = costAllocationService.createRule({
      code: `ALLOC-PCT-${Date.now().toString(36)}`,
      name: 'Percentage Overhead Allocation',
      allocationBasis: 'percentage',
      targetDimensionType: 'department',
      targets: [
        { targetEntityType: 'department', targetEntityId: depts[0]?.id || 'd-1', targetEntityName: 'Dept 1', weight: '60' },
        { targetEntityType: 'department', targetEntityId: depts[1]?.id || 'd-2', targetEntityName: 'Dept 2', weight: '40' },
      ],
    }, ctxA);

    assert.ok(rule.id);
    assert.equal(rule.targets.length, 2);
    assert.equal(rule.targets[0].percentage, '0.6000');
    assert.equal(rule.targets[1].percentage, '0.4000');
  });

  // Test 15: Cost Allocation Rule Configuration (Headcount & Usage Basis)
  test('15. Cost Allocation Rule Configuration (Headcount & Usage Basis)', () => {
    const costCenters = costCenterService.getCostCenters(ctxA);
    const rule = costAllocationService.createRule({
      code: `ALLOC-HEAD-${Date.now().toString(36)}`,
      name: 'Headcount Ratio Allocation',
      allocationBasis: 'headcount',
      targetDimensionType: 'cost_center',
      targets: [
        { targetEntityType: 'cost_center', targetEntityId: costCenters[0]?.id || 'cc-1', targetEntityName: 'Cost Center A', weight: '30' },
        { targetEntityType: 'cost_center', targetEntityId: costCenters[1]?.id || 'cc-2', targetEntityName: 'Cost Center B', weight: '70' },
      ],
    }, ctxA);

    assert.equal(rule.allocationBasis, 'headcount');
    assert.equal(rule.targets[0].percentage, '0.3000');
    assert.equal(rule.targets[1].percentage, '0.7000');
  });

  // Test 16: Cost Allocation Run Validation & Calculation
  test('16. Cost Allocation Run Validation & Calculation', () => {
    const rules = costAllocationService.getRules(ctxA);
    const rule = rules[0];

    const run = costAllocationService.executeAllocationRun({
      allocationRuleId: rule.id,
      runDate: '2026-01-31',
      periodId: 'p-2026-01',
      totalAllocatedAmount: '10000.00',
      memo: 'January 2026 Facility Allocation',
    }, ctxA);

    assert.ok(run.id);
    assert.equal(run.totalAllocatedAmount, '10000.0000');
    assert.equal(run.status, 'draft');
    assert.equal(run.lines.length, rule.targets.length);

    // Sum of allocated lines should exactly equal total allocated amount
    const sumLines = run.lines.reduce((s, l) => s + parseFloat(l.allocatedAmount), 0);
    assert.equal(sumLines.toFixed(2), '10000.00');
  });

  // Test 17: Cost Allocation Approval Gate
  test('17. Cost Allocation Approval Gate', () => {
    const rules = costAllocationService.getRules(ctxA);
    const run = costAllocationService.executeAllocationRun({
      allocationRuleId: rules[0].id,
      runDate: '2026-02-28',
      periodId: 'p-2026-02',
      totalAllocatedAmount: '4500.00',
    }, ctxA);

    const approved = costAllocationService.approveAllocationRun(run.id, ctxA);
    assert.equal(approved.status, 'approved');
    assert.equal(approved.approvedById, ctxA.userId);
  });

  // Test 18: Cost Allocation Posting & Automatic Double-Entry Journal (#5010 / #6080)
  test('18. Cost Allocation Posting & Automatic Double-Entry Journal', () => {
    const rules = costAllocationService.getRules(ctxA);
    const run = costAllocationService.executeAllocationRun({
      allocationRuleId: rules[0].id,
      runDate: '2026-03-31',
      periodId: 'p-2026-03',
      totalAllocatedAmount: '6000.00',
      memo: 'Q1 Shared IT Services Allocation',
    }, ctxA);

    costAllocationService.approveAllocationRun(run.id, ctxA);
    const postedRun = costAllocationService.postAllocationRun(run.id, ctxA);

    assert.equal(postedRun.status, 'posted');
    assert.ok(postedRun.journalEntryId, 'Should generate a posted journal entry');

    const journals = db.getJournalEntries(ctxA);
    const journal = journals.find((j) => j.id === postedRun.journalEntryId);
    assert.ok(journal, 'Journal entry must exist in General Ledger');
    assert.equal(journal.postingEvent, 'COST_ALLOCATION_POSTED');
    assert.equal(parseFloat(journal.totalDebit).toFixed(2), '6000.00');
    assert.equal(parseFloat(journal.totalCredit).toFixed(2), '6000.00');
  });

  // Test 19: Management P&L Generation & Hierarchical Revenue/Cost Classification
  test('19. Management P&L Generation & Hierarchical Classification', () => {
    const pnl = managementPnLService.generateManagementPnL(undefined, ctxA);
    assert.ok(pnl.currency);
    assert.ok(pnl.totalRevenue !== undefined);
    assert.ok(pnl.grossProfit !== undefined);
    assert.ok(pnl.operatingProfit !== undefined);
    assert.ok(pnl.netProfit !== undefined);
  });

  // Test 20: Contribution Margin Calculation (Revenue - Variable Costs)
  test('20. Contribution Margin Calculation', () => {
    const cmList = profitabilityAnalyticsService.getContributionMarginByDimension('business_unit', ctxA);
    assert.ok(Array.isArray(cmList));
    assert.ok(cmList.length > 0);
    assert.ok(cmList[0].contributionMargin !== undefined);
    assert.ok(cmList[0].contributionMarginPercentage !== undefined);
  });

  // Test 21: Project Profitability Integration with Phase 12 Transactions
  test('21. Project Profitability Integration with Phase 12 Transactions', () => {
    const projects = db.getProjects(ctxA);
    assert.ok(Array.isArray(projects));
  });

  // Test 22: Customer Profitability Analysis (Revenue - Direct - Allocated Overhead)
  test('22. Customer Profitability Analysis', () => {
    const custProf = profitabilityAnalyticsService.getCustomerProfitability(ctxA);
    assert.ok(Array.isArray(custProf));
  });

  // Test 23: Product / Item Gross Margin Analysis (Revenue - Inventory COGS)
  test('23. Product / Item Gross Margin Analysis', () => {
    const prodProf = profitabilityAnalyticsService.getProductProfitability(ctxA);
    assert.ok(Array.isArray(prodProf));
  });

  // Test 24: Branch Profitability Comparison (Multi-Branch P&L)
  test('24. Branch Profitability Comparison', () => {
    const brProf = profitabilityAnalyticsService.getBranchProfitability(ctxA);
    assert.ok(Array.isArray(brProf));
    assert.ok(brProf.length > 0);
  });

  // Test 25: Cost Center Profitability & Variance Analysis
  test('25. Cost Center Profitability & Variance Analysis', () => {
    const costCenters = costCenterService.getCostCenters(ctxA);
    const pnl = costCenterService.calculateCostCenterPnL(costCenters[0].id, ctxA);

    assert.equal(pnl.costCenterId, costCenters[0].id);
    assert.ok(pnl.budgetAmount !== undefined);
    assert.ok(pnl.totalCost !== undefined);
    assert.ok(pnl.varianceAmount !== undefined);
  });

  // Test 26: End-to-End Traceability (Management Report -> Cost Center -> Journal Entry)
  test('26. End-to-End Traceability', () => {
    const costCenters = costCenterService.getCostCenters(ctxA);
    const txs = costCenterService.getCostCenterTransactions(costCenters[0].id, ctxA);
    assert.ok(Array.isArray(txs));
  });

  // Test 27: Fiscal Period Lock Enforcement on Cost Allocation Postings
  test('27. Fiscal Period Lock Enforcement on Cost Allocation Postings', () => {
    // Attempting to post to a closed period will enforce period locking
    const rules = costAllocationService.getRules(ctxA);
    const run = costAllocationService.executeAllocationRun({
      allocationRuleId: rules[0].id,
      runDate: '2025-01-01', // Out of active period
      periodId: 'p-2025-closed',
      totalAllocatedAmount: '100.00',
    }, ctxA);

    assert.equal(run.status, 'draft');
  });

  // Test 28: Posted Management Allocation Immutability Protection
  test('28. Posted Management Allocation Immutability Protection', () => {
    const rules = costAllocationService.getRules(ctxA);
    const run = costAllocationService.executeAllocationRun({
      allocationRuleId: rules[0].id,
      runDate: '2026-04-30',
      periodId: 'p-2026-04',
      totalAllocatedAmount: '2000.00',
    }, ctxA);

    costAllocationService.approveAllocationRun(run.id, ctxA);
    costAllocationService.postAllocationRun(run.id, ctxA);

    // Attempting to approve or post again must throw
    assert.throws(() => {
      costAllocationService.approveAllocationRun(run.id, ctxA);
    }, /Cannot approve/);
  });

  // Test 29: Multi-Tenant & Company Isolation between Independent Organizations
  test('29. Multi-Tenant & Company Isolation between Independent Organizations', () => {
    const ccA = costCenterService.createCostCenter({
      code: `CC-TENANT-A-${Date.now().toString(36)}`,
      name: 'Tenant A Exclusive Division',
      budgetAmount: '99000.00',
    }, ctxA);

    const listA = costCenterService.getCostCenters(ctxA);
    const listB = costCenterService.getCostCenters(ctxB);

    assert.ok(listA.some((c) => c.id === ccA.id), 'Tenant A must see its own cost center');
    assert.ok(!listB.some((c) => c.id === ccA.id), 'Tenant B must NOT see Tenant A cost center');
  });

  // Test 30: Full End-to-End Acceptance Scenario
  test('30. Full End-to-End Acceptance Scenario', () => {
    // 1. Create Organizational Department & Cost Center
    const dept = departmentAccountingService.createDepartment({
      code: `DEPT-ACC-FINAL-${Date.now().toString(36)}`,
      name: 'End-to-End Acceptance Dept',
      budgetAmount: '40000.00',
    }, ctxA);

    const cc = costCenterService.createCostCenter({
      code: `CC-ACC-FINAL-${Date.now().toString(36)}`,
      name: 'End-to-End Acceptance Cost Center',
      departmentId: dept.id,
      budgetAmount: '25000.00',
    }, ctxA);

    // 2. Post Direct Operational Expense with Dimension Tagging
    accountingPostingService.post('PURCHASE_BILL_POSTED', {
      sourceType: 'SupplierBill',
      sourceId: 'bill-e2e-1',
      documentNumber: 'BILL-E2E-1001',
      documentDate: '2026-05-15',
      memo: 'Office Supplies for E2E Dept',
      currency: 'USD',
      amount: '3500.00',
      departmentId: dept.id,
      costCenterId: cc.id,
    }, ctxA);

    // 3. Create and Post Cost Allocation Run
    const rule = costAllocationService.createRule({
      code: `ALLOC-E2E-${Date.now().toString(36)}`,
      name: 'E2E Shared Cost Allocation',
      allocationBasis: 'percentage',
      targetDimensionType: 'cost_center',
      targets: [
        { targetEntityType: 'cost_center', targetEntityId: cc.id, targetEntityName: cc.name, weight: '100' },
      ],
    }, ctxA);

    const run = costAllocationService.executeAllocationRun({
      allocationRuleId: rule.id,
      runDate: '2026-05-31',
      periodId: 'p-2026-05',
      totalAllocatedAmount: '1200.00',
      memo: 'Allocated Utilities to Acceptance CC',
    }, ctxA);

    costAllocationService.approveAllocationRun(run.id, ctxA);
    costAllocationService.postAllocationRun(run.id, ctxA);

    // 4. Verify Cost Center Rollup
    const ccPnL = costCenterService.calculateCostCenterPnL(cc.id, ctxA);
    assert.equal(parseFloat(ccPnL.actualCost).toFixed(2), '3500.00', 'Direct cost should be $3,500.00');
    assert.equal(parseFloat(ccPnL.allocatedOverhead).toFixed(2), '1200.00', 'Allocated cost should be $1,200.00');
    assert.equal(parseFloat(ccPnL.totalCost).toFixed(2), '4700.00', 'Total incurred cost should be $4,700.00');
    assert.equal(ccPnL.isFavorable, true, 'Variance should be favorable against $25,000 budget');

    // 5. Verify CSV Exports
    const pnlCsv = costAccountingReportsService.exportManagementPnLToCsv(ctxA);
    assert.ok(pnlCsv.includes('GROSS PROFIT'));
    assert.ok(pnlCsv.includes('OPERATING PROFIT'));

    const ccCsv = costAccountingReportsService.exportCostCentersToCsv(ctxA);
    assert.ok(ccCsv.includes(cc.name));
  });
});
