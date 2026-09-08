// ============================================================================
// Enterprise Role Recommendation Engine (Phase 15 Onboarding)
// ============================================================================

import { FullCompanyOnboardingPayload, BusinessType, SellingCategory, BuyingCategory } from '@/database/types';

export interface RecommendedRoleDefinition {
  key: string;
  roleKey: string;
  name: string;
  roleName: string;
  description: string;
  isCore: boolean;
  defaultSelected: boolean;
  reason: string;
  category: 'core' | 'finance' | 'sales' | 'procurement' | 'operations' | 'hr' | 'projects' | 'management';
}

export interface RoleRecommendationCriteria {
  businessTypes: BusinessType[];
  sellingCategories?: SellingCategory[];
  buyingCategories?: BuyingCategory[];
  hasInventory?: boolean;
  hasPayroll?: boolean;
  hasProjects?: boolean;
  hasManufacturing?: boolean;
  hasAssets?: boolean;
  hasTax?: boolean;
}

export class RoleRecommendationService {
  public static readonly ALL_ROLES: RecommendedRoleDefinition[] = [
    {
      key: 'COMPANY_ADMIN',
      roleKey: 'COMPANY_ADMIN',
      name: 'Company Administrator',
      roleName: 'Company Administrator',
      description: 'Full administrative access over company settings, users, and business configurations.',
      isCore: true,
      defaultSelected: true,
      reason: 'Mandatory primary administrative role for the company.',
      category: 'core',
    },
    {
      key: 'ACCOUNTANT',
      roleKey: 'ACCOUNTANT',
      name: 'Financial Accountant',
      roleName: 'Financial Accountant',
      description: 'Full posting and journal authority over General Ledger, AR, AP, and trial balance.',
      isCore: true,
      defaultSelected: true,
      reason: 'Essential for day-to-day transaction posting and balance sheet governance.',
      category: 'finance',
    },
    {
      key: 'CHIEF_FINANCIAL_OFFICER',
      roleKey: 'CHIEF_FINANCIAL_OFFICER',
      name: 'Chief Financial Officer (CFO)',
      roleName: 'Chief Financial Officer (CFO)',
      description: 'High-level financial governance, period close authorization, and consolidated statements.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for corporate governance and multi-entity consolidation.',
      category: 'management',
    },
    {
      key: 'SALES_MANAGER',
      roleKey: 'SALES_MANAGER',
      name: 'Sales & Commercial Manager',
      roleName: 'Sales & Commercial Manager',
      description: 'Authorizes quotations, sets customer credit limits, and approves commercial discounts.',
      isCore: false,
      defaultSelected: true,
      reason: 'Recommended for commercial organizations managing sales pipelines and client credit.',
      category: 'sales',
    },
    {
      key: 'SALES_USER',
      roleKey: 'SALES_USER',
      name: 'Sales Executive / Representative',
      roleName: 'Sales Executive / Representative',
      description: 'Creates sales quotations, logs sales orders, and issues customer pro-forma invoices.',
      isCore: false,
      defaultSelected: true,
      reason: 'Standard sales operations role for front-line invoicing and customer management.',
      category: 'sales',
    },
    {
      key: 'PURCHASE_MANAGER',
      roleKey: 'PURCHASE_MANAGER',
      name: 'Procurement / Purchasing Manager',
      roleName: 'Procurement / Purchasing Manager',
      description: 'Approves purchase requisitions, issues RFQs, selects vendor quotes, and issues POs.',
      isCore: false,
      defaultSelected: true,
      reason: 'Recommended for companies with formal vendor procurement and 3-way matching.',
      category: 'procurement',
    },
    {
      key: 'PURCHASE_USER',
      roleKey: 'PURCHASE_USER',
      name: 'Procurement Specialist',
      roleName: 'Procurement Specialist',
      description: 'Creates purchase requests, enters supplier bills, and logs incoming goods receipts.',
      isCore: false,
      defaultSelected: true,
      reason: 'Standard procurement role for vendor order entry and receiving operations.',
      category: 'procurement',
    },
    {
      key: 'WAREHOUSE_MANAGER',
      roleKey: 'WAREHOUSE_MANAGER',
      name: 'Warehouse & Inventory Manager',
      roleName: 'Warehouse & Inventory Manager',
      description: 'Controls storage bays, authorizes stock transfers, runs physical counts, and adjusts inventory.',
      isCore: false,
      defaultSelected: true,
      reason: 'Recommended for companies maintaining physical stock, SKUs, and distribution centers.',
      category: 'operations',
    },
    {
      key: 'INVENTORY_CONTROLLER',
      roleKey: 'INVENTORY_CONTROLLER',
      name: 'Inventory Controller / Storekeeper',
      roleName: 'Inventory Controller / Storekeeper',
      description: 'Performs stock receiving, bin movements, physical stocktaking, and dispatch verifications.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for high-volume inventory operations with dedicated stockroom staff.',
      category: 'operations',
    },
    {
      key: 'PRODUCTION_MANAGER',
      roleKey: 'PRODUCTION_MANAGER',
      name: 'Production & Plant Manager',
      roleName: 'Production & Plant Manager',
      description: 'Oversees Bill of Materials (BOM), manufacturing work orders, and shop floor staging.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for manufacturing and assembly operations.',
      category: 'operations',
    },
    {
      key: 'QUALITY_CONTROLLER',
      roleKey: 'QUALITY_CONTROLLER',
      name: 'Quality Assurance / QC Inspector',
      roleName: 'Quality Assurance / QC Inspector',
      description: 'Performs incoming batch inspections, certificates of analysis, and quarantine releases.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for manufacturing and regulated trade environments.',
      category: 'operations',
    },
    {
      key: 'PROJECT_MANAGER',
      roleKey: 'PROJECT_MANAGER',
      name: 'Project & Operations Manager',
      roleName: 'Project & Operations Manager',
      description: 'Manages project milestones, time & material billing, task schedules, and project profitability.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for professional services, engineering, contracting, and construction.',
      category: 'projects',
    },
    {
      key: 'CONSULTANT',
      roleKey: 'CONSULTANT',
      name: 'Professional Consultant / Specialist',
      roleName: 'Professional Consultant / Specialist',
      description: 'Logs billable hours, tracks client deliverables, and submits expense claims.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for advisory and professional services firms.',
      category: 'projects',
    },
    {
      key: 'PAYROLL_MANAGER',
      roleKey: 'PAYROLL_MANAGER',
      name: 'HR & Payroll Manager',
      roleName: 'HR & Payroll Manager',
      description: 'Processes monthly employee salary batches, manages leaves, deductions, and payslips.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for companies processing in-house employee payroll and HR benefits.',
      category: 'hr',
    },
    {
      key: 'FIXED_ASSET_MANAGER',
      roleKey: 'FIXED_ASSET_MANAGER',
      name: 'Fixed Assets Custodian',
      roleName: 'Fixed Assets Custodian',
      description: 'Maintains asset registry, runs monthly depreciation schedules, and records asset disposals.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for capital-intensive companies with plant, machinery, or vehicle fleets.',
      category: 'finance',
    },
    {
      key: 'TAX_MANAGER',
      roleKey: 'TAX_MANAGER',
      name: 'Tax Compliance Specialist',
      roleName: 'Tax Compliance Specialist',
      description: 'Prepares VAT/Tax returns, files sovereign tax statements, and verifies indirect tax sub-ledgers.',
      isCore: false,
      defaultSelected: false,
      reason: 'Recommended for VAT/Tax registered organizations.',
      category: 'finance',
    },
    {
      key: 'VIEWER',
      roleKey: 'VIEWER',
      name: 'Management / Executive Viewer',
      roleName: 'Management / Executive Viewer',
      description: 'Read-only access to financial dashboards, executive KPI cards, and management reports.',
      isCore: false,
      defaultSelected: true,
      reason: 'Auditors, board members, and executive stakeholders.',
      category: 'management',
    },
  ];

  /**
   * Generates tailored role recommendations from flexible criteria.
   */
  public static getRecommendedRoles(criteria: RoleRecommendationCriteria): RecommendedRoleDefinition[] {
    const isInventory = !!criteria.hasInventory;
    const isPayroll = !!criteria.hasPayroll;
    const isProjects = !!criteria.hasProjects || 
      criteria.businessTypes.includes('services') || 
      criteria.businessTypes.includes('project_based') ||
      criteria.businessTypes.includes('construction') ||
      criteria.businessTypes.includes('contracting');
    const isManufacturing = !!criteria.hasManufacturing || criteria.businessTypes.includes('manufacturing');
    const isAssets = !!criteria.hasAssets;
    const isTax = !!criteria.hasTax;

    return RoleRecommendationService.ALL_ROLES.filter((role) => {
      // Exclude irrelevant roles based on industry and module scope
      if (!isInventory && (role.key === 'WAREHOUSE_MANAGER' || role.key === 'INVENTORY_CONTROLLER')) {
        return false;
      }
      if (!isManufacturing && (role.key === 'PRODUCTION_MANAGER' || role.key === 'QUALITY_CONTROLLER')) {
        return false;
      }
      if (!isProjects && (role.key === 'PROJECT_MANAGER' || role.key === 'CONSULTANT')) {
        return false;
      }
      if (!isPayroll && role.key === 'PAYROLL_MANAGER') {
        return false;
      }
      return true;
    }).map((role) => {
      let shouldSelect = role.defaultSelected;
      let reason = role.reason;

      if (role.key === 'WAREHOUSE_MANAGER') {
        shouldSelect = isInventory;
      } else if (role.key === 'PRODUCTION_MANAGER') {
        shouldSelect = isManufacturing;
      } else if (role.key === 'PROJECT_MANAGER') {
        shouldSelect = isProjects;
      } else if (role.key === 'PAYROLL_MANAGER') {
        shouldSelect = isPayroll;
      } else if (role.key === 'FIXED_ASSET_MANAGER') {
        shouldSelect = isAssets;
      } else if (role.key === 'TAX_MANAGER') {
        shouldSelect = isTax;
      }

      return {
        ...role,
        defaultSelected: shouldSelect,
        reason,
      };
    });
  }

  /**
   * Generates tailored role recommendations based on company onboarding configuration payload.
   */
  public recommendRoles(payload: Partial<FullCompanyOnboardingPayload>): RecommendedRoleDefinition[] {
    const isInventoryEnabled = !!payload.inventoryConfig?.maintainsInventory;
    const isPayrollEnabled = !!payload.enabledModuleKeys?.includes('hr_payroll');
    const isProjectsEnabled = !!payload.enabledModuleKeys?.includes('project_accounting') || 
                              !!payload.businessTypes?.includes('project_based') ||
                              !!payload.businessTypes?.includes('construction') ||
                              !!payload.businessTypes?.includes('contracting') ||
                              !!payload.businessTypes?.includes('services');
    const isManufacturing = !!payload.enabledModuleKeys?.includes('manufacturing') || 
                            !!payload.businessTypes?.includes('manufacturing');
    const isAssetsEnabled = !!payload.enabledModuleKeys?.includes('fixed_assets');
    const isTaxEnabled = !!payload.accountingDefaults?.enableTaxVat;

    return RoleRecommendationService.getRecommendedRoles({
      businessTypes: payload.businessTypes || ['trading'],
      sellingCategories: payload.sellingCategories,
      buyingCategories: payload.buyingCategories,
      hasInventory: isInventoryEnabled,
      hasPayroll: isPayrollEnabled,
      hasProjects: isProjectsEnabled,
      hasManufacturing: isManufacturing,
      hasAssets: isAssetsEnabled,
      hasTax: isTaxEnabled,
    });
  }
}

export const roleRecommendationService = new RoleRecommendationService();
