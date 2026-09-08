// ============================================================================
// Project Master Service (Phase 12: Project Management & Project Accounting)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbProject, 
  DbProjectType, 
  ProjectStatus, 
  ProjectBillingMethod,
  ProjectCategory 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError, ImmutableRecordError } from '@/core/errors/DomainErrors';

export interface CreateProjectPayload {
  code: string;
  name: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnit?: string;
  startDate: string;
  endDate?: string;
  currency?: string;
  projectTypeId: string;
  billingMethod: ProjectBillingMethod;
  budgetAmount?: string;
  contractValue?: string;
  taxCodeId?: string;
  wipAccountId?: string;
  revenueAccountId?: string;
  costAccountId?: string;
  notes?: string;
}

export interface ProjectClosureValidationResult {
  canClose: boolean;
  blockers: string[];
  warnings: string[];
}

export class ProjectService {
  // --- Project Types ---
  public getProjectTypes(ctx: TenantContext): DbProjectType[] {
    return db.getProjectTypes(ctx);
  }

  public createProjectType(
    payload: {
      code: string;
      name: string;
      description?: string;
      category: ProjectCategory;
      isActive?: boolean;
    },
    ctx: TenantContext
  ): DbProjectType {
    if (!payload.code || !payload.name) {
      throw new DomainValidationError('Project type code and name are required.');
    }

    const existing = db.getProjectTypes(ctx).find(
      (t) => t.code.toUpperCase() === payload.code.toUpperCase() && (!t.companyId || t.companyId === ctx.companyId)
    );
    if (existing) {
      throw new DomainValidationError(`Project type code '${payload.code}' already exists.`);
    }

    return db.createProjectType({
      code: payload.code.toUpperCase(),
      name: payload.name,
      description: payload.description,
      category: payload.category,
      isActive: payload.isActive !== false,
    }, ctx);
  }

  // --- Project Master CRUD ---
  public getProjects(ctx: TenantContext): DbProject[] {
    return db.getProjects(ctx);
  }

  public getProjectById(id: string, ctx: TenantContext): DbProject | undefined {
    return db.getProjectById(id, ctx);
  }

  public createProject(payload: CreateProjectPayload, ctx: TenantContext): DbProject {
    if (!payload.code || !payload.name || !payload.projectTypeId || !payload.startDate) {
      throw new DomainValidationError('Project Code, Name, Project Type, and Start Date are mandatory.');
    }

    // Uniqueness check for project code in tenant
    const existing = db.getProjects(ctx).find(
      (p) => p.code.toUpperCase() === payload.code.toUpperCase()
    );
    if (existing) {
      throw new DomainValidationError(`Project code '${payload.code}' already exists for this organization.`);
    }

    // Verify Project Type exists
    const pt = db.getProjectTypeById(payload.projectTypeId, ctx);
    if (!pt) {
      throw new DomainValidationError(`Project type '${payload.projectTypeId}' does not exist.`);
    }

    const currency = payload.currency || ctx.baseCurrency;
    const budgetAmount = (parseFloat(payload.budgetAmount || '0') || 0).toFixed(4);
    const contractValue = (parseFloat(payload.contractValue || '0') || 0).toFixed(4);

    return db.createProject({
      code: payload.code.toUpperCase().trim(),
      name: payload.name.trim(),
      description: payload.description,
      customerId: payload.customerId,
      customerName: payload.customerName,
      projectManagerId: payload.projectManagerId,
      projectManagerName: payload.projectManagerName,
      branchId: payload.branchId,
      departmentId: payload.departmentId,
      costCenterId: payload.costCenterId,
      businessUnit: payload.businessUnit,
      startDate: payload.startDate,
      endDate: payload.endDate,
      currency,
      projectTypeId: payload.projectTypeId,
      status: 'draft',
      billingMethod: payload.billingMethod,
      budgetAmount,
      contractValue,
      taxCodeId: payload.taxCodeId,
      wipAccountId: payload.wipAccountId || 'a-1350',
      revenueAccountId: payload.revenueAccountId || 'a-4020',
      costAccountId: payload.costAccountId || 'a-5010',
      isActive: true,
      notes: payload.notes,
    }, ctx);
  }

  public updateProject(id: string, payload: Partial<DbProject>, ctx: TenantContext): DbProject {
    const project = db.getProjectById(id, ctx);
    if (!project) throw new DomainValidationError(`Project '${id}' not found.`);

    if (project.status === 'closed' && payload.status !== 'active') {
      throw new ImmutableRecordError('Project', id);
    }

    return db.updateProject(id, payload, ctx);
  }

  public changeProjectStatus(id: string, newStatus: ProjectStatus, ctx: TenantContext): DbProject {
    const project = db.getProjectById(id, ctx);
    if (!project) throw new DomainValidationError(`Project '${id}' not found.`);

    if (newStatus === 'closed') {
      return this.closeProject(id, ctx);
    }

    return db.updateProject(id, { status: newStatus }, ctx);
  }

  public deleteProject(id: string, ctx: TenantContext): void {
    db.deleteProject(id, ctx);
  }

  // --- Pre-Closure Governance Validation ---
  public validateProjectClosure(projectId: string, ctx: TenantContext): ProjectClosureValidationResult {
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. Check for unapproved or unbilled milestones
    const milestones = db.getProjectMilestones(ctx, projectId);
    const unbilledMilestones = milestones.filter((m) => m.status !== 'billed');
    if (unbilledMilestones.length > 0) {
      blockers.push(`Project has ${unbilledMilestones.length} unbilled milestone(s) (e.g. '${unbilledMilestones[0].name}').`);
    }

    // 2. Check for open tasks
    const tasks = db.getProjectTasks(ctx, projectId);
    const openTasks = tasks.filter((t) => t.status !== 'completed');
    if (openTasks.length > 0) {
      warnings.push(`Project has ${openTasks.length} task(s) that are not marked as completed.`);
    }

    // 3. Check for unbilled billable costs
    const costs = db.getProjectCosts(ctx, projectId);
    const unbilledCosts = costs.filter((c) => c.isBillable && c.billingStatus === 'unbilled');
    if (unbilledCosts.length > 0) {
      warnings.push(`Project has ${unbilledCosts.length} billable cost item(s) pending invoice generation.`);
    }

    // 4. Check WIP balance
    const wip = db.getProjectWipBalance(projectId, ctx);
    if (wip && Math.abs(parseFloat(wip.currentWipBalance)) > 0.0001) {
      blockers.push(`Project has an active non-zero Work In Progress (WIP) balance of $${wip.currentWipBalance}. Transfer or realize WIP before closing.`);
    }

    return {
      canClose: blockers.length === 0,
      blockers,
      warnings,
    };
  }

  public closeProject(projectId: string, ctx: TenantContext): DbProject {
    const validation = this.validateProjectClosure(projectId, ctx);
    if (!validation.canClose) {
      throw new DomainValidationError(
        `Cannot close project '${projectId}'. Pre-closure requirements failed:\n` + validation.blockers.join('\n')
      );
    }

    return db.updateProject(projectId, {
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: ctx.userId,
    }, ctx);
  }
}

export const projectService = new ProjectService();
