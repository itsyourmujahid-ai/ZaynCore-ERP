// ============================================================================
// Goods & Services Receiving (GRIR) Receiving Log Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { procurementService } from '@/modules/procurement/services/procurement.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { DbGoodsReceipt } from '@/database/types';

export const GoodsReceiptsView: React.FC<{
  initialPOId?: string;
  onReceiptCreated?: () => void;
}> = ({ initialPOId, onReceiptCreated }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!initialPOId);
  const [selectedReceipt, setSelectedReceipt] = useState<DbGoodsReceipt | null>(null);

  const goodsReceipts = db.getGoodsReceipts(tenant);
  const purchaseOrders = db.getPurchaseOrders(tenant).filter((po) => po.status !== 'draft');
  const suppliers = db.getSuppliers(tenant);

  const [selectedPOId, setSelectedPOId] = useState(initialPOId || purchaseOrders[0]?.id || '');
  const targetPO = purchaseOrders.find((p) => p.id === selectedPOId);

  const [form, setForm] = useState({
    receiptNumber: `GR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    receivingLocation: 'Central Receiving Warehouse (Bay 2)',
    receivedBy: tenant.userEmail.split('@')[0],
    notes: 'Items inspected and accepted in good order.',
    items: (targetPO?.items || []).map((it) => ({
      poItemId: it.id,
      description: it.description,
      orderedQuantity: it.quantity,
      receivedQuantity: (parseFloat(it.quantity) - parseFloat(it.receivedQuantity || '0')).toString(),
      rejectedQuantity: '0',
      acceptedQuantity: (parseFloat(it.quantity) - parseFloat(it.receivedQuantity || '0')).toString(),
      notes: 'Passed quality check',
    })),
  });

  const handlePOChange = (poId: string) => {
    setSelectedPOId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setForm({
        ...form,
        items: po.items.map((it) => {
          const remaining = Math.max(0, parseFloat(it.quantity) - parseFloat(it.receivedQuantity || '0'));
          return {
            poItemId: it.id,
            description: it.description,
            orderedQuantity: it.quantity,
            receivedQuantity: remaining.toString(),
            rejectedQuantity: '0',
            acceptedQuantity: remaining.toString(),
            notes: 'Passed quality check',
          };
        }),
      });
    }
  };

  const handleCreateReceipt = () => {
    if (!targetPO) {
      alert('Please select an approved Purchase Order to receive.');
      return;
    }

    try {
      procurementService.receiveGoods({
        receiptNumber: form.receiptNumber,
        purchaseOrderId: targetPO.id,
        supplierId: targetPO.supplierId,
        receivingLocation: form.receivingLocation,
        receiptDate: new Date().toISOString().slice(0, 10),
        receivedBy: form.receivedBy,
        notes: form.notes,
        status: 'received',
        items: form.items,
      }, tenant);

      setIsCreateModalOpen(false);
      onReceiptCreated?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredReceipts = goodsReceipts.filter((gr) => {
    return !searchQuery || 
      gr.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gr.receivedBy.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search receipt # or receiver..."
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
          Receive Goods (GRN)
        </Button>
      </div>

      {/* Receipts Register Table */}
      <Card
        title="Goods & Services Receiving Log"
        subtitle={`Tracking ${filteredReceipts.length} physical warehouse receiving documents`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Receipt #</th>
                <th className="px-5 py-3.5">Supplier</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Received By</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredReceipts.map((gr) => {
                const sup = suppliers.find((s) => s.id === gr.supplierId);
                return (
                  <tr key={gr.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{gr.receiptNumber}</td>
                    <td className="px-5 py-3.5 font-semibold text-foreground">{sup?.name || 'Vendor'}</td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">{gr.receiptDate}</td>
                    <td className="px-5 py-3.5 text-foreground/90">{gr.receivingLocation || 'Warehouse'}</td>
                    <td className="px-5 py-3.5 text-foreground/90">{gr.receivedBy}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Received
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => setSelectedReceipt(gr)}
                      >
                        View Items
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No goods receipts recorded. Click "+ Receive Goods (GRN)" to log warehouse receiving.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Goods Receipt Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Receive Goods / Services (GRN)"
        subtitle="Log physical receiving against an authorized purchase order."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateReceipt}>
              Confirm Receiving
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Receipt Reference #"
              value={form.receiptNumber}
              onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
            />
            <Select
              label="Select Purchase Order"
              options={purchaseOrders.map((po) => ({ value: po.id, label: `${po.poNumber} (${po.items.length} items)` }))}
              value={selectedPOId}
              onChange={(e) => handlePOChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Receiving Location"
              value={form.receivingLocation}
              onChange={(e) => setForm({ ...form, receivingLocation: e.target.value })}
            />
            <Input
              label="Received By"
              value={form.receivedBy}
              onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
            />
          </div>

          {/* Receiving Items Table */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase text-foreground/90">Receiving Line Items</span>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={item.poItemId} className="p-3 rounded-lg bg-card/60 border border-border flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-xs text-foreground">{item.description}</div>
                    <div className="text-[10px] text-muted-foreground">Ordered: {item.orderedQuantity}</div>
                  </div>
                  <div className="w-28">
                    <span className="text-[10px] text-muted-foreground block mb-1">Accepted Qty</span>
                    <input
                      type="number"
                      value={item.acceptedQuantity}
                      onChange={(e) => {
                        const updated = [...form.items];
                        updated[idx].acceptedQuantity = e.target.value;
                        updated[idx].receivedQuantity = e.target.value;
                        setForm({ ...form, items: updated });
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-card border border-border rounded text-foreground text-right"
                    />
                  </div>
                  <div className="w-28">
                    <span className="text-[10px] text-muted-foreground block mb-1">Rejected Qty</span>
                    <input
                      type="number"
                      value={item.rejectedQuantity}
                      onChange={(e) => {
                        const updated = [...form.items];
                        updated[idx].rejectedQuantity = e.target.value;
                        setForm({ ...form, items: updated });
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-card border border-border rounded text-foreground text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* View Receipt Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title={`Goods Receipt: ${selectedReceipt.receiptNumber}`}
          subtitle={`Received on ${selectedReceipt.receiptDate} at ${selectedReceipt.receivingLocation}`}
          size="lg"
          footer={
            <Button size="sm" variant="secondary" onClick={() => setSelectedReceipt(null)}>
              Close
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-card/80 text-muted-foreground font-semibold uppercase">
                  <th className="px-4 py-2.5">Item Description</th>
                  <th className="px-4 py-2.5 text-right">Ordered</th>
                  <th className="px-4 py-2.5 text-right">Accepted</th>
                  <th className="px-4 py-2.5 text-right">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {selectedReceipt.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5 font-medium">{it.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{it.orderedQuantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">{it.acceptedQuantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-400">{it.rejectedQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};
