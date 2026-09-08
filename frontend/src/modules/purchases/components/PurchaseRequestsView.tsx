// ============================================================================
// Internal Purchase Requisitions & Approval Workflow Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ArrowRight
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
import { DbPurchaseRequest, DbPurchaseRequestItem } from '@/database/types';

export const PurchaseRequestsView: React.FC<{
  onCreateRFQFromPR?: (prId: string) => void;
  onCreatePOFromPR?: (prId: string) => void;
}> = ({ onCreateRFQFromPR, onCreatePOFromPR }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<DbPurchaseRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const purchaseRequests = db.getPurchaseRequests(tenant);
  const departments = db.getDepartments(tenant);

  const [form, setForm] = useState({
    requestNumber: `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    requiredDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    departmentId: departments[0]?.id || '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    description: '',
    items: [
      {
        id: 'item-1',
        description: 'Office Workstation Hardware & Monitors',
        quantity: '5',
        estimatedUnitPrice: '450.0000',
        estimatedTotal: '2250.0000',
      },
    ] as DbPurchaseRequestItem[],
  });

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          id: `item-${Date.now()}`,
          description: '',
          quantity: '1',
          estimatedUnitPrice: '0.0000',
          estimatedTotal: '0.0000',
        },
      ],
    });
  };

  const handleRemoveItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx),
    });
  };

  const handleItemChange = (idx: number, field: keyof DbPurchaseRequestItem, val: string) => {
    const updated = [...form.items];
    const item = { ...updated[idx], [field]: val };
    const qty = parseFloat(field === 'quantity' ? val : item.quantity) || 0;
    const price = parseFloat(field === 'estimatedUnitPrice' ? val : item.estimatedUnitPrice) || 0;
    item.estimatedTotal = (qty * price).toFixed(4);
    updated[idx] = item;
    setForm({ ...form, items: updated });
  };

  const totalEstimated = form.items.reduce((sum, i) => sum + (parseFloat(i.estimatedTotal) || 0), 0);

  const handleCreatePR = () => {
    try {
      procurementService.createPurchaseRequest({
        requestNumber: form.requestNumber,
        requestDate: new Date().toISOString().slice(0, 10),
        requiredDate: form.requiredDate,
        requesterId: tenant.userId,
        requesterName: tenant.userEmail.split('@')[0],
        departmentId: form.departmentId || undefined,
        priority: form.priority,
        description: form.description || undefined,
        status: 'draft',
        items: form.items,
        totalEstimatedCost: totalEstimated.toFixed(4),
      }, tenant);

      setIsCreateModalOpen(false);
      setForm({
        requestNumber: `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        requiredDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        departmentId: departments[0]?.id || '',
        priority: 'medium',
        description: '',
        items: [
          {
            id: 'item-1',
            description: '',
            quantity: '1',
            estimatedUnitPrice: '0.0000',
            estimatedTotal: '0.0000',
          },
        ],
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmitPR = (id: string) => {
    procurementService.submitPurchaseRequest(id, tenant);
  };

  const handleApprovePR = (id: string) => {
    procurementService.approvePurchaseRequest(id, 'Approved by departmental manager', tenant);
    if (selectedPR && selectedPR.id === id) {
      setIsDetailModalOpen(false);
    }
  };

  const handleRejectPR = (id: string) => {
    const reason = prompt('Please enter reason for rejection:') || 'Budget exceeded';
    procurementService.rejectPurchaseRequest(id, reason, tenant);
    if (selectedPR && selectedPR.id === id) {
      setIsDetailModalOpen(false);
    }
  };

  const filteredPRs = purchaseRequests.filter((pr) => {
    const matchesStatus = statusFilter === 'all' || pr.status === statusFilter;
    const matchesSearch = !searchQuery || 
      pr.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'draft', label: 'Draft' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all select-none whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search request #, requester, or memo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Request
          </Button>
        </div>
      </div>

      {/* Requests Table Card */}
      <Card
        title="Purchase Requests (Requisitions)"
        subtitle={`Showing ${filteredPRs.length} internal departmental requisitions`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Request #</th>
                <th className="px-5 py-3.5">Requester & Dept</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Required By</th>
                <th className="px-5 py-3.5 text-center">Priority</th>
                <th className="px-5 py-3.5 text-right">Est. Cost</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredPRs.map((pr) => {
                const dept = departments.find((d) => d.id === pr.departmentId);
                return (
                  <tr key={pr.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400">{pr.requestNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-100">{pr.requesterName}</div>
                      <div className="text-[10px] text-slate-500">{dept?.name || 'General Operations'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{pr.requestDate}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">{pr.requiredDate}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        pr.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        pr.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {pr.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-200">
                      ${parseFloat(pr.totalEstimatedCost).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={pr.status} size="xs" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => {
                            setSelectedPR(pr);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          View
                        </Button>

                        {pr.status === 'draft' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleSubmitPR(pr.id)}
                          >
                            Submit
                          </Button>
                        )}

                        {pr.status === 'submitted' && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<CheckCircle2 className="w-3 h-3" />}
                            onClick={() => handleApprovePR(pr.id)}
                          >
                            Approve
                          </Button>
                        )}

                        {pr.status === 'approved' && (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={<ArrowRight className="w-3 h-3" />}
                            onClick={() => onCreateRFQFromPR ? onCreateRFQFromPR(pr.id) : onCreatePOFromPR?.(pr.id)}
                          >
                            Convert to RFQ
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPRs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No purchase requisitions recorded. Click "+ Create Request" to submit an internal requisition.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Purchase Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Request"
        subtitle="Submit internal department requisition for goods or services."
        size="xl"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreatePR}>
              Save Requisition
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Request Number"
              value={form.requestNumber}
              onChange={(e) => setForm({ ...form, requestNumber: e.target.value })}
            />
            <Input
              label="Required Date"
              type="date"
              value={form.requiredDate}
              onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
            />
            <Select
              label="Requesting Department"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Priority Level"
              options={[
                { value: 'low', label: 'Low Priority' },
                { value: 'medium', label: 'Medium Priority' },
                { value: 'high', label: 'High Priority' },
                { value: 'urgent', label: 'Urgent Priority' },
              ]}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
            />
            <Input
              label="Description / Purpose"
              placeholder="e.g. Q2 Hardware upgrades for design staff"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Line Items Editor */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-300">Requisition Items</span>
              <Button size="xs" variant="outline" icon={<Plus className="w-3 h-3" />} onClick={handleAddItem}>
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Item Description / Service Details"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-100"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-100 text-right"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      placeholder="Est. Price"
                      value={item.estimatedUnitPrice}
                      onChange={(e) => handleItemChange(idx, 'estimatedUnitPrice', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-100 text-right"
                    />
                  </div>
                  <div className="w-28 text-right font-mono text-xs font-bold text-slate-200">
                    ${parseFloat(item.estimatedTotal || '0').toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 text-xs font-mono font-bold text-slate-200">
              Total Estimated Requisition Cost: ${totalEstimated.toFixed(2)}
            </div>
          </div>
        </div>
      </Modal>

      {/* PR Details View Modal */}
      {selectedPR && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Purchase Request: ${selectedPR.requestNumber}`}
          subtitle={`Status: ${selectedPR.status.toUpperCase()} • Priority: ${selectedPR.priority.toUpperCase()}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {selectedPR.status === 'submitted' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                      onClick={() => handleRejectPR(selectedPR.id)}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => handleApprovePR(selectedPR.id)}
                    >
                      Approve Request
                    </Button>
                  </>
                )}
              </div>
              <Button size="sm" variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500">Requester:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedPR.requesterName}</p>
              </div>
              <div>
                <span className="text-slate-500">Date:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedPR.requestDate}</p>
              </div>
              <div>
                <span className="text-slate-500">Required Date:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedPR.requiredDate}</p>
              </div>
              <div>
                <span className="text-slate-500">Total Est. Cost:</span>
                <p className="font-semibold text-brand-400 mt-0.5 font-mono">${parseFloat(selectedPR.totalEstimatedCost).toFixed(2)}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase">
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-4 py-2.5 text-right">Quantity</th>
                    <th className="px-4 py-2.5 text-right">Est. Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {selectedPR.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 font-medium">{it.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{it.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono">${parseFloat(it.estimatedUnitPrice).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">${parseFloat(it.estimatedTotal).toFixed(2)}</td>
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
