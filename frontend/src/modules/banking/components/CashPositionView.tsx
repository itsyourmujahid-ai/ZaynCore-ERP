// ============================================================================
// Executive Treasury Cash Position & Liquidity Forecast Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Landmark, 
  Coins, 
  Calendar, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { bankReconciliationService } from '@/modules/banking/services/bank-reconciliation.service';
import { Card } from '@/ui/components/Card';

export const CashPositionView: React.FC = () => {
  const { tenant } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));

  const position = bankReconciliationService.calculateCashPosition(asOfDate, tenant);

  return (
    <div className="space-y-5">
      {/* Date Header Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brand-400" />
            Executive Treasury Liquidity & Forecast
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time liquid bank and cash assets combined with scheduled operational receivables and payables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-brand-400" />
            Total Bank Balances
          </div>
          <div className="text-lg font-bold font-mono text-slate-100 mt-1">
            ${parseFloat(position.totalBankBalances).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">{position.bankAccounts.length} Active Accounts</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            Total Cash Drawers
          </div>
          <div className="text-lg font-bold font-mono text-slate-100 mt-1">
            ${parseFloat(position.totalCashBalances).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">{position.cashAccounts.length} Cash Drawers</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            Expected AR Inflows
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            +${parseFloat(position.expectedARInflows).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Unsettled Invoices</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            Expected AP Outflows
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-1">
            -${parseFloat(position.expectedAPOutflows).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Unpaid Supplier Bills</div>
        </div>

        <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30">
          <div className="text-[10px] text-brand-300 uppercase font-bold flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-brand-400" />
            Net Forecasted Liquidity
          </div>
          <div className="text-lg font-bold font-mono text-brand-400 mt-1">
            ${parseFloat(position.netForecastedCashPosition).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-brand-400/80">Liquid + AR - AP</div>
        </div>
      </div>

      {/* Account Breakdown Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Bank Account Asset Breakdown">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Bank Account</th>
                  <th className="p-2.5">Institution</th>
                  <th className="p-2.5 text-center">Currency</th>
                  <th className="p-2.5 text-right font-bold">Liquid Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30 font-mono text-[11px]">
                {position.bankAccounts.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="p-2.5 font-sans font-medium text-slate-200">{b.accountName}</td>
                    <td className="p-2.5 font-sans text-slate-400">{b.bankName}</td>
                    <td className="p-2.5 text-center text-slate-300">{b.currency}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-400">
                      ${parseFloat(b.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Cash Drawer Breakdown">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Cash Drawer</th>
                  <th className="p-2.5">Custodian</th>
                  <th className="p-2.5 text-center">Currency</th>
                  <th className="p-2.5 text-right font-bold">Cash Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30 font-mono text-[11px]">
                {position.cashAccounts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="p-2.5 font-sans font-medium text-slate-200">{c.accountName}</td>
                    <td className="p-2.5 font-sans text-slate-400">{c.custodianName || 'General Staff'}</td>
                    <td className="p-2.5 text-center text-slate-300">{c.currency}</td>
                    <td className="p-2.5 text-right font-bold text-amber-400">
                      ${parseFloat(c.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
