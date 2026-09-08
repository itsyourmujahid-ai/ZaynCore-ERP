// ============================================================================
// Project Budget & Budget vs Actual Service (Phase 12: Project Management)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbProjectBudget, 
  DbProjectBudgetLine, 
  ProjectCostCategory 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError, ImmutableRecordError } from '@/core/errors/DomainErrors';

export interface CreateBudgetLineInput {
  costCategory: ProjectCostCategory;
  revenueCategory?: string;
  phase?: string;
  departmentId?: string;
  costCenterId?: string;
  plannedQuantity?: string;
  unitCost?: string;
  plannedCost: string;
  plannedRevenue?: string;
  notes?: string;
}

export interface CreateProjectBudgetPayload {
  projectId: string;
  budgetName: string;
  periodStartDate?: string;
  periodEndDate?: string;
  notes?: string;
  lines?: CreateBudgetLineInput[];
}

export interface CategoryBudgetVsActual {
  category: ProjectCostCategory;
  plannedCost: string;
  actualCost: string;
  costVariance: string; // planned - actual (positive is favorable under-budget)
  costVariancePercentage: number;
  remainingBudget: string;
  plannedRevenue: string;
  actualRevenue: string;
  revenueVariance: string;
}

export interface ProjectBudgetVsActualSummary {
  projectId: string;
  projectCode: string;
  projectName: string;
  currency: string;
  activeBudgetId?: string;
  activeBudgetVersion?: number;
  totalPlannedCost: string;
  totalActualCost: string;
  totalCostVariance: string;
  totalCostVariancePercentage: number;
  totalRemainingBudget: string;
  totalPlannedRevenue: string;
  totalActualRevenue: string;
  totalRevenueVariance: string;
  categories: CategoryBudgetVsActual[];
}

export class ProjectBudgetService {
  public getBudgets(ctx: TenantContext, projectId?: string): DbProjectBudget[] {
    return db.getProjectBudgets(ctx, projectId);
  }

  public getBudgetById(id: string, ctx: TenantContext): DbProjectBudget | undefined {
    return db.getProjectBudgetById(id, ctx);
  }

  public getBudgetLines(budgetId: string, ctx: TenantContext): DbProjectBudgetLine[] {
    return db.getProjectBudgetLines(budgetId, ctx);
  }

  public createBudget(payload: CreateProjectBudgetPayload, ctx: TenantContext): DbProjectBudget {
    const project = db.getProjectById(payload.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${payload.projectId}' not found.`);

    // Check version number (increment if revisions exist)
    const existingBudgets = db.getProjectBudgets(ctx, payload.projectId);
    const versionNumber = existingBudgets.length + 1;

    let totalPlannedCost = 0;
    let totalPlannedRevenue = 0;

    if (payload.lines && payload.lines.length > 0) {
      for (const line of payload.lines) {
        totalPlannedCost += parseFloat(line.plannedCost || '0') || 0;
        totalPlannedRevenue += parseFloat(line.plannedRevenue || '0') || 0;
      }
    }

    const budget = db.createProjectBudget({
      projectId: payload.projectId,
      budgetName: payload.budgetName,
      versionNumber,
      periodStartDate: payload.periodStartDate,
      periodEndDate: payload.periodEndDate,
      totalBudgetAmount: totalPlannedCost.toFixed(4),
      totalPlannedCost: totalPlannedCost.toFixed(4),
      totalPlannedRevenue: totalPlannedRevenue.toFixed(4),
      status: 'draft',
      notes: payload.notes,
    }, ctx);

    if (payload.lines && payload.lines.length > 0) {
      for (const line of payload.lines) {
        db.createProjectBudgetLine({
          budgetId: budget.id,
          projectId: payload.projectId,
          costCategory: line.costCategory,
          revenueCategory: line.revenueCategory,
          phase: line.phase,
          departmentId: line.departmentId,
          costCenterId: line.costCenterId,
          plannedQuantity: (parseFloat(line.plannedQuantity || '1') || 1).toFixed(4),
          unitCost: (parseFloat(line.unitCost || line.plannedCost || '0') || 0).toFixed(4),
          plannedCost: (parseFloat(line.plannedCost || '0') || 0).toFixed(4),
          plannedRevenue: (parseFloat(line.plannedRevenue || '0') || 0).toFixed(4),
          notes: line.notes,
        }, ctx);
      }
    }

    return budget;
  }

  public addBudgetLine(budgetId: string, line: CreateBudgetLineInput, ctx: TenantContext): DbProjectBudgetLine {
    const budget = db.getProjectBudgetById(budgetId, ctx);
    if (!budget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);
    if (budget.status === 'approved' || budget.status === 'active' || budget.status === 'closed') {
      throw new ImmutableRecordError('ProjectBudget', budgetId);
    }

    const created = db.createProjectBudgetLine({
      budgetId: budget.id,
      projectId: budget.projectId,
      costCategory: line.costCategory,
      revenueCategory: line.revenueCategory,
      phase: line.phase,
      departmentId: line.departmentId,
      costCenterId: line.costCenterId,
      plannedQuantity: (parseFloat(line.plannedQuantity || '1') || 1).toFixed(4),
      unitCost: (parseFloat(line.unitCost || line.plannedCost || '0') || 0).toFixed(4),
      plannedCost: (parseFloat(line.plannedCost || '0') || 0).toFixed(4),
      plannedRevenue: (parseFloat(line.plannedRevenue || '0') || 0).toFixed(4),
      notes: line.notes,
    }, ctx);

    // Recompute budget totals
    this.recomputeBudgetTotals(budgetId, ctx);
    return created;
  }

  public removeBudgetLine(budgetId: string, lineId: string, ctx: TenantContext): void {
    const budget = db.getProjectBudgetById(budgetId, ctx);
    if (!budget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);
    if (budget.status === 'approved' || budget.status === 'active' || budget.status === 'closed') {
      throw new ImmutableRecordError('ProjectBudget', budgetId);
    }

    db.deleteProjectBudgetLine(lineId, ctx);
    this.recomputeBudgetTotals(budgetId, ctx);
  }

  private recomputeBudgetTotals(budgetId: string, ctx: TenantContext): void {
    const lines = db.getProjectBudgetLines(budgetId, ctx);
    let totalCost = 0;
    let totalRev = 0;
    for (const l of lines) {
      totalCost += parseFloat(l.plannedCost || '0') || 0;
      totalRev += parseFloat(l.plannedRevenue || '0') || 0;
    }
    db.updateProjectBudget(budgetId, {
      totalBudgetAmount: totalCost.toFixed(4),
      totalPlannedCost: totalCost.toFixed(4),
      totalPlannedRevenue: totalRev.toFixed(4),
    }, ctx);
  }

  public submitBudget(budgetId: string, ctx: TenantContext): DbProjectBudget {
    const budget = db.getProjectBudgetById(budgetId, ctx);
    if (!budget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);
    if (budget.status !== 'draft') {
      throw new DomainValidationError(`Only draft budgets can be submitted. Current status: ${budget.status}`);
    }
    return db.updateProjectBudget(budgetId, { status: 'submitted' }, ctx);
  }

  public approveBudget(budgetId: string, ctx: TenantContext): DbProjectBudget {
    const budget = db.getProjectBudgetById(budgetId, ctx);
    if (!budget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);
    if (budget.status !== 'submitted' && budget.status !== 'draft') {
      throw new DomainValidationError(`Cannot approve budget with status: ${budget.status}`);
    }

    // Set any previous approved/active budgets for this project to 'closed'
    const otherBudgets = db.getProjectBudgets(ctx, budget.projectId);
    for (const ob of otherBudgets) {
      if (ob.id !== budgetId && (ob.status === 'approved' || ob.status === 'active')) {
        db.updateProjectBudget(ob.id, { status: 'closed' }, ctx);
      }
    }

    // Update master project budgetAmount
    db.updateProject(budget.projectId, { budgetAmount: budget.totalBudgetAmount }, ctx);

    return db.updateProjectBudget(budgetId, {
      status: 'active',
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  public reviseBudget(budgetId: string, reason: string, ctx: TenantContext): DbProjectBudget {
    const sourceBudget = db.getProjectBudgetById(budgetId, ctx);
    if (!sourceBudget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);

    const existingLines = db.getProjectBudgetLines(budgetId, ctx);
    const allProjectBudgets = db.getProjectBudgets(ctx, sourceBudget.projectId);
    const nextVersion = allProjectBudgets.length + 1;

    const newBudget = db.createProjectBudget({
      projectId: sourceBudget.projectId,
      budgetName: `${sourceBudget.budgetName} (Rev ${nextVersion})`,
      versionNumber: nextVersion,
      periodStartDate: sourceBudget.periodStartDate,
      periodEndDate: sourceBudget.periodEndDate,
      totalBudgetAmount: sourceBudget.totalBudgetAmount,
      totalPlannedCost: sourceBudget.totalPlannedCost,
      totalPlannedRevenue: sourceBudget.totalPlannedRevenue,
      status: 'draft',
      notes: `Revision from v${sourceBudget.versionNumber}. Reason: ${reason}`,
    }, ctx);

    for (const line of existingLines) {
      db.createProjectBudgetLine({
        budgetId: newBudget.id,
        projectId: line.projectId,
        costCategory: line.costCategory,
        revenueCategory: line.revenueCategory,
        phase: line.phase,
        departmentId: line.departmentId,
        costCenterId: line.costCenterId,
        plannedQuantity: line.plannedQuantity,
        unitCost: line.unitCost,
        plannedCost: line.plannedCost,
        plannedRevenue: line.plannedRevenue,
        notes: line.notes,
      }, ctx);
    }

    return newBudget;
  }

  // --- Budget vs Actual Analytics ---
  public getBudgetVsActual(projectId: string, ctx: TenantContext): ProjectBudgetVsActualSummary {
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    // Find active or latest budget
    const budgets = db.getProjectBudgets(ctx, projectId);
    const activeBudget = budgets.find((b) => b.status === 'active') || budgets.find((b) => b.status === 'approved') || budgets[budgets.length - 1];

    const budgetLines = activeBudget ? db.getProjectBudgetLines(activeBudget.id, ctx) : [];
    const actualCosts = db.getProjectCosts(ctx, projectId);
    const actualRevenues = db.getProjectRevenues(ctx, projectId);

    const categories: ProjectCostCategory[] = ['labor', 'materials', 'subcontractor', 'equipment', 'overhead', 'other'];

    const categoryBreakdown: CategoryBudgetVsActual[] = categories.map((cat) => {
      const catLines = budgetLines.filter((l) => l.costCategory === cat);
      const plannedCost = catLines.reduce((acc, l) => acc + parseFloat(l.plannedCost || '0'), 0);
      const plannedRevenue = catLines.reduce((acc, l) => acc + parseFloat(l.plannedRevenue || '0'), 0);

      const catCosts = actualCosts.filter((c) => c.costCategory === cat);
      const actualCost = catCosts.reduce((acc, c) => acc + parseFloat(c.baseAmount || '0'), 0);

      // Sourced revenues mapped to category or default
      const actualRevenue = actualRevenues.reduce((acc, r) => acc + parseFloat(r.baseAmount || '0'), 0);

      const costVariance = plannedCost - actualCost;
      const costVariancePercentage = plannedCost > 0 ? (costVariance / plannedCost) * 100 : 0;
      const remainingBudget = Math.max(0, costVariance);
      const revenueVariance = actualRevenue - plannedRevenue;

      return {
        category: cat,
        plannedCost: plannedCost.toFixed(4),
        actualCost: actualCost.toFixed(4),
        costVariance: costVariance.toFixed(4),
        costVariancePercentage: Math.round(costVariancePercentage * 100) / 100,
        remainingBudget: remainingBudget.toFixed(4),
        plannedRevenue: plannedRevenue.toFixed(4),
        actualRevenue: actualRevenue.toFixed(4),
        revenueVariance: revenueVariance.toFixed(4),
      };
    });

    const totalPlannedCost = categoryBreakdown.reduce((acc, c) => acc + parseFloat(c.plannedCost), 0);
    const totalActualCost = actualCosts.reduce((acc, c) => acc + parseFloat(c.baseAmount || '0'), 0);
    const totalCostVariance = totalPlannedCost - totalActualCost;
    const totalCostVariancePercentage = totalPlannedCost > 0 ? (totalCostVariance / totalPlannedCost) * 100 : 0;
    const totalRemainingBudget = Math.max(0, totalCostVariance);

    const totalPlannedRevenue = categoryBreakdown.reduce((acc, c) => acc + parseFloat(c.plannedRevenue), 0);
    const totalActualRevenue = actualRevenues.reduce((acc, r) => acc + parseFloat(r.baseAmount || '0'), 0);
    const totalRevenueVariance = totalActualRevenue - totalPlannedRevenue;

    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      currency: project.currency,
      activeBudgetId: activeBudget?.id,
      activeBudgetVersion: activeBudget?.versionNumber,
      totalPlannedCost: totalPlannedCost.toFixed(4),
      totalActualCost: totalActualCost.toFixed(4),
      totalCostVariance: totalCostVariance.toFixed(4),
      totalCostVariancePercentage: Math.round(totalCostVariancePercentage * 100) / 100,
      totalRemainingBudget: totalRemainingBudget.toFixed(4),
      totalPlannedRevenue: totalPlannedRevenue.toFixed(4),
      totalActualRevenue: totalActualRevenue.toFixed(4),
      totalRevenueVariance: totalRevenueVariance.toFixed(4),
      categories: categoryBreakdown,
    };
  }
}

export const projectBudgetService = new ProjectBudgetService();
