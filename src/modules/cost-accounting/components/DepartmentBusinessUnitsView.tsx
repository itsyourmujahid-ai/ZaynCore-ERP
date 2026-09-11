// ============================================================================
// Department & Business Unit Accounting Workbench (Phase 13)
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Briefcase, 
  Plus
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { departmentAccountingService } from '../services/department-accounting.service';
import { businessUnitService } from '../services/business-unit.service';

export const DepartmentBusinessUnitsView: React.FC = () => {
  const { tenant } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'business_units'>('departments');
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isBuModalOpen, setIsBuModalOpen] = useState(false);

  // Department Form
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptBranchId, setDeptBranchId] = useState('');
  const [deptManagerName, setDeptManagerName] = useState('');
  const [deptBudgetAmount, setDeptBudgetAmount] = useState('25000.00');

  // Business Unit Form
  const [buCode, setBuCode] = useState('');
  const [buName, setBuName] = useState('');
  const [buDescription, setBuDescription] = useState('');
  const [buManagerName, setBuManagerName] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const branches = db.getBranches(tenant);
  const deptSummaries = departmentAccountingService.getDepartmentPortfolio(tenant);
  const buSummaries = businessUnitService.getBusinessUnitPortfolio(tenant);

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      departmentAccountingService.createDepartment({
        code: deptCode.trim().toUpperCase(),
        name: deptName.trim(),
        branchId: deptBranchId || undefined,
        managerName: deptManagerName.trim() || undefined,
        budgetAmount: deptBudgetAmount || '0.0000',
      }, tenant);

      setIsDeptModalOpen(false);
      setDeptCode('');
      setDeptName('');
      setDeptBranchId('');
      setDeptManagerName('');
      setDeptBudgetAmount('25000.00');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create department.');
    }
  };

  const handleCreateBu = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      businessUnitService.createBusinessUnit({
        code: buCode.trim().toUpperCase(),
        name: buName.trim(),
        description: buDescription.trim() || undefined,
        managerName: buManagerName.trim() || undefined,
      }, tenant);

      setIsBuModalOpen(false);
      setBuCode('');
      setBuName('');
      setBuDescription('');
      setBuManagerName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create business unit.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-Tabs Switcher & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('departments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'departments'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Departments ({deptSummaries.length})
          </button>

          <button
            onClick={() => setActiveSubTab('business_units')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'business_units'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Business Units & Divisions ({buSummaries.length})
          </button>
        </div>

        {activeSubTab === 'departments' ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDeptModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Department
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBuModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Business Unit
          </Button>
        )}
      </div>

      {/* DEPARTMENTS VIEW */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptSummaries.map((dept) => (
            <Card
              key={dept.departmentId}
              title={dept.departmentName}
              subtitle={`${dept.departmentCode} • ${dept.managerName || 'Operations Manager'}`}
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border">
                  <span className="text-muted-foreground">Net Profit / Margin:</span>
                  <span className={`font-mono font-bold ${parseFloat(dept.netProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${parseFloat(dept.netProfit).toFixed(2)} ({dept.marginPercentage}%)
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Operating Revenue:</span>
                    <span className="font-mono text-emerald-400 font-semibold">${parseFloat(dept.actualRevenue).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Direct Incurred Costs:</span>
                    <span className="font-mono text-rose-400">${parseFloat(dept.directCost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Allocated Overhead:</span>
                    <span className="font-mono text-amber-400">${parseFloat(dept.allocatedOverhead).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-1.5 border-t border-border/80">
                    <span>Total Department Costs:</span>
                    <span className="font-mono font-bold text-foreground">${parseFloat(dept.totalCost).toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-card/40 text-[11px] flex justify-between items-center text-muted-foreground">
                  <span>Budget: ${parseFloat(dept.budgetAmount).toFixed(2)}</span>
                  <span className={dept.isFavorable ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {dept.isFavorable ? 'Under Budget' : 'Over Budget'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* BUSINESS UNITS VIEW */}
      {activeSubTab === 'business_units' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buSummaries.map((bu) => (
            <Card
              key={bu.businessUnitId}
              title={bu.name}
              subtitle={`${bu.code} • ${bu.managerName || 'Divisional Lead'}`}
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border">
                  <span className="text-muted-foreground">Contribution Margin:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ${parseFloat(bu.contributionMargin).toFixed(2)} ({bu.contributionMarginPercentage}%)
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Segment Revenue:</span>
                    <span className="font-mono text-emerald-400 font-semibold">${parseFloat(bu.totalRevenue).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Direct Segment Costs:</span>
                    <span className="font-mono text-rose-400">${parseFloat(bu.directCosts).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Allocated Overhead:</span>
                    <span className="font-mono text-amber-400">${parseFloat(bu.allocatedOverhead).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-1.5 border-t border-border/80">
                    <span>Net Operating Profit:</span>
                    <span className={`font-mono font-bold ${parseFloat(bu.netOperatingProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${parseFloat(bu.netOperatingProfit).toFixed(2)} ({bu.netProfitMarginPercentage}%)
                    </span>
                  </div>
                </div>

                {bu.description && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60 line-clamp-2">
                    {bu.description}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Department Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Organizational Department"
        subtitle="Create a new functional department for operational accounting"
        size="md"
      >
        <form onSubmit={handleCreateDept} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Department Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. DEPT-ENG"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground uppercase"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Department Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Engineering & Technology"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground/90 font-medium mb-1">Primary Branch</label>
              <select
                value={deptBranchId}
                onChange={(e) => setDeptBranchId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
              >
                <option value="">HQ / Global</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-foreground/90 font-medium mb-1">Annual Budget ($)</label>
              <input
                type="number"
                step="0.01"
                value={deptBudgetAmount}
                onChange={(e) => setDeptBudgetAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Department Manager</label>
            <input
              type="text"
              placeholder="e.g. VP of Engineering"
              value={deptManagerName}
              onChange={(e) => setDeptManagerName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Business Unit Modal */}
      <Modal
        isOpen={isBuModalOpen}
        onClose={() => setIsBuModalOpen(false)}
        title="Add Business Unit / Division"
        subtitle="Create a new strategic division for product line and segment analytics"
        size="md"
      >
        <form onSubmit={handleCreateBu} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Business Unit Code *</label>
            <input
              type="text"
              required
              placeholder="e.g. BU-DIGITAL"
              value={buCode}
              onChange={(e) => setBuCode(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground uppercase"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Business Unit Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Digital & SaaS Solutions"
              value={buName}
              onChange={(e) => setBuName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Divisional Lead / Manager</label>
            <input
              type="text"
              placeholder="e.g. VP of Product & Digital"
              value={buManagerName}
              onChange={(e) => setBuManagerName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div>
            <label className="block text-foreground/90 font-medium mb-1">Description & Strategic Purpose</label>
            <textarea
              rows={2}
              placeholder="Target market, product offerings, and strategic segment scope..."
              value={buDescription}
              onChange={(e) => setBuDescription(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsBuModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Business Unit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
