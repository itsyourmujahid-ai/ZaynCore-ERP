// ============================================================================
// Group Chart of Accounts & Mapping Workbench View (Phase 14)
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Link as LinkIcon, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { groupCoaService } from '../services/group-coa.service';
import { companyRelationshipService } from '../services/company-relationship.service';

export const GroupCoaMappingView: React.FC = () => {
  const { tenant } = useAuth();
  const groups = companyRelationshipService.getGroups();
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [selectedCompanyId, setSelectedCompanyId] = useState(tenant.companyId);

  const companies = db.getCompanies();
  const groupAccounts = groupCoaService.getGroupAccounts(selectedGroupId);
  const localAccounts = db.getAccounts({ ...tenant, companyId: selectedCompanyId });
  const mappings = groupCoaService.getMappings(selectedGroupId, selectedCompanyId);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    classification: 'revenue' as any,
    description: '',
  });

  const [mapForm, setMapForm] = useState({
    localAccountId: localAccounts[0]?.id || '',
    groupAccountId: groupAccounts[0]?.id || '',
  });

  const handleCreateGroupAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      groupCoaService.createGroupAccount({
        ...accountForm,
        groupId: selectedGroupId || groups[0]?.id || '',
      }, tenant);
      setIsAccountModalOpen(false);
      setAccountForm({ code: '', name: '', classification: 'revenue', description: '' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create group account.');
    }
  };

  const handleCreateMapping = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      groupCoaService.createMapping({
        groupId: selectedGroupId || groups[0]?.id || '',
        companyId: selectedCompanyId,
        localAccountId: mapForm.localAccountId,
        groupAccountId: mapForm.groupAccountId,
      }, tenant);
      setIsMapModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to map accounts.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Consolidation Standardization</span>
            <span className="text-slate-600">•</span>
            <StatusBadge status="Group COA Mapping" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Group Chart of Accounts & Mappings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Map diverse subsidiary local general ledger accounts into standardized corporate group reporting structures.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAccountModalOpen(true)}
            disabled={groups.length === 0}
          >
            Add Group Account
          </Button>
          <Button
            variant="primary"
            icon={<LinkIcon className="w-4 h-4" />}
            onClick={() => setIsMapModalOpen(true)}
            disabled={groupAccounts.length === 0 || localAccounts.length === 0}
          >
            Map Local Account
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Selectors Bar */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4 text-xs">
        <div>
          <label className="text-slate-400 font-medium block mb-1">Active Corporate Group</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 font-medium block mb-1">Company Local Accounts</label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Standard Group Accounts & Local Mappings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Standard Group Accounts */}
        <Card title="Standard Group Chart of Accounts" subtitle={`${groupAccounts.length} standard consolidation accounts`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Group Code</th>
                  <th className="py-2.5 px-3 font-semibold">Standard Name</th>
                  <th className="py-2.5 px-3 font-semibold">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {groupAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 text-xs">
                      No group accounts defined yet. Click 'Add Group Account' to establish the group taxonomy.
                    </td>
                  </tr>
                ) : (
                  groupAccounts.map((ga) => (
                    <tr key={ga.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{ga.code}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">{ga.name}</td>
                      <td className="py-2.5 px-3 uppercase text-[10px] text-slate-400">{ga.classification}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: Local-to-Group Account Mappings */}
        <Card title="Local Account Mapping Table" subtitle={`Mapped accounts for selected legal entity`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Local COA Account</th>
                  <th className="py-2.5 px-3 font-semibold">Group Account Mapping</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {localAccounts.map((la) => {
                  const map = mappings.find((m) => m.localAccountId === la.id && m.status === 'active');
                  const mappedGroupAcc = map ? groupAccounts.find((ga) => ga.id === map.groupAccountId) : null;

                  return (
                    <tr key={la.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200">{la.code} - {la.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{la.classification}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {mappedGroupAcc ? (
                          <div className="font-semibold text-indigo-400 font-mono flex items-center gap-1.5">
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            {mappedGroupAcc.code} - {mappedGroupAcc.name}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Auto-fallback (Classification)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={mappedGroupAcc ? 'Mapped' : 'Default'} size="xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal: Create Group Account */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Create Group Standard Account"
      >
        <form onSubmit={handleCreateGroupAccount} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Standard Account Code</label>
            <input
              type="text"
              required
              placeholder="e.g. G-4000 or REVENUE"
              value={accountForm.code}
              onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Standard Account Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Group Operating Sales Revenue"
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Financial Classification</label>
            <select
              value={accountForm.classification}
              onChange={(e) => setAccountForm({ ...accountForm, classification: e.target.value as any })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            >
              <option value="revenue">Revenue</option>
              <option value="cost_of_sales">Cost of Sales</option>
              <option value="expense">Operating Expense</option>
              <option value="asset">Asset (Current / Non-Current)</option>
              <option value="liability">Liability (Current / Non-Current)</option>
              <option value="equity">Equity</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAccountModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Group Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Map Local Account */}
      <Modal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="Map Local Account to Group Standard"
      >
        <form onSubmit={handleCreateMapping} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Local Company Account</label>
            <select
              value={mapForm.localAccountId}
              onChange={(e) => setMapForm({ ...mapForm, localAccountId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
            >
              {localAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.classification})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Target Group Standard Account</label>
            <select
              value={mapForm.groupAccountId}
              onChange={(e) => setMapForm({ ...mapForm, groupAccountId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
            >
              {groupAccounts.map((ga) => (
                <option key={ga.id} value={ga.id}>{ga.code} - {ga.name} ({ga.classification})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsMapModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Account Mapping
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
