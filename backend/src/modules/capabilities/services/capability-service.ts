// ============================================================================
// Centralized Capability & Feature Flag Engine
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { ERP_MODULE_REGISTRY } from '@/modules/registry/registry';
import { ErpModuleDefinition } from '@/modules/registry/types';

export class CapabilityService {
  /**
   * Checks if a module is currently enabled for the given company context.
   */
  public isModuleEnabled(ctx: TenantContext, moduleKey: string): boolean {
    const profile = db.getCompanyProfile(ctx.companyId, ctx);
    if (moduleKey === 'inventory' && profile && profile.inventoryConfig && !profile.inventoryConfig.maintainsInventory) {
      return false;
    }

    const modules = db.getCompanyModules(ctx.companyId, ctx);
    const mod = modules.find((m) => m.moduleKey === moduleKey);
    if (!mod) {
      // Fallback to module registry default for tier
      const reg = ERP_MODULE_REGISTRY.find((r) => r.key === moduleKey);
      if (!reg) return false;
      return reg.defaultEnabledTiers.includes(ctx.companyTier);
    }
    return mod.isEnabled;
  }

  /**
   * Returns all active enabled modules for the current company
   */
  public getEnabledModules(ctx: TenantContext): ErpModuleDefinition[] {
    const companyModules = db.getCompanyModules(ctx.companyId, ctx);
    const enabledKeys = new Set(
      companyModules.filter((m) => m.isEnabled).map((m) => m.moduleKey)
    );

    return ERP_MODULE_REGISTRY.filter((mod) => {
      if (mod.isCore) return true;
      if (companyModules.length === 0) {
        return mod.defaultEnabledTiers.includes(ctx.companyTier);
      }
      return enabledKeys.has(mod.key);
    });
  }

  /**
   * Checks if a specific sub-feature within a module is available for the company tier
   */
  public isFeatureEnabled(ctx: TenantContext, moduleKey: string, featureKey: string): boolean {
    if (!this.isModuleEnabled(ctx, moduleKey)) return false;
    const modDef = ERP_MODULE_REGISTRY.find((m) => m.key === moduleKey);
    if (!modDef) return false;

    const subFeature = modDef.subFeatures.find((f) => f.key === featureKey);
    if (!subFeature) return false;

    return subFeature.defaultEnabledTiers.includes(ctx.companyTier);
  }
}

export const capabilityService = new CapabilityService();
