// ============================================================================
// Enterprise Company Onboarding Wizard (Simplified 8-Step Redesign)
// Philosophy: "START SIMPLE, CONFIGURE MORE LATER"
// High-Contrast WCAG AAA/AA, Frosted Glassmorphism & Full Mobile Responsiveness
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Briefcase, 
  Package, 
  Ruler, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  Check, 
  ShieldCheck,
  Percent,
  Clock,
  ShoppingBag,
  Truck,
  Landmark,
  Layers
} from 'lucide-react';
import { Modal } from '@/ui/components/Modal';
import { Button } from '@/ui/components/Button';
import { Input } from '@/ui/components/Input';
import { Select, SelectOption } from '@/ui/components/Select';
import { 
  FullCompanyOnboardingPayload, 
  SellingCategory, 
  BuyingCategory 
} from '@/database/types';
import { onboardingService } from '@/modules/onboarding/services/onboarding.service';
import { TenantContext } from '@/core/types/common';

export interface CompanyOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenant: TenantContext;
  resumeDraftId?: string;
}

// 8 Streamlined Steps
const STREAMLINED_STEPS = [
  { id: 1, label: 'Welcome', icon: Sparkles, desc: 'Overview' },
  { id: 2, label: 'Company', icon: Building2, desc: 'Identity & Info' },
  { id: 3, label: 'Business', icon: Briefcase, desc: 'Products & Scope' },
  { id: 4, label: 'Financial', icon: BookOpen, desc: 'Ledger Basics' },
  { id: 5, label: 'Inventory', icon: Ruler, desc: 'UOM & Stock' },
  { id: 6, label: 'Tax', icon: Percent, desc: 'VAT & Tax' },
  { id: 7, label: 'Admin', icon: Users, desc: 'Initial Lead' },
  { id: 8, label: 'Review', icon: CheckCircle2, desc: 'Activate' },
];

const STANDARD_UOM_GROUPS = [
  {
    category: 'QUANTITY',
    title: 'Quantity & Units',
    units: [
      { code: 'PCS', name: 'Piece / Unit', symbol: 'pcs' },
      { code: 'BOX', name: 'Box', symbol: 'box' },
      { code: 'PACK', name: 'Pack', symbol: 'pk' },
      { code: 'SET', name: 'Set', symbol: 'set' },
      { code: 'CARTON', name: 'Carton', symbol: 'ctn' },
      { code: 'BOTTLE', name: 'Bottle', symbol: 'btl' },
      { code: 'ROLL', name: 'Roll', symbol: 'roll' },
    ]
  },
  {
    category: 'LENGTH',
    title: 'Length & Distance',
    units: [
      { code: 'METER', name: 'Meter', symbol: 'm' },
      { code: 'CM', name: 'Centimeter', symbol: 'cm' },
    ]
  },
  {
    category: 'WEIGHT',
    title: 'Weight & Mass',
    units: [
      { code: 'KG', name: 'Kilogram', symbol: 'kg' },
      { code: 'GRAM', name: 'Gram', symbol: 'g' },
      { code: 'TON', name: 'Metric Ton', symbol: 't' },
    ]
  },
  {
    category: 'VOLUME',
    title: 'Volume & Fluid',
    units: [
      { code: 'LITER', name: 'Liter', symbol: 'L' },
      { code: 'ML', name: 'Milliliter', symbol: 'mL' },
    ]
  },
  {
    category: 'AREA',
    title: 'Area & Coverage',
    units: [
      { code: 'SQM', name: 'Square Meter', symbol: 'm²' },
    ]
  }
];

const COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'OM', label: 'Oman (Sultanate of Oman)' },
  { value: 'AE', label: 'United Arab Emirates (UAE)' },
  { value: 'SA', label: 'Saudi Arabia (KSA)' },
  { value: 'QA', label: 'Qatar' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'US', label: 'United States (US)' },
  { value: 'GB', label: 'United Kingdom (UK)' },
  { value: 'IN', label: 'India' },
];

const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'OMR', label: 'OMR — Omani Rial (ر.ع.)' },
  { value: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { value: 'SAR', label: 'SAR — Saudi Riyal (ر.س)' },
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'KWD', label: 'KWD — Kuwaiti Dinar' },
  { value: 'BHD', label: 'BHD — Bahraini Dinar' },
  { value: 'QAR', label: 'QAR — Qatari Riyal' },
  { value: 'INR', label: 'INR — Indian Rupee (₹)' },
];

const TAX_RATE_OPTIONS: SelectOption[] = [
  { value: '5.00', label: '5.00% (Standard Oman / GCC VAT)' },
  { value: '15.00', label: '15.00% (Saudi Arabia KSA VAT)' },
  { value: '0.00', label: '0.00% (Zero-Rated / Exempt)' },
  { value: '10.00', label: '10.00% (Standard Regional)' },
  { value: '20.00', label: '20.00% (UK / European VAT)' },
];

export const CompanyOnboardingWizardModal: React.FC<CompanyOnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenant,
  resumeDraftId,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [payload, setPayload] = useState<FullCompanyOnboardingPayload>(() => 
    onboardingService.getDefaultOnboardingPayload()
  );
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(resumeDraftId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveDraftFeedback, setSaveDraftFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  // Simplified UI helper states
  const [sellingType, setSellingType] = useState<'products' | 'services' | 'both'>('both');
  const [hasPhysicalInventory, setHasPhysicalInventory] = useState(true);
  const [isVatRegistered, setIsVatRegistered] = useState(true);
  const [showCustomUomModal, setShowCustomUomModal] = useState(false);
  const [customUomForm, setCustomUomForm] = useState({ code: '', name: '', symbol: '' });

  // Load draft if resuming
  useEffect(() => {
    if (resumeDraftId && isOpen) {
      const drafts = onboardingService.getDrafts();
      const draft = drafts.find((d) => d.id === resumeDraftId);
      if (draft) {
        setPayload(draft.payload);
        setCurrentStep(draft.currentStep || 1);
        setActiveDraftId(draft.id);
        
        // Sync helper states
        const hasServices = draft.payload.sellingCategories?.includes('services');
        const hasProducts = draft.payload.sellingCategories?.some(c => c !== 'services');
        if (hasServices && hasProducts) setSellingType('both');
        else if (hasServices) setSellingType('services');
        else setSellingType('products');

        setHasPhysicalInventory(draft.payload.inventoryConfig?.maintainsInventory ?? true);
        setIsVatRegistered(draft.payload.accountingDefaults?.enableTaxVat ?? true);
      }
    }
  }, [resumeDraftId, isOpen]);

  // Clean company name to code generator
  const handleNameChange = (name: string) => {
    const autoCode = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 16);

    setPayload((prev) => ({
      ...prev,
      name,
      legalName: prev.legalName || name,
      code: prev.code ? prev.code : autoCode,
    }));
  };

  // Helper update
  const updatePayload = (partial: Partial<FullCompanyOnboardingPayload>) => {
    setPayload((prev) => ({ ...prev, ...partial }));
    setStepErrors({});
    setErrorMessage(null);
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 2) {
      if (!payload.name?.trim()) errors.name = 'Company Name is required.';
      if (!payload.code?.trim()) errors.code = 'Company Short Code is required.';
      else if (payload.code.trim().length < 2) errors.code = 'Company Code must be at least 2 characters.';
      if (!payload.countryCode) errors.countryCode = 'Country is required.';
      if (!payload.baseCurrency) errors.baseCurrency = 'Currency is required.';
    }

    if (currentStep === 7) {
      if (!payload.initialAdmin?.fullName?.trim()) errors['admin.fullName'] = 'Admin Full Name is required.';
      if (!payload.initialAdmin?.username?.trim()) errors['admin.username'] = 'Admin Username or Email is required.';
      if (!payload.initialAdmin?.password?.trim()) errors['admin.password'] = 'Admin Password is required.';
      else if (payload.initialAdmin.password.length < 6) errors['admin.password'] = 'Password must be at least 6 characters.';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step Navigation
  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep === 3) {
      const sellCats: SellingCategory[] = 
        sellingType === 'products' ? ['physical_products', 'finished_goods'] :
        sellingType === 'services' ? ['services'] : ['physical_products', 'finished_goods', 'services'];
      
      const buyCats: BuyingCategory[] = 
        hasPhysicalInventory ? ['finished_goods', 'raw_materials', 'consumables', 'services'] : ['services', 'consumables'];

      updatePayload({
        sellingCategories: sellCats,
        buyingCategories: buyCats,
        inventoryConfig: {
          ...payload.inventoryConfig,
          maintainsInventory: hasPhysicalInventory,
        }
      });
    }

    if (currentStep < 8) {
      if (currentStep === 4 && !hasPhysicalInventory) {
        setCurrentStep(6);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 6 && !hasPhysicalInventory) {
      setCurrentStep(4);
    } else if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Draft saving
  const handleSaveDraft = () => {
    try {
      const draft = onboardingService.saveDraft(currentStep, payload, activeDraftId, tenant.userId);
      setActiveDraftId(draft.id);
      setSaveDraftFeedback('Setup draft saved successfully!');
      setTimeout(() => setSaveDraftFeedback(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save draft');
    }
  };

  // Final Submission
  const handleCreateCompany = () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const completePayload: FullCompanyOnboardingPayload = {
        ...payload,
        tier: payload.tier || 'enterprise',
        fiscalYearStartMonth: payload.fiscalYearStartMonth || 1,
        selectedUomCodes: payload.selectedUomCodes?.length ? payload.selectedUomCodes : ['PCS', 'BOX', 'CARTON', 'KG', 'METER', 'HOUR', 'JOB'],
        defaultStockUom: payload.defaultStockUom || 'PCS',
        defaultSalesUom: payload.defaultSalesUom || 'PCS',
        defaultPurchaseUom: payload.defaultPurchaseUom || 'CARTON',
        warehouses: payload.warehouses?.length ? payload.warehouses : [
          { code: 'WH-MAIN', name: 'Main Distribution Warehouse', address: payload.addressLine1 || 'Headquarters Logistics Hub', isDefault: true }
        ],
        branches: payload.branches?.length ? payload.branches : [
          { code: 'HQ', name: `${payload.name} Corporate HQ`, city: payload.city || 'Primary Hub', isHeadquarters: true }
        ],
        departments: payload.departments?.length ? payload.departments : [
          { code: 'OPS', name: 'Operations & Supply Chain', description: 'Core business operations' },
          { code: 'FIN', name: 'Finance & Accounting', description: 'General ledger and fiscal control' },
          { code: 'SALES', name: 'Commercial Sales', description: 'Client acquisition & sales' },
        ],
        costCenters: payload.costCenters?.length ? payload.costCenters : [
          { code: 'CC-HQ', name: 'Corporate HQ Administrative Center' }
        ],
        selectedRoles: ['COMPANY_ADMIN', 'ACCOUNTANT', 'SALES_USER', 'PURCHASE_USER', 'WAREHOUSE_MANAGER'],
        enabledModuleKeys: [
          'financial_accounting',
          'sales',
          'accounts_payable',
          'inventory',
          'banking_cash',
          'advanced_reporting',
          'payroll_hr',
          'fixed_assets',
          'project_accounting',
          'tax_compliance',
          'cost_accounting',
          'multi_company',
        ],
        accountingDefaults: {
          ...payload.accountingDefaults,
          enableTaxVat: isVatRegistered,
          taxRegistrationNumber: isVatRegistered ? (payload.taxIdentifier || payload.accountingDefaults?.taxRegistrationNumber || '') : '',
          defaultTaxRatePercent: isVatRegistered ? (payload.accountingDefaults?.defaultTaxRatePercent || '5.00') : '0.00',
        }
      };

      onboardingService.activateCompany(completePayload, tenant.userId, tenant);

      if (activeDraftId) {
        onboardingService.deleteDraft(activeDraftId);
      }

      setIsCompleted(true);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating the company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UOM Helpers
  const toggleUom = (code: string) => {
    const current = payload.selectedUomCodes || ['PCS'];
    if (current.includes(code)) {
      if (current.length === 1) return;
      updatePayload({ selectedUomCodes: current.filter((c) => c !== code) });
    } else {
      updatePayload({ selectedUomCodes: [...current, code] });
    }
  };

  const handleAddCustomUom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUomForm.code.trim() || !customUomForm.name.trim()) return;

    const uomCode = customUomForm.code.trim().toUpperCase();
    const newCustomUom = {
      code: uomCode,
      name: customUomForm.name.trim(),
      symbol: customUomForm.symbol.trim() || uomCode.toLowerCase(),
      category: 'quantity' as const,
      conversionFactor: '1.0000',
    };

    updatePayload({
      customUoms: [...(payload.customUoms || []), newCustomUom],
      selectedUomCodes: [...(payload.selectedUomCodes || []), uomCode],
    });

    setCustomUomForm({ code: '', name: '', symbol: '' });
    setShowCustomUomModal(false);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Setup & Onboarding"
      subtitle="Complete 8 quick steps to initialize your enterprise company"
      size="2xl"
    >
      <div className="flex flex-col max-h-[85vh] min-h-[520px]">
        {/* Top Header Bar & Progress Indicator */}
        <div className="px-4 sm:px-6 py-3 border-b border-border/80 bg-muted/30 -mx-6 -mt-6 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[11px] text-muted-foreground font-semibold">
                Step {currentStep} of 8 • {STREAMLINED_STEPS[currentStep - 1]?.desc}
              </span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              ~3 MIN SETUP
            </span>
          </div>

          {/* Stepper Navigation Bar */}
          <div className="mt-3 flex items-center justify-between gap-1 overflow-x-auto pb-1 select-none">
            {STREAMLINED_STEPS.map((step) => {
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const Icon = step.icon;

              return (
                <button
                  key={step.id}
                  disabled={currentStep < step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isPast
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-muted-foreground opacity-60'
                  }`}
                >
                  {isPast ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="p-3 mb-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Success Draft Feedback */}
        {saveDraftFeedback && (
          <div className="p-3 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{saveDraftFeedback}</span>
          </div>
        )}

        {/* Main Step Body */}
        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-6">
          {/* STEP 1: WELCOME */}
          {currentStep === 1 && (
            <div className="max-w-xl mx-auto text-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Let's set up your company
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
                  Complete a few quick steps to get your ERP ready. You can easily configure advanced accounting, custom roles, and workflows later in Settings.
                </p>
              </div>

              {/* Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-sm flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">3–5 Minute Setup</span>
                    <span className="text-[11px] text-muted-foreground block">Only the essential details needed to begin</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-sm flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Multi-Tenant Isolated</span>
                    <span className="text-[11px] text-muted-foreground block">Strict cryptographic tenant data protection</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-sm flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Auto-Generated Ledger</span>
                    <span className="text-[11px] text-muted-foreground block">Automated Chart of Accounts & posting rules</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-sm flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">Customizable Later</span>
                    <span className="text-[11px] text-muted-foreground block">Adjust conversions & settings anytime</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COMPANY INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-bold text-foreground">Company Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter your company name, location, and base ledger currency.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Company Name *</span>
                    <span className="text-[10px] text-muted-foreground">Commercial or Trading Name</span>
                  </label>
                  <Input
                    value={payload.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Al-Bahwan Trading & Contracting LLC"
                    className="mt-1"
                  />
                  {stepErrors.name && <span className="text-[11px] text-destructive font-medium mt-1 block">{stepErrors.name}</span>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block">
                    Legal / Registered Name
                  </label>
                  <Input
                    value={payload.legalName}
                    onChange={(e) => updatePayload({ legalName: e.target.value })}
                    placeholder="Official registered entity name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Company Short Code *</span>
                    <span className="text-[10px] text-primary font-mono font-bold">UPPERCASE</span>
                  </label>
                  <Input
                    value={payload.code}
                    onChange={(e) => updatePayload({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    placeholder="e.g. AL_BAHWAN"
                    className="mt-1 font-mono uppercase"
                  />
                  {stepErrors.code && <span className="text-[11px] text-destructive font-medium mt-1 block">{stepErrors.code}</span>}
                </div>

                <div>
                  <Select
                    label="Country"
                    options={COUNTRY_OPTIONS}
                    value={payload.countryCode}
                    onChange={(e) => updatePayload({ countryCode: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Select
                    label="Base Ledger Currency"
                    options={CURRENCY_OPTIONS}
                    value={payload.baseCurrency}
                    onChange={(e) => updatePayload({ baseCurrency: e.target.value })}
                    required
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Optional Contact Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={payload.city || ''}
                      onChange={(e) => updatePayload({ city: e.target.value })}
                      placeholder="City / Region (e.g. Muscat)"
                    />
                    <Input
                      value={payload.phone || ''}
                      onChange={(e) => updatePayload({ phone: e.target.value })}
                      placeholder="Telephone (e.g. +968 2400 0000)"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUSINESS TYPE */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-bold text-foreground">Business Scope</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tell us what your company sells to tailor your operational modules.
                </p>
              </div>

              {/* Question 1: Selling Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  1. What does your company sell?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSellingType('products')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      sellingType === 'products'
                        ? 'bg-primary/10 border-primary ring-1 ring-primary text-foreground'
                        : 'bg-card border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Package className="w-5 h-5 text-primary mb-2" />
                    <span className="text-xs font-bold block text-foreground">Physical Products</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">Trading, wholesale, retail merchandise</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSellingType('services');
                      setHasPhysicalInventory(false);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      sellingType === 'services'
                        ? 'bg-primary/10 border-primary ring-1 ring-primary text-foreground'
                        : 'bg-card border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Briefcase className="w-5 h-5 text-blue-500 mb-2" />
                    <span className="text-xs font-bold block text-foreground">Services Only</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">Consulting, legal, IT, engineering</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSellingType('both')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      sellingType === 'both'
                        ? 'bg-primary/10 border-primary ring-1 ring-primary text-foreground'
                        : 'bg-card border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers className="w-5 h-5 text-purple-500 mb-2" />
                    <span className="text-xs font-bold block text-foreground">Products + Services</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">Supply & installation, turnkey projects</span>
                  </button>
                </div>
              </div>

              {/* Question 2: Physical Inventory Tracking */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  2. Do you keep and track physical inventory?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHasPhysicalInventory(true)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      hasPhysicalInventory
                        ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-card border-border/80 hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Yes, Track Stock</span>
                      {hasPhysicalInventory && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground block mt-1">
                      Enables Perpetual FIFO inventory, stock movements, and warehouse management.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasPhysicalInventory(false)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      !hasPhysicalInventory
                        ? 'bg-primary/10 border-primary ring-1 ring-primary'
                        : 'bg-card border-border/80 hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">No Physical Inventory</span>
                      {!hasPhysicalInventory && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground block mt-1">
                      Direct pass-through or pure services. Skips warehouse and stock setup.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FINANCIAL BASICS */}
          {currentStep === 4 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-bold text-foreground">Financial & Accounting Basics</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your double-entry general ledger is automatically configured.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-border/70">
                  <span className="text-muted-foreground">Primary Operating Currency</span>
                  <span className="font-bold font-mono text-primary">{payload.baseCurrency}</span>
                </div>

                <div className="flex items-center justify-between text-xs pb-2 border-b border-border/70">
                  <span className="text-muted-foreground">Financial Year Cycle</span>
                  <span className="font-semibold text-foreground">January 01 – December 31 (12 Periods)</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Accounting Recognition Model</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    ACCRUAL BASIS (STANDARD)
                  </span>
                </div>
              </div>

              {/* Automatic Chart of Accounts Notice */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Automatic Double-Entry Posting Setup</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The system will automatically initialize the following standard accounts for your tenant:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-foreground font-medium">
                  <div className="flex items-center gap-1.5">✓ Sales & Revenue</div>
                  <div className="flex items-center gap-1.5">✓ Cost of Goods Sold</div>
                  <div className="flex items-center gap-1.5">✓ Accounts Receivable</div>
                  <div className="flex items-center gap-1.5">✓ Accounts Payable</div>
                  <div className="flex items-center gap-1.5">✓ Bank & Cash Hubs</div>
                  <div className="flex items-center gap-1.5">✓ Tax / Output VAT</div>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                  💡 You can add custom accounts or import an existing Chart of Accounts later in <strong>Settings &gt; Fiscal & Accounting</strong>.
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: INVENTORY & UNITS OF MEASURE */}
          {currentStep === 5 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Units of Measure (UOM)</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setShowCustomUomModal(true)}
                  >
                    Add Custom Unit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select the common measurement units you use to sell and manage products.
                </p>
              </div>

              {/* UOM Category Groups */}
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                {STANDARD_UOM_GROUPS.map((group) => (
                  <div key={group.category} className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {group.title}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {group.units.map((unit) => {
                        const isSelected = (payload.selectedUomCodes || []).includes(unit.code);

                        return (
                          <button
                            key={unit.code}
                            type="button"
                            onClick={() => toggleUom(unit.code)}
                            className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-primary/10 border-primary text-foreground'
                                : 'bg-card border-border/80 hover:bg-muted text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-foreground">{unit.code}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate mt-1">{unit.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Base Unit of Measure Selection */}
              <div className="p-4 rounded-xl bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <span className="text-xs font-bold text-foreground block">Primary Base Unit</span>
                  <span className="text-[11px] text-muted-foreground block">Default unit for single item stock counting</span>
                </div>
                <div className="sm:w-48">
                  <Select
                    options={(payload.selectedUomCodes || ['PCS']).map((c) => ({ value: c, label: c }))}
                    value={payload.defaultStockUom || 'PCS'}
                    onChange={(e) => updatePayload({ defaultStockUom: e.target.value, defaultSalesUom: e.target.value })}
                  />
                </div>
              </div>

              {/* Contextual Examples Note */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground">
                <strong className="text-foreground block mb-1">Simple Multi-Pack Example:</strong>
                <span>
                  Sell individually in <strong>Pieces (PCS)</strong> and buy in <strong>Boxes (BOX)</strong>. Advanced conversion ratios (e.g. 1 Box = 12 Pieces) can be configured later per product in <strong>Settings</strong>.
                </span>
              </div>
            </div>
          )}

          {/* STEP 6: TAX & VAT */}
          {currentStep === 6 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-bold text-foreground">Tax & VAT Registration</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure your sovereign VAT/Tax status and standard compliance rate.
                </p>
              </div>

              {/* VAT Registered Question */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsVatRegistered(true)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isVatRegistered
                      ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                      : 'bg-card border-border/80 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Yes, VAT Registered</span>
                    {isVatRegistered && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Calculate input/output VAT on sales invoices and purchases.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsVatRegistered(false)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    !isVatRegistered
                      ? 'bg-primary/10 border-primary ring-1 ring-primary'
                      : 'bg-card border-border/80 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">No VAT / Tax Exempt</span>
                    {!isVatRegistered && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    All transactions will be posted at 0.00% tax rate.
                  </span>
                </button>
              </div>

              {/* VAT Details Form */}
              {isVatRegistered && (
                <div className="p-4 rounded-xl bg-card border border-border/80 space-y-4 shadow-sm animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block">
                        VAT / Tax Registration Number
                      </label>
                      <Input
                        value={payload.taxIdentifier || ''}
                        onChange={(e) => updatePayload({ taxIdentifier: e.target.value })}
                        placeholder="e.g. OM-VAT-100200300"
                        className="mt-1 font-mono uppercase"
                      />
                    </div>

                    <div>
                      <Select
                        label="Standard Tax Rate (%)"
                        options={TAX_RATE_OPTIONS}
                        value={payload.accountingDefaults?.defaultTaxRatePercent || '5.00'}
                        onChange={(e) => updatePayload({
                          accountingDefaults: {
                            ...payload.accountingDefaults,
                            defaultTaxRatePercent: e.target.value,
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: INITIAL ADMIN USER */}
          {currentStep === 7 && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-bold text-foreground">Primary Administrator Account</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create the initial Company Admin account to manage this organization.
                </p>
              </div>

              <div className="p-4 sm:p-6 rounded-xl bg-card border border-border/80 space-y-4 shadow-sm">
                <div>
                  <label className="text-xs font-semibold text-foreground block">Administrator Full Name *</label>
                  <Input
                    value={payload.initialAdmin?.fullName || ''}
                    onChange={(e) => updatePayload({
                      initialAdmin: { ...payload.initialAdmin, fullName: e.target.value }
                    })}
                    placeholder="e.g. Salim Al-Harthy"
                    className="mt-1"
                  />
                  {stepErrors['admin.fullName'] && (
                    <span className="text-[11px] text-destructive font-medium mt-1 block">{stepErrors['admin.fullName']}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground block">Username / Email *</label>
                    <Input
                      value={payload.initialAdmin?.username || ''}
                      onChange={(e) => updatePayload({
                        initialAdmin: { 
                          ...payload.initialAdmin, 
                          username: e.target.value,
                          email: e.target.value.includes('@') ? e.target.value : `${e.target.value}@${payload.code.toLowerCase()}.om`
                        }
                      })}
                      placeholder="e.g. admin@albahwan.om"
                      className="mt-1 font-mono"
                    />
                    {stepErrors['admin.username'] && (
                      <span className="text-[11px] text-destructive font-medium mt-1 block">{stepErrors['admin.username']}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block">Password *</label>
                    <Input
                      type="password"
                      value={payload.initialAdmin?.password || ''}
                      onChange={(e) => updatePayload({
                        initialAdmin: { ...payload.initialAdmin, password: e.target.value }
                      })}
                      placeholder="Minimum 6 characters"
                      className="mt-1 font-mono"
                    />
                    {stepErrors['admin.password'] && (
                      <span className="text-[11px] text-destructive font-medium mt-1 block">{stepErrors['admin.password']}</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>This user will be assigned the <strong>Company Admin</strong> role with complete governance permissions.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: REVIEW & CREATE COMPANY */}
          {currentStep === 8 && !isCompleted && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-bold text-foreground">Review & Activate Company</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm your settings before provisioning the new enterprise tenant.
                </p>
              </div>

              {/* Summary Sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Company */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between pb-1 border-b border-border/60">
                      <span className="font-bold text-foreground uppercase text-[10px] tracking-wider">Company</span>
                      <button onClick={() => setCurrentStep(2)} className="text-[10px] text-primary hover:underline font-bold">Edit</button>
                    </div>
                    <div className="font-bold text-foreground text-sm mt-1.5">{payload.name}</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">Code: <span className="font-mono font-bold text-foreground">{payload.code}</span></div>
                    <div className="text-muted-foreground text-[11px]">Country: {payload.countryCode} • {payload.baseCurrency}</div>
                  </div>
                </div>

                {/* 2. Business */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between pb-1 border-b border-border/60">
                      <span className="font-bold text-foreground uppercase text-[10px] tracking-wider">Business Model</span>
                      <button onClick={() => setCurrentStep(3)} className="text-[10px] text-primary hover:underline font-bold">Edit</button>
                    </div>
                    <div className="font-semibold text-foreground capitalize mt-1.5">Selling: {sellingType}</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      Inventory: <strong className={hasPhysicalInventory ? 'text-emerald-600' : 'text-muted-foreground'}>{hasPhysicalInventory ? 'Enabled (FIFO)' : 'Disabled'}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Financial & Tax */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between pb-1 border-b border-border/60">
                      <span className="font-bold text-foreground uppercase text-[10px] tracking-wider">Financial & Tax</span>
                      <button onClick={() => setCurrentStep(6)} className="text-[10px] text-primary hover:underline font-bold">Edit</button>
                    </div>
                    <div className="font-semibold text-foreground mt-1.5">Currency: {payload.baseCurrency} (Accrual)</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      VAT: {isVatRegistered ? `Registered (${payload.accountingDefaults?.defaultTaxRatePercent || '5.00'}%)` : 'Not Registered'}
                    </div>
                  </div>
                </div>

                {/* 4. Admin User */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between pb-1 border-b border-border/60">
                      <span className="font-bold text-foreground uppercase text-[10px] tracking-wider">Administrator</span>
                      <button onClick={() => setCurrentStep(7)} className="text-[10px] text-primary hover:underline font-bold">Edit</button>
                    </div>
                    <div className="font-semibold text-foreground mt-1.5">{payload.initialAdmin?.fullName}</div>
                    <div className="text-muted-foreground text-[11px] font-mono mt-0.5">{payload.initialAdmin?.username}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* POST-ONBOARDING SUCCESS SCREEN */}
          {isCompleted && (
            <div className="max-w-xl mx-auto text-center space-y-6 py-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  Your Company is Ready!
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                  <strong className="text-foreground">{payload.name}</strong> has been successfully initialized with double-entry accounting, tenant isolation, and administrative governance.
                </p>
              </div>

              {/* Quick Setup Recommendations */}
              <div className="p-4 rounded-xl bg-card border border-border/80 text-left space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Recommended Next Steps
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span>Create first Sales Quotation</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-500" />
                    <span>Add Suppliers & POs</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-500" />
                    <span>Connect Operating Bank</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>Invite Team Members</span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={onClose}
                className="w-full sm:w-auto px-8"
              >
                Go to ERP Dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Actions Footer */}
        {!isCompleted && (
          <div className="px-6 py-4 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-3 -mx-6 -mb-6 mt-4">
            <div>
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
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={handleSaveDraft}
                title="Save Draft & Continue Later"
              >
                Save Draft
              </Button>

              {currentStep < 8 ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleNext}
                >
                  {currentStep === 1 ? 'Get Started' : 'Next Step'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleCreateCompany}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Company...' : 'Create Company'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom UOM Modal */}
      {showCustomUomModal && (
        <Modal
          isOpen={showCustomUomModal}
          onClose={() => setShowCustomUomModal(false)}
          title="Add Custom Unit of Measure"
          size="sm"
        >
          <form onSubmit={handleAddCustomUom} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block">Unit Code (e.g. BUNDLE) *</label>
              <Input
                value={customUomForm.code}
                onChange={(e) => setCustomUomForm({ ...customUomForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. BDL"
                className="mt-1 font-mono uppercase"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block">Display Name *</label>
              <Input
                value={customUomForm.name}
                onChange={(e) => setCustomUomForm({ ...customUomForm, name: e.target.value })}
                placeholder="e.g. Bundle / Bale"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block">Short Symbol</label>
              <Input
                value={customUomForm.symbol}
                onChange={(e) => setCustomUomForm({ ...customUomForm, symbol: e.target.value })}
                placeholder="e.g. bdl"
                className="mt-1 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setShowCustomUomModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Add Unit
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
