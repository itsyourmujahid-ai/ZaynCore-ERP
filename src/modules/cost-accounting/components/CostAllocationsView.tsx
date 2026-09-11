// ============================================================================
// Centralized Cost Allocations Workbench (Phase 13)
// ============================================================================

import React, { useState } from 'react';
import { 
  Split, 
  Plus, 
  Play, 
  CheckCircle2, 
  Download, 
  Layers
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { costAllocationService } from '../services/cost-allocation.service';
import { costAccountingReportsService } from '../services/cost-accounting-reports.service';
import { AllocationBasis, AllocationTargetType } from '@/database/types';

export const CostAllocationsView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'runs'>('rules');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  // Run Modal State
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [runPeriodId, setRunPeriodId] = useState('');
  const [runAmount, setRunAmount] = useState('5000.00');
  const [runMemo, setRunMemo] = useState('');

  // Rule Modal State
  const [ruleCode, setRuleCode] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [allocationBasis, setAllocationBasis] = useState<AllocationBasis>('percentage');
  const [targetType, setTargetType] = useState<AllocationTargetType>('department');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targets, setTargets] = useState<Array<{ entityId: string; entityName: string; weight: string }>>([
    { entityId: '', entityName: '', weight: '50' },
    { entityId: '', entityName: '', weight: '50' },
  ]);

  const [errorMessage, setErrorMessage] = useState('');

  const rules = costAllocationService.getRules(tenant);
  const runs = costAllocationService.getRuns(tenant);
  const periods = db.getAccountingPeriods(tenant);
  const accounts = db.getAccounts(tenant);
  const departments = db.getDepartments(tenant);
  const costCenters = db.getCostCenters(tenant);
  const businessUnits = db.getBusinessUnits(tenant);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const validTargets = targets.filter((t) => t.entityId && parseFloat(t.weight) > 0);
      if (validTargets.length === 0) {
        throw new Error('Please specify at least one valid target entity with a positive weight/percentage.');
      }

      costAllocationService.createRule({
        code: ruleCode.trim().toUpperCase(),
        name: ruleName.trim(),
        description: ruleDescription.trim() || undefined,
        sourceAccountId: sourceAccountId || undefined,
        allocationBasis,
        targetDimensionType: targetType,
        targets: validTargets.map((t) => ({
          targetEntityType: targetType,
          targetEntityId: t.entityId,
          targetEntityName: t.entityName,
          weight: t.weight,
        })),
      }, tenant);

      setIsRuleModalOpen(false);
      setRuleCode('');
      setRuleName('');
      setRuleDescription('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create allocation rule.');
    }
  };

  const handleExecuteRun = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const period = periods.find((p) => p.id === runPeriodId) || periods[0];
      costAllocationService.executeAllocationRun({
        allocationRuleId: selectedRuleId || (rules.length > 0 ? rules[0].id : ''),
        runDate,
        periodId: period ? period.id : 'p-2026-01',
        totalAllocatedAmount: runAmount,
        memo: runMemo || undefined,
      }, tenant);

      setIsRunModalOpen(false);
      setActiveTab('runs');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute allocation run.');
    }
  };

  const handleApprove = (runId: string) => {
    try {
      costAllocationService.approveAllocationRun(runId, tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePost = (runId: string) => {
    try {
      costAllocationService.postAllocationRun(runId, tenant);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = () => {
    const csv = costAccountingReportsService.exportAllocationsToCsv(tenant);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cost_Allocations_Register.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'rules'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            Allocation Rules ({rules.length})
          </button>

          <button
            onClick={() => setActiveTab('runs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'runs'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Allocation Runs Ledger ({runs.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'runs' && runs.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCsv}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsRunModalOpen(true)}
            icon={<Play className="w-3.5 h-3.5" />}
          >
            Execute Allocation Run
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRuleModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Allocation Rule
          </Button>
        </div>
      </div>

      {/* TAB 1: ALLOCATION RULES */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              title={rule.name}
              subtitle={`${rule.code} • Basis: ${rule.allocationBasis.replace('_', ' ').toUpperCase()} • Target: ${rule.targetDimensionType.toUpperCase()}`}
              action={<StatusBadge status={rule.status === 'active' ? 'active' : 'draft'} />}
            >
              <div className="space-y-3 text-xs">
                {rule.description && (
                  <p className="text-muted-foreground text-[11px]">{rule.description}</p>
                )}

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Target Distributions ({rule.targets.length})
                  </div>
                  <div className="space-y-1.5">
                    {rule.targets.map((tgt, idx) => (
                      <div key={idx} className="p-2 rounded bg-card/40 border border-border/60 flex items-center justify-between">
                        <span className="text-foreground font-medium">{tgt.targetEntityName}</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {(parseFloat(tgt.percentage) * 100).toFixed(1)}% (Weight: {tgt.weight})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: ALLOCATION RUNS LEDGER */}
      {activeTab === 'runs' && (
        <Card
          title="Cost Allocation Runs & GL Postings"
          subtitle="Audit ledger of executed overhead reallocations and double-entry General Ledger journals"
        >
          {runs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No allocation runs executed yet. Click 'Execute Allocation Run' to calculate and post your first overhead distribution.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold bg-card/40">
                    <th className="px-4 py-2.5">Run Number</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5 text-right">Total Allocated</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5">GL Journal Reference</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-foreground">{run.runNumber}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{run.memo}</div>
                      </td>

                      <td className="px-4 py-3 text-foreground/90">
                        {run.runDate}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        ${parseFloat(run.totalAllocatedAmount).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <StatusBadge 
                          status={run.status === 'posted' ? 'posted' : run.status === 'approved' ? 'pending' : 'draft'} 
                        />
                      </td>

                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                        {run.journalEntryId ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {run.journalEntryId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Unposted Draft</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {run.status === 'draft' && (
                            <button
                              onClick={() => handleApprove(run.id)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30"
                            >
                              Approve
                            </button>
                          )}
                          {(run.status === 'approved' || run.status === 'draft') && (
                            <button
                              onClick={() => handlePost(run.id)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                              Post to GL
                            </button>
                          )}
                          {run.status === 'posted' && (
                            <span className="text-[10px] font-bold text-emerald-400 font-mono">Posted</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Execute Run Modal */}
      <Modal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        title="Execute Cost Allocation Run"
        subtitle="Calculate shared cost distribution across dimensions and prepare double-entry GL voucher"
        size="md"
      >
        <form onSubmit={handleExecuteRun} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Allocation Rule *</label>
            <select
              required
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              <option value="">Select allocation rule...</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Execution Date</label>
              <input
                type="date"
                required
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Total Pool Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={runAmount}
                onChange={(e) => setRunAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono text-right"
              />
            </div>
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Accounting Period</label>
            <select
              value={runPeriodId}
              onChange={(e) => setRunPeriodId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.startDate} to {p.endDate})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Memo / Allocation Reason</label>
            <input
              type="text"
              placeholder="e.g. Monthly Headquarter Rent Allocation for Period 01"
              value={runMemo}
              onChange={(e) => setRunMemo(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsRunModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Compute & Create Draft Run
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Allocation Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Define Cost Allocation Rule"
        subtitle="Configure systematic distribution parameters, target dimensions, and weights"
        size="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Rule Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. ALLOC-IT-OVERHEAD"
                value={ruleCode}
                onChange={(e) => setRuleCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground uppercase"
              />
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Rule Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. IT Software & Infrastructure Allocation"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Allocation Basis</label>
              <select
                value={allocationBasis}
                onChange={(e) => setAllocationBasis(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                <option value="percentage">Percentage Split (%)</option>
                <option value="headcount">Employee Headcount Ratio</option>
                <option value="area">Square Footage / Floor Area</option>
                <option value="revenue">Revenue Generated Ratio</option>
                <option value="usage">Resource Usage / Machine Hours</option>
                <option value="equal">Equal Distribution</option>
                <option value="fixed_amount">Fixed Amount Distribution</option>
              </select>
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Target Dimension Type</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                <option value="department">Departments</option>
                <option value="cost_center">Cost Centers</option>
                <option value="business_unit">Business Units</option>
                <option value="project">Projects</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Source Clearing GL Account (Optional)</label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              <option value="">Default Clearing Account (#6080 / System Default)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>

          {/* Targets Dynamic List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-foreground/90 font-medium">Target Entities & Weights</label>
              <button
                type="button"
                onClick={() => setTargets([...targets, { entityId: '', entityName: '', weight: '25' }])}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                + Add Target
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {targets.map((tgt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={tgt.entityId}
                    onChange={(e) => {
                      const updated = [...targets];
                      const selectedId = e.target.value;
                      let name = '';
                      if (targetType === 'department') {
                        name = departments.find((d) => d.id === selectedId)?.name || '';
                      } else if (targetType === 'cost_center') {
                        name = costCenters.find((c) => c.id === selectedId)?.name || '';
                      } else if (targetType === 'business_unit') {
                        name = businessUnits.find((b) => b.id === selectedId)?.name || '';
                      }
                      updated[idx].entityId = selectedId;
                      updated[idx].entityName = name;
                      setTargets(updated);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs"
                  >
                    <option value="">Select target {targetType}...</option>
                    {targetType === 'department' && departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                    {targetType === 'cost_center' && costCenters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                    {targetType === 'business_unit' && businessUnits.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.1"
                    placeholder="Weight"
                    value={tgt.weight}
                    onChange={(e) => {
                      const updated = [...targets];
                      updated[idx].weight = e.target.value;
                      setTargets(updated);
                    }}
                    className="w-24 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono text-xs text-right"
                  />

                  {targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTargets(targets.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-rose-400 p-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Allocation Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
