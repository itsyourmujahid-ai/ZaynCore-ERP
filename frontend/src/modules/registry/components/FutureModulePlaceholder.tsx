// ============================================================================
// Future ERP Module Architectural Placeholder
// ============================================================================

import React from 'react';
import { 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Boxes, 
  Truck, 
  Landmark, 
  Users, 
  Briefcase, 
  Receipt, 
  CreditCard, 
  TrendingUp 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { ERP_MODULE_REGISTRY } from '../registry';
import { Card } from '@/ui/components/Card';
import { Badge } from '@/ui/components/Badge';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';

export const FutureModulePlaceholder: React.FC<{ moduleKey: string; onNavigate: (viewId: string) => void }> = ({
  moduleKey,
  onNavigate,
}) => {
  const { tenant, isModuleEnabled } = useAuth();
  const modDef = ERP_MODULE_REGISTRY.find((m) => m.key === moduleKey) || ERP_MODULE_REGISTRY[1];
  const isEnabled = isModuleEnabled(modDef.key);

  const getIcon = (key: string) => {
    switch (key) {
      case 'accounts_receivable': return <TrendingUp className="w-8 h-8 text-brand-400" />;
      case 'accounts_payable': return <CreditCard className="w-8 h-8 text-sky-400" />;
      case 'inventory': return <Boxes className="w-8 h-8 text-amber-400" />;
      case 'procurement': return <Truck className="w-8 h-8 text-indigo-400" />;
      case 'banking_cash': return <Landmark className="w-8 h-8 text-emerald-400" />;
      case 'payroll_hr': return <Users className="w-8 h-8 text-purple-400" />;
      case 'tax_vat': return <Receipt className="w-8 h-8 text-rose-400" />;
      case 'project_accounting': return <Briefcase className="w-8 h-8 text-cyan-400" />;
      default: return <Layers className="w-8 h-8 text-brand-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/30 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-xl bg-muted border border-border shrink-0">
            {getIcon(modDef.key)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Architectural Boundary</span>
              <span className="text-muted-foreground">•</span>
              <Badge variant="purple" size="xs">PHASE 2 TARGET</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-1">{modDef.name}</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">{modDef.description}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Company Entitlement</span>
            <span className="text-xs font-semibold text-foreground/90">
              {isEnabled ? (
                <span className="text-emerald-400">Enabled for {tenant.companyTier.toUpperCase()}</span>
              ) : (
                <span className="text-muted-foreground">Disabled (Requires {modDef.minTier.toUpperCase()})</span>
              )}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<Cpu className="w-3.5 h-3.5" />}
            onClick={() => onNavigate('accounting-engine')}
          >
            Review Posting Spec
          </Button>
        </div>
      </div>

      {/* Architectural Guarantee Notice */}
      <div className="p-4 rounded-xl bg-card/80 border border-border text-xs text-foreground/90 space-y-2">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span>Strict Architectural Foundation Rule: Zero Fake Functionality in Phase 1</span>
        </div>
        <p className="text-muted-foreground">
          In strict compliance with the Master Foundation architecture, functional business forms (e.g. creating live purchase orders, processing complex tax returns, running FIFO inventory valuation batches) are reserved for Phase 2 implementation. The domain structure, database schema, sub-ledger reconciliation boundary, and automatic posting rules are already fully registered and ready.
        </p>
      </div>

      {/* Sub-Features Matrix for this Domain */}
      <Card
        title="Declared Domain Capabilities & Sub-Features"
        subtitle={`Features that will activate for ${tenant.companyTier.toUpperCase()} tier when Phase 2 is deployed`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modDef.subFeatures.map((f) => (
            <div key={f.key} className="p-3.5 rounded-lg bg-card/60 border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{f.name}</span>
                  <StatusBadge status={f.minTier} size="xs" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{f.description}</p>
              </div>
              <div className="mt-2 text-[10px] font-mono text-muted-foreground">Key: {f.key}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Declared RBAC Permissions for this Domain */}
      <Card
        title="Granular RBAC Authorization Matrix"
        subtitle="Permissions already recognized by the central PermissionService"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {modDef.permissions.map((p) => (
            <div key={p.code} className="p-3 rounded-lg bg-card/50 border border-border text-xs">
              <div className="font-mono text-brand-400 text-[11px] font-semibold">{p.code}</div>
              <div className="font-medium text-foreground mt-0.5">{p.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{p.description}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
