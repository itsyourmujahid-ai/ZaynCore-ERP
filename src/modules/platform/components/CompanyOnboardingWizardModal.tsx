// ============================================================================
// Enterprise Company Onboarding & Business Configuration Wizard (Phase 15)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Briefcase, 
  Package, 
  Ruler, 
  Boxes, 
  ShoppingBag, 
  Truck, 
  BookOpen, 
  Network, 
  Users, 
  Layers, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck
} from 'lucide-react';
import { Modal } from '@/ui/components/Modal';
import { Button } from '@/ui/components/Button';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { 
  FullCompanyOnboardingPayload, 
  BusinessType, 
  SellingCategory, 
  BuyingCategory 
} from '@/database/types';
import { onboardingService } from '@/modules/onboarding/services/onboarding.service';
import { roleRecommendationService } from '@/modules/onboarding/services/role-recommendation.service';
import { ERP_MODULE_REGISTRY } from '@/modules/registry/registry';
import { PLATFORM_CONFIG } from '@/core/config/platform.config';
import { TenantContext } from '@/core/types/common';

export interface CompanyOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenant: TenantContext;
  resumeDraftId?: string;
}

const WIZARD_STEPS = [
  { id: 1, label: 'Company Info', icon: Building2, desc: 'Identity & Legal Details' },
  { id: 2, label: 'Business Type', icon: Briefcase, desc: 'Industry Model' },
  { id: 3, label: 'Products & Services', icon: Package, desc: 'Selling & Buying Scopes' },
  { id: 4, label: 'Units of Measure', icon: Ruler, desc: 'UOM & Conversions' },
  { id: 5, label: 'Inventory & Warehouses', icon: Boxes, desc: 'Stock & Attributes' },
  { id: 6, label: 'Sales Config', icon: ShoppingBag, desc: 'Workflows & Approval' },
  { id: 7, label: 'Purchase Config', icon: Truck, desc: 'Procurement & 3-Way Match' },
  { id: 8, label: 'Accounting & Tax', icon: BookOpen, desc: 'Ledger & VAT Setup' },
  { id: 9, label: 'Organization', icon: Network, desc: 'Branches & Departments' },
  { id: 10, label: 'Roles & Admin', icon: Users, desc: 'RBAC & Initial User' },
  { id: 11, label: 'Modules & Plans', icon: Layers, desc: 'Capabilities & Entitlements' },
  { id: 12, label: 'Review & Activate', icon: CheckCircle2, desc: 'Final Verification' },
];

const ALL_BUSINESS_TYPES: Array<{ key: BusinessType; label: string; desc: string }> = [
  { key: 'trading', label: 'Trading & Commerce', desc: 'Buys and resells commercial goods' },
  { key: 'retail', label: 'Retail Sales', desc: 'Direct-to-consumer store or boutique operations' },
  { key: 'wholesale', label: 'Wholesale & B2B', desc: 'Bulk distribution to corporate customers' },
  { key: 'manufacturing', label: 'Manufacturing & Assembly', desc: 'Transforms raw materials into finished merchandise' },
  { key: 'distribution', label: 'Logistics & Distribution', desc: 'Multi-hub supply chain and freight warehousing' },
  { key: 'services', label: 'Professional Services', desc: 'Consulting, legal, IT, and specialized client services' },
  { key: 'construction', label: 'Construction & Contracting', desc: 'Civil works, site projects, and building infrastructure' },
  { key: 'contracting', label: 'Subcontracting & Operations', desc: 'Project-based execution and technical labor' },
  { key: 'import', label: 'Import & Customs', desc: 'Cross-border procurement and port handling' },
  { key: 'export', label: 'Export Operations', desc: 'International sales and multi-currency delivery' },
  { key: 'project_based', label: 'Project-Based Business', desc: 'Time & materials or milestone job costing' },
  { key: 'rental', label: 'Equipment & Asset Rental', desc: 'Short-term and long-term asset leasing' },
  { key: 'subscription', label: 'Subscription / SaaS', desc: 'Recurring billings and retainer services' },
  { key: 'other', label: 'Other Commercial Industry', desc: 'Custom specialized enterprise operations' },
];

const ALL_SELLING_CATEGORIES: Array<{ key: SellingCategory; label: string }> = [
  { key: 'physical_products', label: 'Physical Products' },
  { key: 'finished_goods', label: 'Finished Goods' },
  { key: 'raw_materials', label: 'Raw Materials' },
  { key: 'spare_parts', label: 'Spare Parts & Replacements' },
  { key: 'consumables', label: 'Operational Consumables' },
  { key: 'services', label: 'Professional & Labor Services' },
  { key: 'digital_products', label: 'Digital Products & Software' },
  { key: 'projects', label: 'Turnkey Project Delivery' },
  { key: 'rental_items', label: 'Rental Equipment & Assets' },
];

const ALL_BUYING_CATEGORIES: Array<{ key: BuyingCategory; label: string }> = [
  { key: 'raw_materials', label: 'Raw Materials & Components' },
  { key: 'finished_goods', label: 'Finished Commercial Goods' },
  { key: 'spare_parts', label: 'Maintenance & Spare Parts' },
  { key: 'consumables', label: 'Packaging & Office Supplies' },
  { key: 'services', label: 'Subcontracted & Advisory Services' },
  { key: 'equipment_capital_goods', label: 'Machinery & Capital Equipment' },
  { key: 'digital_products', label: 'Software Licenses & IT Tools' },
];

const STANDARD_UOM_LIST = [
  { code: 'PCS', name: 'Piece / Unit' },
  { code: 'BOX', name: 'Box' },
  { code: 'CARTON', name: 'Carton' },
  { code: 'PACK', name: 'Pack' },
  { code: 'SET', name: 'Set' },
  { code: 'BOTTLE', name: 'Bottle' },
  { code: 'ROLL', name: 'Roll' },
  { code: 'SHEET', name: 'Sheet' },
  { code: 'METER', name: 'Meter (m)' },
  { code: 'SQM', name: 'Square Meter (m²)' },
  { code: 'CBM', name: 'Cubic Meter (m³)' },
  { code: 'KG', name: 'Kilogram (kg)' },
  { code: 'GRAM', name: 'Gram (g)' },
  { code: 'TON', name: 'Metric Ton (t)' },
  { code: 'LITER', name: 'Liter (L)' },
  { code: 'ML', name: 'Milliliter (mL)' },
  { code: 'HOUR', name: 'Hour (hr)' },
  { code: 'DAY', name: 'Day' },
  { code: 'MONTH', name: 'Month' },
  { code: 'JOB', name: 'Job / Milestone' },
];

const PRODUCT_ATTRIBUTES_LIST = [
  { key: 'brand', label: 'Brand Name' },
  { key: 'model', label: 'Model Number' },
  { key: 'size', label: 'Size / Dimensions' },
  { key: 'color', label: 'Color / Finish' },
  { key: 'thickness', label: 'Thickness (mm)' },
  { key: 'weight', label: 'Unit Weight (kg)' },
  { key: 'length', label: 'Length' },
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'batch', label: 'Batch / Lot Tracking' },
  { key: 'serial_number', label: 'Serial Number' },
  { key: 'expiry_date', label: 'Expiry Date' },
  { key: 'barcode', label: 'Barcode / EAN' },
];

export const CompanyOnboardingWizardModal: React.FC<CompanyOnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenant,
  resumeDraftId,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [payload, setPayload] = useState<FullCompanyOnboardingPayload>(
    onboardingService.getDefaultOnboardingPayload()
  );
  const [draftId, setDraftId] = useState<string | undefined>(resumeDraftId);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // New conversion form state
  const [newConvFrom, setNewConvFrom] = useState('BOX');
  const [newConvTo, setNewConvTo] = useState('PCS');
  const [newConvMultiplier, setNewConvMultiplier] = useState('12.0000');

  // New warehouse form state
  const [newWhCode, setNewWhCode] = useState('');
  const [newWhName, setNewWhName] = useState('');

  // New department form state
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');

  // Load draft if resuming
  useEffect(() => {
    if (resumeDraftId) {
      const drafts = onboardingService.getDrafts();
      const target = drafts.find((d) => d.id === resumeDraftId);
      if (target) {
        setPayload(target.payload);
        setCurrentStep(target.currentStep || 1);
        setDraftId(target.id);
      }
    }
  }, [resumeDraftId]);

  const handleNext = () => {
    const val = onboardingService.validateStep(currentStep, payload);
    if (!val.isValid) {
      setValidationErrors(val.errors);
      return;
    }
    setValidationErrors([]);
    if (currentStep < 12) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setValidationErrors([]);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    const draft = onboardingService.saveDraft(currentStep, payload, draftId, tenant.userId);
    setDraftId(draft.id);
    setSaveSuccessMsg('Progress saved successfully as draft.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleActivate = () => {
    const val = onboardingService.validateStep(12, payload);
    if (!val.isValid) {
      setValidationErrors(val.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      onboardingService.activateCompany(payload, tenant.userId, tenant);
      if (draftId) {
        onboardingService.deleteDraft(draftId);
      }
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationErrors([err.message || 'Failed to activate company.']);
    }
  };

  const toggleBusinessType = (bt: BusinessType) => {
    const current = payload.businessTypes || [];
    if (current.includes(bt)) {
      if (current.length > 1) {
        setPayload({ ...payload, businessTypes: current.filter((x) => x !== bt) });
      }
    } else {
      setPayload({ ...payload, businessTypes: [...current, bt] });
    }
  };

  const toggleSellingCat = (cat: SellingCategory) => {
    const current = payload.sellingCategories || [];
    if (current.includes(cat)) {
      if (current.length > 1) {
        setPayload({ ...payload, sellingCategories: current.filter((x) => x !== cat) });
      }
    } else {
      setPayload({ ...payload, sellingCategories: [...current, cat] });
    }
  };

  const toggleBuyingCat = (cat: BuyingCategory) => {
    const current = payload.buyingCategories || [];
    if (current.includes(cat)) {
      if (current.length > 1) {
        setPayload({ ...payload, buyingCategories: current.filter((x) => x !== cat) });
      }
    } else {
      setPayload({ ...payload, buyingCategories: [...current, cat] });
    }
  };

  const toggleUom = (uomCode: string) => {
    const current = payload.selectedUomCodes || [];
    if (current.includes(uomCode)) {
      if (current.length > 1) {
        setPayload({ ...payload, selectedUomCodes: current.filter((x) => x !== uomCode) });
      }
    } else {
      setPayload({ ...payload, selectedUomCodes: [...current, uomCode] });
    }
  };

  const handleAddConversion = () => {
    if (!newConvFrom || !newConvTo || newConvFrom === newConvTo) return;
    const mult = parseFloat(newConvMultiplier);
    if (isNaN(mult) || mult <= 0) return;

    const list = payload.uomConversions || [];
    if (list.some((c) => c.fromUomCode === newConvFrom && c.toUomCode === newConvTo)) return;

    setPayload({
      ...payload,
      uomConversions: [...list, { fromUomCode: newConvFrom, toUomCode: newConvTo, multiplier: mult.toFixed(4) }],
    });
  };

  const handleRemoveConversion = (from: string, to: string) => {
    setPayload({
      ...payload,
      uomConversions: (payload.uomConversions || []).filter(
        (c) => !(c.fromUomCode === from && c.toUomCode === to)
      ),
    });
  };

  const toggleProductAttribute = (attrKey: string) => {
    const current = payload.selectedAttributes || [];
    if (current.includes(attrKey)) {
      setPayload({ ...payload, selectedAttributes: current.filter((x) => x !== attrKey) });
    } else {
      setPayload({ ...payload, selectedAttributes: [...current, attrKey] });
    }
  };

  const handleAddWarehouse = () => {
    if (!newWhCode || !newWhName) return;
    const list = payload.warehouses || [];
    if (list.some((w) => w.code.toUpperCase() === newWhCode.toUpperCase())) return;

    setPayload({
      ...payload,
      warehouses: [
        ...list,
        {
          code: newWhCode.toUpperCase(),
          name: newWhName,
          isDefault: list.length === 0,
        },
      ],
    });
    setNewWhCode('');
    setNewWhName('');
  };

  const handleRemoveWarehouse = (code: string) => {
    const list = payload.warehouses || [];
    if (list.length <= 1) return;
    setPayload({
      ...payload,
      warehouses: list.filter((w) => w.code !== code),
    });
  };

  const handleAddDepartment = () => {
    if (!newDeptCode || !newDeptName) return;
    const list = payload.departments || [];
    if (list.some((d) => d.code.toUpperCase() === newDeptCode.toUpperCase())) return;

    setPayload({
      ...payload,
      departments: [
        ...list,
        { code: newDeptCode.toUpperCase(), name: newDeptName },
      ],
    });
    setNewDeptCode('');
    setNewDeptName('');
  };

  const handleRemoveDepartment = (code: string) => {
    setPayload({
      ...payload,
      departments: (payload.departments || []).filter((d) => d.code !== code),
    });
  };

  const toggleRole = (rKey: string) => {
    if (rKey === 'COMPANY_ADMIN') return; // Mandatory core role
    const current = payload.selectedRoles || [];
    if (current.includes(rKey)) {
      setPayload({ ...payload, selectedRoles: current.filter((x) => x !== rKey) });
    } else {
      setPayload({ ...payload, selectedRoles: [...current, rKey] });
    }
  };

  const toggleModule = (modKey: string) => {
    const current = payload.enabledModuleKeys || [];
    if (modKey === 'financial_accounting') return; // Core mandatory module
    if (current.includes(modKey)) {
      setPayload({ ...payload, enabledModuleKeys: current.filter((x) => x !== modKey) });
    } else {
      setPayload({ ...payload, enabledModuleKeys: [...current, modKey] });
    }
  };

  const recommendedRoles = roleRecommendationService.recommendRoles(payload);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Onboarding & Business Configuration"
      subtitle="Configure a multi-tenant customer organization customized to its industry, products, UOM conversions, and accounting workflows."
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
            {saveSuccessMsg && (
              <span className="text-xs font-semibold text-emerald-400 animate-fadeIn">
                {saveSuccessMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
              >
                Back
              </Button>
            )}

            {currentStep < 12 ? (
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-4 h-4" />}
                isLoading={isSubmitting}
                onClick={handleActivate}
              >
                Activate Company
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 select-none">
        {/* Step Indicator Progress Bar */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-2 border-b border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400 font-bold">Step {currentStep} of 12:</span>
              <span className="text-slate-100">{WIZARD_STEPS[currentStep - 1].label}</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {WIZARD_STEPS[currentStep - 1].desc}
            </span>
          </div>

          {/* Stepper Dots / Badges */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
            {WIZARD_STEPS.map((step) => {
              const Icon = step.icon;
              const isPassed = step.id < currentStep;
              const isCurrent = step.id === currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    // Allow clicking earlier steps or next step if valid
                    if (step.id <= currentStep) {
                      setCurrentStep(step.id);
                    }
                  }}
                  title={step.label}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-purple-600 text-white font-bold shadow-md ring-1 ring-purple-400'
                      : isPassed
                      ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                      : 'bg-slate-900 text-slate-500 opacity-60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline truncate">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Validation Errors Box */}
        {validationErrors.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1 animate-fadeIn">
            <div className="font-semibold flex items-center gap-1.5 text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Please resolve the following before proceeding:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step 1: Company Information */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Legal Company Name"
                required
                placeholder="e.g. Apex Global Industrial Solutions LLC"
                value={payload.name}
                onChange={(e) => setPayload({ ...payload, name: e.target.value })}
              />
              <Input
                label="Company Short Code"
                required
                placeholder="e.g. APEX"
                value={payload.code}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  setPayload({ 
                    ...payload, 
                    code: upper,
                    accessCode: payload.accessCode || upper 
                  });
                }}
              />
              <Input
                label="Company Access Code (Login Code)"
                required
                placeholder="e.g. APEX or APEX-2026"
                value={payload.accessCode || payload.code}
                onChange={(e) => setPayload({ ...payload, accessCode: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Display / Trade Name"
                placeholder="e.g. Apex Global"
                value={payload.legalName}
                onChange={(e) => setPayload({ ...payload, legalName: e.target.value })}
              />
              <Input
                label="Commercial Registration Number"
                placeholder="e.g. CR-8839201"
                value={payload.registrationNumber}
                onChange={(e) => setPayload({ ...payload, registrationNumber: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Country of Incorporation"
                required
                options={[
                  { value: 'US', label: 'United States (US)' },
                  { value: 'OM', label: 'Oman (OM)' },
                  { value: 'AE', label: 'United Arab Emirates (AE)' },
                  { value: 'SA', label: 'Saudi Arabia (SA)' },
                  { value: 'GB', label: 'United Kingdom (UK)' },
                  { value: 'CA', label: 'Canada (CA)' },
                  { value: 'DE', label: 'Germany (DE)' },
                  { value: 'IN', label: 'India (IN)' },
                  { value: 'SG', label: 'Singapore (SG)' },
                ]}
                value={payload.countryCode}
                onChange={(e) => setPayload({ ...payload, countryCode: e.target.value })}
              />

              <Select
                label="Base Ledger Currency"
                required
                options={PLATFORM_CONFIG.supportedCurrencies.map((c) => ({
                  value: c.code,
                  label: `${c.code} - ${c.name} (${c.symbol})`,
                }))}
                value={payload.baseCurrency}
                onChange={(e) => setPayload({ ...payload, baseCurrency: e.target.value })}
              />

              <Select
                label="Operating Tier Template"
                options={[
                  { value: 'small', label: 'Small Business (Standard Core)' },
                  { value: 'medium', label: 'Medium Business (Advanced Core)' },
                  { value: 'enterprise', label: 'Enterprise (Full ERP Spectrum)' },
                ]}
                value={payload.tier}
                onChange={(e) => setPayload({ ...payload, tier: e.target.value as any })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="City / Headquarters"
                placeholder="e.g. New York, Muscat, Dubai"
                value={payload.city}
                onChange={(e) => setPayload({ ...payload, city: e.target.value })}
              />
              <Input
                label="Corporate Email"
                type="email"
                placeholder="info@company.com"
                value={payload.email}
                onChange={(e) => setPayload({ ...payload, email: e.target.value })}
              />
              <Input
                label="Phone Number"
                placeholder="+1 (555) 019-2831"
                value={payload.phone}
                onChange={(e) => setPayload({ ...payload, phone: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 2: Business Types */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-xs text-slate-400">
              Select all industry business models that apply to this organization. The ERP will configure relevant workflows and templates accordingly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {ALL_BUSINESS_TYPES.map((bt) => {
                const isSelected = payload.businessTypes?.includes(bt.key);
                return (
                  <div
                    key={bt.key}
                    onClick={() => toggleBusinessType(bt.key)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-600/10 border-purple-500/50 shadow-sm ring-1 ring-purple-500/20'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100">{bt.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{bt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Products & Services */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                What does this company SELL?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ALL_SELLING_CATEGORIES.map((cat) => {
                  const isSelected = payload.sellingCategories?.includes(cat.key);
                  return (
                    <div
                      key={cat.key}
                      onClick={() => toggleSellingCat(cat.key)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-purple-600/10 border-purple-500/50 text-purple-200 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                What does this company BUY / PROCURE?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ALL_BUYING_CATEGORIES.map((cat) => {
                  const isSelected = payload.buyingCategories?.includes(cat.key);
                  return (
                    <div
                      key={cat.key}
                      onClick={() => toggleBuyingCat(cat.key)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500/50 text-blue-200 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Units of Measure & Conversions */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Select Active Units of Measure (UOM)
                </span>
                <span className="text-[11px] text-slate-400">
                  {payload.selectedUomCodes?.length || 0} Units Selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {STANDARD_UOM_LIST.map((u) => {
                  const isSelected = payload.selectedUomCodes?.includes(u.code);
                  return (
                    <div
                      key={u.code}
                      onClick={() => toggleUom(u.code)}
                      className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-purple-600/10 border-purple-500/50 text-purple-200 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{u.code}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* UOM Conversion Rules */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-100">Unit Conversion Rules</span>
                  <p className="text-[11px] text-slate-400">
                    Define conversion multipliers between Purchase Unit, Stock Unit, and Sales Unit.
                  </p>
                </div>
              </div>

              {/* Existing Conversions List */}
              <div className="space-y-1.5">
                {(payload.uomConversions || []).map((conv, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-slate-200">
                      1 <strong>{conv.fromUomCode}</strong> = <strong>{conv.multiplier}</strong> {conv.toUomCode}
                    </span>
                    <button
                      onClick={() => handleRemoveConversion(conv.fromUomCode, conv.toUomCode)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Conversion Form */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 items-end">
                <Select
                  label="From (Source Unit)"
                  options={(payload.selectedUomCodes || ['BOX', 'CARTON', 'KG']).map((c) => ({ value: c, label: c }))}
                  value={newConvFrom}
                  onChange={(e) => setNewConvFrom(e.target.value)}
                />
                <Select
                  label="To (Base/Target Unit)"
                  options={(payload.selectedUomCodes || ['PCS', 'GRAM', 'METER']).map((c) => ({ value: c, label: c }))}
                  value={newConvTo}
                  onChange={(e) => setNewConvTo(e.target.value)}
                />
                <Input
                  label="Multiplier"
                  placeholder="e.g. 24.0000"
                  value={newConvMultiplier}
                  onChange={(e) => setNewConvMultiplier(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddConversion}
                >
                  Add Rule
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Inventory & Warehouses */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Inventory Master Switch */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-100">Does this company maintain physical inventory?</span>
                <p className="text-[11px] text-slate-400">
                  If NO, stock tracking workflows will remain disabled and hidden from normal users.
                </p>
              </div>
              <button
                onClick={() =>
                  setPayload({
                    ...payload,
                    inventoryConfig: {
                      ...payload.inventoryConfig,
                      maintainsInventory: !payload.inventoryConfig.maintainsInventory,
                    },
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  payload.inventoryConfig?.maintainsInventory
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {payload.inventoryConfig?.maintainsInventory ? 'YES (Inventory Enabled)' : 'NO (Service / Pure Billing)'}
              </button>
            </div>

            {payload.inventoryConfig?.maintainsInventory && (
              <>
                {/* Product Attributes Picker */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-2">
                    Select Required Product Attributes
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRODUCT_ATTRIBUTES_LIST.map((attr) => {
                      const isSelected = payload.selectedAttributes?.includes(attr.key);
                      return (
                        <div
                          key={attr.key}
                          onClick={() => toggleProductAttribute(attr.key)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-purple-600/10 border-purple-500/50 text-purple-200 font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span>{attr.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Warehouses Setup */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">Initial Warehouses</span>
                    <span className="text-[11px] text-slate-400">{payload.warehouses?.length || 0} Configured</span>
                  </div>

                  <div className="space-y-1.5">
                    {(payload.warehouses || []).map((w) => (
                      <div
                        key={w.code}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-brand-400">{w.code}</span>
                          <span className="text-slate-200">{w.name}</span>
                          {w.isDefault && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        {(payload.warehouses || []).length > 1 && (
                          <button
                            onClick={() => handleRemoveWarehouse(w.code)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 items-end">
                    <Input
                      label="Warehouse Code"
                      placeholder="e.g. WH-NORTH"
                      value={newWhCode}
                      onChange={(e) => setNewWhCode(e.target.value)}
                    />
                    <Input
                      label="Warehouse Name"
                      placeholder="e.g. Northern Regional Depot"
                      value={newWhName}
                      onChange={(e) => setNewWhName(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={handleAddWarehouse}
                    >
                      Add Warehouse
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 6: Sales Workflow Configuration */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-xs text-slate-400">
              Configure which sales documents and commercial controls are enabled for this company.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'enableQuotation', label: 'Quotations / Proforma Estimates', desc: 'Pre-sales quotes without GL impact' },
                { key: 'enableSalesOrder', label: 'Sales Orders', desc: 'Confirmed orders requiring fulfillment' },
                { key: 'enableSalesInvoice', label: 'Commercial Sales Invoices', desc: 'Posts Dr AR #1200, Cr Revenue #4010' },
                { key: 'enableDeliveryNote', label: 'Delivery Notes & Stock Issues', desc: 'Relieves inventory and posts COGS' },
                { key: 'enableCustomerPayment', label: 'Customer Receipts & Payments', desc: 'Settles invoices and manages advances' },
                { key: 'enableCreditNote', label: 'Credit Notes', desc: 'Commercial sales returns and invoice credit adjustments' },
                { key: 'enableCustomerCreditLimit', label: 'Customer Credit Limit Enforcement', desc: 'Blocks invoicing exceeding credit limit' },
                { key: 'enablePaymentProofVerification', label: '2-Step Payment Proof Verification', desc: 'Accountant verification gate before GL mutation' },
              ].map((item) => {
                const isEnabled = (payload.salesWorkflow as any)[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() =>
                      setPayload({
                        ...payload,
                        salesWorkflow: {
                          ...payload.salesWorkflow,
                          [item.key]: !isEnabled,
                        },
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isEnabled
                        ? 'bg-slate-900 border-purple-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-100">{item.label}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 7: Purchase Workflow Configuration */}
        {currentStep === 7 && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-xs text-slate-400">
              Configure procurement controls and vendor verification gates.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'enablePurchaseRequest', label: 'Purchase Requisitions (PR)', desc: 'Internal requests prior to procurement' },
                { key: 'enableRfq', label: 'Request for Quotation (RFQ)', desc: 'Multi-vendor price comparison matrix' },
                { key: 'enablePurchaseOrder', label: 'Purchase Orders (PO)', desc: 'Vendor orders (does NOT increase inventory)' },
                { key: 'enableGoodsReceipt', label: 'Goods Receipt Notes (GRN)', desc: 'Official warehouse receiving increasing stock' },
                { key: 'enableSupplierBill', label: 'Supplier Bills / Invoices', desc: 'Posts Dr Expense/COGS, Cr AP #2010' },
                { key: 'enableThreeWayMatch', label: '3-Way Match Verification', desc: 'Asserts PO Qty == GRN Qty == Bill Qty' },
                { key: 'enableSupplierPayment', label: 'Supplier Payments & Disbursements', desc: 'Disburses bank/cash settlement against AP' },
                { key: 'enablePurchaseCreditNote', label: 'Purchase Credit Notes', desc: 'Vendor returns and bill credit adjustments' },
              ].map((item) => {
                const isEnabled = (payload.purchaseWorkflow as any)[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() =>
                      setPayload({
                        ...payload,
                        purchaseWorkflow: {
                          ...payload.purchaseWorkflow,
                          [item.key]: !isEnabled,
                        },
                      })
                    }
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isEnabled
                        ? 'bg-slate-900 border-purple-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-100">{item.label}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 8: Accounting & Tax Configuration */}
        {currentStep === 8 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-100 block">Sovereign Tax / VAT Configuration</span>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Enable Tax & VAT Compliance Engine</span>
                  <button
                    onClick={() =>
                      setPayload({
                        ...payload,
                        accountingDefaults: {
                          ...payload.accountingDefaults,
                          enableTaxVat: !payload.accountingDefaults.enableTaxVat,
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      payload.accountingDefaults?.enableTaxVat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {payload.accountingDefaults?.enableTaxVat ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {payload.accountingDefaults?.enableTaxVat && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <Input
                      label="Tax / VAT Registration Number"
                      placeholder="e.g. VAT-88392019"
                      value={payload.accountingDefaults.taxRegistrationNumber || ''}
                      onChange={(e) =>
                        setPayload({
                          ...payload,
                          accountingDefaults: {
                            ...payload.accountingDefaults,
                            taxRegistrationNumber: e.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      label="Default Standard Tax Rate (%)"
                      placeholder="5.00"
                      value={payload.accountingDefaults.defaultTaxRatePercent || '5.00'}
                      onChange={(e) =>
                        setPayload({
                          ...payload,
                          accountingDefaults: {
                            ...payload.accountingDefaults,
                            defaultTaxRatePercent: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-100 block">Ledger & Multi-Currency Policy</span>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-300 block">Multi-Currency Transactions</span>
                    <span className="text-[11px] text-slate-500">Allow EUR, GBP, AED, SAR conversion to base {payload.baseCurrency}</span>
                  </div>
                  <button
                    onClick={() =>
                      setPayload({
                        ...payload,
                        accountingDefaults: {
                          ...payload.accountingDefaults,
                          enableMultiCurrency: !payload.accountingDefaults.enableMultiCurrency,
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      payload.accountingDefaults?.enableMultiCurrency
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {payload.accountingDefaults?.enableMultiCurrency ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div>• Automatic Chart of Accounts generation (Assets, Liabilities, Equity, Revenue, COGS, Expenses).</div>
                  <div>• 12 Monthly Accounting Periods with Period Lock enforcement.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 9: Organizational Structure */}
        {currentStep === 9 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Departments Setup */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-100">Company Departments</span>
                  <p className="text-[11px] text-slate-400">
                    Organizational departments used for expense allocation and management dimensions.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400">{payload.departments?.length || 0} Configured</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(payload.departments || []).map((d) => (
                  <div
                    key={d.code}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-brand-400">{d.code}</span>
                      <span className="text-slate-200 ml-2">{d.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveDepartment(d.code)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 items-end">
                <Input
                  label="Department Code"
                  placeholder="e.g. MKTG"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                />
                <Input
                  label="Department Name"
                  placeholder="e.g. Marketing & Communications"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddDepartment}
                >
                  Add Department
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 10: Roles & Initial Admin */}
        {currentStep === 10 && (
          <div className="space-y-4 animate-fadeIn">
            {/* Initial Company Admin User Details */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-100">
                  Initial Company Administrator Credentials
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                This administrator will have primary ownership of the company ERP workspace without platform super admin privileges.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input
                  label="Administrator Full Name"
                  required
                  placeholder="e.g. Johnathan Vance"
                  value={payload.initialAdmin.fullName}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      initialAdmin: { ...payload.initialAdmin, fullName: e.target.value },
                    })
                  }
                />
                <Input
                  label="Login Username"
                  required
                  placeholder="e.g. jvance"
                  value={payload.initialAdmin.username}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      initialAdmin: { ...payload.initialAdmin, username: e.target.value },
                    })
                  }
                />
                <Input
                  label="Admin Email"
                  type="email"
                  placeholder="admin@company.com"
                  value={payload.initialAdmin.email || ''}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      initialAdmin: { ...payload.initialAdmin, email: e.target.value },
                    })
                  }
                />
                <Input
                  label="Initial Password"
                  type="password"
                  placeholder="••••••••"
                  value={payload.initialAdmin.password || ''}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      initialAdmin: { ...payload.initialAdmin, password: e.target.value },
                    })
                  }
                />
                <Input
                  label="Designation / Job Title"
                  placeholder="e.g. Managing Director / General Manager"
                  value={payload.initialAdmin.designation || ''}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      initialAdmin: { ...payload.initialAdmin, designation: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {/* Recommended Roles Checklist */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-2">
                Recommended Organizational Roles (Based on Selected Business Model)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {recommendedRoles.map((role) => {
                  const isSelected = payload.selectedRoles?.includes(role.key);
                  return (
                    <div
                      key={role.key}
                      onClick={() => toggleRole(role.key)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-slate-900 border-purple-500/50'
                          : 'bg-slate-950/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">{role.name}</span>
                          {role.isCore && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              CORE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{role.description}</p>
                        <p className="text-[10px] text-slate-500 mt-1 italic">{role.reason}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isSelected ? 'ACTIVE' : 'EXCLUDED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 11: Modules & Features Entitlements */}
        {currentStep === 11 && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-xs text-slate-400">
              Fine-tune the enabled ERP modules for this company. Core modules (Accounting, Banking, Reporting) are always active.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {ERP_MODULE_REGISTRY.map((mod) => {
                const isEnabled = payload.enabledModuleKeys?.includes(mod.key);
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                      mod.isCore ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isEnabled
                        ? 'bg-slate-900 border-purple-500/40'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{mod.name}</span>
                        {mod.isCore && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                            CORE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{mod.description}</p>
                    </div>

                    {!mod.isCore ? (
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                          isEnabled
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-800 text-brand-400 shrink-0">
                        Always On
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 12: Review & Activate */}
        {currentStep === 12 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block">
                  Configuration Ready for Activation
                </span>
                <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                  {payload.name} [{payload.code}]
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Operating Plan: <strong className="text-slate-200 uppercase">{payload.tier}</strong> • Base Currency: <strong className="font-mono text-slate-200">{payload.baseCurrency}</strong> • Country: <strong className="font-mono text-slate-200">{payload.countryCode}</strong> • Portal Access Code: <strong className="font-mono text-purple-300 font-bold">{(payload.accessCode || payload.code).toUpperCase()}</strong>
                </p>
              </div>
              <StatusBadge status={payload.tier} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Card 1: Company Identity */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">1. Company Identity</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-slate-200 font-semibold truncate">
                  {payload.legalName || payload.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {payload.city ? `${payload.city}, ` : ''}{payload.countryCode} • Fiscal Start Month: {payload.fiscalYearStartMonth}
                </div>
              </div>

              {/* Card 2: Business Model */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">2. Business Model</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-purple-300 font-semibold truncate">
                  {payload.businessTypes.join(', ')}
                </div>
                <div className="text-[11px] text-slate-400">
                  {payload.sellingCategories.length} Selling • {payload.buyingCategories.length} Buying Categories
                </div>
              </div>

              {/* Card 3: UOM & Conversions */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">3. UOM & Conversions</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-emerald-300 font-semibold">
                  {payload.selectedUomCodes.length} Active UOMs
                </div>
                <div className="text-[11px] text-slate-400">
                  {payload.uomConversions?.length || 0} Conversion Rules (Stock: {payload.defaultStockUom || 'PCS'})
                </div>
              </div>

              {/* Card 4: Inventory & Warehouses */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">4. Inventory & Stock</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-slate-200 font-semibold">
                  {payload.inventoryConfig.maintainsInventory ? `${payload.warehouses?.length || 1} Warehouse(s)` : 'Inventory Tracking Disabled'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Costing: {payload.inventoryConfig.defaultCostingMethod || 'WEIGHTED_AVG'} • Neg Stock: {payload.inventoryConfig.allowNegativeStock ? 'Allowed' : 'Blocked'}
                </div>
              </div>

              {/* Card 5: Workflows & Approvals */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">5. Sales & Procurement</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(6)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-slate-200 font-semibold">
                  2-Step Verification: {payload.salesWorkflow.enablePaymentProofVerification ? 'Enabled' : 'Disabled'}
                </div>
                <div className="text-[11px] text-slate-400">
                  3-Way Match: {payload.purchaseWorkflow.enableThreeWayMatch ? 'Active' : 'Off'} • Credit Limits: {payload.salesWorkflow.enableCustomerCreditLimit ? 'Enforced' : 'Off'}
                </div>
              </div>

              {/* Card 6: Accounting & Organization */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">6. Organization & Tax</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(8)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-slate-200 font-semibold">
                  {payload.branches?.length || 1} Branch(es) • {payload.departments?.length || 3} Dept(s)
                </div>
                <div className="text-[11px] text-slate-400">
                  VAT/Tax: {payload.accountingDefaults.enableTaxVat ? `Enabled (${payload.accountingDefaults.defaultTaxRatePercent || 5}%)` : 'Exempt'}
                </div>
              </div>

              {/* Card 7: Admin & Roles */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">7. Initial Admin</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(10)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-slate-200 font-semibold truncate">
                  {payload.initialAdmin.fullName || 'Admin User'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  Username: @{payload.initialAdmin.username}
                </div>
              </div>

              {/* Card 8: Enabled Modules */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 relative md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">8. Module Entitlements</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(11)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-purple-300 font-semibold">
                  {payload.enabledModuleKeys.length} Enterprise Modules Activated
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {payload.enabledModuleKeys.join(', ')}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Automated Activation Sequence:</span>
              </span>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5 pl-1">
                <li>Allocates tenant data partition and initializes chart of accounts for {payload.baseCurrency}.</li>
                <li>Generates 12 fiscal periods starting Month {payload.fiscalYearStartMonth}.</li>
                <li>Registers UOM presets and cross-unit conversion rules.</li>
                <li>Creates {payload.warehouses?.length || 1} warehouse(s) and storage staging bays.</li>
                <li>Assigns {payload.enabledModuleKeys.length} enabled modules to {payload.name}.</li>
                <li>Provisions initial Company Admin ({payload.initialAdmin.username}) with isolated company scope.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
