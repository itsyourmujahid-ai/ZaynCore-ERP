// ============================================================================
// Phase 15: Company Onboarding & Business Configuration System Test Suite
// Comprehensive Verification of Multi-Step Onboarding, Dynamic Business
// Configuration, UOM Conversion Engine, Role Recommendations, and Multi-Tenant Isolation.
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { UomConversionEngine } from '../../src/modules/onboarding/services/uom-conversion.service';
import { RoleRecommendationService } from '../../src/modules/onboarding/services/role-recommendation.service';
import { OnboardingValidationService } from '../../src/modules/onboarding/services/onboarding.service';
import { capabilityService } from '../../src/modules/capabilities/services/capability-service';
import { 
  FullCompanyOnboardingPayload, 
  DbUomConversion
} from '../../src/database/types';
import { TenantViolationError } from '../../src/core/errors/DomainErrors';

describe('Phase 15: Company Onboarding & Business Configuration System', () => {
  let superAdminCtx: TenantContext;
  let regularUserCtx: TenantContext;

  before(() => {
    superAdminCtx = {
      companyId: 'company-vvip',
      companyName: 'Platform Global Management',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      userId: 'user-super-admin',
      userEmail: 'vvip.superadmin@erp-platform.internal',
      userFullName: 'VVIP Super Admin',
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
      isPlatformAdmin: true,
    };

    regularUserCtx = {
      companyId: 'company-regular',
      companyName: 'Standard Tenant Org',
      companyTier: 'medium',
      baseCurrency: 'USD',
      userId: 'user-regular',
      userEmail: 'regular.user@tenant.com',
      userFullName: 'Regular Tenant User',
      roles: ['ACCOUNTANT'],
      permissions: ['read:gl', 'write:journal'],
      isPlatformAdmin: false,
    };
  });

  // ==========================================================================
  // 1. Validation & Draft Engine Tests
  // ==========================================================================
  describe('1. Onboarding Validation & Draft Engine', () => {
    test('Should reject onboarding payload when company name or code is missing', () => {
      const invalidPayload: Partial<FullCompanyOnboardingPayload> = {
        name: '',
        code: '',
        tier: 'enterprise',
      };

      const errors = OnboardingValidationService.validateStep(1, invalidPayload as any);
      assert.ok(errors.length > 0, 'Should have validation errors for missing company info');
      assert.ok(errors.some((e) => e.field === 'name'), 'Should flag missing company name');
      assert.ok(errors.some((e) => e.field === 'code'), 'Should flag missing company code');
    });

    test('Should reject invalid or duplicate company short code during direct provisioning', () => {
      const payload: FullCompanyOnboardingPayload = {
        name: 'Alpha Test Corp',
        legalName: 'Alpha Test Corp LLC',
        code: 'ALPHA_TEST_1',
        countryCode: 'US',
        baseCurrency: 'USD',
        timeZone: 'America/New_York',
        fiscalYearStartMonth: 1,
        defaultLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        numberFormat: '1,234.56',
        tier: 'enterprise',
        businessTypes: ['trading'],
        sellingCategories: ['physical_products'],
        buyingCategories: ['finished_goods'],
        selectedUomCodes: ['PCS', 'BOX'],
        inventoryConfig: {
          maintainsInventory: true,
          allowNegativeStock: false,
          enableMultipleWarehouses: false,
          enableStorageLocations: false,
          enableStockTransfers: false,
          enableStockCount: true,
          enableStockAdjustments: true,
          enableBatchLotTracking: false,
          enableSerialNumberTracking: false,
          enableExpiryDateTracking: false,
          enableBarcodeSku: true,
          enableReorderLevelAlerts: true,
          defaultCostingMethod: 'FIFO',
        },
        selectedAttributes: ['brand', 'size'],
        salesWorkflow: {
          enableQuotation: true,
          enableSalesOrder: true,
          enableSalesInvoice: true,
          enableDeliveryNote: true,
          enableCustomerPayment: true,
          enableCreditNote: true,
          enableDebitNote: false,
          enableDiscounts: true,
          enableSalesCommission: false,
          enableCustomerCreditLimit: true,
          enablePartialPayments: true,
          enablePaymentProofVerification: true,
        },
        purchaseWorkflow: {
          enablePurchaseRequest: true,
          enableRfq: false,
          enableSupplierQuotation: false,
          enablePurchaseOrder: true,
          enableGoodsReceipt: true,
          enableServiceReceipt: false,
          enableSupplierBill: true,
          enableThreeWayMatch: true,
          enableSupplierPayment: true,
          enablePurchaseCreditNote: true,
          enablePurchaseDebitNote: false,
        },
        accountingDefaults: {
          enableMultiCurrency: true,
          enableTaxVat: true,
          taxInclusivePricing: false,
          defaultTaxRatePercent: '5.00',
        },
        selectedRoles: ['COMPANY_ADMIN', 'ACCOUNTANT'],
        initialAdmin: {
          fullName: 'Alpha Admin',
          username: 'alpha.admin',
          email: 'admin@alphatest.com',
        },
        enabledModuleKeys: ['financial_accounting', 'sales', 'accounts_payable', 'inventory'],
      };

      // Provision first time
      const result = db.createCompanyWithFullOnboarding(payload, superAdminCtx.userId, superAdminCtx);
      assert.ok(result.company.id, 'Company should be provisioned');
      assert.strictEqual(result.company.code, 'ALPHA_TEST_1');

      // Second time with identical code must throw error
      assert.throws(
        () => {
          db.createCompanyWithFullOnboarding(payload, superAdminCtx.userId, superAdminCtx);
        },
        /already registered/i,
        'Should reject duplicate company short code'
      );
    });

    test('Should save, retrieve, update and delete onboarding drafts', () => {
      const draftPayload: FullCompanyOnboardingPayload = {
        name: 'Draft Corp Exploration',
        legalName: 'Draft Corp LLC',
        code: 'DRAFT_CORP',
        countryCode: 'GB',
        baseCurrency: 'GBP',
        timeZone: 'Europe/London',
        fiscalYearStartMonth: 4,
        defaultLanguage: 'en',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: '1,234.56',
        tier: 'medium',
        businessTypes: ['services'],
        sellingCategories: ['services', 'projects'],
        buyingCategories: ['services', 'consumables'],
        selectedUomCodes: ['HOUR', 'DAY'],
        inventoryConfig: {
          maintainsInventory: false,
          allowNegativeStock: false,
          enableMultipleWarehouses: false,
          enableStorageLocations: false,
          enableStockTransfers: false,
          enableStockCount: false,
          enableStockAdjustments: false,
          enableBatchLotTracking: false,
          enableSerialNumberTracking: false,
          enableExpiryDateTracking: false,
          enableBarcodeSku: false,
          enableReorderLevelAlerts: false,
          defaultCostingMethod: 'FIFO',
        },
        selectedAttributes: [],
        salesWorkflow: {
          enableQuotation: true,
          enableSalesOrder: false,
          enableSalesInvoice: true,
          enableDeliveryNote: false,
          enableCustomerPayment: true,
          enableCreditNote: true,
          enableDebitNote: false,
          enableDiscounts: false,
          enableSalesCommission: false,
          enableCustomerCreditLimit: false,
          enablePartialPayments: true,
          enablePaymentProofVerification: false,
        },
        purchaseWorkflow: {
          enablePurchaseRequest: false,
          enableRfq: false,
          enableSupplierQuotation: false,
          enablePurchaseOrder: false,
          enableGoodsReceipt: false,
          enableServiceReceipt: true,
          enableSupplierBill: true,
          enableThreeWayMatch: false,
          enableSupplierPayment: true,
          enablePurchaseCreditNote: false,
          enablePurchaseDebitNote: false,
        },
        accountingDefaults: {
          enableMultiCurrency: true,
          enableTaxVat: true,
          defaultTaxRatePercent: '20.00',
          taxInclusivePricing: false,
        },
        selectedRoles: ['COMPANY_ADMIN', 'CONSULTANT'],
        initialAdmin: {
          fullName: 'Draft Admin',
          username: 'draft.admin',
          email: 'admin@draftcorp.co.uk',
        },
        enabledModuleKeys: ['financial_accounting', 'sales', 'projects'],
      };

      // Save draft
      const savedDraft = db.saveOnboardingDraft({
        draftName: 'Draft Corp Setup Session',
        currentStep: 4,
        payload: draftPayload,
        createdById: superAdminCtx.userId,
      });

      assert.ok(savedDraft.id, 'Saved draft must receive unique ID');
      assert.strictEqual(savedDraft.currentStep, 4);
      assert.strictEqual(savedDraft.payload.name, 'Draft Corp Exploration');

      // Retrieve draft by ID
      const retrieved = db.getOnboardingDraftById(savedDraft.id);
      assert.ok(retrieved, 'Draft should be retrievable by ID');
      assert.strictEqual(retrieved.draftName, 'Draft Corp Setup Session');

      // Update draft step
      const updated = db.saveOnboardingDraft({
        id: savedDraft.id,
        draftName: 'Draft Corp Setup Session - Advanced',
        currentStep: 7,
        payload: draftPayload,
        createdById: superAdminCtx.userId,
      });
      assert.strictEqual(updated.currentStep, 7);
      assert.strictEqual(updated.draftName, 'Draft Corp Setup Session - Advanced');

      // Delete draft
      const deleted = db.deleteOnboardingDraft(savedDraft.id);
      assert.strictEqual(deleted, true);
      assert.strictEqual(db.getOnboardingDraftById(savedDraft.id), undefined);
    });

    test('Non-Super Admin cannot invoke createCompanyWithFullOnboarding', () => {
      const payload = {
        name: 'Unauthorized Corp',
        code: 'UNAUTH_1',
      } as any;

      assert.throws(
        () => {
          db.createCompanyWithFullOnboarding(payload, regularUserCtx.userId, regularUserCtx);
        },
        TenantViolationError,
        'Regular user must be blocked with TenantViolationError'
      );
    });
  });

  // ==========================================================================
  // 2. UOM Conversion Calculation Engine Tests
  // ==========================================================================
  describe('2. UOM Conversion Calculation Engine', () => {
    const mockConversions: DbUomConversion[] = [
      {
        id: 'c-1',
        companyId: 'comp-uom-test',
        fromUomId: 'uom-box',
        fromUomCode: 'BOX',
        toUomId: 'uom-pcs',
        toUomCode: 'PCS',
        multiplier: '10.0000', // 1 BOX = 10 PCS
        precision: 4,
        isStandard: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c-2',
        companyId: 'comp-uom-test',
        fromUomId: 'uom-carton',
        fromUomCode: 'CARTON',
        toUomId: 'uom-box',
        toUomCode: 'BOX',
        multiplier: '12.0000', // 1 CARTON = 12 BOX
        precision: 4,
        isStandard: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c-3',
        companyId: 'comp-uom-test',
        fromUomId: 'uom-pallet',
        fromUomCode: 'PALLET',
        toUomId: 'uom-carton',
        toUomCode: 'CARTON',
        multiplier: '20.0000', // 1 PALLET = 20 CARTON
        precision: 4,
        isStandard: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c-4',
        companyId: 'comp-uom-test',
        fromUomId: 'uom-ton',
        fromUomCode: 'TON',
        toUomId: 'uom-kg',
        toUomCode: 'KG',
        multiplier: '1000.0000', // 1 TON = 1000 KG
        precision: 4,
        isStandard: true,
        createdAt: new Date().toISOString(),
      },
    ];

    test('Identity Conversion: Same source and target UOM', () => {
      const res = UomConversionEngine.convert(25, 'PCS', 'PCS', mockConversions);
      assert.strictEqual(res.convertedQuantity, 25);
      assert.strictEqual(res.effectiveMultiplier, 1);
      assert.strictEqual(res.path.length, 1);
    });

    test('Direct Single-Step Conversion: 1 BOX -> 10 PCS', () => {
      const res = UomConversionEngine.convert(5, 'BOX', 'PCS', mockConversions);
      assert.strictEqual(res.convertedQuantity, 50);
      assert.strictEqual(res.effectiveMultiplier, 10);
    });

    test('Inverse Single-Step Conversion: 50 PCS -> 5 BOX', () => {
      const res = UomConversionEngine.convert(50, 'PCS', 'BOX', mockConversions);
      assert.strictEqual(res.convertedQuantity, 5);
      assert.strictEqual(res.effectiveMultiplier, 0.1);
    });

    test('Multi-Step Transitive Conversion: 2 CARTON -> 24 BOX -> 240 PCS', () => {
      const res = UomConversionEngine.convert(2, 'CARTON', 'PCS', mockConversions);
      assert.strictEqual(res.convertedQuantity, 240);
      assert.strictEqual(res.effectiveMultiplier, 120);
      assert.deepStrictEqual(res.path, ['CARTON', 'BOX', 'PCS']);
    });

    test('Multi-Step Inverse Conversion: 240 PCS -> 24 BOX -> 2 CARTON', () => {
      const res = UomConversionEngine.convert(240, 'PCS', 'CARTON', mockConversions);
      assert.strictEqual(res.convertedQuantity, 2);
      assert.strictEqual(res.effectiveMultiplier, 1 / 120);
    });

    test('Deep Multi-Tier Transitive Conversion: 1 PALLET -> 20 CARTON -> 240 BOX -> 2400 PCS', () => {
      const res = UomConversionEngine.convert(1, 'PALLET', 'PCS', mockConversions);
      assert.strictEqual(res.convertedQuantity, 2400);
      assert.strictEqual(res.effectiveMultiplier, 2400);
      assert.deepStrictEqual(res.path, ['PALLET', 'CARTON', 'BOX', 'PCS']);
    });

    test('Should throw error when no conversion path exists between disconnected units', () => {
      assert.throws(
        () => {
          UomConversionEngine.convert(10, 'PALLET', 'KG', mockConversions);
        },
        /No conversion path found/i,
        'Cannot convert from PALLET to KG without a defined conversion rule'
      );
    });

    test('Should throw error on non-positive input quantity or zero multiplier', () => {
      assert.throws(
        () => {
          UomConversionEngine.convert(-5, 'BOX', 'PCS', mockConversions);
        },
        /Quantity must be a positive number/i
      );

      const invalidConversions: DbUomConversion[] = [
        {
          id: 'bad-1',
          companyId: 'comp-1',
          fromUomId: 'u1',
          fromUomCode: 'BAG',
          toUomId: 'u2',
          toUomCode: 'KG',
          multiplier: '0',
          precision: 4,
          isStandard: true,
          createdAt: new Date().toISOString(),
        },
      ];

      assert.throws(
        () => {
          UomConversionEngine.convert(10, 'BAG', 'KG', invalidConversions);
        },
        /No conversion path found/i
      );
    });

    test('Conversion Graph Circularity Prevention', () => {
      const cyclicConversions: DbUomConversion[] = [
        {
          id: 'c-c1',
          companyId: 'comp-c',
          fromUomId: 'u1',
          fromUomCode: 'A',
          toUomId: 'u2',
          toUomCode: 'B',
          multiplier: '2',
          precision: 4,
          isStandard: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c-c2',
          companyId: 'comp-c',
          fromUomId: 'u2',
          fromUomCode: 'B',
          toUomId: 'u3',
          toUomCode: 'C',
          multiplier: '2',
          precision: 4,
          isStandard: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c-c3',
          companyId: 'comp-c',
          fromUomId: 'u3',
          fromUomCode: 'C',
          toUomId: 'u1',
          toUomCode: 'A',
          multiplier: '0.25',
          precision: 4,
          isStandard: true,
          createdAt: new Date().toISOString(),
        },
      ];

      // Converting A to C traverses BFS shortest path safely without infinite looping
      const res = UomConversionEngine.convert(10, 'A', 'C', cyclicConversions);
      assert.strictEqual(res.convertedQuantity, 40);
      assert.deepStrictEqual(res.path, ['A', 'C']);
    });
  });

  // ==========================================================================
  // 3. Dynamic Role Recommendation Engine Tests
  // ==========================================================================
  describe('3. Role Recommendation Engine', () => {
    test('Trading Business recommends inventory, sales, purchase, and accounting roles', () => {
      const roles = RoleRecommendationService.getRecommendedRoles({
        businessTypes: ['trading'],
        sellingCategories: ['physical_products'],
        buyingCategories: ['finished_goods'],
        hasInventory: true,
        hasPayroll: false,
        hasProjects: false,
        hasManufacturing: false,
        hasAssets: true,
      });

      const roleKeys = roles.map((r) => r.roleKey);
      assert.ok(roleKeys.includes('COMPANY_ADMIN'), 'Must include COMPANY_ADMIN');
      assert.ok(roleKeys.includes('ACCOUNTANT'), 'Must include ACCOUNTANT');
      assert.ok(roleKeys.includes('SALES_USER') || roleKeys.includes('SALES_MANAGER'), 'Must include Sales role');
      assert.ok(roleKeys.includes('PURCHASE_USER') || roleKeys.includes('PURCHASE_MANAGER'), 'Must include Purchase role');
      assert.ok(roleKeys.includes('WAREHOUSE_MANAGER') || roleKeys.includes('INVENTORY_CONTROLLER'), 'Must include Warehouse role');
      assert.ok(!roleKeys.includes('PROJECT_MANAGER'), 'Should NOT include Project Manager for pure Trading');
      assert.ok(!roleKeys.includes('PRODUCTION_MANAGER'), 'Should NOT include Production Manager for pure Trading');
    });

    test('Services Business recommends consulting, project management, and billing roles without warehouse roles', () => {
      const roles = RoleRecommendationService.getRecommendedRoles({
        businessTypes: ['services'],
        sellingCategories: ['services', 'projects'],
        buyingCategories: ['consumables', 'services'],
        hasInventory: false,
        hasPayroll: true,
        hasProjects: true,
        hasManufacturing: false,
        hasAssets: false,
      });

      const roleKeys = roles.map((r) => r.roleKey);
      assert.ok(roleKeys.includes('COMPANY_ADMIN'), 'Must include COMPANY_ADMIN');
      assert.ok(roleKeys.includes('PROJECT_MANAGER'), 'Must include PROJECT_MANAGER');
      assert.ok(roleKeys.includes('PAYROLL_MANAGER'), 'Must include PAYROLL_MANAGER when payroll enabled');
      assert.ok(!roleKeys.includes('WAREHOUSE_MANAGER'), 'Should NOT include WAREHOUSE_MANAGER for non-inventory services');
      assert.ok(!roleKeys.includes('INVENTORY_CONTROLLER'), 'Should NOT include INVENTORY_CONTROLLER');
    });

    test('Manufacturing Business recommends production, plant management, quality, and full accounting roles', () => {
      const roles = RoleRecommendationService.getRecommendedRoles({
        businessTypes: ['manufacturing'],
        sellingCategories: ['finished_goods', 'physical_products'],
        buyingCategories: ['raw_materials', 'equipment_capital_goods'],
        hasInventory: true,
        hasPayroll: true,
        hasProjects: false,
        hasManufacturing: true,
        hasAssets: true,
      });

      const roleKeys = roles.map((r) => r.roleKey);
      assert.ok(roleKeys.includes('PRODUCTION_MANAGER'), 'Must include PRODUCTION_MANAGER');
      assert.ok(roleKeys.includes('WAREHOUSE_MANAGER'), 'Must include WAREHOUSE_MANAGER');
      assert.ok(roleKeys.includes('FIXED_ASSET_MANAGER'), 'Must include FIXED_ASSET_MANAGER');
    });
  });

  // ==========================================================================
  // 4. Acceptance Scenario Company A: Trading & Distribution Enterprise
  // ==========================================================================
  describe('4. Acceptance Scenario Company A — Trading & Distribution (Al-Baraka Trading LLC)', () => {
    let companyAId: string;
    let companyAdminUser: any;
    let companyProfile: any;

    test('Atomic Provisioning of Company A with full trading profile', () => {
      const payload: FullCompanyOnboardingPayload = {
        name: 'Al-Baraka Trading LLC',
        legalName: 'Al-Baraka Trading LLC (Commercial Entity)',
        code: 'BARAKA_TRD',
        countryCode: 'OM',
        baseCurrency: 'OMR',
        timeZone: 'Asia/Muscat',
        fiscalYearStartMonth: 1,
        defaultLanguage: 'en',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: '1,234.56',
        tier: 'medium',
        businessTypes: ['trading', 'wholesale'],
        sellingCategories: ['physical_products', 'spare_parts'],
        buyingCategories: ['finished_goods', 'spare_parts', 'consumables'],
        selectedUomCodes: ['PCS', 'BOX', 'CARTON'],
        uomConversions: [
          { fromUomCode: 'BOX', toUomCode: 'PCS', multiplier: '10.0000' },
          { fromUomCode: 'CARTON', toUomCode: 'BOX', multiplier: '12.0000' },
        ],
        inventoryConfig: {
          maintainsInventory: true,
          allowNegativeStock: false,
          enableMultipleWarehouses: true,
          enableStorageLocations: true,
          enableStockTransfers: true,
          enableStockCount: true,
          enableStockAdjustments: true,
          enableBatchLotTracking: false,
          enableSerialNumberTracking: false,
          enableExpiryDateTracking: false,
          enableBarcodeSku: true,
          enableReorderLevelAlerts: true,
          defaultCostingMethod: 'FIFO',
        },
        selectedAttributes: ['brand', 'size', 'color'],
        warehouses: [
          { code: 'WH-MAIN', name: 'Main Distribution Hub', isDefault: true },
          { code: 'WH-SPARE', name: 'Spare Parts Staging Warehouse', isDefault: false },
        ],
        salesWorkflow: {
          enableQuotation: true,
          enableSalesOrder: true,
          enableSalesInvoice: true,
          enableDeliveryNote: true,
          enableCustomerPayment: true,
          enableCreditNote: true,
          enableDebitNote: false,
          enableDiscounts: true,
          enableSalesCommission: false,
          enableCustomerCreditLimit: true,
          enablePartialPayments: true,
          enablePaymentProofVerification: true,
        },
        purchaseWorkflow: {
          enablePurchaseRequest: true,
          enableRfq: true,
          enableSupplierQuotation: true,
          enablePurchaseOrder: true,
          enableGoodsReceipt: true,
          enableServiceReceipt: false,
          enableSupplierBill: true,
          enableThreeWayMatch: true,
          enableSupplierPayment: true,
          enablePurchaseCreditNote: true,
          enablePurchaseDebitNote: false,
        },
        accountingDefaults: {
          enableMultiCurrency: true,
          enableTaxVat: true,
          taxRegistrationNumber: 'OM-VAT-10029911',
          taxInclusivePricing: false,
          defaultTaxRatePercent: '5.00',
        },
        branches: [
          { code: 'HQ', name: 'Muscat Corporate HQ', isHeadquarters: true, city: 'Muscat' },
          { code: 'SALALAH', name: 'Salalah Port Depot', isHeadquarters: false, city: 'Salalah' },
        ],
        departments: [
          { code: 'COMM', name: 'Commercial Sales' },
          { code: 'LOG', name: 'Logistics & Dispatch' },
        ],
        selectedRoles: ['COMPANY_ADMIN', 'ACCOUNTANT', 'SALES_USER', 'WAREHOUSE_MANAGER'],
        initialAdmin: {
          fullName: 'Tariq Al-Baraka',
          username: 'tariq.admin',
          email: 'tariq@barakatrading.om',
        },
        enabledModuleKeys: [
          'financial_accounting',
          'sales',
          'accounts_payable',
          'inventory',
          'banking_cash',
          'advanced_reporting',
          'tax_vat',
        ],
      };

      const result = db.createCompanyWithFullOnboarding(payload, superAdminCtx.userId, superAdminCtx);
      companyAId = result.company.id;
      companyAdminUser = result.adminUser;
      companyProfile = result.profile;

      assert.ok(companyAId, 'Company A ID generated');
      assert.strictEqual(result.company.name, 'Al-Baraka Trading LLC');
      assert.strictEqual(companyProfile.businessTypes[0], 'trading');
      assert.strictEqual(companyProfile.inventoryConfig.maintainsInventory, true);
      assert.strictEqual(companyProfile.inventoryConfig.defaultCostingMethod, 'FIFO');
    });

    test('Company Admin privilege boundary verification', () => {
      assert.strictEqual(companyAdminUser.isPlatformSuperAdmin, false, 'Tenant Company Admin MUST NOT be a platform super admin');
      const memberships = db.getMemberships().filter((m) => m.companyId === companyAId && m.userId === companyAdminUser.id);
      assert.strictEqual(memberships.length, 1);
      assert.strictEqual(memberships[0].roleId, 'role-company-admin');
    });

    test('UOM Conversions persisted and calculable for Company A', () => {
      const uoms = db.getUomConversions(companyAId);
      assert.ok(uoms.length >= 2, 'Should have at least 2 UOM conversions');

      // Test 3 CARTON to PCS (3 * 12 * 10 = 360 PCS)
      const res = UomConversionEngine.convert(3, 'CARTON', 'PCS', uoms);
      assert.strictEqual(res.convertedQuantity, 360);
    });

    test('Warehouses and Product Attributes correctly initialized', () => {
      const warehouses = db.getWarehouses(companyAId);
      assert.strictEqual(warehouses.length, 2, 'Should have 2 warehouses provisioned');
      assert.ok(warehouses.some((w) => w.code === 'WH-MAIN' && w.isDefault));
      assert.ok(warehouses.some((w) => w.code === 'WH-SPARE'));

      const attrs = db.getProductAttributes(companyAId);
      assert.ok(attrs.length >= 3, 'Should have brand, size, color attributes');
      assert.ok(attrs.some((a) => a.attributeKey === 'brand'));
      assert.ok(attrs.some((a) => a.attributeKey === 'size'));
      assert.ok(attrs.some((a) => a.attributeKey === 'color'));
    });

    test('Capability Service reflects Trading enabled modules and inventory status', () => {
      const tenantCtxA: TenantContext = {
        companyId: companyAId,
        companyName: 'Al-Baraka Trading LLC',
        companyTier: 'medium',
        baseCurrency: 'OMR',
        userId: companyAdminUser.id,
        userEmail: companyAdminUser.email,
        userFullName: companyAdminUser.fullName,
        roles: ['COMPANY_ADMIN'],
        permissions: ['*'],
        isPlatformAdmin: false,
      };

      assert.strictEqual(capabilityService.isModuleEnabled(tenantCtxA, 'sales'), true);
      assert.strictEqual(capabilityService.isModuleEnabled(tenantCtxA, 'inventory'), true);
      assert.strictEqual(capabilityService.isModuleEnabled(tenantCtxA, 'hr_payroll'), false);
      assert.strictEqual(capabilityService.isModuleEnabled(tenantCtxA, 'project_accounting'), false);
    });
  });

  // ==========================================================================
  // 5. Acceptance Scenario Company B: Pure Professional Services Consultancy
  // ==========================================================================
  describe('5. Acceptance Scenario Company B — Professional Services (Apex Advisory Global)', () => {
    let companyBId: string;
    let companyBAdmin: any;
    let companyBProfile: any;

    test('Atomic Provisioning of Company B (No Inventory, Time/Projects, UK VAT)', () => {
      const payload: FullCompanyOnboardingPayload = {
        name: 'Apex Advisory Global LLP',
        legalName: 'Apex Advisory Global LLP (UK)',
        code: 'APEX_ADV',
        countryCode: 'GB',
        baseCurrency: 'GBP',
        timeZone: 'Europe/London',
        fiscalYearStartMonth: 4, // April fiscal year
        defaultLanguage: 'en',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: '1,234.56',
        tier: 'small',
        businessTypes: ['services', 'project_based'],
        sellingCategories: ['services', 'projects'],
        buyingCategories: ['services', 'consumables'],
        selectedUomCodes: ['HOUR', 'DAY', 'JOB'],
        uomConversions: [
          { fromUomCode: 'DAY', toUomCode: 'HOUR', multiplier: '8.0000' }, // 1 DAY = 8 BILLABLE HOURS
        ],
        inventoryConfig: {
          maintainsInventory: false, // NO INVENTORY MAINTAINED
          allowNegativeStock: false,
          enableMultipleWarehouses: false,
          enableStorageLocations: false,
          enableStockTransfers: false,
          enableStockCount: false,
          enableStockAdjustments: false,
          enableBatchLotTracking: false,
          enableSerialNumberTracking: false,
          enableExpiryDateTracking: false,
          enableBarcodeSku: false,
          enableReorderLevelAlerts: false,
          defaultCostingMethod: 'FIFO',
        },
        selectedAttributes: [],
        salesWorkflow: {
          enableQuotation: true,
          enableSalesOrder: false,
          enableSalesInvoice: true,
          enableDeliveryNote: false, // No delivery note for consulting
          enableCustomerPayment: true,
          enableCreditNote: true,
          enableDebitNote: false,
          enableDiscounts: false,
          enableSalesCommission: false,
          enableCustomerCreditLimit: false,
          enablePartialPayments: true,
          enablePaymentProofVerification: false,
        },
        purchaseWorkflow: {
          enablePurchaseRequest: false,
          enableRfq: false,
          enableSupplierQuotation: false,
          enablePurchaseOrder: false,
          enableGoodsReceipt: false, // No physical GRN
          enableServiceReceipt: true,
          enableSupplierBill: true,
          enableThreeWayMatch: false,
          enableSupplierPayment: true,
          enablePurchaseCreditNote: false,
          enablePurchaseDebitNote: false,
        },
        accountingDefaults: {
          enableMultiCurrency: true,
          enableTaxVat: true,
          taxRegistrationNumber: 'GB-VAT-99221144',
          taxInclusivePricing: false,
          defaultTaxRatePercent: '20.00',
        },
        selectedRoles: ['COMPANY_ADMIN', 'PROJECT_MANAGER', 'CONSULTANT'],
        initialAdmin: {
          fullName: 'Eleanor Vance',
          username: 'eleanor.vance',
          email: 'eleanor@apexadvisory.co.uk',
        },
        enabledModuleKeys: [
          'financial_accounting',
          'sales',
          'project_accounting',
          'banking_cash',
          'advanced_reporting',
          'tax_vat',
        ],
      };

      const result = db.createCompanyWithFullOnboarding(payload, superAdminCtx.userId, superAdminCtx);
      companyBId = result.company.id;
      companyBAdmin = result.adminUser;
      companyBProfile = result.profile;

      assert.ok(companyBId, 'Company B ID generated');
      assert.strictEqual(companyBProfile.inventoryConfig.maintainsInventory, false);
      assert.strictEqual(companyBProfile.fiscalYearStartMonth, 4);
    });

    test('UOM Conversions for Services (1 DAY = 8 HOURS)', () => {
      const uoms = db.getUomConversions(companyBId);
      assert.strictEqual(uoms.length, 1);
      const res = UomConversionEngine.convert(5, 'DAY', 'HOUR', uoms);
      assert.strictEqual(res.convertedQuantity, 40);
    });

    test('Capability Service dynamically turns off Inventory Module for Company B', () => {
      const tenantCtxB: TenantContext = {
        companyId: companyBId,
        companyName: 'Apex Advisory Global LLP',
        companyTier: 'small',
        baseCurrency: 'GBP',
        userId: companyBAdmin.id,
        userEmail: companyBAdmin.email,
        userFullName: companyBAdmin.fullName,
        roles: ['COMPANY_ADMIN'],
        permissions: ['*'],
        isPlatformAdmin: false,
      };

      assert.strictEqual(capabilityService.isModuleEnabled(tenantCtxB, 'inventory'), false, 'Inventory must be disabled for non-inventory company profile');
      assert.strictEqual(capabilityService.isModuleEnabled(tenantCtxB, 'project_accounting'), true, 'Projects must be enabled for Company B');
    });
  });

  // ==========================================================================
  // 6. Acceptance Scenario Company C: Heavy Manufacturing & Assembly
  // ==========================================================================
  describe('6. Acceptance Scenario Company C — Industrial Manufacturing (Zenith Glass Industries)', () => {
    let companyCId: string;
    let companyCProfile: any;

    test('Atomic Provisioning of Company C (Raw Materials + Finished Goods, Batches, AVCO)', () => {
      const payload: FullCompanyOnboardingPayload = {
        name: 'Zenith Glass Industries',
        legalName: 'Zenith Architectural Glass Manufacturing Co. SAOG',
        code: 'ZENITH_MFG',
        countryCode: 'OM',
        baseCurrency: 'OMR',
        timeZone: 'Asia/Muscat',
        fiscalYearStartMonth: 1,
        defaultLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        numberFormat: '1,234.56',
        tier: 'enterprise',
        businessTypes: ['manufacturing', 'wholesale', 'export'],
        sellingCategories: ['finished_goods', 'physical_products'],
        buyingCategories: ['raw_materials', 'consumables', 'equipment_capital_goods'],
        selectedUomCodes: ['KG', 'TON', 'SHEET', 'SQM'],
        uomConversions: [
          { fromUomCode: 'TON', toUomCode: 'KG', multiplier: '1000.0000' },
        ],
        inventoryConfig: {
          maintainsInventory: true,
          allowNegativeStock: false,
          enableMultipleWarehouses: true,
          enableStorageLocations: true,
          enableStockTransfers: true,
          enableStockCount: true,
          enableStockAdjustments: true,
          enableBatchLotTracking: true,
          enableSerialNumberTracking: false,
          enableExpiryDateTracking: true,
          enableBarcodeSku: true,
          enableReorderLevelAlerts: true,
          defaultCostingMethod: 'WEIGHTED_AVG',
        },
        selectedAttributes: ['batch', 'expiry_date', 'thickness'],
        customAttributes: [
          {
            attributeKey: 'heat_treatment_grade',
            label: 'Heat Treatment Tempering Grade',
            dataType: 'select',
            options: ['Toughened', 'Laminated', 'Double-Glazed Heat Soaked'],
            isRequired: true,
          },
        ],
        warehouses: [
          { code: 'WH-RAW', name: 'Raw Silica & Batch Chemicals WH', isDefault: false },
          { code: 'WH-FG', name: 'Finished Architectural Glass Bay', isDefault: true },
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
          enableSalesCommission: true,
          enableCustomerCreditLimit: true,
          enablePartialPayments: true,
          enablePaymentProofVerification: true,
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
          enableMultiCurrency: true,
          enableTaxVat: true,
          taxRegistrationNumber: 'OM-VAT-88899900',
          taxInclusivePricing: false,
          defaultTaxRatePercent: '5.00',
        },
        selectedRoles: ['COMPANY_ADMIN', 'PRODUCTION_MANAGER', 'QUALITY_CONTROLLER', 'WAREHOUSE_MANAGER'],
        initialAdmin: {
          fullName: 'Dr. Tariq Al-Hajri',
          username: 'tariq.hajri',
          email: 'tariq.hajri@zenithglass.om',
        },
        enabledModuleKeys: [
          'financial_accounting',
          'sales',
          'accounts_payable',
          'inventory',
          'manufacturing',
          'fixed_assets',
          'hr_payroll',
          'banking_cash',
          'budgets_cost_centers',
          'advanced_reporting',
          'tax_vat',
        ],
      };

      const result = db.createCompanyWithFullOnboarding(payload, superAdminCtx.userId, superAdminCtx);
      companyCId = result.company.id;
      companyCProfile = result.profile;

      assert.ok(companyCId);
      assert.strictEqual(companyCProfile.inventoryConfig.defaultCostingMethod, 'WEIGHTED_AVG');
      assert.strictEqual(companyCProfile.inventoryConfig.enableBatchLotTracking, true);
    });

    test('Custom Manufacturing Attributes and Multiple Warehouses verified', () => {
      const attrs = db.getProductAttributes(companyCId);
      assert.ok(attrs.length >= 4);
      const customAttr = attrs.find((a) => a.attributeKey === 'heat_treatment_grade');
      assert.ok(customAttr, 'Custom heat treatment attribute must exist');
      assert.strictEqual(customAttr.isRequired, true);
      assert.strictEqual(customAttr.dataType, 'select');
      assert.ok(customAttr.options?.includes('Toughened'));

      const warehouses = db.getWarehouses(companyCId);
      assert.strictEqual(warehouses.length, 2);
      assert.ok(warehouses.some((w) => w.code === 'WH-RAW'));
      assert.ok(warehouses.some((w) => w.code === 'WH-FG' && w.isDefault));
    });
  });

  // ==========================================================================
  // 7. In-App Configuration Editing & Multi-Tenant Isolation
  // ==========================================================================
  describe('7. In-App Reconfiguration & Multi-Tenant Isolation', () => {
    test('Company Admin can add new UOM conversion rule for their company', () => {
      const companies = db.getCompanies();
      const targetCompany = companies[0];

      const tenantAdminCtx: TenantContext = {
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        companyTier: targetCompany.tier,
        baseCurrency: targetCompany.baseCurrency,
        userId: 'admin-local',
        userEmail: 'admin@company.com',
        userFullName: 'Local Admin',
        roles: ['COMPANY_ADMIN'],
        permissions: ['*'],
        isPlatformAdmin: false,
      };

      const created = db.createUomConversion(
        {
          companyId: targetCompany.id,
          fromUomId: `uom-${targetCompany.id.slice(0, 6)}-pallet`,
          fromUomCode: 'PALLET',
          toUomId: `uom-${targetCompany.id.slice(0, 6)}-pcs`,
          toUomCode: 'PCS',
          multiplier: '500.0000',
          precision: 4,
          isStandard: true,
          notes: '1 PALLET = 500 PCS',
        },
        tenantAdminCtx
      );

      assert.ok(created.id);
      assert.strictEqual(created.fromUomCode, 'PALLET');
      assert.strictEqual(created.multiplier, '500.0000');
    });

    test('Tenant Isolation: Regular user cannot create or delete UOM rules in another company', () => {
      const foreignCompanyId = 'comp-foreign-999';

      assert.throws(
        () => {
          db.createUomConversion(
            {
              companyId: foreignCompanyId,
              fromUomId: 'u1',
              fromUomCode: 'BOX',
              toUomId: 'u2',
              toUomCode: 'PCS',
              multiplier: '10.0000',
              precision: 4,
              isStandard: true,
            },
            regularUserCtx // regularUser belongs to company-regular
          );
        },
        TenantViolationError,
        'Cross-tenant UOM creation must be blocked with TenantViolationError'
      );
    });

    test('Backward Compatibility: Seed companies synthesized automatically by ensureCompanyProfile', () => {
      const companies = db.getCompanies();
      for (const comp of companies) {
        const prof = db.ensureCompanyProfile(comp.id);
        assert.ok(prof, `Profile should exist or be generated for company ${comp.name}`);
        assert.strictEqual(prof.companyId, comp.id);
        assert.ok(prof.businessTypes.length > 0);
        assert.ok(prof.sellingCategories.length > 0);
      }
    });

    test('Audit log recorded on company onboarding and profile updates', () => {
      const audits = db.getAuditLogs();
      const onboardingLogs = audits.filter((a) => a.action === 'ONBOARD_AND_ACTIVATE_COMPANY');
      assert.ok(onboardingLogs.length > 0, 'Onboarding actions must be immutably recorded in audit logs');
    });
  });
});
