// ============================================================================
// Foundation Reset, VVIP Platform Portal, Company Admin & HR Designation Test Suite
// ============================================================================

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { employeeService } from '../../src/modules/payroll/services/employee.service';
import { onboardingService } from '../../src/modules/onboarding/services/onboarding.service';
import { authService } from '../../src/modules/identity/services/auth-service';

const superAdminTenant: TenantContext = {
  companyId: '',
  companyName: 'Platform Super Administration',
  userId: 'user-super-admin',
  userEmail: 'admin@mujahid.com',
  userFullName: 'Platform Super Administrator',
  roles: ['SUPER_ADMIN'],
  permissions: ['*'],
  isPlatformAdmin: true,
  companyTier: 'enterprise',
  baseCurrency: 'USD',
};

function createTestPayload(name: string, code: string, adminName: string, adminEmail: string, designation?: string) {
  const payload = onboardingService.getDefaultOnboardingPayload();
  payload.name = name;
  payload.legalName = `${name} LLC`;
  payload.code = code;
  payload.taxIdentifier = `TAX-${code}`;
  payload.initialAdmin = {
    fullName: adminName,
    username: adminEmail.split('@')[0],
    email: adminEmail,
    password: 'AdminPassword@123',
    designation: designation || 'Managing Director & CEO',
  };
  return payload;
}

describe('Foundation Reset & VVIP Platform Portal Verification', () => {
  beforeEach(() => {
    db.resetDatabase();
  });

  it('starts in fresh 0-company baseline state with Platform Super Admin preserved', () => {
    const companies = db.getCompanies(superAdminTenant);
    assert.strictEqual(companies.length, 0, 'Initial companies must be zero after fresh reset');

    const users = db.getUsers(superAdminTenant);
    assert.strictEqual(users.length, 1, 'Only 1 user should exist: Platform Super Admin');

    const superAdmin = users[0];
    assert.strictEqual(superAdmin.isPlatformSuperAdmin, true, 'User must be Platform Super Admin');
    assert.strictEqual(superAdmin.email, 'admin@mujahid.com');
    assert.strictEqual(superAdmin.username, 'admin@mujahid.com');
    assert.strictEqual(superAdmin.password, 'bahwanmge');
  });

  it('creates a new company via full onboarding with initial admin, designation, and employee record', () => {
    const payload = createTestPayload(
      'Apex Industrial Corp',
      'APEX',
      'Sarah Connor',
      'sarah.connor@apexindustrial.com',
      'Managing Director & CEO'
    );

    const { company } = onboardingService.activateCompany(payload, 'u-super-admin', superAdminTenant);

    assert.ok(company.id, 'Company should have a valid generated ID');
    assert.strictEqual(company.name, 'Apex Industrial Corp');
    assert.strictEqual(company.status, 'active');

    // Tenant context for the newly onboarded company
    const apexTenant: TenantContext = {
      ...superAdminTenant,
      companyId: company.id,
      isPlatformAdmin: false,
    };

    // Verify Designations
    const designations = db.getDesignations(apexTenant);
    assert.ok(designations.length >= 1, 'Initial designation must be created during onboarding');
    const ceoDesg = designations.find((d) => d.name === 'Managing Director & CEO');
    assert.ok(ceoDesg, 'Managing Director & CEO designation should exist');

    // Verify Initial Admin Employee
    const employees = db.getEmployees(apexTenant);
    assert.strictEqual(employees.length, 1, '1 employee must exist (Initial Admin)');
    const adminEmp = employees[0];
    assert.strictEqual(adminEmp.fullName, 'Sarah Connor');
    assert.strictEqual(adminEmp.hasSystemAccess, true, 'Admin employee must have system access');
    assert.strictEqual(adminEmp.designation, 'Managing Director & CEO');

    // Verify Admin User & Membership
    const apexUsers = db.getUsers(apexTenant);
    const foundAdmin = apexUsers.find((u) => u.email === 'sarah.connor@apexindustrial.com');
    assert.ok(foundAdmin, 'Admin user account must exist');
    assert.strictEqual(foundAdmin.isPlatformSuperAdmin, false, 'Company admin is NOT platform super admin');

    const memberships = db.getCompanyMemberships(company.id, apexTenant);
    const adminMembership = memberships.find((m) => m.userId === foundAdmin.id);
    assert.ok(adminMembership, 'Membership must link admin user to company');
    assert.strictEqual(adminMembership.roleId, 'role-company-admin');
  });

  it('supports company status lifecycle changes (active -> inactive -> active)', () => {
    const payload = createTestPayload(
      'Beta Logistics',
      'BETA',
      'John Admin',
      'john@betalogistics.com'
    );

    const { company } = onboardingService.activateCompany(payload, 'u-super-admin', superAdminTenant);
    assert.strictEqual(company.status, 'active');

    // Deactivate company
    const deactivated = db.updateCompanyStatus(company.id, 'inactive', superAdminTenant);
    assert.strictEqual(deactivated?.status, 'inactive');

    // Reactivate company
    const reactivated = db.updateCompanyStatus(company.id, 'active', superAdminTenant);
    assert.strictEqual(reactivated?.status, 'active');
  });

  it('safely deletes a company with full cascade when confirmed', () => {
    const payload = createTestPayload(
      'Temp Company To Delete',
      'TEMP',
      'Temp Admin',
      'admin@tempco.com'
    );

    const { company } = onboardingService.activateCompany(payload, 'u-super-admin', superAdminTenant);
    const companyId = company.id;
    assert.strictEqual(db.getCompanies(superAdminTenant).length, 1);

    // Delete company
    const deleted = db.deleteCompany(companyId, superAdminTenant);
    assert.strictEqual(deleted, true);
    assert.strictEqual(db.getCompanies(superAdminTenant).length, 0);
  });
});

describe('HR Designation Master & System User Separation', () => {
  let companyTenant: TenantContext;

  beforeEach(() => {
    db.resetDatabase();
    const payload = createTestPayload(
      'Global Solutions Ltd',
      'GSL',
      'Admin User',
      'admin@globalsolutions.com',
      'General Manager'
    );

    const { company } = onboardingService.activateCompany(payload, 'u-super-admin', superAdminTenant);

    companyTenant = {
      ...superAdminTenant,
      companyId: company.id,
      isPlatformAdmin: false,
      permissions: ['*'],
    };
  });

  it('allows creating, querying by department, updating, and deleting designations', () => {
    const depts = db.getDepartments(companyTenant);
    const financeDept = depts.find((d) => d.code === 'FIN') || depts[1] || depts[0];

    // Create Designations
    const desg1 = db.createDesignation(
      {
        name: 'Senior Financial Accountant',
        code: 'DESG-FIN-01',
        departmentId: financeDept?.id,
        departmentCode: financeDept?.code,
        description: 'Oversees GL entries and reconciliation',
        status: 'active',
      },
      companyTenant
    );

    const desg2 = db.createDesignation(
      {
        name: 'Junior Payroll Clerk',
        code: 'DESG-FIN-02',
        departmentId: financeDept?.id,
        departmentCode: financeDept?.code,
        status: 'active',
      },
      companyTenant
    );

    const allDesgs = db.getDesignations(companyTenant);
    assert.ok(allDesgs.length >= 3, 'Should include onboarding designation + 2 new ones');

    // Filter by department
    if (financeDept) {
      const financeDesgs = db.getDesignations(companyTenant, financeDept.id);
      assert.strictEqual(financeDesgs.length, 2);
    }

    // Update Designation
    const updated = db.updateDesignation(
      desg1.id,
      { description: 'Senior Financial Lead & Auditor' },
      companyTenant
    );
    assert.strictEqual(updated?.description, 'Senior Financial Lead & Auditor');

    // Delete Designation
    const deleted = db.deleteDesignation(desg2.id, companyTenant);
    assert.strictEqual(deleted, true);
    assert.strictEqual(db.getDesignationById(desg2.id, companyTenant), undefined);
  });

  it('creates pure HR employee without ERP login access (no user or membership created)', () => {
    const initialUsersCount = db.getUsers(companyTenant).length;
    const initialMembershipsCount = db.getCompanyMemberships(companyTenant.companyId, companyTenant).length;

    const emp = employeeService.createEmployee(
      {
        employeeCode: 'EMP-0101',
        firstName: 'Robert',
        lastName: 'Brown',
        email: 'robert.brown@company.com',
        phone: '+1 555 1234',
        jobTitle: 'Field Technician',
        designation: 'Field Technician',
        dateOfBirth: '1992-05-15',
        gender: 'male',
        nationality: 'American',
        joiningDate: '2026-02-01',
        employmentType: 'full_time',
        basicSalary: '4500.00',
        paymentMethod: 'bank_transfer',
        hasSystemAccess: false,
      },
      companyTenant
    );

    assert.ok(emp.id);
    assert.strictEqual(emp.fullName, 'Robert Brown');
    assert.strictEqual(emp.hasSystemAccess, false);
    assert.strictEqual(emp.systemUserId, undefined);

    // Verify NO new DbUser or DbCompanyMembership created
    assert.strictEqual(db.getUsers(companyTenant).length, initialUsersCount);
    assert.strictEqual(
      db.getCompanyMemberships(companyTenant.companyId, companyTenant).length,
      initialMembershipsCount
    );
  });

  it('creates employee with ERP system access atomically (creates DbUser and DbCompanyMembership)', () => {
    const initialUsersCount = db.getUsers(companyTenant).length;
    const initialMembershipsCount = db.getCompanyMemberships(companyTenant.companyId, companyTenant).length;

    const emp = employeeService.createEmployee(
      {
        employeeCode: 'EMP-0202',
        firstName: 'Alice',
        lastName: 'Wonderland',
        email: 'alice.w@company.com',
        phone: '+1 555 5678',
        jobTitle: 'Lead Accountant',
        designation: 'Lead Accountant',
        dateOfBirth: '1994-08-20',
        gender: 'female',
        nationality: 'American',
        joiningDate: '2026-03-01',
        employmentType: 'full_time',
        basicSalary: '6500.00',
        paymentMethod: 'bank_transfer',
        hasSystemAccess: true,
        systemUser: {
          username: 'alicew',
          email: 'alice.w@company.com',
          password: 'SecretPassword@123',
          roleId: 'role-accountant',
        },
      },
      companyTenant
    );

    assert.ok(emp.id);
    assert.strictEqual(emp.fullName, 'Alice Wonderland');
    assert.strictEqual(emp.hasSystemAccess, true);
    assert.ok(emp.systemUserId, 'Employee must be linked to a system user ID');
    assert.strictEqual(emp.systemRoleId, 'role-accountant');

    // Verify DbUser & DbCompanyMembership WERE created
    assert.strictEqual(db.getUsers(companyTenant).length, initialUsersCount + 1);
    assert.strictEqual(
      db.getCompanyMemberships(companyTenant.companyId, companyTenant).length,
      initialMembershipsCount + 1
    );

    const user = db.getUserById(emp.systemUserId!, companyTenant);
    assert.ok(user);
    assert.strictEqual(user.username, 'alicew');
    assert.strictEqual(user.email, 'alice.w@company.com');
    assert.strictEqual(user.isPlatformSuperAdmin, false);
  });

  it('authenticates VVIP Platform Super Admin and rejects invalid credentials', () => {
    // Valid login
    const superAdmin = authService.loginSuperAdmin('admin@mujahid.com', 'bahwanmge');
    assert.ok(superAdmin);
    assert.strictEqual(superAdmin.isPlatformSuperAdmin, true);
    assert.strictEqual(authService.isAuthenticated(), true);

    const ctx = authService.getTenantContext();
    assert.strictEqual(ctx.isPlatformAdmin, true);
    assert.strictEqual(ctx.userEmail, 'admin@mujahid.com');

    // Reject wrong password
    assert.throws(() => {
      authService.loginSuperAdmin('admin@mujahid.com', 'wrongpassword');
    }, /Incorrect password/);

    // Reject non-existent user
    assert.throws(() => {
      authService.loginSuperAdmin('unknown@random.com', 'bahwanmge');
    }, /Invalid Super Admin credentials/);
  });

  it('authenticates Company Admin and Employee with Company Access Code & credentials', () => {
    // 1. Onboard Company with Access Code
    const payload = createTestPayload(
      'Zenith Industrial Ltd',
      'ZENITH',
      'Robert Vance',
      'robert.v@zenith.com',
      'Managing Director'
    );
    payload.accessCode = 'ZENITH-2026';
    payload.initialAdmin.password = 'VancePassword@123';

    const { company } = onboardingService.activateCompany(payload, 'u-super-admin', superAdminTenant);
    assert.ok(company);
    assert.strictEqual(company.accessCode, 'ZENITH-2026');

    const zenithTenant: TenantContext = {
      ...superAdminTenant,
      companyId: company.id,
      isPlatformAdmin: false,
    };

    // 2. Company Admin creates an Employee with ERP system access
    employeeService.createEmployee(
      {
        employeeCode: 'EMP-ZEN-01',
        firstName: 'Emma',
        lastName: 'Watson',
        email: 'emma.w@zenith.com',
        jobTitle: 'Finance Manager',
        designation: 'Finance Manager',
        dateOfBirth: '1992-05-15',
        gender: 'female',
        nationality: 'British',
        joiningDate: '2026-03-01',
        employmentType: 'full_time',
        basicSalary: '7500.00',
        paymentMethod: 'bank_transfer',
        hasSystemAccess: true,
        systemUser: {
          username: 'emmaw',
          email: 'emma.w@zenith.com',
          password: 'EmmaPassword@123',
          roleId: 'role-accountant',
        },
      },
      zenithTenant
    );

    // 3. Authenticate Company Admin via Access Code
    const adminLoginResult = authService.loginCompanyUser(
      'ZENITH-2026',
      'robert.v@zenith.com',
      'VancePassword@123'
    );
    assert.ok(adminLoginResult.user);
    assert.strictEqual(adminLoginResult.company.id, company.id);
    assert.strictEqual(authService.isAuthenticated(), true);

    const adminCtx = authService.getTenantContext();
    assert.strictEqual(adminCtx.companyId, company.id);
    assert.strictEqual(adminCtx.isPlatformAdmin, false);
    assert.strictEqual(adminCtx.userEmail, 'robert.v@zenith.com');

    // 4. Authenticate Employee via Access Code and Username
    const empLoginResult = authService.loginCompanyUser(
      'ZENITH-2026',
      'emmaw',
      'EmmaPassword@123'
    );
    assert.ok(empLoginResult.user);
    assert.strictEqual(empLoginResult.user.username, 'emmaw');

    const empCtx = authService.getTenantContext();
    assert.strictEqual(empCtx.companyId, company.id);
    assert.strictEqual(empCtx.userEmail, 'emma.w@zenith.com');

    // 5. Reject invalid access code or bad password
    assert.throws(() => {
      authService.loginCompanyUser('INVALID-CODE', 'emmaw', 'EmmaPassword@123');
    }, /Company Access Code "INVALID-CODE" not recognized/);

    assert.throws(() => {
      authService.loginCompanyUser('ZENITH-2026', 'emmaw', 'WrongPassword');
    }, /Incorrect password/);

    // 6. Test Logout
    authService.logout();
    assert.strictEqual(authService.isAuthenticated(), false);
  });
});
