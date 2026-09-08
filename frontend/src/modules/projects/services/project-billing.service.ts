// ============================================================================
// Project Billing & Revenue Invoicing Engine (Phase 12: Project Billing)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbProjectMilestone, 
  DbProjectRevenue, 
  DbSalesInvoice 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';
import { taxCalculatorService } from '@/modules/tax/services/tax-calculator.service';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { projectCostService } from './project-cost.service';

export interface CreateProjectMilestonePayload {
  projectId: string;
  milestoneNumber?: number;
  name: string;
  description?: string;
  amount: string;
  currency?: string;
  dueDate: string;
  completionPercentage?: number;
}

export interface BillMilestoneResult {
  milestone: DbProjectMilestone;
  salesInvoice: DbSalesInvoice;
  projectRevenue: DbProjectRevenue;
  journalEntryId: string;
}

export class ProjectBillingService {
  public getMilestones(ctx: TenantContext, projectId?: string): DbProjectMilestone[] {
    return db.getProjectMilestones(ctx, projectId);
  }

  public getMilestoneById(id: string, ctx: TenantContext): DbProjectMilestone | undefined {
    return db.getProjectMilestoneById(id, ctx);
  }

  public createMilestone(payload: CreateProjectMilestonePayload, ctx: TenantContext): DbProjectMilestone {
    const project = db.getProjectById(payload.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${payload.projectId}' not found.`);

    if (!payload.name || !payload.dueDate) {
      throw new DomainValidationError('Milestone Name and Due Date are mandatory.');
    }

    const amountVal = parseFloat(payload.amount || '0') || 0;
    if (amountVal <= 0) {
      throw new DomainValidationError('Milestone amount must be greater than zero.');
    }

    const existing = db.getProjectMilestones(ctx, payload.projectId);
    const milestoneNumber = payload.milestoneNumber || existing.length + 1;

    return db.createProjectMilestone({
      projectId: payload.projectId,
      milestoneNumber,
      name: payload.name.trim(),
      description: payload.description,
      amount: amountVal.toFixed(4),
      currency: payload.currency || project.currency || ctx.baseCurrency,
      dueDate: payload.dueDate,
      completionPercentage: payload.completionPercentage || 0,
      status: 'planned',
    }, ctx);
  }

  public updateMilestone(
    id: string, 
    payload: Partial<DbProjectMilestone>, 
    ctx: TenantContext
  ): DbProjectMilestone {
    const milestone = db.getProjectMilestoneById(id, ctx);
    if (!milestone) throw new DomainValidationError(`Milestone '${id}' not found.`);

    if (milestone.status === 'billed' && payload.status && payload.status !== 'billed') {
      throw new DomainValidationError(`Cannot modify already billed milestone '${id}'.`);
    }

    return db.updateProjectMilestone(id, payload, ctx);
  }

  public approveMilestone(id: string, ctx: TenantContext): DbProjectMilestone {
    const milestone = db.getProjectMilestoneById(id, ctx);
    if (!milestone) throw new DomainValidationError(`Milestone '${id}' not found.`);
    if (milestone.status === 'billed') {
      throw new DomainValidationError('Milestone is already billed.');
    }

    return db.updateProjectMilestone(id, {
      status: 'approved',
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  // --- 1. Milestone Billing Engine ---
  public billMilestone(milestoneId: string, ctx: TenantContext): BillMilestoneResult {
    const milestone = db.getProjectMilestoneById(milestoneId, ctx);
    if (!milestone) throw new DomainValidationError(`Milestone '${milestoneId}' not found.`);
    if (milestone.status === 'billed') {
      throw new DomainValidationError(`Milestone '${milestone.name}' has already been billed.`);
    }

    const project = db.getProjectById(milestone.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${milestone.projectId}' not found.`);

    const customerId = project.customerId || 'cust-direct';
    const invoiceNum = `INV-PRJ-${project.code}-M${milestone.milestoneNumber}`;
    const invoiceDate = new Date().toISOString().slice(0, 10);
    const amountVal = parseFloat(milestone.amount);

    // Calculate tax if taxCode is assigned
    let taxAmount = 0;
    let taxCodeId = project.taxCodeId;
    if (taxCodeId) {
      const taxCodes = db.getTaxCodes(ctx);
      const taxCode = taxCodes.find((t) => t.id === taxCodeId || t.code === taxCodeId);
      if (taxCode) {
        const taxCalc = taxCalculatorService.calculateLine({
          unitPrice: milestone.amount,
          quantity: '1',
          taxCode,
          isInclusive: false,
        });
        taxAmount = parseFloat(taxCalc.taxAmount);
      }
    }

    const totalAmount = amountVal + taxAmount;

    // 1. Post to Central Accounting Posting Engine
    const posting = accountingPostingService.post(
      'PROJECT_BILLING_POSTED',
      {
        sourceType: 'sales_invoice',
        sourceId: `inv-${milestone.id}`,
        documentNumber: invoiceNum,
        documentDate: invoiceDate,
        amount: totalAmount.toFixed(4),
        taxAmount: taxAmount.toFixed(4),
        currency: milestone.currency,
        exchangeRate: '1.000000',
        taxCodeId,
        projectId: project.id,
        subLedgerType: 'customer',
        subLedgerEntityId: customerId,
        departmentId: project.departmentId,
        costCenterId: project.costCenterId,
        memo: `Milestone Billing: ${milestone.name} for Project ${project.code}`,
      },
      ctx
    );

    // 2. Create standard Sales Invoice in AR
    const salesInvoice = db.createSalesInvoice({
      invoiceNumber: invoiceNum,
      customerId,
      invoiceDate,
      dueDate: milestone.dueDate || invoiceDate,
      subtotal: amountVal.toFixed(4),
      discountTotal: '0.0000',
      taxTotal: taxAmount.toFixed(4),
      total: totalAmount.toFixed(4),
      amountPaid: '0.0000',
      balanceDue: totalAmount.toFixed(4),
      currency: milestone.currency,
      exchangeRate: '1.000000',
      status: 'posted',
      journalEntryId: posting.id,
      items: [
        {
          id: `item-${milestone.id}`,
          description: `Contract Milestone #${milestone.milestoneNumber}: ${milestone.name}`,
          quantity: '1.0000',
          unitPrice: amountVal.toFixed(4),
          discountRate: '0.0000',
          taxCodeId,
          taxRate: taxCodeId ? '0.0500' : '0.0000',
          taxAmount: taxAmount.toFixed(4),
          subtotal: amountVal.toFixed(4),
          total: totalAmount.toFixed(4),
        }
      ],
    }, ctx);

    // 3. Record Project Revenue
    const projectRevenue = db.createProjectRevenue({
      projectId: project.id,
      sourceModule: 'billing',
      sourceType: 'milestone_invoice',
      sourceId: milestone.id,
      documentNumber: invoiceNum,
      transactionDate: invoiceDate,
      amount: amountVal.toFixed(4),
      currency: milestone.currency,
      exchangeRate: '1.000000',
      baseAmount: amountVal.toFixed(4),
      milestoneId: milestone.id,
      salesInvoiceId: salesInvoice.id,
      journalEntryId: posting.id,
      description: `Billed Milestone #${milestone.milestoneNumber}: ${milestone.name}`,
    }, ctx);

    // 4. Update Milestone to 'billed'
    const updatedMilestone = db.updateProjectMilestone(milestoneId, {
      status: 'billed',
      salesInvoiceId: salesInvoice.id,
      billedAt: new Date().toISOString(),
    }, ctx);

    return {
      milestone: updatedMilestone,
      salesInvoice,
      projectRevenue,
      journalEntryId: posting.id,
    };
  }

  // --- 2. Fixed-Price Schedule Billing Engine ---
  public billFixedPriceSchedule(
    projectId: string,
    amount: string,
    description: string,
    ctx: TenantContext
  ): { salesInvoice: DbSalesInvoice; projectRevenue: DbProjectRevenue; journalEntryId: string } {
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    const amountVal = parseFloat(amount || '0') || 0;
    if (amountVal <= 0) throw new DomainValidationError('Billing amount must be greater than zero.');

    const invoiceNum = `INV-FIXED-${project.code}-${Date.now().toString(36).toUpperCase()}`;
    const invoiceDate = new Date().toISOString().slice(0, 10);

    const posting = accountingPostingService.post(
      'PROJECT_BILLING_POSTED',
      {
        sourceType: 'sales_invoice',
        sourceId: `inv-fixed-${Date.now()}`,
        documentNumber: invoiceNum,
        documentDate: invoiceDate,
        amount: amountVal.toFixed(4),
        taxAmount: '0.0000',
        currency: project.currency,
        exchangeRate: '1.000000',
        projectId: project.id,
        subLedgerType: 'customer',
        subLedgerEntityId: project.customerId || 'cust-direct',
        departmentId: project.departmentId,
        costCenterId: project.costCenterId,
        memo: `Fixed Price Billing: ${description} (${project.code})`,
      },
      ctx
    );

    const salesInvoice = db.createSalesInvoice({
      invoiceNumber: invoiceNum,
      customerId: project.customerId || 'cust-direct',
      invoiceDate,
      dueDate: invoiceDate,
      subtotal: amountVal.toFixed(4),
      discountTotal: '0.0000',
      taxTotal: '0.0000',
      total: amountVal.toFixed(4),
      amountPaid: '0.0000',
      balanceDue: amountVal.toFixed(4),
      currency: project.currency,
      exchangeRate: '1.000000',
      status: 'posted',
      journalEntryId: posting.id,
      items: [
        {
          id: `item-fixed-${Date.now()}`,
          description,
          quantity: '1.0000',
          unitPrice: amountVal.toFixed(4),
          discountRate: '0.0000',
          taxAmount: '0.0000',
          subtotal: amountVal.toFixed(4),
          total: amountVal.toFixed(4),
        }
      ],
    }, ctx);

    const projectRevenue = db.createProjectRevenue({
      projectId: project.id,
      sourceModule: 'billing',
      sourceType: 'fixed_price_schedule',
      sourceId: salesInvoice.id,
      documentNumber: invoiceNum,
      transactionDate: invoiceDate,
      amount: amountVal.toFixed(4),
      currency: project.currency,
      exchangeRate: '1.000000',
      baseAmount: amountVal.toFixed(4),
      salesInvoiceId: salesInvoice.id,
      journalEntryId: posting.id,
      description,
    }, ctx);

    return { salesInvoice, projectRevenue, journalEntryId: posting.id };
  }

  // --- 3. Time & Material (T&M) Billing Engine ---
  public billTimeAndMaterials(
    projectId: string,
    costIds: string[],
    markupPercentage: number = 0,
    description?: string,
    ctx?: TenantContext
  ): { salesInvoice: DbSalesInvoice; projectRevenue: DbProjectRevenue; journalEntryId: string; billedCostsCount: number } {
    if (!ctx) throw new Error('Tenant context required');
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    const allCosts = db.getProjectCosts(ctx, projectId);
    const selectedCosts = allCosts.filter((c) => costIds.includes(c.id));

    if (selectedCosts.length === 0) {
      throw new DomainValidationError('No valid project costs selected for T&M billing.');
    }

    const baseCostTotal = selectedCosts.reduce((acc, c) => acc + parseFloat(c.baseAmount || '0'), 0);
    const markupFactor = 1 + (markupPercentage / 100);
    const billableAmount = baseCostTotal * markupFactor;

    const invoiceNum = `INV-TM-${project.code}-${Date.now().toString(36).toUpperCase()}`;
    const invoiceDate = new Date().toISOString().slice(0, 10);
    const memo = description || `Time & Material Billing for ${selectedCosts.length} items (${project.code})`;

    const posting = accountingPostingService.post(
      'PROJECT_BILLING_POSTED',
      {
        sourceType: 'sales_invoice',
        sourceId: `inv-tm-${Date.now()}`,
        documentNumber: invoiceNum,
        documentDate: invoiceDate,
        amount: billableAmount.toFixed(4),
        taxAmount: '0.0000',
        currency: project.currency,
        exchangeRate: '1.000000',
        projectId: project.id,
        subLedgerType: 'customer',
        subLedgerEntityId: project.customerId || 'cust-direct',
        departmentId: project.departmentId,
        costCenterId: project.costCenterId,
        memo,
      },
      ctx
    );

    const salesInvoice = db.createSalesInvoice({
      invoiceNumber: invoiceNum,
      customerId: project.customerId || 'cust-direct',
      invoiceDate,
      dueDate: invoiceDate,
      subtotal: billableAmount.toFixed(4),
      discountTotal: '0.0000',
      taxTotal: '0.0000',
      total: billableAmount.toFixed(4),
      amountPaid: '0.0000',
      balanceDue: billableAmount.toFixed(4),
      currency: project.currency,
      exchangeRate: '1.000000',
      status: 'posted',
      journalEntryId: posting.id,
      items: selectedCosts.map((c) => ({
        id: `item-${c.id}`,
        description: `${c.costCategory.toUpperCase()}: ${c.description}`,
        quantity: '1.0000',
        unitPrice: (parseFloat(c.amount) * markupFactor).toFixed(4),
        discountRate: '0.0000',
        taxAmount: '0.0000',
        subtotal: (parseFloat(c.amount) * markupFactor).toFixed(4),
        total: (parseFloat(c.amount) * markupFactor).toFixed(4),
      })),
    }, ctx);

    // Mark costs as billed
    projectCostService.markCostsAsBilled(selectedCosts.map((c) => c.id), salesInvoice.id, ctx);

    const projectRevenue = db.createProjectRevenue({
      projectId: project.id,
      sourceModule: 'billing',
      sourceType: 'time_and_material',
      sourceId: salesInvoice.id,
      documentNumber: invoiceNum,
      transactionDate: invoiceDate,
      amount: billableAmount.toFixed(4),
      currency: project.currency,
      exchangeRate: '1.000000',
      baseAmount: billableAmount.toFixed(4),
      salesInvoiceId: salesInvoice.id,
      journalEntryId: posting.id,
      description: memo,
    }, ctx);

    return {
      salesInvoice,
      projectRevenue,
      journalEntryId: posting.id,
      billedCostsCount: selectedCosts.length,
    };
  }
}

export const projectBillingService = new ProjectBillingService();
