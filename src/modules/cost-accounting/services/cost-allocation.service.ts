// ============================================================================
// Centralized Cost Allocation Engine & Posting Workflow (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbCostAllocationRule, 
  DbCostAllocationTarget, 
  DbCostAllocationRun, 
  DbCostAllocationRunLine,
  AllocationBasis,
  AllocationTargetType
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export class CostAllocationService {
  public getRules(ctx: TenantContext): DbCostAllocationRule[] {
    const rules = db.getCostAllocationRules(ctx);
    if (rules.length === 0) {
      // Seed default IT & Rent Allocation Rule
      const defaultRule: Omit<DbCostAllocationRule, 'id' | 'companyId' | 'createdAt' | 'updatedAt'> = {
        code: 'ALLOC-RENT-SHARED',
        name: 'Shared Facility & Office Rent Overhead Allocation',
        description: 'Allocates monthly headquarter rental expenses across operating departments by floor space ratio',
        sourceAccountId: 'a-6020', // Rent Expense
        allocationBasis: 'percentage',
        targetDimensionType: 'department',
        status: 'active',
        targets: [
          { id: 'tgt-1', ruleId: 'rule-rent', targetEntityType: 'department', targetEntityId: 'dept-sales', targetEntityName: 'Sales & Marketing', weight: '35', percentage: '0.3500', targetAccountId: 'a-6020' },
          { id: 'tgt-2', ruleId: 'rule-rent', targetEntityType: 'department', targetEntityId: 'dept-eng', targetEntityName: 'Engineering & Operations', weight: '45', percentage: '0.4500', targetAccountId: 'a-6020' },
          { id: 'tgt-3', ruleId: 'rule-rent', targetEntityType: 'department', targetEntityId: 'dept-adm', targetEntityName: 'General Administration', weight: '20', percentage: '0.2000', targetAccountId: 'a-6020' },
        ],
      };
      return [db.createCostAllocationRule(defaultRule, ctx)];
    }
    return rules;
  }

  public getRuleById(id: string, ctx: TenantContext): DbCostAllocationRule | undefined {
    return db.getCostAllocationRuleById(id, ctx);
  }

  public createRule(
    payload: {
      code: string;
      name: string;
      description?: string;
      sourceCostCenterId?: string;
      sourceDepartmentId?: string;
      sourceAccountId?: string;
      allocationBasis: AllocationBasis;
      targetDimensionType: AllocationTargetType;
      targets: Array<{
        targetEntityType: AllocationTargetType;
        targetEntityId: string;
        targetEntityName: string;
        weight: string;
        fixedAmount?: string;
        targetAccountId?: string;
      }>;
      notes?: string;
    },
    ctx: TenantContext
  ): DbCostAllocationRule {
    const existing = db.getCostAllocationRules(ctx).find((r) => r.code === payload.code);
    if (existing) {
      throw new DomainValidationError(`Cost Allocation Rule code '${payload.code}' already exists.`);
    }

    if (!payload.targets || payload.targets.length === 0) {
      throw new DomainValidationError('At least one allocation target is required.');
    }

    // Compute normalized percentages from weights
    const totalWeight = payload.targets.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
    const normalizedTargets: DbCostAllocationTarget[] = payload.targets.map((t, idx) => {
      const w = parseFloat(t.weight) || 0;
      const pct = totalWeight > 0 ? (w / totalWeight).toFixed(4) : (1 / payload.targets.length).toFixed(4);
      return {
        id: `tgt-${Date.now().toString(36)}-${idx}`,
        ruleId: '',
        targetEntityType: t.targetEntityType,
        targetEntityId: t.targetEntityId,
        targetEntityName: t.targetEntityName,
        weight: t.weight,
        percentage: pct,
        fixedAmount: t.fixedAmount,
        targetAccountId: t.targetAccountId,
      };
    });

    return db.createCostAllocationRule({
      ...payload,
      status: 'active',
      targets: normalizedTargets,
    }, ctx);
  }

  public getRuns(ctx: TenantContext): DbCostAllocationRun[] {
    return db.getCostAllocationRuns(ctx);
  }

  public getRunById(id: string, ctx: TenantContext): DbCostAllocationRun | undefined {
    return db.getCostAllocationRunById(id, ctx);
  }

  /**
   * Executes Cost Allocation calculation and generates a draft run voucher
   */
  public executeAllocationRun(
    payload: {
      allocationRuleId: string;
      runDate: string;
      periodId: string;
      totalAllocatedAmount: string;
      memo?: string;
    },
    ctx: TenantContext
  ): DbCostAllocationRun {
    const rule = db.getCostAllocationRuleById(payload.allocationRuleId, ctx);
    if (!rule) throw new DomainValidationError(`Allocation Rule '${payload.allocationRuleId}' not found.`);

    const totalAmt = parseFloat(payload.totalAllocatedAmount);
    if (isNaN(totalAmt) || totalAmt <= 0) {
      throw new DomainValidationError('Total allocated amount must be a positive number.');
    }

    const runNumber = `RUN-ALLOC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const accounts = db.getAccounts(ctx);
    const defaultExpenseAcc = accounts.find((a) => a.code === '5010') || accounts[0];

    // Compute line distributions
    let distributedSum = 0;
    const lines: DbCostAllocationRunLine[] = rule.targets.map((tgt, idx) => {
      let allocated = 0;
      if (rule.allocationBasis === 'fixed_amount' && tgt.fixedAmount) {
        allocated = parseFloat(tgt.fixedAmount);
      } else {
        const pct = parseFloat(tgt.percentage);
        allocated = totalAmt * pct;
      }

      // Handle rounding pennies on last line
      if (idx === rule.targets.length - 1 && rule.allocationBasis !== 'fixed_amount') {
        allocated = totalAmt - distributedSum;
      }
      distributedSum += allocated;

      const targetAccId = tgt.targetAccountId || rule.sourceAccountId || defaultExpenseAcc.id;

      return {
        id: `crl-${Date.now().toString(36)}-${idx}`,
        runId: '',
        targetEntityType: tgt.targetEntityType,
        targetEntityId: tgt.targetEntityId,
        targetEntityName: tgt.targetEntityName,
        allocatedAmount: allocated.toFixed(4),
        percentage: tgt.percentage,
        targetAccountId: targetAccId,
        departmentId: tgt.targetEntityType === 'department' ? tgt.targetEntityId : undefined,
        costCenterId: tgt.targetEntityType === 'cost_center' ? tgt.targetEntityId : undefined,
        businessUnitId: tgt.targetEntityType === 'business_unit' ? tgt.targetEntityId : undefined,
        projectId: tgt.targetEntityType === 'project' ? tgt.targetEntityId : undefined,
      };
    });

    return db.createCostAllocationRun({
      allocationRuleId: rule.id,
      runNumber,
      runDate: payload.runDate,
      periodId: payload.periodId,
      totalAllocatedAmount: totalAmt.toFixed(4),
      currency: ctx.baseCurrency,
      exchangeRate: '1.000000',
      sourceCostCenterId: rule.sourceCostCenterId,
      sourceDepartmentId: rule.sourceDepartmentId,
      sourceAccountId: rule.sourceAccountId,
      status: 'draft',
      lines,
      memo: payload.memo || `Shared Cost Allocation via ${rule.name}`,
    }, ctx);
  }

  /**
   * Approves an allocation run before posting to GL
   */
  public approveAllocationRun(runId: string, ctx: TenantContext): DbCostAllocationRun {
    const run = db.getCostAllocationRunById(runId, ctx);
    if (!run) throw new DomainValidationError(`Cost Allocation Run '${runId}' not found.`);
    if (run.status !== 'draft') {
      throw new DomainValidationError(`Cannot approve run in '${run.status}' status.`);
    }

    return db.updateCostAllocationRun(runId, {
      status: 'approved',
      approvedById: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  /**
   * Posts approved allocation run to General Ledger via centralized AccountingPostingService
   */
  public postAllocationRun(runId: string, ctx: TenantContext): DbCostAllocationRun {
    const run = db.getCostAllocationRunById(runId, ctx);
    if (!run) throw new DomainValidationError(`Cost Allocation Run '${runId}' not found.`);
    if (run.status !== 'approved' && run.status !== 'draft') {
      throw new DomainValidationError(`Cannot post run in '${run.status}' status.`);
    }

    const accounts = db.getAccounts(ctx);
    const sourceAcc = run.sourceAccountId
      ? accounts.find((a) => a.id === run.sourceAccountId)
      : accounts.find((a) => a.code === '6080') || accounts[0];

    if (!sourceAcc) throw new DomainValidationError('Source clearing account could not be resolved.');

    // Prepare double-entry custom journal lines
    // Debit lines for targets
    const customLines: Array<{
      accountCode?: string;
      accountId?: string;
      description: string;
      debitAmount: string;
      creditAmount: string;
      branchId?: string;
      departmentId?: string;
      costCenterId?: string;
      businessUnitId?: string;
      projectId?: string;
    }> = [];

    for (const line of run.lines) {
      customLines.push({
        accountId: line.targetAccountId,
        description: `Cost Allocation to ${line.targetEntityName} (${run.runNumber})`,
        debitAmount: line.allocatedAmount,
        creditAmount: '0.0000',
        departmentId: line.departmentId,
        costCenterId: line.costCenterId,
        businessUnitId: line.businessUnitId,
        projectId: line.projectId,
      });
    }

    // Credit line for source
    customLines.push({
      accountId: sourceAcc.id,
      description: `Overhead Allocation Outflow (${run.runNumber})`,
      debitAmount: '0.0000',
      creditAmount: run.totalAllocatedAmount,
      departmentId: run.sourceDepartmentId,
      costCenterId: run.sourceCostCenterId,
    });

    const journal = accountingPostingService.post('COST_ALLOCATION_POSTED', {
      sourceType: 'CostAllocationRun',
      sourceId: run.id,
      documentNumber: run.runNumber,
      documentDate: run.runDate,
      memo: run.memo || `Cost Allocation ${run.runNumber}`,
      currency: run.currency || ctx.baseCurrency,
      exchangeRate: run.exchangeRate || '1.000000',
      amount: run.totalAllocatedAmount,
      customLines,
    }, ctx);

    return db.updateCostAllocationRun(runId, {
      status: 'posted',
      journalEntryId: journal.id,
      postedById: ctx.userId,
      postedAt: new Date().toISOString(),
    }, ctx);
  }
}

export const costAllocationService = new CostAllocationService();
