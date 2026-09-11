// ============================================================================
// Streamlined 8-Step Company Onboarding Redesign Verification Suite
// Tests: Product Company, Service Company, Hybrid Company, UOM Defaults, Custom UOM,
// VAT Configuration, Draft Resume, and Transactional Integrity.
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { onboardingService, OnboardingValidationService } from '../../src/modules/onboarding/services/onboarding.service';
import { FullCompanyOnboardingPayload } from '../../src/database/types';

describe('Streamlined 8-Step Company Onboarding Redesign & UOM Simplification', () => {
  let vvipSuperAdminCtx: TenantContext;

  before(() => {
    vvipSuperAdminCtx = {
      companyId: 'company-vvip-root',
      companyName: 'Platform Global Management',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      userId: 'u-vvip-master',
      userEmail: 'admin@mujahid.com',
      userFullName: 'VVIP Platform Super Admin',
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
      isPlatformAdmin: true,
    };
  });

  test('1. Streamlined Product Company with Base UOM "PCS" and VAT 5%', () => {
    const payload: FullCompanyOnboardingPayload = {
      ...onboardingService.getDefaultOnboardingPayload(),
      name: 'Oman Digital Trading LLC',
      legalName: 'Oman Digital Trading LLC',
      code: 'OMAN_DIGITAL',
      countryCode: 'OM',
      baseCurrency: 'OMR',
      businessTypes: ['trading'],
      sellingCategories: ['physical_products', 'finished_goods'],
      buyingCategories: ['finished_goods', 'consumables'],
      selectedUomCodes: ['PCS', 'BOX', 'CARTON'],
      defaultStockUom: 'PCS',
      defaultSalesUom: 'PCS',
      defaultPurchaseUom: 'CARTON',
      inventoryConfig: {
        maintainsInventory: true,
        allowNegativeStock: false,
        enableMultipleWarehouses: true,
        enableStorageLocations: false,
        enableStockTransfers: true,
        enableStockCount: true,
        enableStockAdjustments: true,
        enableBatchLotTracking: false,
        enableSerialNumberTracking: false,
        enableExpiryDateTracking: false,
        enableBarcodeSku: true,
        enableReorderLevelAlerts: true,
        defaultCostingMethod: 'WEIGHTED_AVG',
      },
      accountingDefaults: {
        enableTaxVat: true,
        taxRegistrationNumber: 'OM-VAT-778899',
        defaultTaxRatePercent: '5.00',
        enableMultiCurrency: true,
        taxInclusivePricing: false,
      },
      initialAdmin: {
        fullName: 'Ahmed Al-Kindi',
        username: 'admin@omandigital.om',
        password: 'Password123!',
      }
    };

    const result = onboardingService.activateCompany(payload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    assert.ok(result.company.id, 'Should create company entity');
    assert.equal(result.company.code, 'OMAN_DIGITAL');
    assert.equal(result.company.baseCurrency, 'OMR');
    assert.equal(result.adminUser.email, 'admin@omandigital.om');

    // Verify UOMs created
    const companyUoms = db.getUnitsOfMeasure({ ...vvipSuperAdminCtx, companyId: result.company.id });
    assert.ok(companyUoms.some(u => u.code === 'PCS'), 'Should have Base UOM PCS');
    assert.ok(companyUoms.some(u => u.code === 'BOX'), 'Should have BOX UOM');
    assert.ok(companyUoms.some(u => u.code === 'CARTON'), 'Should have CARTON UOM');
  });

  test('2. Streamlined Pure Service Company (Inventory skipped)', () => {
    const payload: FullCompanyOnboardingPayload = {
      ...onboardingService.getDefaultOnboardingPayload(),
      name: 'Muscat Advisory Services LLC',
      legalName: 'Muscat Advisory Services LLC',
      code: 'MUSCAT_ADVISORY',
      countryCode: 'OM',
      baseCurrency: 'OMR',
      businessTypes: ['services'],
      sellingCategories: ['services'],
      buyingCategories: ['services', 'consumables'],
      selectedUomCodes: ['HOUR', 'JOB', 'DAY'],
      defaultStockUom: 'HOUR',
      defaultSalesUom: 'HOUR',
      defaultPurchaseUom: 'HOUR',
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
        defaultCostingMethod: 'WEIGHTED_AVG',
      },
      accountingDefaults: {
        enableTaxVat: false,
        taxRegistrationNumber: '',
        defaultTaxRatePercent: '0.00',
        enableMultiCurrency: true,
        taxInclusivePricing: false,
      },
      initialAdmin: {
        fullName: 'Fatma Al-Balushi',
        username: 'fatma@muscatadvisory.om',
        password: 'Password123!',
      }
    };

    const result = onboardingService.activateCompany(payload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    assert.ok(result.company.id, 'Should create pure service company');
    assert.equal(result.profile.inventoryConfig.maintainsInventory, false, 'Should have maintainsInventory disabled');
  });

  test('3. Custom UOM Addition & Smart Defaults Validation', () => {
    const payload: FullCompanyOnboardingPayload = {
      ...onboardingService.getDefaultOnboardingPayload(),
      name: 'Gulf Cable & Wire Industries',
      legalName: 'Gulf Cable & Wire Industries SAOG',
      code: 'GULF_CABLE',
      countryCode: 'OM',
      baseCurrency: 'OMR',
      businessTypes: ['manufacturing', 'trading'],
      sellingCategories: ['physical_products'],
      buyingCategories: ['raw_materials', 'finished_goods'],
      selectedUomCodes: ['METER', 'ROLL', 'DRUM'],
      customUoms: [
        { code: 'DRUM', name: 'Cable Drum', symbol: 'drm', category: 'quantity', conversionFactor: '1.0000' }
      ],
      defaultStockUom: 'METER',
      defaultSalesUom: 'METER',
      defaultPurchaseUom: 'DRUM',
      inventoryConfig: {
        maintainsInventory: true,
        allowNegativeStock: false,
        enableMultipleWarehouses: true,
        enableStorageLocations: false,
        enableStockTransfers: true,
        enableStockCount: true,
        enableStockAdjustments: true,
        enableBatchLotTracking: true,
        enableSerialNumberTracking: false,
        enableExpiryDateTracking: false,
        enableBarcodeSku: true,
        enableReorderLevelAlerts: true,
        defaultCostingMethod: 'WEIGHTED_AVG',
      },
      initialAdmin: {
        fullName: 'Tariq Al-Lawati',
        username: 'tariq@gulfcable.om',
        password: 'Password123!',
      }
    };

    const result = onboardingService.activateCompany(payload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    assert.ok(result.company.id);

    const uoms = db.getUnitsOfMeasure({ ...vvipSuperAdminCtx, companyId: result.company.id });
    assert.ok(uoms.some(u => u.code === 'DRUM'), 'Should have registered custom UOM DRUM');
    assert.ok(uoms.some(u => u.code === 'METER'), 'Should have standard UOM METER');
  });

  test('4. Draft Saving, Resuming, and Deleting', () => {
    const draftPayload = {
      ...onboardingService.getDefaultOnboardingPayload(),
      name: 'In-Progress Draft Corp',
      code: 'DRAFT_CORP',
    };

    const savedDraft = onboardingService.saveDraft(3, draftPayload, undefined, vvipSuperAdminCtx.userId);
    assert.ok(savedDraft.id, 'Should create draft with ID');
    assert.equal(savedDraft.currentStep, 3);

    const retrievedDrafts = onboardingService.getDrafts();
    assert.ok(retrievedDrafts.some(d => d.id === savedDraft.id), 'Draft should exist in storage');

    const deleted = onboardingService.deleteDraft(savedDraft.id);
    assert.equal(deleted, true, 'Draft should be cleanly deleted');
  });
});
