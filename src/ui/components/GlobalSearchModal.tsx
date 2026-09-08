// ============================================================================
// Global Tenant-Aware Search Modal (Command Palette)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Search, BookOpen, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { ERP_MODULE_REGISTRY } from '@/modules/registry/registry';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { tenant } = useAuth();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const accounts = db.getAccounts(tenant);
  const journals = db.getJournalEntries(tenant);

  const filteredAccounts = accounts.filter(
    (a) => a.code.toLowerCase().includes(query.toLowerCase()) || a.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const filteredJournals = journals.filter(
    (j) => j.entryNumber.toLowerCase().includes(query.toLowerCase()) || j.memo.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredModules = ERP_MODULE_REGISTRY.filter(
    (m) => m.name.toLowerCase().includes(query.toLowerCase()) || m.description.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const handleSelect = (viewId: string) => {
    onNavigate(viewId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col z-10 animate-scaleUp">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search accounts, journals, modules in ${tenant.companyName}...`}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Navigation / Modules */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
              ERP Capability Modules
            </div>
            <div className="space-y-1">
              {filteredModules.map((m) => (
                <div
                  key={m.key}
                  onClick={() => handleSelect('registry')}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/70 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-brand-500/10 text-brand-400">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-brand-300">
                        {m.name}
                      </span>
                      <p className="text-[10px] text-slate-400 truncate max-w-md">{m.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Accounts */}
          {filteredAccounts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Chart of Accounts ({tenant.companyName})
              </div>
              <div className="space-y-1">
                {filteredAccounts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => handleSelect('coa')}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/70 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-brand-400">{a.code}</span>
                      <span className="text-xs text-slate-200">{a.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 capitalize">{a.classification}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Journals */}
          {filteredJournals.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                General Journal Entries
              </div>
              <div className="space-y-1">
                {filteredJournals.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => handleSelect('journals')}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/70 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-slate-300">{j.entryNumber}</span>
                      <span className="text-xs text-slate-400 truncate max-w-sm">{j.memo}</span>
                    </div>
                    <span className="font-mono text-xs text-emerald-400">${parseFloat(j.totalDebit).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Tenant Guard: <strong className="text-slate-300">{tenant.companyName}</strong></span>
          </div>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
