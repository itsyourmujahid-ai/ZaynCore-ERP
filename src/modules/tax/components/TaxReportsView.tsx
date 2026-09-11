// ============================================================================
// Tax Reports & Zero-Variance Reconciliation View
// ============================================================================

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Scale, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Globe2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { taxReconciliationService } from '../services/tax-reconciliation.service';
import { taxReportsService } from '../services/tax-reports.service';

export const TaxReportsView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeReportTab, setActiveReportTab] = useState<'reconciliation' | 'output-reg' | 'input-reg' | 'jurisdictions'>('reconciliation');

  const recon = taxReconciliationService.getReconciliationReport(tenant);
  const outputRegister = taxReportsService.getOutputTaxRegister(tenant);
  const inputRegister = taxReportsService.getInputTaxRegister(tenant);
  const jurisdictionSummary = taxReportsService.getTaxSummaryByJurisdiction(tenant);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Report Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveReportTab('reconciliation')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeReportTab === 'reconciliation'
              ? 'bg-brand-600 text-white font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Sub-Ledger ↔ GL Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveReportTab('output-reg')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeReportTab === 'output-reg'
              ? 'bg-brand-600 text-white font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Output Tax Register ({outputRegister.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('input-reg')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeReportTab === 'input-reg'
              ? 'bg-brand-600 text-white font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Input Tax Register ({inputRegister.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('jurisdictions')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeReportTab === 'jurisdictions'
              ? 'bg-brand-600 text-white font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>Tax by Jurisdiction ({jurisdictionSummary.length})</span>
        </button>
      </div>

      {/* REPORT TAB 1: RECONCILIATION MATRIX */}
      {activeReportTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Integrity Banner */}
          <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Tax Sub-Ledger ↔ General Ledger Control Audit</h3>
                  <StatusBadge status={recon.isFullyReconciled ? 'reconciled' : 'unreconciled'} size="xs" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Single-source-of-truth mathematical validation comparing Tax Sub-Ledger totals with GL Accounts #2200, #1450, and #2210.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-mono block">Variance Threshold</span>
              <span className="font-mono text-xs font-bold text-emerald-400">$0.0000 (Exact Match)</span>
            </div>
          </div>

          {/* Reconciliation Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                Output Tax Reconciliation
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub-Ledger Total:</span>
                  <span className="font-mono font-bold text-foreground">${parseFloat(recon.outputTaxSubLedgerAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GL #2200 Control:</span>
                  <span className="font-mono font-bold text-sky-400">${parseFloat(recon.outputTaxGLControlAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold">
                  <span className="text-foreground/90">Variance:</span>
                  <span className="font-mono text-emerald-400">${parseFloat(recon.outputTaxVariance).toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Input Tax Reconciliation
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub-Ledger Total:</span>
                  <span className="font-mono font-bold text-foreground">${parseFloat(recon.inputTaxSubLedgerAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GL #1450 Control:</span>
                  <span className="font-mono font-bold text-emerald-400">${parseFloat(recon.inputTaxGLControlAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold">
                  <span className="text-foreground/90">Variance:</span>
                  <span className="font-mono text-emerald-400">${parseFloat(recon.inputTaxVariance).toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Net Tax Liability Integrity
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sub-Ledger Net:</span>
                  <span className="font-mono font-bold text-foreground">${parseFloat(recon.netSubLedgerLiability).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GL Control Net:</span>
                  <span className="font-mono font-bold text-amber-400">${parseFloat(recon.netGLTaxLiability).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold">
                  <span className="text-foreground/90">Net Variance:</span>
                  <span className="font-mono text-emerald-400">${parseFloat(recon.netVariance).toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown by Tax Code Table */}
          <Card title="Tax Code ↔ GL Control Breakdown" subtitle="Detailed audit by individual tax code and GL balance">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-card/60 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Tax Code</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3">Sub-Ledger Tax</th>
                    <th className="py-2.5 px-3">GL Account Code</th>
                    <th className="py-2.5 px-3">GL Account Balance</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground/90">
                  {recon.breakdownByTaxCode.map((row) => (
                    <tr key={row.taxCode} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{row.taxCode}</td>
                      <td className="py-2.5 px-3 font-mono text-foreground/90">{(parseFloat(row.rate) * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 font-mono text-foreground">${parseFloat(row.subLedgerTaxAmount).toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">#{row.glAccountCode}</td>
                      <td className="py-2.5 px-3 font-mono text-foreground">${parseFloat(row.glBalance).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        ${parseFloat(row.variance).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* REPORT TAB 2: OUTPUT TAX REGISTER */}
      {activeReportTab === 'output-reg' && (
        <Card title="Output Tax Register (Sales & Invoicing)" subtitle="Itemized sales invoice tax collection schedule">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Tax Code</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3 text-right">Taxable Base</th>
                  <th className="py-2.5 px-3 text-right">Output Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {outputRegister.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{e.transactionDate}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{e.documentNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{e.counterpartyName}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{e.taxCode}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{(parseFloat(e.taxRate) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground/90">${parseFloat(e.taxableAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-400">${parseFloat(e.taxAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT TAB 3: INPUT TAX REGISTER */}
      {activeReportTab === 'input-reg' && (
        <Card title="Input Tax Register (Purchases & Expenses)" subtitle="Itemized vendor bill tax recovery schedule">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Bill #</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Tax Code</th>
                  <th className="py-2.5 px-3 text-right">Taxable Base</th>
                  <th className="py-2.5 px-3 text-right">Input Tax</th>
                  <th className="py-2.5 px-3 text-right">Recoverable (Asset)</th>
                  <th className="py-2.5 px-3 text-right">Non-Recoverable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {inputRegister.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{e.transactionDate}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{e.documentNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{e.counterpartyName}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{e.taxCode}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground/90">${parseFloat(e.taxableAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground">${parseFloat(e.taxAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">${parseFloat(e.recoverableAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400">${parseFloat(e.nonRecoverableAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT TAB 4: TAX BY JURISDICTION */}
      {activeReportTab === 'jurisdictions' && (
        <Card title="Tax Summary by Sovereign Jurisdiction" subtitle="Aggregated sales, purchases, and net tax by country">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Jurisdiction</th>
                  <th className="py-2.5 px-3 text-right">Taxable Sales</th>
                  <th className="py-2.5 px-3 text-right">Output Tax</th>
                  <th className="py-2.5 px-3 text-right">Taxable Purchases</th>
                  <th className="py-2.5 px-3 text-right">Recoverable Input</th>
                  <th className="py-2.5 px-3 text-right">Net Tax Liability</th>
                  <th className="py-2.5 px-3 text-center">Tx Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground/90">
                {jurisdictionSummary.map((j) => (
                  <tr key={j.jurisdictionId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-brand-400">{j.code}</div>
                      <div className="text-[10px] text-muted-foreground">{j.name}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground/90">${parseFloat(j.taxableSales).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-400">${parseFloat(j.outputTax).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground/90">${parseFloat(j.taxablePurchases).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">${parseFloat(j.recoverableInputTax).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">${parseFloat(j.netTaxLiability).toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{j.transactionsCount}</td>
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
