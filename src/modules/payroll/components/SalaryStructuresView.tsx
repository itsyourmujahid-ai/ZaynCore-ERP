// ============================================================================
// Salary Structures & Compensation Components View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { DbSalaryStructure, DbSalaryComponent, ComponentType, CalculationMethod } from '@/database/types';
import { db } from '@/database/storage';
import { payrollService } from '../services/payroll.service';

export const SalaryStructuresView: React.FC = () => {
  const { tenant } = useAuth();
  const [structures, setStructures] = useState<DbSalaryStructure[]>([]);
  const [components, setComponents] = useState<DbSalaryComponent[]>([]);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [isStructModalOpen, setIsStructModalOpen] = useState(false);

  // Component Form
  const [compCode, setCompCode] = useState('');
  const [compName, setCompName] = useState('');
  const [compType, setCompType] = useState<ComponentType>('earning');
  const [compMethod, setCompMethod] = useState<CalculationMethod>('fixed_amount');
  const [compRate, setCompRate] = useState('0.00');

  // Structure Form
  const [structCode, setStructCode] = useState('');
  const [structName, setStructName] = useState('');
  const [structDesc, setStructDesc] = useState('');

  const loadData = () => {
    setStructures(db.getSalaryStructures(tenant));
    setComponents(db.getSalaryComponents(tenant));
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  const handleCreateComponent = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      payrollService.createSalaryComponent(
        {
          code: compCode.toUpperCase(),
          name: compName,
          type: compType,
          calculationMethod: compMethod,
          defaultRateOrAmount: compRate,
          isTaxable: compType === 'earning',
          isStatutory: false,
          expenseAccountId: compType === 'earning' ? 'a-6012' : 'a-6010',
          liabilityAccountId: compType === 'deduction' ? 'a-2040' : 'a-2300',
          isActive: true,
        },
        tenant
      );
      setIsCompModalOpen(false);
      setCompCode('');
      setCompName('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to create component');
    }
  };

  const handleCreateStructure = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      payrollService.createSalaryStructure(
        {
          code: structCode.toUpperCase(),
          name: structName,
          description: structDesc,
          currency: tenant.baseCurrency,
          isDefault: false,
          isActive: true,
          components: components.map((c) => ({
            componentId: c.id,
            componentCode: c.code,
            componentName: c.name,
            type: c.type,
            calculationMethod: c.calculationMethod,
            rateOrAmount: c.defaultRateOrAmount,
            expenseAccountId: c.expenseAccountId,
            liabilityAccountId: c.liabilityAccountId,
          })),
        },
        tenant
      );
      setIsStructModalOpen(false);
      setStructCode('');
      setStructName('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to create structure');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Salary Structures & Compensation Components</h2>
          <p className="text-xs text-slate-400">
            Define recurring allowances, statutory deductions, overtime rates, and company salary grade structures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCompModalOpen(true)}
          >
            New Component
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsStructModalOpen(true)}
          >
            New Structure
          </Button>
        </div>
      </div>

      {/* Structures Card */}
      <Card
        title={`Configured Salary Structures (${structures.length})`}
        subtitle="Hierarchical compensation plans assigned to employee master profiles"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {structures.map((s) => (
            <div key={s.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100">{s.name}</span>
                    {s.isDefault && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-950/60 text-brand-400 border border-brand-800/50">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{s.code}</span>
                </div>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>

              <p className="text-xs text-slate-400">{s.description || 'No description provided.'}</p>

              <div className="space-y-1.5 border-t border-slate-800/80 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Included Components:
                </span>
                <div className="space-y-1">
                  {s.components.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                      <span>• {c.componentName}</span>
                      <span className="font-mono text-slate-400">
                        {c.calculationMethod === 'percentage_of_basic'
                          ? `${(parseFloat(c.rateOrAmount) * 100).toFixed(0)}% of Basic`
                          : `$${parseFloat(c.rateOrAmount).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Compensation Components Table */}
      <Card
        title={`Earnings & Deductions Component Catalog (${components.length})`}
        subtitle="Centralized dictionary of pay elements with GL account mappings"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Component</th>
                <th className="p-3">Type</th>
                <th className="p-3">Calculation Method</th>
                <th className="p-3">Default Rate / Amount</th>
                <th className="p-3">GL Expense Account</th>
                <th className="p-3">GL Liability Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {components.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-slate-200">{c.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{c.code}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        c.type === 'earning'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                      }`}
                    >
                      {c.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 capitalize">{c.calculationMethod.replace(/_/g, ' ')}</td>
                  <td className="p-3 font-mono text-slate-200">{c.defaultRateOrAmount}</td>
                  <td className="p-3 text-slate-400 font-mono">{c.expenseAccountId}</td>
                  <td className="p-3 text-slate-400 font-mono">{c.liabilityAccountId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Component Modal */}
      {isCompModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Create Salary Component</h2>
              <button onClick={() => setIsCompModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateComponent} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Component Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FOOD_ALLOWANCE"
                  value={compCode}
                  onChange={(e) => setCompCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 uppercase font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meal & Food Allowance"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Type</label>
                  <select
                    value={compType}
                    onChange={(e) => setCompType(e.target.value as ComponentType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Calculation Method</label>
                  <select
                    value={compMethod}
                    onChange={(e) => setCompMethod(e.target.value as CalculationMethod)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="percentage_of_basic">Percentage of Basic</option>
                    <option value="hourly_rate">Hourly Multiplier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Default Rate or Fixed Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={compRate}
                  onChange={(e) => setCompRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsCompModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Component
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Structure Modal */}
      {isStructModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Create Salary Grade Structure</h2>
              <button onClick={() => setIsStructModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStructure} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Structure Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EXEC-GRADE-1"
                  value={structCode}
                  onChange={(e) => setStructCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 uppercase font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Structure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Senior Management Band"
                  value={structName}
                  onChange={(e) => setStructName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={structDesc}
                  onChange={(e) => setStructDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsStructModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Structure
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
