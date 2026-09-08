// ============================================================================
// Attendance & Time Tracking Domain Service
// ============================================================================

import { db } from '@/database/storage';
import { DbAttendanceRecord, AttendanceStatus } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { permissionService } from '@/modules/authorization/services/permission-service';

export interface RecordAttendanceDTO {
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string; // HH:MM
  checkOutTime?: string; // HH:MM
  workingHours?: string;
  overtimeHours?: string;
  status: AttendanceStatus;
  notes?: string;
  source?: 'manual' | 'biometric' | 'mobile';
}

export interface MonthlyAttendanceSummary {
  employeeId: string;
  month: string; // YYYY-MM
  totalDaysInMonth: number;
  daysPresent: number;
  daysAbsent: number;
  daysOnLeave: number;
  daysHalfDay: number;
  totalWorkingHours: string;
  totalOvertimeHours: string;
  totalLateMinutes: number;
}

export class AttendanceService {
  public getAttendance(
    ctx: TenantContext,
    date?: string,
    employeeId?: string
  ): DbAttendanceRecord[] {
    permissionService.assertPermission(ctx, 'attendance.view');
    return db.getAttendanceRecords(ctx, date, employeeId);
  }

  public recordAttendance(
    payload: RecordAttendanceDTO,
    ctx: TenantContext
  ): DbAttendanceRecord {
    permissionService.assertPermission(ctx, 'attendance.manage');

    const emp = db.getEmployeeById(payload.employeeId, ctx);
    if (!emp) throw new Error(`Employee '${payload.employeeId}' not found`);

    let workingHours = payload.workingHours || '0.00';
    let overtimeHours = payload.overtimeHours || '0.00';
    let lateMinutes = 0;
    let earlyDepartureMinutes = 0;

    // Automatic calculation if check-in and check-out provided
    if (payload.checkInTime && payload.checkOutTime) {
      const [inH, inM] = payload.checkInTime.split(':').map(Number);
      const [outH, outM] = payload.checkOutTime.split(':').map(Number);

      const inTotalMin = inH * 60 + inM;
      const outTotalMin = outH * 60 + outM;

      if (outTotalMin > inTotalMin) {
        const totalDurationMin = outTotalMin - inTotalMin;
        const calcHours = totalDurationMin / 60;
        workingHours = Math.min(calcHours, 8).toFixed(2);
        if (calcHours > 8) {
          overtimeHours = (calcHours - 8).toFixed(2);
        }

        // Standard 09:00 shift check
        if (inTotalMin > 9 * 60) {
          lateMinutes = inTotalMin - 9 * 60;
        }
        if (outTotalMin < 17 * 60) {
          earlyDepartureMinutes = 17 * 60 - outTotalMin;
        }
      }
    } else if (payload.status === 'present' && !payload.workingHours) {
      workingHours = '8.00';
    } else if (payload.status === 'half_day' && !payload.workingHours) {
      workingHours = '4.00';
    }

    return db.createAttendanceRecord(
      {
        employeeId: payload.employeeId,
        attendanceDate: payload.attendanceDate,
        checkInTime: payload.checkInTime,
        checkOutTime: payload.checkOutTime,
        workingHours,
        overtimeHours,
        lateMinutes,
        earlyDepartureMinutes,
        status: payload.status,
        notes: payload.notes,
        source: payload.source || 'manual',
      },
      ctx
    );
  }

  public getMonthlySummary(
    employeeId: string,
    yearMonth: string, // '2026-01'
    ctx: TenantContext
  ): MonthlyAttendanceSummary {
    const allRecords = db.getAttendanceRecords(ctx, undefined, employeeId);
    const monthRecords = allRecords.filter((r) => r.attendanceDate.startsWith(yearMonth));

    let daysPresent = 0;
    let daysAbsent = 0;
    let daysOnLeave = 0;
    let daysHalfDay = 0;
    let totalWorkHours = 0;
    let totalOtHours = 0;
    let totalLate = 0;

    for (const rec of monthRecords) {
      if (rec.status === 'present') daysPresent += 1;
      else if (rec.status === 'absent') daysAbsent += 1;
      else if (rec.status === 'on_leave') daysOnLeave += 1;
      else if (rec.status === 'half_day') {
        daysHalfDay += 1;
        daysPresent += 0.5;
      }

      totalWorkHours += parseFloat(rec.workingHours || '0') || 0;
      totalOtHours += parseFloat(rec.overtimeHours || '0') || 0;
      totalLate += rec.lateMinutes || 0;
    }

    return {
      employeeId,
      month: yearMonth,
      totalDaysInMonth: 30,
      daysPresent,
      daysAbsent,
      daysOnLeave,
      daysHalfDay,
      totalWorkingHours: totalWorkHours.toFixed(2),
      totalOvertimeHours: totalOtHours.toFixed(2),
      totalLateMinutes: totalLate,
    };
  }
}

export const attendanceService = new AttendanceService();
