// ============================================================================
// Management Accounting Executive Dashboard (Phase 13)
// ============================================================================

import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Target, 
  Layers, 
  BarChart2, 
  AlertCircle,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { Card } from '@/ui/components/Card';
import { managementPnLService } from '../services/management-pnl.service';
import { costCenterService } from '../services/cost-center.service';
import { departmentAccountingService } from '../services/department-accounting.service';

export const ManagementDashboardView: React.FC<{
  onNavigateTab: (tabId: string) => void;
}> = ({ onNavigateTab }) => {
  const { tenant } = useAuth();
  const pnl = managementPnLService.generateManagementPnL(undefined, tenant);
  const costCenters = costCenterService.getCostCenters(tenant);
  const departments = departmentAccountingService.getDepartmentPortfolio(tenant);

  // Compute Cost Center Summaries
  const ccSummaries = costCenters.map((cc) => costCenterService.calculateCostCenterPnL(cc.id, tenant));
  const topCostCenters = [...ccSummaries].sort((a, b) => parseFloat(b.totalCost) - parseFloat(a.totalCost)).slice(0, 5);

  const totalCostNum = parseFloat(pnl.totalDirectCosts) + parseFloat(pnl.totalOperatingExpenses);
  const totalRevNum = parseFloat(pnl.totalRevenue);
  const netProfNum = parseFloat(pnl.netProfit);

  return (
    <div className="space-y-6">
      {/* Top Level Metric KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Operating Revenue"
          value={`$${totalRevNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          subtext="Recognized across all business units"
        />

        <MetricCard
          label="Total Operating & Direct Costs"
          value={`$${totalCostNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Layers className="w-4 h-4 text-rose-400" />}
          subtext={`Gross Direct: $${parseFloat(pnl.totalDirectCosts).toFixed(2)}`}
        />

        <MetricCard
          label="Net Management Profit"
          value={`$${netProfNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className={`w-4 h-4 ${netProfNum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />}
          subtext={`Net Margin: ${pnl.netMarginPercentage}%`}
        />

        <MetricCard
          label="Gross Profit Margin"
          value={`${pnl.grossMarginPercentage}%`}
          icon={<PieChart className="w-4 h-4 text-brand-400" />}
          subtext={`Operating Profit: $${parseFloat(pnl.operatingProfit).toFixed(2)}`}
        />
      </div>

      {/* Main Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cost Centers Performance */}
        <Card
          title="Top Cost Centers by Incurred Cost"
          subtitle="Real-time aggregation of direct and allocated operating costs"
          action={
            <button
              onClick={() => onNavigateTab('cost-centers')}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300"
            >
              View All ({costCenters.length})
            </button>
          }
        >
          {topCostCenters.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No cost center activity recorded. Create cost centers to start tracking divisional expenses.
            </div>
          ) : (
            <div className="space-y-3">
              {topCostCenters.map((cc) => (
                <div 
                  key={cc.costCenterId}
                  className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-200">{cc.costCenterCode}</span>
                      <span className="text-xs text-slate-300 truncate">{cc.costCenterName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {cc.departmentName || 'General Corporate'} • Budget: ${parseFloat(cc.budgetAmount).toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-rose-400">
                      ${parseFloat(cc.totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] mt-0.5">
                      {cc.isFavorable ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Favorable (${parseFloat(cc.varianceAmount).toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-rose-400 font-medium flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" /> Over Budget (${parseFloat(cc.varianceAmount).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Department Portfolio Matrix */}
        <Card
          title="Department Profit & Loss Overview"
          subtitle="Departmental revenue, direct costs, and operating overheads"
          action={
            <button
              onClick={() => onNavigateTab('departments')}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300"
            >
              Explore Departments
            </button>
          }
        >
          {departments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No departments configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => (
                <div 
                  key={dept.departmentId}
                  className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-200">{dept.departmentName}</span>
                      <span className="text-[10px] font-mono text-slate-500">({dept.departmentCode})</span>
                    </div>
                    <span className={`text-xs font-bold font-mono ${parseFloat(dept.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${parseFloat(dept.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-800/60 text-slate-400">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">Revenue</span>
                      <span className="font-mono text-slate-200">${parseFloat(dept.actualRevenue).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">Direct Costs</span>
                      <span className="font-mono text-rose-400">${parseFloat(dept.directCost).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase">Allocated</span>
                      <span className="font-mono text-amber-400">${parseFloat(dept.allocatedOverhead).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Navigation Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigateTab('budgets')}
          className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 hover:border-brand-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 group-hover:bg-brand-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-brand-300">Management Budgets & BvA</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Multi-version budgeting and variance control</div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('allocations')}
          className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300">Cost Allocation Engine</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Shared overhead allocation and GL posting</div>
            </div>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('profitability')}
          className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">Profitability & Margins</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Customer, product, and branch margin analysis</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
