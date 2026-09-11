// ============================================================================
// Fixed Asset Register & Directory View
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  ArrowRight, 
  MapPin, 
  User 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { AssetType, AssetStatus } from '@/database/types';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { AssetProfileModal } from './AssetProfileModal';
import { assetService } from '../services/asset.service';

export const AssetRegisterView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // New Asset Form State
  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('tangible');
  const [originalCost, setOriginalCost] = useState('');
  const [residualValue, setResidualValue] = useState('0.00');
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('36');
  const [serialNumber, setSerialNumber] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [location, setLocation] = useState('HQ Muscat');
  const [custodianName, setCustodianName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialStatus, setInitialStatus] = useState<AssetStatus>('draft');
  const [notes, setNotes] = useState('');

  const categories = db.getAssetCategories(tenant);
  const assets = db.getFixedAssets(tenant);

  const filteredAssets = assets.filter((a) => {
    if (selectedCategory !== 'ALL' && a.categoryId !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && a.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.assetCode.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.tagNumber && a.tagNumber.toLowerCase().includes(q)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
        (a.custodianName && a.custodianName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleRegisterAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode || !name || !categoryId || !originalCost) return;

    assetService.createAsset({
      assetCode,
      name,
      categoryId,
      assetType,
      originalCost: parseFloat(originalCost).toFixed(4),
      residualValue: parseFloat(residualValue || '0').toFixed(4),
      usefulLifeMonths: parseInt(usefulLifeMonths, 10) || 36,
      depreciationMethod: 'straight_line',
      depreciationFrequency: 'monthly',
      serialNumber,
      tagNumber: tagNumber || `TAG-${assetCode}`,
      location,
      custodianName,
      purchaseDate,
      status: initialStatus,
      currency: tenant.baseCurrency,
      exchangeRate: '1.000000',
      assetAccountId: 'acc-1510',
      accumDepAccountId: 'acc-1520',
      depExpenseAccountId: 'acc-6020',
      notes,
    }, tenant);

    setIsRegisterModalOpen(false);
    // Reset form
    setAssetCode('');
    setName('');
    setOriginalCost('');
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Asset Code, Name, RFID Tag, Serial #, Custodian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="in_service">In Service</option>
            <option value="draft">Draft (Uncapitalized)</option>
            <option value="impaired">Impaired</option>
            <option value="fully_depreciated">Fully Depreciated</option>
            <option value="disposed">Disposed</option>
            <option value="written_off">Written Off</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setAssetCode(`FA-${Date.now().toString(36).toUpperCase()}`);
            if (categories.length > 0) setCategoryId(categories[0].id);
            setIsRegisterModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Register Fixed Asset
        </Button>
      </div>

      {/* Asset Table */}
      <Card className="overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-bold text-foreground/90 uppercase tracking-wider border-b border-border">
              <tr>
                <th className="p-4">Asset Code & Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Tag / Serial</th>
                <th className="p-4">Location & Custodian</th>
                <th className="p-4 text-right">Original Cost</th>
                <th className="p-4 text-right">Accum. Dep.</th>
                <th className="p-4 text-right">Net Book Value</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground font-sans">
              {filteredAssets.map((asset) => {
                const cat = categories.find((c) => c.id === asset.categoryId);
                const cost = parseFloat(asset.originalCost);
                const accum = parseFloat(asset.accumulatedDepreciation || '0');
                const nbv = parseFloat(asset.netBookValue || '0');

                return (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className="hover:bg-muted cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{asset.name}</div>
                      <div className="text-xs font-mono font-bold text-brand-600">{asset.assetCode}</div>
                    </td>
                    <td className="p-4 text-foreground/90 font-medium">
                      {cat?.name || 'Unassigned'}
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs text-foreground font-medium">{asset.tagNumber || '—'}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{asset.serialNumber || 'No Serial'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-foreground flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {asset.location || 'HQ'}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {asset.custodianName || 'Unassigned'}
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-foreground font-medium">
                      ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-mono text-amber-600 font-semibold">
                      -${accum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-600">
                      ${nbv.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedAssetId(asset.id)}
                        className="text-xs flex items-center gap-1"
                      >
                        Inspect
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
                    <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground/90">No fixed assets match the current filter.</p>
                    <p className="text-xs text-muted-foreground mt-1">Register a new capital asset or adjust filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Asset 360 Inspection Modal */}
      {selectedAssetId && (
        <AssetProfileModal
          assetId={selectedAssetId}
          isOpen={!!selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
        />
      )}

      {/* Register Asset Modal */}
      {isRegisterModalOpen && (
        <Modal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          title="Register New Fixed Asset"
          size="lg"
        >
          <form onSubmit={handleRegisterAsset} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Asset Code *</label>
                <input
                  type="text"
                  required
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Category *</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    const cat = categories.find((c) => c.id === e.target.value);
                    if (cat) {
                      setUsefulLifeMonths(cat.defaultUsefulLifeMonths.toString());
                    }
                  }}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1">Asset Description / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., Heavy Commercial CNC Milling Center 5-Axis"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Original Cost ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={originalCost}
                  onChange={(e) => setOriginalCost(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono font-bold focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Salvage / Residual ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={residualValue}
                  onChange={(e) => setResidualValue(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Useful Life (Months) *</label>
                <input
                  type="number"
                  required
                  value={usefulLifeMonths}
                  onChange={(e) => setUsefulLifeMonths(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Serial Number</label>
                <input
                  type="text"
                  placeholder="Manufacturer Serial #"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">RFID / Barcode Tag Number</label>
                <input
                  type="text"
                  placeholder="Physical Tag ID"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Facility Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Responsible Custodian</label>
                <input
                  type="text"
                  placeholder="Employee name or department head"
                  value={custodianName}
                  onChange={(e) => setCustodianName(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Asset Classification</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as AssetType)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="tangible">Tangible Asset</option>
                  <option value="intangible">Intangible Asset</option>
                  <option value="capital_wip">Capital Work in Progress</option>
                  <option value="leased">Leased Asset / ROU</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Purchase Date *</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/90 block mb-1">Initial Status</label>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value as AssetStatus)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="draft">Draft (Requires Capitalization)</option>
                  <option value="in_service">In-Service (Commissioned)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/90 block mb-1">Asset Notes &amp; Specifications</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Technical specifications, supplier warranty details, maintenance schedules..."
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsRegisterModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Confirm Registration
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
