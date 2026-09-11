// ============================================================================
// Advanced Enterprise Reporting Center View (Phase 14)
// ============================================================================

import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CreditCard, 
  Boxes, 
  Landmark, 
  ShieldCheck, 
  Users, 
  Layers, 
  Building2, 
  Filter, 
  Download, 
  Printer, 
  FileText, 
  Briefcase 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { 
  advancedReportingService, 
  ReportCategory, 
  ReportFilterCriteria, 
  DrillDownSourceItem 
} from '../services/advanced-reporting.service';

export const AdvancedReportingCenterView: React.FC = () => {
  const { tenant } = useAuth();
  const companies = db.getCompanies();

  const [activeCategory, setActiveCategory] = useState<ReportCategory>('financial');
  const [selectedReportKey, setSelectedReportKey] = useState('trial_balance');

  // Filters state
  const [filters, setFilters] = useState<ReportFilterCriteria>({
    companyId: tenant.companyId,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    currency: tenant.baseCurrency || 'USD',
  });

  const [drillDownItems, setDrillDownItems] = useState<DrillDownSourceItem[]>([]);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  const categories = [
    { key: 'financial' as ReportCategory, label: 'Financial Statements & GL', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'sales_ar' as ReportCategory, label: 'Sales & Accounts Receivable', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'purchases_ap' as ReportCategory, label: 'Purchases & Accounts Payable', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'inventory' as ReportCategory, label: 'Inventory & Stock Valuation', icon: <Boxes className="w-4 h-4" /> },
    { key: 'banking' as ReportCategory, label: 'Banking & Cash Management', icon: <Landmark className="w-4 h-4" /> },
    { key: 'assets' as ReportCategory, label: 'Fixed Assets & Depreciation', icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'payroll' as ReportCategory, label: 'HR & Payroll Register', icon: <Users className="w-4 h-4" /> },
    { key: 'tax' as ReportCategory, label: 'Tax & VAT Returns', icon: <FileText className="w-4 h-4" /> },
    { key: 'projects' as ReportCategory, label: 'Project Accounting & WIP', icon: <Briefcase className="w-4 h-4" /> },
    { key: 'management' as ReportCategory, label: 'Cost Centers & Budgets (BvA)', icon: <Layers className="w-4 h-4" /> },
    { key: 'group_consolidation' as ReportCategory, label: 'Group & Consolidation Statements', icon: <Building2 className="w-4 h-4" /> },
  ];

  // Reports map per category
  const reportsByCategory: Record<ReportCategory, Array<{ key: string; label: string; desc: string }>> = {
    financial: [
      { key: 'trial_balance', label: 'General Ledger Trial Balance', desc: 'Summary of all account debits, credits, and net balances' },
      { key: 'pnl', label: 'Statement of Profit & Loss', desc: 'Revenue, direct costs, operating expenses, and net profit' },
      { key: 'balance_sheet', label: 'Statement of Financial Position', desc: 'Assets, liabilities, and shareholders equity' },
      { key: 'cash_flow', label: 'Statement of Cash Flows', desc: 'Operating, investing, and financing cash movements' },
    ],
    sales_ar: [
      { key: 'customer_aging', label: 'AR Aging Portfolio', desc: 'Current, 30, 60, 90+ day overdue customer receivables' },
      { key: 'sales_by_customer', label: 'Sales Revenue by Customer', desc: 'Customer sales totals and gross margins' },
      { key: 'sales_by_item', label: 'Product Sales & Margins', desc: 'Item quantities sold, revenue, COGS, and margin %' },
    ],
    purchases_ap: [
      { key: 'ap_aging', label: 'AP Aging Summary', desc: 'Outstanding vendor liabilities by payment terms' },
      { key: 'purchases_by_supplier', label: 'Procurement by Supplier', desc: 'Total bills, payments, and net vendor spend' },
    ],
    inventory: [
      { key: 'stock_valuation', label: 'Inventory Valuation Report', desc: 'On-hand quantities, standard cost, and total valuation' },
      { key: 'stock_movements', label: 'Stock Movement Ledger', desc: 'Chronological receipts, deliveries, and adjustments' },
    ],
    banking: [
      { key: 'bank_balances', label: 'Bank & Cash Register', desc: 'Operating accounts, deposits, withdrawals, and balances' },
      { key: 'bank_reconciliation', label: 'Bank Reconciliation Statements', desc: 'Statement balances vs General Ledger reconciliations' },
    ],
    assets: [
      { key: 'fixed_asset_register', label: 'Fixed Asset Register', desc: 'Acquisition cost, accumulated depreciation, and net book value' },
      { key: 'depreciation_schedule', label: 'Depreciation Schedule', desc: 'Monthly depreciation forecasts and asset lifecycles' },
    ],
    payroll: [
      { key: 'payroll_summary', label: 'Monthly Payroll Summary', desc: 'Gross pay, allowances, deductions, and net disbursements' },
      { key: 'salary_register', label: 'Employee Salary Register', desc: 'Departmental salary distributions' },
    ],
    tax: [
      { key: 'tax_return_summary', label: 'Periodic Tax Return Summary', desc: 'Box-by-box Output VAT, Input VAT, and Net Liability' },
      { key: 'tax_subledger', label: 'Tax Sub-Ledger Audit Trail', desc: 'Full transaction-level tax invoice details' },
    ],
    projects: [
      { key: 'project_profitability', label: 'Project Profitability Matrix', desc: 'Contract revenue, direct costs, gross margins, and WIP' },
      { key: 'project_wip', label: 'WIP Capitalization Ledger', desc: 'Unbilled project costs and capitalization records' },
    ],
    management: [
      { key: 'cost_center_pnl', label: 'Cost Center Performance', desc: 'Direct revenue, costs, and allocated overheads' },
      { key: 'budget_vs_actual', label: 'Budget vs. Actual Variance', desc: 'Planned budgets vs actual GL transactions' },
    ],
    group_consolidation: [
      { key: 'consolidated_tb', label: 'Consolidated Trial Balance', desc: 'Multi-entity aggregated trial balance with eliminations' },
      { key: 'consolidated_pnl', label: 'Consolidated Group P&L', desc: 'Corporate group revenue, eliminations, and minority interest' },
      { key: 'intercompany_matrix', label: 'Intercompany Elimination Matrix', desc: 'Bilateral cross-company balances and eliminations' },
    ],
  };

  const reportData = advancedReportingService.generateReport(selectedReportKey, filters, tenant);

  const handleExportCsv = () => {
    const csvContent = advancedReportingService.exportToCsv(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportData.reportKey}_${filters.companyId || 'company'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrillDown = (row: any) => {
    if (row.id) {
      const items = advancedReportingService.drillDownAccount(row.id, filters, tenant);
      setDrillDownItems(items);
      setDrillDownTitle(`${row.code || ''} - ${row.name || row.customerName || 'Transactions'}`);
      setIsDrillDownOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">Enterprise Analytics</span>
            <span className="text-muted-foreground">•</span>
            <StatusBadge status="Real-Time GL Integration" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Advanced Reporting Center</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Centralized financial statements, operational reports, sub-ledger reconciliation, and recursive transaction drill-down.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Dynamic Multi-Dimension Filter Bar */}
      <div className="p-4 bg-card/80 backdrop-blur-xl border border-border/90 shadow-sm rounded-xl space-y-3 text-xs">
        <div className="flex items-center gap-2 text-foreground font-semibold border-b border-border pb-2">
          <Filter className="w-3.5 h-3.5 text-brand-600" />
          <span>Report Parameters &amp; Dimensional Scope</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-foreground/90 font-semibold mb-1">Company Scope</label>
            <select
              value={filters.companyId}
              onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-foreground/90 font-semibold mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-semibold mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-semibold mb-1">Currency</label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="OMR">OMR - Omani Rial</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AED">AED - UAE Dirham</option>
              <option value="SAR">SAR - Saudi Riyal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Categories Sidebar & Active Report Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Category Navigation */}
        <div className="space-y-4">
          <Card title="Report Categories" subtitle="Select domain">
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setSelectedReportKey(reportsByCategory[cat.key][0]?.key || '');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                    activeCategory === cat.key
                      ? 'bg-brand-50 text-brand-700 border border-brand-200 font-bold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cat.icon}
                    <span>{cat.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Report Catalog & Live Output */}
        <div className="lg:col-span-3 space-y-5">
          {/* Sub-Reports Selector Bar */}
          <div className="flex flex-wrap gap-2">
            {reportsByCategory[activeCategory]?.map((rep) => (
              <button
                key={rep.key}
                onClick={() => setSelectedReportKey(rep.key)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  selectedReportKey === rep.key
                    ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                    : 'bg-card border-border text-foreground/90 hover:bg-muted hover:text-foreground'
                }`}
              >
                {rep.label}
              </button>
            ))}
          </div>

          {/* Report Output Card */}
          <Card
            title={reportData.title}
            subtitle={`Generated from live General Ledger • ${reportData.rows.length} records`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted text-foreground/90 font-bold">
                    {reportData.columns.map((col) => (
                      <th
                        key={col.key}
                        className={`py-2.5 px-3 font-semibold ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-semibold text-right">Drill-Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {reportData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.columns.length + 1} className="py-12 text-center text-muted-foreground text-xs">
                        No transactions recorded for the selected parameters.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-muted transition-colors">
                        {reportData.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`py-2.5 px-3 ${
                              col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center font-mono' : 'text-left'
                            }`}
                          >
                            {col.isNumeric ? (
                              <span className="font-bold text-foreground">{row[col.key]}</span>
                            ) : (
                              <span className="text-foreground font-medium">{row[col.key]}</span>
                            )}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-right">
                          <Button size="xs" variant="secondary" onClick={() => handleDrillDown(row)}>
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Block */}
            {reportData.summary && (
              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-end gap-6 text-xs">
                {Object.entries(reportData.summary).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-muted-foreground font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-mono font-bold text-brand-600 text-sm">${v}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Financial Drill-Down Inspection Modal */}
      {isDrillDownOpen && (
        <Modal
          isOpen={isDrillDownOpen}
          onClose={() => setIsDrillDownOpen(false)}
          title={`Financial Drill-Down: ${drillDownTitle}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-muted border border-border rounded-xl flex items-center justify-between">
              <span className="text-foreground/90 font-medium">Underlying Journal Transactions:</span>
              <span className="font-bold text-brand-600 font-mono">{drillDownItems.length} records</span>
            </div>

            {drillDownItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No posted journal entries found for this specific period or account.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {drillDownItems.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 bg-card border border-border rounded-lg flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-mono font-semibold text-foreground">{item.referenceNumber}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.date} • {item.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-600">${item.amount} {item.currency}</div>
                      <div className="text-[10px] text-muted-foreground">{item.companyName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setIsDrillDownOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
