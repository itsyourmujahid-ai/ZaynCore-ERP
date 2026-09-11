// ============================================================================
// Accounts Receivable (AR) Aging Analysis & Credit Risk View
// ============================================================================

import React, { useState } from 'react';
import { 
  Calendar, 
  Printer, 
  Search, 
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { accountsReceivableService, ARAgingReport } from '../services/ar.service';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { CustomerProfileModal } from './CustomerProfileModal';

export const ARAgingReportView: React.FC = () => {
  const { tenant } = useAuth();
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const report: ARAgingReport = accountsReceivableService.getARAgingReport(asOfDate, tenant);

  const filteredBuckets = report.buckets.filter((b) => {
    return !searchQuery || 
      b.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Date Filter & Metrics */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-foreground/90">
            <Calendar className="w-4 h-4 text-brand-400" />
            <span className="font-semibold">As of Date:</span>
          </div>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>
          <Button size="sm" variant="outline" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Current (0-30d)</span>
          <div className="text-base font-mono font-bold text-foreground mt-1">
            ${parseFloat(report.totalCurrent).toFixed(2)}
          </div>
          <span className="text-[10px] text-muted-foreground">Not yet overdue</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border">
          <span className="text-[10px] uppercase font-bold text-sky-400">31 - 60 Days</span>
          <div className="text-base font-mono font-bold text-foreground mt-1">
            ${parseFloat(report.total31to60).toFixed(2)}
          </div>
          <span className="text-[10px] text-muted-foreground">Early follow-up</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border">
          <span className="text-[10px] uppercase font-bold text-amber-400">61 - 90 Days</span>
          <div className="text-base font-mono font-bold text-amber-400 mt-1">
            ${parseFloat(report.total61to90).toFixed(2)}
          </div>
          <span className="text-[10px] text-muted-foreground">Notice required</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border">
          <span className="text-[10px] uppercase font-bold text-rose-400">Over 90 Days</span>
          <div className="text-base font-mono font-bold text-rose-400 mt-1">
            ${parseFloat(report.totalOver90).toFixed(2)}
          </div>
          <span className="text-[10px] text-muted-foreground">High credit risk</span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-brand-500/30 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-brand-400">Grand Total AR</span>
          <div className="text-base font-mono font-bold text-brand-400 mt-1">
            ${parseFloat(report.grandTotal).toFixed(2)} {report.currency}
          </div>
          <span className="text-[10px] text-muted-foreground">GL Account #1200</span>
        </div>
      </div>

      {/* Aging Matrix Table */}
      <Card
        title="Accounts Receivable Aging Schedule"
        subtitle={`Schedule of outstanding customer balances stratified by days past invoice due date`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5 text-right text-emerald-400">Current (0-30d)</th>
                <th className="px-5 py-3.5 text-right text-sky-400">31 - 60 Days</th>
                <th className="px-5 py-3.5 text-right text-amber-400">61 - 90 Days</th>
                <th className="px-5 py-3.5 text-right text-rose-400">&gt; 90 Days</th>
                <th className="px-5 py-3.5 text-right">Total Outstanding</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredBuckets.map((b) => (
                <tr key={b.customerId} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-foreground">{b.customerName}</div>
                    <span className="font-mono text-[10px] text-brand-400">{b.customerCode}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-foreground/90">
                    {parseFloat(b.current) > 0 ? `$${parseFloat(b.current).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-foreground/90">
                    {parseFloat(b.days31to60) > 0 ? `$${parseFloat(b.days31to60).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-amber-400">
                    {parseFloat(b.days61to90) > 0 ? `$${parseFloat(b.days61to90).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-400">
                    {parseFloat(b.over90Days) > 0 ? `$${parseFloat(b.over90Days).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground">
                    ${parseFloat(b.totalOutstanding).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={<Eye className="w-3 h-3" />}
                      onClick={() => {
                        setSelectedCustomerId(b.customerId);
                        setIsProfileModalOpen(true);
                      }}
                    >
                      Statement
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredBuckets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No customer accounts with outstanding balances.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-card/90 font-bold text-foreground">
                <td className="px-5 py-3 uppercase tracking-wider">Total Portfolio AR:</td>
                <td className="px-5 py-3 text-right font-mono text-emerald-400">${parseFloat(report.totalCurrent).toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-mono text-sky-400">${parseFloat(report.total31to60).toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-mono text-amber-400">${parseFloat(report.total61to90).toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-mono text-rose-400">${parseFloat(report.totalOver90).toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-mono text-brand-400">${parseFloat(report.grandTotal).toFixed(2)} {report.currency}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Customer Profile / Statement Modal */}
      <CustomerProfileModal
        customerId={selectedCustomerId}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};
