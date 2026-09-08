// ============================================================================
// Global Tenant-Aware Search Modal (Command Palette) (Adaptive Semantic Theming)
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 animate-scaleUp">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3 bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search accounts, journals, modules in ${tenant.companyName}...`}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-foreground">
          {/* Navigation / Modules */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
              ERP Capability Modules
            </div>
            <div className="space-y-1">
              {filteredModules.map((m) => (
                <div
                  key={m.key}
                  onClick={() => handleSelect('registry')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-muted cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary">
                        {m.name}
                      </span>
                      <p className="text-[10px] text-muted-foreground truncate max-w-md">{m.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Accounts */}
          {filteredAccounts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                Chart of Accounts
              </div>
              <div className="space-y-1">
                {filteredAccounts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => handleSelect('accounting')}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-muted cursor-pointer group transition-colors"
                  >
                    <div>
                      <span className="text-xs font-semibold text-foreground font-mono mr-2">[{a.code}]</span>
                      <span className="text-xs text-foreground group-hover:text-primary">{a.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      {a.classification}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Journals */}
          {filteredJournals.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                Journal Entries
              </div>
              <div className="space-y-1">
                {filteredJournals.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => handleSelect('journals')}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-muted cursor-pointer group transition-colors"
                  >
                    <div>
                      <span className="text-xs font-semibold text-foreground font-mono mr-2">{j.entryNumber}</span>
                      <span className="text-xs text-muted-foreground">{j.memo}</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-primary">
                      {j.currency} {Number(j.totalDebit || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
