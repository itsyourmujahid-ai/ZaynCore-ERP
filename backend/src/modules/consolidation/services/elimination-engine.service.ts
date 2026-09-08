// ============================================================================
// Elimination Engine & Consolidation Adjustments Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbEliminationRule, 
  DbConsolidationAdjustment, 
  DbConsolidationAdjustmentLine,
  EliminationType,
  ConsolidationAdjustmentType
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { ValidationError, NotFoundError, ImmutableRecordError } from '@/core/errors/DomainErrors';
import { parseDecimal, formatDecimal } from '@/core/utils/money';

export interface CreateEliminationRuleDTO {
  groupId: string;
  code: string;
  name: string;
  eliminationType: EliminationType;
  sourceAccountType: any;
  targetAccountType: any;
  description?: string;
}

export interface CreateConsolidationAdjustmentDTO {
  consolidationRunId: string;
  adjustmentType: ConsolidationAdjustmentType;
  reason: string;
  affectingCompanyIds: string[];
  totalAmount: string;
  currency: string;
  lines: Array<{
    companyId: string;
    groupAccountId: string;
    localAccountId?: string;
    debitAmount: string;
    creditAmount: string;
    description?: string;
  }>;
}

export class EliminationEngineService {
  public getRules(groupId?: string): DbEliminationRule[] {
    return db.getEliminationRules(groupId);
  }

  public createRule(dto: CreateEliminationRuleDTO, ctx: TenantContext): DbEliminationRule {
    if (!dto.groupId || !dto.code || !dto.name || !dto.eliminationType) {
      throw new ValidationError('Group ID, Rule Code, Name, and Elimination Type are required.');
    }

    return db.createEliminationRule({
      groupId: dto.groupId,
      code: dto.code.toUpperCase(),
      name: dto.name,
      eliminationType: dto.eliminationType,
      sourceAccountType: dto.sourceAccountType,
      targetAccountType: dto.targetAccountType,
      isActive: true,
      description: dto.description,
    }, ctx);
  }

  public getAdjustments(consolidationRunId?: string): DbConsolidationAdjustment[] {
    return db.getConsolidationAdjustments(consolidationRunId);
  }

  public createAdjustment(dto: CreateConsolidationAdjustmentDTO, ctx: TenantContext): DbConsolidationAdjustment {
    if (!dto.consolidationRunId || !dto.reason || !dto.lines || dto.lines.length === 0) {
      throw new ValidationError('Consolidation run ID, reason, and adjustment lines are required.');
    }

    let totalDebit = 0;
    let totalCredit = 0;
    const linesWithIds: DbConsolidationAdjustmentLine[] = [];

    dto.lines.forEach((l, idx) => {
      const d = parseFloat(l.debitAmount || '0');
      const c = parseFloat(l.creditAmount || '0');
      totalDebit += d;
      totalCredit += c;

      linesWithIds.push({
        id: `cadjl-${Date.now().toString(36)}-${idx}`,
        adjustmentId: '',
        companyId: l.companyId,
        groupAccountId: l.groupAccountId,
        localAccountId: l.localAccountId,
        debitAmount: formatDecimal(parseDecimal(d.toFixed(4))),
        creditAmount: formatDecimal(parseDecimal(c.toFixed(4))),
        description: l.description,
      });
    });

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new ValidationError(`Consolidation adjustment lines must balance. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`);
    }

    const adjNumber = 'CADJ-' + Date.now().toString(36).toUpperCase();

    const adj = db.createConsolidationAdjustment({
      consolidationRunId: dto.consolidationRunId,
      adjustmentNumber: adjNumber,
      adjustmentType: dto.adjustmentType || 'elimination',
      reason: dto.reason,
      affectingCompanyIds: dto.affectingCompanyIds || [],
      totalAmount: formatDecimal(parseDecimal(totalDebit.toFixed(4))),
      currency: dto.currency || 'USD',
      status: 'draft',
      lines: linesWithIds,
      createdById: ctx.userId,
    }, ctx);

    // Update lines with adjustment parent ID
    adj.lines.forEach((l) => {
      l.adjustmentId = adj.id;
    });

    return adj;
  }

  public approveAdjustment(id: string, ctx: TenantContext): DbConsolidationAdjustment {
    const adj = db.getConsolidationAdjustmentById(id);
    if (!adj) throw new NotFoundError('ConsolidationAdjustment', id);
    if (adj.status !== 'draft') {
      throw new ValidationError(`Cannot approve adjustment in status '${adj.status}'.`);
    }

    return db.updateConsolidationAdjustment(id, {
      status: 'approved',
      approvedById: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  public postAdjustment(id: string, ctx: TenantContext): DbConsolidationAdjustment {
    const adj = db.getConsolidationAdjustmentById(id);
    if (!adj) throw new NotFoundError('ConsolidationAdjustment', id);
    if (adj.status === 'posted') {
      throw new ImmutableRecordError('ConsolidationAdjustment', id);
    }

    return db.updateConsolidationAdjustment(id, {
      status: 'posted',
      postedAt: new Date().toISOString(),
    }, ctx);
  }
}

export const eliminationEngineService = new EliminationEngineService();
