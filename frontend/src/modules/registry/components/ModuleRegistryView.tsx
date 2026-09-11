// ============================================================================
// Master ERP Capability & Module Registry Explorer
// ============================================================================

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Lock
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { ERP_MODULE_REGISTRY } from '../registry';
import { Card } from '@/ui/components/Card';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { ErpModuleDefinition } from '../types';

export const ModuleRegistryView: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { tenant, isModuleEnabled } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<ErpModuleDefinition>(ERP_MODULE_REGISTRY[0]);

  const categories = [
    { id: 'all', label: 'All Modules (14)' },
    { id: 'finance', label: 'Finance & Accounting' },
    { id: 'operations', label: 'Operations & Sales' },
    { id: 'supply_chain', label: 'Supply Chain & Inventory' },
    { id: 'human_resources', label: 'Payroll & HR' },
    { id: 'compliance', label: 'Tax & Compliance' },
    { id: 'management', label: 'Management Accounting' },
  ];

  const filteredModules = ERP_MODULE_REGISTRY.filter((m) => {
    if (selectedCategory === 'all') return true;
    return m.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Capability Matrix</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Master ERP Map</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Master ERP Module Registry</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Declarative architecture for all 14 commercial ERP domains, capability tiers, sub-features, and posting rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active Tenant Tier:</span>
          <StatusBadge status={tenant.companyTier} />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none ${
              selectedCategory === cat.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-muted/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 2-Column Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Modules */}
        <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
          {filteredModules.map((mod) => {
            const isSelected = selectedModule.key === mod.key;
            const isEnabled = isModuleEnabled(mod.key);

            return (
              <div
                key={mod.key}
                onClick={() => setSelectedModule(mod)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-600/10 border-brand-500/50 shadow-sm'
                    : 'bg-card border-border hover:bg-muted/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{mod.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">[{mod.code}]</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                  </div>
                  {mod.isPhase1Foundation ? (
                    <Badge variant="success" size="xs">PHASE 1</Badge>
                  ) : (
                    <Badge variant="outline" size="xs">FUTURE</Badge>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/80 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Min Tier: {mod.minTier.toUpperCase()}</span>
                  {isEnabled ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Enabled for {tenant.companyTier.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Disabled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title={selectedModule.name}
            subtitle={`Module Code: ${selectedModule.code} • Category: ${selectedModule.category.toUpperCase()}`}
            action={
              selectedModule.isPhase1Foundation ? (
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => onNavigate(selectedModule.route.replace('/', '') || 'accounting')}
                >
                  Open Foundation View
                </Button>
              ) : (
                <Badge variant="purple" size="sm">Phase 2+ Architectural Target</Badge>
              )
            }
          >
            <div className="space-y-6">
              {/* Description & Metadata */}
              <div className="p-4 rounded-xl bg-card/70 border border-border space-y-3">
                <span className="text-muted-foreground text-xs block">{selectedModule.description}</span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/80 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Min Tier</span>
                    <span className="font-bold text-foreground">{selectedModule.minTier.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">GL Integration</span>
                    <span className="font-bold text-emerald-400">{selectedModule.affectsGeneralLedger ? 'Yes (Auto-Post)' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Sub-Ledger Target</span>
                    <span className="font-mono text-brand-300">{selectedModule.subLedgerName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Current Status</span>
                    <span className="font-bold text-foreground">{selectedModule.isPhase1Foundation ? 'Phase 1 Active' : 'Phase 2 Architecture'}</span>
                  </div>
                </div>
              </div>

              {/* Sub-Features Matrix */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground/90 block mb-2">
                  Sub-Features & Tier Entitlements ({selectedModule.subFeatures.length})
                </span>
                <div className="space-y-2">
                  {selectedModule.subFeatures.map((f) => (
                    <div key={f.key} className="p-3 rounded-lg bg-card/50 border border-border flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{f.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">({f.key})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {f.defaultEnabledTiers.map((t) => (
                          <StatusBadge key={t} status={t} size="xs" />
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedModule.subFeatures.length === 0 && (
                    <p className="text-xs text-muted-foreground">No sub-features defined.</p>
                  )}
                </div>
              </div>

              {/* Granular Permissions Declared */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground/90 block mb-2">
                  Declared Permissions ({selectedModule.permissions.length})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedModule.permissions.map((p) => (
                    <div key={p.code} className="p-2.5 rounded-lg bg-card/50 border border-border text-xs">
                      <div className="font-mono text-brand-400 text-[11px] font-semibold">{p.code}</div>
                      <div className="font-medium text-foreground mt-0.5">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{p.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
