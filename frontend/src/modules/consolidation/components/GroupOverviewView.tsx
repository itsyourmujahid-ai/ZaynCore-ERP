// ============================================================================
// Group Corporate Structure & Executive Overview View (Phase 14)
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  GitBranch, 
  ShieldCheck, 
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { companyRelationshipService } from '../services/company-relationship.service';

export const GroupOverviewView: React.FC = () => {
  const { tenant } = useAuth();
  const groups = companyRelationshipService.getGroups();
  const relationships = companyRelationshipService.getRelationships();
  const companies = db.getCompanies();

  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [groupForm, setGroupForm] = useState({
    code: '',
    name: '',
    parentCompanyId: tenant.companyId,
    reportingCurrency: tenant.baseCurrency || 'USD',
    notes: '',
  });

  const [relForm, setRelForm] = useState({
    groupId: selectedGroupId || groups[0]?.id || '',
    parentCompanyId: tenant.companyId,
    childCompanyId: companies[1]?.id || '',
    relationshipType: 'parent_subsidiary' as any,
    ownershipPercentage: '100.0000',
    effectiveFrom: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const groupHierarchy = currentGroup ? companyRelationshipService.getGroupHierarchy(currentGroup.id, tenant) : null;

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const g = companyRelationshipService.createGroup(groupForm, tenant);
      setSelectedGroupId(g.id);
      setIsGroupModalOpen(false);
      setGroupForm({
        code: '',
        name: '',
        parentCompanyId: tenant.companyId,
        reportingCurrency: tenant.baseCurrency || 'USD',
        notes: '',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create group.');
    }
  };

  const handleCreateRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      companyRelationshipService.createRelationship({
        ...relForm,
        groupId: selectedGroupId || groups[0]?.id || '',
      }, tenant);
      setIsRelationshipModalOpen(false);
      setRelForm({
        groupId: selectedGroupId || groups[0]?.id || '',
        parentCompanyId: tenant.companyId,
        childCompanyId: companies[1]?.id || '',
        relationshipType: 'parent_subsidiary',
        ownershipPercentage: '100.0000',
        effectiveFrom: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create company relationship.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Corporate Architecture</span>
            <span className="text-muted-foreground">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Multi-Company & Group Overview</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure legal entity hierarchies, parent/subsidiary relationships, and decimal ownership structures.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsGroupModalOpen(true)}
          >
            Create Group
          </Button>
          <Button
            variant="primary"
            icon={<GitBranch className="w-4 h-4" />}
            onClick={() => setIsRelationshipModalOpen(true)}
            disabled={groups.length === 0}
          >
            Add Entity Relationship
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          {errorMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Corporate Groups</span>
              <div className="text-2xl font-bold text-foreground mt-1">{groups.length}</div>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">100% Isolated</span> underlying company books
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Configured Companies</span>
              <div className="text-2xl font-bold text-foreground mt-1">{companies.length}</div>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">{companies.filter(c => c.status === 'active').length} Active</span> legal entities
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Intercompany Relationships</span>
              <div className="text-2xl font-bold text-foreground mt-1">{relationships.length}</div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <span className="text-amber-400 font-medium">Parent / Subsidiary</span> ownership mappings
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">Reporting Currency</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{currentGroup?.reportingCurrency || 'USD'}</div>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <span className="text-cyan-400 font-medium">FX Rates</span> dynamically translated
          </div>
        </Card>
      </div>

      {/* Corporate Structure Tree & Ownership Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Group Selector & Details */}
        <div className="space-y-4">
          <Card title="Corporate Group Register" subtitle="Select active group to view hierarchy">
            <div className="space-y-2">
              {groups.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  No corporate groups configured. Click 'Create Group' to get started.
                </div>
              ) : (
                groups.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      (selectedGroupId === g.id || (!selectedGroupId && groups[0]?.id === g.id))
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-foreground shadow-sm'
                        : 'bg-card/40 border-border/80 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-foreground">{g.name}</div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-indigo-400">
                        {g.code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                      <span>Reporting: <strong className="text-foreground/90 font-mono">{g.reportingCurrency}</strong></span>
                      <StatusBadge status={g.status} size="xs" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right: Interactive Hierarchy Visualizer */}
        <div className="lg:col-span-2 space-y-4">
          <Card 
            title="Consolidated Entity Hierarchy" 
            subtitle={currentGroup ? `Holding Tree for ${currentGroup.name}` : 'Corporate Tree Visualizer'}
          >
            {groupHierarchy ? (
              <div className="p-4 bg-card/60 rounded-xl border border-border/80 space-y-4">
                {/* Parent Root Node */}
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          {groupHierarchy.companyName}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-normal">
                            Parent Holding (100.00%)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>Code: {groupHierarchy.companyCode}</span>
                          <span>•</span>
                          <span>Currency: <strong className="text-foreground/90 font-mono">{groupHierarchy.baseCurrency}</strong></span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={groupHierarchy.tier} size="xs" />
                  </div>
                </div>

                {/* Subsidiary Nodes */}
                {groupHierarchy.children.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                    No subsidiary relationships added yet under this holding group.
                  </div>
                ) : (
                  <div className="pl-6 border-l-2 border-border space-y-3">
                    {groupHierarchy.children.map((sub) => (
                      <div key={sub.companyId} className="p-3.5 bg-card/60 border border-border rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <GitBranch className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                                {sub.companyName}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                                  {sub.relationshipType?.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                                <span>Code: {sub.companyCode}</span>
                                <span>•</span>
                                <span>Currency: <strong className="text-foreground/90 font-mono">{sub.baseCurrency}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold font-mono text-emerald-400">
                              {sub.ownershipPercentage}%
                            </div>
                            <div className="text-[10px] text-muted-foreground">Ownership</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground text-xs">
                Select or create a corporate group to view entity relationships.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal: Create Group */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Create Corporate Group"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
          <div>
            <label className="block text-foreground/90 font-medium mb-1">Group Code</label>
            <input
              type="text"
              required
              placeholder="e.g. ABC-GRP"
              value={groupForm.code}
              onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Group Name</label>
            <input
              type="text"
              required
              placeholder="e.g. ABC International Corporate Group"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Parent Holding Company</label>
            <select
              value={groupForm.parentCompanyId}
              onChange={(e) => setGroupForm({ ...groupForm, parentCompanyId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code}) - {c.baseCurrency}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Group Reporting Currency</label>
            <select
              value={groupForm.reportingCurrency}
              onChange={(e) => setGroupForm({ ...groupForm, reportingCurrency: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="OMR">OMR - Omani Rial</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AED">AED - UAE Dirham</option>
              <option value="SAR">SAR - Saudi Riyal</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Relationship */}
      <Modal
        isOpen={isRelationshipModalOpen}
        onClose={() => setIsRelationshipModalOpen(false)}
        title="Add Entity Relationship"
      >
        <form onSubmit={handleCreateRelationship} className="space-y-4 text-xs">
          <div>
            <label className="block text-foreground/90 font-medium mb-1">Parent Holding Company</label>
            <select
              value={relForm.parentCompanyId}
              onChange={(e) => setRelForm({ ...relForm, parentCompanyId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Child / Subsidiary Company</label>
            <select
              value={relForm.childCompanyId}
              onChange={(e) => setRelForm({ ...relForm, childCompanyId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Relationship Type</label>
              <select
                value={relForm.relationshipType}
                onChange={(e) => setRelForm({ ...relForm, relationshipType: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                <option value="parent_subsidiary">Subsidiary (Direct)</option>
                <option value="sister">Sister Entity</option>
                <option value="associate">Associate Company</option>
                <option value="joint_venture">Joint Venture</option>
              </select>
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Ownership Percentage (%)</label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                max="100"
                required
                value={relForm.ownershipPercentage}
                onChange={(e) => setRelForm({ ...relForm, ownershipPercentage: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsRelationshipModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Relationship
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
