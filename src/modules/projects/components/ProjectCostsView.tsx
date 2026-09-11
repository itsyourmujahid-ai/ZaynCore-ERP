// ============================================================================
// Project Costs Ledger & Operational Ingestion View (Phase 12)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Plus, 
  Clock
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { projectCostService } from '../services/project-cost.service';
import { projectService } from '../services/project.service';
import { DbProject, DbProjectCost, ProjectCostCategory } from '@/database/types';

export const ProjectCostsView: React.FC = () => {
  const { tenant } = useAuth();
  const [costs, setCosts] = useState<DbProjectCost[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Record Cost Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [costCategory, setCostCategory] = useState<ProjectCostCategory>('materials');
  const [amount, setAmount] = useState('1500.00');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  // Time Allocation Modal
  const [employeeName, setEmployeeName] = useState('Senior Systems Architect');
  const [hours, setHours] = useState('12.5');
  const [hourlyRate, setHourlyRate] = useState('120.00');

  useEffect(() => {
    loadData();
  }, [tenant]);

  const loadData = () => {
    const projs = projectService.getProjects(tenant);
    setProjects(projs);
    if (projs.length > 0 && !targetProjectId) {
      setTargetProjectId(projs[0].id);
    }
    const allCosts = projectCostService.getCosts(tenant);
    setCosts(allCosts);
  };

  const filteredCosts = costs.filter((c) => {
    const matchProj = selectedProjectId === 'all' || c.projectId === selectedProjectId;
    const matchCat = categoryFilter === 'all' || c.costCategory === categoryFilter;
    const matchSearch = c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchProj && matchCat && matchSearch;
  });

  const totalFilteredAmount = filteredCosts.reduce((acc, c) => acc + parseFloat(c.baseAmount || '0'), 0);

  const handleRecordCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjectId) return;
    try {
      projectCostService.recordCost({
        projectId: targetProjectId,
        costCategory,
        sourceModule: 'manual_adjustment',
        sourceType: 'direct_expense',
        sourceId: `exp-${Date.now()}`,
        documentNumber: `EXP-${Date.now().toString(36).toUpperCase()}`,
        amount,
        description: description || `Direct ${costCategory} expenditure`,
        isBillable,
      }, tenant);

      setModalOpen(false);
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error recording project cost.');
    }
  };

  const handleAllocateLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjectId) return;
    try {
      projectCostService.recordPayrollLaborAllocation({
        projectId: targetProjectId,
        employeeId: 'emp-tech-lead',
        employeeName,
        hours,
        hourlyRate,
        notes: `Direct project engineering by ${employeeName}`,
        isBillable: true,
        postJournal: true,
      }, tenant);

      setTimeModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error allocating labor hours.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/60 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search costs by description, doc #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 bg-card border border-border rounded text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-card border border-border rounded text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Cost Categories</option>
            <option value="labor">Labor</option>
            <option value="materials">Materials</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="equipment">Equipment</option>
            <option value="overhead">Overhead</option>
            <option value="other">Other</option>
          </select>

          <Button size="sm" variant="secondary" icon={<Clock className="w-4 h-4" />} onClick={() => setTimeModalOpen(true)}>
            Allocate Labor Hours
          </Button>

          <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            Record Direct Cost
          </Button>
        </div>
      </div>

      {/* Costs Ledger Table */}
      <Card
        title="Project Direct Costs Ledger"
        subtitle={`${filteredCosts.length} items • Total Sourced Costs: $${totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground/90">
            <thead className="bg-card/60 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Project</th>
                <th className="p-3">Category</th>
                <th className="p-3">Provenance Source</th>
                <th className="p-3">Doc #</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Incurred Amount</th>
                <th className="p-3 text-center">Billing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCosts.map((c) => {
                const p = projects.find((proj) => proj.id === c.projectId);
                return (
                  <tr key={c.id} className="hover:bg-muted/40 font-mono">
                    <td className="p-3 text-muted-foreground">{c.transactionDate}</td>
                    <td className="p-3 font-sans font-bold text-cyan-400">{p?.code || c.projectId}</td>
                    <td className="p-3 font-sans capitalize font-semibold text-foreground">{c.costCategory}</td>
                    <td className="p-3 text-[11px] text-purple-400 uppercase font-mono">
                      {c.sourceModule}:{c.sourceType}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.documentNumber}</td>
                    <td className="p-3 font-sans text-foreground/90">{c.description}</td>
                    <td className="p-3 text-right font-bold text-foreground">${parseFloat(c.amount).toLocaleString()}</td>
                    <td className="p-3 text-center"><StatusBadge status={c.billingStatus} /></td>
                  </tr>
                );
              })}
              {filteredCosts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground font-sans">
                    No project costs recorded yet. Costs from AP bills, material issues, and payroll allocations will display here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Cost Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                Record Project Cost
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleRecordCost} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Target Project *</label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Cost Category *</label>
                  <select
                    value={costCategory}
                    onChange={(e) => setCostCategory(e.target.value as ProjectCostCategory)}
                    className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground focus:outline-none"
                  >
                    <option value="materials">Materials</option>
                    <option value="labor">Labor</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="equipment">Equipment</option>
                    <option value="overhead">Overhead</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Incurred Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field testing calibration & supplies"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cbBillable"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  className="rounded bg-card border-border"
                />
                <label htmlFor="cbBillable" className="text-foreground/90">Billable to Client</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button size="sm" variant="primary" type="submit">Record Expense</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labor Time Allocation Modal */}
      {timeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Allocate Labor Hours & Post Journal
              </h3>
              <button onClick={() => setTimeModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleAllocateLabor} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Project *</label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Employee / Resource Name *</label>
                <input
                  type="text"
                  required
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Hours Worked *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Hourly Billing/Cost Rate ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-card border border-border rounded text-foreground"
                  />
                </div>
              </div>

              <div className="p-3 bg-card/80 rounded border border-border text-[11px] text-muted-foreground">
                Total Direct Labor Charge: <strong className="text-emerald-400 font-mono">${((parseFloat(hours) || 0) * (parseFloat(hourlyRate) || 0)).toFixed(2)}</strong>
                <p className="mt-1 text-muted-foreground">Automatically executes GL double entry: Dr Project Labor (#5010), Cr Accrued Salaries (#2300).</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => setTimeModalOpen(false)}>Cancel</Button>
                <Button size="sm" variant="primary" type="submit">Allocate & Post GL</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
