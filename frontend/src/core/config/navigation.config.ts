// ============================================================================
// Master Centralized Navigation Configuration Engine
// ============================================================================

import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Truck, 
  Boxes, 
  BookOpen, 
  Landmark, 
  Users, 
  Building2, 
  Briefcase, 
  BarChart3, 
  Settings,
} from 'lucide-react';
import { TenantContext, CompanyTier } from '@/core/types/common';
import { capabilityService } from '@/modules/capabilities/services/capability-service';
import { permissionService } from '@/modules/authorization/services/permission-service';

export interface NavWorkspaceItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: string;
  requiredPermission?: string;
  minTier?: CompanyTier;
  order: number;
}

export const MASTER_NAV_CONFIG: NavWorkspaceItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    order: 1,
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingBag,
    moduleKey: 'sales',
    requiredPermission: 'sales.view',
    minTier: 'small',
    order: 2,
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: Truck,
    moduleKey: 'accounts_payable',
    requiredPermission: 'ap.view',
    minTier: 'small',
    order: 3,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    moduleKey: 'inventory',
    requiredPermission: 'inventory.view',
    minTier: 'small', // Visible if enabled for company
    order: 4,
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: BookOpen,
    moduleKey: 'financial_accounting',
    requiredPermission: 'accounting.view',
    minTier: 'small',
    order: 5,
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: Landmark,
    moduleKey: 'banking_cash',
    requiredPermission: 'banking.view',
    minTier: 'small',
    order: 6,
  },
  {
    id: 'payroll',
    label: 'HR & Payroll',
    icon: Users,
    moduleKey: 'payroll_hr',
    requiredPermission: 'payroll.view',
    minTier: 'medium',
    order: 7,
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: Building2,
    moduleKey: 'fixed_assets',
    requiredPermission: 'assets.view',
    minTier: 'medium',
    order: 8,
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: Briefcase,
    moduleKey: 'project_accounting',
    requiredPermission: 'project.manage',
    minTier: 'enterprise',
    order: 9,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    moduleKey: 'advanced_reporting',
    requiredPermission: 'reports.view_financial',
    minTier: 'small',
    order: 10,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    order: 11,
  },
];

/**
 * Computes visible primary sidebar items based on:
 * User + Company + Role + Permissions + Company Tier + Module Entitlements
 */
export function getVisibleNavItems(tenant: TenantContext): NavWorkspaceItem[] {
  return MASTER_NAV_CONFIG.filter((item) => {
    // 1. Check module enablement for the company
    if (item.moduleKey) {
      const isEnabled = capabilityService.isModuleEnabled(tenant, item.moduleKey);
      if (!isEnabled) return false;
    }

    // 2. Check user permissions
    if (item.requiredPermission) {
      const hasPerm = permissionService.hasPermission(tenant, item.requiredPermission);
      if (!hasPerm) return false;
    }

    return true;
  }).sort((a, b) => a.order - b.order);
}
