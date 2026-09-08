// ============================================================================
// Leave Management & Accruals Domain Service
// ============================================================================

import { db } from '@/database/storage';
import {
  DbLeaveType,
  DbLeaveBalance,
  DbLeaveRequest,
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { permissionService } from '@/modules/authorization/services/permission-service';

export interface ApplyLeaveDTO {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  numberOfDays: string;
  reason: string;
}

export class LeaveService {
  public getLeaveTypes(ctx: TenantContext): DbLeaveType[] {
    return db.getLeaveTypes(ctx);
  }

  public createLeaveType(
    payload: Omit<DbLeaveType, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbLeaveType {
    permissionService.assertPermission(ctx, 'leave.manage');
    return db.createLeaveType(payload, ctx);
  }

  public getLeaveBalances(employeeId: string, ctx: TenantContext): DbLeaveBalance[] {
    return db.getLeaveBalances(employeeId, ctx);
  }

  public getLeaveRequests(ctx: TenantContext, employeeId?: string): DbLeaveRequest[] {
    permissionService.assertPermission(ctx, 'leave.view');
    return db.getLeaveRequests(ctx, employeeId);
  }

  public applyLeave(payload: ApplyLeaveDTO, ctx: TenantContext): DbLeaveRequest {
    permissionService.assertPermission(ctx, 'leave.apply');

    const emp = db.getEmployeeById(payload.employeeId, ctx);
    if (!emp) throw new Error(`Employee '${payload.employeeId}' not found`);

    const leaveType = db.getLeaveTypeById(payload.leaveTypeId, ctx);
    if (!leaveType) throw new Error(`Leave type '${payload.leaveTypeId}' not found`);

    const reqDays = parseFloat(payload.numberOfDays) || 1;
    const year = new Date(payload.startDate).getFullYear();

    // Check balance if leave type does not allow negative balance
    let balance = db.getLeaveBalance(payload.employeeId, payload.leaveTypeId, year, ctx);
    if (!balance) {
      // Auto-initialize balance if not present
      balance = db.upsertLeaveBalance(
        {
          employeeId: payload.employeeId,
          leaveTypeId: payload.leaveTypeId,
          year,
          openingBalance: leaveType.defaultDaysPerYear.toFixed(1),
          accrued: '0.0',
          used: '0.0',
          available: leaveType.defaultDaysPerYear.toFixed(1),
        },
        ctx
      );
    }

    const availableDays = parseFloat(balance.available) || 0;
    if (!leaveType.allowNegativeBalance && reqDays > availableDays && leaveType.isPaid) {
      throw new Error(
        `Insufficient leave balance. Requested: ${reqDays} days, Available: ${availableDays} days.`
      );
    }

    const allRequests = db.getLeaveRequests(ctx);
    const reqNum = `LV-${year}-${(allRequests.length + 1).toString().padStart(4, '0')}`;

    return db.createLeaveRequest(
      {
        requestNumber: reqNum,
        employeeId: payload.employeeId,
        leaveTypeId: payload.leaveTypeId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        numberOfDays: reqDays.toFixed(1),
        reason: payload.reason,
        status: leaveType.requiresApproval ? 'submitted' : 'approved',
        appliedAt: new Date().toISOString(),
        approvedById: leaveType.requiresApproval ? undefined : ctx.userId,
        approvedAt: leaveType.requiresApproval ? undefined : new Date().toISOString(),
      },
      ctx
    );
  }

  public approveLeave(requestId: string, ctx: TenantContext): DbLeaveRequest {
    permissionService.assertPermission(ctx, 'leave.approve');

    const req = db.getLeaveRequestById(requestId, ctx);
    if (!req) throw new Error(`Leave request '${requestId}' not found`);
    if (req.status === 'approved') throw new Error(`Leave request '${requestId}' is already approved.`);

    const year = new Date(req.startDate).getFullYear();
    const balance = db.getLeaveBalance(req.employeeId, req.leaveTypeId, year, ctx);
    const days = parseFloat(req.numberOfDays) || 0;

    if (balance) {
      const currentOpening = parseFloat(balance.openingBalance) || 0;
      const currentAccrued = parseFloat(balance.accrued) || 0;
      const newUsed = (parseFloat(balance.used) || 0) + days;
      const newAvail = currentOpening + currentAccrued - newUsed;

      db.upsertLeaveBalance(
        {
          employeeId: req.employeeId,
          leaveTypeId: req.leaveTypeId,
          year,
          openingBalance: balance.openingBalance,
          accrued: balance.accrued,
          used: newUsed.toFixed(1),
          available: newAvail.toFixed(1),
        },
        ctx
      );
    }

    // Sync attendance records with 'on_leave'
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      db.createAttendanceRecord(
        {
          employeeId: req.employeeId,
          attendanceDate: dateStr,
          status: 'on_leave',
          workingHours: '0.00',
          overtimeHours: '0.00',
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          source: 'manual',
          notes: `Approved Leave: ${req.requestNumber}`,
        },
        ctx
      );
      cur.setDate(cur.getDate() + 1);
    }

    return db.updateLeaveRequest(
      requestId,
      {
        status: 'approved',
        approvedById: ctx.userId,
        approvedAt: new Date().toISOString(),
      },
      ctx
    );
  }

  public rejectLeave(requestId: string, reason: string, ctx: TenantContext): DbLeaveRequest {
    permissionService.assertPermission(ctx, 'leave.approve');

    const req = db.getLeaveRequestById(requestId, ctx);
    if (!req) throw new Error(`Leave request '${requestId}' not found`);

    return db.updateLeaveRequest(
      requestId,
      {
        status: 'rejected',
        rejectionReason: reason,
      },
      ctx
    );
  }
}

export const leaveService = new LeaveService();
