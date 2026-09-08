// ============================================================================
// Enterprise Accruals, Prepayments, Deferred Revenue & Provisions Domain Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import {
  DbAccrualEntry,
  DbPrepaymentSchedule,
  DbPrepaymentLine,
  DbDeferredRevenueSchedule,
  DbDeferredRevenueLine,
  DbProvision,
  DbRecurringJournalTemplate,
} from '@/database/types';
import { accountingPostingService } from './accounting-posting.service';
import { PeriodClosedError } from '@/core/errors/DomainErrors';

export class AccrualsPrepaymentsService {
  private static instance: AccrualsPrepaymentsService;

  public static getInstance(): AccrualsPrepaymentsService {
    if (!AccrualsPrepaymentsService.instance) {
      AccrualsPrepaymentsService.instance = new AccrualsPrepaymentsService();
    }
    return AccrualsPrepaymentsService.instance;
  }

  /**
   * Creates and optionally posts an operational accrual (Expense or Revenue)
   */
  public createAccrual(
    payload: Omit<DbAccrualEntry, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'journalEntryId' | 'reversalJournalEntryId' | 'reversedAt'>,
    ctx: TenantContext
  ): DbAccrualEntry {
    const accrual = db.createAccrual({
      ...payload,
      status: payload.status || 'draft',
    }, ctx);

    if (accrual.status === 'posted' || accrual.status === 'approved') {
      return this.postAccrual(accrual.id, ctx);
    }

    return accrual;
  }

  /**
   * Posts an approved accrual directly into the General Ledger
   */
  public postAccrual(accrualId: string, ctx: TenantContext): DbAccrualEntry {
    const accrual = db.getAccrualById(accrualId, ctx);
    if (!accrual) throw new Error(`Accrual entry '${accrualId}' not found`);

    if (accrual.status === 'posted') {
      throw new Error(`Accrual '${accrual.accrualNumber}' is already posted.`);
    }

    // Verify accounting period is open for accrualDate
    const period = db.getAccountingPeriods(ctx).find(
      (p) => accrual.accrualDate >= p.startDate && accrual.accrualDate <= p.endDate
    );
    if (!period || period.status !== 'open') {
      throw new PeriodClosedError(period?.name || 'Period', period?.status || 'closed');
    }

    // Post to GL via centralized AccountingPostingService
    const journal = accountingPostingService.post('ACCRUAL_ENTRY_POSTED', {
      branchId: accrual.branchId || ctx.branchId,
      sourceType: 'accrual_entry',
      sourceId: accrual.id,
      documentNumber: accrual.accrualNumber,
      documentDate: accrual.accrualDate,
      memo: `Accrual Entry: ${accrual.title} (${accrual.accrualType})`,
      currency: accrual.currency,
      exchangeRate: accrual.exchangeRate || '1.000000',
      amount: accrual.amount,
      debitAccountId: accrual.debitAccountId,
      creditAccountId: accrual.creditAccountId,
      departmentId: accrual.departmentId,
      costCenterId: accrual.costCenterId,
      projectId: accrual.projectId,
    }, ctx);

    return db.updateAccrual(accrual.id, {
      status: 'posted',
      journalEntryId: journal.id,
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  /**
   * Posts an accrual reversal journal (manually or via auto-reversal schedule)
   */
  public reverseAccrual(accrualId: string, reversalDate: string, ctx: TenantContext): DbAccrualEntry {
    const accrual = db.getAccrualById(accrualId, ctx);
    if (!accrual) throw new Error(`Accrual entry '${accrualId}' not found`);

    if (accrual.status !== 'posted') {
      throw new Error(`Cannot reverse accrual '${accrual.accrualNumber}' with status '${accrual.status}'`);
    }

    // Verify reversal period is open
    const period = db.getAccountingPeriods(ctx).find(
      (p) => reversalDate >= p.startDate && reversalDate <= p.endDate
    );
    if (!period || period.status !== 'open') {
      throw new PeriodClosedError(period?.name || 'Period', period?.status || 'closed');
    }

    const revJournal = accountingPostingService.post('ACCRUAL_REVERSAL_POSTED', {
      branchId: accrual.branchId || ctx.branchId,
      sourceType: 'accrual_reversal',
      sourceId: `rev-${accrual.id}`,
      documentNumber: `REV-${accrual.accrualNumber}`,
      documentDate: reversalDate,
      memo: `Auto-Reversal of Accrual ${accrual.accrualNumber}: ${accrual.title}`,
      currency: accrual.currency,
      exchangeRate: accrual.exchangeRate || '1.000000',
      amount: accrual.amount,
      debitAccountId: accrual.creditAccountId, // Debit the accrued liability to extinguish it
      creditAccountId: accrual.debitAccountId, // Credit the expense to reverse it
      departmentId: accrual.departmentId,
      costCenterId: accrual.costCenterId,
      projectId: accrual.projectId,
    }, ctx);

    return db.updateAccrual(accrual.id, {
      status: 'reversed',
      reversalJournalEntryId: revJournal.id,
      reversedAt: new Date().toISOString(),
    }, ctx);
  }

  /**
   * Automatically processes all due accruals that have reached their autoReversalDate
   */
  public processDueAutoReversals(asOfDate: string, ctx: TenantContext): DbAccrualEntry[] {
    const accruals = db.getAccruals(ctx).filter(
      (a) => a.status === 'posted' && a.autoReversalDate && a.autoReversalDate <= asOfDate
    );

    const reversedList: DbAccrualEntry[] = [];
    for (const acc of accruals) {
      const reversed = this.reverseAccrual(acc.id, acc.autoReversalDate || asOfDate, ctx);
      reversedList.push(reversed);
    }
    return reversedList;
  }

  // ==========================================================================
  // 2. PREPAYMENTS & EXPENSE AMORTIZATION SCHEDULES
  // ==========================================================================

  /**
   * Creates a Prepayment Schedule with calculated periodic amortization lines
   */
  public createPrepaymentSchedule(
    payload: Omit<DbPrepaymentSchedule, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'recognizedAmount' | 'remainingAmount' | 'lines'>,
    ctx: TenantContext
  ): DbPrepaymentSchedule {
    const totalAmt = parseFloat(payload.totalAmount);
    const periods = Math.max(1, payload.totalPeriods);
    const lineAmt = (totalAmt / periods).toFixed(4);

    const lines: DbPrepaymentLine[] = [];
    const start = new Date(payload.startDate);

    for (let i = 1; i <= periods; i++) {
      const date = new Date(start);
      if (payload.frequency === 'monthly') {
        date.setMonth(start.getMonth() + (i - 1));
      } else if (payload.frequency === 'quarterly') {
        date.setMonth(start.getMonth() + (i - 1) * 3);
      } else if (payload.frequency === 'annually') {
        date.setFullYear(start.getFullYear() + (i - 1));
      }

      lines.push({
        id: 'pline-' + i,
        periodNumber: i,
        recognitionDate: date.toISOString().slice(0, 10),
        amount: lineAmt,
        status: 'pending',
      });
    }

    return db.createPrepaymentSchedule({
      ...payload,
      recognizedAmount: '0.0000',
      remainingAmount: totalAmt.toFixed(4),
      lines,
    }, ctx);
  }

  /**
   * Executes recognition/amortization for a specific period line in the prepayment schedule
   */
  public postPrepaymentAmortization(scheduleId: string, lineId: string, ctx: TenantContext): DbPrepaymentSchedule {
    const schedule = db.getPrepaymentScheduleById(scheduleId, ctx);
    if (!schedule) throw new Error(`Prepayment schedule '${scheduleId}' not found`);

    const lineIndex = schedule.lines.findIndex((l) => l.id === lineId);
    if (lineIndex === -1) throw new Error(`Amortization line '${lineId}' not found`);

    const line = schedule.lines[lineIndex];
    if (line.status === 'posted') {
      throw new Error(`Amortization line #${line.periodNumber} is already posted.`);
    }

    // Post to GL
    const journal = accountingPostingService.post('PREPAYMENT_AMORTIZATION_POSTED', {
      branchId: schedule.branchId || ctx.branchId,
      sourceType: 'prepayment_schedule',
      sourceId: `${schedule.id}-${line.periodNumber}`,
      documentNumber: `${schedule.scheduleNumber}-P${line.periodNumber}`,
      documentDate: line.recognitionDate,
      memo: `Amortization #${line.periodNumber} for ${schedule.name}`,
      currency: schedule.currency,
      exchangeRate: schedule.exchangeRate || '1.000000',
      amount: line.amount,
      debitAccountId: schedule.targetExpenseAccountId,
      creditAccountId: schedule.prepaidAssetAccountId,
      departmentId: schedule.departmentId,
      costCenterId: schedule.costCenterId,
      projectId: schedule.projectId,
    }, ctx);

    line.status = 'posted';
    line.journalEntryId = journal.id;
    line.postedAt = new Date().toISOString();

    const newRecognized = (parseFloat(schedule.recognizedAmount) + parseFloat(line.amount)).toFixed(4);
    const newRemaining = Math.max(0, parseFloat(schedule.totalAmount) - parseFloat(newRecognized)).toFixed(4);
    const isCompleted = schedule.lines.every((l) => l.status === 'posted' || l.status === 'skipped');

    return db.updatePrepaymentSchedule(schedule.id, {
      recognizedAmount: newRecognized,
      remainingAmount: newRemaining,
      status: isCompleted ? 'completed' : 'active',
      lines: [...schedule.lines],
    }, ctx);
  }

  // ==========================================================================
  // 3. DEFERRED REVENUE RECOGNITION SCHEDULES
  // ==========================================================================

  /**
   * Creates a Deferred / Unearned Revenue Recognition Schedule
   */
  public createDeferredRevenueSchedule(
    payload: Omit<DbDeferredRevenueSchedule, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'recognizedAmount' | 'remainingAmount' | 'lines'>,
    ctx: TenantContext
  ): DbDeferredRevenueSchedule {
    const totalAmt = parseFloat(payload.totalAmount);
    const periods = Math.max(1, payload.totalPeriods);
    const lineAmt = (totalAmt / periods).toFixed(4);

    const lines: DbDeferredRevenueLine[] = [];
    const start = new Date(payload.startDate);

    for (let i = 1; i <= periods; i++) {
      const date = new Date(start);
      if (payload.frequency === 'monthly') {
        date.setMonth(start.getMonth() + (i - 1));
      } else if (payload.frequency === 'quarterly') {
        date.setMonth(start.getMonth() + (i - 1) * 3);
      } else if (payload.frequency === 'annually') {
        date.setFullYear(start.getFullYear() + (i - 1));
      }

      lines.push({
        id: 'dline-' + i,
        periodNumber: i,
        recognitionDate: date.toISOString().slice(0, 10),
        amount: lineAmt,
        status: 'pending',
      });
    }

    return db.createDeferredRevenueSchedule({
      ...payload,
      recognizedAmount: '0.0000',
      remainingAmount: totalAmt.toFixed(4),
      lines,
    }, ctx);
  }

  /**
   * Executes revenue recognition for a specific period line
   */
  public postDeferredRevenueRecognition(scheduleId: string, lineId: string, ctx: TenantContext): DbDeferredRevenueSchedule {
    const schedule = db.getDeferredRevenueScheduleById(scheduleId, ctx);
    if (!schedule) throw new Error(`Deferred revenue schedule '${scheduleId}' not found`);

    const line = schedule.lines.find((l) => l.id === lineId);
    if (!line) throw new Error(`Deferred line '${lineId}' not found`);
    if (line.status === 'posted') throw new Error(`Deferred line #${line.periodNumber} is already posted.`);

    const journal = accountingPostingService.post('DEFERRED_REVENUE_RECOGNIZED', {
      branchId: schedule.branchId || ctx.branchId,
      sourceType: 'deferred_revenue_schedule',
      sourceId: `${schedule.id}-${line.periodNumber}`,
      documentNumber: `${schedule.scheduleNumber}-P${line.periodNumber}`,
      documentDate: line.recognitionDate,
      memo: `Revenue Recognition #${line.periodNumber} for ${schedule.name}`,
      currency: schedule.currency,
      exchangeRate: schedule.exchangeRate || '1.000000',
      amount: line.amount,
      debitAccountId: schedule.deferredRevenueAccountId, // Dr Deferred Liability
      creditAccountId: schedule.targetRevenueAccountId,   // Cr Sales Revenue
      departmentId: schedule.departmentId,
      costCenterId: schedule.costCenterId,
      projectId: schedule.projectId,
    }, ctx);

    line.status = 'posted';
    line.journalEntryId = journal.id;
    line.postedAt = new Date().toISOString();

    const newRecognized = (parseFloat(schedule.recognizedAmount) + parseFloat(line.amount)).toFixed(4);
    const newRemaining = Math.max(0, parseFloat(schedule.totalAmount) - parseFloat(newRecognized)).toFixed(4);
    const isCompleted = schedule.lines.every((l) => l.status === 'posted' || l.status === 'skipped');

    return db.updateDeferredRevenueSchedule(schedule.id, {
      recognizedAmount: newRecognized,
      remainingAmount: newRemaining,
      status: isCompleted ? 'completed' : 'active',
      lines: [...schedule.lines],
    }, ctx);
  }

  // ==========================================================================
  // 4. ACCOUNTING PROVISIONS
  // ==========================================================================

  /**
   * Creates and establishes an accounting provision (e.g. Warranty, Legal, Restructuring)
   */
  public createProvision(
    payload: Omit<DbProvision, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'utilizedAmount' | 'reversedAmount' | 'currentBalance' | 'journalEntryId'>,
    ctx: TenantContext
  ): DbProvision {
    const provision = db.createProvision({
      ...payload,
      currentBalance: payload.originalAmount,
      utilizedAmount: '0.0000',
      reversedAmount: '0.0000',
      status: payload.status || 'active',
    }, ctx);

    // Automatically post initial provision recognition to GL
    const journal = accountingPostingService.post('PROVISION_RECOGNIZED_POSTED', {
      branchId: provision.branchId || ctx.branchId,
      sourceType: 'provision',
      sourceId: provision.id,
      documentNumber: provision.provisionNumber,
      documentDate: provision.effectiveDate,
      memo: `Provision Recognized: ${provision.title} (${provision.provisionType})`,
      currency: provision.currency,
      exchangeRate: '1.000000',
      amount: provision.originalAmount,
      debitAccountId: provision.expenseAccountId,
      creditAccountId: provision.provisionAccountId,
      departmentId: provision.departmentId,
      costCenterId: provision.costCenterId,
    }, ctx);

    return db.updateProvision(provision.id, {
      journalEntryId: journal.id,
      approvedBy: ctx.userId,
    }, ctx);
  }

  /**
   * Utilizes / settles a portion of an existing provision against an actual outflow
   */
  public utilizeProvision(
    provisionId: string,
    amount: string,
    settlementDate: string,
    settlementAccountId: string,
    memo: string,
    ctx: TenantContext
  ): DbProvision {
    const prov = db.getProvisionById(provisionId, ctx);
    if (!prov) throw new Error(`Provision '${provisionId}' not found`);

    const utilAmt = parseFloat(amount);
    const curBal = parseFloat(prov.currentBalance);
    if (utilAmt <= 0) throw new Error('Utilization amount must be greater than zero');
    if (utilAmt > curBal) throw new Error(`Utilization amount (${utilAmt}) exceeds current provision balance (${curBal})`);

    accountingPostingService.post('PROVISION_UTILIZATION_POSTED', {
      branchId: prov.branchId || ctx.branchId,
      sourceType: 'provision_utilization',
      sourceId: `${prov.id}-${Date.now()}`,
      documentNumber: `UTIL-${prov.provisionNumber}`,
      documentDate: settlementDate,
      memo: `Provision Settlement: ${prov.title}. ${memo}`,
      currency: prov.currency,
      exchangeRate: '1.000000',
      amount: utilAmt.toFixed(4),
      debitAccountId: prov.provisionAccountId, // Dr Provision Liability
      creditAccountId: settlementAccountId,    // Cr Bank / AP
    }, ctx);

    const newUtilized = (parseFloat(prov.utilizedAmount) + utilAmt).toFixed(4);
    const newBalance = (curBal - utilAmt).toFixed(4);
    const isSettled = parseFloat(newBalance) === 0;

    return db.updateProvision(prov.id, {
      currentBalance: newBalance,
      utilizedAmount: newUtilized,
      status: isSettled ? 'utilized' : 'active',
    }, ctx);
  }

  /**
   * Reverses an unneeded provision balance back into income/expense
   */
  public reverseProvision(provisionId: string, reversalDate: string, reason: string, ctx: TenantContext): DbProvision {
    const prov = db.getProvisionById(provisionId, ctx);
    if (!prov) throw new Error(`Provision '${provisionId}' not found`);

    const remBal = parseFloat(prov.currentBalance);
    if (remBal <= 0) throw new Error(`Provision '${prov.provisionNumber}' has zero remaining balance to reverse.`);

    accountingPostingService.post('PROVISION_REVERSAL_POSTED', {
      branchId: prov.branchId || ctx.branchId,
      sourceType: 'provision_reversal',
      sourceId: `rev-${prov.id}`,
      documentNumber: `REV-${prov.provisionNumber}`,
      documentDate: reversalDate,
      memo: `Provision Reversal: ${prov.title}. Reason: ${reason}`,
      currency: prov.currency,
      exchangeRate: '1.000000',
      amount: remBal.toFixed(4),
      debitAccountId: prov.provisionAccountId, // Dr Provision Liability
      creditAccountId: prov.expenseAccountId,   // Cr Expense (reducing expense)
    }, ctx);

    return db.updateProvision(prov.id, {
      currentBalance: '0.0000',
      reversedAmount: (parseFloat(prov.reversedAmount) + remBal).toFixed(4),
      status: 'reversed',
    }, ctx);
  }

  // ==========================================================================
  // 5. RECURRING JOURNALS ENGINE
  // ==========================================================================

  /**
   * Creates a recurring journal template
   */
  public createRecurringTemplate(
    payload: Omit<DbRecurringJournalTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'generatedCount' | 'lastRunDate' | 'lastJournalEntryId'>,
    ctx: TenantContext
  ): DbRecurringJournalTemplate {
    return db.createRecurringJournalTemplate({
      ...payload,
      status: payload.status || 'active',
    }, ctx);
  }

  /**
   * Generates and posts the next recurring journal for a template
   */
  public generateNextRecurringJournal(templateId: string, runDate: string, ctx: TenantContext) {
    const template = db.getRecurringJournalTemplateById(templateId, ctx);
    if (!template) throw new Error(`Recurring journal template '${templateId}' not found`);
    if (template.status !== 'active') throw new Error(`Template '${template.templateCode}' is ${template.status}`);

    const nextRun = template.nextRunDate;
    if (runDate < nextRun) {
      throw new Error(`Cannot run recurring journal before scheduled run date ${nextRun}`);
    }

    // Check period
    const period = db.getAccountingPeriods(ctx).find((p) => runDate >= p.startDate && runDate <= p.endDate);
    if (!period || period.status !== 'open') {
      throw new PeriodClosedError(period?.name || 'Period', period?.status || 'closed');
    }

    // Calculate total debit
    const totalDebit = template.lines.reduce((sum, l) => sum + parseFloat(l.debitAmount || '0'), 0).toFixed(4);

    const journal = accountingPostingService.post('MANUAL_JOURNAL_POSTED', {
      branchId: template.branchId || ctx.branchId,
      sourceType: 'recurring_journal',
      sourceId: `${template.id}-${template.generatedCount + 1}`,
      documentNumber: `${template.templateCode}-RUN${template.generatedCount + 1}`,
      documentDate: runDate,
      memo: `Recurring Journal Run #${template.generatedCount + 1}: ${template.templateName}`,
      currency: template.currency,
      exchangeRate: '1.000000',
      amount: totalDebit,
      customLines: template.lines.map((l) => ({
        accountId: l.accountId,
        description: l.description,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
        departmentId: l.departmentId,
        costCenterId: l.costCenterId,
        projectId: l.projectId,
      })),
    }, ctx);

    // Calculate next run date
    const curDate = new Date(runDate);
    if (template.frequency === 'monthly') {
      curDate.setMonth(curDate.getMonth() + 1);
    } else if (template.frequency === 'quarterly') {
      curDate.setMonth(curDate.getMonth() + 3);
    } else if (template.frequency === 'annually') {
      curDate.setFullYear(curDate.getFullYear() + 1);
    }
    const newNextRun = curDate.toISOString().slice(0, 10);

    const isFinished = template.endDate && newNextRun > template.endDate;

    const updated = db.updateRecurringJournalTemplate(template.id, {
      generatedCount: template.generatedCount + 1,
      lastRunDate: runDate,
      nextRunDate: newNextRun,
      lastJournalEntryId: journal.id,
      status: isFinished ? 'completed' : 'active',
    }, ctx);

    return { template: updated, journal };
  }
}

export const accrualsPrepaymentsService = new AccrualsPrepaymentsService();
