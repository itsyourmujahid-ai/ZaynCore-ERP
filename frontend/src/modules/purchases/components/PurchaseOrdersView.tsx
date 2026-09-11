// ============================================================================
// Purchase Orders (PO) Management & Workflow Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Boxes, 
  CreditCard, 
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { procurementService } from '@/modules/procurement/services/procurement.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { DbPurchaseOrder, DbPurchaseOrderItem } from '@/database/types';

export const PurchaseOrdersView: React.FC<{
  onReceivePO?: (poId: string) => void;
  onBillPO?: (poId: string) => void;
}> = ({ onReceivePO, onBillPO }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<DbPurchaseOrder | null>(null);

  const purchaseOrders = db.getPurchaseOrders(tenant);
  const suppliers = db.getSuppliers(tenant);

  const [form, setForm] = useState({
    poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierId: suppliers[0]?.id || '',
    expectedDeliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    paymentTermsDays: 30,
    notes: 'Standard commercial purchase order.',
    items: [
      {
        id: 'po-item-1',
        description: 'Commercial Server Hardware Rack Unit',
        quantity: '2',
        receivedQuantity: '0',
        billedQuantity: '0',
        unitPrice: '1200.0000',
        discountRate: '0',
        subtotal: '2400.0000',
        taxAmount: '0.0000',
        total: '2400.0000',
      },
    ] as DbPurchaseOrderItem[],
  });

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          id: `po-item-${Date.now()}`,
          description: '',
          quantity: '1',
          receivedQuantity: '0',
          billedQuantity: '0',
          unitPrice: '0.0000',
          discountRate: '0',
          subtotal: '0.0000',
          taxAmount: '0.0000',
          total: '0.0000',
        },
      ],
    });
  };

  const handleRemoveItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleItemChange = (idx: number, field: keyof DbPurchaseOrderItem, val: string) => {
    const updated = [...form.items];
    const item = { ...updated[idx], [field]: val };
    const qty = parseFloat(field === 'quantity' ? val : item.quantity) || 0;
    const price = parseFloat(field === 'unitPrice' ? val : item.unitPrice) || 0;
    const sub = (qty * price).toFixed(4);
    item.subtotal = sub;
    item.total = sub;
    updated[idx] = item;
    setForm({ ...form, items: updated });
  };

  const subtotal = form.items.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0);

  const handleCreatePO = () => {
    try {
      procurementService.createPurchaseOrder({
        poNumber: form.poNumber,
        supplierId: form.supplierId,
        poDate: new Date().toISOString().slice(0, 10),
        expectedDeliveryDate: form.expectedDeliveryDate,
        currency: tenant.baseCurrency,
        exchangeRate: '1.000000',
        buyerName: tenant.userEmail.split('@')[0],
        paymentTermsDays: form.paymentTermsDays,
        subtotal: subtotal.toFixed(4),
        discountTotal: '0.0000',
        taxTotal: '0.0000',
        freightTotal: '0.0000',
        total: subtotal.toFixed(4),
        status: 'draft',
        notes: form.notes,
        items: form.items,
      }, tenant);

      setIsCreateModalOpen(false);
      setForm({
        poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierId: suppliers[0]?.id || '',
        expectedDeliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        paymentTermsDays: 30,
        notes: '',
        items: [
          {
            id: 'po-item-1',
            description: '',
            quantity: '1',
            receivedQuantity: '0',
            billedQuantity: '0',
            unitPrice: '0.0000',
            discountRate: '0',
            subtotal: '0.0000',
            taxAmount: '0.0000',
            total: '0.0000',
          },
        ],
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApprovePO = (id: string) => {
    procurementService.approvePurchaseOrder(id, tenant);
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const sup = suppliers.find((s) => s.id === po.supplierId);
    const matchesSearch = !searchQuery || 
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'draft', label: 'Draft' },
            { id: 'approved', label: 'Approved' },
            { id: 'partially_received', label: 'Partially Received' },
            { id: 'fully_received', label: 'Fully Received' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all select-none whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search PO # or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create PO
          </Button>
        </div>
      </div>

      {/* PO Register Table */}
      <Card
        title="Purchase Orders Register"
        subtitle={`Tracking ${filteredPOs.length} authorized procurement commitments`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">PO #</th>
                <th className="px-5 py-3.5">Supplier</th>
                <th className="px-5 py-3.5">PO Date</th>
                <th className="px-5 py-3.5">Expected Delivery</th>
                <th className="px-5 py-3.5 text-right">Order Total</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredPOs.map((po) => {
                const sup = suppliers.find((s) => s.id === po.supplierId);
                return (
                  <tr key={po.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{po.poNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{sup?.name || 'Vendor'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sup?.code}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">{po.poDate}</td>
                    <td className="px-5 py-3.5 font-mono text-foreground/90">{po.expectedDeliveryDate || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                      ${parseFloat(po.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={po.status} size="xs" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => setSelectedPO(po)}
                        >
                          View
                        </Button>

                        {po.status === 'draft' && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<CheckCircle2 className="w-3 h-3" />}
                            onClick={() => handleApprovePO(po.id)}
                          >
                            Approve
                          </Button>
                        )}

                        {po.status !== 'draft' && po.status !== 'fully_received' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={<Boxes className="w-3 h-3" />}
                            onClick={() => onReceivePO?.(po.id)}
                          >
                            Receive
                          </Button>
                        )}

                        {po.status !== 'draft' && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<CreditCard className="w-3 h-3" />}
                            onClick={() => onBillPO?.(po.id)}
                          >
                            + Bill
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPOs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No purchase orders recorded. Click "+ Create PO" to create a new purchase order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create PO Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Order"
        subtitle="Issue official supplier purchase order with authorized line items."
        size="xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreatePO}>
              Save Purchase Order
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="PO Number"
              value={form.poNumber}
              onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
            />
            <Select
              label="Supplier"
              options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            />
            <Input
              label="Expected Delivery Date"
              type="date"
              value={form.expectedDeliveryDate}
              onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
            />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-foreground/90">Line Items</span>
              <Button size="xs" variant="outline" icon={<Plus className="w-3 h-3" />} onClick={handleAddItem}>
                Add Line
              </Button>
            </div>

            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg bg-card/60 border border-border flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Item Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-card border border-border rounded text-foreground"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-card border border-border rounded text-foreground text-right"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-card border border-border rounded text-foreground text-right"
                    />
                  </div>
                  <div className="w-28 text-right font-mono text-xs font-bold text-foreground">
                    ${parseFloat(item.total || '0').toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-muted-foreground hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 text-xs font-mono font-bold text-foreground">
              Order Total: ${subtotal.toFixed(2)}
            </div>
          </div>
        </div>
      </Modal>

      {/* PO View Modal */}
      {selectedPO && (
        <Modal
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          title={`Purchase Order: ${selectedPO.poNumber}`}
          subtitle={`Status: ${selectedPO.status.toUpperCase()} • Total: $${parseFloat(selectedPO.total).toFixed(2)}`}
          size="lg"
          footer={
            <Button size="sm" variant="secondary" onClick={() => setSelectedPO(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/80 text-muted-foreground font-semibold uppercase">
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Ordered</th>
                    <th className="px-4 py-2.5 text-right">Received</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {selectedPO.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 font-medium">{it.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{it.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{it.receivedQuantity || '0'}</td>
                      <td className="px-4 py-2.5 text-right font-mono">${parseFloat(it.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">${parseFloat(it.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
