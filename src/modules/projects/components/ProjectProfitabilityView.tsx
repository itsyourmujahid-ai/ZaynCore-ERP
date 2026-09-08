// ============================================================================
// Project Profitability & Financial Margin Analytics View (Phase 12)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Briefcase 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { projectProfitabilityService, PortfolioProfitabilitySummary } from '../services/project-profitability.service';

interface ProjectProfitabilityViewProps {
  onOpenProject?: (projectId: string) => void;
}

export const ProjectProfitabilityView: React.FC<ProjectProfitabilityViewProps> = ({
  onOpenProject,
}) => {
  const { tenant } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioProfitabilitySummary | null>(null);

  useEffect(() => {
    loadProfitability();
  }, [tenant]);

  const loadProfitability = () => {
    const data = projectProfitabilityService.getPortfolioProfitability(tenant);
    setPortfolio(data);
  };

  if (!portfolio) return null;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Portfolio Revenue"
          value={`$${parseFloat(portfolio.totalProjectRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          subtext={`Base Currency: ${tenant.baseCurrency}`}
        />
        <MetricCard
          label="Total Incurred Costs"
          value={`$${parseFloat(portfolio.totalProjectCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<Layers className="w-5 h-5 text-rose-400" />}
          subtext="Direct Project Expenses"
        />
        <MetricCard
          label="Gross Portfolio Profit"
          value={`$${parseFloat(portfolio.totalGrossProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
          subtext={`Margin: ${portfolio.portfolioMarginPercentage}%`}
        />
        <MetricCard
          label="Active Project Contracts"
          value={`${portfolio.activeProjects} Projects`}
          icon={<Briefcase className="w-5 h-5 text-purple-400" />}
          subtext={`${portfolio.projectsOverBudgetCount} Over Budget`}
        />
      </div>

      {/* Detailed Project Profitability Table */}
      <Card title="Contract Profitability & Margin Performance Table" subtitle="Decimal-safe margin computations per project">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Project Code</th>
                <th className="p-3">Project Title</th>
                <th className="p-3 text-right">Contract Value</th>
                <th className="p-3 text-right">Recognized Revenue</th>
                <th className="p-3 text-right">Direct Costs</th>
                <th className="p-3 text-right">Gross Profit</th>
                <th className="p-3 text-right">Gross Margin %</th>
                <th className="p-3 text-right">Budget Variance</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {portfolio.projects.map((p) => (
                <tr
                  key={p.projectId}
                  onClick={() => onOpenProject && onOpenProject(p.projectId)}
                  className="hover:bg-slate-800/40 cursor-pointer"
                >
                  <td className="p-3 font-bold text-cyan-400">{p.projectCode}</td>
                  <td className="p-3 font-sans font-semibold text-slate-200">{p.projectName}</td>
                  <td className="p-3 text-right text-slate-400">${parseFloat(p.contractValue).toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-400 font-semibold">${parseFloat(p.totalRevenue).toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-400 font-semibold">${parseFloat(p.totalCost).toLocaleString()}</td>
                  <td className={`p-3 text-right font-bold ${parseFloat(p.grossProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${parseFloat(p.grossProfit).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-sans">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${p.grossMarginPercentage >= 20 ? 'bg-emerald-500/20 text-emerald-300' : p.grossMarginPercentage > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {p.grossMarginPercentage}%
                    </span>
                  </td>
                  <td className={`p-3 text-right ${parseFloat(p.budgetVariance) >= 0 ? 'text-slate-300' : 'text-rose-400'}`}>
                    ${parseFloat(p.budgetVariance).toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-sans">
                    <StatusBadge status={p.projectStatus} />
                  </td>
                </tr>
              ))}
              {portfolio.projects.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500 font-sans">
                    No project contracts available for profitability analysis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
