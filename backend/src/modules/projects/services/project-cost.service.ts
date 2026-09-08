// ============================================================================
// Project Cost Ledger & Operational Ingestion Engine (Phase 12: Project Costing)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbProjectCost, 
  ProjectCostCategory, 
  ProjectCostSourceModule,
  ProjectCostBillingStatus 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface RecordProjectCostInput {
  projectId: string;
  costCategory: ProjectCostCategory;
  sourceModule: ProjectCostSourceModule;
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  transactionDate?: string;
  amount: string;
  currency?: string;
  exchangeRate?: string;
  departmentId?: string;
  costCenterId?: string;
  description: string;
  journalEntryId?: string;
  taskId?: string;
  employeeId?: string;
  assetId?: string;
  isBillable?: boolean;
  billingStatus?: ProjectCostBillingStatus;
  billingInvoiceId?: string;
}

export interface PayrollLaborAllocationInput {
  projectId: string;
  employeeId: string;
  employeeName?: string;
  hours: string;
  hourlyRate: string;
  costCategory?: ProjectCostCategory;
  date?: string;
  departmentId?: string;
  costCenterId?: string;
  notes?: string;
  isBillable?: boolean;
  postJournal?: boolean;
}

export interface InventoryMaterialIssueInput {
  projectId: string;
  itemId: string;
  warehouseId?: string;
  quantity: string;
  unitCost: string;
  date?: string;
  departmentId?: string;
  costCenterId?: string;
  notes?: string;
  isBillable?: boolean;
  postJournal?: boolean;
}

export interface AssetUsageAllocationInput {
  projectId: string;
  assetId: string;
  costAmount: string;
  date?: string;
  notes?: string;
  postJournal?: boolean;
}

export class ProjectCostService {
  public getCosts(ctx: TenantContext, projectId?: string): DbProjectCost[] {
    return db.getProjectCosts(ctx, projectId);
  }

  public getCostById(id: string, ctx: TenantContext): DbProjectCost | undefined {
    return db.getProjectCostById(id, ctx);
  }

  public recordCost(input: RecordProjectCostInput, ctx: TenantContext): DbProjectCost {
    const project = db.getProjectById(input.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${input.projectId}' not found.`);

    const currency = input.currency || project.currency || ctx.baseCurrency;
    const exchangeRate = input.exchangeRate || '1.000000';
    const amountVal = parseFloat(input.amount || '0') || 0;
    if (amountVal <= 0) {
      throw new DomainValidationError('Project cost amount must be greater than 0.');
    }

    const rateVal = parseFloat(exchangeRate) || 1;
    const baseAmount = (amountVal * rateVal).toFixed(4);

    return db.createProjectCost({
      projectId: input.projectId,
      costCategory: input.costCategory,
      sourceModule: input.sourceModule,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      documentNumber: input.documentNumber,
      transactionDate: input.transactionDate || new Date().toISOString().slice(0, 10),
      amount: amountVal.toFixed(4),
      currency,
      exchangeRate,
      baseAmount,
      departmentId: input.departmentId || project.departmentId,
      costCenterId: input.costCenterId || project.costCenterId,
      description: input.description,
      journalEntryId: input.journalEntryId,
      taskId: input.taskId,
      employeeId: input.employeeId,
      assetId: input.assetId,
      isBillable: input.isBillable !== false,
      billingStatus: input.billingStatus || (input.isBillable !== false ? 'unbilled' : 'non_billable'),
      billingInvoiceId: input.billingInvoiceId,
    }, ctx);
  }

  // --- Sourced Procurement Bill Cost Linking ---
  public recordSupplierBillCost(
    billId: string,
    projectId: string,
    costCategory: ProjectCostCategory = 'materials',
    ctx: TenantContext
  ): DbProjectCost {
    const bill = db.getSupplierBills(ctx).find((b) => b.id === billId);
    if (!bill) throw new DomainValidationError(`Supplier bill '${billId}' not found.`);

    return this.recordCost({
      projectId,
      costCategory,
      sourceModule: 'purchases',
      sourceType: 'supplier_bill',
      sourceId: bill.id,
      documentNumber: bill.billNumber,
      transactionDate: bill.billDate,
      amount: bill.subtotal || bill.total,
      currency: bill.currency,
      exchangeRate: bill.exchangeRate,
      description: `Direct Supplier Bill (${bill.billNumber})`,
      journalEntryId: bill.journalEntryId,
      isBillable: true,
      billingStatus: 'unbilled',
    }, ctx);
  }

  // --- Sourced Inventory Material Issue Cost ---
  public recordInventoryIssueCost(
    input: InventoryMaterialIssueInput,
    ctx: TenantContext
  ): { cost: DbProjectCost; journalEntryId?: string } {
    const project = db.getProjectById(input.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${input.projectId}' not found.`);

    const item = db.getItems(ctx).find((i) => i.id === input.itemId);
    if (!item) throw new DomainValidationError(`Inventory item '${input.itemId}' not found.`);

    const qty = parseFloat(input.quantity || '0') || 0;
    const unitCost = parseFloat(input.unitCost || '0') || 0;
    const totalCost = qty * unitCost;

    if (totalCost <= 0) {
      throw new DomainValidationError('Material issue total cost must be greater than zero.');
    }

    const docNum = `INV-ISS-${Date.now().toString(36).toUpperCase()}`;
    const date = input.date || new Date().toISOString().slice(0, 10);

    let journalEntryId: string | undefined;

    if (input.postJournal !== false) {
      // Dr Project Direct Cost / COGS (#5010), Cr Inventory Asset (#1300)
      const posting = accountingPostingService.post(
        'PROJECT_COST_ALLOCATED',
        {
          sourceType: 'goods_issue',
          sourceId: `issue-${input.itemId}`,
          documentNumber: docNum,
          documentDate: date,
          amount: totalCost.toFixed(4),
          currency: project.currency,
          exchangeRate: '1.000000',
          projectId: input.projectId,
          subLedgerType: 'project',
          subLedgerEntityId: input.projectId,
          departmentId: input.departmentId || project.departmentId,
          costCenterId: input.costCenterId || project.costCenterId,
          memo: `Inventory Material Issue: ${qty}x ${item.name} for Project ${project.code}`,
        },
        ctx
      );
      journalEntryId = posting.id;
    }

    const cost = this.recordCost({
      projectId: input.projectId,
      costCategory: 'materials',
      sourceModule: 'inventory',
      sourceType: 'goods_issue',
      sourceId: input.itemId,
      documentNumber: docNum,
      transactionDate: date,
      amount: totalCost.toFixed(4),
      currency: project.currency,
      exchangeRate: '1.000000',
      departmentId: input.departmentId || project.departmentId,
      costCenterId: input.costCenterId || project.costCenterId,
      description: `Material Issue: ${qty} units of ${item.name} (${item.itemCode})`,
      journalEntryId,
      isBillable: input.isBillable !== false,
      billingStatus: input.isBillable !== false ? 'unbilled' : 'non_billable',
    }, ctx);

    return { cost, journalEntryId };
  }

  // --- Sourced Employee Payroll Labor Allocation ---
  public recordPayrollLaborAllocation(
    input: PayrollLaborAllocationInput,
    ctx: TenantContext
  ): { cost: DbProjectCost; journalEntryId?: string } {
    const project = db.getProjectById(input.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${input.projectId}' not found.`);

    const employee = db.getEmployees(ctx).find((e) => e.id === input.employeeId);
    const empName = input.employeeName || (employee ? `${employee.firstName} ${employee.lastName}` : 'Direct Labor');

    const hours = parseFloat(input.hours || '0') || 0;
    const rate = parseFloat(input.hourlyRate || '0') || 0;
    const totalAmount = hours * rate;

    if (totalAmount <= 0) {
      throw new DomainValidationError('Labor allocation amount must be greater than zero.');
    }

    const docNum = `LABOR-${Date.now().toString(36).toUpperCase()}`;
    const date = input.date || new Date().toISOString().slice(0, 10);

    let journalEntryId: string | undefined;

    if (input.postJournal !== false) {
      // Dr Project Labor Cost (#5010), Cr Accrued Salaries Payable (#2300)
      const posting = accountingPostingService.post(
        'PROJECT_COST_ALLOCATED',
        {
          sourceType: 'timesheet_allocation',
          sourceId: `labor-${input.employeeId}`,
          documentNumber: docNum,
          documentDate: date,
          amount: totalAmount.toFixed(4),
          currency: project.currency,
          exchangeRate: '1.000000',
          projectId: input.projectId,
          subLedgerType: 'project',
          subLedgerEntityId: input.projectId,
          departmentId: input.departmentId || project.departmentId,
          costCenterId: input.costCenterId || project.costCenterId,
          memo: `Labor Time Allocation: ${hours}h by ${empName} for Project ${project.code}`,
        },
        ctx
      );
      journalEntryId = posting.id;
    }

    const cost = this.recordCost({
      projectId: input.projectId,
      costCategory: input.costCategory || 'labor',
      sourceModule: 'payroll',
      sourceType: 'timesheet_allocation',
      sourceId: input.employeeId,
      documentNumber: docNum,
      transactionDate: date,
      amount: totalAmount.toFixed(4),
      currency: project.currency,
      exchangeRate: '1.000000',
      departmentId: input.departmentId || project.departmentId,
      costCenterId: input.costCenterId || project.costCenterId,
      description: `Labor Allocation: ${hours}h @ $${rate}/h by ${empName}`,
      employeeId: input.employeeId,
      journalEntryId,
      isBillable: input.isBillable !== false,
      billingStatus: input.isBillable !== false ? 'unbilled' : 'non_billable',
    }, ctx);

    // Also record in project cost allocations history
    db.createProjectCostAllocation({
      projectId: input.projectId,
      allocationType: 'hours',
      sourceType: 'payroll_timesheet',
      sourceId: input.employeeId,
      allocatedAmount: totalAmount.toFixed(4),
      hours: hours.toFixed(2),
      employeeId: input.employeeId,
      journalEntryId,
      date,
      notes: input.notes,
    }, ctx);

    return { cost, journalEntryId };
  }

  // --- Sourced Fixed Asset Usage Allocation ---
  public recordAssetUsageAllocation(
    input: AssetUsageAllocationInput,
    ctx: TenantContext
  ): { cost: DbProjectCost; journalEntryId?: string } {
    const project = db.getProjectById(input.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${input.projectId}' not found.`);

    const asset = db.getFixedAssets(ctx).find((a) => a.id === input.assetId);
    const assetName = asset ? asset.name : 'Machinery/Equipment';

    const costVal = parseFloat(input.costAmount || '0') || 0;
    if (costVal <= 0) {
      throw new DomainValidationError('Asset usage allocation cost must be greater than zero.');
    }

    const docNum = `AST-USE-${Date.now().toString(36).toUpperCase()}`;
    const date = input.date || new Date().toISOString().slice(0, 10);

    let journalEntryId: string | undefined;

    if (input.postJournal !== false) {
      const posting = accountingPostingService.post(
        'PROJECT_COST_ALLOCATED',
        {
          sourceType: 'asset_usage',
          sourceId: input.assetId,
          documentNumber: docNum,
          documentDate: date,
          amount: costVal.toFixed(4),
          currency: project.currency,
          exchangeRate: '1.000000',
          projectId: input.projectId,
          subLedgerType: 'project',
          subLedgerEntityId: input.projectId,
          departmentId: project.departmentId,
          costCenterId: project.costCenterId,
          memo: `Equipment Usage: ${assetName} for Project ${project.code}`,
        },
        ctx
      );
      journalEntryId = posting.id;
    }

    const cost = this.recordCost({
      projectId: input.projectId,
      costCategory: 'equipment',
      sourceModule: 'assets',
      sourceType: 'asset_usage',
      sourceId: input.assetId,
      documentNumber: docNum,
      transactionDate: date,
      amount: costVal.toFixed(4),
      currency: project.currency,
      exchangeRate: '1.000000',
      departmentId: project.departmentId,
      costCenterId: project.costCenterId,
      description: `Equipment Usage Allocation: ${assetName} ($${costVal})`,
      assetId: input.assetId,
      journalEntryId,
      isBillable: true,
      billingStatus: 'unbilled',
    }, ctx);

    return { cost, journalEntryId };
  }

  // --- Mark Costs as Billed ---
  public markCostsAsBilled(costIds: string[], invoiceId: string, ctx: TenantContext): void {
    for (const id of costIds) {
      db.updateProjectCost(id, {
        billingStatus: 'billed',
        billingInvoiceId: invoiceId,
      }, ctx);
    }
  }
}

export const projectCostService = new ProjectCostService();
