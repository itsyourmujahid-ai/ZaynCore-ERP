// ============================================================================
// Fixed Asset Custody & Physical Transfers Workbench
// ============================================================================

import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Plus 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { assetService } from '../services/asset.service';

export const AssetTransfersView: React.FC = () => {
  const { tenant } = useAuth();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [toCustodian, setToCustodian] = useState('');
  const [toCostCenterId, setToCostCenterId] = useState('');
  const [reason, setReason] = useState('Inter-facility asset redeployment');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  const assets = db.getFixedAssets(tenant).filter(
    (a) => a.status === 'in_service' || a.status === 'impaired' || a.status === 'fully_depreciated'
  );
  const transfers = db.getAssetTransfers(undefined, tenant);
  const costCenters = db.getCostCenters(tenant);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) return;

    assetService.transferAsset(selectedAssetId, {
      transferDate,
      toLocation,
      toCustodian,
      toCostCenterId,
      reason,
    }, tenant);

    setIsTransferModalOpen(false);
    setSelectedAssetId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            Asset Custody & Location Transfers
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record physical movement and custodial transitions across corporate facilities and cost centers.
          </p>
        </div>

        <Button
          onClick={() => {
            if (assets.length > 0) setSelectedAssetId(assets[0].id);
            setIsTransferModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Transfer Fixed Asset
        </Button>
      </div>

      {/* Transfers Log Table */}
      <Card className="overflow-hidden border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="p-4">Transfer #</th>
              <th className="p-4">Date</th>
              <th className="p-4">Asset</th>
              <th className="p-4">Source Location / Custodian</th>
              <th className="p-4">Destination Location / Custodian</th>
              <th className="p-4">Transfer Reason</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs text-foreground/90">
            {transfers.map((t) => {
              const asset = db.getFixedAssetById(t.assetId, tenant);
              return (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="p-4 font-mono font-medium text-blue-400">{t.transferNumber}</td>
                  <td className="p-4 text-muted-foreground font-mono">{t.transferDate}</td>
                  <td className="p-4">
                    <div className="font-semibold text-foreground">{asset?.name || 'Asset'}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{asset?.assetCode}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    <div>{t.fromLocation || 'HQ Main'}</div>
                    <div className="text-[11px] text-muted-foreground">Custodian: {t.fromCustodian || 'Unassigned'}</div>
                  </td>
                  <td className="p-4 font-medium text-emerald-400">
                    <div>{t.toLocation || 'Regional Facility'}</div>
                    <div className="text-[11px] text-muted-foreground">Custodian: {t.toCustodian || 'Unassigned'}</div>
                  </td>
                  <td className="p-4 text-foreground/90">{t.reason || 'Operational deployment'}</td>
                  <td className="p-4 text-center">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              );
            })}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                  <ArrowLeftRight className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground/90">No Asset Transfers Recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">Initiate a transfer to reassign an asset's location or custodian.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Transfer Builder Modal */}
      {isTransferModalOpen && (
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title="Initiate Fixed Asset Transfer"
          size="md"
        >
          <form onSubmit={handleExecuteTransfer} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Select Asset to Transfer *</label>
              <select
                required
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetCode} — {a.name} (Current: {a.location || 'HQ'}, {a.custodianName || 'Unassigned'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Transfer Effective Date *</label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">New Cost Center</label>
                <select
                  value={toCostCenterId}
                  onChange={(e) => setToCostCenterId(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Maintain Current Cost Center</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>{cc.name} ({cc.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">New Facility Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Salalah Branch Depot"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">New Custodian *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations Manager"
                  value={toCustodian}
                  onChange={(e) => setToCustodian(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Reason for Transfer</label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Confirm & Record Transfer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
