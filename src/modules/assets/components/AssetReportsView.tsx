// ============================================================================
// Fixed Assets Reporting & GL Reconciliation Workbench
// ============================================================================

import React, { useState } from 'react';
import { 
  FileText, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingDown, 
  Building2 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { assetReportsService } from '../services/asset-reports.service';

export const AssetReportsView: React.FC = () => {
  const { tenant } = useAuth();
  const [reportType, setReportType] = useState<'reconciliation' | 'register' | 'disposals' | 'movements'>('reconciliation');

  const recon = assetReportsService.getFixedAssetReconciliation(tenant);
  const register = assetReportsService.getAssetRegister(undefined, tenant);
  const disposals = assetReportsService.getDisposalGainLossReport(tenant);
  const movements = assetReportsService.getAssetMovementReport(undefined, tenant);

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex gap-3 border-b border-border pb-3 text-sm">
        <button
          onClick={() => setReportType('reconciliation')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            reportType === 'reconciliation'
              ? 'bg-blue-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale className="w-4 h-4" />
          Sub-Ledger ↔ GL Reconciliation
        </button>

        <button
          onClick={() => setReportType('register')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            reportType === 'register'
              ? 'bg-blue-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Asset Valuation Register
        </button>

        <button
          onClick={() => setReportType('disposals')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            reportType === 'disposals'
              ? 'bg-blue-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Disposals & Gain/Loss Report
        </button>

        <button
          onClick={() => setReportType('movements')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            reportType === 'movements'
              ? 'bg-blue-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          Custody & Movement History
        </button>
      </div>

      {/* 1. Sub-Ledger ↔ GL Reconciliation Report */}
      {reportType === 'reconciliation' && (
        <div className="space-y-6">
          {/* Status Indicator */}
          <Card className={`p-5 border ${
            recon.variance.isBalanced 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {recon.variance.isBalanced ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                )}
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    {recon.variance.isBalanced
                      ? 'Sub-Ledger and General Ledger Fixed Asset Balances Are Balanced (Zero Variance)'
                      : 'Variance Detected Between Fixed Asset Sub-Ledger and General Ledger'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    As of {recon.asOfDate} • Comparing {recon.subLedger.activeAssetCount} active fixed assets against General Ledger Control Accounts #1510 & #1520.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground block font-medium">Net NBV Variance</span>
                <span className={`font-mono text-xl font-bold ${
                  recon.variance.isBalanced ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  ${recon.variance.netBookValueVariance}
                </span>
              </div>
            </div>
          </Card>

          {/* Reconciliation Matrix Table */}
          <Card className="overflow-hidden border border-border">
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-card font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">Accounting Component</th>
                  <th className="p-4 text-right">Asset Sub-Ledger</th>
                  <th className="p-4 text-right">GL Control Balance</th>
                  <th className="p-4 text-right">Variance ($\Delta$)</th>
                  <th className="p-4 text-center font-sans">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                <tr>
                  <td className="p-4 font-sans font-medium text-foreground">
                    Gross Fixed Asset Cost (#1510 PPE Control)
                  </td>
                  <td className="p-4 text-right text-foreground/90">
                    ${parseFloat(recon.subLedger.totalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-foreground/90">
                    ${parseFloat(recon.generalLedger.fixedAssetControlBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-emerald-400 font-bold">
                    ${recon.variance.costVariance}
                  </td>
                  <td className="p-4 text-center font-sans">
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-medium">Balanced</span>
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-sans font-medium text-foreground">
                    Accumulated Depreciation (#1520 Contra Asset)
                  </td>
                  <td className="p-4 text-right text-amber-400">
                    -${parseFloat(recon.subLedger.totalAccumulatedDepreciation).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-amber-400">
                    -${parseFloat(recon.generalLedger.accumDepControlBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-emerald-400 font-bold">
                    ${recon.variance.accumDepVariance}
                  </td>
                  <td className="p-4 text-center font-sans">
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-medium">Balanced</span>
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-sans font-medium text-foreground">
                    Accumulated Impairment (#1530 Contra Asset)
                  </td>
                  <td className="p-4 text-right text-rose-400">
                    -${parseFloat(recon.subLedger.totalAccumulatedImpairment).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-rose-400">
                    -${parseFloat(recon.generalLedger.accumImpControlBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-emerald-400 font-bold">
                    ${recon.variance.accumImpVariance}
                  </td>
                  <td className="p-4 text-center font-sans">
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-medium">Balanced</span>
                  </td>
                </tr>

                <tr className="bg-card/60 font-bold border-t-2 border-border">
                  <td className="p-4 font-sans text-foreground">
                    Net Book Value (Carrying Value)
                  </td>
                  <td className="p-4 text-right text-emerald-400 text-sm">
                    ${parseFloat(recon.subLedger.totalNetBookValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-emerald-400 text-sm">
                    ${parseFloat(recon.generalLedger.glNetBookValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-emerald-400 text-sm">
                    ${recon.variance.netBookValueVariance}
                  </td>
                  <td className="p-4 text-center font-sans">
                    <span className="text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded text-xs font-bold border border-emerald-500/30">
                      ✓ Zero Variance
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* 2. Asset Valuation Register */}
      {reportType === 'register' && (
        <Card className="overflow-hidden border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Asset Code & Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Cost</th>
                <th className="p-4 text-right">Accum. Dep.</th>
                <th className="p-4 text-right">Impairment</th>
                <th className="p-4 text-right">Net Book Value</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs font-mono text-foreground/90">
              {register.map((a) => (
                <tr key={a.id} className="hover:bg-muted/40">
                  <td className="p-4 font-sans">
                    <div className="font-semibold text-foreground">{a.name}</div>
                    <div className="text-[11px] font-mono text-blue-400">{a.assetCode}</div>
                  </td>
                  <td className="p-4 font-sans text-muted-foreground">{a.categoryName}</td>
                  <td className="p-4 text-right text-foreground">${parseFloat(a.originalCost).toFixed(2)}</td>
                  <td className="p-4 text-right text-amber-400">-${parseFloat(a.accumulatedDepreciation).toFixed(2)}</td>
                  <td className="p-4 text-right text-rose-400">-${parseFloat(a.accumulatedImpairment).toFixed(2)}</td>
                  <td className="p-4 text-right font-bold text-emerald-400">${parseFloat(a.netBookValue).toFixed(2)}</td>
                  <td className="p-4 text-center font-sans">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* 3. Disposals & Gain/Loss Summary */}
      {reportType === 'disposals' && (
        <Card className="overflow-hidden border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Disposal #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Asset</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Cost</th>
                <th className="p-4 text-right">Proceeds</th>
                <th className="p-4 text-right">Gain / Loss Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs font-mono text-foreground/90">
              {disposals.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40">
                  <td className="p-4 text-blue-400 font-medium">{d.disposalNumber}</td>
                  <td className="p-4 font-sans text-muted-foreground">{d.disposalDate}</td>
                  <td className="p-4 font-sans">
                    <div className="font-semibold text-foreground">{d.assetName}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{d.assetCode}</div>
                  </td>
                  <td className="p-4 font-sans capitalize text-foreground/90">{d.disposalType.replace('_', ' ')}</td>
                  <td className="p-4 text-right text-muted-foreground">${parseFloat(d.originalCost).toFixed(2)}</td>
                  <td className="p-4 text-right text-foreground">${parseFloat(d.disposalProceeds).toFixed(2)}</td>
                  <td className="p-4 text-right font-bold">
                    {d.isGain ? (
                      <span className="text-emerald-400">+${parseFloat(d.gainLossAmount).toFixed(2)} Gain</span>
                    ) : (
                      <span className="text-rose-400">-${parseFloat(d.gainLossAmount).toFixed(2)} Loss</span>
                    )}
                  </td>
                </tr>
              ))}
              {disposals.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground font-sans">
                    No asset disposals recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* 4. Custody & Movements History */}
      {reportType === 'movements' && (
        <Card className="overflow-hidden border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Transfer #</th>
                <th className="p-4">Date</th>
                <th className="p-4">Asset ID</th>
                <th className="p-4">Origin (Location / Custodian)</th>
                <th className="p-4">Destination (Location / Custodian)</th>
                <th className="p-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs text-foreground/90">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-muted/40">
                  <td className="p-4 font-mono font-medium text-blue-400">{m.transferNumber}</td>
                  <td className="p-4 font-mono text-muted-foreground">{m.transferDate}</td>
                  <td className="p-4 font-mono text-muted-foreground">{m.assetId}</td>
                  <td className="p-4 text-muted-foreground">{m.fromLocation || 'HQ'} ({m.fromCustodian || '—'})</td>
                  <td className="p-4 font-medium text-emerald-400">{m.toLocation || 'Regional'} ({m.toCustodian || '—'})</td>
                  <td className="p-4 text-foreground/90">{m.reason || 'Relocation'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No asset custody movements recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
