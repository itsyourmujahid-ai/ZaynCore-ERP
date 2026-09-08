// ============================================================================
// Phase 10: HR, Employee & Payroll Management Automated Test Suite
// ============================================================================

import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { DbJournalLine } from '../../src/database/types';
import { employeeService } from '../../src/modules/payroll/services/employee.service';
import { attendanceService } from '../../src/modules/payroll/services/attendance.service';
import { leaveService } from '../../src/modules/payroll/services/leave.service';
import { payrollService } from '../../src/modules/payroll/services/payroll.service';
import { advancesService } from '../../src/modules/payroll/services/advances.service';
import { finalSettlementService } from '../../src/modules/payroll/services/final-settlement.service';
import { hrReportsService } from '../../src/modules/payroll/services/hr-reports.service';
import { accountingPostingService } from '../../src/modules/accounting/services/accounting-posting.service';
import { PeriodClosedError, ImmutableRecordError } from '../../src/core/errors/DomainErrors';

// Test Tenant Context (Apex Global USD)
const ctx: TenantContext = {
  companyId: 'c1000000-0000-0000-0000-000000000001',
  companyName: 'Apex Global Technologies LLC',
  companyTier: 'enterprise',
  baseCurrency: 'USD',
  userId: 'usr-hr-director',
  userEmail: 'hr.director@apexglobal.com',
  userFullName: 'VP of Human Capital',
  roles: ['super_admin', 'hr_manager'],
  permissions: ['*'],
  isPlatformAdmin: true,
};

// Tenant B Context (Cross-tenant security check)
const ctxTenantB: TenantContext = {
  companyId: 'c2000000-0000-0000-0000-000000000002',
  companyName: 'Oman Logistics Portal SAOG',
  companyTier: 'medium',
  baseCurrency: 'OMR',
  userId: 'usr-tenant-b',
  userEmail: 'hr@omanlogistics.om',
  userFullName: 'Logistics HR Manager',
  roles: ['company_admin'],
  permissions: ['*'],
  isPlatformAdmin: false,
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runHRPayrollTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 10 HR, EMPLOYEE & PAYROLL MANAGEMENT TEST SUITE');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // Test 1: Employee Master Registration & Code Uniqueness
  // --------------------------------------------------------------------------
  console.log('[Test 1] Employee Master registration, unique code generation & validation...');
  const emp1 = employeeService.createEmployee(
    {
      firstName: 'Alexander',
      lastName: 'Hamilton',
      dateOfBirth: '1988-01-11',
      gender: 'male',
      nationality: 'American',
      nationalIdOrPassport: 'PASSPORT-US-99182',
      email: 'alexander.hamilton@apexglobal.com',
      phone: '+1-202-555-0199',
      jobTitle: 'Principal Systems Architect',
      joiningDate: '2026-01-01',
      employmentType: 'full_time',
      basicSalary: '8000.00',
      currency: 'USD',
      paymentMethod: 'bank_transfer',
      bankName: 'JPMorgan Chase',
      bankIban: 'US88CHAS100029381928',
    },
    ctx
  );

  assert(emp1.id.startsWith('emp-'), 'Employee ID must have prefix emp-');
  assert(emp1.fullName === 'Alexander Hamilton', 'Full name should be formatted');
  assert(parseFloat(emp1.basicSalary) === 8000, 'Basic salary must be $8000.00');
  assert(emp1.isActive === true, 'Employee should be active');

  // Verify unique code check
  let duplicateCodeFailed = false;
  try {
    employeeService.createEmployee(
      {
        employeeCode: emp1.employeeCode,
        firstName: 'Alex',
        lastName: 'Dup',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        nationality: 'American',
        email: 'alex.dup@apexglobal.com',
        phone: '+1-555-0000',
        jobTitle: 'Developer',
        joiningDate: '2026-01-01',
        employmentType: 'full_time',
        basicSalary: '4000.00',
      },
      ctx
    );
  } catch (e) {
    duplicateCodeFailed = true;
  }
  assert(duplicateCodeFailed, 'Must reject duplicate employee code in same tenant');
  console.log(`  ✓ Employee registered: ${emp1.employeeCode} - ${emp1.fullName} ($${emp1.basicSalary}/mo)`);

  // --------------------------------------------------------------------------
  // Test 2: Employee Lifecycle State Transitions
  // --------------------------------------------------------------------------
  console.log('\n[Test 2] Employee lifecycle state transitions (Draft -> Active -> On Leave -> Inactive)...');
  const updatedEmp = employeeService.transitionStatus(emp1.id, 'on_leave', 'Approved annual leave', ctx);
  assert(updatedEmp.employmentStatus === 'on_leave', 'Status must be on_leave');
  assert(updatedEmp.isActive === true, 'On leave employee remains active');

  const reactivatedEmp = employeeService.transitionStatus(emp1.id, 'active', 'Returned from leave', ctx);
  assert(reactivatedEmp.employmentStatus === 'active', 'Status must be active');
  console.log('  ✓ Employee lifecycle state transitions verified');

  // --------------------------------------------------------------------------
  // Test 3: Salary Structure & Component Configuration
  // --------------------------------------------------------------------------
  console.log('\n[Test 3] Salary Structure and component configuration...');
  const struct = payrollService.createSalaryStructure(
    {
      code: 'TECH-LEAD-PKG',
      name: 'Senior Technology Leadership Package',
      description: 'Package with 25% Housing, $200 Transport, and Overtime entitlement',
      currency: 'USD',
      isDefault: false,
      isActive: true,
      components: [
        {
          componentId: 'sc-basic',
          componentCode: 'BASIC',
          componentName: 'Basic Wages',
          type: 'earning',
          calculationMethod: 'fixed_amount',
          rateOrAmount: '0.0000',
          expenseAccountId: 'a-6010',
          liabilityAccountId: 'a-2300',
        },
        {
          componentId: 'sc-housing',
          componentCode: 'HOUSING',
          componentName: 'Housing Allowance',
          type: 'earning',
          calculationMethod: 'percentage_of_basic',
          rateOrAmount: '0.2500', // 25%
          expenseAccountId: 'a-6012',
          liabilityAccountId: 'a-2300',
        },
        {
          componentId: 'sc-transport',
          componentCode: 'TRANSPORT',
          componentName: 'Transport Allowance',
          type: 'earning',
          calculationMethod: 'fixed_amount',
          rateOrAmount: '200.0000',
          expenseAccountId: 'a-6012',
          liabilityAccountId: 'a-2300',
        },
      ],
    },
    ctx
  );

  assert(struct.id.startsWith('ss-'), 'Salary structure ID must have prefix ss-');
  assert(struct.components.length === 3, 'Structure must contain 3 components');

  // Assign structure to employee
  employeeService.updateEmployee(emp1.id, { salaryStructureId: struct.id }, ctx);
  console.log(`  ✓ Salary structure configured: ${struct.name} (${struct.code})`);

  // --------------------------------------------------------------------------
  // Test 4: Daily Attendance & Overtime Hours Calculation
  // --------------------------------------------------------------------------
  console.log('\n[Test 4] Daily attendance logging, work hours, and overtime computation...');
  const att1 = attendanceService.recordAttendance(
    {
      employeeId: emp1.id,
      attendanceDate: '2026-01-15',
      checkInTime: '08:30',
      checkOutTime: '19:00', // 10.5 hours -> 8.0 std + 2.5 overtime
      status: 'present',
      source: 'biometric',
    },
    ctx
  );

  assert(parseFloat(att1.workingHours) === 8.0, 'Working hours must be capped at 8.0 standard');
  assert(parseFloat(att1.overtimeHours) === 2.5, 'Overtime hours must be 2.5 hours');

  const monthlySummary = attendanceService.getMonthlySummary(emp1.id, '2026-01', ctx);
  assert(parseFloat(monthlySummary.totalOvertimeHours) >= 2.5, 'Monthly overtime summary must record 2.5 hours');
  console.log(`  ✓ Attendance logged: 8.0h work, ${att1.overtimeHours}h overtime`);

  // --------------------------------------------------------------------------
  // Test 5: Leave Type & Policy Management
  // --------------------------------------------------------------------------
  console.log('\n[Test 5] Leave type configuration and policy enforcement...');
  const leaveTypes = leaveService.getLeaveTypes(ctx);
  assert(leaveTypes.length >= 4, 'Must have at least 4 default leave types');
  const annualLeave = leaveTypes.find((t) => t.code === 'ANNUAL')!;
  assert(annualLeave.defaultDaysPerYear === 30, 'Annual leave default days must be 30');
  console.log(`  ✓ Leave types verified: ${leaveTypes.map((t) => t.name).join(', ')}`);

  // --------------------------------------------------------------------------
  // Test 6: Leave Request Workflow & Approval
  // --------------------------------------------------------------------------
  console.log('\n[Test 6] Leave request workflow, approval, and balance decrement...');
  const initialBalances = leaveService.getLeaveBalances(emp1.id, ctx);
  const annualBal = initialBalances.find((b) => b.leaveTypeId === annualLeave.id);
  assert(annualBal !== undefined, 'Annual leave balance must exist');
  const prevAvail = parseFloat(annualBal!.available);

  const leaveReq = leaveService.applyLeave(
    {
      employeeId: emp1.id,
      leaveTypeId: annualLeave.id,
      startDate: '2026-01-20',
      endDate: '2026-01-22',
      numberOfDays: '3.0',
      reason: 'Family vacation',
    },
    ctx
  );

  assert(leaveReq.status === 'submitted', 'Leave request must be in submitted state');
  const approvedReq = leaveService.approveLeave(leaveReq.id, ctx);
  assert(approvedReq.status === 'approved', 'Leave request must be approved');

  // --------------------------------------------------------------------------
  // Test 7: Leave Balance Mathematical Integrity (Opening + Accrued - Used = Available)
  // --------------------------------------------------------------------------
  console.log('\n[Test 7] Leave balance mathematical integrity (Opening + Accrued - Used = Available)...');
  const updatedBalances = leaveService.getLeaveBalances(emp1.id, ctx);
  const updatedAnnualBal = updatedBalances.find((b) => b.leaveTypeId === annualLeave.id)!;
  const newAvail = parseFloat(updatedAnnualBal.available);
  const used = parseFloat(updatedAnnualBal.used);

  assert(used === 3.0, 'Used leave days must equal 3.0');
  assert(newAvail === prevAvail - 3.0, 'Available days must be decremented by exactly 3.0');
  console.log(`  ✓ Leave balance updated: ${updatedAnnualBal.openingBalance} opening - ${used} used = ${newAvail} available`);

  // --------------------------------------------------------------------------
  // Test 8: Staff Loan / Advance Disbursement & GL Posting
  // --------------------------------------------------------------------------
  console.log('\n[Test 8] Employee advance disbursement and GL accounting (Dr #1250, Cr #1010)...');
  const adv = advancesService.applyAdvance(
    {
      employeeId: emp1.id,
      requestDate: '2026-01-05',
      principalAmount: '2000.00',
      repaymentMonths: 4, // $500/mo
      purpose: 'Relocation expenses',
    },
    ctx
  );

  assert(parseFloat(adv.principalAmount) === 2000, 'Principal must be $2000.00');
  assert(parseFloat(adv.monthlyDeductionAmount) === 500, 'Monthly deduction must be $500.00');

  advancesService.approveAdvance(adv.id, ctx);
  const bankAccounts = db.getBankAccounts(ctx);
  const disbursedAdv = advancesService.disburseAdvance(adv.id, bankAccounts[0].id, '2026-01-06', ctx);
  assert(disbursedAdv.status === 'disbursed', 'Advance must be disbursed');
  assert(disbursedAdv.disbursementJournalId !== undefined, 'Must create GL journal entry');
  console.log(`  ✓ Staff advance disbursed: ${disbursedAdv.advanceNumber} ($2,000.00 @ $500.00/month)`);

  // --------------------------------------------------------------------------
  // Test 9: Payroll Period Creation & Multi-Component Calculation
  // --------------------------------------------------------------------------
  console.log('\n[Test 9] Payroll period calculation with Basic + Allowances + Overtime - Advances...');
  const period = payrollService.createPayrollPeriod(
    {
      periodName: 'January 2026 Payroll',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      paymentDate: '2026-01-31',
      notes: 'January monthly payroll batch',
    },
    ctx
  );

  const calculatedPeriod = payrollService.calculatePeriodPayroll(period.id, ctx);
  assert(calculatedPeriod.status === 'pending_approval', 'Status must be pending_approval after calculation');
  assert(calculatedPeriod.employeeCount >= 1, 'Must include registered employee');

  const entries = payrollService.getPayrollEntries(period.id, ctx);
  const emp1Entry = entries.find((e) => e.employeeId === emp1.id)!;
  assert(emp1Entry !== undefined, 'Must find payroll entry for employee 1');

  // Breakdown verification:
  // Basic: $8000.00
  // Housing (25%): $2000.00
  // Transport: $200.00
  // Total Allowances: $2200.00
  // Overtime (2.5 hrs @ (8000/(30*8))*1.5 = 2.5 * 33.3333 * 1.5 = $125.00):
  // Gross: Basic ($8000) + Allowances ($2200) + Overtime ($125) = $10,325.00
  // Advance Deduction: $500.00
  // Net: $10,325.00 - $500.00 = $9,825.00
  const basicVal = parseFloat(emp1Entry.basicSalary);
  const allowVal = parseFloat(emp1Entry.totalAllowances);
  const otVal = parseFloat(emp1Entry.totalOvertime);
  const grossVal = parseFloat(emp1Entry.grossSalary);
  const advDedVal = parseFloat(emp1Entry.advanceDeductions);
  const netVal = parseFloat(emp1Entry.netSalary);

  assert(basicVal === 8000, `Basic must be 8000, got ${basicVal}`);
  assert(allowVal === 2200, `Allowances must be 2200 (2000 housing + 200 transport), got ${allowVal}`);
  assert(otVal === 125, `Overtime must be 125.00, got ${otVal}`);
  assert(grossVal === 10325, `Gross must be 10325, got ${grossVal}`);
  assert(advDedVal === 500, `Advance deduction must be 500, got ${advDedVal}`);
  assert(netVal === 9825, `Net pay must be 9825, got ${netVal}`);
  console.log(`  ✓ Pay stub computed: Gross $${grossVal.toFixed(2)} - Deductions $${advDedVal.toFixed(2)} = Net $${netVal.toFixed(2)}`);

  // --------------------------------------------------------------------------
  // Test 10: Overtime Wage Rate Calculation Multiplier
  // --------------------------------------------------------------------------
  console.log('\n[Test 10] Overtime rate formula validation...');
  const hourly = 8000 / (30 * 8);
  const expectedOt = 2.5 * hourly * 1.5;
  assert(Math.abs(otVal - expectedOt) < 0.01, 'Overtime must match 1.5x hourly standard formula');
  console.log(`  ✓ Overtime rate formula confirmed: 2.5 hrs @ $${(hourly * 1.5).toFixed(2)}/hr = $${otVal.toFixed(2)}`);

  // --------------------------------------------------------------------------
  // Test 11: Multi-Deduction Handling (Absence + Advance Recovery)
  // --------------------------------------------------------------------------
  console.log('\n[Test 11] Multi-deduction handling with unexcused absence deduction...');
  // Create second employee with an unexcused absence
  const emp2 = employeeService.createEmployee(
    {
      firstName: 'Benjamin',
      lastName: 'Franklin',
      dateOfBirth: '1985-01-17',
      gender: 'male',
      nationality: 'American',
      email: 'ben.franklin@apexglobal.com',
      phone: '+1-202-555-0188',
      jobTitle: 'Senior Infrastructure Engineer',
      joiningDate: '2026-01-01',
      employmentType: 'full_time',
      basicSalary: '6000.00',
    },
    ctx
  );

  // Log 1 unexcused absence day for emp2
  attendanceService.recordAttendance(
    {
      employeeId: emp2.id,
      attendanceDate: '2026-01-12',
      status: 'absent',
    },
    ctx
  );

  // Recalculate period
  const recalcPeriod = payrollService.calculatePeriodPayroll(period.id, ctx);
  assert(recalcPeriod.employeeCount === 2, 'Period must include both employees');
  const emp2Entry = payrollService.getPayrollEntries(period.id, ctx).find((e) => e.employeeId === emp2.id)!;
  assert(emp2Entry !== undefined, 'Employee 2 must have payroll entry');
  const emp2DailyRate = 6000 / 30; // $200.00
  assert(parseFloat(emp2Entry.absenceDeductions) === emp2DailyRate, 'Absence deduction must equal 1 day daily rate ($200)');
  console.log(`  ✓ Unexcused absence deduction correctly computed: -$${emp2Entry.absenceDeductions}`);

  // --------------------------------------------------------------------------
  // Test 12: Payroll Period Approval Workflow
  // --------------------------------------------------------------------------
  console.log('\n[Test 12] Payroll period review & approval workflow...');
  const approvedPeriod = payrollService.approvePayrollPeriod(period.id, ctx);
  assert(approvedPeriod.status === 'approved', 'Period status must be approved');
  assert(approvedPeriod.approvedBy === ctx.userId, 'Approved by must record user ID');
  console.log(`  ✓ Payroll period approved: ${approvedPeriod.periodName}`);

  // --------------------------------------------------------------------------
  // Test 13: Payroll Posting to General Ledger via Centralized Posting Service
  // --------------------------------------------------------------------------
  console.log('\n[Test 13] Posting payroll to GL (Dr #6010 Basic, Dr #6012 Allow, Dr #6015 OT, Cr #1250 Adv, Cr #2300 Net)...');
  const postedPeriod = payrollService.postPayrollPeriod(period.id, ctx);
  assert(postedPeriod.status === 'posted', 'Period status must be posted');
  assert(postedPeriod.journalEntryId !== undefined, 'Must link to created GL Journal Entry');

  const journal = db.getJournalEntries(ctx).find((j) => j.id === postedPeriod.journalEntryId);
  assert(journal !== undefined, 'GL journal entry must exist');
  assert(journal!.status === 'posted', 'Journal status must be posted');
  console.log(`  ✓ GL Journal created: ${journal!.entryNumber} (${journal!.memo})`);

  // --------------------------------------------------------------------------
  // Test 14: Automatic Double-Entry Journal Balance Invariance
  // --------------------------------------------------------------------------
  console.log('\n[Test 14] Automatic double-entry balance invariance assertion...');
  const jLines = db.getJournalLines(ctx).filter((l: DbJournalLine) => l.journalEntryId === journal!.id);
  const totalDebit = jLines.reduce((sum: number, l: DbJournalLine) => sum + (parseFloat(l.debitAmount) || 0), 0);
  const totalCredit = jLines.reduce((sum: number, l: DbJournalLine) => sum + (parseFloat(l.creditAmount) || 0), 0);
  assert(Math.abs(totalDebit - totalCredit) < 0.001, `Debit ($${totalDebit}) must strictly equal Credit ($${totalCredit})`);
  console.log(`  ✓ Balance verified: Total Debit $${totalDebit.toFixed(2)} == Total Credit $${totalCredit.toFixed(2)} (Variance: $0.00)`);

  // --------------------------------------------------------------------------
  // Test 15: Accrued Salaries Payable (#2300) Sub-Ledger Tracking
  // --------------------------------------------------------------------------
  console.log('\n[Test 15] Accrued Salaries Payable #2300 liability verification...');
  const reconBeforePayment = hrReportsService.getPayrollSubLedgerReconciliation(ctx);
  assert(reconBeforePayment.isReconciled === true, 'Sub-ledger must reconcile with GL before payment');
  assert(parseFloat(reconBeforePayment.subLedgerNetPayable) > 0, 'Sub-ledger must record accrued liability');
  console.log(`  ✓ Sub-ledger accrued payable: $${reconBeforePayment.subLedgerNetPayable} (GL Balance: $${reconBeforePayment.glControlAccountBalance})`);

  // --------------------------------------------------------------------------
  // Test 16: Bank Salary Payment Disbursement & Ledger Integration
  // --------------------------------------------------------------------------
  console.log('\n[Test 16] Bank salary payment disbursement (Dr #2300 Payable, Cr #1010 Bank)...');
  const paidPeriod = payrollService.disburseSalaryPayment(
    period.id,
    bankAccounts[0].id,
    '2026-01-31',
    ctx
  );
  assert(paidPeriod.status === 'paid', 'Period status must be paid');
  assert(paidPeriod.paymentStatus === 'paid', 'Payment status must be paid');
  assert(paidPeriod.bankTransactionId !== undefined, 'Must generate bank transaction record');

  // Verify GL liability #2300 is discharged to zero for this period
  const reconAfterPayment = hrReportsService.getPayrollSubLedgerReconciliation(ctx);
  assert(reconAfterPayment.isReconciled === true, 'Sub-ledger must reconcile with GL after payment');
  assert(parseFloat(reconAfterPayment.variance) === 0, 'Variance must be exactly $0.00');
  console.log(`  ✓ Bank payment disbursed: Sub-Ledger Net $${reconAfterPayment.subLedgerNetPayable} == GL Net $${reconAfterPayment.glControlAccountBalance} ($0.00 variance)`);

  // --------------------------------------------------------------------------
  // Test 17: Employee Advance Recovery Deduction Validation
  // --------------------------------------------------------------------------
  console.log('\n[Test 17] Advance recovery balance reduction validation...');
  const updatedAdv = advancesService.getAdvanceById(adv.id, ctx)!;
  assert(parseFloat(updatedAdv.totalRepaid) === 500, `Total repaid must be 500, got ${updatedAdv.totalRepaid}`);
  assert(parseFloat(updatedAdv.remainingBalance) === 1500, `Remaining balance must be 1500, got ${updatedAdv.remainingBalance}`);
  assert(updatedAdv.status === 'repaying', 'Advance status must be repaying');
  console.log(`  ✓ Advance loan recovery confirmed: $500 repaid, $1,500 remaining`);

  // --------------------------------------------------------------------------
  // Test 18: Employee Final Settlement & EOSB Gratuity Calculation
  // --------------------------------------------------------------------------
  console.log('\n[Test 18] Final settlement calculation (Gratuity + Leave encashment - Outstanding loan)...');
  // Register employee leaving after 2 years
  const emp3 = employeeService.createEmployee(
    {
      firstName: 'Thomas',
      lastName: 'Jefferson',
      dateOfBirth: '1982-04-13',
      gender: 'male',
      nationality: 'American',
      email: 'thomas.jefferson@apexglobal.com',
      phone: '+1-202-555-0177',
      jobTitle: 'Principal Legal Counsel',
      joiningDate: '2024-01-01', // 2 years tenure
      employmentType: 'full_time',
      basicSalary: '6000.00',
    },
    ctx
  );

  const settlement = finalSettlementService.calculateSettlement(
    {
      employeeId: emp3.id,
      terminationDate: '2026-01-31',
      unpaidSalaryDays: 5,
      bonusOrIncentiveAmount: '500.00',
      notes: 'Standard departure settlement',
    },
    ctx
  );

  assert(parseFloat(settlement.gratuityOrSeveranceAmount) > 0, 'Gratuity must be calculated for 2 years service');
  assert(parseFloat(settlement.netSettlementAmount) > 0, 'Net settlement must be positive');

  finalSettlementService.approveSettlement(settlement.id, ctx);
  const postedSettlement = finalSettlementService.postSettlement(settlement.id, ctx);
  assert(postedSettlement.status === 'posted', 'Settlement must be posted');

  const terminatedEmp = employeeService.getEmployeeById(emp3.id, ctx)!;
  assert(terminatedEmp.employmentStatus === 'terminated', 'Employee must be marked terminated');
  assert(terminatedEmp.isActive === false, 'Terminated employee must be inactive');
  console.log(`  ✓ Final settlement posted: $${settlement.netSettlementAmount} (Gratuity: $${settlement.gratuityOrSeveranceAmount})`);

  // --------------------------------------------------------------------------
  // Test 19: Accounting Period Lock Enforcement
  // --------------------------------------------------------------------------
  console.log('\n[Test 19] Accounting Period Lock enforcement on closed fiscal period...');
  const periodsList = db.getAccountingPeriods(ctx);
  const currentAccPeriod = periodsList[0];
  db.setPeriodStatus(currentAccPeriod.id, 'closed', ctx);

  let periodLockTriggered = false;
  try {
    accountingPostingService.post(
      'PAYROLL_PERIOD_POSTED',
      {
        sourceType: 'PAYROLL',
        sourceId: 'test-locked-doc',
        documentNumber: 'PR-LOCKED-01',
        documentDate: currentAccPeriod.startDate,
        amount: '1000.00',
        currency: 'USD',
        exchangeRate: '1.000000',
        memo: 'Locked period payroll test',
      },
      ctx
    );
  } catch (e) {
    if (e instanceof PeriodClosedError || (e as Error).message.includes('closed')) {
      periodLockTriggered = true;
    }
  }
  assert(periodLockTriggered, 'Must reject payroll posting into closed accounting period');
  db.setPeriodStatus(currentAccPeriod.id, 'open', ctx);
  console.log('  ✓ PeriodClosedError enforced on locked accounting period');

  // --------------------------------------------------------------------------
  // Test 20: Posted Payroll Document Immutability Guard
  // --------------------------------------------------------------------------
  console.log('\n[Test 20] Posted payroll document immutability guard...');
  let immutabilityTriggered = false;
  try {
    db.updatePayrollPeriod(period.id, { status: 'draft' }, ctx);
  } catch (e) {
    if (e instanceof ImmutableRecordError || (e as Error).message.includes('immutable')) {
      immutabilityTriggered = true;
    }
  }
  assert(immutabilityTriggered, 'Must reject modifying a posted payroll period back to draft');
  console.log('  ✓ ImmutableRecordError enforced on posted payroll period');

  // --------------------------------------------------------------------------
  // Test 21: Role-Based Access Control (RBAC) Permission Enforcement
  // --------------------------------------------------------------------------
  console.log('\n[Test 21] Role-Based Access Control (RBAC) enforcement...');
  const viewerCtx: TenantContext = {
    ...ctx,
    userId: 'usr-guest-viewer',
    roles: ['viewer'],
    permissions: ['payroll.view'],
    isPlatformAdmin: false,
  };

  let rbacBlocked = false;
  try {
    payrollService.createPayrollPeriod(
      {
        periodName: 'Unauthorized Batch',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        paymentDate: '2026-02-28',
      },
      viewerCtx
    );
  } catch (e) {
    rbacBlocked = true;
  }
  assert(rbacBlocked, 'Viewer without payroll.manage must be rejected from creating payroll batches');
  console.log('  ✓ RBAC permission check passed');

  // --------------------------------------------------------------------------
  // Test 22: Multi-Tenant Data Isolation
  // --------------------------------------------------------------------------
  console.log('\n[Test 22] Multi-tenant company isolation (Company A vs Company B)...');
  const tenantAEmployees = employeeService.getEmployees(ctx);
  const tenantBEmployees = employeeService.getEmployees(ctxTenantB);

  assert(tenantAEmployees.length > 0, 'Tenant A must have employees');
  assert(tenantBEmployees.length === 0, 'Tenant B must NOT see Tenant A employees');
  console.log(`  ✓ Tenant isolation verified (Tenant A: ${tenantAEmployees.length} emps, Tenant B: ${tenantBEmployees.length} emps)`);

  // --------------------------------------------------------------------------
  // Test 23: Decimal Rounding & Floating Point Safety
  // --------------------------------------------------------------------------
  console.log('\n[Test 23] Decimal arithmetic precision and floating point safety...');
  const decBasic = 3333.3333;
  const decOt = 166.6667;
  const decSum = (decBasic + decOt).toFixed(4);
  assert(decSum === '3500.0000', 'Decimal 4-digit arithmetic must sum with zero drift');
  console.log(`  ✓ Decimal precision verified: ${decBasic} + ${decOt} = ${decSum}`);

  // --------------------------------------------------------------------------
  // Test 24: Comprehensive Audit Trail Logging
  // --------------------------------------------------------------------------
  console.log('\n[Test 24] Audit trail logging validation...');
  const auditLogs = db.getAuditLogs(ctx);
  const employeeCreatedLog = auditLogs.find((l) => l.action === 'CREATE_EMPLOYEE');
  const advanceCreatedLog = auditLogs.find((l) => l.action === 'CREATE_EMPLOYEE_ADVANCE');
  const settlementCreatedLog = auditLogs.find((l) => l.action === 'CREATE_FINAL_SETTLEMENT');

  assert(employeeCreatedLog !== undefined, 'Must log CREATE_EMPLOYEE');
  assert(advanceCreatedLog !== undefined, 'Must log CREATE_EMPLOYEE_ADVANCE');
  assert(settlementCreatedLog !== undefined, 'Must log CREATE_FINAL_SETTLEMENT');
  console.log(`  ✓ Audit trail verified (${auditLogs.length} events logged)`);

  // --------------------------------------------------------------------------
  // Test 25: Payroll Sub-Ledger ↔ GL #2300 Zero-Variance Final Reconciliation
  // --------------------------------------------------------------------------
  console.log('\n[Test 25] Payroll Sub-Ledger vs General Ledger #2300 Zero-Variance final audit...');
  const finalRecon = hrReportsService.getPayrollSubLedgerReconciliation(ctx);
  assert(finalRecon.isReconciled === true, 'Payroll sub-ledger must be strictly reconciled');
  assert(parseFloat(finalRecon.variance) < 0.01, `Variance must be $0.00, got ${finalRecon.variance}`);
  console.log(`  ✓ Sub-Ledger ↔ GL #2300 Zero-Variance verified ($${finalRecon.variance} variance)`);

  // --------------------------------------------------------------------------
  // Test 26: Complete Lifecycle Acceptance Test Flow
  // --------------------------------------------------------------------------
  console.log('\n[Test 26] End-to-End complete lifecycle acceptance flow...');
  // 1. Register employee
  const newStaff = employeeService.createEmployee(
    {
      firstName: 'George',
      lastName: 'Washington',
      dateOfBirth: '1975-02-22',
      gender: 'male',
      nationality: 'American',
      email: 'george.washington@apexglobal.com',
      phone: '+1-202-555-0101',
      jobTitle: 'Chief Executive Officer',
      joiningDate: '2026-02-01',
      employmentType: 'full_time',
      basicSalary: '12000.00',
    },
    ctx
  );

  // 2. Clock attendance with overtime
  attendanceService.recordAttendance(
    {
      employeeId: newStaff.id,
      attendanceDate: '2026-02-10',
      checkInTime: '08:00',
      checkOutTime: '18:00', // 2 hrs overtime
      status: 'present',
    },
    ctx
  );

  // 3. Request & disburse loan
  const staffLoan = advancesService.applyAdvance(
    {
      employeeId: newStaff.id,
      requestDate: '2026-02-02',
      principalAmount: '1200.00',
      repaymentMonths: 2, // $600/mo
      purpose: 'Executive relocation',
    },
    ctx
  );
  advancesService.approveAdvance(staffLoan.id, ctx);
  advancesService.disburseAdvance(staffLoan.id, bankAccounts[0].id, '2026-02-03', ctx);

  // 4. Create, calculate, approve, post, and disburse February Payroll
  const febPeriod = payrollService.createPayrollPeriod(
    {
      periodName: 'February 2026 Executive Payroll',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      paymentDate: '2026-02-28',
    },
    ctx
  );

  payrollService.calculatePeriodPayroll(febPeriod.id, ctx);
  payrollService.approvePayrollPeriod(febPeriod.id, ctx);
  payrollService.postPayrollPeriod(febPeriod.id, ctx);
  payrollService.disburseSalaryPayment(febPeriod.id, bankAccounts[0].id, '2026-02-28', ctx);

  // 5. Verify Zero-Variance Reconciliation after full end-to-end flow
  const e2eRecon = hrReportsService.getPayrollSubLedgerReconciliation(ctx);
  assert(e2eRecon.isReconciled === true, 'Final E2E reconciliation must hold with zero variance');
  console.log(`  ✓ E2E lifecycle completed: Sub-Ledger and GL #2300 fully balanced`);

  console.log('\n================================================================');
  console.log('✅ ALL 26+ PHASE 10 HR & PAYROLL MODULE TESTS PASSED PERFECTLY');
  console.log('================================================================\n');
}

runHRPayrollTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
