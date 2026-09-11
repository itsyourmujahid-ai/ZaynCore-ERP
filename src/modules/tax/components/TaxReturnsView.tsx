// ============================================================================
// Tax Returns & Filing Workbench View (Real Ledger Compilation & Box Breakdown)
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Send,
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { taxReturnService } from '../services/tax-return.service';
import { DbTaxReturn } from '@/database/types';
import { db } from '@/database/storage';

export const TaxReturnsView: React.FC = () => {
  const { tenant } = useAuth();
  const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);
  const [isCreatePeriodModalOpen, setIsCreatePeriodModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<DbTaxReturn | null>(null);

  const [periodForm, setPeriodForm] = useState({
    jurisdictionId: '',
    periodCode: '',
    periodName: '',
    frequency: 'quarterly' as const,
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    filingDeadline: '2026-04-30',
  });

  const [returnForm, setReturnForm] = useState({
    jurisdictionId: '',
    taxPeriodId: '',
    priorPeriodAdjustments: '0.0000',
    otherAdjustments: '0.0000',
    notes: '',
  });

  const jurisdictions = db.getTaxJurisdictions(tenant);
  const periods = taxReturnService.getPeriods(tenant);
  const returns = taxReturnService.getReturns(tenant);

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      taxReturnService.createPeriod(
        {
          ...periodForm,
          jurisdictionId: periodForm.jurisdictionId || jurisdictions[0]?.id,
        },
        tenant
      );
      setIsCreatePeriodModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrepareReturn = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = taxReturnService.prepareTaxReturn(
        {
          jurisdictionId: returnForm.jurisdictionId || jurisdictions[0]?.id,
          taxPeriodId: returnForm.taxPeriodId || periods[0]?.id,
          priorPeriodAdjustments: returnForm.priorPeriodAdjustments,
          otherAdjustments: returnForm.otherAdjustments,
          notes: returnForm.notes,
        },
        tenant
      );
      setIsPrepareModalOpen(false);
      setSelectedReturn(created);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewReturn = (id: string) => {
    try {
      const updated = taxReturnService.reviewTaxReturn(id, tenant);
      if (selectedReturn?.id === id) setSelectedReturn(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveReturn = (id: string) => {
    try {
      const updated = taxReturnService.approveTaxReturn(id, tenant);
      if (selectedReturn?.id === id) setSelectedReturn(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileReturn = (id: string) => {
    try {
      const res = taxReturnService.fileTaxReturn(id, tenant);
      setSelectedReturn(res.taxReturn);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tax Returns & Filings</h2>
          <p className="text-xs text-muted-foreground">
            Compile actual sub-ledger tax transactions into official tax return boxes and post GL settlement journals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Calendar className="w-3.5 h-3.5" />}
            onClick={() => setIsCreatePeriodModalOpen(true)}
          >
            Create Tax Period
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsPrepareModalOpen(true)}
          >
            Prepare Tax Return
          </Button>
        </div>
      </div>

      {/* TAX RETURNS LIST */}
      <Card title="Tax Return Schedules & Filings" subtitle="Live returns compiled from Tax Sub-Ledger transactions">
        {returns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Return Number</th>
                  <th className="py-2.5 px-3">Filing Date</th>
                  <th className="py-2.5 px-3">Output Tax</th>
                  <th className="py-2.5 px-3">Recoverable Input</th>
                  <th className="py-2.5 px-3 text-right">Net Tax Due / (Refund)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {returns.map((r) => {
                  const netVal = parseFloat(r.netTaxPayableOrRefundable);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{r.returnNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{r.filingDate}</td>
                      <td className="py-2.5 px-3 font-mono text-sky-400 font-medium">
                        ${parseFloat(r.totalOutputTax).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-medium">
                        ${parseFloat(r.totalRecoverableInputTax).toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                        netVal > 0 ? 'text-amber-400' : (netVal < 0 ? 'text-emerald-400' : 'text-muted-foreground')
                      }`}>
                        {netVal < 0 ? `($${Math.abs(netVal).toFixed(2)})` : `$${netVal.toFixed(2)}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={r.status} size="xs" />
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={r.paymentStatus} size="xs" />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => setSelectedReturn(r)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground text-xs">
            No tax returns prepared yet. Click "Prepare Tax Return" to compile your first return.
          </div>
        )}
      </Card>

      {/* DETAIL MODAL: BOX BREAKDOWN & GL FILING */}
      {selectedReturn && (
        <Modal
          isOpen={!!selectedReturn}
          onClose={() => setSelectedReturn(null)}
          title={`Tax Return: ${selectedReturn.returnNumber}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Status & Filing Header */}
            <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-mono block">Return Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={selectedReturn.status} />
                  <StatusBadge status={selectedReturn.paymentStatus} />
                </div>
              </div>

              {selectedReturn.settlementJournalId && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">Settlement Journal</span>
                  <span className="font-mono text-xs text-brand-400 font-bold">{selectedReturn.settlementJournalId}</span>
                </div>
              )}
            </div>

            {/* BOX SECTION 1: OUTPUT TAX (SALES) */}
            <div className="p-3.5 rounded-lg bg-card border border-border space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Box 1: Output Tax on Sales & Supplies
                </span>
                <span className="text-xs font-bold text-foreground font-mono">
                  ${parseFloat(selectedReturn.totalOutputTax).toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Standard Rated Sales Base:</span>
                  <span className="font-mono text-foreground">${parseFloat(selectedReturn.standardRatedSalesTaxable).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Standard Output Tax:</span>
                  <span className="font-mono text-sky-400 font-bold">${parseFloat(selectedReturn.standardRatedSalesTax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Zero-Rated / Export Sales:</span>
                  <span className="font-mono text-foreground">
                    ${(parseFloat(selectedReturn.zeroRatedSales) + parseFloat(selectedReturn.exportSales)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Exempt Supplies:</span>
                  <span className="font-mono text-foreground">${parseFloat(selectedReturn.exemptSales).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* BOX SECTION 2: INPUT TAX (PURCHASES) */}
            <div className="p-3.5 rounded-lg bg-card border border-border space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Box 2: Recoverable Input Tax on Purchases
                </span>
                <span className="text-xs font-bold text-foreground font-mono">
                  ${parseFloat(selectedReturn.totalRecoverableInputTax).toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Standard Purchases Base:</span>
                  <span className="font-mono text-foreground">${parseFloat(selectedReturn.standardRatedPurchasesTaxable).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Recoverable Input Tax:</span>
                  <span className="font-mono text-emerald-400 font-bold">${parseFloat(selectedReturn.totalRecoverableInputTax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Non-Recoverable Input Tax:</span>
                  <span className="font-mono text-rose-400">${parseFloat(selectedReturn.totalNonRecoverableInputTax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Capital Goods Input Tax:</span>
                  <span className="font-mono text-foreground">${parseFloat(selectedReturn.capitalGoodsInputTax).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* BOX SECTION 3: NET TAX DUE / REFUND */}
            <div className="p-3.5 rounded-lg bg-brand-950/40 border border-brand-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-brand-300 block">
                  Net Tax Balance Due / (Refundable)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Output Tax ($ {parseFloat(selectedReturn.totalOutputTax).toFixed(2)}) − Recoverable Input ($ {parseFloat(selectedReturn.totalRecoverableInputTax).toFixed(2)})
                </span>
              </div>
              <div className="text-right font-mono text-lg font-bold text-brand-400">
                ${parseFloat(selectedReturn.netTaxPayableOrRefundable).toFixed(2)} {tenant.baseCurrency}
              </div>
            </div>

            {/* WORKFLOW ACTION BUTTONS */}
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setSelectedReturn(null)}>
                Close
              </Button>

              {selectedReturn.status === 'prepared' && (
                <Button variant="outline" size="sm" onClick={() => handleReviewReturn(selectedReturn.id)}>
                  Mark as Reviewed
                </Button>
              )}

              {selectedReturn.status === 'reviewed' && (
                <Button variant="outline" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />} onClick={() => handleApproveReturn(selectedReturn.id)}>
                  Approve Return
                </Button>
              )}

              {selectedReturn.status === 'approved' && (
                <Button variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => handleFileReturn(selectedReturn.id)}>
                  File Return & Post to GL
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: PREPARE TAX RETURN */}
      <Modal
        isOpen={isPrepareModalOpen}
        onClose={() => setIsPrepareModalOpen(false)}
        title="Prepare Tax Return from Ledger"
        size="md"
      >
        <form onSubmit={handlePrepareReturn} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Jurisdiction *</label>
            <select
              value={returnForm.jurisdictionId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReturnForm({ ...returnForm, jurisdictionId: e.target.value })}
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

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Tax Period *</label>
            <select
              value={returnForm.taxPeriodId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReturnForm({ ...returnForm, taxPeriodId: e.target.value })}
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
              required
            >
              <option value="">Select Period...</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.periodCode} ({p.startDate} to {p.endDate}) — {p.status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Prior Period Adjustments</label>
              <input
                type="number"
                step="0.01"
                value={returnForm.priorPeriodAdjustments}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnForm({ ...returnForm, priorPeriodAdjustments: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Other Adjustments</label>
              <input
                type="number"
                step="0.01"
                value={returnForm.otherAdjustments}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnForm({ ...returnForm, otherAdjustments: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Notes</label>
            <input
              value={returnForm.notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnForm({ ...returnForm, notes: e.target.value })}
              placeholder="e.g. Q1 2026 VAT Filing"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsPrepareModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Compile & Prepare
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE TAX PERIOD */}
      <Modal
        isOpen={isCreatePeriodModalOpen}
        onClose={() => setIsCreatePeriodModalOpen(false)}
        title="Create Tax Filing Period"
        size="md"
      >
        <form onSubmit={handleCreatePeriod} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Jurisdiction *</label>
            <select
              value={periodForm.jurisdictionId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPeriodForm({ ...periodForm, jurisdictionId: e.target.value })}
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
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Period Code *</label>
              <input
                value={periodForm.periodCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodForm({ ...periodForm, periodCode: e.target.value })}
                placeholder="e.g. TAX-2026-Q1"
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Frequency *</label>
              <select
                value={periodForm.frequency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPeriodForm({ ...periodForm, frequency: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground/90 mb-1 block">Period Name *</label>
            <input
              value={periodForm.periodName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodForm({ ...periodForm, periodName: e.target.value })}
              placeholder="e.g. Q1 2026 VAT Period"
              className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Start Date *</label>
              <input
                type="date"
                value={periodForm.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">End Date *</label>
              <input
                type="date"
                value={periodForm.endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/90 mb-1 block">Deadline *</label>
              <input
                type="date"
                value={periodForm.filingDeadline}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodForm({ ...periodForm, filingDeadline: e.target.value })}
                className="w-full px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreatePeriodModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Tax Period
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
