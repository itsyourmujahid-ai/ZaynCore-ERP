// ============================================================================
// Employee Master & HR Lifecycle Domain Service
// ============================================================================

import { db } from '@/database/storage';
import {
  DbEmployee,
  EmploymentStatus,
  EmploymentType,
  Gender,
  PayrollPaymentMethod,
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { permissionService } from '@/modules/authorization/services/permission-service';

export interface CreateEmployeeDTO {
  employeeCode?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality: string;
  nationalIdOrPassport?: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  countryCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  jobTitle?: string;
  designationId?: string;
  designation?: string;
  departmentId?: string;
  branchId?: string;
  costCenterId?: string;
  managerId?: string;
  workLocation?: string;
  joiningDate: string;
  employmentType: EmploymentType;
  employmentStatus?: EmploymentStatus;
  salaryStructureId?: string;
  basicSalary: string;
  currency?: string;
  paymentMethod?: PayrollPaymentMethod;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIban?: string;
  taxIdentificationNumber?: string;
  notes?: string;
  createSystemUser?: boolean;
  userCredentials?: {
    username?: string;
    email?: string;
    password?: string;
    roleId?: string;
  };
  hasSystemAccess?: boolean;
  systemUser?: {
    username?: string;
    email?: string;
    password?: string;
    roleId?: string;
  };
}

export class EmployeeService {
  public getEmployees(ctx: TenantContext): DbEmployee[] {
    return db.getEmployees(ctx);
  }

  public getEmployeeById(id: string, ctx: TenantContext): DbEmployee | undefined {
    return db.getEmployeeById(id, ctx);
  }

  public createEmployee(payload: CreateEmployeeDTO, ctx: TenantContext): DbEmployee {
    permissionService.assertPermission(ctx, 'employees.create');

    const existingEmployees = db.getEmployees(ctx);
    let code = payload.employeeCode;
    if (!code) {
      const nextNum = existingEmployees.length + 1;
      code = `EMP-${nextNum.toString().padStart(4, '0')}`;
    }

    // Check code uniqueness within tenant
    if (existingEmployees.some((e) => e.employeeCode.toLowerCase() === code!.toLowerCase())) {
      throw new Error(`Employee with code '${code}' already exists in this organization.`);
    }

    const fullName = `${payload.firstName.trim()} ${payload.lastName.trim()}`;
    const basic = parseFloat(payload.basicSalary) || 0;
    const title = payload.jobTitle?.trim() || payload.designation?.trim() || 'Staff';

    const result = db.createEmployeeWithSystemUser(
      {
        employeeCode: code,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        fullName,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        nationality: payload.nationality,
        nationalIdOrPassport: payload.nationalIdOrPassport,
        email: payload.email?.trim() || '',
        phone: payload.phone?.trim() || '',
        addressLine1: payload.addressLine1,
        city: payload.city,
        countryCode: payload.countryCode || 'US',
        emergencyContactName: payload.emergencyContactName,
        emergencyContactPhone: payload.emergencyContactPhone,
        jobTitle: title,
        designationId: payload.designationId,
        designation: payload.designation || title,
        departmentId: payload.departmentId,
        branchId: payload.branchId,
        costCenterId: payload.costCenterId,
        managerId: payload.managerId,
        workLocation: payload.workLocation || 'HQ Main Office',
        joiningDate: payload.joiningDate,
        employmentType: payload.employmentType,
        employmentStatus: payload.employmentStatus || 'active',
        salaryStructureId: payload.salaryStructureId,
        basicSalary: basic.toFixed(4),
        currency: payload.currency || ctx.baseCurrency,
        paymentMethod: payload.paymentMethod || 'bank_transfer',
        bankName: payload.bankName,
        bankAccountName: payload.bankAccountName || fullName,
        bankAccountNumber: payload.bankAccountNumber,
        bankIban: payload.bankIban,
        taxIdentificationNumber: payload.taxIdentificationNumber,
        notes: payload.notes,
        isActive: payload.employmentStatus !== 'terminated' && payload.employmentStatus !== 'inactive',
        createSystemUser: payload.createSystemUser ?? payload.hasSystemAccess ?? false,
        userCredentials: payload.userCredentials || (payload.systemUser ? {
          username: payload.systemUser.username,
          email: payload.systemUser.email || payload.email,
          password: payload.systemUser.password,
          roleId: payload.systemUser.roleId,
        } : undefined),
      },
      ctx
    );

    const emp = result.employee;

    // Initialize default leave balances for current calendar year
    this.initializeLeaveBalances(emp.id, new Date(emp.joiningDate).getFullYear(), ctx);

    return emp;
  }

  public updateEmployee(
    id: string,
    payload: Partial<DbEmployee>,
    ctx: TenantContext
  ): DbEmployee {
    permissionService.assertPermission(ctx, 'employees.edit');

    const emp = db.getEmployeeById(id, ctx);
    if (!emp) throw new Error(`Employee '${id}' not found`);

    if (payload.firstName || payload.lastName) {
      const fName = payload.firstName || emp.firstName;
      const lName = payload.lastName || emp.lastName;
      payload.fullName = `${fName.trim()} ${lName.trim()}`;
    }

    if (payload.employmentStatus) {
      payload.isActive = payload.employmentStatus !== 'terminated' && payload.employmentStatus !== 'inactive';
    }

    return db.updateEmployee(id, payload, ctx);
  }

  public transitionStatus(
    id: string,
    newStatus: EmploymentStatus,
    reason: string | undefined,
    ctx: TenantContext
  ): DbEmployee {
    permissionService.assertPermission(ctx, 'employees.edit');

    const emp = db.getEmployeeById(id, ctx);
    if (!emp) throw new Error(`Employee '${id}' not found`);

    const updates: Partial<DbEmployee> = {
      employmentStatus: newStatus,
      isActive: newStatus !== 'terminated' && newStatus !== 'inactive',
    };

    if (newStatus === 'terminated') {
      updates.terminationDate = new Date().toISOString().split('T')[0];
      updates.terminationReason = reason || 'Separation of employment';
    }

    return db.updateEmployee(id, updates, ctx);
  }

  private initializeLeaveBalances(employeeId: string, year: number, ctx: TenantContext): void {
    const leaveTypes = db.getLeaveTypes(ctx);
    for (const lt of leaveTypes) {
      if (lt.isActive && lt.defaultDaysPerYear > 0) {
        db.upsertLeaveBalance(
          {
            employeeId,
            leaveTypeId: lt.id,
            year,
            openingBalance: lt.defaultDaysPerYear.toFixed(1),
            accrued: '0.0',
            used: '0.0',
            available: lt.defaultDaysPerYear.toFixed(1),
          },
          ctx
        );
      }
    }
  }
}

export const employeeService = new EmployeeService();
