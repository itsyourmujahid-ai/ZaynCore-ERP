// ============================================================================
// Attendance & Time Tracking Workbench View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  Save,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { DbEmployee, DbAttendanceRecord, AttendanceStatus } from '@/database/types';
import { db } from '@/database/storage';
import { attendanceService } from '../services/attendance.service';

export const AttendanceWorkbenchView: React.FC = () => {
  const { tenant } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DbAttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Row state for quick inline edits
  const [rowStates, setRowStates] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        checkIn: string;
        checkOut: string;
        overtime: string;
      }
    >
  >({});

  const loadData = () => {
    const emps = db.getEmployees(tenant).filter((e) => e.isActive);
    setEmployees(emps);
    const records = db.getAttendanceRecords(tenant, selectedDate);
    setAttendanceRecords(records);

    const initialRows: typeof rowStates = {};
    for (const emp of emps) {
      const rec = records.find((r) => r.employeeId === emp.id);
      initialRows[emp.id] = {
        status: rec?.status || 'present',
        checkIn: rec?.checkInTime || '09:00',
        checkOut: rec?.checkOutTime || '17:00',
        overtime: rec?.overtimeHours || '0.00',
      };
    }
    setRowStates(initialRows);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant, selectedDate]);

  const handleRowChange = (empId: string, field: string, value: string) => {
    setRowStates((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      },
    }));
  };

  const handleSaveAttendance = (empId: string) => {
    const state = rowStates[empId];
    if (!state) return;

    try {
      attendanceService.recordAttendance(
        {
          employeeId: empId,
          attendanceDate: selectedDate,
          checkInTime: state.checkIn,
          checkOutTime: state.checkOut,
          overtimeHours: state.overtime,
          status: state.status,
          source: 'manual',
        },
        tenant
      );
    } catch (e: unknown) {
      alert((e as Error).message || 'Failed to save attendance');
    }
  };

  const handleMarkAllPresent = () => {
    for (const emp of employees) {
      attendanceService.recordAttendance(
        {
          employeeId: emp.id,
          attendanceDate: selectedDate,
          checkInTime: '09:00',
          checkOutTime: '17:00',
          status: 'present',
          source: 'manual',
        },
        tenant
      );
    }
  };

  const presentCount = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'half_day').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
  const totalOvertime = attendanceRecords.reduce((sum, r) => sum + (parseFloat(r.overtimeHours) || 0), 0);

  const filteredEmployees = employees.filter((e) =>
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Date Filter & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-brand-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none"
            />
          </div>
          <div className="text-xs text-slate-400">
            Daily Attendance Sheet for <strong className="text-slate-200">{selectedDate}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleMarkAllPresent}>
            Mark All Present
          </Button>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Present Today"
          value={`${presentCount} / ${employees.length}`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          subtext="Active On-Site Staff"
        />
        <MetricCard
          label="Absences Logged"
          value={`${absentCount} Staff`}
          icon={<AlertCircle className="w-5 h-5 text-rose-400" />}
          subtext="Unexcused / Missing"
        />
        <MetricCard
          label="Overtime Hours Logged"
          value={`${totalOvertime.toFixed(1)} hrs`}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          subtext="1.5x Multiplier Rate"
        />
      </div>

      {/* Attendance Register Table */}
      <Card
        title={`Daily Attendance Sheet (${filteredEmployees.length} Staff)`}
        subtitle="Record daily check-in, check-out, working hours, and approved overtime"
        action={
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Employee</th>
                <th className="p-3">Status</th>
                <th className="p-3">Check In</th>
                <th className="p-3">Check Out</th>
                <th className="p-3">Overtime (hrs)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.map((emp) => {
                const row = rowStates[emp.id] || {
                  status: 'present',
                  checkIn: '09:00',
                  checkOut: '17:00',
                  overtime: '0.00',
                };
                return (
                  <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{emp.fullName}</div>
                      <div className="text-[10px] text-slate-500">{emp.employeeCode} • {emp.jobTitle}</div>
                    </td>
                    <td className="p-3">
                      <select
                        value={row.status}
                        onChange={(e) => handleRowChange(emp.id, 'status', e.target.value)}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="on_leave">On Leave</option>
                        <option value="late">Late</option>
                        <option value="holiday">Holiday</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="time"
                        value={row.checkIn}
                        onChange={(e) => handleRowChange(emp.id, 'checkIn', e.target.value)}
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="time"
                        value={row.checkOut}
                        onChange={(e) => handleRowChange(emp.id, 'checkOut', e.target.value)}
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={row.overtime}
                        onChange={(e) => handleRowChange(emp.id, 'overtime', e.target.value)}
                        className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleSaveAttendance(emp.id)}
                        className="p-1.5 rounded-lg text-brand-400 hover:bg-brand-950/50 border border-brand-800/40 transition-colors"
                        title="Save Attendance"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
