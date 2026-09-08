// ============================================================================
// Automated Accounting Engine & Posting Rules Architectural Specification
// ============================================================================

import React from 'react';
import { 
  ArrowRight, 
  Sparkles
} from 'lucide-react';
import { Card } from '@/ui/components/Card';

export const AccountingEngineSpecView: React.FC = () => {
  const lifecycleSteps = [
    { step: '1. User Input', desc: 'Operational user inputs business document (Sales invoice, PO, receipt)' },
    { step: '2. Validation', desc: 'Period lock validation, tax compliance, credit limit verification' },
    { step: '3. Approval Gate', desc: 'Departmental or threshold-based approval matrix authorization' },
    { step: '4. Auto-Posting', desc: 'Posting Engine transforms event into balanced double-entry lines' },
    { step: '5. Sub-Ledger Sync', desc: 'Updates AR / AP / Inventory sub-ledgers + General Ledger simultaneously' },
    { step: '6. Immutability', desc: 'Document locked; corrections only allowed via Reversal Entry' },
  ];

  const postingRules = [
    {
      event: 'Sales Invoice Posted',
      module: 'Sales / AR',
      debit: 'Trade Accounts Receivable (Customer Sub-ledger)',
      credit: 'Operating Revenue + Output VAT / Tax Payable',
      subledger: 'AR Sub-Ledger',
    },
    {
      event: 'Customer Payment Received',
      module: 'Banking / AR',
      debit: 'Bank Account / Cash Drawer',
      credit: 'Trade Accounts Receivable (Customer Sub-ledger)',
      subledger: 'AR Sub-Ledger + Bank Ledger',
    },
    {
      event: 'Supplier Bill Approved',
      module: 'Procurement / AP',
      debit: 'Inventory Asset or Expense Cost Center + Input VAT',
      credit: 'Trade Accounts Payable (Supplier Sub-ledger)',
      subledger: 'AP Sub-Ledger',
    },
    {
      event: 'Supplier Payment Disbursed',
      module: 'Banking / AP',
      debit: 'Trade Accounts Payable (Supplier Sub-ledger)',
      credit: 'Bank Account / Treasury Drawer',
      subledger: 'AP Sub-Ledger + Bank Ledger',
    },
    {
      event: 'Inventory Goods Receipt (GRIR)',
      module: 'Inventory / Receiving',
      debit: 'Merchandise Inventory Asset',
      credit: 'Accrued Goods Received Not Invoiced (GRIR Liability)',
      subledger: 'Inventory Sub-Ledger',
    },
    {
      event: 'Monthly Payroll Run Processed',
      module: 'Payroll / HR',
      debit: 'Gross Staff Salaries & Social Security Expense',
      credit: 'Net Salaries Payable + Withholding Taxes Payable',
      subledger: 'Payroll Sub-Ledger',
    },
    {
      event: 'Fixed Asset Depreciation Run',
      module: 'Fixed Assets',
      debit: 'Depreciation Expense (Department Cost Center)',
      credit: 'Accumulated Depreciation Contra-Asset',
      subledger: 'Asset Register Sub-Ledger',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Architectural Core</span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-400">Phase 1 Foundation Rule Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">Automated Posting Engine Specification</h1>
        <p className="text-xs text-slate-400 mt-1">
          Operational transactions never require manual journal creation. The centralized rule engine automatically generates balanced double-entry records.
        </p>
      </div>

      {/* Transaction Lifecycle Pipeline */}
      <Card
        title="Automated Transaction Lifecycle Pipeline"
        subtitle="End-to-end execution path for all commercial ERP transactions"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {lifecycleSteps.map((s, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-brand-400 font-bold uppercase block">{s.step}</span>
                <p className="text-xs text-slate-300 mt-1.5">{s.desc}</p>
              </div>
              {idx < lifecycleSteps.length - 1 && (
                <div className="hidden lg:flex items-center justify-end mt-2 text-slate-600">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Automated Double-Entry Rule Matrix */}
      <Card
        title="Master Automated Posting Rule Matrix"
        subtitle="Centralized domain mapping connecting business events to general ledger accounts"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Business Event</th>
                <th className="px-5 py-3.5">Domain Module</th>
                <th className="px-5 py-3.5">Debit Account(s)</th>
                <th className="px-5 py-3.5">Credit Account(s)</th>
                <th className="px-5 py-3.5">Sub-Ledger Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {postingRules.map((rule, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    <span>{rule.event}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {rule.module}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-emerald-400 font-medium">
                    {rule.debit}
                  </td>
                  <td className="px-5 py-3.5 text-sky-400 font-medium">
                    {rule.credit}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {rule.subledger}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sub-Ledger to General Ledger Reconciliation Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="AR & AP Sub-Ledgers" subtitle="Customer & Vendor Sub-Ledgers">
          <p className="text-xs text-slate-400">
            Individual customer invoices, credit notes, and payment allocations write to the Accounts Receivable sub-ledger. The AR Control account in the General Ledger reconciles automatically in real-time.
          </p>
        </Card>

        <Card title="Perpetual Inventory Valuation" subtitle="FIFO & Standard Cost Engine">
          <p className="text-xs text-slate-400">
            Stock movements generate automated Cost of Goods Sold (COGS) and inventory asset debits/credits, ensuring perpetual inventory reconciles directly with warehouse valuation reports.
          </p>
        </Card>

        <Card title="Audit & Reversal Protocol" subtitle="Zero In-Place Edits">
          <p className="text-xs text-slate-400">
            No posted accounting records can be deleted or modified. Corrections trigger automated reversal journals, ensuring 100% compliance with external statutory audits.
          </p>
        </Card>
      </div>
    </div>
  );
};
