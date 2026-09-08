// ============================================================================
// Cost Centers Directory & Performance Workbench (Phase 13)
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { costCenterService, CostCenterPnLSummary } from '../services/cost-center.service';

export const CostCentersView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formManagerName, setFormManagerName] = useState('');
  const [formBudgetAmount, setFormBudgetAmount] = useState('10000.00');
  const [formNotes, setFormNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const costCenters = costCenterService.getCostCenters(tenant);
  const departments = db.getDepartments(tenant);
  const branches = db.getBranches(tenant);

  // Filter cost centers
  const filteredCostCenters = costCenters.filter((cc) => 
    cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const summaries: CostCenterPnLSummary[] = filteredCostCenters.map((cc) => 
    costCenterService.calculateCostCenterPnL(cc.id, tenant)
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      costCenterService.createCostCenter({
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        description: formDescription.trim(),
        departmentId: formDepartmentId || undefined,
        branchId: formBranchId || undefined,
        managerName: formManagerName.trim() || undefined,
        budgetAmount: formBudgetAmount || '0.0000',
        notes: formNotes.trim(),
      }, tenant);

      setIsCreateModalOpen(false);
      setFormCode('');
      setFormName('');
      setFormDescription('');
      setFormDepartmentId('');
      setFormBranchId('');
      setFormManagerName('');
      setFormBudgetAmount('10000.00');
      setFormNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create cost center.');
    }
  };

  const selectedSummary = selectedCostCenterId 
    ? costCenterService.calculateCostCenterPnL(selectedCostCenterId, tenant)
    : null;

  const selectedTransactions = selectedCostCenterId
    ? costCenterService.getCostCenterTransactions(selectedCostCenterId, tenant)
    : [];

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search cost centers by code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Cost Center
        </Button>
      </div>

      {/* Main Content Grid with Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Centers Table List */}
        <div className={`space-y-3 ${selectedCostCenterId ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <Card
            title={`Cost Centers Directory (${filteredCostCenters.length})`}
            subtitle="Operational divisions and project cost tracking dimensions"
          >
            {summaries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No cost centers found. Click 'Add Cost Center' to create your first operational dimension.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                      <th className="px-4 py-2.5">Cost Center</th>
                      <th className="px-4 py-2.5">Department</th>
                      <th className="px-4 py-2.5 text-right">Budget</th>
                      <th className="px-4 py-2.5 text-right">Actual Incurred</th>
                      <th className="px-4 py-2.5 text-right">Variance</th>
                      <th className="px-4 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {summaries.map((cc) => {
                      const isSelected = selectedCostCenterId === cc.costCenterId;
                      return (
                        <tr 
                          key={cc.costCenterId}
                          onClick={() => setSelectedCostCenterId(isSelected ? null : cc.costCenterId)}
                          className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-brand-500/10' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-200">{cc.costCenterCode}</div>
                            <div className="text-[11px] text-slate-400">{cc.costCenterName}</div>
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            {cc.departmentName || <span className="text-slate-500">Unassigned</span>}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-slate-300">
                            ${parseFloat(cc.budgetAmount).toFixed(2)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-semibold text-rose-400">
                            ${parseFloat(cc.totalCost).toFixed(2)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold ${
                              cc.isFavorable ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {cc.isFavorable ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              ${parseFloat(cc.varianceAmount).toFixed(2)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            >
                              {isSelected ? 'Close' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Detail Inspection Drawer */}
        {selectedSummary && (
          <div className="space-y-4">
            <Card
              title={`${selectedSummary.costCenterCode} Performance`}
              subtitle={selectedSummary.costCenterName}
              action={
                <button
                  onClick={() => setSelectedCostCenterId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              }
            >
              <div className="space-y-4 text-xs">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Cost</span>
                    <span className="font-mono text-sm font-bold text-rose-400">
                      ${parseFloat(selectedSummary.totalCost).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Revenue</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      ${parseFloat(selectedSummary.actualRevenue).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Direct Incurred:</span>
                    <span className="font-mono text-slate-200">${parseFloat(selectedSummary.actualCost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Allocated Overhead:</span>
                    <span className="font-mono text-amber-400">${parseFloat(selectedSummary.allocatedOverhead).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                    <span>Net Margin:</span>
                    <span className={`font-mono font-bold ${parseFloat(selectedSummary.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${parseFloat(selectedSummary.netProfit).toFixed(2)} ({selectedSummary.marginPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Attributed Transactions */}
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Attributed Postings ({selectedTransactions.length})
                  </div>
                  {selectedTransactions.length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-950/40 text-center text-slate-500 text-[11px]">
                      No journal lines tagged to this cost center yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedTransactions.map((tx, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-300">
                            <span className="font-mono font-bold text-slate-200">{tx.entryNumber}</span>
                            <span className="text-slate-500">{tx.postingDate}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span className="truncate max-w-[140px]">{tx.accountCode} - {tx.accountName}</span>
                            <span className="font-mono font-semibold text-rose-400">${parseFloat(tx.amount).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Cost Center Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Operational Cost Center"
        subtitle="Define a new operational dimension for expense tracking and budgeting"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Cost Center Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. CC-SALES-EXP"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Cost Center Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Commercial Sales Operations"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Parent Department</label>
              <select
                value={formDepartmentId}
                onChange={(e) => setFormDepartmentId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Operating Branch</label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              >
                <option value="">All Branches / HQ</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Assigned Manager</label>
              <input
                type="text"
                placeholder="e.g. Regional Sales Manager"
                value={formManagerName}
                onChange={(e) => setFormManagerName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Annual Budget Target ($)</label>
              <input
                type="number"
                step="0.01"
                value={formBudgetAmount}
                onChange={(e) => setFormBudgetAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description & Scope</label>
            <textarea
              rows={2}
              placeholder="Operational scope, expense categories, and division responsibility..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Cost Center
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
