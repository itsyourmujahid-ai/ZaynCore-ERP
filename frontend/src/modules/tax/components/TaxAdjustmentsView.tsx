// ============================================================================
// Tax Adjustments Workbench View
// ============================================================================

import React, { useState } from 'react';
import { Plus, CheckCircle2, FileCheck2 } from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { taxAdjustmentService } from '../services/tax-adjustment.service';
import { db } from '@/database/storage';

export const TaxAdjustmentsView: React.FC = () => {
  const { tenant } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    jurisdictionId: '',
    taxPeriodId: '',
    adjustmentDate: new Date().toISOString().split('T')[0],
    adjustmentType: 'prior_period' as const,
    direction: 'increase_liability' as const,
    amount: '',
    reason: '',
  });

  const jurisdictions = db.getTaxJurisdictions(tenant);
  const adjustments = taxAdjustmentService.getAdjustments(tenant);

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxAdjustmentService.createAdjustment(
        {
          ...form,
          jurisdictionId: form.jurisdictionId || jurisdictions[0]?.id,
          taxPeriodId: form.taxPeriodId || undefined,
          amount: parseFloat(form.amount),
        },
        tenant
      );
      setIsModalOpen(false);
      setForm({
        jurisdictionId: '',
        taxPeriodId: '',
        adjustmentDate: new Date().toISOString().split('T')[0],
        adjustmentType: 'prior_period',
        direction: 'increase_liability',
        amount: '',
        reason: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApprove = (id: string) => {
    try {
      taxAdjustmentService.approveAdjustment(id, tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePost = (id: string) => {
    try {
      taxAdjustmentService.postAdjustment(id, tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tax Adjustments & Prior Period Corrections</h2>
          <p className="text-xs text-muted-foreground">
            Record authorized adjustments, bad debt tax relief, and rounding corrections with immutable double-entry audit journals.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Adjustment
        </Button>
      </div>

      {/* Adjustments Table */}
      <Card title="Tax Adjustments Register" subtitle="Authorized adjustments modifying output or recoverable input tax">
        {adjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Adjustment #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{adj.adjustmentNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{adj.adjustmentDate}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] uppercase text-foreground/90">
                      {adj.adjustmentType.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        adj.direction.includes('increase') ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {adj.direction.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-foreground/90 max-w-xs truncate">{adj.reason}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      ${parseFloat(adj.amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={adj.status} size="xs" />
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      {adj.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="xs"
                          icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          onClick={() => handleApprove(adj.id)}
                        >
                          Approve
                        </Button>
                      )}
                      {adj.status === 'approved' && (
                        <Button
                          variant="primary"
                          size="xs"
                          icon={<FileCheck2 className="w-3 h-3" />}
                          onClick={() => handlePost(adj.id)}
                        >
                          Post to GL
                        </Button>
                      )}
                      {adj.status === 'posted' && (
                        <span className="text-[10px] font-mono text-brand-400">{adj.journalEntryId}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground text-xs">
            No tax adjustments recorded.
          </div>
        )}
      </Card>

      {/* CREATE ADJUSTMENT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Controlled Tax Adjustment"
        size="md"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Jurisdiction *</label>
            <select
              value={form.jurisdictionId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, jurisdictionId: e.target.value })}
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
              required
            >
              <option value="">Select Jurisdiction...</option>
              {jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code} — {j.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Adjustment Type *</label>
              <select
                value={form.adjustmentType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, adjustmentType: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="prior_period">Prior Period Correction</option>
                <option value="rounding_correction">Rounding Difference</option>
                <option value="bad_debt_relief">Bad Debt Tax Relief</option>
                <option value="audit_settlement">Tax Audit Assessment</option>
                <option value="other">Other Authorized Adjustment</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Direction *</label>
              <select
                value={form.direction}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, direction: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="increase_liability">Increase Tax Liability (Dr Exp, Cr Output Tax)</option>
                <option value="decrease_liability">Decrease Tax Liability (Dr Output Tax, Cr Inc)</option>
                <option value="increase_recoverable">Increase Recoverable Input (Dr Input Tax, Cr Inc)</option>
                <option value="decrease_recoverable">Decrease Recoverable Input (Dr Exp, Cr Input Tax)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Adjustment Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Adjustment Date *</label>
              <input
                type="date"
                value={form.adjustmentDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, adjustmentDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Reason / Legal Authorization *</label>
            <input
              value={form.reason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Disallowed entertainment input tax correction"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Draft Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
