// ============================================================================
// Fine-Grained Role-Based Access Control (RBAC) & Permission Engine
// ============================================================================

import { TenantContext } from '@/core/types/common';
import { UnauthorizedAccessError } from '@/core/errors/DomainErrors';

export class PermissionService {
  /**
   * Evaluates if the current tenant context possesses the required permission.
   * Super Admins or wildcards ('*') automatically grant access.
   */
  public hasPermission(ctx: TenantContext, requiredPermission: string): boolean {
    if (ctx.isPlatformAdmin) return true;
    if (!ctx.permissions || !Array.isArray(ctx.permissions)) return false;
    if (ctx.permissions.includes('*')) return true;

    // Check exact match
    if (ctx.permissions.includes(requiredPermission)) return true;

    // Check domain prefix wildcard (e.g. "accounting.*" grants "accounting.journal.post")
    const parts = requiredPermission.split('.');
    if (parts.length > 1) {
      const wildcard = `${parts[0]}.*`;
      if (ctx.permissions.includes(wildcard)) return true;
    }

    return false;
  }

  /**
   * Asserts permission and throws UnauthorizedAccessError if missing
   */
  public assertPermission(ctx: TenantContext, requiredPermission: string): void {
    if (!this.hasPermission(ctx, requiredPermission)) {
      throw new UnauthorizedAccessError(requiredPermission);
    }
  }

  /**
   * Checks if user has any of the specified permissions
   */
  public hasAnyPermission(ctx: TenantContext, permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(ctx, p));
  }

  /**
   * Checks if user has all of the specified permissions
   */
  public hasAllPermissions(ctx: TenantContext, permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(ctx, p));
  }
}

export const permissionService = new PermissionService();
