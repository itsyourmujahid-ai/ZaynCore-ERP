// ============================================================================
// Sales Orders Register & Order Lifecycle Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Search, 
  Eye, 
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';

export const OrdersView: React.FC<{
  onGenerateInvoice?: (orderId: string) => void;
}> = ({ onGenerateInvoice }) => {
  const { tenant } = useAuth();
  const orders = db.getSalesOrders(tenant);
  const customers = db.getCustomers(tenant);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch = !searchQuery || 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'completed', label: 'Completed' },
            { id: 'draft', label: 'Draft' },
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

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search order # or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card
        title="Sales Orders Register"
        subtitle={`Showing ${filteredOrders.length} confirmed sales orders ready for invoicing & fulfillment`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Order #</th>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Order Date</th>
                <th className="px-5 py-3.5">Delivery Date</th>
                <th className="px-5 py-3.5 text-right">Invoiced Amount</th>
                <th className="px-5 py-3.5 text-right">Total Order Value</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredOrders.map((o) => {
                const customer = customers.find((c) => c.id === o.customerId);
                return (
                  <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-400">{o.orderNumber}</td>
                    <td className="px-5 py-3.5 font-medium text-foreground">{customer?.name || 'Unknown Customer'}</td>
                    <td className="px-5 py-3.5 font-mono text-foreground/90">{o.orderDate}</td>
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">{o.deliveryDate || 'N/A'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-400">${parseFloat(o.invoicedAmount).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">${parseFloat(o.total).toFixed(2)} {o.currency}</td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={o.status} size="xs" /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          Inspect
                        </Button>
                        {o.status !== 'completed' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={<CreditCard className="w-3 h-3" />}
                            onClick={() => onGenerateInvoice?.(o.id)}
                          >
                            Invoice
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No sales orders recorded. Convert an accepted quotation or create an order directly.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Sales Order: ${selectedOrder.orderNumber}`}
          subtitle={`Client: ${customers.find((c) => c.id === selectedOrder.customerId)?.name || 'Customer'}`}
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <StatusBadge status={selectedOrder.status} size="sm" />
              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'completed' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CreditCard className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      onGenerateInvoice?.(selectedOrder.id);
                    }}
                  >
                    Generate Tax Invoice
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-card/70 border border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Order Date</span>
                <span className="text-foreground font-mono mt-0.5">{selectedOrder.orderDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Delivery Target</span>
                <span className="text-foreground font-mono mt-0.5">{selectedOrder.deliveryDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Invoiced So Far</span>
                <span className="text-emerald-400 font-mono font-bold mt-0.5">${parseFloat(selectedOrder.invoicedAmount).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Total Contract</span>
                <span className="text-foreground font-mono font-bold mt-0.5">${parseFloat(selectedOrder.total).toFixed(2)} {selectedOrder.currency}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Tax</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5">{item.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono">${parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">${parseFloat(item.taxAmount).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">${parseFloat(item.total).toFixed(2)}</td>
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
