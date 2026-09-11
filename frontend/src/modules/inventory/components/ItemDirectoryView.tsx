// ============================================================================
// Item Master Catalog & SKU Management Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle,
  Eye,
  Boxes
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { inventoryService } from '@/modules/inventory/services/inventory.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { ItemProfileModal } from './ItemProfileModal';
import { ItemType, CostingMethod } from '@/database/types';

export const ItemDirectoryView: React.FC<{
  onItemCreated?: () => void;
}> = ({ onItemCreated }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [itemCode, setItemCode] = useState(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemType, setItemType] = useState<ItemType>('stock');
  const [uomId, setUomId] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('10.0000');
  const [reorderLevel, setReorderLevel] = useState('20.0000');
  const [maxStockLevel, setMaxStockLevel] = useState('100.0000');
  const [costingMethod] = useState<CostingMethod>('weighted_average');
  const [initialCost, setInitialCost] = useState('50.0000');
  const [errorMsg, setErrorMsg] = useState('');

  const items = db.getItems(tenant);
  const categories = db.getItemCategories(tenant);
  const uoms = db.getUnitsOfMeasure(tenant);
  const warehouses = db.getWarehouses(tenant);

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || item.categoryId === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!itemName.trim() || !itemCode.trim()) {
      setErrorMsg('Item SKU and Name are required.');
      return;
    }

    try {
      const selectedCatId = categoryId || categories[0]?.id || 'cat-fin-goods';
      const selectedUomId = uomId || uoms[0]?.id || 'uom-pcs';
      const defaultWh = warehouses.find((w) => w.isDefault) || warehouses[0];

      inventoryService.createItem({
        itemCode: itemCode.trim().toUpperCase(),
        name: itemName.trim(),
        description: description.trim(),
        categoryId: selectedCatId,
        itemType,
        uomId: selectedUomId,
        trackInventory: itemType !== 'service',
        isStockItem: itemType === 'stock' || itemType === 'raw_material' || itemType === 'finished_goods',
        isService: itemType === 'service',
        minStockLevel,
        reorderLevel,
        maxStockLevel,
        defaultWarehouseId: defaultWh?.id,
        costingMethod,
        currentAverageCost: initialCost,
        totalStockQuantity: '0.0000',
        totalStockValue: '0.0000',
        status: 'active',
      }, tenant);

      setIsCreateModalOpen(false);
      setItemCode(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setItemName('');
      setDescription('');
      if (onItemCreated) onItemCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register item SKU.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by SKU, item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/60 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-card/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setErrorMsg('');
            setIsCreateModalOpen(true);
          }}
        >
          Register SKU
        </Button>
      </div>

      {/* Items Directory Table */}
      <Card noPadding>
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-10 h-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-semibold text-foreground/90">No Inventory Items Found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Register standard SKUs, merchandise items, raw materials, or services to enable perpetual inventory tracking and automatic GL accounting.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/80 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">SKU Code</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">UOM</th>
                  <th className="p-3 text-right">Avg Unit Cost</th>
                  <th className="p-3 text-right">On-Hand Qty</th>
                  <th className="p-3 text-right">Stock Valuation</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card/20">
                {filteredItems.map((item) => {
                  const cat = categories.find((c) => c.id === item.categoryId);
                  const uom = uoms.find((u) => u.id === item.uomId);
                  const qty = parseFloat(item.totalStockQuantity);
                  const reorder = parseFloat(item.reorderLevel || '0');
                  const isLow = qty <= reorder;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-brand-400">{item.itemCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{item.name}</div>
                        {item.description && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-xs">{item.description}</div>
                        )}
                      </td>
                      <td className="p-3 text-foreground/90">{cat?.name || 'Unassigned'}</td>
                      <td className="p-3">
                        <StatusBadge status={item.itemType} />
                      </td>
                      <td className="p-3 font-medium text-muted-foreground">{uom?.symbol || 'pcs'}</td>
                      <td className="p-3 text-right font-mono text-foreground">
                        ${parseFloat(item.currentAverageCost).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={isLow ? 'text-amber-400' : 'text-foreground'}>
                          {item.totalStockQuantity}
                        </span>
                        {isLow && (
                          <span title="Low Stock Threshold">
                            <AlertTriangle className="w-3 h-3 text-amber-400 inline ml-1" />
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400">
                        ${parseFloat(item.totalStockValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          Profile
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Item 360-Degree Profile Modal */}
      <ItemProfileModal
        itemId={selectedItemId}
        isOpen={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />

      {/* Register SKU Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Item SKU"
        size="lg"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Item SKU / Code *"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="e.g. SKU-8801"
              required
            />
            <div className="md:col-span-2">
              <Input
                label="Item Name *"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Industrial Hydraulic Filter 100mm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="Category"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categoryId || categories[0]?.id || ''}
              onChange={(e) => setCategoryId(e.target.value)}
            />
            <Select
              label="Item Type"
              options={[
                { value: 'stock', label: 'Stock Merchandise' },
                { value: 'raw_material', label: 'Raw Material' },
                { value: 'finished_goods', label: 'Finished Goods' },
                { value: 'consumable', label: 'Consumable Supply' },
                { value: 'spare_part', label: 'Spare Part' },
                { value: 'service', label: 'Service Item' },
              ]}
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
            />
            <Select
              label="Primary UOM"
              options={uoms.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
              value={uomId || uoms[0]?.id || ''}
              onChange={(e) => setUomId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              label="Initial Unit Cost ($)"
              type="number"
              step="0.01"
              value={initialCost}
              onChange={(e) => setInitialCost(e.target.value)}
            />
            <Input
              label="Min Stock Level"
              type="number"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
            />
            <Input
              label="Reorder Threshold"
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
            />
            <Input
              label="Max Stock Level"
              type="number"
              value={maxStockLevel}
              onChange={(e) => setMaxStockLevel(e.target.value)}
            />
          </div>

          <Input
            label="Description & Specifications"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical details, part numbers, or warehouse notes"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Create Item SKU
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
