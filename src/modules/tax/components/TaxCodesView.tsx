// ============================================================================
// Tax Codes & Rates Catalog View
// ============================================================================

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { taxConfigurationService } from '../services/tax-configuration.service';
import { db } from '@/database/storage';

export const TaxCodesView: React.FC = () => {
  const { tenant } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState<string>('');

  const [form, setForm] = useState({
    code: '',
    name: '',
    rate: '0.0500',
    taxType: 'output_vat' as const,
    jurisdictionId: '',
    direction: 'output' as const,
    taxTreatment: 'standard' as const,
    recoverability: 'fully_recoverable' as const,
    recoverablePercentage: '1.0000',
    accountId: '',
    nonRecoverableExpenseAccountId: '',
    isInclusive: false,
    description: '',
  });

  const jurisdictions = db.getTaxJurisdictions(tenant);
  const accounts = db.getAccounts(tenant);
  const taxCodes = taxConfigurationService.getTaxCodes(tenant, selectedJurisdictionId || undefined);

  const handleCreateTaxCode = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxConfigurationService.createTaxCode(
        {
          code: form.code,
          name: form.name,
          rate: form.rate,
          taxType: form.taxType,
          jurisdictionId: form.jurisdictionId || jurisdictions[0]?.id,
          direction: form.direction,
          taxTreatment: form.taxTreatment,
          recoverability: form.recoverability,
          recoverablePercentage: form.recoverablePercentage,
          accountId: form.accountId || accounts[0]?.id,
          nonRecoverableExpenseAccountId: form.nonRecoverableExpenseAccountId || undefined,
          isInclusive: form.isInclusive,
          description: form.description,
        },
        tenant
      );
      setIsModalOpen(false);
      setForm({
        code: '',
        name: '',
        rate: '0.0500',
        taxType: 'output_vat',
        jurisdictionId: '',
        direction: 'output',
        taxTreatment: 'standard',
        recoverability: 'fully_recoverable',
        recoverablePercentage: '1.0000',
        accountId: '',
        nonRecoverableExpenseAccountId: '',
        isInclusive: false,
        description: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Action Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Jurisdiction Filter:</span>
          <select
            value={selectedJurisdictionId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedJurisdictionId(e.target.value)}
            className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-brand-500"
          >
            <option value="">All Jurisdictions ({taxCodes.length})</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.code} — {j.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Tax Code
        </Button>
      </div>

      {/* Tax Codes Table */}
      <Card title="Tax Rates & Codes Catalog" subtitle="Configured operational tax rules with double-entry GL mappings">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-card/60 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Tax Code</th>
                <th className="py-2.5 px-3">Description & Treatment</th>
                <th className="py-2.5 px-3">Rate</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Recoverability</th>
                <th className="py-2.5 px-3">GL Tax Account</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground/90">
              {taxCodes.map((tc) => {
                const acc = accounts.find((a) => a.id === tc.accountId);
                const rateNum = (parseFloat(tc.rate) * 100).toFixed(1);
                const recNum = tc.recoverablePercentage ? (parseFloat(tc.recoverablePercentage) * 100).toFixed(0) : '100';

                return (
                  <tr key={tc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-brand-400">{tc.code}</div>
                      <div className="text-[10px] text-muted-foreground">{tc.isInclusive ? 'Tax Inclusive' : 'Tax Exclusive'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-foreground">{tc.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-mono">{tc.taxTreatment || 'standard'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{rateNum}%</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        tc.direction === 'output' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {tc.direction || tc.taxType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-foreground/90">
                      {tc.recoverability === 'non_recoverable' ? (
                        <span className="text-rose-400">0% (Expensed)</span>
                      ) : (
                        <span className="text-emerald-400">{recNum}% Recoverable</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-foreground/90">
                      {acc ? `${acc.code} - ${acc.name}` : tc.accountId}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={tc.isActive ? 'active' : 'suspended'} size="xs" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE TAX CODE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Tax Code & Rate"
        size="lg"
      >
        <form onSubmit={handleCreateTaxCode} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Code Identifier *</label>
              <input
                value={form.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. VAT-05, VAT-IN-05"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Jurisdiction *</label>
              <select
                value={form.jurisdictionId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, jurisdictionId: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Jurisdiction...</option>
                {jurisdictions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.code} — {j.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Code Name *</label>
            <input
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Standard Value Added Tax 5%"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Rate *</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={form.rate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, rate: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Direction *</label>
              <select
                value={form.direction}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, direction: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="output">Output Tax (Sales)</option>
                <option value="input">Input Tax (Purchases)</option>
                <option value="both">Both Output & Input</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Treatment *</label>
              <select
                value={form.taxTreatment}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, taxTreatment: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="standard">Standard Rated</option>
                <option value="zero_rated">Zero-Rated (0%)</option>
                <option value="exempt">Exempt (0%)</option>
                <option value="out_of_scope">Out of Scope</option>
                <option value="reverse_charge">Reverse Charge</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Recoverability *</label>
              <select
                value={form.recoverability}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const rec = e.target.value as any;
                  setForm({
                    ...form,
                    recoverability: rec,
                    recoverablePercentage: rec === 'non_recoverable' ? '0.0000' : (rec === 'partially_recoverable' ? '0.7000' : '1.0000'),
                  });
                }}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="fully_recoverable">Fully Recoverable (100%)</option>
                <option value="partially_recoverable">Partially Recoverable (Custom %)</option>
                <option value="non_recoverable">Non-Recoverable (0% Expensed)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Recoverable %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.recoverablePercentage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, recoverablePercentage: e.target.value })}
                disabled={form.recoverability === 'fully_recoverable' || form.recoverability === 'non_recoverable'}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground disabled:opacity-50 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">GL Tax Control Account *</label>
              <select
                value={form.accountId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, accountId: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="">Select Account...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name} ({a.classification})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Non-Recoverable Expense Account</label>
              <select
                value={form.nonRecoverableExpenseAccountId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, nonRecoverableExpenseAccountId: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
              >
                <option value="">None / Standard Expense</option>
                {accounts.filter((a) => a.classification === 'expense' || a.accountType === 'expense').map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isInclusive"
              checked={form.isInclusive}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, isInclusive: e.target.checked })}
              className="rounded bg-card border-border text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isInclusive" className="text-xs text-foreground/90 font-medium">
              Tax Inclusive Pricing (Prices entered already include tax)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Tax Code
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
