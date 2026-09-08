// ============================================================================
// Fixed Asset Disposals & Write-Offs Workbench
// ============================================================================

import React, { useState } from 'react';
import { 
  Trash2, 
  DollarSign, 
  Plus 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { DisposalType } from '@/database/types';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { assetService } from '../services/asset.service';

export const AssetDisposalsView: React.FC = () => {
  const { tenant } = useAuth();
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [disposalType, setDisposalType] = useState<DisposalType>('sale');
  const [disposalProceeds, setDisposalProceeds] = useState('0.00');
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const assets = db.getFixedAssets(tenant).filter(
    (a) => a.status === 'in_service' || a.status === 'impaired' || a.status === 'fully_depreciated'
  );
  const disposals = db.getAssetDisposals(undefined, tenant);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const cost = selectedAsset ? parseFloat(selectedAsset.originalCost) : 0;
  const accumDep = selectedAsset ? parseFloat(selectedAsset.accumulatedDepreciation || '0') : 0;
  const accumImp = selectedAsset ? parseFloat(selectedAsset.accumulatedImpairment || '0') : 0;
  const nbv = Math.max(0, cost - accumDep - accumImp);
  const proceedsVal = parseFloat(disposalProceeds || '0');
  const gainLoss = proceedsVal - nbv;
  const isGain = gainLoss >= 0;
  const gainLossAmount = Math.abs(gainLoss);

  const handleExecuteDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    try {
      const disp = assetService.disposeAsset(selectedAssetId, {
        disposalDate,
        disposalType,
        disposalProceeds: proceedsVal.toFixed(4),
        notes,
      }, tenant);

      setFeedback(`Disposal '${disp.disposalNumber}' posted successfully (${disp.isGain ? 'Gain' : 'Loss'}: $${disp.gainLossAmount}).`);
      setIsDisposalModalOpen(false);
      setSelectedAssetId('');
      setDisposalProceeds('0.00');
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            Asset Disposals, Retirements & Write-Offs
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Process asset sales, scrapping, and complete write-offs with automated Gain/Loss on Disposal General Ledger posting.
          </p>
        </div>

        <Button
          onClick={() => {
            if (assets.length > 0) setSelectedAssetId(assets[0].id);
            setIsDisposalModalOpen(true);
          }}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700"
        >
          <Plus className="w-4 h-4" />
          Dispose / Retire Asset
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

      {/* Disposals Register */}
      <Card className="overflow-hidden border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="p-4">Disposal #</th>
              <th className="p-4">Date</th>
              <th className="p-4">Asset</th>
              <th className="p-4">Type</th>
              <th className="p-4 text-right">Cost</th>
              <th className="p-4 text-right">Accum Dep</th>
              <th className="p-4 text-right">NBV</th>
              <th className="p-4 text-right">Proceeds</th>
              <th className="p-4 text-right">Gain / Loss</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-mono">
            {disposals.map((d) => {
              const asset = db.getFixedAssetById(d.assetId, tenant);
              return (
                <tr key={d.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-medium text-blue-400">{d.disposalNumber}</td>
                  <td className="p-4 text-slate-400 font-sans">{d.disposalDate}</td>
                  <td className="p-4 font-sans">
                    <div className="font-semibold text-slate-200">{asset?.name || 'Asset'}</div>
                    <div className="text-[11px] font-mono text-slate-500">{asset?.assetCode}</div>
                  </td>
                  <td className="p-4 capitalize font-sans text-slate-300">{d.disposalType.replace('_', ' ')}</td>
                  <td className="p-4 text-right text-slate-400">${parseFloat(d.originalCost).toFixed(2)}</td>
                  <td className="p-4 text-right text-slate-400">-${parseFloat(d.accumulatedDepreciation).toFixed(2)}</td>
                  <td className="p-4 text-right text-slate-300">${parseFloat(d.netBookValue).toFixed(2)}</td>
                  <td className="p-4 text-right font-bold text-slate-100">${parseFloat(d.disposalProceeds).toFixed(2)}</td>
                  <td className="p-4 text-right font-bold">
                    {d.isGain ? (
                      <span className="text-emerald-400">+${parseFloat(d.gainLossAmount).toFixed(2)} (Gain)</span>
                    ) : (
                      <span className="text-rose-400">-${parseFloat(d.gainLossAmount).toFixed(2)} (Loss)</span>
                    )}
                  </td>
                  <td className="p-4 text-center font-sans">
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              );
            })}
            {disposals.length === 0 && (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-400 font-sans">
                  <Trash2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="font-medium text-slate-300">No Asset Disposals Recorded</p>
                  <p className="text-xs text-slate-500 mt-1">Disposals de-recognize assets and automatically post gains or losses to General Ledger.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Disposal Builder Modal */}
      {isDisposalModalOpen && (
        <Modal
          isOpen={isDisposalModalOpen}
          onClose={() => setIsDisposalModalOpen(false)}
          title="Dispose / Retire Fixed Asset"
          size="lg"
        >
          <form onSubmit={handleExecuteDisposal} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Select Asset to Dispose *</label>
              <select
                required
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} — {a.name} (Cost: ${parseFloat(a.originalCost).toFixed(2)}, NBV: ${parseFloat(a.netBookValue).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {selectedAsset && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-slate-400 block">Original Cost</span>
                  <span className="font-mono font-semibold text-slate-200">${cost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Accum. Dep.</span>
                  <span className="font-mono font-semibold text-amber-400">-${accumDep.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Book Value</span>
                  <span className="font-mono font-bold text-slate-100">${nbv.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Est. Gain / Loss</span>
                  <span className={`font-mono font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isGain ? '+' : '-'}${gainLossAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Disposal Type *</label>
                <select
                  value={disposalType}
                  onChange={(e) => {
                    const dt = e.target.value as DisposalType;
                    setDisposalType(dt);
                    if (dt === 'scrapping' || dt === 'write_off' || dt === 'donation') {
                      setDisposalProceeds('0.00');
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
                >
                  <option value="sale">Commercial Sale</option>
                  <option value="scrapping">Scrapping / Decommission</option>
                  <option value="write_off">Complete Write-Off</option>
                  <option value="donation">Donation</option>
                  <option value="trade_in">Trade-In Exchange</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Disposal Date *</label>
                <input
                  type="date"
                  required
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Disposal Proceeds ($)</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={disposalType === 'scrapping' || disposalType === 'write_off'}
                  value={disposalProceeds}
                  onChange={(e) => setDisposalProceeds(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Disposal Notes & Authorization</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
            </div>

            {/* Accounting Impact Preview */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Automatic Multi-Line Double-Entry GL Journal:
              </div>
              <div className="font-mono text-[11px] text-slate-300 pl-4 space-y-0.5">
                {proceedsVal > 0 && <div>• Dr: #1010 Operating Bank Account (+${proceedsVal.toFixed(2)})</div>}
                {accumDep > 0 && <div>• Dr: #1520 Accumulated Depreciation (+${accumDep.toFixed(2)})</div>}
                {accumImp > 0 && <div>• Dr: #1530 Accumulated Asset Impairment (+${accumImp.toFixed(2)})</div>}
                {!isGain && gainLossAmount > 0 && (
                  <div className="text-rose-300 font-semibold">• Dr: #6085 Loss on Disposal of Fixed Assets (+${gainLossAmount.toFixed(2)})</div>
                )}
                <div>• Cr: #1510 Property, Plant & Equipment (-${cost.toFixed(2)})</div>
                {isGain && gainLossAmount > 0 && (
                  <div className="text-emerald-300 font-semibold">• Cr: #4085 Gain on Disposal of Fixed Assets (+${gainLossAmount.toFixed(2)})</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsDisposalModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700">
                Authorize Disposal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
