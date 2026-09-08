// ============================================================================
// Project Billing & Milestone Workbench View (Phase 12: Project Billing)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { projectBillingService } from '../services/project-billing.service';
import { projectService } from '../services/project.service';
import { projectCostService } from '../services/project-cost.service';
import { DbProject, DbProjectMilestone, DbProjectCost } from '@/database/types';

export const ProjectBillingView: React.FC = () => {
  const { tenant } = useAuth();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [milestones, setMilestones] = useState<DbProjectMilestone[]>([]);
  const [unbilledCosts, setUnbilledCosts] = useState<DbProjectCost[]>([]);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'milestones' | 'tm'>('milestones');

  // Milestone Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [amount, setAmount] = useState('15000.00');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [completionPercentage, setCompletionPercentage] = useState('25');

  // T&M Modal / State
  const [tmMarkup, setTmMarkup] = useState('15');
  const [tmDescription, setTmDescription] = useState('Monthly T&M Professional Services');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadProjects();
  }, [tenant]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectBillingData(selectedProjectId);
    }
  }, [selectedProjectId, tenant]);

  const loadProjects = () => {
    const list = projectService.getProjects(tenant);
    setProjects(list);
    if (list.length > 0 && !selectedProjectId) {
      setSelectedProjectId(list[0].id);
    }
  };

  const loadProjectBillingData = (pId: string) => {
    const msList = projectBillingService.getMilestones(tenant, pId);
    setMilestones(msList);

    const costs = projectCostService.getCosts(tenant, pId);
    const unbilled = costs.filter((c) => c.isBillable && c.billingStatus === 'unbilled');
    setUnbilledCosts(unbilled);
    setSelectedCostIds([]);
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      projectBillingService.createMilestone({
        projectId: selectedProjectId,
        name: milestoneName,
        amount,
        dueDate,
        completionPercentage: parseFloat(completionPercentage) || 0,
      }, tenant);

      setModalOpen(false);
      setMilestoneName('');
      loadProjectBillingData(selectedProjectId);
    } catch (err: any) {
      alert(err.message || 'Error creating milestone.');
    }
  };

  const handleBillMilestone = (mId: string) => {
    try {
      const result = projectBillingService.billMilestone(mId, tenant);
      setSuccessMsg(`Generated Sales Invoice ${result.salesInvoice.invoiceNumber} for milestone!`);
      loadProjectBillingData(selectedProjectId);
    } catch (err: any) {
      alert(err.message || 'Error billing milestone.');
    }
  };

  const handleBillTimeAndMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCostIds.length === 0) {
      alert('Please select at least one unbilled cost item.');
      return;
    }
    try {
      const result = projectBillingService.billTimeAndMaterials(
        selectedProjectId,
        selectedCostIds,
        parseFloat(tmMarkup) || 0,
        tmDescription,
        tenant
      );
      setSuccessMsg(`Generated T&M Invoice ${result.salesInvoice.invoiceNumber} covering ${result.billedCostsCount} cost items!`);
      loadProjectBillingData(selectedProjectId);
    } catch (err: any) {
      alert(err.message || 'Error generating T&M invoice.');
    }
  };

  const toggleSelectCost = (costId: string) => {
    setSelectedCostIds((prev) => 
      prev.includes(costId) ? prev.filter((id) => id !== costId) : [...prev, costId]
    );
  };

  const selectAllCosts = () => {
    if (selectedCostIds.length === unbilledCosts.length) {
      setSelectedCostIds([]);
    } else {
      setSelectedCostIds(unbilledCosts.map((c) => c.id));
    }
  };

  const selectedTotalCost = unbilledCosts
    .filter((c) => selectedCostIds.includes(c.id))
    .reduce((acc, c) => acc + parseFloat(c.baseAmount || '0'), 0);

  const selectedTotalBillable = selectedTotalCost * (1 + (parseFloat(tmMarkup) || 0) / 100);

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 font-semibold focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === 'milestones' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('milestones')}
          >
            Milestone Schedule
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'tm' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('tm')}
          >
            Time & Material (T&M)
          </Button>
          {activeTab === 'milestones' && (
            <Button size="sm" variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
              Add Milestone
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* TAB 1: MILESTONES */}
      {activeTab === 'milestones' && (
        <Card title="Contract Milestone Billing Schedule" subtitle="IFRS 15 milestone delivery and standard Sales Invoice generation">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Milestone Deliverable</th>
                  <th className="p-3">Target Due Date</th>
                  <th className="p-3 text-right">Completion %</th>
                  <th className="p-3 text-right">Billable Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {milestones.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-cyan-400">#{m.milestoneNumber}</td>
                    <td className="p-3 font-semibold text-slate-200">{m.name}</td>
                    <td className="p-3 text-slate-400 font-mono">{m.dueDate}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{m.completionPercentage}%</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">${parseFloat(m.amount).toLocaleString()}</td>
                    <td className="p-3 text-center"><StatusBadge status={m.status} /></td>
                    <td className="p-3 text-right">
                      {m.status !== 'billed' ? (
                        <Button size="xs" variant="primary" onClick={() => handleBillMilestone(m.id)}>
                          Generate Sales Invoice
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Invoice Generated</span>
                      )}
                    </td>
                  </tr>
                ))}
                {milestones.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      No milestones scheduled for this contract. Click "Add Milestone" to initialize the billing schedule.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: TIME & MATERIAL (T&M) BILLING */}
      {activeTab === 'tm' && (
        <div className="space-y-4">
          <Card
            title="Unbilled Project Costs (Time & Material)"
            subtitle="Select billable labor and material items to compile a client invoice with custom markup"
          >
            <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <span>Selected: <strong className="text-cyan-400">{selectedCostIds.length}</strong> of {unbilledCosts.length} costs</span>
                <span>•</span>
                <span>Base Cost: <strong className="text-slate-200 font-mono">${selectedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>•</span>
                <span>Client Billable ({tmMarkup}% Markup): <strong className="text-emerald-400 font-mono text-sm">${selectedTotalBillable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button size="xs" variant="secondary" onClick={selectAllCosts}>
                  {selectedCostIds.length === unbilledCosts.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-10 text-center">Select</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Incurred Cost</th>
                    <th className="p-3 text-right">Billable ({tmMarkup}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {unbilledCosts.map((c) => {
                    const isSelected = selectedCostIds.includes(c.id);
                    const billableVal = parseFloat(c.baseAmount) * (1 + (parseFloat(tmMarkup) || 0) / 100);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => toggleSelectCost(c.id)}
                        className={`hover:bg-slate-800/40 cursor-pointer ${isSelected ? 'bg-cyan-950/20' : ''}`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded bg-slate-950 border-slate-700 text-cyan-500"
                          />
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{c.transactionDate}</td>
                        <td className="p-3 font-semibold capitalize text-slate-200">{c.costCategory}</td>
                        <td className="p-3 text-slate-300">{c.description}</td>
                        <td className="p-3 text-right font-mono text-slate-400">${parseFloat(c.amount).toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">${billableVal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {unbilledCosts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500">
                        No unbilled costs found for this project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {unbilledCosts.length > 0 && (
              <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
                  <span className="text-slate-400">Markup %:</span>
                  <input
                    type="number"
                    value={tmMarkup}
                    onChange={(e) => setTmMarkup(e.target.value)}
                    className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 font-mono"
                  />
                  <span className="text-slate-400 ml-2">Invoice Title:</span>
                  <input
                    type="text"
                    value={tmDescription}
                    onChange={(e) => setTmDescription(e.target.value)}
                    className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-100 w-64"
                  />
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  disabled={selectedCostIds.length === 0}
                  onClick={handleBillTimeAndMaterial}
                >
                  Generate T&M Sales Invoice (${selectedTotalBillable.toFixed(2)})
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Milestone Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Add Contract Milestone
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Milestone Name / Deliverable *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architecture Signoff & Discovery"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Billable Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Project Completion %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={completionPercentage}
                  onChange={(e) => setCompletionPercentage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button size="sm" variant="primary" type="submit">Save Milestone</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
