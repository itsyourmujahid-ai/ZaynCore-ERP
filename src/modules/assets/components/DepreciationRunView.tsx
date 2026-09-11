// ============================================================================
// Fixed Assets Depreciation Run & Execution Workbench
// ============================================================================

import React, { useState } from 'react';
import { 
  Play, 
  Clock, 
  AlertTriangle, 
  History 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { depreciationService, DepreciationRunPreview } from '../services/depreciation.service';

export const DepreciationRunView: React.FC = () => {
  const { tenant } = useAuth();
  const periods = db.getAccountingPeriods(tenant);
  const runs = db.getDepreciationRuns(tenant);

  // Selected period for new depreciation run
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(periods[0]?.id || '');
  const [preview, setPreview] = useState<DepreciationRunPreview | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handlePreview = () => {
    if (!selectedPeriodId) return;
    try {
      const res = depreciationService.previewDepreciationRun(selectedPeriodId, tenant);
      setPreview(res);
      setFeedbackMessage(null);
    } catch (e: any) {
      setFeedbackMessage(e.message);
      setPreview(null);
    }
  };

  const handleExecuteRun = () => {
    if (!selectedPeriodId) return;
    setIsPosting(true);
    try {
      const run = depreciationService.executeDepreciationRun(
        selectedPeriodId,
        `Monthly batch depreciation posted via workbench by ${tenant.userFullName}`,
        tenant
      );
      setFeedbackMessage(`Successfully posted depreciation run '${run.runNumber}' ($${run.totalDepreciationAmount}) for ${run.totalAssetsCount} assets.`);
      setPreview(null);
    } catch (e: any) {
      setFeedbackMessage(`Error posting depreciation: ${e.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Trigger Card */}
      <Card className="p-6 border border-border bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Monthly Batch Depreciation Process
            </h3>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Calculate and post monthly straight-line depreciation for all active fixed assets in a controlled batch. Every execution generates immutable double-entry journals (<span className="text-amber-300 font-mono">Dr #6020 Depreciation Expense, Cr #1520 Accumulated Depreciation</span>) and updates asset Net Book Values in the Sub-Ledger.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value);
                setPreview(null);
              }}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.startDate} ~ {p.endDate}) {p.status === 'closed' ? '🔒 Closed' : '✓ Open'}
                </option>
              ))}
            </select>

            <Button onClick={handlePreview} variant="outline" className="flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" />
              Preview Run
            </Button>
          </div>
        </div>

        {feedbackMessage && (
          <div className={`mt-4 p-3 rounded-lg text-xs font-medium ${
            feedbackMessage.startsWith('Error')
              ? 'bg-rose-950/40 border border-rose-500/20 text-rose-300'
              : 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-300'
          }`}>
            {feedbackMessage}
          </div>
        )}
      </Card>

      {/* Preview Section */}
      {preview && (
        <Card className="p-6 border border-amber-500/30 bg-amber-950/10 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-amber-500/20">
            <div>
              <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Depreciation Run Preview</div>
              <h4 className="text-lg font-bold text-foreground mt-0.5">
                Period: {preview.period.name} ({preview.period.startDate} to {preview.period.endDate})
              </h4>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-muted-foreground font-medium">Eligible Assets</div>
                <div className="text-lg font-bold text-foreground">{preview.eligibleAssetsCount} Units</div>
              </div>
              <div className="text-right pl-4 border-l border-amber-500/20">
                <div className="text-xs text-muted-foreground font-medium">Total Depreciation Expense</div>
                <div className="text-2xl font-black text-amber-400">
                  ${parseFloat(preview.totalDepreciationAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <Button
                onClick={handleExecuteRun}
                disabled={isPosting || preview.validationErrors.length > 0 || preview.assets.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold ml-2"
              >
                {isPosting ? 'Posting...' : 'Confirm & Post to GL'}
              </Button>
            </div>
          </div>

          {preview.validationErrors.length > 0 && (
            <div className="bg-rose-950/50 border border-rose-500/30 rounded-lg p-4 text-xs text-rose-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Validation Errors Detected:
              </div>
              {preview.validationErrors.map((err, idx) => (
                <div key={idx} className="pl-5">• {err}</div>
              ))}
            </div>
          )}

          {/* Detailed Assets Preview Table */}
          <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto bg-card/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="p-3">Asset Code & Name</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3 text-right">Current NBV</th>
                  <th className="p-3 text-right">Period Depreciation</th>
                  <th className="p-3 text-right">New Accum Dep</th>
                  <th className="p-3 text-right">New NBV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs text-foreground/90">
                {preview.assets.map((item) => (
                  <tr key={item.assetId} className="hover:bg-muted/40">
                    <td className="p-3 font-sans">
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-xs font-mono text-blue-400">{item.assetCode}</div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">${parseFloat(item.originalCost).toFixed(2)}</td>
                    <td className="p-3 text-right text-muted-foreground">${parseFloat(item.currentNBV).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-amber-400">${parseFloat(item.periodDepreciation).toFixed(2)}</td>
                    <td className="p-3 text-right text-foreground/90">${parseFloat(item.newAccumDep).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">${parseFloat(item.newNBV).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Historical Depreciation Runs Register */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          Historical Depreciation Runs Log ({runs.length})
        </h4>

        <Card className="overflow-hidden border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Run #</th>
                <th className="p-4">Period</th>
                <th className="p-4">Posting Date</th>
                <th className="p-4 text-right">Assets Count</th>
                <th className="p-4 text-right">Total Depreciation</th>
                <th className="p-4">Posted By</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs text-foreground/90">
              {runs.map((r) => {
                const period = periods.find((p) => p.id === r.periodId);
                return (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="p-4 font-mono font-medium text-blue-400">{r.runNumber}</td>
                    <td className="p-4 font-medium text-foreground">{period?.name || r.periodId}</td>
                    <td className="p-4 text-muted-foreground font-mono">{r.runDate}</td>
                    <td className="p-4 text-right font-mono text-foreground">{r.totalAssetsCount} Assets</td>
                    <td className="p-4 text-right font-mono font-bold text-amber-400">
                      ${parseFloat(r.totalDepreciationAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-muted-foreground">{r.postedBy || 'System Administrator'}</td>
                    <td className="p-4 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No batch depreciation runs have been executed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};
