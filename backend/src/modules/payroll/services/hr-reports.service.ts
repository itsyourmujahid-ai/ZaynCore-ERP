// ============================================================================
// HR & Payroll Reporting & Sub-Ledger vs GL Reconciliation Domain Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { permissionService } from '@/modules/authorization/services/permission-service';

export interface HRDashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  pendingLeaveRequests: number;
  pendingAdvancesCount: number;
  currentMonthGrossPayroll: string;
  totalAccruedSalariesPayable: string;
  currency: string;
}

export interface PayrollSubLedgerReconciliation {
  asOfDate: string;
  currency: string;
  subLedgerNetPayable: string;
  glControlAccountCode: string;
  glControlAccountName: string;
  glControlAccountBalance: string;
  variance: string;
  isReconciled: boolean;
  activePeriodsCount: number;
  settledPeriodsCount: number;
  details: {
    totalPostedPayrollAccrued: string;
    totalSalaryPaymentsDisbursed: string;
    totalFinalSettlementsAccrued: string;
  };
}

export class HRReportsService {
  public getDashboardMetrics(ctx: TenantContext): HRDashboardMetrics {
    permissionService.assertPermission(ctx, 'payroll.view');

    const employees = db.getEmployees(ctx);
    const activeEmployees = employees.filter((e) => e.isActive && e.employmentStatus === 'active').length;
    const onLeaveEmployees = employees.filter((e) => e.employmentStatus === 'on_leave').length;

    const leaveRequests = db.getLeaveRequests(ctx);
    const pendingLeave = leaveRequests.filter((r) => r.status === 'submitted').length;

    const advances = db.getEmployeeAdvances(ctx);
    const pendingAdvances = advances.filter((a) => a.status === 'draft' || a.status === 'approved').length;

    const periods = db.getPayrollPeriods(ctx);
    const latestPeriod = periods[periods.length - 1];
    const grossPayroll = latestPeriod ? latestPeriod.totalGrossSalary : '0.0000';

    // Calculate current net balance on Account #2300 in GL
    const accounts = db.getAccounts(ctx);
    const payableAcc = accounts.find((a) => a.code === '2300') || accounts.find((a) => a.classification === 'liability');
    let glPayableBalance = 0;

    if (payableAcc) {
      const journalLines = db.getJournalLines(ctx);
      for (const line of journalLines) {
        if (line.accountId === payableAcc.id) {
          const cr = parseFloat(line.creditAmount) || 0;
          const dr = parseFloat(line.debitAmount) || 0;
          glPayableBalance += cr - dr; // Normal balance: Credit
        }
      }
    }

    return {
      totalEmployees: employees.length,
      activeEmployees,
      onLeaveEmployees,
      pendingLeaveRequests: pendingLeave,
      pendingAdvancesCount: pendingAdvances,
      currentMonthGrossPayroll: grossPayroll,
      totalAccruedSalariesPayable: glPayableBalance.toFixed(4),
      currency: ctx.baseCurrency,
    };
  }

  public getPayrollSubLedgerReconciliation(ctx: TenantContext): PayrollSubLedgerReconciliation {
    permissionService.assertPermission(ctx, 'payroll.view');

    const periods = db.getPayrollPeriods(ctx);
    const postedPeriods = periods.filter((p) => p.status === 'posted' || p.status === 'paid' || p.status === 'closed');
    const settlements = db.getFinalSettlements(ctx).filter((s) => s.status === 'posted');

    let totalPostedNet = 0;
    let totalDisbursed = 0;
    for (const p of postedPeriods) {
      totalPostedNet += parseFloat(p.totalNetSalary) || 0;
      totalDisbursed += parseFloat(p.paidAmount) || 0;
    }

    let totalSettlementsNet = 0;
    for (const s of settlements) {
      totalSettlementsNet += parseFloat(s.netSettlementAmount) || 0;
    }

    const subLedgerNet = totalPostedNet + totalSettlementsNet - totalDisbursed;

    // Get GL balance on Account #2300
    const accounts = db.getAccounts(ctx);
    const payableAcc =
      accounts.find((a) => a.code === '2300') ||
      accounts.find((a) => a.name.toLowerCase().includes('payroll') || a.name.toLowerCase().includes('salaries')) ||
      accounts[0];

    let glCreditSum = 0;
    let glDebitSum = 0;

    if (payableAcc) {
      const journalLines = db.getJournalLines(ctx);
      for (const line of journalLines) {
        if (line.accountId === payableAcc.id) {
          glCreditSum += parseFloat(line.creditAmount) || 0;
          glDebitSum += parseFloat(line.debitAmount) || 0;
        }
      }
    }

    const glNetBalance = glCreditSum - glDebitSum;
    const variance = Math.abs(subLedgerNet - glNetBalance);
    const isReconciled = variance < 0.01;

    return {
      asOfDate: new Date().toISOString().split('T')[0],
      currency: ctx.baseCurrency,
      subLedgerNetPayable: subLedgerNet.toFixed(4),
      glControlAccountCode: payableAcc?.code || '2300',
      glControlAccountName: payableAcc?.name || 'Accrued Payroll & Salaries Payable',
      glControlAccountBalance: glNetBalance.toFixed(4),
      variance: variance.toFixed(4),
      isReconciled,
      activePeriodsCount: postedPeriods.filter((p) => p.paymentStatus !== 'paid').length,
      settledPeriodsCount: postedPeriods.filter((p) => p.paymentStatus === 'paid').length,
      details: {
        totalPostedPayrollAccrued: totalPostedNet.toFixed(4),
        totalSalaryPaymentsDisbursed: totalDisbursed.toFixed(4),
        totalFinalSettlementsAccrued: totalSettlementsNet.toFixed(4),
      },
    };
  }
}

export const hrReportsService = new HRReportsService();
