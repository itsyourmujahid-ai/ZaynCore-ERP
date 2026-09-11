// ============================================================================
// Accounts Payable (AP) Aging Schedule & Reconciliation Report
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { accountsPayableService } from '@/modules/procurement/services/ap.service';
import { SupplierProfileModal } from './SupplierProfileModal';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { MetricCard } from '@/ui/data-display/MetricCard';

export const APAgingReportView: React.FC<{
  onRecordPayment?: (supplierId: string) => void;
}> = ({ onRecordPayment }) => {
  const { tenant } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);

  const agingReport = accountsPayableService.getAPAgingReport(asOfDate, tenant);

  return (
    <div className="space-y-6">
      {/* Date Filter & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        <div>
          <h2 className="text-sm font-bold text-foreground">Accounts Payable Aging Schedule</h2>
          <p className="text-xs text-muted-foreground">Aging analysis based on vendor invoice due dates</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">As of Date:</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Metric Bucket Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MetricCard
          label="Current (Not Due)"
          value={`$${parseFloat(agingReport.buckets.currentTotal).toFixed(2)}`}
          subtext="Within payment terms"
        />
        <MetricCard
          label="1 - 30 Days Past"
          value={`$${parseFloat(agingReport.buckets.days31to60Total).toFixed(2)}`}
          subtext="Past due 1-30 days"
        />
        <MetricCard
          label="31 - 60 Days Past"
          value={`$${parseFloat(agingReport.buckets.days61to90Total).toFixed(2)}`}
          subtext="Past due 31-60 days"
        />
        <MetricCard
          label="61+ Days Past"
          value={`$${parseFloat(agingReport.buckets.over90DaysTotal).toFixed(2)}`}
          subtext="Critical follow-up"
        />
        <MetricCard
          label="Total Payables"
          value={`$${parseFloat(agingReport.totalPayables).toFixed(2)}`}
          subtext="Total AP balance"
        />
      </div>

      {/* Aging Table Card */}
      <Card
        title="Supplier Aging Analysis Matrix"
        subtitle={`Detailed aging breakdown per supplier as of ${asOfDate}`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Supplier Name & Code</th>
                <th className="px-5 py-3.5 text-right">Current</th>
                <th className="px-5 py-3.5 text-right">1 - 30 Days</th>
                <th className="px-5 py-3.5 text-right">31 - 60 Days</th>
                <th className="px-5 py-3.5 text-right">61+ Days</th>
                <th className="px-5 py-3.5 text-right font-bold text-foreground">Total Outstanding</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {agingReport.rows.map((row) => (
                <tr key={row.supplierId} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="font-semibold text-foreground">{row.supplierName}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono ml-5.5">{row.supplierCode}</div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-foreground">
                    {parseFloat(row.current) > 0 ? `$${parseFloat(row.current).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-amber-300">
                    {parseFloat(row.days31to60) > 0 ? `$${parseFloat(row.days31to60).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-amber-500">
                    {parseFloat(row.days61to90) > 0 ? `$${parseFloat(row.days61to90).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-400">
                    {parseFloat(row.over90Days) > 0 ? `$${parseFloat(row.over90Days).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-brand-400">
                    ${parseFloat(row.totalOutstanding).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => setProfileSupplierId(row.supplierId)}
                      >
                        Profile
                      </Button>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => onRecordPayment?.(row.supplierId)}
                      >
                        Pay
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {agingReport.rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No outstanding accounts payable due as of {asOfDate}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Supplier Profile Modal */}
      <SupplierProfileModal
        supplierId={profileSupplierId}
        isOpen={!!profileSupplierId}
        onClose={() => setProfileSupplierId(null)}
        onOpenNewPayment={onRecordPayment}
      />
    </div>
  );
};
