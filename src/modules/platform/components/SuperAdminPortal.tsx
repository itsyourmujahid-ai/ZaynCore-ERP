import React, { useState } from 'react';
import { 
  Plus, 
  Settings2,
  Clock,
  ArrowRight,
  Trash2,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Power
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { DbCompany, DbOnboardingDraft } from '@/database/types';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { ERP_MODULE_REGISTRY } from '@/modules/registry/registry';
import { EntityStatus } from '@/core/types/common';
import { CompanyOnboardingWizardModal } from './CompanyOnboardingWizardModal';

export const SuperAdminPortal: React.FC = () => {
  const { tenant, switchCompany } = useAuth();
  const [companies, setCompanies] = useState<DbCompany[]>(db.getCompanies());
  const [drafts, setDrafts] = useState<DbOnboardingDraft[]>(db.getOnboardingDrafts());
  const [selectedCompany, setSelectedCompany] = useState<DbCompany | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [activeResumeDraftId, setActiveResumeDraftId] = useState<string | undefined>(undefined);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  
  // Safe Company Removal Modal State
  const [companyToDelete, setCompanyToDelete] = useState<DbCompany | null>(null);
  const [confirmCodeInput, setConfirmCodeInput] = useState('');

  const refreshData = () => {
    setCompanies(db.getCompanies());
    setDrafts(db.getOnboardingDrafts());
  };

  const handleOpenOnboarding = (draftId?: string) => {
    setActiveResumeDraftId(draftId);
    setIsOnboardingModalOpen(true);
  };

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to discard this onboarding draft?')) {
      db.deleteOnboardingDraft(draftId);
      refreshData();
    }
  };

  const handleStatusChange = (companyId: string, newStatus: EntityStatus) => {
    db.updateCompanyStatus(companyId, newStatus, tenant);
    refreshData();
    if (selectedCompany && selectedCompany.id === companyId) {
      setSelectedCompany(db.getCompanyById(companyId) || null);
    }
  };

  const handleModuleToggle = (companyId: string, moduleKey: string, currentStatus: boolean) => {
    db.toggleCompanyModule(companyId, moduleKey, !currentStatus, tenant);
    refreshData();
  };

  const openModuleConfig = (company: DbCompany) => {
    setSelectedCompany(company);
    setIsModuleModalOpen(true);
  };

  const handleConfirmDeleteCompany = () => {
    if (!companyToDelete) return;
    if (confirmCodeInput.trim().toUpperCase() !== companyToDelete.code.toUpperCase()) {
      alert(`Confirmation mismatch. Please enter the exact company code '${companyToDelete.code}' to confirm.`);
      return;
    }
    db.deleteCompany(companyToDelete.id, tenant);
    setCompanyToDelete(null);
    setConfirmCodeInput('');
    refreshData();
  };

  const activeCompaniesCount = companies.filter((c) => c.status === 'active').length;
  const inactiveCompaniesCount = companies.filter((c) => c.status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Platform Super Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">VVIP Platform Super Admin</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              CROSS-TENANT CONTROL
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Tenant & Platform Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Provision customer companies via the full 12-step configuration wizard, manage capability tiers, and control enterprise module entitlements.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => handleOpenOnboarding()}
        >
          Onboard New Company
        </Button>
      </div>

      {/* Top Platform KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Organizations</span>
            <span className="text-2xl font-bold text-slate-100 mt-1 block font-mono">{companies.length}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{companies.length === 0 ? 'Clean Fresh Baseline' : 'Configured Tenants'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Active Tenants</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block font-mono">{activeCompaniesCount}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Operational Status</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Inactive / Suspended</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block font-mono">{inactiveCompaniesCount}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Deactivated Access</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Power className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">System Health</span>
            <span className="text-sm font-bold text-purple-300 mt-1 block">100% Operational</span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Strict Tenant Isolation Active</span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Drafts Section if any */}
      {drafts.length > 0 && (
        <Card
          title="In-Progress Onboarding Drafts"
          subtitle="Saved onboarding sessions waiting for completion and tenant activation"
          className="border-amber-500/30 bg-amber-950/10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-semibold text-sm text-slate-100 truncate">
                        {draft.draftName || draft.payload?.name || 'Untitled Company'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      Step {draft.currentStep} of 12
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                    <span>Type: <strong className="text-slate-200 capitalize">{draft.payload?.businessTypes?.join(', ') || 'Unassigned'}</strong></span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Saved: {new Date(draft.updatedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={(e) => handleDeleteDraft(e, draft.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    title="Discard Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenOnboarding(draft.id)}
                  >
                    Resume Wizard
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Companies List Card / Fresh Baseline State */}
      <Card
        title="Customer Tenants & Organizations"
        subtitle={companies.length === 0 ? "No organizations registered yet. ERP is in pristine fresh baseline state." : `Managing ${companies.length} active customer organizations on the shared ERP platform`}
        noPadding
      >
        {companies.length === 0 ? (
          <div className="p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Zero Customer Companies (Fresh State)</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                All business records, test data, and sample companies have been reset. Launch the onboarding wizard to provision your first live customer company.
              </p>
            </div>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenOnboarding()}
              className="mx-auto"
            >
              Start Company Onboarding Wizard
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Company Code & Name</th>
                  <th className="px-5 py-3.5">Operating Tier</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Base Currency</th>
                  <th className="px-5 py-3.5">Branches</th>
                  <th className="px-5 py-3.5">Modules Config</th>
                  <th className="px-5 py-3.5 text-right">Actions & Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {companies.map((comp) => {
                  const branches = db.getBranches({ companyId: comp.id } as any);
                  const modules = db.getCompanyModules(comp.id, { companyId: comp.id, isPlatformAdmin: true } as any);
                  const enabledCount = modules.filter((m) => m.isEnabled).length;

                  return (
                    <tr key={comp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">
                            {comp.code.slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-100 flex items-center gap-2 truncate" title={comp.name}>
                              <span className="truncate">{comp.name}</span>
                              <span className="font-mono text-[10px] text-slate-500 shrink-0">[{comp.code}]</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate" title={`${comp.legalName} • ${comp.industry}`}>
                              {comp.legalName} • {comp.industry}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={comp.tier} />
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            comp.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {comp.status ? comp.status.toUpperCase() : 'ACTIVE'}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono font-medium text-slate-300">
                        {comp.baseCurrency}
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium">
                          {branches.length} Branch(es)
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => openModuleConfig(comp)}
                          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>{enabledCount} / {ERP_MODULE_REGISTRY.length} Modules</span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right space-x-2">
                        {/* Status Toggle */}
                        <button
                          onClick={() => handleStatusChange(comp.id, comp.status === 'active' ? 'inactive' : 'active')}
                          title={comp.status === 'active' ? 'Deactivate Company' : 'Activate Company'}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            comp.status === 'active'
                              ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Switch to inspect company workspace */}
                        <button
                          onClick={() => switchCompany(comp.id)}
                          title="Switch to Company Workspace"
                          className="p-1.5 rounded-lg text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Safe Delete Company */}
                        <button
                          onClick={() => {
                            setCompanyToDelete(comp);
                            setConfirmCodeInput('');
                          }}
                          title="Purge / Remove Company"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Safe Company Deletion Confirmation Modal */}
      {companyToDelete && (
        <Modal
          isOpen={!!companyToDelete}
          onClose={() => setCompanyToDelete(null)}
          title={`Confirm Removal: ${companyToDelete.name}`}
          subtitle="Permanent deletion of customer tenant and all associated data"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setCompanyToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmDeleteCompany}
                disabled={confirmCodeInput.trim().toUpperCase() !== companyToDelete.code.toUpperCase()}
              >
                Permanently Purge Company
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 flex items-start gap-2.5 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong className="block font-bold">Caution: Destructive Action</strong>
                <p className="mt-0.5 text-[11px] text-rose-200/80">
                  This will permanently delete <strong>{companyToDelete.name}</strong>, including all branches, accounts, transactions, invoices, inventory, employees, and user memberships.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                Type the company short code <strong className="font-mono text-rose-400 font-bold">[{companyToDelete.code}]</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmCodeInput}
                onChange={(e) => setConfirmCodeInput(e.target.value)}
                placeholder={`Type ${companyToDelete.code}`}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Company Onboarding Wizard Modal */}
      <CompanyOnboardingWizardModal
        isOpen={isOnboardingModalOpen}
        tenant={tenant}
        onClose={() => {
          setIsOnboardingModalOpen(false);
          setActiveResumeDraftId(undefined);
          refreshData();
        }}
        onSuccess={() => {
          setIsOnboardingModalOpen(false);
          setActiveResumeDraftId(undefined);
          refreshData();
        }}
        resumeDraftId={activeResumeDraftId}
      />

      {/* Module Configuration Modal */}
      {selectedCompany && (
        <Modal
          isOpen={isModuleModalOpen}
          onClose={() => setIsModuleModalOpen(false)}
          title={`Module Capabilities: ${selectedCompany.name}`}
          subtitle={`Fine-tune individual ERP module access for ${selectedCompany.name} (${selectedCompany.tier.toUpperCase()})`}
          size="xl"
          footer={
            <Button variant="primary" size="sm" onClick={() => setIsModuleModalOpen(false)}>
              Done
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Company Tier Template: <strong className="text-slate-100">{selectedCompany.tier.toUpperCase()}</strong></span>
              <span className="text-slate-400">Base Currency: <strong className="font-mono text-slate-100">{selectedCompany.baseCurrency}</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {ERP_MODULE_REGISTRY.map((mod) => {
                const companyMods = db.getCompanyModules(selectedCompany.id, { companyId: selectedCompany.id, isPlatformAdmin: true } as any);
                const cm = companyMods.find((x) => x.moduleKey === mod.key);
                const isEnabled = cm ? cm.isEnabled : mod.defaultEnabledTiers.includes(selectedCompany.tier);

                return (
                  <div
                    key={mod.key}
                    className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                      isEnabled ? 'bg-slate-900 border-slate-700' : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{mod.name}</span>
                        {mod.isCore && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">CORE</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{mod.description}</p>
                      <div className="text-[10px] text-slate-500 mt-1">Min Tier: {mod.minTier.toUpperCase()}</div>
                    </div>

                    {!mod.isCore && (
                      <button
                        onClick={() => handleModuleToggle(selectedCompany.id, mod.key, isEnabled)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 ${
                          isEnabled
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
