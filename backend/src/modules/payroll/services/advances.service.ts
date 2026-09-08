// ============================================================================
// Employee Advances & Staff Loans Domain Service
// ============================================================================

import { db } from '@/database/storage';
import { DbEmployeeAdvance, EmployeeAdvanceStatus } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { permissionService } from '@/modules/authorization/services/permission-service';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface ApplyAdvanceDTO {
  employeeId: string;
  requestDate: string;
  principalAmount: string;
  purpose: string;
  repaymentMonths: number;
  monthlyDeductionAmount?: string;
  currency?: string;
}

export class AdvancesService {
  public getAdvances(ctx: TenantContext, employeeId?: string): DbEmployeeAdvance[] {
    permissionService.assertPermission(ctx, 'payroll.view');
    return db.getEmployeeAdvances(ctx, employeeId);
  }

  public getAdvanceById(id: string, ctx: TenantContext): DbEmployeeAdvance | undefined {
    return db.getEmployeeAdvanceById(id, ctx);
  }

  public applyAdvance(payload: ApplyAdvanceDTO, ctx: TenantContext): DbEmployeeAdvance {
    permissionService.assertPermission(ctx, 'payroll.manage');

    const emp = db.getEmployeeById(payload.employeeId, ctx);
    if (!emp) throw new Error(`Employee '${payload.employeeId}' not found`);

    const principal = parseFloat(payload.principalAmount) || 0;
    if (principal <= 0) throw new Error('Principal amount must be greater than zero');

    const months = Math.max(payload.repaymentMonths, 1);
    const monthlyDed = payload.monthlyDeductionAmount
      ? parseFloat(payload.monthlyDeductionAmount)
      : principal / months;

    const allAdvances = db.getEmployeeAdvances(ctx);
    const year = new Date(payload.requestDate).getFullYear();
    const advNum = `ADV-${year}-${(allAdvances.length + 1).toString().padStart(4, '0')}`;

    return db.createEmployeeAdvance(
      {
        advanceNumber: advNum,
        employeeId: payload.employeeId,
        requestDate: payload.requestDate,
        principalAmount: principal.toFixed(4),
        currency: payload.currency || ctx.baseCurrency,
        exchangeRate: '1.000000',
        purpose: payload.purpose,
        repaymentMonths: months,
        monthlyDeductionAmount: monthlyDed.toFixed(4),
        totalRepaid: '0.0000',
        remainingBalance: principal.toFixed(4),
        status: 'draft',
      },
      ctx
    );
  }

  public approveAdvance(advanceId: string, ctx: TenantContext): DbEmployeeAdvance {
    permissionService.assertPermission(ctx, 'payroll.approve');

    const adv = db.getEmployeeAdvanceById(advanceId, ctx);
    if (!adv) throw new Error(`Advance '${advanceId}' not found`);

    return db.updateEmployeeAdvance(
      advanceId,
      {
        status: 'approved',
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
      },
      ctx
    );
  }

  public disburseAdvance(
    advanceId: string,
    bankAccountId: string,
    disbursementDate: string,
    ctx: TenantContext
  ): DbEmployeeAdvance {
    permissionService.assertPermission(ctx, 'payroll.post');

    const adv = db.getEmployeeAdvanceById(advanceId, ctx);
    if (!adv) throw new Error(`Advance '${advanceId}' not found`);
    if (adv.status !== 'approved' && adv.status !== 'draft') {
      throw new Error(`Advance '${advanceId}' is in status '${adv.status}' and cannot be disbursed.`);
    }

    const emp = db.getEmployeeById(adv.employeeId, ctx);

    // Call centralized AccountingPostingService for double-entry GL journal
    // Dr #1250 Employee Advances, Cr #1010 Operating Bank
    const postResult = accountingPostingService.post(
      'EMPLOYEE_ADVANCE_DISBURSED',
      {
        sourceType: 'PAYROLL',
        sourceId: adv.id,
        documentNumber: adv.advanceNumber,
        documentDate: disbursementDate,
        amount: adv.principalAmount,
        currency: adv.currency,
        exchangeRate: adv.exchangeRate,
        memo: `Employee Advance Disbursement: ${adv.advanceNumber} - ${emp?.fullName || ''}`,
        subLedgerEntityId: adv.employeeId,
      },
      ctx
    );

    return db.updateEmployeeAdvance(
      advanceId,
      {
        status: 'disbursed',
        disbursementDate,
        bankAccountId,
        disbursementJournalId: postResult.id,
      },
      ctx
    );
  }

  public recordRepayment(
    advanceId: string,
    repaymentAmount: number,
    ctx: TenantContext
  ): DbEmployeeAdvance {
    const adv = db.getEmployeeAdvanceById(advanceId, ctx);
    if (!adv) throw new Error(`Advance '${advanceId}' not found`);

    const currentRepaid = parseFloat(adv.totalRepaid) || 0;
    const principal = parseFloat(adv.principalAmount) || 0;
    const newRepaid = currentRepaid + repaymentAmount;
    const newRemaining = Math.max(0, principal - newRepaid);

    let newStatus: EmployeeAdvanceStatus = 'repaying';
    if (newRemaining <= 0.0001) {
      newStatus = 'fully_repaid';
    }

    return db.updateEmployeeAdvance(
      advanceId,
      {
        totalRepaid: newRepaid.toFixed(4),
        remainingBalance: newRemaining.toFixed(4),
        status: newStatus,
      },
      ctx
    );
  }
}

export const advancesService = new AdvancesService();
