// ============================================================================
// Intercompany Bilateral Reconciliation View (Phase 14)
// ============================================================================

import React, { useState } from 'react';
import { 
  Scale, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  ShieldAlert 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { 
  intercompanyReconciliationService, 
  IntercompanyReconciliationItem 
} from '../services/intercompany-reconciliation.service';

export const IntercompanyReconciliationView: React.FC = () => {
  const { tenant } = useAuth();
  const [selectedPair, setSelectedPair] = useState<IntercompanyReconciliationItem | null>(null);
  const [, setRefreshKey] = useState(0);

  const summary = intercompanyReconciliationService.reconcileIntercompanyPairs(undefined, tenant);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Bilateral Verification</span>
            <span className="text-slate-600">•</span>
            <StatusBadge status="Reconciliation Matrix" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Intercompany Reconciliation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare bilateral Intercompany Receivables vs. Payables across legal entities to detect timing, currency, and amount discrepancies.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={() => setRefreshKey(prev => prev + 1)}
        >
          Recalculate Matrix
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Bilateral Pairs</span>
              <div className="text-2xl font-bold text-slate-100 mt-1">{summary.totalPairs}</div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">{summary.matchedPairs} Matched</span> pairs
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Total IC Receivables</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">${summary.totalReceivableBalance}</div>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3">
            Originating entity assets
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Total IC Payables</span>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">${summary.totalPayableBalance}</div>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3">
            Counterparty liabilities
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Net Discrepancy</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${parseFloat(summary.netVariance) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${summary.netVariance}
              </div>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl text-slate-400 border border-slate-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-3">
            {parseFloat(summary.netVariance) === 0 ? 'Zero bilateral variance' : `${summary.discrepancyPairs} pairs out of balance`}
          </div>
        </Card>
      </div>

      {/* Reconciliation Matrix Table */}
      <Card title="Bilateral Elimination Comparison Matrix" subtitle="Entity A Receivable vs Entity B Payable verification">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Entity Pair</th>
                <th className="py-2.5 px-3 font-semibold text-right">Entity 1 Receivable</th>
                <th className="py-2.5 px-3 font-semibold text-right">Entity 2 Payable</th>
                <th className="py-2.5 px-3 font-semibold text-right">Difference</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {summary.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No active intercompany transaction pairs to reconcile.
                  </td>
                </tr>
              ) : (
                summary.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <span>{item.sourceCompanyName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.targetCompanyName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-400 font-medium">
                      ${item.sourceReceivableAmount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-400 font-medium">
                      ${item.targetPayableAmount}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${parseFloat(item.differenceAmount) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ${item.differenceAmount}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={item.status} size="xs" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedPair(item)}>
                        Inspect Transactions
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drill-down Modal */}
      {selectedPair && (
        <Modal
          isOpen={!!selectedPair}
          onClose={() => setSelectedPair(null)}
          title={`Intercompany Transactions: ${selectedPair.sourceCompanyName} ↔ ${selectedPair.targetCompanyName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Receivable Balance</span>
                <span className="font-mono font-bold text-cyan-400">${selectedPair.sourceReceivableAmount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Payable Balance</span>
                <span className="font-mono font-bold text-indigo-400">${selectedPair.targetPayableAmount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Difference</span>
                <span className={`font-mono font-bold ${parseFloat(selectedPair.differenceAmount) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${selectedPair.differenceAmount}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source Vouchers</span>
              {selectedPair.transactions.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">No transactions recorded between these entities.</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedPair.transactions.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-mono font-semibold text-slate-200">{t.transactionNumber}</div>
                        <div className="text-[10px] text-slate-400">{t.transactionDate} • {t.memo || 'Intercompany Flow'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-100">{t.amount} {t.currency}</div>
                        <StatusBadge status={t.status} size="xs" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setSelectedPair(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
