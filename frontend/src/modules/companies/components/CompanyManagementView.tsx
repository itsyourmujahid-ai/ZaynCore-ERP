// ============================================================================
// Company & Organizational Hierarchy Management
// ============================================================================

import React, { useState } from 'react';
import { 
  GitBranch, 
  FolderTree, 
  Plus, 
  MapPin
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Tabs } from '@/ui/components/Tabs';

export const CompanyManagementView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('branches');
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  const branches = db.getBranches(tenant);
  const departments = db.getDepartments(tenant);
  const costCenters = db.getCostCenters(tenant);
  const company = db.getCompanyById(tenant.companyId, tenant) || db.getCompanies()[0];

  const [branchForm, setBranchForm] = useState({
    code: '',
    name: '',
    addressLine1: '',
    city: '',
    countryCode: 'US',
    isHeadquarters: false,
  });

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.code || !branchForm.name) return;

    db.createBranch(
      {
        ...branchForm,
        code: branchForm.code.toUpperCase(),
        status: 'active',
      },
      tenant
    );

    setIsBranchModalOpen(false);
    setBranchForm({
      code: '',
      name: '',
      addressLine1: '',
      city: '',
      countryCode: 'US',
      isHeadquarters: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Organization Hierarchy</span>
            <span className="text-slate-400">•</span>
            <StatusBadge status={tenant.companyTier} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{company.name}</h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage multi-branch operations, departmental divisions, and cost centers under active tenant isolation.
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsBranchModalOpen(true)}
        >
          Add Operating Branch
        </Button>
      </div>

      {/* Company Legal Profile Overview */}
      <Card title="Legal Entity Profile" subtitle="Corporate registration and base currency configuration">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Legal Name</span>
            <span className="font-semibold text-slate-900 mt-1 block">{company.legalName}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Base Ledger Currency</span>
            <span className="font-bold font-mono text-brand-600 mt-1 block">{company.baseCurrency}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Tax / VAT ID</span>
            <span className="font-semibold font-mono text-slate-900 mt-1 block">{company.taxIdentifier || 'N/A'}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Industry Classification</span>
            <span className="font-semibold text-slate-900 mt-1 block">{company.industry}</span>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'branches', label: 'Operating Branches', icon: <GitBranch className="w-3.5 h-3.5" />, badge: branches.length },
          { id: 'departments', label: 'Departments & Cost Centers', icon: <FolderTree className="w-3.5 h-3.5" />, badge: departments.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Branches */}
      {activeTab === 'branches' && (
        <Card
          title="Operating Branches"
          subtitle={`Multi-branch location isolation (${branches.length} locations configured)`}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Branch Code</th>
                  <th className="px-5 py-3.5">Branch Name</th>
                  <th className="px-5 py-3.5">Location / City</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-brand-600">
                      {b.code}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{b.name}</div>
                      <div className="text-[11px] text-slate-500">{b.addressLine1 || 'No street address specified'}</div>
                    </td>
                    <td className="px-5 py-4 flex items-center gap-1 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.city || 'N/A'}, {b.countryCode}</span>
                    </td>
                    <td className="px-5 py-4">
                      {b.isHeadquarters ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                          HEADQUARTERS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          REGIONAL BRANCH
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <StatusBadge status={b.status} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Departments & Cost Centers */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Corporate Departments" subtitle="Organizational cost and operational grouping" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Department Name</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-brand-600">{d.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                      <td className="px-4 py-3 text-right"><StatusBadge status={d.status} size="xs" /></td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No departments configured</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Cost Centers" subtitle="Financial expense allocation and budget tracking units" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Cost Center Code</th>
                    <th className="px-4 py-3">Cost Center Name</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {costCenters.map((cc) => (
                    <tr key={cc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-brand-600">{cc.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{cc.name}</td>
                      <td className="px-4 py-3 text-right"><StatusBadge status={cc.status} size="xs" /></td>
                    </tr>
                  ))}
                  {costCenters.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No cost centers configured</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Add Branch Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title="Add Operating Branch / Depot"
        subtitle={`Branch records will be strictly scoped under tenant: ${company.name}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsBranchModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateBranch}>
              Save Branch
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Branch Code"
              required
              placeholder="e.g. BR-CHI"
              value={branchForm.code}
              onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
            />
            <Input
              label="Branch Name"
              required
              placeholder="e.g. Chicago Logistics Terminal"
              value={branchForm.name}
              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
            />
          </div>

          <Input
            label="Street Address"
            placeholder="e.g. 1000 W Monroe St"
            value={branchForm.addressLine1}
            onChange={(e) => setBranchForm({ ...branchForm, addressLine1: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="e.g. Chicago"
              value={branchForm.city}
              onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
            />
            <Input
              label="Country Code"
              placeholder="US"
              value={branchForm.countryCode}
              onChange={(e) => setBranchForm({ ...branchForm, countryCode: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
