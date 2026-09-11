// ============================================================================
// Fixed Asset Categories Configuration View
// ============================================================================

import React, { useState } from 'react';
import { 
  Layers, 
  Plus 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { DepreciationMethod } from '@/database/types';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { assetService } from '../services/asset.service';

export const AssetCategoriesView: React.FC = () => {
  const { tenant } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultUsefulLifeMonths, setDefaultUsefulLifeMonths] = useState('60');
  const [defaultResidualValueRate, setDefaultResidualValueRate] = useState('0.0500');
  const [defaultDepreciationMethod, setDefaultDepreciationMethod] = useState<DepreciationMethod>('straight_line');

  const categories = db.getAssetCategories(tenant);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    assetService.createCategory({
      code,
      name,
      description,
      assetAccountId: 'acc-1510',
      accumDepAccountId: 'acc-1520',
      depExpenseAccountId: 'acc-6020',
      disposalGainLossAccountId: 'acc-4085',
      defaultUsefulLifeMonths: parseInt(defaultUsefulLifeMonths, 10) || 60,
      defaultResidualValueRate,
      defaultDepreciationMethod,
      isActive: true,
    }, tenant);

    setIsModalOpen(false);
    setCode('');
    setName('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            Fixed Asset Category Classifications
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure capital asset classes, default useful lives, residual value rules, and automated General Ledger account mappings.
          </p>
        </div>

        <Button
          onClick={() => {
            setCode(`AC-${Date.now().toString(36).toUpperCase()}`);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => {
          const assetsInCategory = db.getFixedAssets(tenant).filter((a) => a.categoryId === cat.id);
          const totalCost = assetsInCategory.reduce((sum, a) => sum + parseFloat(a.originalCost), 0);

          return (
            <Card key={cat.id} className="p-5 border border-border space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs text-blue-400 font-semibold">{cat.code}</span>
                    <h4 className="text-base font-bold text-foreground mt-0.5">{cat.name}</h4>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px]">
                  {cat.description || 'Standard corporate fixed asset class.'}
                </p>

                <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Default Life:</span>
                    <span className="text-foreground font-bold">{cat.defaultUsefulLifeMonths} Mos ({(cat.defaultUsefulLifeMonths / 12).toFixed(1)} Yrs)</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Residual Salvage:</span>
                    <span className="text-foreground font-bold">{(parseFloat(cat.defaultResidualValueRate) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Depreciation Method:</span>
                    <span className="capitalize text-foreground">{cat.defaultDepreciationMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-t border-border pt-1">
                    <span>GL Control Account:</span>
                    <span className="text-blue-300">#1510 PPE</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Assets Enrolled: <strong className="text-foreground">{assetsInCategory.length}</strong></span>
                <span className="font-mono text-foreground/90 font-semibold">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Category Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Asset Category"
          size="md"
        >
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Category Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Plant & Machinery"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
              <input
                type="text"
                placeholder="Scope and asset types included in this class"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Default Useful Life (Months) *</label>
                <input
                  type="number"
                  required
                  value={defaultUsefulLifeMonths}
                  onChange={(e) => setDefaultUsefulLifeMonths(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Residual Value Rate (e.g. 0.05 for 5%)</label>
                <input
                  type="text"
                  value={defaultResidualValueRate}
                  onChange={(e) => setDefaultResidualValueRate(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Default Depreciation Method</label>
              <select
                value={defaultDepreciationMethod}
                onChange={(e) => setDefaultDepreciationMethod(e.target.value as DepreciationMethod)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                <option value="straight_line">Straight Line (Cost - Salvage) / Life</option>
                <option value="declining_balance">Declining Balance</option>
                <option value="double_declining">Double Declining Balance (200%)</option>
                <option value="units_of_production">Units of Production</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Category
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
