// ============================================================================
// Tax Configuration View (Jurisdictions, Registrations & Tax Types)
// ============================================================================

import React, { useState } from 'react';
import { 
  Globe2, 
  Layers, 
  Plus, 
  CheckCircle2, 
  FileText
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { taxConfigurationService } from '../services/tax-configuration.service';

export const TaxConfigurationView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'jurisdictions' | 'registrations' | 'types'>('jurisdictions');

  // Modal States
  const [isJurisdictionModalOpen, setIsJurisdictionModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  // Form States
  const [jurForm, setJurForm] = useState({
    code: '',
    name: '',
    countryCode: 'US',
    taxAuthorityName: '',
    defaultRegistrationNumber: '',
    currency: tenant.baseCurrency,
  });

  const [regForm, setRegForm] = useState({
    jurisdictionId: '',
    registrationNumber: '',
    registrationType: 'standard_vat',
    notes: '',
  });

  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    category: 'vat' as const,
    description: '',
    isRecoverableByDefault: true,
  });

  const jurisdictions = taxConfigurationService.getJurisdictions(tenant);
  const registrations = taxConfigurationService.getRegistrations(tenant);
  const taxTypes = taxConfigurationService.getTaxTypes(tenant);

  const handleCreateJurisdiction = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxConfigurationService.createJurisdiction(jurForm, tenant);
      setIsJurisdictionModalOpen(false);
      setJurForm({
        code: '',
        name: '',
        countryCode: 'US',
        taxAuthorityName: '',
        defaultRegistrationNumber: '',
        currency: tenant.baseCurrency,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxConfigurationService.createRegistration(regForm, tenant);
      setIsRegistrationModalOpen(false);
      setRegForm({
        jurisdictionId: '',
        registrationNumber: '',
        registrationType: 'standard_vat',
        notes: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxConfigurationService.createTaxType(typeForm, tenant);
      setIsTypeModalOpen(false);
      setTypeForm({
        code: '',
        name: '',
        category: 'vat',
        description: '',
        isRecoverableByDefault: true,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('jurisdictions')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'jurisdictions'
                ? 'bg-brand-600 text-white font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Tax Jurisdictions ({jurisdictions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('registrations')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'registrations'
                ? 'bg-brand-600 text-white font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Company Registrations ({registrations.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('types')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === 'types'
                ? 'bg-brand-600 text-white font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tax Classifications ({taxTypes.length})</span>
          </button>
        </div>

        <div>
          {activeSubTab === 'jurisdictions' && (
            <Button
              variant="primary"
              size="xs"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsJurisdictionModalOpen(true)}
            >
              Add Jurisdiction
            </Button>
          )}
          {activeSubTab === 'registrations' && (
            <Button
              variant="primary"
              size="xs"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsRegistrationModalOpen(true)}
            >
              Add Registration
            </Button>
          )}
          {activeSubTab === 'types' && (
            <Button
              variant="primary"
              size="xs"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsTypeModalOpen(true)}
            >
              Add Tax Type
            </Button>
          )}
        </div>
      </div>

      {/* JURISDICTIONS TABLE */}
      {activeSubTab === 'jurisdictions' && (
        <Card title="Configured Tax Jurisdictions" subtitle="Regional tax authorities and sovereign rules">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Jurisdiction Name</th>
                  <th className="py-2.5 px-3">Tax Authority</th>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3">Currency</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {jurisdictions.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{j.code}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{j.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{j.taxAuthorityName}</td>
                    <td className="py-2.5 px-3 font-mono text-foreground/90">{j.countryCode}</td>
                    <td className="py-2.5 px-3 font-mono text-foreground/90">{j.currency}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={j.status} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REGISTRATIONS TABLE */}
      {activeSubTab === 'registrations' && (
        <Card title="Company Tax Registrations" subtitle="Official tax ID and registration certificates">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Registration Number</th>
                  <th className="py-2.5 px-3">Jurisdiction</th>
                  <th className="py-2.5 px-3">Registration Type</th>
                  <th className="py-2.5 px-3">Effective Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {registrations.map((r) => {
                  const jur = jurisdictions.find((j) => j.id === r.jurisdictionId);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{r.registrationNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{jur?.name || r.jurisdictionId}</td>
                      <td className="py-2.5 px-3 text-muted-foreground uppercase font-mono text-[11px]">{r.registrationType}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{r.effectiveDate}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={r.isActive ? 'active' : 'suspended'} size="xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAX TYPES TABLE */}
      {activeSubTab === 'types' && (
        <Card title="Tax Classifications" subtitle="Core indirect and statutory tax regimes">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Recoverable by Default</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {taxTypes.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{t.code}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{t.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground uppercase font-mono text-[11px]">{t.category}</td>
                    <td className="py-2.5 px-3">
                      {t.isRecoverableByDefault ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Yes (100%)
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-[11px]">No / Expensed</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={t.isActive ? 'active' : 'suspended'} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: ADD JURISDICTION */}
      <Modal
        isOpen={isJurisdictionModalOpen}
        onClose={() => setIsJurisdictionModalOpen(false)}
        title="Configure New Tax Jurisdiction"
        size="md"
      >
        <form onSubmit={handleCreateJurisdiction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Jurisdiction Code *</label>
              <input
                value={jurForm.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJurForm({ ...jurForm, code: e.target.value })}
                placeholder="e.g. US-FED, OM-TAX"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Country Code (ISO) *</label>
              <input
                value={jurForm.countryCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJurForm({ ...jurForm, countryCode: e.target.value })}
                placeholder="US, OM, GB"
                maxLength={2}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Jurisdiction Name *</label>
            <input
              value={jurForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJurForm({ ...jurForm, name: e.target.value })}
              placeholder="e.g. United States Internal Revenue Service"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Authority Name *</label>
              <input
                value={jurForm.taxAuthorityName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJurForm({ ...jurForm, taxAuthorityName: e.target.value })}
                placeholder="e.g. Internal Revenue Service"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Currency *</label>
              <input
                value={jurForm.currency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJurForm({ ...jurForm, currency: e.target.value })}
                placeholder="USD, OMR, GBP"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Default Tax Number (Optional)</label>
            <input
              value={jurForm.defaultRegistrationNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJurForm({ ...jurForm, defaultRegistrationNumber: e.target.value })}
              placeholder="e.g. EIN-12-3456789"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsJurisdictionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Jurisdiction
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD REGISTRATION */}
      <Modal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        title="Register Company Tax Identifier"
        size="md"
      >
        <form onSubmit={handleCreateRegistration} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Jurisdiction *</label>
            <select
              value={regForm.jurisdictionId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRegForm({ ...regForm, jurisdictionId: e.target.value })}
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
              required
            >
              <option value="">Select Jurisdiction...</option>
              {jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code} — {j.name} ({j.countryCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Registration Number *</label>
              <input
                value={regForm.registrationNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegForm({ ...regForm, registrationNumber: e.target.value })}
                placeholder="e.g. OM1100223344"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Registration Type *</label>
              <select
                value={regForm.registrationType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRegForm({ ...regForm, registrationType: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="standard_vat">Standard VAT</option>
                <option value="corporate_tax">Corporate Income Tax</option>
                <option value="sales_tax">Sales & Use Tax</option>
                <option value="withholding">Withholding Tax</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Notes / Certificate Reference</label>
            <input
              value={regForm.notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegForm({ ...regForm, notes: e.target.value })}
              placeholder="e.g. Valid through Dec 2028"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsRegistrationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Register Number
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADD TAX TYPE */}
      <Modal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title="Create Tax Classification"
        size="md"
      >
        <form onSubmit={handleCreateType} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Type Code *</label>
              <input
                value={typeForm.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeForm({ ...typeForm, code: e.target.value })}
                placeholder="e.g. VAT, WHT"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Category *</label>
              <select
                value={typeForm.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeForm({ ...typeForm, category: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="vat">Value Added Tax (VAT)</option>
                <option value="sales_tax">Sales & Use Tax</option>
                <option value="purchase_tax">Purchase Tax</option>
                <option value="withholding_tax">Withholding Tax</option>
                <option value="customs_duty">Customs Duty</option>
                <option value="other">Other Statutory Tax</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Type Name *</label>
            <input
              value={typeForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="e.g. Standard Value Added Tax"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Description</label>
            <input
              value={typeForm.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypeForm({ ...typeForm, description: e.target.value })}
              placeholder="e.g. Multi-stage indirect consumption tax"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsTypeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Tax Type
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
