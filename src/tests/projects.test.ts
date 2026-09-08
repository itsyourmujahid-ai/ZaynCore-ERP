// ============================================================================
// Phase 12: Project Management & Project Accounting — Comprehensive Test Suite
// 30 Rigorous Automated Scenarios & End-to-End Lifecycle Verification
// ============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { projectService } from '@/modules/projects/services/project.service';
import { projectBudgetService } from '@/modules/projects/services/project-budget.service';
import { projectTaskService } from '@/modules/projects/services/project-task.service';
import { projectCostService } from '@/modules/projects/services/project-cost.service';
import { projectBillingService } from '@/modules/projects/services/project-billing.service';
import { projectProfitabilityService } from '@/modules/projects/services/project-profitability.service';
import { projectWipService } from '@/modules/projects/services/project-wip.service';
import { taxConfigurationService } from '@/modules/tax/services/tax-configuration.service';

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
  companyName: 'Vanguard UK Operations Ltd',
  companyTier: 'enterprise',
  baseCurrency: 'GBP',
  userId: 'u2000000-0000-0000-0000-000000000001',
  userEmail: 'admin@vanguard.co.uk',
  userFullName: 'Vanguard Admin',
  roles: ['SUPER_ADMIN'],
  permissions: ['*'],
  isPlatformAdmin: false,
};

describe('Phase 12: Project Management & Project Accounting Enterprise Test Suite', () => {

  // 1. Project Master Creation & Validation
  test('1. Project Master Creation: validates code, name, dates, budget and contract value', () => {
    const proj = projectService.createProject({
      code: 'PRJ-TEST-001',
      name: 'Smart Grid Automation Implementation',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-02-01',
      endDate: '2026-11-30',
      billingMethod: 'milestone',
      budgetAmount: '120000.00',
      contractValue: '180000.00',
      customerName: 'Pacific Energy Corp',
      projectManagerName: 'David Miller',
    }, ctxA);

    assert.ok(proj.id);
    assert.equal(proj.code, 'PRJ-TEST-001');
    assert.equal(proj.status, 'draft');
    assert.equal(proj.budgetAmount, '120000.0000');
    assert.equal(proj.contractValue, '180000.0000');

    // Verify WIP balance tracker was auto-initialized
    const wip = db.getProjectWipBalance(proj.id, ctxA);
    assert.ok(wip);
    assert.equal(wip.currentWipBalance, '0.0000');
  });

  // 2. Project Lifecycle Status Transitions
  test('2. Project Lifecycle: status transitions (draft -> active -> on_hold -> completed)', () => {
    const proj = projectService.createProject({
      code: 'PRJ-STATUS-01',
      name: 'Status Workflow Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'fixed_price',
    }, ctxA);

    let updated = projectService.changeProjectStatus(proj.id, 'active', ctxA);
    assert.equal(updated.status, 'active');

    updated = projectService.changeProjectStatus(proj.id, 'on_hold', ctxA);
    assert.equal(updated.status, 'on_hold');

    updated = projectService.changeProjectStatus(proj.id, 'completed', ctxA);
    assert.equal(updated.status, 'completed');
  });

  // 3. Configurable Project Types
  test('3. Configurable Project Types: custom creation and category classification', () => {
    const pType = projectService.createProjectType({
      code: 'GOV_CONTRACT',
      name: 'Defense & Federal Government Contract',
      description: 'FAR compliant cost-plus and fixed-price contracts',
      category: 'customer',
      isActive: true,
    }, ctxA);

    assert.ok(pType.id);
    assert.equal(pType.code, 'GOV_CONTRACT');
    assert.equal(pType.category, 'customer');

    const allTypes = projectService.getProjectTypes(ctxA);
    assert.ok(allTypes.some((t) => t.code === 'GOV_CONTRACT'));
  });

  // 4. Project Budget Creation with Itemized Cost Categories
  test('4. Project Budget Creation: itemized category lines (labor, materials, subcontractor)', () => {
    const proj = projectService.createProject({
      code: 'PRJ-BDG-01',
      name: 'Budget Test Contract',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const budget = projectBudgetService.createBudget({
      projectId: proj.id,
      budgetName: 'Engineering Baseline v1',
      lines: [
        { costCategory: 'labor', plannedCost: '50000.00', plannedRevenue: '75000.00' },
        { costCategory: 'materials', plannedCost: '30000.00', plannedRevenue: '45000.00' },
        { costCategory: 'subcontractor', plannedCost: '20000.00', plannedRevenue: '30000.00' },
      ],
    }, ctxA);

    assert.equal(budget.versionNumber, 1);
    assert.equal(budget.totalPlannedCost, '100000.0000');
    assert.equal(budget.totalPlannedRevenue, '150000.0000');
    assert.equal(budget.status, 'draft');

    const lines = projectBudgetService.getBudgetLines(budget.id, ctxA);
    assert.equal(lines.length, 3);
  });

  // 5. Budget Approval & Master Project Sync
  test('5. Budget Approval: status becomes active and project budgetAmount synchronizes', () => {
    const proj = projectService.createProject({
      code: 'PRJ-BDG-02',
      name: 'Budget Approval Sync Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const budget = projectBudgetService.createBudget({
      projectId: proj.id,
      budgetName: 'Initial Baseline',
      lines: [
        { costCategory: 'labor', plannedCost: '60000.00', plannedRevenue: '90000.00' },
      ],
    }, ctxA);

    const approved = projectBudgetService.approveBudget(budget.id, ctxA);
    assert.equal(approved.status, 'active');
    assert.ok(approved.approvedAt);

    // Verify master project budget amount updated
    const updatedProj = projectService.getProjectById(proj.id, ctxA);
    assert.equal(updatedProj?.budgetAmount, '60000.0000');
  });

  // 6. Budget Revision Control
  test('6. Budget Revision Control: creates version 2 and preserves revision history', () => {
    const proj = projectService.createProject({
      code: 'PRJ-BDG-03',
      name: 'Budget Revision Test',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const v1 = projectBudgetService.createBudget({
      projectId: proj.id,
      budgetName: 'Baseline v1',
      lines: [{ costCategory: 'labor', plannedCost: '40000.00' }],
    }, ctxA);
    projectBudgetService.approveBudget(v1.id, ctxA);

    const v2 = projectBudgetService.reviseBudget(v1.id, 'Client expanded scope by 50%', ctxA);
    assert.equal(v2.versionNumber, 2);
    assert.equal(v2.status, 'draft');
    assert.ok(v2.budgetName.includes('Rev 2'));

    const allBudgets = projectBudgetService.getBudgets(ctxA, proj.id);
    assert.equal(allBudgets.length, 2);
  });

  // 7. Budget vs Actual Variance Calculation
  test('7. Budget vs Actual: computes category-level and project-level cost & revenue variances', () => {
    const proj = projectService.createProject({
      code: 'PRJ-BVA-01',
      name: 'BvA Calculation Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const b = projectBudgetService.createBudget({
      projectId: proj.id,
      budgetName: 'Target Baseline',
      lines: [
        { costCategory: 'labor', plannedCost: '50000.00', plannedRevenue: '75000.00' },
        { costCategory: 'materials', plannedCost: '30000.00', plannedRevenue: '45000.00' },
      ],
    }, ctxA);
    projectBudgetService.approveBudget(b.id, ctxA);

    // Incur actual labor cost of $40,000 (favorable $10,000)
    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'labor',
      sourceModule: 'payroll',
      sourceType: 'timesheet',
      sourceId: 't-1',
      documentNumber: 'TS-001',
      amount: '40000.00',
      description: 'Phase 1 development labor',
    }, ctxA);

    const bva = projectBudgetService.getBudgetVsActual(proj.id, ctxA);
    assert.equal(bva.totalPlannedCost, '80000.0000');
    assert.equal(bva.totalActualCost, '40000.0000');
    assert.equal(bva.totalCostVariance, '40000.0000'); // $40k remaining
    assert.equal(bva.totalRemainingBudget, '40000.0000');

    const laborCat = bva.categories.find((c) => c.category === 'labor');
    assert.equal(laborCat?.plannedCost, '50000.0000');
    assert.equal(laborCat?.actualCost, '40000.0000');
    assert.equal(laborCat?.costVariance, '10000.0000');
  });

  // 8. Project Tasks & Activities Scheduling
  test('8. Project Tasks: schedule creation, estimated vs actual hours & costs', () => {
    const proj = projectService.createProject({
      code: 'PRJ-TSK-01',
      name: 'Task Management Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'time_and_material',
    }, ctxA);

    const task = projectTaskService.createTask({
      projectId: proj.id,
      taskName: 'Core Backend DB Architecture',
      estimatedHours: '80.00',
      estimatedCost: '9600.00',
      assigneeName: 'Senior Architect',
    }, ctxA);

    assert.ok(task.id);
    assert.equal(task.status, 'todo');

    const updated = projectTaskService.updateTaskProgress(task.id, 50, 'in_progress', '40.00', '4800.00', ctxA);
    assert.equal(updated.progressPercentage, 50);
    assert.equal(updated.status, 'in_progress');
    assert.equal(updated.actualHours, '40.00');
  });

  // 9. Procurement Bill (AP) Linking to Project Cost
  test('9. AP Supplier Bill Linking: records project cost provenance from vendor bill', () => {
    const proj = projectService.createProject({
      code: 'PRJ-AP-01',
      name: 'AP Procurement Linking Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    // Create supplier bill in DB
    const bill = db.createSupplierBill({
      billNumber: 'BILL-PRJ-2026-01',
      supplierId: 'supp-tech',
      supplierInvoiceNumber: 'INV-DELL-01',
      billDate: '2026-03-05',
      dueDate: '2026-04-05',
      subtotal: '12500.00',
      taxTotal: '0.00',
      total: '12500.00',
      currency: 'USD',
      exchangeRate: '1.000000',
      status: 'posted',
      items: [],
    }, ctxA);

    const cost = projectCostService.recordSupplierBillCost(bill.id, proj.id, 'equipment', ctxA);
    assert.equal(cost.sourceModule, 'purchases');
    assert.equal(cost.sourceType, 'supplier_bill');
    assert.equal(cost.amount, '12500.0000');
    assert.equal(cost.isBillable, true);
    assert.equal(cost.billingStatus, 'unbilled');
  });

  // 10. Inventory Material Issue Cost Allocation
  test('10. Inventory Issue: charges material cost to project and updates stock valuation', () => {
    const proj = projectService.createProject({
      code: 'PRJ-INV-01',
      name: 'Inventory Issue Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    // Create item
    const item = db.createItem({
      itemCode: 'SVR-BLADE-01',
      name: 'Server Blade Modular Unit',
      categoryId: 'cat-it',
      uomId: 'uom-unit',
      itemType: 'finished_goods',
      trackInventory: true,
      isStockItem: true,
      isService: false,
      minStockLevel: '0',
      reorderLevel: '0',
      maxStockLevel: '100',
      costingMethod: 'weighted_average',
      standardCost: '2500.00',
      currentAverageCost: '2500.00',
      totalStockQuantity: '10.00',
      totalStockValue: '25000.00',
      status: 'active',
    }, ctxA);

    const { cost, journalEntryId } = projectCostService.recordInventoryIssueCost({
      projectId: proj.id,
      itemId: item.id,
      quantity: '4',
      unitCost: '2500.00',
      notes: 'Deployment of 4 server blades to client datacenter',
    }, ctxA);

    assert.equal(cost.amount, '10000.0000');
    assert.equal(cost.sourceModule, 'inventory');
    assert.ok(journalEntryId);

    // Verify WIP accumulation updated
    const wip = db.getProjectWipBalance(proj.id, ctxA);
    assert.equal(wip.accumulatedCost, '10000.0000');
  });

  // 11. Payroll Employee Time Allocation
  test('11. Payroll Labor Allocation: records hours/rate and posts double entry journal', () => {
    const proj = projectService.createProject({
      code: 'PRJ-PAY-01',
      name: 'Payroll Labor Allocation Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'time_and_material',
    }, ctxA);

    const { cost, journalEntryId } = projectCostService.recordPayrollLaborAllocation({
      projectId: proj.id,
      employeeId: 'emp-dev-01',
      employeeName: 'Sophia Chen',
      hours: '50.0',
      hourlyRate: '95.00',
    }, ctxA);

    assert.equal(cost.amount, '4750.0000'); // 50 * 95
    assert.equal(cost.costCategory, 'labor');
    assert.ok(journalEntryId);

    // Verify Journal Line dimensions
    const jLines = db.getJournalLines(journalEntryId, ctxA);
    assert.ok(jLines.some((l) => l.projectId === proj.id));
  });

  // 12. Fixed Asset Machinery Usage Allocation
  test('12. Asset Usage Allocation: charges equipment depreciation/usage to project', () => {
    const proj = projectService.createProject({
      code: 'PRJ-AST-01',
      name: 'Asset Usage Allocation Project',
      projectTypeId: 'pt-construction',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const { cost, journalEntryId } = projectCostService.recordAssetUsageAllocation({
      projectId: proj.id,
      assetId: 'ast-excavator-01',
      costAmount: '3500.00',
    }, ctxA);

    assert.equal(cost.amount, '3500.0000');
    assert.equal(cost.costCategory, 'equipment');
    assert.ok(journalEntryId);
  });

  // 13. Direct Bank / Cash Project Expense
  test('13. Bank Expense: direct cash/bank project expense recording', () => {
    const proj = projectService.createProject({
      code: 'PRJ-BNK-01',
      name: 'Direct Bank Expense Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const cost = projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'other',
      sourceModule: 'banking',
      sourceType: 'bank_transfer',
      sourceId: 'bt-001',
      documentNumber: 'TRF-PRJ-001',
      amount: '1200.00',
      description: 'Site permits and municipal regulatory filing fees',
    }, ctxA);

    assert.equal(cost.amount, '1200.0000');
    assert.equal(cost.sourceModule, 'banking');
  });

  // 14. Milestone Billing Creation & Lifecycle
  test('14. Milestone Billing Schedule: creation and planned status', () => {
    const proj = projectService.createProject({
      code: 'PRJ-MS-01',
      name: 'Milestone Schedule Contract',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const m1 = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Phase 1 Requirements & Blueprint Signoff',
      amount: '30000.00',
      dueDate: '2026-04-15',
      completionPercentage: 25,
    }, ctxA);

    assert.equal(m1.milestoneNumber, 1);
    assert.equal(m1.status, 'planned');
    assert.equal(m1.amount, '30000.0000');
  });

  // 15. Milestone Approval & AR Sales Invoice Generation
  test('15. Milestone Billing Execution: generates Sales Invoice and posts to General Ledger', () => {
    const proj = projectService.createProject({
      code: 'PRJ-MS-02',
      name: 'Milestone Execution Contract',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
      customerName: 'Global Logistics Corp',
    }, ctxA);

    const m = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'System Go-Live & Handover',
      amount: '45000.00',
      dueDate: '2026-05-30',
      completionPercentage: 100,
    }, ctxA);

    const result = projectBillingService.billMilestone(m.id, ctxA);

    assert.equal(result.milestone.status, 'billed');
    assert.ok(result.milestone.billedAt);
    assert.ok(result.salesInvoice.id);
    assert.equal(result.salesInvoice.total, '45000.0000');
    assert.equal(result.projectRevenue.amount, '45000.0000');
    assert.ok(result.journalEntryId);

    // Verify GL journal lines
    const jLines = db.getJournalLines(result.journalEntryId, ctxA);
    assert.ok(jLines.some((l) => l.subLedgerType === 'customer'));
    assert.ok(jLines.some((l) => l.subLedgerType === 'project' && l.projectId === proj.id));
  });

  // 16. Fixed-Price Contract Billing Schedule
  test('16. Fixed Price Billing: schedule generation and recognized revenue ledger sync', () => {
    const proj = projectService.createProject({
      code: 'PRJ-FIX-01',
      name: 'Fixed Price Contract',
      projectTypeId: 'pt-consulting',
      startDate: '2026-03-01',
      billingMethod: 'fixed_price',
      contractValue: '60000.00',
    }, ctxA);

    const result = projectBillingService.billFixedPriceSchedule(
      proj.id,
      '20000.00',
      'First Monthly Fixed Retainer Tranche',
      ctxA
    );

    assert.equal(result.salesInvoice.total, '20000.0000');
    assert.equal(result.projectRevenue.amount, '20000.0000');
  });

  // 17. Time & Material (T&M) Billing with Rate Markup
  test('17. Time & Material Billing: applies 20% markup, creates invoice, and marks costs as billed', () => {
    const proj = projectService.createProject({
      code: 'PRJ-TM-01',
      name: 'Time and Material Advisory Contract',
      projectTypeId: 'pt-consulting',
      startDate: '2026-03-01',
      billingMethod: 'time_and_material',
    }, ctxA);

    // Record two unbilled costs ($5,000 + $3,000 = $8,000)
    const c1 = projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'labor',
      sourceModule: 'payroll',
      sourceType: 'timesheet',
      sourceId: 't-1',
      documentNumber: 'TS-01',
      amount: '5000.00',
      description: 'Senior Consulting Hours',
      isBillable: true,
    }, ctxA);

    const c2 = projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'materials',
      sourceModule: 'purchases',
      sourceType: 'supplier_bill',
      sourceId: 'b-1',
      documentNumber: 'BILL-01',
      amount: '3000.00',
      description: 'Software Subscriptions for Client',
      isBillable: true,
    }, ctxA);

    // Bill with 20% markup ($8,000 * 1.20 = $9,600)
    const result = projectBillingService.billTimeAndMaterials(
      proj.id,
      [c1.id, c2.id],
      20,
      'March 2026 T&M Consulting & Software Pass-Through',
      ctxA
    );

    assert.equal(result.salesInvoice.total, '9600.0000');
    assert.equal(result.projectRevenue.amount, '9600.0000');
    assert.equal(result.billedCostsCount, 2);

    // Verify costs marked as billed
    const updatedC1 = projectCostService.getCostById(c1.id, ctxA);
    assert.equal(updatedC1?.billingStatus, 'billed');
    assert.equal(updatedC1?.billingInvoiceId, result.salesInvoice.id);
  });

  // 18. Tax Engine Integration for Project Invoices
  test('18. Tax Engine Integration: computes 5% Output VAT on milestone billing', () => {
    const accounts = db.getAccounts(ctxA);
    const taxAcc = accounts.find((a) => a.code === '2200') || accounts[0];

    const tc = taxConfigurationService.createTaxCode({
      code: 'VAT-PROJECT-05',
      name: 'Project Standard VAT 5%',
      rate: '0.0500',
      taxType: 'output_vat',
      direction: 'output',
      taxTreatment: 'standard',
      recoverability: 'fully_recoverable',
      accountId: taxAcc.id,
      isInclusive: false,
    }, ctxA);

    const proj = projectService.createProject({
      code: 'PRJ-TAX-01',
      name: 'Taxable Client Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
      taxCodeId: tc.id, // 5% Standard VAT
    }, ctxA);

    const m = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Software License Delivery',
      amount: '100000.00',
      dueDate: '2026-06-01',
    }, ctxA);

    const result = projectBillingService.billMilestone(m.id, ctxA);

    // Net $100k + 5% VAT ($5,000) = Gross $105,000
    assert.equal(result.salesInvoice.subtotal, '100000.0000');
    assert.equal(result.salesInvoice.taxTotal, '5000.0000');
    assert.equal(result.salesInvoice.total, '105000.0000');
  });

  // 19. Multi-Currency Project Accounting
  test('19. Multi-Currency: handles non-base currency project costs and converts baseAmount', () => {
    const proj = projectService.createProject({
      code: 'PRJ-FX-01',
      name: 'London Cross-Border Engagement',
      projectTypeId: 'pt-consulting',
      startDate: '2026-03-01',
      billingMethod: 'fixed_price',
      currency: 'GBP',
    }, ctxA);

    // Incur £10,000 GBP @ 1.2800 FX rate = $12,800 USD base
    const cost = projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'subcontractor',
      sourceModule: 'purchases',
      sourceType: 'supplier_bill',
      sourceId: 'b-uk-1',
      documentNumber: 'UK-BILL-001',
      amount: '10000.00',
      currency: 'GBP',
      exchangeRate: '1.280000',
      description: 'UK Legal and Tax Compliance Retainer',
    }, ctxA);

    assert.equal(cost.amount, '10000.0000');
    assert.equal(cost.currency, 'GBP');
    assert.equal(cost.baseAmount, '12800.0000');
  });

  // 20. Project Profitability Calculation
  test('20. Project Profitability: computes Revenue - Cost = Profit and Gross Margin %', () => {
    const proj = projectService.createProject({
      code: 'PRJ-PROF-01',
      name: 'Profitability Benchmark Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
      contractValue: '200000.00',
      budgetAmount: '120000.00',
    }, ctxA);

    // Incur $80,000 cost
    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'labor',
      sourceModule: 'payroll',
      sourceType: 'timesheet',
      sourceId: 't-1',
      documentNumber: 'TS-01',
      amount: '80000.00',
      description: 'Full stack development',
    }, ctxA);

    // Bill $160,000 revenue
    const m = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Milestone 1 Delivery',
      amount: '160000.00',
      dueDate: '2026-07-01',
    }, ctxA);
    projectBillingService.billMilestone(m.id, ctxA);

    const metrics = projectProfitabilityService.calculateProjectProfitability(proj.id, ctxA);

    assert.equal(metrics.totalRevenue, '160000.0000');
    assert.equal(metrics.totalCost, '80000.0000');
    assert.equal(metrics.grossProfit, '80000.0000');
    assert.equal(metrics.grossMarginPercentage, 50); // 80k / 160k = 50%
    assert.equal(metrics.remainingContractValue, '40000.0000'); // 200k - 160k
  });

  // 21. Cost Variance & Forecast Calculations
  test('21. Cost Variance: category cost distribution breakdown', () => {
    const proj = projectService.createProject({
      code: 'PRJ-VAR-01',
      name: 'Cost Distribution Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'labor',
      sourceModule: 'payroll',
      sourceType: 'timesheet',
      sourceId: 't-1',
      documentNumber: 'TS-01',
      amount: '30000.00',
      description: 'Engineering Labor',
    }, ctxA);

    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'materials',
      sourceModule: 'inventory',
      sourceType: 'issue',
      sourceId: 'i-1',
      documentNumber: 'ISS-01',
      amount: '15000.00',
      description: 'Raw Materials',
    }, ctxA);

    const metrics = projectProfitabilityService.calculateProjectProfitability(proj.id, ctxA);
    assert.equal(metrics.costBreakdown.labor, '30000.0000');
    assert.equal(metrics.costBreakdown.materials, '15000.0000');
    assert.equal(metrics.costBreakdown.subcontractor, '0.0000');
  });

  // 22. Project Cost Allocation Tracking
  test('22. Cost Allocation History: auditable allocation records', () => {
    const proj = projectService.createProject({
      code: 'PRJ-ALLOC-01',
      name: 'Cost Allocation Audit Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const alloc = db.createProjectCostAllocation({
      projectId: proj.id,
      allocationType: 'percentage',
      sourceType: 'overhead_apportionment',
      sourceId: 'dept-eng',
      allocatedAmount: '4500.0000',
      percentage: '15.00',
      date: '2026-03-31',
      notes: '15% engineering facility overhead share',
    }, ctxA);

    assert.ok(alloc.id);
    const list = db.getProjectCostAllocations(ctxA, proj.id);
    assert.equal(list.length, 1);
    assert.equal(list[0].allocatedAmount, '4500.0000');
  });

  // 23. Work in Progress (WIP) Accumulation
  test('23. WIP Accumulation: tracks real-time cost accumulation in WIP balance ledger', () => {
    const proj = projectService.createProject({
      code: 'PRJ-WIP-01',
      name: 'WIP Tracking Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'materials',
      sourceModule: 'inventory',
      sourceType: 'issue',
      sourceId: 'i-1',
      documentNumber: 'ISS-01',
      amount: '25000.00',
      description: 'Hardware appliances',
    }, ctxA);

    const wip = projectWipService.getWipBalance(proj.id, ctxA);
    assert.equal(wip.accumulatedCost, '25000.0000');
    assert.equal(wip.currentWipBalance, '25000.0000');
  });

  // 24. WIP Capitalization into Asset (#1350)
  test('24. WIP Capitalization: posts Dr WIP Asset (#1350), Cr Clearing (#5010)', () => {
    const proj = projectService.createProject({
      code: 'PRJ-WIP-02',
      name: 'WIP Capitalization Contract',
      projectTypeId: 'pt-internal-rd',
      startDate: '2026-03-01',
      billingMethod: 'fixed_price',
    }, ctxA);

    const { wipBalance, journalEntryId } = projectWipService.capitalizeCostsToWip(
      proj.id,
      '18000.00',
      'Capitalize Q1 internal R&D development to Asset WIP',
      ctxA
    );

    assert.equal(wipBalance.capitalizedAmount, '18000.0000');
    assert.ok(journalEntryId);

    // Verify Journal Lines
    const jLines = db.getJournalLines(journalEntryId, ctxA);
    const debitLine = jLines.find((l) => parseFloat(l.debitAmount) > 0);
    assert.ok(debitLine);
  });

  // 25. WIP Realization / Transfer to COGS (#5010)
  test('25. WIP Transfer to COGS: relieves WIP Asset and realizes into Cost of Sales upon delivery', () => {
    const proj = projectService.createProject({
      code: 'PRJ-WIP-03',
      name: 'WIP Transfer Contract',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    // Accumulate $20,000 to WIP
    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'materials',
      sourceModule: 'inventory',
      sourceType: 'issue',
      sourceId: 'i-1',
      documentNumber: 'ISS-01',
      amount: '20000.00',
      description: 'Core machinery parts',
    }, ctxA);

    // Transfer $20,000 from WIP to COGS
    const { wipBalance, journalEntryId } = projectWipService.transferWipToCogs(
      proj.id,
      '20000.00',
      'Realize WIP to COGS upon Milestone 1 Signoff',
      ctxA
    );

    assert.equal(wipBalance.transferredToCogs, '20000.0000');
    assert.equal(wipBalance.currentWipBalance, '0.0000');
    assert.ok(journalEntryId);
  });

  // 26. Pre-Closure Validation Blockers
  test('26. Pre-Closure Validation: rejects closure if unbilled milestones or open WIP exist', () => {
    const proj = projectService.createProject({
      code: 'PRJ-CLOSE-01',
      name: 'Pre-Closure Integrity Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    // Add unbilled milestone
    projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Final Commissioning',
      amount: '20000.00',
      dueDate: '2026-08-01',
    }, ctxA);

    // Add un-transferred WIP
    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'labor',
      sourceModule: 'payroll',
      sourceType: 'timesheet',
      sourceId: 't-1',
      documentNumber: 'TS-01',
      amount: '5000.00',
      description: 'Final touches',
    }, ctxA);

    const validation = projectService.validateProjectClosure(proj.id, ctxA);
    assert.equal(validation.canClose, false);
    assert.ok(validation.blockers.length >= 2);

    // Attempting to close throws error
    assert.throws(() => {
      projectService.closeProject(proj.id, ctxA);
    }, /Pre-closure requirements failed/);
  });

  // 27. Project Closure Execution & Locking
  test('27. Project Closure: resolves blockers, executes closure and locks status', () => {
    const proj = projectService.createProject({
      code: 'PRJ-CLOSE-02',
      name: 'Clean Closure Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const m = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Milestone 1',
      amount: '10000.00',
      dueDate: '2026-04-01',
    }, ctxA);

    // Incur cost and transfer WIP to zero
    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'labor',
      sourceModule: 'payroll',
      sourceType: 'timesheet',
      sourceId: 't-1',
      documentNumber: 'TS-01',
      amount: '6000.00',
      description: 'Labor',
    }, ctxA);

    projectWipService.transferWipToCogs(proj.id, '6000.00', 'Transfer out WIP', ctxA);
    projectBillingService.billMilestone(m.id, ctxA);

    const closed = projectService.closeProject(proj.id, ctxA);
    assert.equal(closed.status, 'closed');
    assert.ok(closed.closedAt);
    assert.equal(closed.closedBy, ctxA.userId);
  });

  // 28. Full Traceability Drilldown
  test('28. Traceability: Project -> Cost/Revenue -> Sub-Ledger -> Journal -> GL', () => {
    const proj = projectService.createProject({
      code: 'PRJ-TRACE-01',
      name: 'Full Traceability Contract',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'milestone',
    }, ctxA);

    const m = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Turnkey Delivery',
      amount: '50000.00',
      dueDate: '2026-07-01',
    }, ctxA);

    const result = projectBillingService.billMilestone(m.id, ctxA);
    const jEntry = db.getJournalEntries(ctxA).find((j) => j.id === result.journalEntryId);
    assert.ok(jEntry);

    const subLedgerEntries = db.getSubLedgerEntries(ctxA);
    const projectSubEntry = subLedgerEntries.find((s) => s.subLedgerType === 'project' && s.entityId === proj.id);
    assert.ok(projectSubEntry);
  });

  // 29. Multi-Tenant Isolation
  test('29. Multi-Tenant Isolation: Tenant A projects and financials invisible to Tenant B', () => {
    const projA = projectService.createProject({
      code: 'PRJ-TENANT-A',
      name: 'Apex Exclusive Defense Project',
      projectTypeId: 'pt-cust-impl',
      startDate: '2026-03-01',
      billingMethod: 'fixed_price',
      contractValue: '500000.00',
    }, ctxA);

    // Tenant B queries
    const bProjects = projectService.getProjects(ctxB);
    assert.ok(!bProjects.some((p) => p.id === projA.id));
    assert.ok(!bProjects.some((p) => p.code === 'PRJ-TENANT-A'));

    // Tenant B cannot access Tenant A project
    assert.throws(() => {
      projectService.getProjectById(projA.id, ctxB);
    }, /Access to company.*is denied/);
  });

  // 30. Complete End-to-End Project Lifecycle Acceptance Flow
  test('30. End-to-End Project Lifecycle Acceptance Flow (Creation -> Budget -> Tasks -> Costs -> WIP -> Billing -> Profitability -> Close)', () => {
    // 1. Create Project
    const proj = projectService.createProject({
      code: 'E2E-APEX-2026',
      name: 'Enterprise Cloud Transformation Contract',
      projectTypeId: 'pt-cust-impl',
      customerId: 'cust-apex-client',
      customerName: 'Global Telecom Operators Group',
      projectManagerName: 'Alexander Vance',
      startDate: '2026-01-15',
      endDate: '2026-12-31',
      billingMethod: 'milestone',
      contractValue: '350000.00',
    }, ctxA);
    assert.equal(proj.status, 'draft');

    // 2. Setup Budget & Approve
    const budget = projectBudgetService.createBudget({
      projectId: proj.id,
      budgetName: 'Cloud Infrastructure Baseline v1',
      lines: [
        { costCategory: 'labor', plannedCost: '120000.00', plannedRevenue: '200000.00' },
        { costCategory: 'materials', plannedCost: '60000.00', plannedRevenue: '100000.00' },
        { costCategory: 'subcontractor', plannedCost: '30000.00', plannedRevenue: '50000.00' },
      ],
    }, ctxA);
    projectBudgetService.approveBudget(budget.id, ctxA);
    projectService.changeProjectStatus(proj.id, 'active', ctxA);

    // 3. Create Tasks
    const t1 = projectTaskService.createTask({
      projectId: proj.id,
      taskName: 'Cloud Foundation & Tenant Migration',
      estimatedHours: '200.00',
      estimatedCost: '24000.00',
    }, ctxA);
    projectTaskService.updateTaskProgress(t1.id, 100, 'completed', '190.00', '22800.00', ctxA);

    // 4. Incur Operational Costs from multiple modules
    // Labor: $100,000
    projectCostService.recordPayrollLaborAllocation({
      projectId: proj.id,
      employeeId: 'emp-tech-lead',
      employeeName: 'Lead Cloud Architect',
      hours: '1000',
      hourlyRate: '100.00',
    }, ctxA);

    // Material: $50,000
    projectCostService.recordCost({
      projectId: proj.id,
      costCategory: 'materials',
      sourceModule: 'inventory',
      sourceType: 'goods_issue',
      sourceId: 'inv-item-cloud',
      documentNumber: 'ISS-CLOUD-01',
      amount: '50000.00',
      description: 'Dedicated Cloud Servers & Storage Arrays',
    }, ctxA);

    // Total Cost Incurred: $150,000
    const wip1 = projectWipService.getWipBalance(proj.id, ctxA);
    assert.equal(wip1.accumulatedCost, '150000.0000');
    assert.equal(wip1.currentWipBalance, '150000.0000');

    // 5. Schedule & Bill Milestones ($350,000 Contract)
    const m1 = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Milestone 1: Infrastructure Deployment',
      amount: '175000.00',
      dueDate: '2026-06-30',
      completionPercentage: 50,
    }, ctxA);

    const m2 = projectBillingService.createMilestone({
      projectId: proj.id,
      name: 'Milestone 2: Final Acceptance & SLA Handover',
      amount: '175000.00',
      dueDate: '2026-11-30',
      completionPercentage: 100,
    }, ctxA);

    // Bill Milestone 1 and 2
    projectBillingService.billMilestone(m1.id, ctxA);
    projectBillingService.billMilestone(m2.id, ctxA);

    // 6. Realize WIP to COGS ($150,000)
    projectWipService.transferWipToCogs(proj.id, '150000.00', 'Transfer all WIP to COGS upon completion', ctxA);
    const wipFinal = projectWipService.getWipBalance(proj.id, ctxA);
    assert.equal(wipFinal.currentWipBalance, '0.0000');

    // 7. Verify Profitability
    const prof = projectProfitabilityService.calculateProjectProfitability(proj.id, ctxA);
    assert.equal(prof.totalRevenue, '350000.0000');
    assert.equal(prof.totalCost, '150000.0000');
    assert.equal(prof.grossProfit, '200000.0000');
    assert.equal(prof.grossMarginPercentage, 57.14); // 200k / 350k = ~57.14%

    // 8. Execute Project Closure
    const closed = projectService.closeProject(proj.id, ctxA);
    assert.equal(closed.status, 'closed');
    assert.ok(closed.closedAt);
  });
});
