// ============================================================================
// Project Budgets & Budget vs Actual View (Phase 12: Project Accounting)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { projectBudgetService, ProjectBudgetVsActualSummary } from '../services/project-budget.service';
import { projectService } from '../services/project.service';
import { DbProject, DbProjectBudget } from '@/database/types';

export const ProjectBudgetsView: React.FC = () => {
  const { tenant } = useAuth();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [bvaSummary, setBvaSummary] = useState<ProjectBudgetVsActualSummary | null>(null);
  const [budgets, setBudgets] = useState<DbProjectBudget[]>([]);

  // Create Budget Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [laborCost, setLaborCost] = useState('20000.00');
  const [materialCost, setMaterialCost] = useState('15000.00');
  const [subcontractorCost, setSubcontractorCost] = useState('10000.00');
  const [equipmentCost, setEquipmentCost] = useState('5000.00');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadProjects();
  }, [tenant]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectBudgetData(selectedProjectId);
    }
  }, [selectedProjectId, tenant]);

  const loadProjects = () => {
    const list = projectService.getProjects(tenant);
    setProjects(list);
    if (list.length > 0 && !selectedProjectId) {
      setSelectedProjectId(list[0].id);
    }
  };

  const loadProjectBudgetData = (pId: string) => {
    const bva = projectBudgetService.getBudgetVsActual(pId, tenant);
    setBvaSummary(bva);
    const blist = projectBudgetService.getBudgets(tenant, pId);
    setBudgets(blist);
  };

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setErrorMsg('');
    try {
      projectBudgetService.createBudget({
        projectId: selectedProjectId,
        budgetName: budgetName || 'Project Baseline Budget',
        lines: [
          { costCategory: 'labor', plannedCost: laborCost, plannedRevenue: '30000.00' },
          { costCategory: 'materials', plannedCost: materialCost, plannedRevenue: '20000.00' },
          { costCategory: 'subcontractor', plannedCost: subcontractorCost, plannedRevenue: '15000.00' },
          { costCategory: 'equipment', plannedCost: equipmentCost, plannedRevenue: '10000.00' },
        ],
      }, tenant);

      setModalOpen(false);
      loadProjectBudgetData(selectedProjectId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating budget.');
    }
  };

  const handleApproveBudget = (bId: string) => {
    try {
      projectBudgetService.approveBudget(bId, tenant);
      loadProjectBudgetData(selectedProjectId);
    } catch (err: any) {
      alert(err.message || 'Error approving budget.');
    }
  };

  const handleReviseBudget = (bId: string) => {
    const reason = prompt('Enter revision change justification / client scope change reason:');
    if (!reason) return;
    try {
      projectBudgetService.reviseBudget(bId, reason, tenant);
      loadProjectBudgetData(selectedProjectId);
    } catch (err: any) {
      alert(err.message || 'Error revising budget.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Project Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Active Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 font-semibold focus:outline-none focus:border-cyan-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Create Budget Version
          </Button>
        </div>
      </div>

      {/* Budget vs Actual Matrix */}
      {bvaSummary && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Total Planned Cost">
              <div className="p-4 space-y-1">
                <div className="text-2xl font-bold font-mono text-slate-100">${parseFloat(bvaSummary.totalPlannedCost).toLocaleString()}</div>
                <div className="text-xs text-slate-400">Budget Active Version: v{bvaSummary.activeBudgetVersion || 1}</div>
              </div>
            </Card>
            <Card title="Total Actual Incurred Cost">
              <div className="p-4 space-y-1">
                <div className="text-2xl font-bold font-mono text-rose-400">${parseFloat(bvaSummary.totalActualCost).toLocaleString()}</div>
                <div className="text-xs text-slate-400">Sourced from AP, Inventory & Payroll</div>
              </div>
            </Card>
            <Card title="Cost Variance">
              <div className="p-4 space-y-1">
                <div className={`text-2xl font-bold font-mono ${parseFloat(bvaSummary.totalCostVariance) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${parseFloat(bvaSummary.totalCostVariance).toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">
                  {bvaSummary.totalCostVariancePercentage}% {parseFloat(bvaSummary.totalCostVariance) >= 0 ? 'Favorable' : 'Over Budget'}
                </div>
              </div>
            </Card>
            <Card title="Remaining Budget">
              <div className="p-4 space-y-1">
                <div className="text-2xl font-bold font-mono text-cyan-400">${parseFloat(bvaSummary.totalRemainingBudget).toLocaleString()}</div>
                <div className="text-xs text-slate-400">Available expenditure ceiling</div>
              </div>
            </Card>
          </div>

          {/* Granular Category Matrix Table */}
          <Card title="Cost Category Budget vs Actual Matrix" subtitle="Drilldown by operational expenditure type">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-3">Cost Category</th>
                    <th className="p-3 text-right">Planned Cost</th>
                    <th className="p-3 text-right">Actual Cost</th>
                    <th className="p-3 text-right">Cost Variance ($)</th>
                    <th className="p-3 text-right">Variance %</th>
                    <th className="p-3 text-right">Remaining Budget</th>
                    <th className="p-3 text-right">Planned Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {bvaSummary.categories.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-800/40">
                      <td className="p-3 font-sans font-semibold capitalize text-slate-200">{c.category}</td>
                      <td className="p-3 text-right text-slate-300">${parseFloat(c.plannedCost).toLocaleString()}</td>
                      <td className="p-3 text-right text-rose-400">${parseFloat(c.actualCost).toLocaleString()}</td>
                      <td className={`p-3 text-right font-bold ${parseFloat(c.costVariance) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${parseFloat(c.costVariance).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-sans text-slate-300">{c.costVariancePercentage}%</td>
                      <td className="p-3 text-right text-cyan-400">${parseFloat(c.remainingBudget).toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-400">${parseFloat(c.plannedRevenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Budget Versions List */}
          <Card title="Controlled Budget Revisions & Versions" subtitle="Immutable audit trail of approved budget baselines">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-3">Version</th>
                    <th className="p-3">Budget Name</th>
                    <th className="p-3 text-right">Planned Cost</th>
                    <th className="p-3 text-right">Planned Revenue</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {budgets.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-cyan-400">v{b.versionNumber}</td>
                      <td className="p-3 font-semibold text-slate-200">{b.budgetName}</td>
                      <td className="p-3 text-right font-mono text-slate-300">${parseFloat(b.totalPlannedCost).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-400">${parseFloat(b.totalPlannedRevenue).toLocaleString()}</td>
                      <td className="p-3"><StatusBadge status={b.status} /></td>
                      <td className="p-3 text-slate-400">{b.notes || '—'}</td>
                      <td className="p-3 text-right space-x-2">
                        {b.status === 'draft' || b.status === 'submitted' ? (
                          <Button size="xs" variant="primary" onClick={() => handleApproveBudget(b.id)}>
                            Approve Version
                          </Button>
                        ) : null}
                        {b.status === 'active' || b.status === 'approved' ? (
                          <Button size="xs" variant="secondary" onClick={() => handleReviseBudget(b.id)}>
                            Revise Budget →
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Create Budget Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                Create Project Budget Version
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateBudget} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Budget Version Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Construction Baseline v1"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Direct Labor Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Materials / Stock Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Subcontractor Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={subcontractorCost}
                    onChange={(e) => setSubcontractorCost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Equipment / Machinery Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={equipmentCost}
                    onChange={(e) => setEquipmentCost(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button size="sm" variant="primary" type="submit">Save Budget</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
