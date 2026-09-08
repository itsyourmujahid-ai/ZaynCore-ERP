import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  RefreshCw,
  TrendingUp,
  FileCheck,
  Play,
  Landmark
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { AccrualsPrepaymentsService } from '../services/accruals-prepayments.service';
import { AdvancedFinancialsService, YearEndPreClosingSummary } from '../services/advanced-financials.service';

export const EnterpriseFinancialsView: React.FC = () => {
  const { tenant } = useAuth();
  const accrualsService = AccrualsPrepaymentsService.getInstance();
  const advancedFinService = AdvancedFinancialsService.getInstance();

  const [subTab, setSubTab] = useState<'accruals' | 'recurring' | 'year-end' | 'fx-ecl' | 'clearing'>('accruals');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Accruals & Deferrals Data
  const accruals = db.getAccruals(tenant);
  const prepayments = db.getPrepaymentSchedules(tenant);
  const deferredRevs = db.getDeferredRevenueSchedules(tenant);
  const provisions = db.getProvisions(tenant);
  const recurringTemplates = db.getRecurringJournalTemplates(tenant);

  // Year End Closing State
  const fiscalYears = db.getFiscalYears(tenant);
  const selectedFy = fiscalYears[0];
  const [yearEndSummary, setYearEndSummary] = useState<YearEndPreClosingSummary | null>(() => {
    if (selectedFy) {
      try {
        return advancedFinService.getYearEndPreClosingSummary(selectedFy.id, tenant);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // FX & ECL State
  const [spotRateUsdOmr, setSpotRateUsdOmr] = useState('0.3845');
  const fxRevalCalc = advancedFinService.calculateFxRevaluation(
    new Date().toISOString().slice(0, 10),
    [{ currency: 'USD', spotRate: spotRateUsdOmr }],
    tenant
  );

  const eclCalc = advancedFinService.calculateEcl(new Date().toISOString().slice(0, 10), undefined, tenant);
  const clearingSummary = advancedFinService.getClearingAccountsSummary(tenant);

  // Handlers
  const handleTriggerAutoReversals = () => {
    const today = new Date().toISOString().slice(0, 10);
    const results = accrualsService.processDueAutoReversals(today, tenant);
    setSuccessMessage(`Processed ${results.length} due accrual auto-reversals successfully.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleExecuteYearEndClose = () => {
    if (!selectedFy) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = advancedFinService.executeYearEndClose(selectedFy.id, today, tenant);
      setSuccessMessage(`Fiscal Year ${selectedFy.name} closed successfully! Journal: ${res.journalEntryId || 'N/A'}`);
      setYearEndSummary(advancedFinService.getYearEndPreClosingSummary(selectedFy.id, tenant));
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`Year-End Close Error: ${err.message}`);
    }
  };

  const handlePostEcl = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = advancedFinService.postEclProvision({ asOfDate: today }, tenant);
      setSuccessMessage(`IFRS 9 ECL Provision posted successfully! Adjustment: ${res.eclCalculation.incrementalAdjustment}`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`ECL Post Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'accruals', label: 'Accruals & Deferrals', icon: <Layers className="w-3.5 h-3.5" />, count: accruals.length + prepayments.length + deferredRevs.length },
            { id: 'recurring', label: 'Recurring Journals', icon: <RefreshCw className="w-3.5 h-3.5" />, count: recurringTemplates.length },
            { id: 'year-end', label: 'Year-End Closing', icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'fx-ecl', label: 'FX Reval & IFRS 9 ECL', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'clearing', label: 'Clearing & Suspense', icon: <Landmark className="w-3.5 h-3.5" />, count: clearingSummary.actionRequiredCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subTab === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-100 text-brand-700 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {subTab === 'accruals' && (
          <Button size="xs" variant="outline" icon={<Play className="w-3 h-3 text-emerald-600" />} onClick={handleTriggerAutoReversals}>
            Run Due Auto-Reversals
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* SUB-TAB 1: ACCRUALS & DEFERRALS */}
      {subTab === 'accruals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Active Accruals" subtitle="Expense & revenue accruals">
              <div className="text-2xl font-bold font-mono text-slate-900">{accruals.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">With automated period reversal support</div>
            </Card>
            <Card title="Prepayment Schedules" subtitle="Deferred expense assets">
              <div className="text-2xl font-bold font-mono text-slate-900">{prepayments.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Straight-line monthly amortization</div>
            </Card>
            <Card title="Deferred Revenues" subtitle="Unearned revenue liabilities">
              <div className="text-2xl font-bold font-mono text-slate-900">{deferredRevs.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Milestone/monthly recognition</div>
            </Card>
            <Card title="Accounting Provisions" subtitle="IAS 37 liabilities">
              <div className="text-2xl font-bold font-mono text-slate-900">{provisions.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">Warranty, legal & restructuring</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Operational Accruals Register" subtitle="Accrued liabilities and receivables with auto-reversals">
              {accruals.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {accruals.map((acc: any) => (
                    <div key={acc.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{acc.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Date: {acc.accrualDate} {acc.autoReverseDate ? `• Auto-Reverse: ${acc.autoReverseDate}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">${acc.amount} {acc.currency}</div>
                        <StatusBadge status={acc.status} size="xs" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">No accruals currently registered.</div>
              )}
            </Card>

            <Card title="Prepayment Amortization Schedules" subtitle="Prepaid rent, insurance, and subscription assets">
              {prepayments.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {prepayments.map((prep: any) => (
                    <div key={prep.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{prep.name || prep.scheduleNumber}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {prep.totalPeriods} Periods • Amortized: ${prep.recognizedAmount || '0.00'} / ${prep.totalAmount}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">${prep.remainingAmount}</div>
                        <StatusBadge status={prep.status} size="xs" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">No prepayment schedules registered.</div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RECURRING JOURNALS */}
      {subTab === 'recurring' && (
        <Card title="Recurring Journal Entry Templates" subtitle="Scheduled standing journal entries with frequency automation">
          {recurringTemplates.length > 0 ? (
            <div className="divide-y divide-slate-200 text-xs">
              {recurringTemplates.map((t: any) => {
                const totalAmt = t.lines ? t.lines.reduce((s: number, l: any) => s + parseFloat(l.debitAmount || '0'), 0).toFixed(2) : '0.00';
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{t.templateName}</span>
                        <span className="font-mono text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded uppercase font-bold">
                          {t.frequency}
                        </span>
                        <StatusBadge status={t.status} size="xs" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Next Run: {t.nextRunDate}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-mono font-bold text-slate-900">${totalAmt} {t.currency}</div>
                        <div className="text-[10px] text-slate-500">Executions: {t.generatedCount || 0}</div>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          try {
                            accrualsService.generateNextRecurringJournal(t.id, t.nextRunDate, tenant);
                            setSuccessMessage(`Posted recurring journal for ${t.templateName}!`);
                            setTimeout(() => setSuccessMessage(null), 4000);
                          } catch (e: any) {
                            alert(e.message);
                          }
                        }}
                      >
                        <Play size={12} className="mr-1" /> Run Now
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">No recurring journal templates configured.</div>
          )}
        </Card>
      )}

      {/* SUB-TAB 3: YEAR-END CLOSING */}
      {subTab === 'year-end' && (
        <div className="space-y-6">
          <Card
            title={`Fiscal Year Closing Control (${yearEndSummary ? yearEndSummary.fiscalYearName : 'FY-2026'})`}
            subtitle="Automated nominal P&L closing to Retained Earnings #3200 & sub-ledger locks"
            action={
              <Button
                size="sm"
                variant="primary"
                icon={<FileCheck className="w-4 h-4" />}
                disabled={!yearEndSummary?.canClose}
                onClick={handleExecuteYearEndClose}
              >
                Execute Year-End Close
              </Button>
            }
          >
            {yearEndSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-800">Total Fiscal Revenues</div>
                    <div className="text-lg font-bold font-mono text-emerald-900">${yearEndSummary.totalRevenue}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <div className="text-xs font-semibold text-rose-800">Total Fiscal Expenses</div>
                    <div className="text-lg font-bold font-mono text-rose-900">${yearEndSummary.totalExpense}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                    <div className="text-xs font-semibold text-brand-800">Net Transfer to Retained Earnings</div>
                    <div className="text-lg font-bold font-mono text-brand-900">${yearEndSummary.netProfitLoss}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pre-Closing Validation Checklist</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                    {yearEndSummary.checklist.map((item) => (
                      <div key={item.code} className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{item.title}</div>
                          <div className="text-[11px] text-slate-500">{item.details}</div>
                        </div>
                        <StatusBadge status={item.status} size="xs" />
                      </div>
                    ))}
                  </div>
                </div>

                {yearEndSummary.nominalAccountsToClose.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Nominal Accounts Closing Journal Preview</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Code</th>
                            <th className="px-3 py-2">Account</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Balance</th>
                            <th className="px-3 py-2">Closing Entry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {yearEndSummary.nominalAccountsToClose.map((acc) => (
                            <tr key={acc.accountId}>
                              <td className="px-3 py-2 font-bold text-brand-600">{acc.accountCode}</td>
                              <td className="px-3 py-2 font-sans">{acc.accountName}</td>
                              <td className="px-3 py-2 capitalize font-sans">{acc.classification}</td>
                              <td className="px-3 py-2">${acc.balance}</td>
                              <td className="px-3 py-2 font-bold text-slate-800 uppercase">
                                {acc.closingAction} ${acc.closingAmount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">No active fiscal year found.</div>
            )}
          </Card>
        </div>
      )}

      {/* SUB-TAB 4: FX REVALUATION & IFRS 9 ECL */}
      {subTab === 'fx-ecl' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Unrealized FX Revaluation"
            subtitle="Period-end mark-to-market revaluation of foreign currency balances"
            action={
              <Button
                size="xs"
                variant="primary"
                onClick={() => {
                  try {
                    const today = new Date().toISOString().slice(0, 10);
                    advancedFinService.postFxRevaluation(
                      { asOfDate: today, rates: [{ currency: 'USD', spotRate: spotRateUsdOmr }] },
                      tenant
                    );
                    setSuccessMessage(`Unrealized FX Revaluation posted successfully!`);
                    setTimeout(() => setSuccessMessage(null), 4000);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
              >
                Post FX Revaluation
              </Button>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <label className="text-slate-700 font-medium">USD Spot Rate ({tenant.baseCurrency}):</label>
                <input
                  type="text"
                  value={spotRateUsdOmr}
                  onChange={(e) => setSpotRateUsdOmr(e.target.value)}
                  className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Calculated Net Unrealized Gain/Loss:</span>
                <span className={`font-mono font-bold text-sm ${parseFloat(fxRevalCalc.totalUnrealizedGainLoss) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ${fxRevalCalc.totalUnrealizedGainLoss} {tenant.baseCurrency}
                </span>
              </div>

              {fxRevalCalc.items.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-sans font-bold">
                      <tr>
                        <th className="px-2.5 py-2">Account</th>
                        <th className="px-2.5 py-2">Foreign Bal</th>
                        <th className="px-2.5 py-2">Book Val</th>
                        <th className="px-2.5 py-2">Revalued</th>
                        <th className="px-2.5 py-2">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fxRevalCalc.items.map((it) => (
                        <tr key={it.accountId}>
                          <td className="px-2.5 py-2 font-bold font-sans">{it.accountCode}</td>
                          <td className="px-2.5 py-2">{it.foreignBalance} {it.currency}</td>
                          <td className="px-2.5 py-2">${it.currentBookValueBase}</td>
                          <td className="px-2.5 py-2">${it.revaluedValueBase}</td>
                          <td className="px-2.5 py-2 font-bold text-emerald-700">${it.unrealizedGainLoss}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500">No active foreign currency balances requiring revaluation.</div>
              )}
            </div>
          </Card>

          <Card
            title="IFRS 9 Expected Credit Loss (ECL)"
            subtitle="Aging-based impairment matrix and bad debt allowance calculation"
            action={
              <Button size="xs" variant="primary" onClick={handlePostEcl}>
                Post ECL Provision
              </Button>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">Gross AR Receivables</div>
                  <div className="font-mono font-bold text-slate-900">${eclCalc.totalGrossAr}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">Required Provision</div>
                  <div className="font-mono font-bold text-slate-900">${eclCalc.totalRequiredProvision}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">Existing Allowance</div>
                  <div className="font-mono font-bold text-slate-900">${eclCalc.currentExistingProvision}</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-sans font-bold">
                    <tr>
                      <th className="px-2.5 py-2">Aging Tier</th>
                      <th className="px-2.5 py-2">Gross AR</th>
                      <th className="px-2.5 py-2">Loss %</th>
                      <th className="px-2.5 py-2">ECL Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eclCalc.buckets.map((b) => (
                      <tr key={b.bucket}>
                        <td className="px-2.5 py-2 font-sans font-medium">{b.label}</td>
                        <td className="px-2.5 py-2">${b.grossArAmount}</td>
                        <td className="px-2.5 py-2">{b.lossRatePct}%</td>
                        <td className="px-2.5 py-2 font-bold text-rose-700">${b.expectedLossAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SUB-TAB 5: CLEARING & SUSPENSE */}
      {subTab === 'clearing' && (
        <Card title="Clearing & Suspense Accounts Health Monitor" subtitle="Zero-balance verification for GRNI, Bank Clearing, Payroll, and General Suspense">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Total Uncleared Open Balance:</span>
                <span className="font-mono font-bold text-slate-900">${clearingSummary.totalUnclearedBalance}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Accounts Requiring Action:</span>
                <span className={`font-mono font-bold ${clearingSummary.actionRequiredCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {clearingSummary.actionRequiredCount}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Account Name</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clearingSummary.accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono font-bold text-brand-600">{acc.code}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{acc.name}</td>
                      <td className="px-4 py-2.5 capitalize text-slate-600">{acc.category}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">${acc.balance}</td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={acc.status} size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
