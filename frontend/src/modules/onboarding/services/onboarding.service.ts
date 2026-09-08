// ============================================================================
// Enterprise Company Onboarding & Business Configuration Service (Phase 15)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { 
  FullCompanyOnboardingPayload, 
  DbOnboardingDraft, 
  DbCompany, 
  DbUser, 
  DbCompanyProfile 
} from '@/database/types';

export interface StepValidationError {
  field?: string;
  message: string;
  severity?: 'error' | 'warning';
}

export interface StepValidationResult extends Array<StepValidationError> {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class OnboardingService {
  /**
   * Returns default initial onboarding payload template
   */
  public getDefaultOnboardingPayload(): FullCompanyOnboardingPayload {
    return {
      name: '',
      legalName: '',
      code: '',
      registrationNumber: '',
      taxIdentifier: '',
      countryCode: 'US',
      stateProvince: '',
      city: '',
      addressLine1: '',
      postalCode: '',
      phone: '',
      email: '',
      website: '',
      baseCurrency: 'USD',
      timeZone: 'UTC',
      fiscalYearStartMonth: 1,
      defaultLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      tier: 'enterprise',

      businessTypes: ['trading'],
      sellingCategories: ['physical_products', 'services'],
      buyingCategories: ['finished_goods', 'services'],

      selectedUomCodes: ['PCS', 'BOX', 'CARTON', 'KG', 'METER', 'HOUR', 'JOB'],
      customUoms: [],
      uomConversions: [
        { fromUomCode: 'BOX', toUomCode: 'PCS', multiplier: '12.0000' },
        { fromUomCode: 'CARTON', toUomCode: 'PCS', multiplier: '24.0000' },
      ],
      defaultPurchaseUom: 'CARTON',
      defaultStockUom: 'PCS',
      defaultSalesUom: 'PCS',

      inventoryConfig: {
        maintainsInventory: true,
        allowNegativeStock: false,
        enableMultipleWarehouses: true,
        enableStorageLocations: true,
        enableStockTransfers: true,
        enableStockCount: true,
        enableStockAdjustments: true,
        enableBatchLotTracking: true,
        enableSerialNumberTracking: true,
        enableExpiryDateTracking: true,
        enableBarcodeSku: true,
        enableReorderLevelAlerts: true,
        defaultCostingMethod: 'WEIGHTED_AVG',
      },
      selectedAttributes: ['brand', 'model', 'size', 'color'],
      customAttributes: [],
      warehouses: [
        { code: 'WH-MAIN', name: 'Main Distribution Warehouse', address: 'Headquarters Logistics Hub', isDefault: true },
      ],

      salesWorkflow: {
        enableQuotation: true,
        enableSalesOrder: true,
        enableSalesInvoice: true,
        enableDeliveryNote: true,
        enableCustomerPayment: true,
        enableCreditNote: true,
        enableDebitNote: true,
        enableDiscounts: true,
        enableSalesCommission: false,
        enableCustomerCreditLimit: true,
        enablePartialPayments: true,
        enablePaymentProofVerification: true, // 2-Step Verification mandatory
      },

      purchaseWorkflow: {
        enablePurchaseRequest: true,
        enableRfq: true,
        enableSupplierQuotation: true,
        enablePurchaseOrder: true,
        enableGoodsReceipt: true,
        enableServiceReceipt: true,
        enableSupplierBill: true,
        enableThreeWayMatch: true,
        enableSupplierPayment: true,
        enablePurchaseCreditNote: true,
        enablePurchaseDebitNote: true,
      },

      accountingDefaults: {
        defaultRevenueAccountId: '#4010',
        defaultExpenseAccountId: '#6080',
        defaultInventoryAccountId: '#1300',
        defaultArControlAccountId: '#1200',
        defaultApControlAccountId: '#2010',
        defaultOutputTaxAccountId: '#2200',
        defaultInputTaxAccountId: '#1450',
        defaultCogsAccountId: '#5010',
        defaultFixedAssetAccountId: '#1510',
        defaultPayrollAccountId: '#2300',
        defaultBankAccountId: '#1010',
        defaultCashAccountId: '#1020',
        enableMultiCurrency: true,
        enableTaxVat: true,
        taxRegistrationNumber: '',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '5.00',
      },

      branches: [
        { code: 'HQ', name: 'Corporate Headquarters', city: 'Primary Hub', isHeadquarters: true },
      ],
      departments: [
        { code: 'OPS', name: 'Operations & Supply Chain', description: 'Core business operations' },
        { code: 'FIN', name: 'Finance & Accounting', description: 'General ledger and fiscal control' },
        { code: 'SALES', name: 'Commercial Sales', description: 'Client acquisition & sales' },
      ],
      costCenters: [
        { code: 'CC-HQ', name: 'Corporate HQ Administrative Center' },
        { code: 'CC-OPS', name: 'Supply Chain & Operations' },
      ],

      selectedRoles: ['COMPANY_ADMIN', 'ACCOUNTANT', 'SALES_USER', 'PURCHASE_USER', 'WAREHOUSE_MANAGER'],
      designations: [
        { code: 'DES-ADM', name: 'Company Administrator', description: 'Primary Administrative & Management Lead' },
        { code: 'DES-ACC', name: 'Senior Accountant', description: 'General ledger and fiscal control' },
        { code: 'DES-SE', name: 'Sales Executive', description: 'Client acquisition & sales' },
        { code: 'DES-WS', name: 'Warehouse Supervisor', description: 'Inventory management & stock movement' },
        { code: 'DES-HRO', name: 'HR Officer', description: 'Human resources and payroll administration' },
      ],
      initialAdmin: {
        fullName: '',
        username: '',
        password: '',
        email: '',
        phone: '',
      },

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
    };
  }

  /**
   * Validates a specific step in the wizard
   */
  public static validateStep(stepIndex: number, payload: Partial<FullCompanyOnboardingPayload>): StepValidationResult {
    const errorItems: StepValidationError[] = [];
    const warningItems: StepValidationError[] = [];

    switch (stepIndex) {
      case 1: // Company Info
        if (!payload.name?.trim()) {
          errorItems.push({ field: 'name', message: 'Legal Company Name is required.', severity: 'error' });
        }
        if (!payload.code?.trim()) {
          errorItems.push({ field: 'code', message: 'Company Short Code is required.', severity: 'error' });
        } else if (payload.code.trim().length < 2) {
          errorItems.push({ field: 'code', message: 'Company Code must be at least 2 characters.', severity: 'error' });
        }
        if (!payload.baseCurrency) {
          errorItems.push({ field: 'baseCurrency', message: 'Base Currency is required.', severity: 'error' });
        }
        if (!payload.countryCode) {
          errorItems.push({ field: 'countryCode', message: 'Country is required.', severity: 'error' });
        }
        break;

      case 2: // Business Types
        if (!payload.businessTypes || payload.businessTypes.length === 0) {
          errorItems.push({ field: 'businessTypes', message: 'Please select at least one primary Business Type.', severity: 'error' });
        }
        break;

      case 3: // Products & Services
        if (!payload.sellingCategories || payload.sellingCategories.length === 0) {
          errorItems.push({ field: 'sellingCategories', message: 'Please specify what the company sells.', severity: 'error' });
        }
        if (!payload.buyingCategories || payload.buyingCategories.length === 0) {
          errorItems.push({ field: 'buyingCategories', message: 'Please specify what the company purchases.', severity: 'error' });
        }
        break;

      case 4: // Units of Measure
        if (payload.inventoryConfig?.maintainsInventory) {
          if (!payload.selectedUomCodes || payload.selectedUomCodes.length === 0) {
            errorItems.push({ field: 'selectedUomCodes', message: 'Please select at least one Unit of Measure (UOM).', severity: 'error' });
          }
          if (payload.uomConversions) {
            for (const conv of payload.uomConversions) {
              const mult = parseFloat(conv.multiplier);
              if (isNaN(mult) || mult <= 0) {
                errorItems.push({ field: 'uomConversions', message: `Invalid conversion multiplier for ${conv.fromUomCode} -> ${conv.toUomCode}: must be > 0.`, severity: 'error' });
              }
            }
          }
        }
        break;

      case 5: // Inventory & Warehouse
        if (payload.inventoryConfig?.maintainsInventory) {
          if (!payload.warehouses || payload.warehouses.length === 0) {
            errorItems.push({ field: 'warehouses', message: 'At least one warehouse is required when inventory tracking is enabled.', severity: 'error' });
          }
        }
        break;

      case 6: // Sales Configuration
        if (!payload.salesWorkflow?.enablePaymentProofVerification) {
          warningItems.push({ field: 'salesWorkflow', message: 'Warning: Disabling payment proof verification bypasses 2-step approval.', severity: 'warning' });
        }
        break;

      case 7: // Purchase Configuration
        break;

      case 8: // Accounting & Tax
        if (payload.accountingDefaults?.enableTaxVat) {
          if (!payload.accountingDefaults.taxRegistrationNumber?.trim()) {
            warningItems.push({ field: 'taxRegistrationNumber', message: 'Tax/VAT registration number is recommended for VAT-enabled organizations.', severity: 'warning' });
          }
        }
        break;

      case 9: // Organizational Structure
        if (!payload.branches || payload.branches.length === 0) {
          errorItems.push({ field: 'branches', message: 'At least one branch (Headquarters) is required.', severity: 'error' });
        }
        break;

      case 10: // Roles & Initial Admin
        if (!payload.initialAdmin?.fullName?.trim()) {
          errorItems.push({ field: 'initialAdmin.fullName', message: 'Initial Admin Full Name is required.', severity: 'error' });
        }
        if (!payload.initialAdmin?.username?.trim()) {
          errorItems.push({ field: 'initialAdmin.username', message: 'Initial Admin Username is required.', severity: 'error' });
        }
        break;

      case 11: // Modules & Entitlements
        if (!payload.enabledModuleKeys || payload.enabledModuleKeys.length === 0) {
          errorItems.push({ field: 'enabledModuleKeys', message: 'At least one module must be enabled.', severity: 'error' });
        }
        break;

      case 12: // Final Review
        for (let s = 1; s <= 11; s++) {
          const stepRes = OnboardingService.validateStep(s, payload);
          errorItems.push(...stepRes);
        }
        break;
    }

    const result = [...errorItems] as StepValidationResult;
    result.isValid = errorItems.length === 0;
    result.errors = errorItems.map((e) => e.message);
    result.warnings = warningItems.map((w) => w.message);
    return result;
  }

  public validateStep(stepIndex: number, payload: Partial<FullCompanyOnboardingPayload>): StepValidationResult {
    return OnboardingService.validateStep(stepIndex, payload);
  }

  /**
   * Saves or updates an in-progress onboarding draft session
   */
  public saveDraft(
    currentStep: number,
    payload: FullCompanyOnboardingPayload,
    draftId?: string,
    createdById: string = 'super-admin'
  ): DbOnboardingDraft {
    const draftName = payload.name?.trim() ? `${payload.name.trim()} (Draft Setup)` : 'Untitled Company Draft';
    return db.saveOnboardingDraft({
      id: draftId,
      draftName,
      currentStep,
      payload,
      createdById,
    });
  }

  /**
   * Retrieves all saved onboarding drafts
   */
  public getDrafts(createdById?: string): DbOnboardingDraft[] {
    return db.getOnboardingDrafts(createdById);
  }

  /**
   * Deletes an onboarding draft
   */
  public deleteDraft(draftId: string): boolean {
    return db.deleteOnboardingDraft(draftId);
  }

  /**
   * Executes atomic activation of a new customer company
   */
  public activateCompany(
    payload: FullCompanyOnboardingPayload,
    adminUserId: string,
    ctx: TenantContext
  ): { company: DbCompany; adminUser: DbUser; profile: DbCompanyProfile } {
    // 1. Full payload validation
    const reviewResult = this.validateStep(12, payload);
    if (!reviewResult.isValid) {
      throw new Error(`Company Onboarding Validation Failed: ${reviewResult.errors.join(' | ')}`);
    }

    // 2. Execute atomic initialization in database engine
    const result = db.createCompanyWithFullOnboarding(payload, adminUserId, ctx);

    return result;
  }
}

export const onboardingService = new OnboardingService();
export const OnboardingValidationService = OnboardingService;
