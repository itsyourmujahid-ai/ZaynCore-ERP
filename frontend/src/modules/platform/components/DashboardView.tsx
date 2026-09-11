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
      name: 'ZaynCore',
      data: '#0.289 342 ETH',
      lastModified: '14 mins ago',
      table: 'Consolidated Sub-Ledger',
      state: 'Verified',
      stateType: 'purple' as const,
      avatar: 'ZC',
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
      {/* Top Banner with Clean Semantic Card Styling */}
      <div className="rounded-xl bg-card border border-border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${accentText} flex items-center gap-1.5`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>ZaynCore Platform</span>
              </span>
              <span className="text-muted-foreground/50">•</span>
              <StatusBadge status={tenant.companyTier} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 tracking-tight">
              {tenant.companyName || 'Platform Workspace Overview'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed font-normal">
              Real-time multi-tenant ledger architecture, cryptographic audit verification, and executive financial analytics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              icon={<Cpu className="w-4 h-4 text-foreground" />} 
              onClick={() => onNavigate('accounting-engine')}
              className="bg-card hover:bg-muted text-foreground border-border"
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

      {/* 1. TOP ROW: 6 Normalized Semantic Frosted KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Revenue Velocity */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
            <span>Revenue Velocity</span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" />
              <span>+12.4%</span>
            </div>
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight my-1">
            2.33M
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between border-t border-border/70 pt-1.5">
            <span>Throughput Rate</span>
            <span className="font-semibold text-primary font-mono text-[10px]">ACTIVE</span>
          </div>
        </div>

        {/* Card 2: Operating Margin */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-sm hover:border-indigo-500/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
            <span>Operating Margin</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              OPTIMIZED
            </span>
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight my-1 flex items-baseline gap-1">
            <span>25.4%</span>
            <span className="text-xs font-medium text-muted-foreground">EBITDA</span>
          </div>
          <div className="mt-1">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
              <div className="h-full bg-indigo-500 w-1/4 rounded-full" />
            </div>
          </div>
        </div>

        {/* Card 3: Automated GL Rules */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
            <span>Posting Rules</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              REAL-TIME
            </span>
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight my-1">
            {journals.length + accounts.length * 2}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 truncate border-t border-border/70 pt-1.5">
            Active Sub-Ledger Postings
          </div>
        </div>

        {/* Card 4: Reconciliation Integrity */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-xl border border-emerald-500/30 shadow-sm hover:border-emerald-500/60 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Reconciliation</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">BALANCED</span>
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight my-1">
            100.0%
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 truncate border-t border-border/70 pt-1.5">
            Sub-Ledger to GL Intact
          </div>
        </div>

        {/* Card 5: Period Lock Governance */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-xl border border-amber-500/30 shadow-sm hover:border-amber-500/60 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Governance</span>
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">LOCKED</span>
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight my-1">
            {periods.filter(p => p.status === 'open').length}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 truncate border-t border-border/70 pt-1.5">
            Open Period(s) Protected
          </div>
        </div>

        {/* Card 6: Zero Hazard Exceptions */}
        <div className="p-4 rounded-xl bg-card/85 backdrop-blur-xl border border-border/80 shadow-sm hover:border-border transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Hazard Alerts</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">CLEAN</span>
          </div>
          <div className="text-2xl font-black text-foreground tracking-tight my-1">
            0
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 truncate border-t border-border/70 pt-1.5">
            Zero Isolation Violations
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: Frosted Data Table Module */}
      <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-4">
        {/* Table Toolbar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-muted border border-border text-foreground">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>Enterprise Ledger & State Master</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                  {filteredRows.length} Records
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                High-contrast multi-tenant ledger verification and security states.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-input hover:bg-input/80 focus:bg-card border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-semibold text-foreground transition-all shadow-sm"
              >
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Filter</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-popover border border-border shadow-xl p-1.5 z-30 animate-scaleUp">
                  <button
                    onClick={() => { setTableFilter('all'); setIsFilterOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tableFilter === 'all' ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    All States
                  </button>
                  <button
                    onClick={() => { setTableFilter('active'); setIsFilterOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tableFilter === 'active' ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    Active / Verified Only
                  </button>
                  <button
                    onClick={() => { setTableFilter('warnings'); setIsFilterOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tableFilter === 'warnings' ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Last Modified</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-muted/40 ${
                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center font-bold text-[10px] text-foreground shrink-0 shadow-sm">
                        {row.avatar}
                      </div>
                      <span className="font-semibold text-foreground truncate max-w-[200px]">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-foreground">
                    {row.data}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {row.lastModified}
                  </td>
                  <td className="py-3 px-4 text-foreground font-mono text-xs">
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
