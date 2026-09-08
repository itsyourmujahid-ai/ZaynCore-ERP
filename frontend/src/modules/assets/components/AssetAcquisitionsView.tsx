// ============================================================================
// Fixed Asset Acquisitions & Capitalization Workbench
// ============================================================================

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  DollarSign, 
  Clock, 
  FileCheck 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { DbFixedAsset } from '@/database/types';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { assetService } from '../services/asset.service';

export const AssetAcquisitionsView: React.FC = () => {
  const { tenant } = useAuth();
  const [selectedAsset, setSelectedAsset] = useState<DbFixedAsset | null>(null);
  const [isCapitalizeModalOpen, setIsCapitalizeModalOpen] = useState(false);
  const [capitalizationDate, setCapitalizationDate] = useState(new Date().toISOString().split('T')[0]);
  const [contraAccountId, setContraAccountId] = useState('acc-1590');
  const [notes, setNotes] = useState('');

  const allAssets = db.getFixedAssets(tenant);
  const categories = db.getAssetCategories(tenant);

  // Uncapitalized assets queue
  const pendingCapitalization = allAssets.filter(
    (a) => a.status === 'draft' || a.status === 'acquired'
  );

  const handleCapitalize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    assetService.capitalizeAsset(selectedAsset.id, {
      capitalizationDate,
      inServiceDate: capitalizationDate,
      contraAccountId,
      notes,
    }, tenant);

    setIsCapitalizeModalOpen(false);
    setSelectedAsset(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Explanatory Card */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Capitalization & In-Service Workbench</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Acquired and draft assets remain in non-depreciating holding status until formal capitalization. Capitalization officially activates the asset, transitions its status to <span className="text-emerald-400 font-semibold">In Service</span>, creates the automated double-entry GL journal (<span className="font-mono text-blue-300">Dr Fixed Asset #1510, Cr Asset Clearing #1590</span>), and auto-generates the straight-line monthly depreciation schedule.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Capitalization Queue */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Capitalization Queue ({pendingCapitalization.length})
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingCapitalization.map((asset) => {
            const cat = categories.find((c) => c.id === asset.categoryId);
            const cost = parseFloat(asset.originalCost);

            return (
              <Card key={asset.id} className="p-5 flex flex-col justify-between space-y-4 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs text-blue-400 font-semibold">{asset.assetCode}</span>
                      <h4 className="text-base font-bold text-slate-100 mt-0.5">{asset.name}</h4>
                    </div>
                    <StatusBadge status={asset.status} />
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Category: <span className="text-slate-200 font-medium">{cat?.name || 'General'}</span></div>
                    <div>Purchase Date: <span className="text-slate-200">{asset.purchaseDate || 'N/A'}</span></div>
                    <div>Useful Life: <span className="text-slate-200 font-semibold">{asset.usefulLifeMonths} Months</span></div>
                    <div>Custodian: <span className="text-slate-200">{asset.custodianName || 'Unassigned'}</span></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Acquisition Cost</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setIsCapitalizeModalOpen(true);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    Capitalize
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}

          {pendingCapitalization.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-300">All Capital Assets Are Fully Capitalized</p>
              <p className="text-xs text-slate-500 mt-1">There are no uncapitalized draft assets waiting in the queue.</p>
            </div>
          )}
        </div>
      </div>

      {/* Capitalization Confirmation Modal */}
      {isCapitalizeModalOpen && selectedAsset && (
        <Modal
          isOpen={isCapitalizeModalOpen}
          onClose={() => setIsCapitalizeModalOpen(false)}
          title={`Capitalize Asset: ${selectedAsset.assetCode}`}
          size="md"
        >
          <form onSubmit={handleCapitalize} className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Asset Name:</span>
                <span className="font-semibold text-slate-100">{selectedAsset.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Cost:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${parseFloat(selectedAsset.originalCost).toFixed(2)} {selectedAsset.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Depreciation Term:</span>
                <span className="text-slate-200">{selectedAsset.usefulLifeMonths} Months (Straight Line)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Capitalization / In-Service Date *</label>
              <input
                type="date"
                required
                value={capitalizationDate}
                onChange={(e) => setCapitalizationDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Offset / Contra Clearing Account *</label>
              <select
                value={contraAccountId}
                onChange={(e) => setContraAccountId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              >
                <option value="acc-1590">#1590 — Asset Clearing & CWIP (Recommended)</option>
                <option value="acc-2010">#2010 — Accounts Payable Vendor Clearing</option>
                <option value="acc-1010">#1010 — Direct Bank Settlement Outflow</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Authorization Notes & Reference</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or work order reference"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                Automated Double-Entry GL Journal Impact:
              </div>
              <div className="font-mono text-[11px] text-slate-300 pl-4">
                • Debit: #1510 Property, Plant & Equipment (+${parseFloat(selectedAsset.originalCost).toFixed(2)})<br />
                • Credit: Clearing / AP / Bank (-${parseFloat(selectedAsset.originalCost).toFixed(2)})
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsCapitalizeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Authorize Capitalization
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
