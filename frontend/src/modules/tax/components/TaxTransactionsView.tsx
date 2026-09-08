// ============================================================================
// Tax Sub-Ledger Transactions View
// ============================================================================

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { taxLedgerService } from '../services/tax-ledger.service';
import { db } from '@/database/storage';

export const TaxTransactionsView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'both' | 'output' | 'input'>('both');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const jurisdictions = db.getTaxJurisdictions(tenant);
  const entries = taxLedgerService.getEntries(tenant, {
    direction: directionFilter,
    jurisdictionId: jurisdictionFilter || undefined,
    sourceModule: moduleFilter || undefined,
  });

  const filteredEntries = entries.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.documentNumber.toLowerCase().includes(term) ||
      e.taxCode.toLowerCase().includes(term) ||
      (e.notes && e.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search document number, tax code, notes..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDirectionFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="both">All Directions</option>
            <option value="output">Output Tax (Sales)</option>
            <option value="input">Input Tax (Purchases)</option>
          </select>

          {/* Jurisdiction Filter */}
          <select
            value={jurisdictionFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setJurisdictionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Jurisdictions</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.code} ({j.countryCode})
              </option>
            ))}
          </select>

          {/* Source Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModuleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Modules</option>
            <option value="sales">Sales & AR</option>
            <option value="purchases">Procurement & AP</option>
            <option value="assets">Fixed Assets</option>
            <option value="tax_adjustment">Tax Adjustments</option>
          </select>
        </div>
      </div>

      {/* Tax Sub-Ledger Table */}
      <Card
        title="Tax Sub-Ledger Register"
        subtitle={`Showing ${filteredEntries.length} posted tax transaction(s)`}
      >
        {filteredEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Document #</th>
                  <th className="py-2.5 px-3">Source Module</th>
                  <th className="py-2.5 px-3">Tax Code</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3 text-right">Taxable Base</th>
                  <th className="py-2.5 px-3 text-right">Tax Amount</th>
                  <th className="py-2.5 px-3 text-right">Recoverable</th>
                  <th className="py-2.5 px-3 text-center">GL Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">{e.transactionDate}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-400 whitespace-nowrap">
                      {e.documentNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 uppercase">
                        {e.sourceModule}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200 font-mono">{e.taxCode}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">
                      {(parseFloat(e.taxRate) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                        e.direction === 'output' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {e.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      ${parseFloat(e.taxableAmount).toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                      e.direction === 'output' ? 'text-sky-400' : 'text-emerald-400'
                    }`}>
                      ${parseFloat(e.taxAmount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-300">
                      ${parseFloat(e.recoverableAmount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {e.journalEntryId ? (
                        <span className="font-mono text-[11px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">
                          {e.journalEntryId}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[10px]">Unposted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            No tax ledger entries match the selected filters.
          </div>
        )}
      </Card>
    </div>
  );
};
