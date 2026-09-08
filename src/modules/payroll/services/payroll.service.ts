// ============================================================================
// Payroll Engine & Salary Calculation Domain Service
// ============================================================================

import { db } from '@/database/storage';
import {
  DbPayrollPeriod,
  DbPayrollEntry,
  DbPayrollLineItem,
  DbSalaryStructure,
  DbSalaryComponent,
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { permissionService } from '@/modules/authorization/services/permission-service';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { advancesService } from './advances.service';

export interface CreatePayrollPeriodDTO {
  periodName: string;
  periodCode?: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  branchId?: string;
  currency?: string;
  notes?: string;
}

export class PayrollService {
  // --- Structures & Components ---
  public getSalaryStructures(ctx: TenantContext): DbSalaryStructure[] {
    return db.getSalaryStructures(ctx);
  }

  public getSalaryStructureById(id: string, ctx: TenantContext): DbSalaryStructure | undefined {
    return db.getSalaryStructureById(id, ctx);
  }

  public createSalaryStructure(
    payload: Omit<DbSalaryStructure, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbSalaryStructure {
    permissionService.assertPermission(ctx, 'payroll.manage');
    return db.createSalaryStructure(payload, ctx);
  }

  public getSalaryComponents(ctx: TenantContext): DbSalaryComponent[] {
    return db.getSalaryComponents(ctx);
  }

  public createSalaryComponent(
    payload: Omit<DbSalaryComponent, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbSalaryComponent {
    permissionService.assertPermission(ctx, 'payroll.manage');
    return db.createSalaryComponent(payload, ctx);
  }

  // --- Payroll Periods ---
  public getPayrollPeriods(ctx: TenantContext): DbPayrollPeriod[] {
    permissionService.assertPermission(ctx, 'payroll.view');
    return db.getPayrollPeriods(ctx);
  }

  public getPayrollPeriodById(id: string, ctx: TenantContext): DbPayrollPeriod | undefined {
    return db.getPayrollPeriodById(id, ctx);
  }

  public getPayrollEntries(periodId: string, ctx: TenantContext): DbPayrollEntry[] {
    permissionService.assertPermission(ctx, 'payroll.view');
    return db.getPayrollEntries(periodId, ctx);
  }

  public createPayrollPeriod(
    payload: CreatePayrollPeriodDTO,
    ctx: TenantContext
  ): DbPayrollPeriod {
    permissionService.assertPermission(ctx, 'payroll.manage');

    let code = payload.periodCode;
    if (!code) {
      const year = new Date(payload.startDate).getFullYear();
      const month = (new Date(payload.startDate).getMonth() + 1).toString().padStart(2, '0');
      code = `PR-${year}-${month}`;
    }

    return db.createPayrollPeriod(
      {
        periodName: payload.periodName,
        periodCode: code,
        startDate: payload.startDate,
        endDate: payload.endDate,
        paymentDate: payload.paymentDate,
        branchId: payload.branchId,
        status: 'draft',
        employeeCount: 0,
        totalGrossSalary: '0.0000',
        totalAllowances: '0.0000',
        totalOvertime: '0.0000',
        totalBonuses: '0.0000',
        totalDeductions: '0.0000',
        totalAdvancesDeducted: '0.0000',
        totalTaxWithheld: '0.0000',
        totalNetSalary: '0.0000',
        totalEmployerCost: '0.0000',
        currency: payload.currency || ctx.baseCurrency,
        exchangeRate: '1.000000',
        paymentStatus: 'unpaid',
        paidAmount: '0.0000',
        notes: payload.notes,
      },
      ctx
    );
  }

  public calculatePeriodPayroll(periodId: string, ctx: TenantContext): DbPayrollPeriod {
    permissionService.assertPermission(ctx, 'payroll.manage');

    const period = db.getPayrollPeriodById(periodId, ctx);
    if (!period) throw new Error(`Payroll period '${periodId}' not found`);
    if (period.status === 'posted' || period.status === 'paid' || period.status === 'closed') {
      throw new Error(`Cannot recalculate payroll period in '${period.status}' status.`);
    }

    // Clear prior entries for this period
    db.deletePayrollEntriesForPeriod(periodId, ctx);

    const allEmployees = db.getEmployees(ctx).filter((e) => e.isActive);
    const structures = db.getSalaryStructures(ctx);
    const defaultStructure = structures.find((s) => s.isDefault) || structures[0];

    const activeAdvances = db.getEmployeeAdvances(ctx).filter(
      (a) => a.status === 'disbursed' || a.status === 'repaying'
    );

    let aggGross = 0;
    let aggAllowances = 0;
    let aggOvertime = 0;
    let aggBonuses = 0;
    let aggDeductions = 0;
    let aggAdvances = 0;
    let aggTax = 0;
    let aggNet = 0;
    let count = 0;

    for (const emp of allEmployees) {
      if (period.branchId && emp.branchId && emp.branchId !== period.branchId) {
        continue;
      }

      count += 1;
      const basic = parseFloat(emp.basicSalary) || 0;
      const hourlyRate = basic / (30 * 8); // 30-day standard divisor, 8 hours/day
      const dailyRate = basic / 30;

      const empStructure =
        structures.find((s) => s.id === emp.salaryStructureId) || defaultStructure;

      const lineItems: DbPayrollLineItem[] = [
        {
          componentCode: 'BASIC',
          componentName: 'Basic Salary',
          type: 'earning',
          amount: basic.toFixed(4),
          accountId: 'a-6010',
        },
      ];

      let empAllowances = 0;
      let empOvertime = 0;
      let empBonuses = 0;
      let empAbsenceDed = 0;
      let empAdvanceDed = 0;
      let empTaxDed = 0;
      let empOtherDed = 0;

      // 1. Process Structure Earnings & Deductions
      if (empStructure && empStructure.components) {
        for (const sc of empStructure.components) {
          if (sc.componentCode === 'BASIC') continue;

          let val = 0;
          const rateOrAmt = parseFloat(sc.rateOrAmount) || 0;

          if (sc.calculationMethod === 'fixed_amount') {
            val = rateOrAmt;
          } else if (sc.calculationMethod === 'percentage_of_basic') {
            val = basic * rateOrAmt;
          }

          if (sc.type === 'earning') {
            if (sc.componentCode === 'HOUSING' || sc.componentCode === 'TRANSPORT' || sc.componentCode.includes('ALLOWANCE')) {
              empAllowances += val;
            } else if (sc.componentCode === 'BONUS') {
              empBonuses += val;
            } else {
              empAllowances += val;
            }
            lineItems.push({
              componentId: sc.componentId,
              componentCode: sc.componentCode,
              componentName: sc.componentName,
              type: 'earning',
              amount: val.toFixed(4),
              accountId: sc.expenseAccountId || 'a-6012',
            });
          }
        }
      }

      // 2. Attendance & Overtime Integration
      const attRecords = db.getAttendanceRecords(ctx, undefined, emp.id).filter(
        (a) => a.attendanceDate >= period.startDate && a.attendanceDate <= period.endDate
      );

      let totalOtHours = 0;
      let absentDays = 0;
      for (const rec of attRecords) {
        totalOtHours += parseFloat(rec.overtimeHours || '0') || 0;
        if (rec.status === 'absent') absentDays += 1;
      }

      if (totalOtHours > 0) {
        const otMultiplier = 1.5;
        empOvertime = totalOtHours * hourlyRate * otMultiplier;
        lineItems.push({
          componentCode: 'OVERTIME',
          componentName: `Overtime Hours Pay (${totalOtHours.toFixed(1)} hrs)`,
          type: 'earning',
          amount: empOvertime.toFixed(4),
          rateOrUnits: `${totalOtHours.toFixed(1)} hrs @ ${(hourlyRate * otMultiplier).toFixed(2)}/hr`,
          accountId: 'a-6015',
        });
      }

      if (absentDays > 0) {
        empAbsenceDed = absentDays * dailyRate;
        lineItems.push({
          componentCode: 'ABSENCE_DEDUCTION',
          componentName: `Unexcused Absence Deduction (${absentDays} days)`,
          type: 'deduction',
          amount: empAbsenceDed.toFixed(4),
          rateOrUnits: `${absentDays} days @ ${dailyRate.toFixed(2)}/day`,
          accountId: 'a-6010',
        });
      }

      // 3. Employee Advances Recovery Integration
      const empAdvances = activeAdvances.filter((a) => a.employeeId === emp.id);
      for (const adv of empAdvances) {
        const rem = parseFloat(adv.remainingBalance) || 0;
        const monthly = parseFloat(adv.monthlyDeductionAmount) || 0;
        const ded = Math.min(rem, monthly);
        if (ded > 0) {
          empAdvanceDed += ded;
          lineItems.push({
            componentCode: 'ADVANCE_RECOVERY',
            componentName: `Staff Advance Recovery (${adv.advanceNumber})`,
            type: 'deduction',
            amount: ded.toFixed(4),
            accountId: 'a-1250',
          });
        }
      }

      const gross = basic + empAllowances + empOvertime + empBonuses;
      const totalDed = empAbsenceDed + empAdvanceDed + empTaxDed + empOtherDed;
      const net = Math.max(0, gross - totalDed);

      db.createPayrollEntry(
        {
          payrollPeriodId: period.id,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.fullName,
          departmentId: emp.departmentId,
          costCenterId: emp.costCenterId,
          basicSalary: basic.toFixed(4),
          totalAllowances: empAllowances.toFixed(4),
          totalOvertime: empOvertime.toFixed(4),
          totalBonuses: empBonuses.toFixed(4),
          grossSalary: gross.toFixed(4),
          absenceDeductions: empAbsenceDed.toFixed(4),
          advanceDeductions: empAdvanceDed.toFixed(4),
          taxDeductions: empTaxDed.toFixed(4),
          otherDeductions: empOtherDed.toFixed(4),
          totalDeductions: totalDed.toFixed(4),
          netSalary: net.toFixed(4),
          currency: emp.currency || period.currency,
          exchangeRate: '1.000000',
          status: 'draft',
          lineItems,
        },
        ctx
      );

      aggGross += gross;
      aggAllowances += empAllowances;
      aggOvertime += empOvertime;
      aggBonuses += empBonuses;
      aggDeductions += totalDed;
      aggAdvances += empAdvanceDed;
      aggTax += empTaxDed;
      aggNet += net;
    }

    return db.updatePayrollPeriod(
      period.id,
      {
        employeeCount: count,
        totalGrossSalary: aggGross.toFixed(4),
        totalAllowances: aggAllowances.toFixed(4),
        totalOvertime: aggOvertime.toFixed(4),
        totalBonuses: aggBonuses.toFixed(4),
        totalDeductions: aggDeductions.toFixed(4),
        totalAdvancesDeducted: aggAdvances.toFixed(4),
        totalTaxWithheld: aggTax.toFixed(4),
        totalNetSalary: aggNet.toFixed(4),
        totalEmployerCost: aggGross.toFixed(4),
        status: 'pending_approval',
      },
      ctx
    );
  }

  public approvePayrollPeriod(periodId: string, ctx: TenantContext): DbPayrollPeriod {
    permissionService.assertPermission(ctx, 'payroll.approve');

    const period = db.getPayrollPeriodById(periodId, ctx);
    if (!period) throw new Error(`Payroll period '${periodId}' not found`);
    if (period.status === 'posted' || period.status === 'paid') {
      throw new Error(`Payroll period '${periodId}' is already posted.`);
    }

    return db.updatePayrollPeriod(
      periodId,
      {
        status: 'approved',
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
      },
      ctx
    );
  }

  public postPayrollPeriod(periodId: string, ctx: TenantContext): DbPayrollPeriod {
    permissionService.assertPermission(ctx, 'payroll.post');

    const period = db.getPayrollPeriodById(periodId, ctx);
    if (!period) throw new Error(`Payroll period '${periodId}' not found`);
    if (period.status === 'posted' || period.status === 'paid') {
      throw new Error(`Payroll period '${periodId}' is already posted.`);
    }
    if (period.status !== 'approved') {
      throw new Error(`Payroll period '${periodId}' must be approved prior to GL posting.`);
    }

    const netVal = parseFloat(period.totalNetSalary) || 0;
    const entries = db.getPayrollEntries(period.id, ctx);

    // Post to centralized General Ledger Engine
    const postResult = accountingPostingService.post(
      'PAYROLL_PERIOD_POSTED',
      {
        sourceType: 'PAYROLL',
        sourceId: period.id,
        documentNumber: period.periodCode,
        documentDate: period.endDate,
        amount: netVal.toFixed(4),
        currency: period.currency,
        exchangeRate: period.exchangeRate,
        memo: `Payroll Accrual Posting: ${period.periodName} (${period.employeeCount} employees)`,
        entries: entries.map(e => ({
          employeeId: e.employeeId,
          employeeName: e.employeeName,
          amount: e.netSalary,
          netSalary: e.netSalary,
        })),
      },
      ctx
    );

    // Update advance repayments
    for (const entry of entries) {
      const advDed = parseFloat(entry.advanceDeductions) || 0;
      if (advDed > 0) {
        const empAdvances = db.getEmployeeAdvances(ctx, entry.employeeId).filter(
          (a) => a.status === 'disbursed' || a.status === 'repaying'
        );
        for (const adv of empAdvances) {
          const rem = parseFloat(adv.remainingBalance) || 0;
          const ded = Math.min(rem, advDed);
          if (ded > 0) {
            advancesService.recordRepayment(adv.id, ded, ctx);
          }
        }
      }
    }

    return db.updatePayrollPeriod(
      periodId,
      {
        status: 'posted',
        journalEntryId: postResult.id,
        postedBy: ctx.userId,
        postedAt: new Date().toISOString(),
      },
      ctx
    );
  }

  public disburseSalaryPayment(
    periodId: string,
    bankAccountId: string,
    paymentDate: string,
    ctx: TenantContext
  ): DbPayrollPeriod {
    permissionService.assertPermission(ctx, 'payroll.post');

    const period = db.getPayrollPeriodById(periodId, ctx);
    if (!period) throw new Error(`Payroll period '${periodId}' not found`);
    if (period.status !== 'posted') {
      throw new Error(`Payroll period '${periodId}' must be posted to GL before disbursing salary payments.`);
    }

    const netVal = parseFloat(period.totalNetSalary) || 0;
    const entries = db.getPayrollEntries(period.id, ctx);

    // 1. Double-Entry Posting: Dr #2300 Accrued Salaries Payable, Cr #1010 Operating Bank
    const postResult = accountingPostingService.post(
      'SALARY_PAYMENT_DISBURSED',
      {
        sourceType: 'PAYROLL',
        sourceId: period.id,
        documentNumber: `PAY-${period.periodCode}`,
        documentDate: paymentDate,
        amount: netVal.toFixed(4),
        currency: period.currency,
        exchangeRate: period.exchangeRate,
        memo: `Bank Salary Disbursement: ${period.periodName} (${period.employeeCount} employees)`,
        entries: entries.map(e => ({
          employeeId: e.employeeId,
          employeeName: e.employeeName,
          amount: e.netSalary,
          netSalary: e.netSalary,
        })),
      },
      ctx
    );

    // 2. Integration with Banking Module: Record outgoing bank withdrawal transaction
    let bankTxId: string | undefined;
    try {
      const bankAccounts = db.getBankAccounts(ctx);
      const bank = bankAccounts.find((b) => b.id === bankAccountId) || bankAccounts[0];
      if (bank) {
        const tx = db.createBankTransaction(
          {
            bankAccountId: bank.id,
            transactionNumber: `BTX-PAY-${period.periodCode}`,
            transactionDate: paymentDate,
            valueDate: paymentDate,
            transactionType: 'withdrawal',
            amount: netVal.toFixed(4),
            debitCredit: 'credit',
            currency: period.currency,
            exchangeRate: period.exchangeRate,
            baseAmount: netVal.toFixed(4),
            reference: `PAY-${period.periodCode}`,
            description: `Salary Payment for ${period.periodName}`,
            journalEntryId: postResult.id,
            status: 'posted',
            reconciliationStatus: 'unreconciled',
          },
          ctx
        );
        bankTxId = tx.id;
      }
    } catch (e) {
      console.warn('Bank transaction recording bypassed:', e);
    }

    return db.updatePayrollPeriod(
      periodId,
      {
        status: 'paid',
        paymentStatus: 'paid',
        paidAmount: netVal.toFixed(4),
        bankTransactionId: bankTxId,
      },
      ctx
    );
  }
}

export const payrollService = new PayrollService();
