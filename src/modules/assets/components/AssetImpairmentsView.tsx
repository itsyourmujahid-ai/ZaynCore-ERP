// ============================================================================
// Fixed Asset Impairments Workbench
// ============================================================================

import React, { useState } from 'react';
import { 
  TrendingDown, 
  AlertTriangle, 
  Plus 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { assetService } from '../services/asset.service';

export const AssetImpairmentsView: React.FC = () => {
  const { tenant } = useAuth();
  const [isImpairModalOpen, setIsImpairModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [impairmentAmount, setImpairmentAmount] = useState('');
  const [impairmentDate, setImpairmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Obsolescence due to technology advancement');
  const [feedback, setFeedback] = useState<string | null>(null);

  const assets = db.getFixedAssets(tenant).filter(
    (a) => (a.status === 'in_service' || a.status === 'impaired') && parseFloat(a.netBookValue) > 0
  );
  const impairments = db.getAssetImpairments(undefined, tenant);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const currentNBV = selectedAsset ? parseFloat(selectedAsset.netBookValue) : 0;
  const impAmtVal = parseFloat(impairmentAmount || '0');
  const postNBV = Math.max(0, currentNBV - impAmtVal);

  const handleExecuteImpairment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || impAmtVal <= 0) return;

    try {
      const imp = assetService.impairAsset(selectedAssetId, {
        impairmentDate,
        impairmentAmount: impAmtVal.toFixed(4),
        reason,
      }, tenant);

      setFeedback(`Impairment '${imp.impairmentNumber}' recorded successfully. GL Journal posted to #6085 Loss on Impairment.`);
      setIsImpairModalOpen(false);
      setSelectedAssetId('');
      setImpairmentAmount('');
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-amber-400" />
            Asset Impairments & Carrying Value Adjustments
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record permanent downward adjustments to asset carrying value due to damage, technological obsolescence, or market decline.
          </p>
        </div>

        <Button
          onClick={() => {
            if (assets.length > 0) setSelectedAssetId(assets[0].id);
            setIsImpairModalOpen(true);
          }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
        >
          <Plus className="w-4 h-4" />
          Assess Asset Impairment
        </Button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg text-xs font-medium ${
          feedback.startsWith('Error')
            ? 'bg-rose-950/40 border border-rose-500/20 text-rose-300'
            : 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-300'
        }`}>
          {feedback}
        </div>
      )}

      {/* Impairment Register */}
      <Card className="overflow-hidden border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="p-4">Impairment #</th>
              <th className="p-4">Date</th>
              <th className="p-4">Asset</th>
              <th className="p-4 text-right">Pre-NBV</th>
              <th className="p-4 text-right">Impairment Loss</th>
              <th className="p-4 text-right">Post-NBV</th>
              <th className="p-4">Reason & Justification</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs text-foreground/90 font-mono">
            {impairments.map((imp) => {
              const asset = db.getFixedAssetById(imp.assetId, tenant);
              return (
                <tr key={imp.id} className="hover:bg-muted/40">
                  <td className="p-4 font-medium text-blue-400">{imp.impairmentNumber}</td>
                  <td className="p-4 text-muted-foreground font-sans">{imp.impairmentDate}</td>
                  <td className="p-4 font-sans">
                    <div className="font-semibold text-foreground">{asset?.name || 'Asset'}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{asset?.assetCode}</div>
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    ${parseFloat(imp.preImpairmentNBV).toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-bold text-rose-400">
                    -${parseFloat(imp.impairmentAmount).toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-bold text-emerald-400">
                    ${parseFloat(imp.postImpairmentNBV).toFixed(2)}
                  </td>
                  <td className="p-4 font-sans text-foreground/90 max-w-xs truncate">{imp.reason}</td>
                  <td className="p-4 text-center font-sans">
                    <StatusBadge status={imp.status} />
                  </td>
                </tr>
              );
            })}
            {impairments.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-muted-foreground font-sans">
                  <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground/90">No Asset Impairments Recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">Impairment tests adjust carrying value when recoverable amount falls below NBV.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Impairment Assessment Modal */}
      {isImpairModalOpen && (
        <Modal
          isOpen={isImpairModalOpen}
          onClose={() => setIsImpairModalOpen(false)}
          title="Assess & Post Asset Impairment"
          size="md"
        >
          <form onSubmit={handleExecuteImpairment} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Select Asset *</label>
              <select
                required
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} — {a.name} (Current NBV: ${parseFloat(a.netBookValue).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {selectedAsset && (
              <div className="bg-card border border-border rounded-lg p-3 text-xs grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-muted-foreground block">Current NBV</span>
                  <span className="font-mono font-bold text-foreground">${currentNBV.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Impairment Loss</span>
                  <span className="font-mono font-bold text-rose-400">-${impAmtVal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Post-Impairment NBV</span>
                  <span className="font-mono font-bold text-emerald-400">${postNBV.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Impairment Date *</label>
                <input
                  type="date"
                  required
                  value={impairmentDate}
                  onChange={(e) => setImpairmentDate(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Impairment Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={impairmentAmount}
                  onChange={(e) => setImpairmentAmount(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Assessment Justification & Reason *</label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div className="bg-amber-950/30 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
              <div className="font-semibold flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Double-Entry Accounting Impact:
              </div>
              <div className="font-mono text-[11px] text-foreground/90 pl-4">
                • Dr: #6085 Loss on Impairment of Fixed Assets (+${impAmtVal.toFixed(2)})<br />
                • Cr: #1530 Accumulated Asset Impairment (+${impAmtVal.toFixed(2)})
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsImpairModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                Confirm & Post Impairment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
