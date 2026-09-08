// ============================================================================
// Project Management & Financial Reports View (Phase 12: Project Accounting)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Download
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { projectReportsService } from '../services/project-reports.service';

export const ProjectReportsView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeReport, setActiveReport] = useState<string>('summary');
  const [data, setData] = useState<any[]>([]);

  const reportTabs = [
    { id: 'summary', label: '1. Project Summary & Margins' },
    { id: 'costs', label: '2. Project Cost Ledger' },
    { id: 'revenues', label: '3. Revenue Register' },
    { id: 'wip', label: '4. WIP Balances & Realization' },
    { id: 'by_category', label: '5. Costs by Category' },
    { id: 'by_dept', label: '6. Costs by Department' },
  ];

  useEffect(() => {
    loadReportData(activeReport);
  }, [activeReport, tenant]);

  const loadReportData = (reportId: string) => {
    switch (reportId) {
      case 'summary':
        setData(projectReportsService.getProjectSummaryReport(tenant));
        break;
      case 'costs':
        setData(projectReportsService.getProjectCostReport(tenant));
        break;
      case 'revenues':
        setData(projectReportsService.getProjectRevenueReport(tenant));
        break;
      case 'wip':
        setData(projectReportsService.getProjectWipReport(tenant));
        break;
      case 'by_category':
        setData(projectReportsService.getProjectCostsByCategoryReport(tenant));
        break;
      case 'by_dept':
        setData(projectReportsService.getProjectCostsByDepartmentReport(tenant));
        break;
      default:
        setData([]);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).map((val) => `"${val}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `project_report_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Report Switcher & Export Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {reportTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveReport(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                activeReport === t.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Button size="xs" variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      {/* Active Report Table */}
      <Card
        title={reportTabs.find((t) => t.id === activeReport)?.label || 'Project Report'}
        subtitle={`Organization: ${tenant.companyName} • Base Currency: ${tenant.baseCurrency}`}
      >
        <div className="overflow-x-auto">
          {activeReport === 'summary' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Project Code</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Manager</th>
                  <th className="p-3 text-right">Contract</th>
                  <th className="p-3 text-right">Revenue</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 text-right">Profit</th>
                  <th className="p-3 text-right">Margin %</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {data.map((r: any) => (
                  <tr key={r.projectId} className="hover:bg-slate-800/40">
                    <td className="p-3 text-cyan-400 font-bold">{r.projectCode}</td>
                    <td className="p-3 font-sans font-semibold text-slate-200">{r.projectName}</td>
                    <td className="p-3 font-sans text-slate-400">{r.customerName}</td>
                    <td className="p-3 font-sans text-slate-400">{r.projectManager}</td>
                    <td className="p-3 text-right text-slate-300">${parseFloat(r.contractValue).toLocaleString()}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">${parseFloat(r.totalRevenue).toLocaleString()}</td>
                    <td className="p-3 text-right text-rose-400 font-bold">${parseFloat(r.totalCost).toLocaleString()}</td>
                    <td className={`p-3 text-right font-bold ${parseFloat(r.profit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${parseFloat(r.profit).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-sans font-semibold text-slate-200">{r.marginPercentage}%</td>
                    <td className="p-3 text-center font-sans"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'costs' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Source Module</th>
                  <th className="p-3">Doc #</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Billable Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {data.map((r: any) => (
                  <tr key={r.costId} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400">{r.date}</td>
                    <td className="p-3 font-sans text-cyan-400 font-bold">{r.projectCode}</td>
                    <td className="p-3 font-sans capitalize font-semibold text-slate-200">{r.category}</td>
                    <td className="p-3 text-[11px] text-purple-400 uppercase font-mono">{r.sourceModule}:{r.sourceType}</td>
                    <td className="p-3 text-slate-400">{r.documentNumber}</td>
                    <td className="p-3 font-sans text-slate-300">{r.description}</td>
                    <td className="p-3 text-right font-bold text-slate-100">${parseFloat(r.amount).toLocaleString()}</td>
                    <td className="p-3 text-center font-sans"><StatusBadge status={r.billingStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'revenues' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Recognized Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {data.map((r: any) => (
                  <tr key={r.revenueId} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400">{r.date}</td>
                    <td className="p-3 font-sans text-cyan-400 font-bold">{r.projectCode}</td>
                    <td className="p-3 text-[11px] text-purple-400 uppercase">{r.sourceModule}</td>
                    <td className="p-3 text-emerald-400 font-semibold">{r.documentNumber}</td>
                    <td className="p-3 font-sans text-slate-300">{r.description}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">${parseFloat(r.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'wip' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Project Code</th>
                  <th className="p-3">Project Title</th>
                  <th className="p-3 text-right">Accumulated Direct Cost</th>
                  <th className="p-3 text-right">Capitalized to WIP (#1350)</th>
                  <th className="p-3 text-right">Transferred to COGS (#5010)</th>
                  <th className="p-3 text-right">Current WIP Asset Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {data.map((r: any) => (
                  <tr key={r.projectId} className="hover:bg-slate-800/40">
                    <td className="p-3 text-cyan-400 font-bold">{r.projectCode}</td>
                    <td className="p-3 font-sans font-semibold text-slate-200">{r.projectName}</td>
                    <td className="p-3 text-right text-slate-300">${parseFloat(r.accumulatedCost).toLocaleString()}</td>
                    <td className="p-3 text-right text-cyan-400 font-semibold">${parseFloat(r.capitalizedAmount).toLocaleString()}</td>
                    <td className="p-3 text-right text-emerald-400 font-semibold">${parseFloat(r.transferredToCogs).toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-amber-400">${parseFloat(r.currentWipBalance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'by_category' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Cost Category</th>
                  <th className="p-3 text-right">Transaction Count</th>
                  <th className="p-3 text-right">Total Incurred Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {data.map((r: any) => (
                  <tr key={r.category} className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-slate-200">{r.category}</td>
                    <td className="p-3 text-right text-slate-400">{r.count} transactions</td>
                    <td className="p-3 text-right font-bold text-slate-100">${parseFloat(r.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'by_dept' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Department</th>
                  <th className="p-3 text-right">Total Allocated Project Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {data.map((r: any) => (
                  <tr key={r.departmentId} className="hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-semibold text-slate-200">{r.departmentName}</td>
                    <td className="p-3 text-right font-bold text-slate-100">${parseFloat(r.totalAmount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data.length === 0 && (
            <div className="p-12 text-center text-slate-500 font-sans">
              No report data available for the selected view.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
