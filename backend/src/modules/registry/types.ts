// ============================================================================
// Module Registry Types & Metadata Specifications
// ============================================================================

import { CompanyTier } from '@/core/types/common';

export type ModuleCategory = 
  | 'finance'
  | 'operations'
  | 'supply_chain'
  | 'human_resources'
  | 'compliance'
  | 'management';

export interface ModulePermissionDefinition {
  code: string; // e.g. "accounting.journal.post"
  name: string;
  description: string;
}

export interface ModuleSubFeature {
  key: string; // e.g. "batch_serial_tracking"
  name: string;
  description: string;
  minTier: CompanyTier;
  defaultEnabledTiers: CompanyTier[];
}

export interface ErpModuleDefinition {
  key: string;
  name: string;
  code: string;
  category: ModuleCategory;
  description: string;
  iconName: string;
  minTier: CompanyTier;
  defaultEnabledTiers: CompanyTier[];
  isCore: boolean; // Core modules cannot be disabled
  isPhase1Foundation: boolean; // Implemented in Phase 1 vs Future Phase
  route: string;
  subFeatures: ModuleSubFeature[];
  permissions: ModulePermissionDefinition[];
  dependencies: string[]; // module keys required
  affectsGeneralLedger: boolean;
  subLedgerName?: string;
}
