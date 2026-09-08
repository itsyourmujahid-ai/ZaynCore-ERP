// ============================================================================
// Multi-Perspective Profitability & Margin Analytics Workbench (Phase 13)
// ============================================================================

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Building2, 
  FileText
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { profitabilityAnalyticsService } from '../services/profitability-analytics.service';
import { managementPnLService } from '../services/management-pnl.service';

export const ProfitabilityAnalyticsView: React.FC = () => {
  const { tenant } = useAuth();
  const [perspective, setPerspective] = useState<'pnl' | 'customers' | 'products' | 'branches' | 'contribution'>('pnl');

  const pnl = managementPnLService.generateManagementPnL(undefined, tenant);
  const customerProf = profitabilityAnalyticsService.getCustomerProfitability(tenant);
  const productProf = profitabilityAnalyticsService.getProductProfitability(tenant);
  const branchProf = profitabilityAnalyticsService.getBranchProfitability(tenant);
  const cmBusinessUnits = profitabilityAnalyticsService.getContributionMarginByDimension('business_unit', tenant);

  return (
    <div className="space-y-5">
      {/* Perspective Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'pnl', label: 'Management P&L', icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'customers', label: 'Customer Profitability', icon: <Users className="w-3.5 h-3.5" />, badge: customerProf.length },
          { id: 'products', label: 'Product Gross Margins', icon: <Package className="w-3.5 h-3.5" />, badge: productProf.length },
          { id: 'branches', label: 'Branch Comparison', icon: <Building2 className="w-3.5 h-3.5" />, badge: branchProf.length },
          { id: 'contribution', label: 'Contribution Margins', icon: <TrendingUp className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPerspective(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              perspective === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. MANAGEMENT P&L VIEW */}
      {perspective === 'pnl' && (
        <Card
          title="Management Statement of Profit & Loss (Income Statement)"
          subtitle={`Multi-dimensional analytical P&L derived from General Ledger • Currency: ${tenant.baseCurrency}`}
        >
          <div className="space-y-4 text-xs">
            {/* OPERATING REVENUE SECTION */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
                <span>1. Operating Revenue</span>
                <span className="text-emerald-400 font-mono">${parseFloat(pnl.totalRevenue).toFixed(2)}</span>
              </div>
              {pnl.revenueLines.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No revenue recognized for active period.</p>
              ) : (
                <div className="space-y-1 pt-1">
                  {pnl.revenueLines.map((l, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>{l.accountCode} - {l.accountName}</span>
                      <span className="font-mono text-emerald-400">${parseFloat(l.amount).toFixed(2)} ({l.percentageOfRevenue}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DIRECT COSTS & GROSS PROFIT */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
                <span>2. Direct Costs & Cost of Goods Sold (COGS)</span>
                <span className="text-rose-400 font-mono">${parseFloat(pnl.totalDirectCosts).toFixed(2)}</span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-slate-400">
                  <span>Direct Materials & Supplies:</span>
                  <span className="font-mono text-slate-200">${parseFloat(pnl.directMaterials).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Direct Labor & Subcontracting:</span>
                  <span className="font-mono text-slate-200">${parseFloat(pnl.directLabor).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Direct Project & Operating Expenses:</span>
                  <span className="font-mono text-slate-200">${parseFloat(pnl.directExpenses).toFixed(2)}</span>
                </div>
              </div>

              {/* Gross Profit Callout */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between font-bold text-sm mt-3">
                <span className="text-slate-200">GROSS PROFIT</span>
                <span className="font-mono text-emerald-400">
                  ${parseFloat(pnl.grossProfit).toFixed(2)} ({pnl.grossMarginPercentage}%)
                </span>
              </div>
            </div>

            {/* OPERATING EXPENSES */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
                <span>3. Operating Overheads & Admin Expenses</span>
                <span className="text-rose-400 font-mono">${parseFloat(pnl.totalOperatingExpenses).toFixed(2)}</span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-slate-400">
                  <span>Salaries, Wages & Benefits:</span>
                  <span className="font-mono text-slate-200">${parseFloat(pnl.salariesAndBenefits).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Rent & Office Facilities:</span>
                  <span className="font-mono text-slate-200">${parseFloat(pnl.rentAndFacilities).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Utilities & Technology Infrastructure:</span>
                  <span className="font-mono text-slate-200">${parseFloat(pnl.utilitiesAndTech).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>General & Administrative:</span>
                  <span className="font-mono text-slate-200">${parseFloat(pnl.generalAndAdmin).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Allocated Shared Overheads:</span>
                  <span className="font-mono text-amber-400">${parseFloat(pnl.allocatedOverhead).toFixed(2)}</span>
                </div>
              </div>

              {/* Operating Profit Callout */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between font-bold text-sm mt-3">
                <span className="text-slate-200">OPERATING PROFIT (EBIT)</span>
                <span className={`font-mono ${parseFloat(pnl.operatingProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${parseFloat(pnl.operatingProfit).toFixed(2)} ({pnl.operatingMarginPercentage}%)
                </span>
              </div>
            </div>

            {/* NET MANAGEMENT PROFIT */}
            <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-bold ${
              pnl.isProfitable ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
            }`}>
              <span className={pnl.isProfitable ? 'text-emerald-300' : 'text-rose-300'}>
                NET MANAGEMENT {pnl.isProfitable ? 'INCOME (PROFIT)' : 'LOSS'}
              </span>
              <span className={`font-mono text-base ${pnl.isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${parseFloat(pnl.netProfit).toFixed(2)} {tenant.baseCurrency} ({pnl.netMarginPercentage}%)
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 2. CUSTOMER PROFITABILITY */}
      {perspective === 'customers' && (
        <Card
          title={`Customer Profitability Matrix (${customerProf.length})`}
          subtitle="Net margin contribution per client after deducting direct costs and allocated support expenses"
        >
          {customerProf.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No customer transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5 text-right">Invoiced Revenue</th>
                    <th className="px-4 py-2.5 text-right">Direct Costs</th>
                    <th className="px-4 py-2.5 text-right">Allocated Overhead</th>
                    <th className="px-4 py-2.5 text-right">Net Profit</th>
                    <th className="px-4 py-2.5 text-right">Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customerProf.map((cust) => (
                    <tr key={cust.customerId} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-200">{cust.customerName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{cust.customerCode}</div>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        ${parseFloat(cust.totalRevenue).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-rose-400">
                        ${parseFloat(cust.directCosts).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        ${parseFloat(cust.allocatedOverhead).toFixed(2)}
                      </td>

                      <td className={`px-4 py-3 text-right font-mono font-bold ${
                        cust.isProfitable ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ${parseFloat(cust.netProfit).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {cust.marginPercentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 3. PRODUCT PROFITABILITY */}
      {perspective === 'products' && (
        <Card
          title={`Product & Item Gross Margins (${productProf.length})`}
          subtitle="Sales revenue versus standard cost of goods sold (COGS)"
        >
          {productProf.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No product items configured or invoiced yet.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="px-4 py-2.5">Product / Item</th>
                    <th className="px-4 py-2.5 text-center">Units Sold</th>
                    <th className="px-4 py-2.5 text-right">Total Revenue</th>
                    <th className="px-4 py-2.5 text-right">COGS</th>
                    <th className="px-4 py-2.5 text-right">Gross Profit</th>
                    <th className="px-4 py-2.5 text-right">Gross Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {productProf.map((prod) => (
                    <tr key={prod.itemId} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-200">{prod.itemName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{prod.itemCode} • {prod.categoryName || 'Inventory'}</div>
                      </td>

                      <td className="px-4 py-3 text-center font-mono text-slate-300">
                        {prod.unitsSold}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        ${parseFloat(prod.totalRevenue).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-rose-400">
                        ${parseFloat(prod.totalCostOfGoodsSold).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">
                        ${parseFloat(prod.grossProfit).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {prod.marginPercentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 4. BRANCH COMPARISON */}
      {perspective === 'branches' && (
        <Card
          title={`Branch Performance Comparison (${branchProf.length})`}
          subtitle="Cross-location revenue, direct costs, operating overheads, and net profit margins"
        >
          <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="px-4 py-2.5">Branch</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                  <th className="px-4 py-2.5 text-right">Direct Costs</th>
                  <th className="px-4 py-2.5 text-right">Operating Expenses</th>
                  <th className="px-4 py-2.5 text-right">Net Profit</th>
                  <th className="px-4 py-2.5 text-right">Net Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {branchProf.map((br) => (
                  <tr key={br.branchId} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{br.branchName}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {br.branchCode} {br.isHeadquarters && '• Headquarters'}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      ${parseFloat(br.totalRevenue).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-rose-400">
                      ${parseFloat(br.directCosts).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-amber-400">
                      ${parseFloat(br.operatingExpenses).toFixed(2)}
                    </td>

                    <td className={`px-4 py-3 text-right font-mono font-bold ${
                      parseFloat(br.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ${parseFloat(br.netProfit).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {br.marginPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. CONTRIBUTION MARGINS */}
      {perspective === 'contribution' && (
        <Card
          title="Contribution Margin by Business Unit & Division"
          subtitle="Variable vs. fixed cost breakdown and divisional coverage ratio"
        >
          <div className="overflow-x-auto -mx-4 -my-3 sm:mx-0 sm:my-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="px-4 py-2.5">Business Unit / Division</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                  <th className="px-4 py-2.5 text-right">Variable Costs</th>
                  <th className="px-4 py-2.5 text-right">Contribution Margin</th>
                  <th className="px-4 py-2.5 text-right">CM Ratio (%)</th>
                  <th className="px-4 py-2.5 text-right">Fixed Overheads</th>
                  <th className="px-4 py-2.5 text-right">Operating Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cmBusinessUnits.map((cm) => (
                  <tr key={cm.entityId} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{cm.entityName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{cm.entityCode}</div>
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      ${parseFloat(cm.totalRevenue).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-rose-400">
                      ${parseFloat(cm.variableCosts).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                      ${parseFloat(cm.contributionMargin).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-slate-200 font-semibold">
                      {cm.contributionMarginPercentage}%
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-amber-400">
                      ${parseFloat(cm.fixedCosts).toFixed(2)}
                    </td>

                    <td className={`px-4 py-3 text-right font-mono font-bold ${
                      parseFloat(cm.operatingIncome) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ${parseFloat(cm.operatingIncome).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
