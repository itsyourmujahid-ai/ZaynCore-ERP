// ============================================================================
// Leave Management & Approvals Workbench View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { DbLeaveRequest, DbLeaveType, DbEmployee } from '@/database/types';
import { db } from '@/database/storage';
import { leaveService } from '../services/leave.service';

export const LeaveWorkbenchView: React.FC = () => {
  const { tenant } = useAuth();
  const [requests, setRequests] = useState<DbLeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<DbLeaveType[]>([]);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Form states
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDays, setFormDays] = useState('1.0');
  const [formReason, setFormReason] = useState('');

  const loadData = () => {
    setRequests(db.getLeaveRequests(tenant));
    setLeaveTypes(db.getLeaveTypes(tenant));
    const emps = db.getEmployees(tenant).filter((e) => e.isActive);
    setEmployees(emps);
    if (emps.length > 0 && !formEmployeeId) setFormEmployeeId(emps[0].id);
    if (leaveTypes.length > 0 && !formLeaveTypeId) setFormLeaveTypeId(leaveTypes[0].id);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      leaveService.applyLeave(
        {
          employeeId: formEmployeeId,
          leaveTypeId: formLeaveTypeId || leaveTypes[0]?.id,
          startDate: formStartDate,
          endDate: formEndDate,
          numberOfDays: formDays,
          reason: formReason,
        },
        tenant
      );
      setIsApplyModalOpen(false);
      setFormReason('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to apply leave');
    }
  };

  const handleApprove = (id: string) => {
    try {
      leaveService.approveLeave(id, tenant);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to approve leave');
    }
  };

  const handleReject = (id: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      leaveService.rejectLeave(id, reason, tenant);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to reject leave');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'submitted');
  const approvedRequests = requests.filter((r) => r.status === 'approved');

  const filteredRequests = requests.filter(
    (r) => statusFilter === 'all' || r.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Leave Management & Accruals</h2>
          <p className="text-xs text-slate-400">Review time-off requests, manage vacation balances, and approve leaves.</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (employees.length > 0) setFormEmployeeId(employees[0].id);
            if (leaveTypes.length > 0) setFormLeaveTypeId(leaveTypes[0].id);
            setIsApplyModalOpen(true);
          }}
        >
          Apply Leave Request
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Pending Approvals"
          value={`${pendingRequests.length} Requests`}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          subtext="Awaiting Manager Review"
        />
        <MetricCard
          label="Approved Leaves"
          value={`${approvedRequests.length} Approved`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          subtext="Current Year Total"
        />
        <MetricCard
          label="Leave Types Configured"
          value={`${leaveTypes.length} Types`}
          icon={<Calendar className="w-5 h-5 text-purple-400" />}
          subtext="Annual, Sick, Unpaid, Emergency"
        />
      </div>

      {/* Requests Table */}
      <Card
        title={`Leave Requests (${filteredRequests.length} records)`}
        subtitle="Manage employee time off and leave requests"
        action={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Requests</option>
            <option value="submitted">Submitted (Pending)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        }
      >
        {filteredRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No leave requests found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Request #</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Leave Type</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Days</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.map((req) => {
                  const emp = employees.find((e) => e.id === req.employeeId);
                  const lt = leaveTypes.find((t) => t.id === req.leaveTypeId);
                  return (
                    <tr key={req.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-3 font-semibold text-slate-200">{req.requestNumber}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{emp?.fullName || req.employeeId}</div>
                        <div className="text-[10px] text-slate-500">{emp?.employeeCode}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-200">{lt?.name || 'Leave'}</td>
                      <td className="p-3 text-slate-400">
                        {req.startDate} → {req.endDate}
                      </td>
                      <td className="p-3 font-semibold text-slate-200">{req.numberOfDays} days</td>
                      <td className="p-3 text-slate-400 max-w-xs truncate">{req.reason}</td>
                      <td className="p-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="p-3 text-right">
                        {req.status === 'submitted' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/50 border border-emerald-800/40 transition-colors"
                              title="Approve Leave"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 border border-rose-800/40 transition-colors"
                              title="Reject Leave"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Apply for Leave of Absence</h2>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Employee *</label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Leave Type *</label>
                <select
                  required
                  value={formLeaveTypeId}
                  onChange={(e) => setFormLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.isPaid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Number of Days *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0.5"
                  value={formDays}
                  onChange={(e) => setFormDays(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Provide reason for absence..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsApplyModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
