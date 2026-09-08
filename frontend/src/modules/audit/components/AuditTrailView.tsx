// ============================================================================
// Immutable Audit Trail & Compliance Event Explorer
// ============================================================================

import React, { useState } from 'react';
import { 
  Search, 
  Eye, 
  User, 
  Lock
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Badge } from '@/ui/components/Badge';
import { Modal } from '@/ui/components/Modal';
import { DbAuditLog } from '@/database/types';

export const AuditTrailView: React.FC = () => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<DbAuditLog | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const logs = db.getAuditLogs(tenant);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      l.userEmail.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  const inspectLog = (log: DbAuditLog) => {
    setSelectedLog(log);
    setIsDiffModalOpen(true);
  };

  const getActionBadge = (action: string) => {
    if (action.includes('POST') || action.includes('PROVISION')) {
      return <Badge variant="success" size="xs">{action}</Badge>;
    }
    if (action.includes('LOCK') || action.includes('UPDATE')) {
      return <Badge variant="warning" size="xs">{action}</Badge>;
    }
    if (action.includes('REVERSE') || action.includes('VIOLATION') || action.includes('CLOSE')) {
      return <Badge variant="danger" size="xs">{action}</Badge>;
    }
    return <Badge variant="info" size="xs">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Compliance & Governance</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">Tenant: {tenant.companyName}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Immutable Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident, chronological recording of all security, fiscal, and general ledger state transitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Cryptographically Verified Log</span>
          </div>
        </div>
      </div>

      {/* Search & Stats */}
      <Card noPadding>
        <div className="p-4 flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit actions, user emails, entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {filteredLogs.length} Recorded Events
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp (UTC)</th>
                <th className="px-5 py-3.5">Actor / User</th>
                <th className="px-5 py-3.5">Action Executed</th>
                <th className="px-5 py-3.5">Entity Impacted</th>
                <th className="px-5 py-3.5">Audit Narrative</th>
                <th className="px-5 py-3.5 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{log.userEmail}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                      {log.entityType}#{log.entityId.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300 max-w-sm truncate">
                    {log.details}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => inspectLog(log)}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    No audit records matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* State Diff Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          title={`Audit Event: ${selectedLog.action}`}
          subtitle={`Event ID: ${selectedLog.id} • Recorded: ${selectedLog.createdAt}`}
          size="lg"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setIsDiffModalOpen(false)}>
              Close Inspector
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/70 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Actor Email</span>
                <span className="font-semibold text-slate-200 mt-0.5 block">{selectedLog.userEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Target Entity</span>
                <span className="font-mono text-slate-200 mt-0.5 block">{selectedLog.entityType} ({selectedLog.entityId})</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Audit Narrative</span>
              <p className="text-slate-200 mt-1 font-medium">{selectedLog.details}</p>
            </div>

            {/* State Diffs (Previous vs New) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-bold block mb-1">Previous State</span>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 overflow-x-auto max-h-48">
                  {selectedLog.previousState ? JSON.stringify(selectedLog.previousState, null, 2) : 'null (Entity creation / First state)'}
                </pre>
              </div>

              <div>
                <span className="text-emerald-400 font-bold block mb-1">New State</span>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-48">
                  {selectedLog.newState ? JSON.stringify(selectedLog.newState, null, 2) : 'null'}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
