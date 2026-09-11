// ============================================================================
// Tax & VAT Executive Dashboard View
// ============================================================================

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scale, 
  ShieldCheck, 
  FileSpreadsheet, 
  Plus, 
  Landmark,
  Layers
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { taxReportsService } from '../services/tax-reports.service';
import { taxLedgerService } from '../services/tax-ledger.service';
import { db } from '@/database/storage';

export const TaxDashboardView: React.FC<{
  onNavigateTab: (tabId: string) => void;
  onOpenPrepareReturn?: () => void;
  onOpenPaymentModal?: () => void;
  onOpenAdjustmentModal?: () => void;
}> = ({ onNavigateTab, onOpenPrepareReturn }) => {
  const { tenant } = useAuth();
  const metrics = taxReportsService.getDashboardMetrics(tenant);
  const recentEntries = taxLedgerService.getEntries(tenant).slice(-6).reverse();
  const activePeriods = db.getTaxPeriods(tenant).filter((p) => p.status === 'open');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Real-Time Sub-Ledger ↔ GL Tax Integrity Assertion */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            metrics.isFullyReconciled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Tax Sub-Ledger ↔ General Ledger Control Integrity</span>
              <StatusBadge status={metrics.isFullyReconciled ? 'reconciled' : 'unreconciled'} size="xs" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.isFullyReconciled
                ? 'All Output & Recoverable Input Tax entries are 100% reconciled against GL Accounts #2200 and #1450 ($0.00 variance).'
                : 'Variance detected between Tax Sub-Ledger and General Ledger tax control accounts.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="xs" onClick={() => onNavigateTab('reports')}>
            View Reconciliation
          </Button>
          <Button variant="primary" size="xs" icon={<Plus className="w-3.5 h-3.5" />} onClick={onOpenPrepareReturn}>
            Prepare Tax Return
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Output Tax (Collected)"
          value={`$${parseFloat(metrics.totalOutputTax).toFixed(2)} ${tenant.baseCurrency}`}
          icon={<ArrowUpRight className="w-5 h-5 text-sky-400" />}
          subtext="GL #2200 Output Tax Payable"
        />
        <MetricCard
          label="Recoverable Input Tax"
          value={`$${parseFloat(metrics.totalRecoverableInputTax).toFixed(2)} ${tenant.baseCurrency}`}
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-400" />}
          subtext="GL #1450 Input Tax Asset"
        />
        <MetricCard
          label="Net Tax Liability Due"
          value={`$${parseFloat(metrics.netTaxPayable).toFixed(2)} ${tenant.baseCurrency}`}
          icon={<Scale className="w-5 h-5 text-amber-400" />}
          subtext={parseFloat(metrics.netTaxRefundable) > 0 ? `Refund Due: $${parseFloat(metrics.netTaxRefundable).toFixed(2)}` : 'Net Payable to Tax Authorities'}
        />
        <MetricCard
          label="Active Jurisdictions"
          value={metrics.activeJurisdictionsCount}
          icon={<Landmark className="w-5 h-5 text-indigo-400" />}
          subtext={`${activePeriods.length} open filing period(s)`}
        />
      </div>

      {/* Operational Workflow Cards & Recent Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Workbenches */}
        <div className="space-y-4">
          <Card title="Tax Operational Workbenches" subtitle="Fast access to tax management engines">
            <div className="space-y-2.5">
              <button
                onClick={() => onNavigateTab('returns')}
                className="w-full p-3 rounded-lg bg-card/60 border border-border hover:border-border flex items-center justify-between text-left group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground group-hover:text-brand-300 block">Tax Returns & Filings</span>
                    <span className="text-[10px] text-muted-foreground">Box-by-box return calculation & GL settlement</span>
                  </div>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground/90 text-xs">→</span>
              </button>

              <button
                onClick={() => onNavigateTab('payments')}
                className="w-full p-3 rounded-lg bg-card/60 border border-border hover:border-border flex items-center justify-between text-left group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground group-hover:text-emerald-300 block">Tax Authority Payments</span>
                    <span className="text-[10px] text-muted-foreground">Disburse liability via treasury bank accounts</span>
                  </div>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground/90 text-xs">→</span>
              </button>

              <button
                onClick={() => onNavigateTab('adjustments')}
                className="w-full p-3 rounded-lg bg-card/60 border border-border hover:border-border flex items-center justify-between text-left group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground group-hover:text-amber-300 block">Tax Adjustments</span>
                    <span className="text-[10px] text-muted-foreground">Prior period corrections & bad debt relief</span>
                  </div>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground/90 text-xs">→</span>
              </button>

              <button
                onClick={() => onNavigateTab('config')}
                className="w-full p-3 rounded-lg bg-card/60 border border-border hover:border-border flex items-center justify-between text-left group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground group-hover:text-purple-300 block">Tax Jurisdictions & Types</span>
                    <span className="text-[10px] text-muted-foreground">Multi-country authorities & registration numbers</span>
                  </div>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground/90 text-xs">→</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Recent Tax Ledger Transactions */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Tax Sub-Ledger Entries"
            subtitle="Live transaction stream from Sales, AP, and Adjustments"
            action={
              <Button variant="ghost" size="xs" onClick={() => onNavigateTab('transactions')}>
                View All ({metrics.totalTransactionsCount})
              </Button>
            }
          >
            {recentEntries.length > 0 ? (
              <div className="space-y-2.5">
                {recentEntries.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 rounded-lg bg-card/60 border border-border flex items-center justify-between hover:border-border transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-400">{e.documentNumber}</span>
                        <StatusBadge status={e.direction === 'output' ? 'paid' : 'approved'} size="xs" />
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {e.taxCode}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 mt-1 truncate">
                        {e.notes || `${e.sourceModule.toUpperCase()} transaction`} • {e.transactionDate}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-mono text-xs font-bold ${
                        e.direction === 'output' ? 'text-sky-400' : 'text-emerald-400'
                      }`}>
                        {e.direction === 'output' ? '+' : '-'}${parseFloat(e.taxAmount).toFixed(2)} {e.currency}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Base: ${parseFloat(e.taxableAmount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No posted tax transactions found in the sub-ledger.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
