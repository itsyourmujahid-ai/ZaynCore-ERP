// ============================================================================
// Identity & Authentication Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbUser, DbCompany } from '@/database/types';

class AuthService {
  private currentUserId: string = '';
  private currentCompanyId: string = '';
  private currentBranchId: string = '';
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Restore session if available
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ERP_ACTIVE_SESSION');
      if (saved) {
        try {
          const sess = JSON.parse(saved);
          this.currentUserId = sess.userId || '';
          this.currentCompanyId = sess.companyId || '';
          this.currentBranchId = sess.branchId || '';
        } catch {
          this.currentUserId = '';
          this.currentCompanyId = '';
          this.currentBranchId = '';
        }
      }
    }
  }

  private saveSession(): void {
    if (typeof localStorage !== 'undefined') {
      if (this.currentUserId) {
        localStorage.setItem(
          'ERP_ACTIVE_SESSION',
          JSON.stringify({
            userId: this.currentUserId,
            companyId: this.currentCompanyId,
            branchId: this.currentBranchId,
          })
        );
      } else {
        localStorage.removeItem('ERP_ACTIVE_SESSION');
      }
    }
    this.notify();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public isAuthenticated(): boolean {
    if (!this.currentUserId) return false;
    const users = db.getUsers();
    return users.some((u) => u.id === this.currentUserId);
  }

  public getCurrentUser(): DbUser | undefined {
    if (!this.currentUserId) return undefined;
    return db.getUsers().find((u) => u.id === this.currentUserId);
  }

  public loginSuperAdmin(identifier: string, password: string): DbUser {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();
    const users = db.getUsers();
    
    const superAdmin = users.find(
      (u) =>
        u.isPlatformSuperAdmin &&
        (u.email.toLowerCase() === cleanId || (u.username && u.username.toLowerCase() === cleanId))
    );

    if (!superAdmin) {
      throw new Error('Invalid Super Admin credentials. Platform admin not found.');
    }

    const expectedPass = superAdmin.password || 'bahwanmge';
    if (cleanPass !== expectedPass) {
      throw new Error('Incorrect password for Platform Super Admin.');
    }

    this.currentUserId = superAdmin.id;
    this.currentCompanyId = '';
    this.currentBranchId = '';
    this.saveSession();
    return superAdmin;
  }

  public loginCompanyUser(
    accessCode: string,
    identifier: string,
    password: string
  ): { user: DbUser; company: DbCompany } {
    const cleanCode = accessCode.trim().toUpperCase();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanCode) throw new Error('Company Access Code is required.');
    if (!cleanId) throw new Error('Username or Email is required.');
    if (!cleanPass) throw new Error('Password is required.');

    const companies = db.getCompanies();
    const company = companies.find(
      (c) =>
        (c.accessCode && c.accessCode.toUpperCase() === cleanCode) ||
        c.code.toUpperCase() === cleanCode
    );

    if (!company) {
      throw new Error(`Company Access Code "${cleanCode}" not recognized. Please check your company code.`);
    }

    if (company.status === 'inactive' || company.status === 'suspended') {
      throw new Error(`Company "${company.name}" is currently ${company.status.toUpperCase()}. Contact Platform Administration.`);
    }

    const memberships = db.getCompanyMemberships(company.id);
    const users = db.getUsers();

    // Find the user with matching email or username who belongs to this company
    const matchingUser = users.find((u) => {
      const matchIdentity =
        u.email.toLowerCase() === cleanId ||
        (u.username && u.username.toLowerCase() === cleanId);
      if (!matchIdentity) return false;
      return memberships.some((m) => m.userId === u.id);
    });

    if (!matchingUser) {
      throw new Error(`User "${identifier}" is not registered under company ${company.name}.`);
    }

    if (matchingUser.password && matchingUser.password !== cleanPass) {
      throw new Error('Incorrect password. Please verify your credentials.');
    }

    const branches = db.getBranches({ companyId: company.id } as TenantContext);
    const membership = memberships.find((m) => m.userId === matchingUser.id);
    const branchId = membership?.branchId || (branches.length > 0 ? branches[0].id : '');

    this.currentUserId = matchingUser.id;
    this.currentCompanyId = company.id;
    this.currentBranchId = branchId;
    this.saveSession();

    return { user: matchingUser, company };
  }

  public logout(): void {
    this.currentUserId = '';
    this.currentCompanyId = '';
    this.currentBranchId = '';
    this.saveSession();
  }

  public switchUser(userId: string): void {
    const user = db.getUsers().find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    this.currentUserId = userId;

    // Find primary or first company for this user
    const memberships = db.getMembershipsForUser(userId);
    if (memberships.length > 0) {
      const primary = memberships.find((m) => m.isPrimaryCompany) || memberships[0];
      this.currentCompanyId = primary.companyId;
      this.currentBranchId = primary.branchId || '';
    } else if (user.isPlatformSuperAdmin) {
      const companies = db.getCompanies();
      this.currentCompanyId = companies.length > 0 ? companies[0].id : '';
      this.currentBranchId = '';
    }
    this.saveSession();
  }

  public switchCompany(companyId: string): void {
    const company = db.getCompanyById(companyId);
    if (!company) throw new Error('Company not found');

    this.currentCompanyId = companyId;
    const branches = db.getBranches({ companyId } as TenantContext);
    this.currentBranchId = branches.length > 0 ? branches[0].id : '';
    this.saveSession();
  }

  public switchBranch(branchId: string): void {
    this.currentBranchId = branchId;
    this.saveSession();
  }

  public getTenantContext(): TenantContext {
    const users = db.getUsers();
    const user =
      users.find((u) => u.id === this.currentUserId) ||
      users.find((u) => u.isPlatformSuperAdmin) ||
      users[0] || {
        id: 'u1000000-0000-0000-0000-000000000001',
        username: 'admin@mujahid.com',
        email: 'admin@mujahid.com',
        fullName: 'Platform Super Administrator (VVIP Owner)',
        passwordHash: 'argon2:$bahwanmge$',
        password: 'bahwanmge',
        isPlatformSuperAdmin: true,
        status: 'active' as const,
        createdAt: '2026-01-01T00:00:00Z',
      };

    const companies = db.getCompanies();
    const company =
      (this.currentCompanyId ? db.getCompanyById(this.currentCompanyId) : undefined) ||
      (user.isPlatformSuperAdmin ? undefined : companies[0]);

    const branches = company ? db.getBranches({ companyId: company.id } as TenantContext) : [];
    const branch = branches.find((b) => b.id === this.currentBranchId) || branches[0];

    const memberships = user ? db.getMembershipsForUser(user.id) : [];
    const membership = company ? memberships.find((m) => m.companyId === company.id) : undefined;

    const roles = db.getRoles();
    const activeRole = membership
      ? roles.find((r) => r.id === membership.roleId)
      : user.isPlatformSuperAdmin
      ? roles.find((r) => r.code === 'SUPER_ADMIN')
      : undefined;

    const roleCodes = activeRole
      ? [activeRole.code]
      : user.isPlatformSuperAdmin
      ? ['SUPER_ADMIN']
      : ['VIEWER'];
    const permissions = activeRole
      ? activeRole.permissions
      : user.isPlatformSuperAdmin
      ? ['*']
      : [];

    return {
      companyId: company?.id || '',
      companyName: company?.name || 'Platform Administration',
      companyTier: company?.tier || 'enterprise',
      baseCurrency: company?.baseCurrency || 'USD',
      branchId: branch?.id,
      branchName: branch?.name,
      userId: user.id,
      userEmail: user.email,
      userFullName: user.fullName,
      roles: roleCodes,
      permissions,
      isPlatformAdmin: user.isPlatformSuperAdmin,
    };
  }

  public getAllUsers(): DbUser[] {
    return db.getUsers();
  }
}

export const authService = new AuthService();
