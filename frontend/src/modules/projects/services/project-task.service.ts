// ============================================================================
// Project Task & Activity Management Service (Phase 12: Project Management)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbProjectTask, 
  ProjectTaskStatus, 
  ProjectTaskPriority 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export interface CreateProjectTaskPayload {
  projectId: string;
  taskCode?: string;
  taskName: string;
  phase?: string;
  startDate?: string;
  endDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: ProjectTaskPriority;
  estimatedHours?: string;
  estimatedCost?: string;
  notes?: string;
}

export class ProjectTaskService {
  public getTasks(ctx: TenantContext, projectId?: string): DbProjectTask[] {
    return db.getProjectTasks(ctx, projectId);
  }

  public getTaskById(id: string, ctx: TenantContext): DbProjectTask | undefined {
    return db.getProjectTaskById(id, ctx);
  }

  public createTask(payload: CreateProjectTaskPayload, ctx: TenantContext): DbProjectTask {
    const project = db.getProjectById(payload.projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${payload.projectId}' not found.`);

    if (!payload.taskName) {
      throw new DomainValidationError('Task name is required.');
    }

    const existingTasks = db.getProjectTasks(ctx, payload.projectId);
    const taskCode = payload.taskCode || `TSK-${project.code}-${String(existingTasks.length + 1).padStart(3, '0')}`;

    const startDate = payload.startDate || project.startDate || new Date().toISOString().slice(0, 10);
    const endDate = payload.endDate || project.endDate || new Date().toISOString().slice(0, 10);

    const estimatedHours = (parseFloat(payload.estimatedHours || '0') || 0).toFixed(2);
    const estimatedCost = (parseFloat(payload.estimatedCost || '0') || 0).toFixed(4);

    return db.createProjectTask({
      projectId: payload.projectId,
      taskCode,
      taskName: payload.taskName.trim(),
      phase: payload.phase,
      startDate,
      endDate,
      assigneeId: payload.assigneeId,
      assigneeName: payload.assigneeName,
      status: 'todo',
      priority: payload.priority || 'medium',
      estimatedHours,
      actualHours: '0.00',
      estimatedCost,
      actualCost: '0.0000',
      progressPercentage: 0,
      notes: payload.notes,
    }, ctx);
  }

  public updateTask(id: string, payload: Partial<DbProjectTask>, ctx: TenantContext): DbProjectTask {
    const task = db.getProjectTaskById(id, ctx);
    if (!task) throw new DomainValidationError(`Task '${id}' not found.`);

    return db.updateProjectTask(id, payload, ctx);
  }

  public updateTaskProgress(
    id: string,
    progressPercentage: number,
    status: ProjectTaskStatus,
    actualHours?: string,
    actualCost?: string,
    ctx?: TenantContext
  ): DbProjectTask {
    if (!ctx) throw new Error('Tenant context required');
    const task = db.getProjectTaskById(id, ctx);
    if (!task) throw new DomainValidationError(`Task '${id}' not found.`);

    const updates: Partial<DbProjectTask> = {
      progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
      status,
    };

    if (actualHours !== undefined) {
      updates.actualHours = (parseFloat(actualHours) || 0).toFixed(2);
    }
    if (actualCost !== undefined) {
      updates.actualCost = (parseFloat(actualCost) || 0).toFixed(4);
    }

    return db.updateProjectTask(id, updates, ctx);
  }

  public deleteTask(id: string, ctx: TenantContext): void {
    db.deleteProjectTask(id, ctx);
  }
}

export const projectTaskService = new ProjectTaskService();
