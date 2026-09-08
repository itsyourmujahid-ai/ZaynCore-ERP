// ============================================================================
// Employee 360 Profile Modal
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  User,
  Briefcase,
  DollarSign,
  Clock,
  Calendar,
  FileText,
  HandCoins,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { DbEmployee } from '@/database/types';
import { db } from '@/database/storage';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Button } from '@/ui/components/Button';

interface EmployeeProfileModalProps {
  employee: DbEmployee | null;
  onClose: () => void;
  onEdit: (employee: DbEmployee) => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  onClose,
  onEdit,
}) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!employee) return null;

  const structures = db.getSalaryStructures(tenant);
  const assignedStructure = structures.find((s) => s.id === employee.salaryStructureId) || structures.find((s) => s.isDefault);

  const attendance = db.getAttendanceRecords(tenant, undefined, employee.id);
  const leaveBalances = db.getLeaveBalances(employee.id, tenant);
  const leaveTypes = db.getLeaveTypes(tenant);
  const leaveRequests = db.getLeaveRequests(tenant, employee.id);
  const advances = db.getEmployeeAdvances(tenant, employee.id);

  // Historical payroll entries
  const allPeriods = db.getPayrollPeriods(tenant);
  const payrollEntries = allPeriods.flatMap((p) => {
    const entries = db.getPayrollEntries(p.id, tenant).filter((e) => e.employeeId === employee.id);
    return entries.map((e) => ({ ...e, periodName: p.periodName, periodDate: p.paymentDate }));
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'employment', label: 'Employment & Org', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'salary', label: 'Salary Structure', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <Clock className="w-4 h-4" /> },
    { id: 'leave', label: 'Leave Balances', icon: <Calendar className="w-4 h-4" /> },
    { id: 'payroll', label: 'Pay Slips', icon: <FileText className="w-4 h-4" /> },
    { id: 'advances', label: 'Advances & Loans', icon: <HandCoins className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center font-bold text-lg text-purple-400">
              {employee.firstName.charAt(0)}
              {employee.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">{employee.fullName}</h2>
                <StatusBadge status={employee.employmentStatus} />
              </div>
              <p className="text-xs text-slate-400">
                {employee.employeeCode} • {employee.jobTitle} • Joined {employee.joiningDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => onEdit(employee)}>
              Edit Profile
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-all select-none whitespace-nowrap ${
                  isActive
                    ? 'border-brand-500 text-brand-400 bg-slate-900/80 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Date of Birth</span>
                      <span className="text-slate-200 font-medium">{employee.dateOfBirth || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Gender</span>
                      <span className="text-slate-200 font-medium capitalize">{employee.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nationality</span>
                      <span className="text-slate-200 font-medium">{employee.nationality || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">National ID / Passport</span>
                      <span className="text-slate-200 font-medium">{employee.nationalIdOrPassport || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact & Emergency</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Email Address</span>
                      <span className="text-slate-200 font-medium">{employee.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phone Number</span>
                      <span className="text-slate-200 font-medium">{employee.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Emergency Contact</span>
                      <span className="text-slate-200 font-medium">{employee.emergencyContactName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Emergency Phone</span>
                      <span className="text-slate-200 font-medium">{employee.emergencyContactPhone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ERP System Access Profile Card */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ERP System User Account</span>
                  <div className="text-xs text-slate-300">
                    {employee.hasSystemAccess || employee.systemUserId ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                          Active System User
                        </span>
                        <span className="text-slate-400">
                          Account Email: <strong className="text-slate-200 font-mono">{employee.email}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">No ERP login account created (HR Master record only).</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Organization & Employment</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Designation</span>
                  <span className="text-slate-200 font-semibold">{employee.designation || employee.jobTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Job Title</span>
                  <span className="text-slate-200 font-medium">{employee.jobTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Employment Type</span>
                  <span className="text-slate-200 font-medium capitalize">{employee.employmentType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Work Location</span>
                  <span className="text-slate-200 font-medium">{employee.workLocation || 'HQ'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Joining Date</span>
                  <span className="text-slate-200 font-medium">{employee.joiningDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <StatusBadge status={employee.employmentStatus} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Basic Monthly Wage</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    ${parseFloat(employee.basicSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Payment Method</span>
                  <div className="text-sm font-semibold text-slate-200 mt-1 capitalize">
                    {employee.paymentMethod.replace('_', ' ')}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Bank IBAN / Account</span>
                  <div className="text-sm font-semibold text-slate-200 mt-1 font-mono">
                    {employee.bankIban || employee.bankAccountNumber || 'N/A'}
                  </div>
                </div>
              </div>

              {assignedStructure && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Assigned Structure: {assignedStructure.name}
                  </h4>
                  <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden">
                    <thead className="bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="p-2.5">Component</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Calculation</th>
                        <th className="p-2.5">Rate / Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {assignedStructure.components.map((c, i) => (
                        <tr key={i}>
                          <td className="p-2.5 text-slate-200 font-medium">{c.componentName}</td>
                          <td className="p-2.5 capitalize">{c.type}</td>
                          <td className="p-2.5 capitalize">{c.calculationMethod.replace('_', ' ')}</td>
                          <td className="p-2.5 font-mono text-slate-200">{c.rateOrAmount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Attendance Logs</h3>
              {attendance.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No attendance records logged for this employee.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                    <thead className="bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Check In</th>
                        <th className="p-2.5">Check Out</th>
                        <th className="p-2.5">Work Hours</th>
                        <th className="p-2.5">Overtime</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {attendance.slice(-10).reverse().map((a) => (
                        <tr key={a.id}>
                          <td className="p-2.5 font-medium text-slate-200">{a.attendanceDate}</td>
                          <td className="p-2.5 text-slate-400">{a.checkInTime || '-'}</td>
                          <td className="p-2.5 text-slate-400">{a.checkOutTime || '-'}</td>
                          <td className="p-2.5 text-slate-300">{a.workingHours} hrs</td>
                          <td className="p-2.5 text-amber-400 font-semibold">{a.overtimeHours} hrs</td>
                          <td className="p-2.5">
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Leave Balances</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {leaveBalances.map((b) => {
                    const lt = leaveTypes.find((t) => t.id === b.leaveTypeId);
                    return (
                      <div key={b.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-xs font-semibold text-slate-200">{lt?.name || 'Leave Type'}</span>
                        <div className="text-lg font-bold text-brand-400">{b.available} Days Available</div>
                        <div className="text-[10px] text-slate-500">
                          Opening: {b.openingBalance} • Used: {b.used}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Leave Requests</h3>
                {leaveRequests.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No leave requests submitted.</div>
                ) : (
                  <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                    <thead className="bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="p-2.5">Request #</th>
                        <th className="p-2.5">Period</th>
                        <th className="p-2.5">Days</th>
                        <th className="p-2.5">Reason</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {leaveRequests.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2.5 font-medium text-slate-200">{r.requestNumber}</td>
                          <td className="p-2.5 text-slate-400">
                            {r.startDate} → {r.endDate}
                          </td>
                          <td className="p-2.5 text-slate-300">{r.numberOfDays}</td>
                          <td className="p-2.5 text-slate-400">{r.reason}</td>
                          <td className="p-2.5">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payroll Payslips History</h3>
              {payrollEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No payroll entries posted for this employee.</div>
              ) : (
                <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="p-2.5">Period</th>
                      <th className="p-2.5">Basic</th>
                      <th className="p-2.5">Allowances</th>
                      <th className="p-2.5">Overtime</th>
                      <th className="p-2.5">Deductions</th>
                      <th className="p-2.5">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {payrollEntries.map((pe) => (
                      <tr key={pe.id}>
                        <td className="p-2.5 font-medium text-slate-200">{pe.periodName}</td>
                        <td className="p-2.5 text-slate-300">${parseFloat(pe.basicSalary).toFixed(2)}</td>
                        <td className="p-2.5 text-slate-300">${parseFloat(pe.totalAllowances).toFixed(2)}</td>
                        <td className="p-2.5 text-amber-400">${parseFloat(pe.totalOvertime).toFixed(2)}</td>
                        <td className="p-2.5 text-rose-400">-${parseFloat(pe.totalDeductions).toFixed(2)}</td>
                        <td className="p-2.5 font-bold text-emerald-400">${parseFloat(pe.netSalary).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'advances' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff Loans & Advances</h3>
              {advances.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No loan or advance records found.</div>
              ) : (
                <table className="w-full text-left text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="p-2.5">Advance #</th>
                      <th className="p-2.5">Principal</th>
                      <th className="p-2.5">Monthly Ded.</th>
                      <th className="p-2.5">Repaid</th>
                      <th className="p-2.5">Balance</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {advances.map((adv) => (
                      <tr key={adv.id}>
                        <td className="p-2.5 font-medium text-slate-200">{adv.advanceNumber}</td>
                        <td className="p-2.5 text-slate-200 font-semibold">${parseFloat(adv.principalAmount).toFixed(2)}</td>
                        <td className="p-2.5 text-slate-400">${parseFloat(adv.monthlyDeductionAmount).toFixed(2)}</td>
                        <td className="p-2.5 text-emerald-400">${parseFloat(adv.totalRepaid).toFixed(2)}</td>
                        <td className="p-2.5 text-amber-400 font-bold">${parseFloat(adv.remainingBalance).toFixed(2)}</td>
                        <td className="p-2.5">
                          <StatusBadge status={adv.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
