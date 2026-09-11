// ============================================================================
// Sub-Ledger Reconciliation & GL Control Account Variance Inspector
// ============================================================================

import React, { useState } from 'react';
import { 
  CreditCard, 
  Landmark, 
  Boxes, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Percent,
  Users,
  ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { subLedgerService, SubLedgerReconciliationReport } from '../services/sub-ledger.service';
import { Card } from '@/ui/components/Card';
import { SubLedgerType } from '@/core/types/common';

export const SubLedgerReconciliationView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeSubLedger, setActiveSubLedger] = useState<SubLedgerType>('customer');
  const [searchQuery, setSearchQuery] = useState('');

  const report: SubLedgerReconciliationReport = subLedgerService.reconcileSubLedger(activeSubLedger, tenant);

  const subLedgerTabs = [
    { id: 'customer', label: 'Accounts Receivable (AR)', icon: <CreditCard className="w-3.5 h-3.5" />, code: '1200' },
    { id: 'supplier', label: 'Accounts Payable (AP)', icon: <CreditCard className="w-3.5 h-3.5" />, code: '2010' },
    { id: 'bank_account', label: 'Bank & Treasury Accounts', icon: <Landmark className="w-3.5 h-3.5" />, code: '1010' },
    { id: 'inventory_item', label: 'Perpetual Inventory', icon: <Boxes className="w-3.5 h-3.5" />, code: '1300' },
    { id: 'fixed_asset', label: 'Capitalized Assets', icon: <Building2 className="w-3.5 h-3.5" />, code: '1510' },
    { id: 'tax_code', label: 'Tax & VAT Control', icon: <Percent className="w-3.5 h-3.5" />, code: '2200' },
    { id: 'employee', label: 'Payroll & Staff Payables', icon: <Users className="w-3.5 h-3.5" />, code: '2300' },
    { id: 'intercompany', label: 'Intercompany Clearing', icon: <ArrowLeftRight className="w-3.5 h-3.5" />, code: '1220' },
  ];

  const filteredEntities = report.entities.filter((e) => {
    if (!searchQuery) return true;
    return e.entityName.toLowerCase().includes(searchQuery.toLowerCase()) || e.entityId.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-5">
      {/* Sub-Ledger Type Selector Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {subLedgerTabs.map((tab) => {
          const isActive = activeSubLedger === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubLedger(tab.id as SubLedgerType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all select-none border-b-2 ${
                isActive
                  ? 'border-brand-500 text-brand-400 bg-card/60'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-card/30'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">#{tab.code}</span>
            </button>
          );
        })}
      </div>

      {/* Reconciliation Comparison Header Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-border grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Sub-Ledger Total</span>
          <div className="text-xl font-mono font-bold text-foreground mt-1">
            ${parseFloat(report.subLedgerTotalBalance).toFixed(2)} {tenant.baseCurrency}
          </div>
          <span className="text-xs text-muted-foreground">Aggregated from individual items</span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground">GL Control Account (#{report.glAccountCode})</span>
          <div className="text-xl font-mono font-bold text-brand-400 mt-1">
            ${parseFloat(report.glControlAccountBalance).toFixed(2)} {tenant.baseCurrency}
          </div>
          <span className="text-xs text-muted-foreground">{report.glAccountName}</span>
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          report.isReconciled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div>
            <span className={`text-[10px] uppercase font-bold ${report.isReconciled ? 'text-emerald-400' : 'text-rose-400'}`}>
              Reconciliation Variance
            </span>
            <div className={`text-base font-mono font-bold mt-0.5 ${report.isReconciled ? 'text-emerald-300' : 'text-rose-300'}`}>
              ${parseFloat(report.variance).toFixed(2)}
            </div>
          </div>
          <div className={`p-2 rounded-full ${report.isReconciled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {report.isReconciled ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Sub-Ledger Entity Register */}
      <Card
        title={`${report.subLedgerName} Breakdown`}
        subtitle="Individual entity balances reconciled against general ledger"
        action={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3">Entity ID</th>
                <th className="px-5 py-3">Entity Name</th>
                <th className="px-5 py-3 text-right">Debit Total</th>
                <th className="px-5 py-3 text-right">Credit Total</th>
                <th className="px-5 py-3 text-right">Net Sub-Ledger Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredEntities.map((ent) => (
                <tr key={ent.entityId} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono font-bold text-brand-400">{ent.entityId}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{ent.entityName}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-400">${parseFloat(ent.totalDebit).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono text-sky-400">${parseFloat(ent.totalCredit).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-foreground">
                    ${parseFloat(ent.netBalance).toFixed(2)} {ent.currency}
                  </td>
                </tr>
              ))}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    No individual sub-ledger entries recorded. Sub-ledger balance is currently $0.00.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-card/90 font-bold border-t border-border text-foreground">
                <td colSpan={4} className="px-5 py-3 text-right uppercase tracking-wider">Sub-Ledger Total:</td>
                <td className="px-5 py-3 text-right font-mono text-brand-400">
                  ${parseFloat(report.subLedgerTotalBalance).toFixed(4)} {tenant.baseCurrency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};
