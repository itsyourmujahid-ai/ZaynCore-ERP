// ============================================================================
// Intercompany Transactions Workbench View (Phase 14)
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { intercompanyService } from '../services/intercompany.service';
import { DbIntercompanyTransaction } from '@/database/types';

export const IntercompanyTransactionsView: React.FC = () => {
  const { tenant } = useAuth();
  const transactions = intercompanyService.getTransactions(tenant);
  const companies = db.getCompanies();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTx, setSelectedTx] = useState<DbIntercompanyTransaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState({
    sourceCompanyId: tenant.companyId,
    targetCompanyId: companies.find((c) => c.id !== tenant.companyId)?.id || '',
    transactionType: 'sales_purchase' as any,
    transactionDate: new Date().toISOString().split('T')[0],
    amount: '5000.00',
    currency: tenant.baseCurrency || 'USD',
    exchangeRate: '1.000000',
    memo: '',
  });

  const filteredTx = transactions.filter((t) =>
    t.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.memo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      intercompanyService.createTransaction(form, tenant);
      setIsModalOpen(false);
      setForm({
        sourceCompanyId: tenant.companyId,
        targetCompanyId: companies.find((c) => c.id !== tenant.companyId)?.id || '',
        transactionType: 'sales_purchase',
        transactionDate: new Date().toISOString().split('T')[0],
        amount: '5000.00',
        currency: tenant.baseCurrency || 'USD',
        exchangeRate: '1.000000',
        memo: '',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create intercompany transaction.');
    }
  };

  const handleApprove = (id: string) => {
    setErrorMessage('');
    try {
      intercompanyService.approveTransaction(id, tenant);
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval failed.');
    }
  };

  const handlePost = (id: string) => {
    setErrorMessage('');
    try {
      intercompanyService.postTransaction(id, tenant);
    } catch (err: any) {
      setErrorMessage(err.message || 'Posting failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Intercompany Engine</span>
            <span className="text-slate-600">•</span>
            <StatusBadge status="Synchronized GL" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Intercompany Transactions</h1>
          <p className="text-xs text-slate-400 mt-1">
            Execute cross-company transactions with synchronized bidirectional double-entry General Ledger postings.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
          disabled={companies.length < 2}
        >
          New Intercompany Transaction
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Transactions Register */}
      <Card
        title="Cross-Entity Transaction Ledger"
        subtitle={`${filteredTx.length} synchronized transactions recorded`}
        action={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Tx Number</th>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Source Entity</th>
                <th className="py-2.5 px-3 font-semibold">Target Entity</th>
                <th className="py-2.5 px-3 font-semibold">Type</th>
                <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No intercompany transactions found. Click 'New Intercompany Transaction' to record cross-company flows.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => {
                  const sourceComp = companies.find((c) => c.id === tx.sourceCompanyId);
                  const targetComp = companies.find((c) => c.id === tx.targetCompanyId);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-cyan-400">
                        {tx.transactionNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{tx.transactionDate}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{sourceComp?.name || tx.sourceCompanyId}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{sourceComp?.code}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{targetComp?.name || tx.targetCompanyId}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{targetComp?.code}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize text-slate-300">{tx.transactionType.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-100">
                        {tx.amount} <span className="text-[10px] text-slate-500">{tx.currency}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={tx.status} size="xs" />
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        {tx.status === 'draft' && (
                          <Button size="sm" variant="secondary" onClick={() => handleApprove(tx.id)}>
                            Approve
                          </Button>
                        )}
                        {tx.status === 'approved' && (
                          <Button size="sm" variant="primary" onClick={() => handlePost(tx.id)}>
                            Post to GL
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => setSelectedTx(tx)}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create Intercompany Transaction */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Intercompany Transaction"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Source Entity (Originator)</label>
              <select
                value={form.sourceCompanyId}
                onChange={(e) => setForm({ ...form, sourceCompanyId: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Entity (Counterparty)</label>
              <select
                value={form.targetCompanyId}
                onChange={(e) => setForm({ ...form, targetCompanyId: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Transaction Category</label>
              <select
                value={form.transactionType}
                onChange={(e) => setForm({ ...form, transactionType: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
              >
                <option value="sales_purchase">Sales & Purchase of Goods/Services</option>
                <option value="management_fee">Corporate Management Fee</option>
                <option value="shared_service">Shared IT / Admin Service</option>
                <option value="loan_transfer">Intercompany Loan Transfer</option>
                <option value="dividend">Intercompany Dividend</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Transaction Date</label>
              <input
                type="date"
                required
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Transaction Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="OMR">OMR</option>
                <option value="GBP">GBP</option>
                <option value="AED">AED</option>
                <option value="SAR">SAR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Memo / Business Purpose</label>
            <input
              type="text"
              placeholder="e.g. Q1 Shared IT Infrastructure Support Services"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Transaction
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details Drawer */}
      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title={`Intercompany Voucher: ${selectedTx.transactionNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Status</span>
                <StatusBadge status={selectedTx.status} size="sm" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Amount</span>
                <span className="font-bold text-sm font-mono text-cyan-400">{selectedTx.amount} {selectedTx.currency}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Synchronized GL Journals</span>
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
                <span>Source Entity Journal</span>
                <span className="font-mono text-emerald-400">{selectedTx.sourceJournalId || 'Pending Posting'}</span>
              </div>
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
                <span>Target Counterparty Journal</span>
                <span className="font-mono text-emerald-400">{selectedTx.targetJournalId || 'Pending Posting'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setSelectedTx(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
