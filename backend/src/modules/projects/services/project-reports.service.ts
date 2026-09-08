// ============================================================================
// Project Financial & Operational Reports Service (Phase 12: Project Accounting)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { projectProfitabilityService } from './project-profitability.service';
import { projectBudgetService, ProjectBudgetVsActualSummary } from './project-budget.service';

export interface ProjectSummaryRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  customerName: string;
  projectManager: string;
  status: string;
  billingMethod: string;
  contractValue: string;
  budgetAmount: string;
  totalRevenue: string;
  totalCost: string;
  profit: string;
  marginPercentage: number;
}

export interface ProjectCostReportRow {
  costId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  date: string;
  category: string;
  sourceModule: string;
  sourceType: string;
  documentNumber: string;
  description: string;
  amount: string;
  currency: string;
  baseAmount: string;
  isBillable: boolean;
  billingStatus: string;
}

export interface ProjectRevenueReportRow {
  revenueId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  date: string;
  sourceModule: string;
  documentNumber: string;
  description: string;
  amount: string;
  currency: string;
  baseAmount: string;
  invoiceNumber?: string;
}

export interface ProjectWipReportRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  wipAccountId: string;
  accumulatedCost: string;
  capitalizedAmount: string;
  transferredToCogs: string;
  currentWipBalance: string;
  currency: string;
}

export class ProjectReportsService {
  // 1. Master Project Summary
  public getProjectSummaryReport(ctx: TenantContext): ProjectSummaryRow[] {
    const portfolio = projectProfitabilityService.getPortfolioProfitability(ctx);
    const projects = db.getProjects(ctx);

    return portfolio.projects.map((p) => {
      const proj = projects.find((proj) => proj.id === p.projectId);
      return {
        projectId: p.projectId,
        projectCode: p.projectCode,
        projectName: p.projectName,
        customerName: proj?.customerName || 'N/A',
        projectManager: proj?.projectManagerName || 'N/A',
        status: p.projectStatus,
        billingMethod: p.billingMethod,
        contractValue: p.contractValue,
        budgetAmount: p.budgetAmount,
        totalRevenue: p.totalRevenue,
        totalCost: p.totalCost,
        profit: p.grossProfit,
        marginPercentage: p.grossMarginPercentage,
      };
    });
  }

  // 2. Project Cost Ledger Report
  public getProjectCostReport(ctx: TenantContext, projectId?: string): ProjectCostReportRow[] {
    const costs = db.getProjectCosts(ctx, projectId);
    const projects = db.getProjects(ctx);

    return costs.map((c) => {
      const p = projects.find((proj) => proj.id === c.projectId);
      return {
        costId: c.id,
        projectId: c.projectId,
        projectCode: p?.code || 'N/A',
        projectName: p?.name || 'N/A',
        date: c.transactionDate,
        category: c.costCategory,
        sourceModule: c.sourceModule,
        sourceType: c.sourceType,
        documentNumber: c.documentNumber,
        description: c.description,
        amount: c.amount,
        currency: c.currency,
        baseAmount: c.baseAmount,
        isBillable: c.isBillable,
        billingStatus: c.billingStatus,
      };
    });
  }

  // 3. Project Revenue Register
  public getProjectRevenueReport(ctx: TenantContext, projectId?: string): ProjectRevenueReportRow[] {
    const revenues = db.getProjectRevenues(ctx, projectId);
    const projects = db.getProjects(ctx);

    return revenues.map((r) => {
      const p = projects.find((proj) => proj.id === r.projectId);
      return {
        revenueId: r.id,
        projectId: r.projectId,
        projectCode: p?.code || 'N/A',
        projectName: p?.name || 'N/A',
        date: r.transactionDate,
        sourceModule: r.sourceModule,
        documentNumber: r.documentNumber,
        description: r.description,
        amount: r.amount,
        currency: r.currency,
        baseAmount: r.baseAmount,
        invoiceNumber: r.documentNumber,
      };
    });
  }

  // 4. Budget vs Actual Project Report
  public getBudgetVsActualReport(ctx: TenantContext, projectId?: string): ProjectBudgetVsActualSummary[] {
    const projects = projectId ? [db.getProjectById(projectId, ctx)!].filter(Boolean) : db.getProjects(ctx);
    return projects.map((p) => projectBudgetService.getBudgetVsActual(p.id, ctx));
  }

  // 5. Project WIP Report
  public getProjectWipReport(ctx: TenantContext): ProjectWipReportRow[] {
    const projects = db.getProjects(ctx);

    return projects.map((p) => {
      const wip = db.getProjectWipBalance(p.id, ctx);
      return {
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        wipAccountId: wip.wipAccountId,
        accumulatedCost: wip.accumulatedCost,
        capitalizedAmount: wip.capitalizedAmount,
        transferredToCogs: wip.transferredToCogs,
        currentWipBalance: wip.currentWipBalance,
        currency: p.currency,
      };
    });
  }

  // 6. Project Costs Grouped by Category
  public getProjectCostsByCategoryReport(ctx: TenantContext): { category: string; count: number; totalAmount: string }[] {
    const costs = db.getProjectCosts(ctx);
    const groups: Record<string, { count: number; total: number }> = {};

    for (const c of costs) {
      if (!groups[c.costCategory]) groups[c.costCategory] = { count: 0, total: 0 };
      groups[c.costCategory].count++;
      groups[c.costCategory].total += parseFloat(c.baseAmount || '0') || 0;
    }

    return Object.entries(groups).map(([cat, data]) => ({
      category: cat.toUpperCase(),
      count: data.count,
      totalAmount: data.total.toFixed(4),
    }));
  }

  // 7. Project Costs Grouped by Department
  public getProjectCostsByDepartmentReport(ctx: TenantContext): { departmentId: string; departmentName: string; totalAmount: string }[] {
    const costs = db.getProjectCosts(ctx);
    const departments = db.getDepartments(ctx);
    const groups: Record<string, number> = {};

    for (const c of costs) {
      const dId = c.departmentId || 'unassigned';
      groups[dId] = (groups[dId] || 0) + (parseFloat(c.baseAmount || '0') || 0);
    }

    return Object.entries(groups).map(([dId, total]) => {
      const dept = departments.find((d) => d.id === dId);
      return {
        departmentId: dId,
        departmentName: dept ? dept.name : 'General & Administrative',
        totalAmount: total.toFixed(4),
      };
    });
  }
}

export const projectReportsService = new ProjectReportsService();
