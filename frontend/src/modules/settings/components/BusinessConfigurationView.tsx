// ============================================================================
// Business Configuration Settings View (Phase 15)
// Allows Company Admins to manage business profiles, UOM conversions,
// product attributes, workflow rules, and inventory/accounting defaults.
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  Scale, 
  Tag, 
  FileText, 
  Calculator, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Sliders
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { 
  DbCompanyProfile, 
  DbUomConversion, 
  DbProductAttribute, 
  BusinessType, 
  SellingCategory, 
  BuyingCategory 
} from '@/database/types';
import { UomConversionEngine } from '@/modules/onboarding/services/uom-conversion.service';

export const BusinessConfigurationView: React.FC = () => {
  const { tenant } = useAuth();
  const [profile, setProfile] = useState<DbCompanyProfile>(() => db.ensureCompanyProfile(tenant.companyId));
  const [uoms, setUoms] = useState<DbUomConversion[]>(() => db.getUomConversions(tenant.companyId, tenant));
  const [attributes, setAttributes] = useState<DbProductAttribute[]>(() => db.getProductAttributes(tenant.companyId, tenant));

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'uom' | 'attributes' | 'workflows' | 'accounting'>('profile');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New UOM Form State
  const [newFromUnit, setNewFromUnit] = useState('');
  const [newToUnit, setNewToUnit] = useState('');
  const [newMultiplier, setNewMultiplier] = useState<number>(1);
  const [newUomDescription, setNewUomDescription] = useState('');

  // New Attribute Form State
  const [newAttrLabel, setNewAttrLabel] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrType, setNewAttrType] = useState<'text' | 'select' | 'number' | 'date' | 'boolean'>('text');
  const [newAttrValues, setNewAttrValues] = useState('');
  const [newAttrRequired, setNewAttrRequired] = useState(false);

  // UOM Test Calculator State
  const [testQty, setTestQty] = useState<number>(10);
  const [testFromUnit, setTestFromUnit] = useState<string>('');
  const [testToUnit, setTestToUnit] = useState<string>('');

  const refreshState = () => {
    setProfile(db.ensureCompanyProfile(tenant.companyId));
    setUoms(db.getUomConversions(tenant.companyId, tenant));
    setAttributes(db.getProductAttributes(tenant.companyId, tenant));
  };

  const handleSaveProfile = () => {
    try {
      setErrorMessage(null);
      db.updateCompanyProfile(tenant.companyId, profile, tenant);
      setSaveSuccess('Business profile and configurations saved successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
      refreshState();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save company profile');
    }
  };

  const handleAddUom = () => {
    if (!newFromUnit.trim() || !newToUnit.trim() || newMultiplier <= 0) {
      setErrorMessage('From Unit, To Unit, and a multiplier > 0 are required.');
      return;
    }
    try {
      setErrorMessage(null);
      const fromCode = newFromUnit.trim().toUpperCase();
      const toCode = newToUnit.trim().toUpperCase();

      db.createUomConversion(
        {
          companyId: tenant.companyId,
          fromUomId: `uom-${tenant.companyId.slice(0, 6)}-${fromCode.toLowerCase()}`,
          fromUomCode: fromCode,
          toUomId: `uom-${tenant.companyId.slice(0, 6)}-${toCode.toLowerCase()}`,
          toUomCode: toCode,
          multiplier: newMultiplier.toFixed(4),
          precision: 4,
          isStandard: true,
          notes: newUomDescription.trim() || `1 ${fromCode} = ${newMultiplier} ${toCode}`,
        },
        tenant
      );

      setNewFromUnit('');
      setNewToUnit('');
      setNewMultiplier(1);
      setNewUomDescription('');
      refreshState();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to add UOM conversion');
    }
  };

  const handleDeleteUom = (id: string) => {
    db.deleteUomConversion(id, tenant.companyId, tenant);
    refreshState();
  };

  const handleAddAttribute = () => {
    if (!newAttrLabel.trim()) {
      setErrorMessage('Attribute Label is required.');
      return;
    }
    const key = (newAttrKey.trim() || newAttrLabel.trim()).toLowerCase().replace(/\s+/g, '_');
    const options = newAttrValues.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      setErrorMessage(null);
      db.createProductAttribute(
        {
          companyId: tenant.companyId,
          attributeKey: key,
          label: newAttrLabel.trim(),
          dataType: newAttrType,
          options: options.length > 0 ? options : undefined,
          isRequired: newAttrRequired,
          isActive: true,
          order: attributes.length + 1,
        },
        tenant
      );

      setNewAttrLabel('');
      setNewAttrKey('');
      setNewAttrType('text');
      setNewAttrValues('');
      setNewAttrRequired(false);
      refreshState();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to add product attribute');
    }
  };

  const handleDeleteAttribute = (id: string) => {
    db.deleteProductAttribute(id, tenant.companyId, tenant);
    refreshState();
  };

  const calculatedTestConversion = testFromUnit && testToUnit
    ? (() => {
        try {
          const res = UomConversionEngine.convert(testQty, testFromUnit, testToUnit, uoms);
          return res.convertedQuantity;
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'profile'
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
          Business Profile
        </button>

        <button
          onClick={() => setActiveSubTab('uom')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'uom'
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Scale className="w-3.5 h-3.5 inline mr-1.5" />
          UOM & Conversions ({uoms.length})
        </button>

        <button
          onClick={() => setActiveSubTab('attributes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'attributes'
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Tag className="w-3.5 h-3.5 inline mr-1.5" />
          Product Attributes ({attributes.length})
        </button>

        <button
          onClick={() => setActiveSubTab('workflows')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'workflows'
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 inline mr-1.5" />
          Sales & Purchase Workflows
        </button>

        <button
          onClick={() => setActiveSubTab('accounting')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSubTab === 'accounting'
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 inline mr-1.5" />
          Inventory & Accounting Defaults
        </button>
      </div>

      {/* Profile & Business Type Subtab */}
      {activeSubTab === 'profile' && (
        <Card
          title="Company Business Model & Scope"
          subtitle="Configure operational nature, selling categories, and purchasing activities"
          footer={
            <div className="flex justify-end">
              <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSaveProfile}>
                Save Business Profile
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-foreground/90 font-medium mb-1.5">Business Industry Categories</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-card/60 p-3 rounded-lg border border-border">
                {[
                  { id: 'trading', label: 'Trading & Commerce' },
                  { id: 'retail', label: 'Retail Sales' },
                  { id: 'wholesale', label: 'Wholesale & B2B' },
                  { id: 'manufacturing', label: 'Manufacturing & Assembly' },
                  { id: 'distribution', label: 'Distribution & Logistics' },
                  { id: 'services', label: 'Professional Services' },
                  { id: 'construction', label: 'Construction & Civil' },
                  { id: 'project_based', label: 'Project-Based / Job' },
                ].map((item) => {
                  const isChecked = profile.businessTypes?.includes(item.id as BusinessType);
                  return (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer text-foreground/90 hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const current = profile.businessTypes || [];
                          const next = e.target.checked
                            ? [...current, item.id as BusinessType]
                            : current.filter((x) => x !== item.id);
                          setProfile({ ...profile, businessTypes: next.length > 0 ? next : ['trading'] });
                        }}
                        className="rounded border-border bg-card text-brand-600 focus:ring-brand-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
              <div>
                <label className="block text-foreground/90 font-medium mb-1.5">What Does This Company Sell?</label>
                <div className="space-y-2 bg-card/60 p-3 rounded-lg border border-border">
                  {[
                    { id: 'physical_products', label: 'Physical Products (Stock items, SKUs)' },
                    { id: 'finished_goods', label: 'Manufactured Finished Goods' },
                    { id: 'services', label: 'Billable Services (Hourly, Flat fee, Retainers)' },
                    { id: 'digital_products', label: 'Digital Products / Licenses / Subscriptions' },
                    { id: 'projects', label: 'Project Milestones & Deliverables' },
                  ].map((item) => {
                    const isChecked = profile.sellingCategories?.includes(item.id as SellingCategory);
                    return (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer text-foreground/90 hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = profile.sellingCategories || [];
                            const next = e.target.checked
                              ? [...current, item.id as SellingCategory]
                              : current.filter((x) => x !== item.id);
                            setProfile({ ...profile, sellingCategories: next });
                          }}
                          className="rounded border-border bg-card text-brand-600 focus:ring-brand-500"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-foreground/90 font-medium mb-1.5">What Does This Company Buy?</label>
                <div className="space-y-2 bg-card/60 p-3 rounded-lg border border-border">
                  {[
                    { id: 'raw_materials', label: 'Raw Materials & Components' },
                    { id: 'finished_goods', label: 'Inventory for Resale' },
                    { id: 'consumables', label: 'Operating Consumables & Supplies' },
                    { id: 'services', label: 'Subcontractors & External Services' },
                    { id: 'equipment_capital_goods', label: 'Capital Machinery & Fixed Assets' },
                  ].map((item) => {
                    const isChecked = profile.buyingCategories?.includes(item.id as BuyingCategory);
                    return (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer text-foreground/90 hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = profile.buyingCategories || [];
                            const next = e.target.checked
                              ? [...current, item.id as BuyingCategory]
                              : current.filter((x) => x !== item.id);
                            setProfile({ ...profile, buyingCategories: next });
                          }}
                          className="rounded border-border bg-card text-brand-600 focus:ring-brand-500"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* UOM Conversions Subtab */}
      {activeSubTab === 'uom' && (
        <div className="space-y-6">
          <Card
            title="Unit of Measure (UOM) Cross-Conversions"
            subtitle="Define multipliers between purchase units, stock keeping units (SKU), and sales packaging"
          >
            <div className="space-y-4">
              {/* Add New UOM Conversion Form */}
              <div className="p-4 rounded-xl bg-card/70 border border-border space-y-3">
                <span className="font-semibold text-xs text-foreground block">Add Cross-Unit Conversion Rule</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <Input
                    label="From Unit"
                    placeholder="e.g. CARTON, BOX, PALLET"
                    value={newFromUnit}
                    onChange={(e) => setNewFromUnit(e.target.value)}
                  />
                  <Input
                    label="Multiplier"
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder="e.g. 12"
                    value={newMultiplier}
                    onChange={(e) => setNewMultiplier(parseFloat(e.target.value) || 1)}
                  />
                  <Input
                    label="To Unit (Base/Smaller)"
                    placeholder="e.g. PCS, UNIT, KG"
                    value={newToUnit}
                    onChange={(e) => setNewToUnit(e.target.value)}
                  />
                  <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddUom}>
                    Add Rule
                  </Button>
                </div>
              </div>

              {/* Conversion Rules Table */}
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-card/90 text-muted-foreground font-semibold border-b border-border">
                      <th className="px-4 py-3">Conversion Formula</th>
                      <th className="px-4 py-3">Source Unit</th>
                      <th className="px-4 py-3">Multiplier</th>
                      <th className="px-4 py-3">Target Unit</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {uoms.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground italic">
                          No custom unit conversions defined yet for this company.
                        </td>
                      </tr>
                    ) : (
                      uoms.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground font-mono">
                            1 {u.fromUomCode} = {u.multiplier} {u.toUomCode}
                          </td>
                          <td className="px-4 py-3 text-brand-400 font-semibold">{u.fromUomCode}</td>
                          <td className="px-4 py-3 font-mono">{u.multiplier}</td>
                          <td className="px-4 py-3 text-emerald-400 font-semibold">{u.toUomCode}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteUom(u.id)}
                              className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10"
                              title="Delete Conversion Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Real-time UOM Calculator Test */}
              <div className="p-4 rounded-xl bg-card/60 border border-border space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calculator className="w-4 h-4 text-brand-400" />
                  <span>UOM Calculation Engine Tester</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center text-xs">
                  <Input
                    label="Test Quantity"
                    type="number"
                    value={testQty}
                    onChange={(e) => setTestQty(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    label="Convert From"
                    placeholder="e.g. CARTON"
                    value={testFromUnit}
                    onChange={(e) => setTestFromUnit(e.target.value.toUpperCase())}
                  />
                  <Input
                    label="Convert To"
                    placeholder="e.g. PCS"
                    value={testToUnit}
                    onChange={(e) => setTestToUnit(e.target.value.toUpperCase())}
                  />
                  <div className="pt-5">
                    <div className="p-2 rounded-lg bg-card border border-border text-center font-mono font-bold text-brand-400">
                      {calculatedTestConversion !== null ? `${calculatedTestConversion} ${testToUnit}` : 'Select valid units'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Product Attributes Subtab */}
      {activeSubTab === 'attributes' && (
        <div className="space-y-6">
          <Card
            title="Custom Product & Inventory Attributes"
            subtitle="Configure tracking dimensions such as Batch/Lot, Expiry, Serial Number, Size, and Color"
          >
            <div className="space-y-4">
              {/* Add Attribute Form */}
              <div className="p-4 rounded-xl bg-card/70 border border-border space-y-3">
                <span className="font-semibold text-xs text-foreground block">Add New Product Attribute Dimension</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs">
                  <Input
                    label="Attribute Label"
                    placeholder="e.g. Color, Batch Number, Size"
                    value={newAttrLabel}
                    onChange={(e) => setNewAttrLabel(e.target.value)}
                  />
                  <Select
                    label="Data Type"
                    options={[
                      { value: 'text', label: 'Free Text' },
                      { value: 'select', label: 'Dropdown Options' },
                      { value: 'number', label: 'Numeric Value' },
                      { value: 'date', label: 'Date (e.g. Expiry)' },
                      { value: 'boolean', label: 'Yes/No Flag' },
                    ]}
                    value={newAttrType}
                    onChange={(e) => setNewAttrType(e.target.value as any)}
                  />
                  <Input
                    label="Values (Comma separated)"
                    placeholder="Red, Blue, Green (if dropdown)"
                    value={newAttrValues}
                    onChange={(e) => setNewAttrValues(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-foreground/90 text-xs cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={newAttrRequired}
                        onChange={(e) => setNewAttrRequired(e.target.checked)}
                        className="rounded border-border bg-card text-brand-600"
                      />
                      <span>Required</span>
                    </label>
                    <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAddAttribute}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Attributes List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {attributes.length === 0 ? (
                  <div className="col-span-full p-6 text-center text-muted-foreground italic border border-border rounded-xl">
                    No custom product attributes defined for this company.
                  </div>
                ) : (
                  attributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="p-3.5 rounded-xl bg-card/80 border border-border flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{attr.label}</span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {attr.attributeKey}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-[11px] mt-1">
                          Type: <strong className="text-foreground/90 capitalize">{attr.dataType}</strong>
                          {attr.isRequired && <span className="text-rose-400 ml-1 font-semibold">*Mandatory</span>}
                        </div>
                        {attr.options && attr.options.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {attr.options.map((opt, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-foreground/90">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAttribute(attr.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10"
                        title="Delete Attribute"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Workflows Subtab */}
      {activeSubTab === 'workflows' && (
        <Card
          title="Sales & Purchase Workflow Policies"
          subtitle="Configure multi-step procurement matching, direct invoicing, and dispatch controls"
          footer={
            <div className="flex justify-end">
              <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSaveProfile}>
                Save Workflow Rules
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Sales Workflow */}
            <div className="space-y-3 p-4 rounded-xl bg-card/60 border border-border">
              <div className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Sales Process Workflow</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { key: 'enableQuotation', label: 'Allow Sales Quotations / Pro-Forma Estimates' },
                  { key: 'enableSalesOrder', label: 'Require Sales Orders before fulfillment' },
                  { key: 'enableSalesInvoice', label: 'Allow Direct Sales Invoicing' },
                  { key: 'enableDeliveryNote', label: 'Generate Delivery Notes & Dispatches' },
                  { key: 'enableCustomerPayment', label: 'Track Customer Payments & Receipts' },
                  { key: 'enableCreditNote', label: 'Allow Sales Credit Notes / Returns' },
                  { key: 'enablePaymentProofVerification', label: 'Require Mandatory 2-Step Payment Proof Verification' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer text-foreground/90 hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={(profile.salesWorkflow as any)[item.key]}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          salesWorkflow: {
                            ...profile.salesWorkflow,
                            [item.key]: e.target.checked
                          }
                        })
                      }
                      className="rounded border-border bg-card text-brand-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Purchase Workflow */}
            <div className="space-y-3 p-4 rounded-xl bg-card/60 border border-border">
              <div className="font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Procurement & Purchase Workflow</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { key: 'enablePurchaseRequest', label: 'Internal Purchase Requisitions' },
                  { key: 'enableRfq', label: 'Request for Quotations (RFQ) to Suppliers' },
                  { key: 'enablePurchaseOrder', label: 'Formal Purchase Orders (PO) to Vendors' },
                  { key: 'enableGoodsReceipt', label: 'Goods Receipt Notes (GRN) on delivery' },
                  { key: 'enableSupplierBill', label: 'Allow Supplier Bills' },
                  { key: 'enableThreeWayMatch', label: 'Enforce 3-Way Matching (PO vs GRN vs Bill)' },
                  { key: 'enableSupplierPayment', label: 'Track Vendor Payments' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer text-foreground/90 hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={(profile.purchaseWorkflow as any)[item.key]}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          purchaseWorkflow: {
                            ...profile.purchaseWorkflow,
                            [item.key]: e.target.checked
                          }
                        })
                      }
                      className="rounded border-border bg-card text-brand-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Accounting & Inventory Defaults Subtab */}
      {activeSubTab === 'accounting' && (
        <Card
          title="Inventory Costing & General Ledger Defaults"
          subtitle="Configure default accounts for automated posting service and tax defaults"
          footer={
            <div className="flex justify-end">
              <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={handleSaveProfile}>
                Save Accounting Defaults
              </Button>
            </div>
          }
        >
          <div className="space-y-6 text-xs">
            {/* Inventory Configuration */}
            <div className="p-4 rounded-xl bg-card/60 border border-border space-y-4">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Inventory Valuation & Tracking Parameters</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Costing Method"
                  options={[
                    { value: 'FIFO', label: 'FIFO (First-In, First-Out)' },
                    { value: 'WEIGHTED_AVG', label: 'AVCO (Weighted Average Cost)' },
                    { value: 'STANDARD_COST', label: 'Standard Costing' },
                  ]}
                  value={profile.inventoryConfig.defaultCostingMethod}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      inventoryConfig: {
                        ...profile.inventoryConfig,
                        defaultCostingMethod: e.target.value as any
                      }
                    })
                  }
                />

                <Select
                  label="Track Inventory Stock"
                  options={[
                    { value: 'yes', label: 'Yes - Maintain Warehouse Stock' },
                    { value: 'no', label: 'No - Pure Service/Non-Stock' },
                  ]}
                  value={profile.inventoryConfig.maintainsInventory ? 'yes' : 'no'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      inventoryConfig: {
                        ...profile.inventoryConfig,
                        maintainsInventory: e.target.value === 'yes'
                      }
                    })
                  }
                />

                <Select
                  label="Allow Negative Inventory"
                  options={[
                    { value: 'false', label: 'Disallow (Strict Validation)' },
                    { value: 'true', label: 'Allow (Warning Only)' },
                  ]}
                  value={profile.inventoryConfig.allowNegativeStock ? 'true' : 'false'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      inventoryConfig: {
                        ...profile.inventoryConfig,
                        allowNegativeStock: e.target.value === 'true'
                      }
                    })
                  }
                />
              </div>
            </div>

            {/* General Ledger Account Code Defaults */}
            <div className="p-4 rounded-xl bg-card/60 border border-border space-y-4">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-purple-400" />
                <span>Automated Journal Engine GL Account Defaults</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Default AR Control Account"
                  value={profile.accountingDefaults.defaultArControlAccountId || '#1200'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      accountingDefaults: {
                        ...profile.accountingDefaults,
                        defaultArControlAccountId: e.target.value
                      }
                    })
                  }
                />

                <Input
                  label="Default AP Control Account"
                  value={profile.accountingDefaults.defaultApControlAccountId || '#2010'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      accountingDefaults: {
                        ...profile.accountingDefaults,
                        defaultApControlAccountId: e.target.value
                      }
                    })
                  }
                />

                <Input
                  label="Default Sales Revenue Account"
                  value={profile.accountingDefaults.defaultRevenueAccountId || '#4010'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      accountingDefaults: {
                        ...profile.accountingDefaults,
                        defaultRevenueAccountId: e.target.value
                      }
                    })
                  }
                />

                <Input
                  label="Default COGS Account"
                  value={profile.accountingDefaults.defaultCogsAccountId || '#5010'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      accountingDefaults: {
                        ...profile.accountingDefaults,
                        defaultCogsAccountId: e.target.value
                      }
                    })
                  }
                />

                <Input
                  label="Default Inventory Asset Account"
                  value={profile.accountingDefaults.defaultInventoryAccountId || '#1300'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      accountingDefaults: {
                        ...profile.accountingDefaults,
                        defaultInventoryAccountId: e.target.value
                      }
                    })
                  }
                />

                <Input
                  label="Tax Identification / VAT Number"
                  value={profile.accountingDefaults.taxRegistrationNumber || ''}
                  placeholder="e.g. VAT-99887766"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      accountingDefaults: {
                        ...profile.accountingDefaults,
                        taxRegistrationNumber: e.target.value
                      }
                    })
                  }
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
