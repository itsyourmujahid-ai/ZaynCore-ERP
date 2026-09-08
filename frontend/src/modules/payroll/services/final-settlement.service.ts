// ============================================================================
// Employee Final Settlement & EOSB Gratuity Domain Service
// ============================================================================

import { db } from '@/database/storage';
import { DbFinalSettlement } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { permissionService } from '@/modules/authorization/services/permission-service';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { advancesService } from './advances.service';

export interface CalculateSettlementDTO {
  employeeId: string;
  terminationDate: string;
  unpaidSalaryDays?: number;
  bonusOrIncentiveAmount?: string;
  noticePeriodDeductionAmount?: string;
  notes?: string;
}

export class FinalSettlementService {
  public getSettlements(ctx: TenantContext, employeeId?: string): DbFinalSettlement[] {
    permissionService.assertPermission(ctx, 'payroll.view');
    return db.getFinalSettlements(ctx, employeeId);
  }

  public getSettlementById(id: string, ctx: TenantContext): DbFinalSettlement | undefined {
    return db.getFinalSettlementById(id, ctx);
  }

  public calculateSettlement(
    payload: CalculateSettlementDTO,
    ctx: TenantContext
  ): DbFinalSettlement {
    permissionService.assertPermission(ctx, 'payroll.manage');

    const emp = db.getEmployeeById(payload.employeeId, ctx);
    if (!emp) throw new Error(`Employee '${payload.employeeId}' not found`);

    const basicSalary = parseFloat(emp.basicSalary) || 0;
    const dailyRate = basicSalary / 30; // 30-day standard divisor

    // 1. Unpaid salary calculation
    const unpaidDays = payload.unpaidSalaryDays !== undefined ? payload.unpaidSalaryDays : 0;
    const unpaidSalaryAmt = unpaidDays * dailyRate;

    // 2. Leave encashment calculation
    const currentYear = new Date(payload.terminationDate).getFullYear();
    const annualLeaveType = db.getLeaveTypes(ctx).find((lt) => lt.code === 'ANNUAL');
    let leaveBalanceDays = 0;
    if (annualLeaveType) {
      const bal = db.getLeaveBalance(emp.id, annualLeaveType.id, currentYear, ctx);
      if (bal) {
        leaveBalanceDays = Math.max(0, parseFloat(bal.available) || 0);
      }
    }
    const leaveEncashmentAmt = leaveBalanceDays * dailyRate;

    // 3. Statutory Gratuity / End of Service (EOSB) calculation
    // Standard rule: <= 5 years = 15 days basic per year; > 5 years = 30 days basic per year
    const joinDate = new Date(emp.joiningDate);
    const termDate = new Date(payload.terminationDate);
    const serviceYears = Math.max(0, (termDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

    let gratuityAmt = 0;
    if (serviceYears >= 1) {
      if (serviceYears <= 5) {
        gratuityAmt = serviceYears * (15 / 30) * basicSalary;
      } else {
        gratuityAmt = 5 * (15 / 30) * basicSalary + (serviceYears - 5) * (30 / 30) * basicSalary;
      }
    }

    // 4. Outstanding loan / advance recovery
    const activeAdvances = db.getEmployeeAdvances(ctx, emp.id).filter(
      (a) => a.status === 'disbursed' || a.status === 'repaying'
    );
    const totalOutstandingLoans = activeAdvances.reduce(
      (sum, a) => sum + (parseFloat(a.remainingBalance) || 0),
      0
    );

    // 5. Additions & Deductions
    const bonus = parseFloat(payload.bonusOrIncentiveAmount || '0') || 0;
    const noticeDed = parseFloat(payload.noticePeriodDeductionAmount || '0') || 0;

    const grossSettlement = unpaidSalaryAmt + leaveEncashmentAmt + gratuityAmt + bonus;
    const totalDeductions = totalOutstandingLoans + noticeDed;
    const netSettlement = Math.max(0, grossSettlement - totalDeductions);

    const allSettlements = db.getFinalSettlements(ctx);
    const setNum = `SET-${currentYear}-${(allSettlements.length + 1).toString().padStart(4, '0')}`;

    return db.createFinalSettlement(
      {
        settlementNumber: setNum,
        employeeId: payload.employeeId,
        terminationDate: payload.terminationDate,
        unpaidSalaryDays: unpaidDays,
        unpaidSalaryAmount: unpaidSalaryAmt.toFixed(4),
        leaveBalanceDays,
        leaveEncashmentAmount: leaveEncashmentAmt.toFixed(4),
        gratuityOrSeveranceAmount: gratuityAmt.toFixed(4),
        bonusOrIncentiveAmount: bonus.toFixed(4),
        loanDeductionsAmount: totalOutstandingLoans.toFixed(4),
        noticePeriodDeductionAmount: noticeDed.toFixed(4),
        netSettlementAmount: netSettlement.toFixed(4),
        currency: emp.currency || ctx.baseCurrency,
        status: 'calculated',
        notes: payload.notes,
      },
      ctx
    );
  }

  public approveSettlement(settlementId: string, ctx: TenantContext): DbFinalSettlement {
    permissionService.assertPermission(ctx, 'payroll.approve');

    const set = db.getFinalSettlementById(settlementId, ctx);
    if (!set) throw new Error(`Settlement '${settlementId}' not found`);

    return db.updateFinalSettlement(
      settlementId,
      {
        status: 'approved',
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
      },
      ctx
    );
  }

  public postSettlement(settlementId: string, ctx: TenantContext): DbFinalSettlement {
    permissionService.assertPermission(ctx, 'payroll.post');

    const set = db.getFinalSettlementById(settlementId, ctx);
    if (!set) throw new Error(`Settlement '${settlementId}' not found`);
    if (set.status === 'posted') throw new Error(`Settlement '${settlementId}' is already posted.`);

    const emp = db.getEmployeeById(set.employeeId, ctx);
    const netVal = parseFloat(set.netSettlementAmount) || 0;

    // Call centralized Accounting Posting Engine
    const postResult = accountingPostingService.post(
      'FINAL_SETTLEMENT_POSTED',
      {
        sourceType: 'PAYROLL',
        sourceId: set.id,
        documentNumber: set.settlementNumber,
        documentDate: set.terminationDate,
        amount: netVal.toFixed(4),
        currency: set.currency,
        exchangeRate: '1.000000',
        memo: `Final Settlement & EOSB: ${set.settlementNumber} - ${emp?.fullName || ''}`,
        subLedgerEntityId: set.employeeId,
      },
      ctx
    );

    // Offset employee advances if any were deducted
    const loanDeduction = parseFloat(set.loanDeductionsAmount) || 0;
    if (loanDeduction > 0) {
      const activeAdvances = db.getEmployeeAdvances(ctx, set.employeeId).filter(
        (a) => a.status === 'disbursed' || a.status === 'repaying'
      );
      for (const adv of activeAdvances) {
        advancesService.recordRepayment(adv.id, parseFloat(adv.remainingBalance), ctx);
      }
    }

    // Mark employee as terminated
    if (emp) {
      db.updateEmployee(
        emp.id,
        {
          employmentStatus: 'terminated',
          isActive: false,
          terminationDate: set.terminationDate,
          terminationReason: set.notes || 'Final settlement processed',
        },
        ctx
      );
    }

    return db.updateFinalSettlement(
      settlementId,
      {
        status: 'posted',
        journalEntryId: postResult.id,
        postedBy: ctx.userId,
        postedAt: new Date().toISOString(),
      },
      ctx
    );
  }
}

export const finalSettlementService = new FinalSettlementService();
