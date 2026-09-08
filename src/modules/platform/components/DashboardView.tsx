// ============================================================================
// QuantumCore ERP — Executive Glassmorphism Dashboard & Analytics
// ============================================================================

import React, { useState } from 'react';
import { 
  Layers, 
  Cpu, 
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Filter,
  Search,
  ChevronDown,
  Sparkles,
  Table as TableIcon
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { useTheme } from '@/core/theme/ThemeContext';
import { db } from '@/database/storage';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Button } from '@/ui/components/Button';
import { Badge } from '@/ui/components/Badge';

export const DashboardView: React.FC<{ onNavigate: (viewId: string) => void }> = ({ onNavigate }) => {
  const { tenant } = useAuth();
  const { accentColor, accentText } = useTheme();

  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const accounts = db.getAccounts(tenant);
  const journals = db.getJournalEntries(tenant);
  const periods = db.getAccountingPeriods(tenant);

  // Table rows matching exact specification with high contrast styling
  const tableData = [
    {
      id: 'row-1',
      name: 'John Doe',
      data: '#0.001 204 BTC',
      lastModified: '2 mins ago',
      table: 'Ledger Engine #GL-100',
      state: 'Active',
      stateType: 'success' as const,
      avatar: 'JD',
    },
    {
      id: 'row-2',
      name: 'QuantumCore ERP',
      data: '#0.289 342 ETH',
      lastModified: '14 mins ago',
      table: 'Consolidated Sub-Ledger',
      state: 'Verified',
      stateType: 'purple' as const,
      avatar: 'QC',
    },
    {
      id: 'row-3',
      name: tenant.companyName || 'Apex Industrial Holdings',
      data: `$4,850,200.00 ${tenant.baseCurrency}`,
      lastModified: '1 hour ago',
      table: 'Operating Revenue Stream',
      state: 'Posted',
      stateType: 'info' as const,
      avatar: 'AI',
    },
    {
      id: 'row-4',
      name: 'Fiscal Year Governance FY-2026',
      data: `${periods.filter(p => p.status === 'open').length} Open Periods`,
      lastModified: '3 hours ago',
      table: 'Period Lock Controller',
      state: 'Locked Guard',
      stateType: 'warning' as const,
      avatar: 'FY',
    },
    {
      id: 'row-5',
      name: 'Tax Sub-Ledger & Output VAT',
      data: 'Standard 5.00% VAT Compliance',
      lastModified: '5 hours ago',
      table: 'Sovereign Tax Authority',
      state: 'Reconciled',
      stateType: 'success' as const,
      avatar: 'TX',
    },
    {
      id: 'row-6',
      name: 'Cryptographic Audit Trail Engine',
      data: '100% Tamper-Evident SHA-256',
      lastModified: 'Just now',
      table: 'RLS Immutable Stream',
      state: 'Isolated',
      stateType: 'outline' as const,
      avatar: 'AT',
    },
  ];

  const filteredRows = tableData.filter((row) => {
    if (tableFilter === 'active' && row.state !== 'Active' && row.state !== 'Verified' && row.state !== 'Posted') return false;
    if (tableFilter === 'warnings' && row.state !== 'Locked Guard') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.data.toLowerCase().includes(q) ||
        row.table.toLowerCase().includes(q) ||
        row.state.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Banner with Clean Light Frosted Glass */}
      <div className="rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/90 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${accentText} flex items-center gap-1.5`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>QuantumCore ERP Platform</span>
              </span>
              <span className="text-slate-300">•</span>
              <StatusBadge status={tenant.companyTier} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {tenant.companyName || 'Platform Workspace Overview'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed font-normal">
              Real-time multi-tenant ledger architecture, cryptographic audit verification, and executive financial analytics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              icon={<Cpu className="w-4 h-4 text-slate-700" />} 
              onClick={() => onNavigate('accounting-engine')}
              className="bg-white/80 hover:bg-slate-50 text-slate-700 border-slate-300"
            >
              Posting Spec
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              icon={<Layers className="w-4 h-4" />} 
              onClick={() => onNavigate('reports')}
              style={{ backgroundColor: accentColor, borderColor: accentColor }}
            >
              Financial Reports
            </Button>
          </div>
        </div>
      </div>

      {/* 1. TOP ROW: 6 Distinct Frosted Glass KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1 (Blue Accent): KPI #2.33 */}
        <div className="p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span>KPI #2.33</span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <TrendingUp className="w-3 h-3" />
              <span>+12.4%</span>
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight my-1">
            2.33M
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>Active Velocity</span>
            <span className="font-mono text-slate-700 font-bold">#0F1725</span>
          </div>
        </div>

        {/* Card 2 (Blue Accent): KPI #25% */}
        <div className="p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span>KPI #25%</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              OPTIMIZED
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight my-1 flex items-baseline gap-1">
            <span>25.4%</span>
            <span className="text-xs font-medium text-slate-500">Margin</span>
          </div>
          <div className="mt-1">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-indigo-500 w-1/4 rounded-full" />
            </div>
          </div>
        </div>

        {/* Card 3 (Dark Blue Accent #0F1725): Option 2 #0F1725 */}
        <div className="p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span>Option 2</span>
            <span className="font-mono text-[10px] text-slate-500 font-bold">#0F1725</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight my-1">
            {journals.length + accounts.length * 2}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate border-t border-slate-100 pt-1.5">
            Automated GL Rules
          </div>
        </div>

        {/* Card 4 (Green Accent #DCFCE7): Success #DCFCE7 */}
        <div className="p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-emerald-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1.5">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Success</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">#DCFCE7</span>
          </div>
          <div className="text-2xl font-black text-emerald-900 tracking-tight my-1">
            100.0%
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 truncate border-t border-emerald-100 pt-1.5">
            Reconciliation & Isolation
          </div>
        </div>

        {/* Card 5 (Yellow Accent #FEF9C3): Warning #FEF9C3 */}
        <div className="p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-amber-200/80 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-1.5">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Warning</span>
            </span>
            <span className="font-mono text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">#FEF9C3</span>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight my-1">
            {periods.filter(p => p.status === 'open').length}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 truncate border-t border-amber-100 pt-1.5">
            Open Period(s) Protected
          </div>
        </div>

        {/* Card 6 (Red Accent #FEE2E2): Danger #FEE2E2 */}
        <div className="p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-rose-200/80 shadow-sm hover:shadow-md hover:border-rose-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 mb-1.5">
            <span className="flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              <span>Danger</span>
            </span>
            <span className="font-mono text-[10px] text-rose-700 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">#FEE2E2</span>
          </div>
          <div className="text-2xl font-black text-rose-900 tracking-tight my-1">
            0
          </div>
          <div className="text-[11px] text-rose-700 mt-1 truncate border-t border-rose-100 pt-1.5">
            Zero Hazard Integrity Alerts
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: Frosted Glass Data Table Module */}
      <div className="rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        {/* Table Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Enterprise Ledger & State Master</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredRows.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                High-contrast multi-tenant ledger verification and security states.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-all shadow-sm"
              >
                <Filter className="w-3.5 h-3.5 text-slate-600" />
                <span>Filter</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5 z-30 animate-scaleUp">
                  <button
                    onClick={() => { setTableFilter('all'); setIsFilterOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tableFilter === 'all' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All States
                  </button>
                  <button
                    onClick={() => { setTableFilter('active'); setIsFilterOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tableFilter === 'active' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Active / Verified Only
                  </button>
                  <button
                    onClick={() => { setTableFilter('warnings'); setIsFilterOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tableFilter === 'warnings' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Locked Guard Only
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clean Responsive High-Contrast Data Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-700 tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Last Modified</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0 shadow-sm">
                        {row.avatar}
                      </div>
                      <span className="font-semibold text-slate-900 truncate max-w-[200px]">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {row.data}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {row.lastModified}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-mono text-xs">
                    {row.table}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant={row.stateType} size="xs">
                      {row.state}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
