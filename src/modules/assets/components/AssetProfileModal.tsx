// ============================================================================
// Fixed Asset 360-Degree Profile & Inspection Modal
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  Clock, 
  ArrowLeftRight, 
  FileText, 
  DollarSign, 
  Tag, 
  MapPin, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Modal } from '@/ui/components/Modal';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Card } from '@/ui/components/Card';
import { depreciationService } from '../services/depreciation.service';

interface AssetProfileModalProps {
  assetId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssetUpdated?: () => void;
}

export const AssetProfileModal: React.FC<AssetProfileModalProps> = ({
  assetId,
  isOpen,
  onClose,
  onAssetUpdated,
}) => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'components' | 'transfers' | 'accounting'>('overview');

  const asset = db.getFixedAssetById(assetId, tenant);
  if (!asset) return null;

  const category = db.getAssetCategoryById(asset.categoryId, tenant);
  const scheduleLines = db.getDepreciationSchedules(asset.id, tenant);
  const transfers = db.getAssetTransfers(asset.id, tenant);
  const journals = db.getJournalEntries(tenant).filter(
    (j) => j.lines.some((l) => l.subLedgerType === 'fixed_asset' && l.subLedgerEntityId === asset.id)
  );

  const cost = parseFloat(asset.originalCost);
  const accumDep = parseFloat(asset.accumulatedDepreciation || '0');
  const nbv = parseFloat(asset.netBookValue || '0');
  const depRate = cost > 0 ? ((accumDep / cost) * 100).toFixed(1) : '0.0';

  const handleRegenerateSchedule = () => {
    depreciationService.generateSchedule(asset, tenant);
    if (onAssetUpdated) onAssetUpdated();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${asset.assetCode} — ${asset.name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header Summary Banner */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{asset.name}</h3>
                <StatusBadge status={asset.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Category: <span className="text-foreground font-medium">{category?.name || 'Unassigned'}</span> • Tag: <span className="font-mono text-blue-400">{asset.tagNumber || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-medium">Original Cost</div>
              <div className="text-lg font-bold text-foreground">${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-medium">Accum. Depreciation</div>
              <div className="text-lg font-bold text-amber-400">-${accumDep.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-right pl-4 border-l border-border">
              <div className="text-xs text-muted-foreground font-medium">Net Book Value</div>
              <div className="text-2xl font-black text-emerald-400">${nbv.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border flex gap-6 text-sm font-medium">
          {[
            { id: 'overview', label: 'Overview & Specifications', icon: Building2 },
            { id: 'schedule', label: `Depreciation Schedule (${scheduleLines.length})`, icon: Clock },
            { id: 'components', label: `Components (${asset.components?.length || 0})`, icon: Layers },
            { id: 'transfers', label: `Transfers & History (${transfers.length})`, icon: ArrowLeftRight },
            { id: 'accounting', label: `GL Ledger Traceability (${journals.length})`, icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Technical Details */}
              <Card className="p-5 space-y-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" />
                  Asset Identification & Tracking
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Asset Code</span>
                    <span className="font-mono font-medium text-foreground">{asset.assetCode}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Asset Type</span>
                    <span className="capitalize text-foreground">{asset.assetType}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Serial Number</span>
                    <span className="font-mono text-foreground">{asset.serialNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Barcode / RFID Tag</span>
                    <span className="font-mono text-blue-400">{asset.tagNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Purchase Date</span>
                    <span className="text-foreground">{asset.purchaseDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Capitalization Date</span>
                    <span className="text-foreground">{asset.capitalizationDate || 'Uncapitalized (Draft)'}</span>
                  </div>
                </div>
              </Card>

              {/* Custody & Location */}
              <Card className="p-5 space-y-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Custody & Physical Location
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Responsible Custodian</span>
                    <span className="font-medium text-foreground">{asset.custodianName || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Physical Location</span>
                    <span className="text-foreground">{asset.location || 'Central Facility'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Cost Center</span>
                    <span className="text-foreground font-mono">{asset.costCenterId || 'Corporate General'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Assigned Project</span>
                    <span className="text-foreground">{asset.projectId || 'None'}</span>
                  </div>
                </div>
              </Card>

              {/* Depreciation Parameters */}
              <Card className="p-5 space-y-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Depreciation Configuration
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Method</span>
                    <span className="capitalize text-foreground">{asset.depreciationMethod.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Useful Life</span>
                    <span className="text-foreground font-semibold">{asset.usefulLifeMonths} Months ({(asset.usefulLifeMonths / 12).toFixed(1)} Yrs)</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Salvage / Residual Value</span>
                    <span className="text-foreground font-mono">${parseFloat(asset.residualValue || '0').toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Depreciation Progress</span>
                    <span className="text-amber-400 font-bold">{depRate}% Depreciated</span>
                  </div>
                </div>
              </Card>

              {/* General Ledger Mapping */}
              <Card className="p-5 space-y-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  General Ledger Accounts
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Fixed Asset Control:</span>
                    <span className="font-mono text-foreground">#1510 Property, Plant & Equipment</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Accumulated Depreciation:</span>
                    <span className="font-mono text-foreground">#1520 Accumulated Depreciation</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Depreciation Expense:</span>
                    <span className="font-mono text-foreground">#6020 Depreciation Expense</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Gain / Loss on Disposal:</span>
                    <span className="font-mono text-foreground">#4085 / #6085 Gain/Loss on Sale</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Depreciation Schedule */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Periodic monthly straight-line depreciation schedule. Total periods: <span className="font-bold text-foreground">{scheduleLines.length}</span>
              </div>
              {asset.status === 'in_service' && (
                <Button size="sm" variant="outline" onClick={handleRegenerateSchedule}>
                  Regenerate Schedule
                </Button>
              )}
            </div>

            <div className="border border-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-card/90 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3">Period</th>
                    <th className="p-3 text-right">Opening NBV</th>
                    <th className="p-3 text-right">Depreciation</th>
                    <th className="p-3 text-right">Accum. Dep.</th>
                    <th className="p-3 text-right">Closing NBV</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  {scheduleLines.map((line) => (
                    <tr key={line.id} className="hover:bg-muted/40">
                      <td className="p-3 font-sans font-medium text-foreground/90">{line.periodName}</td>
                      <td className="p-3 text-right text-muted-foreground">${parseFloat(line.openingNBV).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-amber-400">${parseFloat(line.depreciationAmount).toFixed(2)}</td>
                      <td className="p-3 text-right text-foreground/90">${parseFloat(line.accumulatedDepreciation).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">${parseFloat(line.closingNBV).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        {line.isPosted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Posted
                          </span>
                        ) : (
                          <span className="text-[11px] font-sans text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Scheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {scheduleLines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                        No depreciation schedule lines generated yet. Capitalize this asset to generate its full schedule.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Components */}
        {activeTab === 'components' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Sub-assemblies and interchangeable components registered with this asset.</span>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Component Name</th>
                    <th className="p-3">Serial #</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Useful Life</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {asset.components && asset.components.length > 0 ? (
                    asset.components.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3 font-medium text-foreground">{c.name}</td>
                        <td className="p-3 font-mono text-muted-foreground">{c.serialNumber || '—'}</td>
                        <td className="p-3 text-right font-mono text-foreground">${parseFloat(c.cost).toFixed(2)}</td>
                        <td className="p-3 text-right">{c.usefulLifeMonths} Mos</td>
                        <td className="p-3 text-muted-foreground">{c.notes || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No individual components registered for this fixed asset unit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Transfers & History */}
        {activeTab === 'transfers' && (
          <div className="space-y-4">
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Transfer #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">From Location / Custodian</th>
                    <th className="p-3">To Location / Custodian</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {transfers.map((t) => (
                    <tr key={t.id}>
                      <td className="p-3 font-mono font-medium text-blue-400">{t.transferNumber}</td>
                      <td className="p-3 text-muted-foreground">{t.transferDate}</td>
                      <td className="p-3 text-foreground/90">{t.fromLocation || '—'} ({t.fromCustodian || '—'})</td>
                      <td className="p-3 font-medium text-emerald-400">{t.toLocation || '—'} ({t.toCustodian || '—'})</td>
                      <td className="p-3 text-muted-foreground">{t.reason || 'Relocation'}</td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No transfer history recorded for this asset.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: GL Ledger Traceability */}
        {activeTab === 'accounting' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Audit trail of all double-entry General Ledger journal entries posted for this fixed asset.
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Journal #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Memo</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  {journals.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/40">
                      <td className="p-3 font-medium text-blue-400">{j.entryNumber}</td>
                      <td className="p-3 text-muted-foreground font-sans">{j.postingDate}</td>
                      <td className="p-3 font-sans">
                        <span className="bg-muted text-foreground px-2 py-0.5 rounded text-[11px]">
                          {j.postingEvent}
                        </span>
                      </td>
                      <td className="p-3 font-sans text-foreground/90">{j.memo}</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">${parseFloat(j.totalDebit).toFixed(2)}</td>
                      <td className="p-3 text-right text-foreground/90">${parseFloat(j.totalCredit).toFixed(2)}</td>
                    </tr>
                  ))}
                  {journals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                        No General Ledger postings recorded yet for this asset.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
