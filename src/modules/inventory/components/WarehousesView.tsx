// ============================================================================
// Warehouses Master & Multi-Tier Location Management Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Layers
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { inventoryService } from '@/modules/inventory/services/inventory.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';

export const WarehousesView: React.FC<{
  onWarehouseCreated?: () => void;
}> = ({ onWarehouseCreated }) => {
  const { tenant } = useAuth();
  const [selectedWhId, setSelectedWhId] = useState<string | null>(null);
  const [isCreateWhModalOpen, setIsCreateWhModalOpen] = useState(false);
  const [isCreateLocModalOpen, setIsCreateLocModalOpen] = useState(false);

  // Warehouse Form State
  const [code, setCode] = useState(`WH-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Location Form State
  const [locCode, setLocCode] = useState('');
  const [locName, setLocName] = useState('');
  const [zone, setZone] = useState('');
  const [aisle, setAisle] = useState('');
  const [rack, setRack] = useState('');
  const [bin, setBin] = useState('');

  const warehouses = db.getWarehouses(tenant);
  const currentWh = selectedWhId ? db.getWarehouseById(selectedWhId, tenant) : warehouses[0];
  const locations = currentWh ? db.getWarehouseLocations(currentWh.id, tenant) : [];

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!code.trim() || !name.trim()) {
      setErrorMsg('Warehouse Code and Name are required.');
      return;
    }

    try {
      const wh = inventoryService.createWarehouse({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim(),
        managerName: managerName.trim(),
        isDefault,
        isActive: true,
      }, tenant);

      setIsCreateWhModalOpen(false);
      setSelectedWhId(wh.id);
      setName('');
      setAddress('');
      setManagerName('');
      if (onWarehouseCreated) onWarehouseCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create warehouse.');
    }
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWh || !locCode.trim()) return;

    inventoryService.createLocation({
      warehouseId: currentWh.id,
      code: locCode.trim().toUpperCase(),
      name: locName.trim() || locCode.trim(),
      zone: zone.trim(),
      aisle: aisle.trim(),
      rack: rack.trim(),
      bin: bin.trim(),
      isActive: true,
    }, tenant);

    setIsCreateLocModalOpen(false);
    setLocCode('');
    setLocName('');
    setZone('');
    setAisle('');
    setRack('');
    setBin('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Warehouse Master Directory */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />
            Warehouses ({warehouses.length})
          </h3>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setErrorMsg('');
              setIsCreateWhModalOpen(true);
            }}
          >
            New Hub
          </Button>
        </div>

        <div className="space-y-2">
          {warehouses.map((wh) => {
            const isSelected = currentWh?.id === wh.id;
            return (
              <div
                key={wh.id}
                onClick={() => setSelectedWhId(wh.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-brand-500 shadow-md ring-1 ring-brand-500/30'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-brand-400">{wh.code}</span>
                      {wh.isDefault && (
                        <span className="px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-[9px] font-bold text-brand-400 uppercase">
                          Default Primary
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-xs text-slate-100 mt-0.5">{wh.name}</h4>
                  </div>
                  <StatusBadge status={wh.isActive ? 'active' : 'inactive'} />
                </div>

                {wh.address && (
                  <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{wh.address}</span>
                  </p>
                )}

                {wh.managerName && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    Manager: <span className="text-slate-300 font-medium">{wh.managerName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Internal Bins & Locations for Selected Warehouse */}
      <div className="lg:col-span-2 space-y-3">
        {currentWh ? (
          <Card
            title={`${currentWh.name} (${currentWh.code}) Locations`}
            subtitle="Internal storage aisles, racks, and bin layout"
            action={
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsCreateLocModalOpen(true)}
              >
                Add Bin Location
              </Button>
            }
          >
            {locations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-semibold text-slate-300">No Internal Bins Defined</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Configure specific zone, aisle, rack, and bin coordinates for {currentWh.name} to enable precision multi-location storage.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsCreateLocModalOpen(true)}
                >
                  Create First Location
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Location / Bin Code</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Zone</th>
                      <th className="p-3">Aisle</th>
                      <th className="p-3">Rack</th>
                      <th className="p-3">Bin</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 bg-slate-900/20 font-mono text-[11px]">
                    {locations.map((loc) => (
                      <tr key={loc.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-brand-400">{loc.code}</td>
                        <td className="p-3 font-sans text-slate-200">{loc.name}</td>
                        <td className="p-3 text-slate-400">{loc.zone || '-'}</td>
                        <td className="p-3 text-slate-400">{loc.aisle || '-'}</td>
                        <td className="p-3 text-slate-400">{loc.rack || '-'}</td>
                        <td className="p-3 text-slate-400">{loc.bin || '-'}</td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">No warehouse selected.</div>
        )}
      </div>

      {/* Create Warehouse Modal */}
      <Modal
        isOpen={isCreateWhModalOpen}
        onClose={() => setIsCreateWhModalOpen(false)}
        title="Register New Warehouse Hub"
        size="md"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Warehouse Code *"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. WH-NORTH"
              required
            />
            <Input
              label="Manager / Supervisor"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="e.g. Ahmed Al-Habsi"
            />
          </div>

          <Input
            label="Warehouse Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. North Industrial Storage & Staging"
            required
          />

          <Input
            label="Physical Address & City"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Plot 12, Industrial Estate, Nizwa, Oman"
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultWh"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-0"
            />
            <label htmlFor="isDefaultWh" className="text-xs text-slate-300 select-none cursor-pointer">
              Set as primary default warehouse for procurement receipts
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateWhModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Create Warehouse
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Location Modal */}
      <Modal
        isOpen={isCreateLocModalOpen}
        onClose={() => setIsCreateLocModalOpen(false)}
        title={`Add Bin Location to ${currentWh?.name}`}
        size="md"
      >
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Bin Code *"
              value={locCode}
              onChange={(e) => setLocCode(e.target.value)}
              placeholder="e.g. B01-R02-S03"
              required
            />
            <Input
              label="Description / Name"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g. Heavy Duty Pallet Shelf"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input label="Zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone A" />
            <Input label="Aisle" value={aisle} onChange={(e) => setAisle(e.target.value)} placeholder="Aisle 1" />
            <Input label="Rack" value={rack} onChange={(e) => setRack(e.target.value)} placeholder="Rack 2" />
            <Input label="Bin" value={bin} onChange={(e) => setBin(e.target.value)} placeholder="Bin 3" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateLocModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Add Location
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
