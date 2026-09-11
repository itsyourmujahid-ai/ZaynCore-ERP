// ============================================================================
// 360-Degree Project Profile & Work-In-Progress Modal (Phase 12)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  PieChart,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { projectService } from '../services/project.service';
import { projectCostService } from '../services/project-cost.service';
import { projectBillingService } from '../services/project-billing.service';
import { projectProfitabilityService, ProjectProfitabilityMetrics } from '../services/project-profitability.service';
import { projectWipService } from '../services/project-wip.service';
import { projectTaskService } from '../services/project-task.service';
import { 
  DbProject, 
  DbProjectTask, 
  DbProjectCost, 
  DbProjectMilestone, 
  DbProjectWipBalance 
} from '@/database/types';

interface ProjectProfileModalProps {
  projectId: string;
  onClose: () => void;
  onRefreshParent?: () => void;
}

export const ProjectProfileModal: React.FC<ProjectProfileModalProps> = ({
  projectId,
  onClose,
  onRefreshParent,
}) => {
  const { tenant } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Loaded entities
  const [project, setProject] = useState<DbProject | null>(null);
  const [metrics, setMetrics] = useState<ProjectProfitabilityMetrics | null>(null);
  const [wip, setWip] = useState<DbProjectWipBalance | null>(null);
  const [tasks, setTasks] = useState<DbProjectTask[]>([]);
  const [costs, setCosts] = useState<DbProjectCost[]>([]);
  const [milestones, setMilestones] = useState<DbProjectMilestone[]>([]);

  // Action states
  const [closureResult, setClosureResult] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string>('');

  useEffect(() => {
    loadProjectData();
  }, [projectId, tenant]);

  const loadProjectData = () => {
    const p = projectService.getProjectById(projectId, tenant);
    if (!p) return;
    setProject(p);

    const m = projectProfitabilityService.calculateProjectProfitability(projectId, tenant);
    setMetrics(m);

    const w = projectWipService.getWipBalance(projectId, tenant);
    setWip(w);

    setTasks(projectTaskService.getTasks(tenant, projectId));
    setCosts(projectCostService.getCosts(tenant, projectId));
    setMilestones(projectBillingService.getMilestones(tenant, projectId));
  };

  const handleBillMilestone = (milestoneId: string) => {
    try {
      const result = projectBillingService.billMilestone(milestoneId, tenant);
      setActionMessage(`Successfully generated Sales Invoice ${result.salesInvoice.invoiceNumber} for milestone!`);
      loadProjectData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Error billing milestone.');
    }
  };

  const handleCapitalizeWip = () => {
    const amtStr = prompt('Enter cost amount to capitalize to WIP Asset (#1350):', '5000.00');
    if (!amtStr) return;
    try {
      projectWipService.capitalizeCostsToWip(projectId, amtStr, 'Manual cost capitalization to WIP', tenant);
      setActionMessage(`Successfully capitalized $${amtStr} to Project WIP Asset.`);
      loadProjectData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Error capitalizing WIP.');
    }
  };

  const handleTransferWipToCogs = () => {
    const amtStr = prompt('Enter WIP amount to realize into COGS (#5010):', wip?.currentWipBalance || '5000.00');
    if (!amtStr) return;
    try {
      projectWipService.transferWipToCogs(projectId, amtStr, 'WIP realization to COGS', tenant);
      setActionMessage(`Successfully realized $${amtStr} from WIP into COGS.`);
      loadProjectData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Error transferring WIP.');
    }
  };

  const handleCheckClosure = () => {
    const val = projectService.validateProjectClosure(projectId, tenant);
    setClosureResult(val);
  };

  const handleExecuteClose = () => {
    if (confirm('Execute formal project closure? This locks transactions and finalizes accounting.')) {
      try {
        projectService.closeProject(projectId, tenant);
        setActionMessage('Project has been successfully closed and locked.');
        loadProjectData();
        if (onRefreshParent) onRefreshParent();
      } catch (err: any) {
        alert(err.message || 'Pre-closure validation failed.');
      }
    }
  };

  if (!project || !metrics) return null;

  const subTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
    { id: 'budgets', label: 'Budgets & BvA' },
    { id: 'costs', label: `Costs (${costs.length})` },
    { id: 'billing', label: `Milestones (${milestones.length})` },
    { id: 'wip', label: 'WIP Accounting' },
    { id: 'profitability', label: 'Profitability' },
    { id: 'close', label: 'Governance & Closure' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                {project.code}
              </span>
              <StatusBadge status={project.status} />
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground capitalize">{project.billingMethod.replace('_', ' ')}</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
            <div className="text-xs text-muted-foreground flex items-center gap-4">
              <span>Customer: <strong className="text-foreground">{project.customerName || 'Internal R&D'}</strong></span>
              <span>Manager: <strong className="text-foreground">{project.projectManagerName || 'Unassigned'}</strong></span>
              <span>Dates: {project.startDate} to {project.endDate || 'Ongoing'}</span>
            </div>
          </div>

          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm p-1">
            ✕
          </button>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className="p-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage('')} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-1 border-b border-border px-4 bg-card/30 overflow-x-auto select-none">
          {subTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeSubTab === t.id
                  ? 'border-cyan-500 text-cyan-400 font-semibold bg-card/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs text-foreground/90">
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  label="Contract Value"
                  value={`$${parseFloat(metrics.contractValue).toLocaleString()}`}
                  icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
                  subtext={`Base: ${project.currency}`}
                />
                <MetricCard
                  label="Budget Amount"
                  value={`$${parseFloat(metrics.budgetAmount).toLocaleString()}`}
                  icon={<Layers className="w-4 h-4 text-cyan-400" />}
                  subtext={`Cost: $${parseFloat(metrics.totalCost).toLocaleString()}`}
                />
                <MetricCard
                  label="Billed Revenue"
                  value={`$${parseFloat(metrics.totalRevenue).toLocaleString()}`}
                  icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
                  subtext={`${metrics.billedMilestonesCount} / ${metrics.totalMilestonesCount} Milestones`}
                />
                <MetricCard
                  label="Gross Margin"
                  value={`${metrics.grossMarginPercentage}%`}
                  icon={<PieChart className="w-4 h-4 text-amber-400" />}
                  subtext={`Profit: $${parseFloat(metrics.grossProfit).toLocaleString()}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card title="Contract & Scope Summary">
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Project Status:</span>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Billing Method:</span>
                      <span className="font-semibold text-foreground capitalize">{project.billingMethod.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Budget Utilization:</span>
                      <span className="font-mono text-foreground">{metrics.costUtilizationPercentage}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Remaining Contract Value:</span>
                      <span className="font-mono text-emerald-400">${parseFloat(metrics.remainingContractValue).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>

                <Card title="Work-In-Progress (WIP) Balance">
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Accumulated Project Cost:</span>
                      <span className="font-mono text-foreground">${wip ? parseFloat(wip.accumulatedCost).toLocaleString() : '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Capitalized to WIP (#1350):</span>
                      <span className="font-mono text-cyan-400">${wip ? parseFloat(wip.capitalizedAmount).toLocaleString() : '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border">
                      <span className="text-muted-foreground">Realized to COGS (#5010):</span>
                      <span className="font-mono text-emerald-400">${wip ? parseFloat(wip.transferredToCogs).toLocaleString() : '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Current WIP Asset Balance:</span>
                      <span className="font-mono font-bold text-amber-400">${wip ? parseFloat(wip.currentWipBalance).toLocaleString() : '0.00'}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: TASKS */}
          {activeSubTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Activity & Milestone Phase Schedule</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-card/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Task Code</th>
                    <th className="p-2.5">Task Name</th>
                    <th className="p-2.5">Assignee</th>
                    <th className="p-2.5">Dates</th>
                    <th className="p-2.5 text-right">Est / Act Hours</th>
                    <th className="p-2.5 text-right">Actual Cost</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/40">
                      <td className="p-2.5 font-mono text-cyan-400">{t.taskCode}</td>
                      <td className="p-2.5 font-medium text-foreground">{t.taskName}</td>
                      <td className="p-2.5 text-muted-foreground">{t.assigneeName || 'Unassigned'}</td>
                      <td className="p-2.5 text-muted-foreground">{t.startDate} - {t.endDate}</td>
                      <td className="p-2.5 text-right font-mono text-foreground/90">{t.estimatedHours}h / {t.actualHours}h</td>
                      <td className="p-2.5 text-right font-mono text-foreground/90">${parseFloat(t.actualCost).toLocaleString()}</td>
                      <td className="p-2.5 text-center"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">No scheduled tasks for this project.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: BUDGETS & BvA */}
          {activeSubTab === 'budgets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Budget Versions & Category Breakdown</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['labor', 'materials', 'subcontractor', 'equipment', 'overhead', 'other'].map((cat) => {
                  const cost = metrics.costBreakdown[cat as keyof typeof metrics.costBreakdown] || '0.00';
                  return (
                    <div key={cat} className="p-3 bg-card/60 rounded border border-border space-y-1">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">{cat}</div>
                      <div className="text-sm font-bold font-mono text-foreground">${parseFloat(cost).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">Accumulated Cost</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: COSTS */}
          {activeSubTab === 'costs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Itemized Direct Costs Ledger</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-card/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Source</th>
                    <th className="p-2.5">Doc #</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center">Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {costs.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="p-2.5 text-muted-foreground font-mono">{c.transactionDate}</td>
                      <td className="p-2.5 capitalize font-semibold text-foreground/90">{c.costCategory}</td>
                      <td className="p-2.5 font-mono text-[11px] text-cyan-400">{c.sourceModule}:{c.sourceType}</td>
                      <td className="p-2.5 text-muted-foreground">{c.documentNumber}</td>
                      <td className="p-2.5 text-foreground/90">{c.description}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">${parseFloat(c.amount).toLocaleString()}</td>
                      <td className="p-2.5 text-center"><StatusBadge status={c.billingStatus} /></td>
                    </tr>
                  ))}
                  {costs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">No costs recorded for this project yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: BILLING */}
          {activeSubTab === 'billing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Contract Milestones & Invoicing</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-card/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Milestone Name</th>
                    <th className="p-2.5">Due Date</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {milestones.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/40">
                      <td className="p-2.5 font-mono text-cyan-400">#{m.milestoneNumber}</td>
                      <td className="p-2.5 font-medium text-foreground">{m.name}</td>
                      <td className="p-2.5 text-muted-foreground font-mono">{m.dueDate}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">${parseFloat(m.amount).toLocaleString()}</td>
                      <td className="p-2.5 text-center"><StatusBadge status={m.status} /></td>
                      <td className="p-2.5 text-right">
                        {m.status !== 'billed' ? (
                          <Button size="xs" variant="primary" onClick={() => handleBillMilestone(m.id)}>
                            Generate AR Invoice
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">Billed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {milestones.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">No milestones scheduled for this contract.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: WIP ACCOUNTING */}
          {activeSubTab === 'wip' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Work In Progress (WIP) Management</h4>
                  <p className="text-[11px] text-muted-foreground">Capitalize direct contract expenses or transfer WIP to Cost of Sales upon delivery</p>
                </div>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={handleCapitalizeWip}>
                    + Capitalize to WIP Asset (#1350)
                  </Button>
                  <Button size="xs" variant="primary" onClick={handleTransferWipToCogs}>
                    Realize to COGS (#5010) →
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-card/60 rounded-lg border border-border space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Accumulated Cost</div>
                    <div className="text-base font-bold font-mono text-foreground">${wip ? parseFloat(wip.accumulatedCost).toLocaleString() : '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Capitalized WIP</div>
                    <div className="text-base font-bold font-mono text-cyan-400">${wip ? parseFloat(wip.capitalizedAmount).toLocaleString() : '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Transferred to COGS</div>
                    <div className="text-base font-bold font-mono text-emerald-400">${wip ? parseFloat(wip.transferredToCogs).toLocaleString() : '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Current WIP Balance</div>
                    <div className="text-base font-bold font-mono text-amber-400">${wip ? parseFloat(wip.currentWipBalance).toLocaleString() : '0.00'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PROFITABILITY */}
          {activeSubTab === 'profitability' && (
            <div className="space-y-4">
              <div className="p-4 bg-card/60 rounded-lg border border-border space-y-3">
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Recognized Project Revenue:</span>
                  <span className="font-mono font-bold text-emerald-400">${parseFloat(metrics.totalRevenue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Total Direct Project Costs:</span>
                  <span className="font-mono font-bold text-rose-400">(${parseFloat(metrics.totalCost).toLocaleString()})</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-border">
                  <span className="text-sm font-bold text-foreground">Net Project Profit / Margin:</span>
                  <div className="text-right">
                    <span className={`text-base font-bold font-mono ${parseFloat(metrics.grossProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${parseFloat(metrics.grossProfit).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">({metrics.grossMarginPercentage}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: GOVERNANCE & PRE-CLOSE */}
          {activeSubTab === 'close' && (
            <div className="space-y-4">
              <div className="p-4 bg-card/60 rounded-lg border border-border space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Pre-Closure Audit Validation
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Validates milestone billing completion, WIP balance realization, and unbilled cost clearance before sealing project.
                </p>

                <Button size="xs" variant="secondary" onClick={handleCheckClosure}>
                  Run Pre-Close Integrity Check
                </Button>

                {closureResult && (
                  <div className="space-y-2 pt-2">
                    {closureResult.canClose ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs">
                        ✓ All pre-closure integrity checks passed. Ready to close project.
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs space-y-1">
                        <div className="font-bold">Project cannot be closed due to active blockers:</div>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {closureResult.blockers.map((b: string, idx: number) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {project.status !== 'closed' && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!closureResult.canClose}
                        onClick={handleExecuteClose}
                      >
                        Lock & Close Project
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-card/80 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Tenant: {tenant.companyName} • Base Currency: {project.currency}
          </div>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close Window
          </Button>
        </div>
      </div>
    </div>
  );
};
