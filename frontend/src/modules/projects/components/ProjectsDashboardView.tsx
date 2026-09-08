// ============================================================================
// Project Management & Accounting Dashboard View (Phase 12)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  PieChart
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { projectProfitabilityService, PortfolioProfitabilitySummary } from '../services/project-profitability.service';

interface DashboardViewProps {
  onNavigateTab: (tabId: string) => void;
  onOpenProject: (projectId: string) => void;
  onCreateProject: () => void;
}

export const ProjectsDashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenProject,
  onCreateProject,
}) => {
  const { tenant } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioProfitabilitySummary | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [tenant]);

  const loadDashboardData = () => {
    const data = projectProfitabilityService.getPortfolioProfitability(tenant);
    setPortfolio(data);
  };

  if (!portfolio) return null;

  return (
    <div className="space-y-6">
      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Projects"
          value={`${portfolio.activeProjects} / ${portfolio.totalProjects}`}
          icon={<Briefcase className="w-5 h-5 text-cyan-400" />}
          subtext="Contract Portfolio"
        />
        <MetricCard
          label="Total Contract Value"
          value={`$${parseFloat(portfolio.totalContractValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          subtext={`Base: ${tenant.baseCurrency}`}
        />
        <MetricCard
          label="Recognized Revenue"
          value={`$${parseFloat(portfolio.totalProjectRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          subtext={`Cost: $${parseFloat(portfolio.totalProjectCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
        <MetricCard
          label="Gross Portfolio Profit"
          value={`$${parseFloat(portfolio.totalGrossProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<PieChart className="w-5 h-5 text-amber-400" />}
          subtext={`Margin: ${portfolio.portfolioMarginPercentage}%`}
        />
      </div>

      {/* Projects Requiring Attention & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Projects Portfolio */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Active Capital & Client Projects"
            subtitle="Real-time margin, cost utilization, and contract milestone tracking"
            action={
              <Button size="xs" variant="secondary" onClick={() => onNavigateTab('projects')}>
                View All ({portfolio.totalProjects})
              </Button>
            }
          >
            {portfolio.projects.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 text-cyan-400 mx-auto flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-medium text-slate-200">No Projects Configured</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Create your first client contract, internal R&D project, or construction job to start tracking costs and milestones.
                </p>
                <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onCreateProject}>
                  Create Enterprise Project
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {portfolio.projects.slice(0, 6).map((proj) => (
                  <div
                    key={proj.projectId}
                    onClick={() => onOpenProject(proj.projectId)}
                    className="p-4 hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm hover:text-cyan-400 transition-colors">
                          {proj.projectName}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {proj.projectCode}
                        </span>
                        <StatusBadge status={proj.projectStatus} />
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Contract: ${parseFloat(proj.contractValue).toLocaleString()} {proj.currency}</span>
                        <span>•</span>
                        <span>Revenue: ${parseFloat(proj.totalRevenue).toLocaleString()}</span>
                        <span>•</span>
                        <span>Cost: ${parseFloat(proj.totalCost).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className={`text-sm font-bold ${parseFloat(proj.grossProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${parseFloat(proj.grossProfit).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Margin: <span className="font-semibold text-slate-200">{proj.grossMarginPercentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Quick Actions & Status Summary */}
        <div className="space-y-4">
          <Card title="Project Governance & Health" subtitle="Budget utilization alerts">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Projects Over Budget</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {portfolio.projectsOverBudgetCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Completed Projects</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {portfolio.completedProjects}
                </span>
              </div>

              <div className="pt-2 space-y-2">
                <Button 
                  size="sm" 
                  variant="primary" 
                  className="w-full justify-center" 
                  icon={<Plus className="w-4 h-4" />}
                  onClick={onCreateProject}
                >
                  Create Project
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="w-full justify-center"
                  onClick={() => onNavigateTab('budgets')}
                >
                  Manage Budgets & Revisions
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="w-full justify-center text-xs text-slate-400 hover:text-slate-200"
                  onClick={() => onNavigateTab('reports')}
                >
                  View 12+ Financial Reports →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
