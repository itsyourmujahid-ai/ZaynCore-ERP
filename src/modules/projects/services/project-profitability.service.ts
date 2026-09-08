// ============================================================================
// Project Profitability & Margin Analytics Engine (Phase 12: Project Accounting)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export interface ProjectProfitabilityMetrics {
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  billingMethod: string;
  currency: string;
  contractValue: string;
  budgetAmount: string;
  totalRevenue: string;
  totalCost: string;
  grossProfit: string;
  grossMarginPercentage: number;
  costUtilizationPercentage: number;
  budgetVariance: string;
  budgetVariancePercentage: number;
  remainingContractValue: string;
  billedMilestonesCount: number;
  totalMilestonesCount: number;
  costBreakdown: {
    labor: string;
    materials: string;
    subcontractor: string;
    equipment: string;
    overhead: string;
    other: string;
  };
}

export interface PortfolioProfitabilitySummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  currency: string;
  totalContractValue: string;
  totalProjectRevenue: string;
  totalProjectCost: string;
  totalGrossProfit: string;
  portfolioMarginPercentage: number;
  projectsOverBudgetCount: number;
  projects: ProjectProfitabilityMetrics[];
}

export class ProjectProfitabilityService {
  public calculateProjectProfitability(projectId: string, ctx: TenantContext): ProjectProfitabilityMetrics {
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    const costs = db.getProjectCosts(ctx, projectId);
    const revenues = db.getProjectRevenues(ctx, projectId);
    const milestones = db.getProjectMilestones(ctx, projectId);

    const contractValueVal = parseFloat(project.contractValue || '0') || 0;
    const budgetAmountVal = parseFloat(project.budgetAmount || '0') || 0;

    let totalCostVal = 0;
    const costBreakdown = {
      labor: 0,
      materials: 0,
      subcontractor: 0,
      equipment: 0,
      overhead: 0,
      other: 0,
    };

    for (const c of costs) {
      const amt = parseFloat(c.baseAmount || '0') || 0;
      totalCostVal += amt;
      if (c.costCategory in costBreakdown) {
        costBreakdown[c.costCategory as keyof typeof costBreakdown] += amt;
      } else {
        costBreakdown.other += amt;
      }
    }

    let totalRevenueVal = 0;
    for (const r of revenues) {
      totalRevenueVal += parseFloat(r.baseAmount || '0') || 0;
    }

    const grossProfitVal = totalRevenueVal - totalCostVal;
    const grossMarginPercentage = totalRevenueVal > 0 
      ? Math.round(((grossProfitVal / totalRevenueVal) * 100) * 100) / 100 
      : (totalCostVal > 0 ? -100 : 0);

    const costUtilizationPercentage = budgetAmountVal > 0 
      ? Math.round(((totalCostVal / budgetAmountVal) * 100) * 100) / 100 
      : 0;

    const budgetVarianceVal = budgetAmountVal - totalCostVal;
    const budgetVariancePercentage = budgetAmountVal > 0 
      ? Math.round(((budgetVarianceVal / budgetAmountVal) * 100) * 100) / 100 
      : 0;

    const remainingContractVal = Math.max(0, contractValueVal - totalRevenueVal);
    const billedMilestonesCount = milestones.filter((m) => m.status === 'billed').length;

    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      projectStatus: project.status,
      billingMethod: project.billingMethod,
      currency: project.currency,
      contractValue: contractValueVal.toFixed(4),
      budgetAmount: budgetAmountVal.toFixed(4),
      totalRevenue: totalRevenueVal.toFixed(4),
      totalCost: totalCostVal.toFixed(4),
      grossProfit: grossProfitVal.toFixed(4),
      grossMarginPercentage,
      costUtilizationPercentage,
      budgetVariance: budgetVarianceVal.toFixed(4),
      budgetVariancePercentage,
      remainingContractValue: remainingContractVal.toFixed(4),
      billedMilestonesCount,
      totalMilestonesCount: milestones.length,
      costBreakdown: {
        labor: costBreakdown.labor.toFixed(4),
        materials: costBreakdown.materials.toFixed(4),
        subcontractor: costBreakdown.subcontractor.toFixed(4),
        equipment: costBreakdown.equipment.toFixed(4),
        overhead: costBreakdown.overhead.toFixed(4),
        other: costBreakdown.other.toFixed(4),
      },
    };
  }

  public getPortfolioProfitability(ctx: TenantContext): PortfolioProfitabilitySummary {
    const projects = db.getProjects(ctx);
    const metricsList = projects.map((p) => this.calculateProjectProfitability(p.id, ctx));

    let totalContractVal = 0;
    let totalRevenueVal = 0;
    let totalCostVal = 0;
    let projectsOverBudgetCount = 0;

    for (const m of metricsList) {
      totalContractVal += parseFloat(m.contractValue);
      totalRevenueVal += parseFloat(m.totalRevenue);
      totalCostVal += parseFloat(m.totalCost);
      if (parseFloat(m.totalCost) > parseFloat(m.budgetAmount) && parseFloat(m.budgetAmount) > 0) {
        projectsOverBudgetCount++;
      }
    }

    const totalProfitVal = totalRevenueVal - totalCostVal;
    const portfolioMargin = totalRevenueVal > 0 
      ? Math.round(((totalProfitVal / totalRevenueVal) * 100) * 100) / 100 
      : 0;

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'active').length,
      completedProjects: projects.filter((p) => p.status === 'completed' || p.status === 'closed').length,
      currency: ctx.baseCurrency,
      totalContractValue: totalContractVal.toFixed(4),
      totalProjectRevenue: totalRevenueVal.toFixed(4),
      totalProjectCost: totalCostVal.toFixed(4),
      totalGrossProfit: totalProfitVal.toFixed(4),
      portfolioMarginPercentage: portfolioMargin,
      projectsOverBudgetCount,
      projects: metricsList,
    };
  }
}

export const projectProfitabilityService = new ProjectProfitabilityService();
