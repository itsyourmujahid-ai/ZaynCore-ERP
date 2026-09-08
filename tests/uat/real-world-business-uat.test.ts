// ============================================================================
// FINAL PRODUCTION SMOKE TEST & REAL-WORLD BUSINESS UAT TEST SUITE
// Comprehensive Real-World User Acceptance Testing for "UAT Trading & Services LLC"
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { salesService } from '../../src/modules/sales/services/sales.service';
import { accountsReceivableService } from '../../src/modules/sales/services/ar.service';
import { procurementService } from '../../src/modules/procurement/services/procurement.service';
import { accountsPayableService } from '../../src/modules/procurement/services/ap.service';
import { inventoryService } from '../../src/modules/inventory/services/inventory.service';
import { inventoryValuationService } from '../../src/modules/inventory/services/inventory-valuation.service';
import { bankingService } from '../../src/modules/banking/services/banking.service';
import { bankReconciliationService } from '../../src/modules/banking/services/bank-reconciliation.service';
import { taxConfigurationService } from '../../src/modules/tax/services/tax-configuration.service';
import { taxCalculatorService } from '../../src/modules/tax/services/tax-calculator.service';
import { taxLedgerService } from '../../src/modules/tax/services/tax-ledger.service';
import { taxReturnService } from '../../src/modules/tax/services/tax-return.service';
import { taxReconciliationService } from '../../src/modules/tax/services/tax-reconciliation.service';
import { permissionService } from '../../src/modules/authorization/services/permission-service';
import { assetService } from '../../src/modules/assets/services/asset.service';
import { depreciationService } from '../../src/modules/assets/services/depreciation.service';
import { payrollService } from '../../src/modules/payroll/services/payroll.service';
import { employeeService } from '../../src/modules/payroll/services/employee.service';
import { projectService } from '../../src/modules/projects/services/project.service';
import { projectCostService } from '../../src/modules/projects/services/project-cost.service';
import { projectBillingService } from '../../src/modules/projects/services/project-billing.service';
import { projectProfitabilityService } from '../../src/modules/projects/services/project-profitability.service';
import { accountingPostingService } from '../../src/modules/accounting/services/accounting-posting.service';
import { generalLedgerService } from '../../src/modules/accounting/services/general-ledger.service';
import { subLedgerService } from '../../src/modules/accounting/services/sub-ledger.service';
import { AdvancedFinancialsService } from '../../src/modules/accounting/services/advanced-financials.service';
import { accrualsPrepaymentsService } from '../../src/modules/accounting/services/accruals-prepayments.service';
import {
  FullCompanyOnboardingPayload,
  DbCustomer,
  DbSupplier,
  DbItem,
  DbProject,
  DbFixedAsset,
  DbCustomerPayment
} from '../../src/database/types';
import {
  TenantViolationError,
  UnauthorizedAccessError,
  ImmutableRecordError,
  PeriodClosedError
} from '../../src/core/errors/DomainErrors';

describe('Final Production Smoke Test & Real-World Business UAT: UAT Trading & Services LLC', { concurrency: 1 }, () => {
  // Global Platform Context
  let vvipSuperAdminCtx: TenantContext;

  // Primary Company: UAT Trading & Services LLC (OMR, 5% Tax)
  let uatCompanyId: string;
  let hqBranchId: string;
  let retailBranchId: string;
  let mainWarehouseId: string;
  let retailWarehouseId: string;
  let bankAccountId: string;
  let pettyCashAccountId: string;
  let bankGlAccountId: string;

  // 10 Distinct User Contexts for Real-World Persona Simulation
  let companyAdminCtx: TenantContext;
  let accountantCtx: TenantContext;
  let salesManagerCtx: TenantContext;
  let salesUserCtx: TenantContext;
  let purchaseManagerCtx: TenantContext;
  let purchaseUserCtx: TenantContext;
  let warehouseManagerCtx: TenantContext;
  let bankCashUserCtx: TenantContext;
  let hrPayrollManagerCtx: TenantContext;
  let managementViewerCtx: TenantContext;

  // Secondary Company for Boundary Testing (Global Corp Ltd)
  let compBId: string;
  let compBAdminCtx: TenantContext;

  // Master Data Entities
  let customerA: DbCustomer;
  let customerB: DbCustomer;
  let supplierA: DbSupplier;
  let supplierB: DbSupplier;
  let product1Pcs: DbItem;
  let product2Box: DbItem;
  let uatProject: DbProject;
  let uatAsset: DbFixedAsset;

  // Transaction Tracking Variables
  let quoteId: string;
  let soId: string;
  let invoiceId: string;
  let paymentRequest: DbCustomerPayment;
  let poId: string;
  let grnId: string;
  let billId: string;
  let emp1Id: string;
  let emp2Id: string;

  const advancedFinancials = AdvancedFinancialsService.getInstance();

  before(async () => {
    // ------------------------------------------------------------------------
    // 1. VVIP PLATFORM SUPER ADMIN INITIALIZATION
    // ------------------------------------------------------------------------
    vvipSuperAdminCtx = {
      companyId: 'c1000000-0000-0000-0000-000000000001',
      companyName: 'Platform Global Master',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      userId: 'u-vvip-super-admin-root',
      userEmail: 'admin@mujahid.com',
      userFullName: 'VVIP Platform Root Controller',
      roles: ['super_admin', 'platform_owner'],
      permissions: ['*'],
      isPlatformAdmin: true,
    };

    // ------------------------------------------------------------------------
    // 2. PRIMARY TEST COMPANY INITIALIZATION: UAT Trading & Services LLC (OMR)
    // ------------------------------------------------------------------------
    const onboardingPayload: FullCompanyOnboardingPayload = {
      name: 'UAT Trading & Services LLC',
      legalName: 'UAT Trading and Engineering Services LLC',
      code: 'UAT_TRADING_OMR',
      registrationNumber: 'CR-MCT-2026-9911',
      taxIdentifier: 'OM-VAT-99882200',
      countryCode: 'OM',
      city: 'Muscat',
      addressLine1: 'Building 14, Knowledge Oasis Muscat (KOM)',
      baseCurrency: 'OMR',
      timeZone: 'Asia/Muscat',
      fiscalYearStartMonth: 1,
      defaultLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      tier: 'enterprise',
      businessTypes: ['trading', 'wholesale', 'services'],
      sellingCategories: ['physical_products', 'services'],
      buyingCategories: ['finished_goods', 'consumables', 'raw_materials'],
      selectedUomCodes: ['PCS', 'BOX', 'UNIT', 'SET'],
      uomConversions: [
        { fromUomCode: 'BOX', toUomCode: 'PCS', multiplier: '24.0000' }
      ],
      defaultPurchaseUom: 'BOX',
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
        enableSerialNumberTracking: false,
        enableExpiryDateTracking: false,
        enableBarcodeSku: true,
        enableReorderLevelAlerts: true,
        defaultCostingMethod: 'FIFO',
      },
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
        enablePaymentProofVerification: true, // 2-Step Payment Verification Guard
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
        taxRegistrationNumber: 'OM-VAT-99882200',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '5.00',
      },
      branches: [
        { code: 'HQ-MCT', name: 'Head Office - Muscat', isHeadquarters: true, city: 'Muscat' },
        { code: 'RET-MCT', name: 'Retail Branch - Seeb', isHeadquarters: false, city: 'Seeb' }
      ],
      warehouses: [
        { code: 'WH-MAIN-OMR', name: 'Main Distribution Center', isDefault: true },
        { code: 'WH-RET-OMR', name: 'Retail Warehouse Seeb', isDefault: false }
      ],
      departments: [
        { code: 'SALES', name: 'Sales & Business Development', description: 'Revenue generation' },
        { code: 'PURCH', name: 'Procurement & Supply Chain', description: 'Vendor management' },
        { code: 'FIN', name: 'Finance & Accounts', description: 'Financial reporting & audit' },
        { code: 'WH', name: 'Warehouse & Logistics', description: 'Inventory management' },
        { code: 'HR', name: 'Human Resources & Payroll', description: 'Talent management' }
      ],
      initialAdmin: {
        fullName: 'Said Al-Riyami',
        username: 'said.admin',
        password: 'SecureCompanyAdminPass1!',
        email: 'admin@uat-trading.om',
        designation: 'Managing Director',
      },
      enabledModuleKeys: [
        'financial_accounting',
        'sales',
        'accounts_payable',
        'inventory',
        'banking_cash',
        'advanced_reporting',
        'payroll_hr',
        'tax_compliance',
        'fixed_assets',
        'project_management',
        'cost_accounting'
      ],
    };

    const onboardingResult = db.createCompanyWithFullOnboarding(onboardingPayload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    uatCompanyId = onboardingResult.company.id;

    // Branches & Warehouses
    const branches = db.getBranches({ companyId: uatCompanyId } as any);
    hqBranchId = branches.find((b) => b.isHeadquarters)?.id || branches[0].id;
    retailBranchId = branches.find((b) => !b.isHeadquarters)?.id || branches[1]?.id || hqBranchId;

    const warehouses = db.getWarehouses({ companyId: uatCompanyId } as any);
    mainWarehouseId = warehouses.find((w) => w.code === 'WH-MAIN-OMR')?.id || warehouses[0].id;
    retailWarehouseId = warehouses.find((w) => w.code === 'WH-RET-OMR')?.id || warehouses[1]?.id || mainWarehouseId;

    // ------------------------------------------------------------------------
    // 3. USER ROLES & CONTEXT SETUP (10 DISTINCT REALISTIC PERSONAS)
    // ------------------------------------------------------------------------
    companyAdminCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: onboardingResult.adminUser.id,
      userEmail: 'admin@uat-trading.om',
      userFullName: 'Said Al-Riyami (Company Admin)',
      roles: ['admin'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };

    accountantCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-acct-01',
      userEmail: 'accountant@uat-trading.om',
      userFullName: 'Ahmed Al-Habsi (Senior Accountant)',
      roles: ['accountant'],
      permissions: [
        'accounting.*',
        'ar.post',
        'ap.post',
        'payroll.*',
        'accounting.payment.approve',
        'accounting.payment.finalize',
        'banking.*',
        'tax.*',
        'reports.*'
      ],
      isPlatformAdmin: false,
    };

    salesManagerCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-salesmgr-01',
      userEmail: 'sales.mgr@uat-trading.om',
      userFullName: 'Tariq Al-Balushi (Sales Manager)',
      roles: ['sales_manager'],
      permissions: ['sales.*', 'customers.*', 'reports.sales'],
      isPlatformAdmin: false,
    };

    salesUserCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-salesrep-01',
      userEmail: 'sales.rep@uat-trading.om',
      userFullName: 'Majid Al-Harthy (Sales Executive)',
      roles: ['sales_user'],
      permissions: ['sales.quotation.create', 'sales.order.create', 'sales.invoice.create', 'sales.payment_request.submit', 'customers.view'],
      isPlatformAdmin: false,
    };

    purchaseManagerCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-purmgr-01',
      userEmail: 'purchase.mgr@uat-trading.om',
      userFullName: 'Khamis Al-Zaabi (Procurement Manager)',
      roles: ['purchase_manager'],
      permissions: ['purchases.*', 'suppliers.*', 'reports.purchases'],
      isPlatformAdmin: false,
    };

    purchaseUserCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-purchofficer-01',
      userEmail: 'purchase.officer@uat-trading.om',
      userFullName: 'Nasser Al-Rawahi (Procurement Officer)',
      roles: ['purchase_user'],
      permissions: ['purchases.pr.create', 'purchases.rfq.create', 'purchases.quote.create', 'purchases.po.create', 'suppliers.view'],
      isPlatformAdmin: false,
    };

    warehouseManagerCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-whmgr-01',
      userEmail: 'warehouse@uat-trading.om',
      userFullName: 'Sultan Al-Maawali (Warehouse & Logistics Manager)',
      roles: ['warehouse_manager'],
      permissions: ['inventory.*', 'warehouse.*', 'purchases.grn.create', 'sales.delivery.create'],
      isPlatformAdmin: false,
    };

    bankCashUserCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-cashier-01',
      userEmail: 'treasury@uat-trading.om',
      userFullName: 'Fatima Al-Wahaibi (Cashier / Treasury Officer)',
      roles: ['cashier'],
      permissions: ['banking.view', 'banking.statement.import', 'banking.reconcile'],
      isPlatformAdmin: false,
    };

    hrPayrollManagerCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-hrmgr-01',
      userEmail: 'hr@uat-trading.om',
      userFullName: 'Zahra Al-Lawati (HR & Payroll Manager)',
      roles: ['hr_manager'],
      permissions: ['employees.*', 'payroll.*', 'hr.*'],
      isPlatformAdmin: false,
    };

    managementViewerCtx = {
      companyId: uatCompanyId,
      companyName: 'UAT Trading & Services LLC',
      companyTier: 'enterprise',
      baseCurrency: 'OMR',
      branchId: hqBranchId,
      userId: 'usr-uat-board-01',
      userEmail: 'executive@uat-trading.om',
      userFullName: 'Dr. Hilal Al-Siyabi (Executive Board Member)',
      roles: ['viewer', 'management'],
      permissions: ['reports.view', 'dashboard.view', 'analytics.view'],
      isPlatformAdmin: false,
    };

    // Bank and Cash Accounts
    const defaultBank = db.getBankAccounts(companyAdminCtx)[0];
    const defaultCash = db.getCashAccounts(companyAdminCtx)[0];
    bankAccountId = defaultBank.id;
    pettyCashAccountId = defaultCash ? defaultCash.id : 'ca-petty-cash';

    const accounts = db.getAccounts(companyAdminCtx);
    const bankGl = accounts.find((a) => a.code === '1010') || accounts[0];
    bankGlAccountId = bankGl.id;

    // Create 2050 Accrued Operating Expenses Account
    db.createAccount({
      code: '2050',
      name: 'Accrued Operating Expenses & Provisions',
      groupId: `g-${uatCompanyId}-2000`,
      classification: 'liability',
      accountType: 'liability',
      level: 2,
      normalBalance: 'credit',
      currency: 'OMR',
      isActive: true,
      isControlAccount: false,
      isReconciliationAccount: false,
      isSystemAccount: false,
      allowManualJournal: true,
      description: 'Accrued general operating expenses and provisions',
    }, companyAdminCtx);

    // ------------------------------------------------------------------------
    // 4. SECONDARY TENANT (FOR ISOLATION PROOF)
    // ------------------------------------------------------------------------
    const compBPayload: FullCompanyOnboardingPayload = {
      name: 'Global Corp International Ltd',
      legalName: 'Global Corp International Limited',
      code: 'GLOBAL_CORP',
      registrationNumber: 'CR-GLOB-881100',
      taxIdentifier: 'GB-VAT-88110099',
      countryCode: 'GB',
      city: 'London',
      addressLine1: '50 Canary Wharf',
      baseCurrency: 'GBP',
      timeZone: 'Europe/London',
      fiscalYearStartMonth: 1,
      defaultLanguage: 'en',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: '1,234.56',
      tier: 'standard',
      businessTypes: ['services'],
      sellingCategories: ['services'],
      buyingCategories: ['consumables'],
      selectedUomCodes: ['UNIT'],
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
      salesWorkflow: {
        enableQuotation: true,
        enableSalesOrder: true,
        enableSalesInvoice: true,
        enableDeliveryNote: false,
        enableCustomerPayment: true,
        enableCreditNote: true,
        enableDebitNote: true,
        enableDiscounts: true,
        enableSalesCommission: false,
        enableCustomerCreditLimit: false,
        enablePartialPayments: true,
        enablePaymentProofVerification: false,
      },
      purchaseWorkflow: {
        enablePurchaseRequest: true,
        enableRfq: false,
        enableSupplierQuotation: false,
        enablePurchaseOrder: true,
        enableGoodsReceipt: false,
        enableServiceReceipt: true,
        enableSupplierBill: true,
        enableThreeWayMatch: false,
        enableSupplierPayment: true,
        enablePurchaseCreditNote: true,
        enablePurchaseDebitNote: true,
      },
      accountingDefaults: {
        enableMultiCurrency: true,
        enableTaxVat: true,
        taxRegistrationNumber: 'GB-VAT-88110099',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '20.00',
      },
      branches: [
        { code: 'HQ-LON', name: 'London Headquarters', isHeadquarters: true, city: 'London' }
      ],
      initialAdmin: {
        fullName: 'Edward Sterling',
        username: 'edward.admin',
        password: 'SecureGlobalAdminPass1!',
        email: 'admin@globalcorp.co.uk',
        designation: 'Managing Director',
      },
      enabledModuleKeys: [
        'financial_accounting',
        'sales',
        'accounts_payable',
        'banking_cash',
        'advanced_reporting'
      ],
    };

    const compBResult = db.createCompanyWithFullOnboarding(compBPayload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    compBId = compBResult.company.id;
    const compBBranches = db.getBranches({ companyId: compBId } as any);
    compBAdminCtx = {
      companyId: compBId,
      companyName: 'Global Corp International Ltd',
      companyTier: 'standard',
      baseCurrency: 'GBP',
      branchId: compBBranches[0]?.id || 'br-compb-hq',
      userId: compBResult.adminUser.id,
      userEmail: 'admin@globalcorp.co.uk',
      userFullName: 'Edward Sterling',
      roles: ['admin'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };
  });

  // ==========================================================================
  // PHASE 1: MASTER DATA & DUAL UOM CONVERSION
  // ==========================================================================
  test('UAT Phase 1.1: Customer Master Data Configuration (Credit Limits, Payment Terms, Tax Identifiers)', () => {
    customerA = db.createCustomer({
      code: 'CUST-A-OMR',
      name: 'Sultanate Petroleum Supply Co',
      email: 'finance@sultanoil.om',
      phone: '+968 2400 1100',
      currency: 'OMR',
      creditLimit: '50000.0000',
      paymentTermsDays: 30,
      taxNumber: 'OM-VAT-889911',
      isActive: true,
      currentBalance: '0.0000',
    }, companyAdminCtx);

    customerB = db.createCustomer({
      code: 'CUST-B-OMR',
      name: 'Oman National Logistics SAOC',
      email: 'ap@onlogistics.om',
      phone: '+968 2400 2200',
      currency: 'OMR',
      creditLimit: '25000.0000',
      paymentTermsDays: 15,
      taxNumber: 'OM-VAT-774433',
      isActive: true,
      currentBalance: '0.0000',
    }, companyAdminCtx);

    assert.equal(customerA.creditLimit, '50000.0000');
    assert.equal(customerB.creditLimit, '25000.0000');
  });

  test('UAT Phase 1.2: Supplier Master Data Setup (Multi-currency, Credit Terms)', () => {
    supplierA = db.createSupplier({
      code: 'SUP-A-OMR',
      name: 'Gulf Microchip Solutions FZCO',
      email: 'sales@gulfmicro.ae',
      phone: '+971 4 880 1000',
      currency: 'OMR',
      creditLimit: '100000.0000',
      paymentTermsDays: 30,
      taxNumber: 'AE-VAT-100200300',
      isActive: true,
      currentBalance: '0.0000',
    }, companyAdminCtx);

    supplierB = db.createSupplier({
      code: 'SUP-B-OMR',
      name: 'Al-Madina Industrial Logistics LLC',
      email: 'billing@almadinalogistics.om',
      phone: '+968 2450 3300',
      currency: 'OMR',
      creditLimit: '50000.0000',
      paymentTermsDays: 30,
      taxNumber: 'OM-VAT-556677',
      isActive: true,
      currentBalance: '0.0000',
    }, companyAdminCtx);

    assert.ok(supplierA.id);
    assert.ok(supplierB.id);
  });

  test('UAT Phase 1.3: Product Catalog & Dual UOM Configuration (1 Box = 24 PCS FIFO)', () => {
    const uoms = inventoryService.getUnitsOfMeasure(companyAdminCtx);
    const pcsUom = uoms.find(u => u.code === 'PCS') || uoms[0];
    const boxUom = uoms.find(u => u.code === 'BOX') || uoms[1] || uoms[0];
    const cats = inventoryService.getItemCategories(companyAdminCtx);
    const catId = cats[0]?.id || 'cat-general';

    product1Pcs = inventoryService.createItem({
      itemCode: 'SKU-TITAN-PCS',
      name: 'Titan Server Blade Compute Node',
      description: 'Individual compute blade unit',
      categoryId: catId,
      itemType: 'stock',
      uomId: pcsUom.id,
      trackInventory: true,
      isStockItem: true,
      isService: false,
      minStockLevel: '10.0000',
      reorderLevel: '20.0000',
      maxStockLevel: '500.0000',
      costingMethod: 'fifo',
      standardCost: '100.0000',
      currentAverageCost: '100.0000',
      totalStockQuantity: '0.0000',
      totalStockValue: '0.0000',
      inventoryAccountId: '1300',
      cogsAccountId: '5000',
      salesRevenueAccountId: '4000',
      status: 'active',
    }, companyAdminCtx);

    product2Box = inventoryService.createItem({
      itemCode: 'SKU-COMP-BOX',
      name: 'Enterprise Component Pack (24 PCS / Box)',
      description: 'Bulk hardware components packaged 24 pieces per carton/box',
      categoryId: catId,
      itemType: 'stock',
      uomId: boxUom.id,
      trackInventory: true,
      isStockItem: true,
      isService: false,
      minStockLevel: '5.0000',
      reorderLevel: '20.0000',
      maxStockLevel: '200.0000',
      costingMethod: 'fifo',
      standardCost: '240.0000',
      currentAverageCost: '240.0000',
      totalStockQuantity: '0.0000',
      totalStockValue: '0.0000',
      inventoryAccountId: '1300',
      cogsAccountId: '5000',
      salesRevenueAccountId: '4000',
      status: 'active',
    }, companyAdminCtx);

    assert.equal(product1Pcs.uomId, pcsUom.id);
    assert.equal(product2Box.uomId, boxUom.id);
  });

  // ==========================================================================
  // PHASE 2: PROCUREMENT LIFECYCLE & 3-WAY MATCH
  // ==========================================================================
  test('UAT Phase 2.1: Purchase Request to Purchase Order Lifecycle (Stock Unchanged Invariant)', () => {
    const pr = procurementService.createPurchaseRequest({
      branchId: hqBranchId,
      requestNumber: 'PR-UAT-2026-001',
      requestDate: '2026-09-01',
      departmentId: 'PURCH',
      notes: 'Restock hardware blades and component boxes for Q4',
      items: [
        {
          itemId: product1Pcs.id,
          description: product1Pcs.name,
          quantity: '100',
          estimatedUnitPrice: '100.0000',
          estimatedTotal: '10000.0000',
        },
        {
          itemId: product2Box.id,
          description: product2Box.name,
          quantity: '10', // 10 Boxes = 240 PCS
          estimatedUnitPrice: '240.0000',
          estimatedTotal: '2400.0000',
        }
      ]
    }, purchaseUserCtx);

    procurementService.approvePurchaseRequest(pr.id, 'Approved for procurement', purchaseManagerCtx);

    const po = procurementService.createPurchaseOrder({
      branchId: hqBranchId,
      orderNumber: 'PO-UAT-2026-001',
      orderDate: '2026-09-02',
      supplierId: supplierA.id,
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '12400.0000',
      taxTotal: '620.0000',
      total: '13020.0000',
      status: 'draft',
      items: [
        {
          id: 'po-item-1',
          itemId: product1Pcs.id,
          itemCode: product1Pcs.itemCode,
          description: product1Pcs.name,
          quantity: '100',
          unitPrice: '100.0000',
          taxRate: '0.0500',
          taxAmount: '500.0000',
          lineTotal: '10500.0000',
          receivedQuantity: '0',
          billedQuantity: '0',
        },
        {
          id: 'po-item-2',
          itemId: product2Box.id,
          itemCode: product2Box.itemCode,
          description: product2Box.name,
          quantity: '10',
          unitPrice: '240.0000',
          taxRate: '0.0500',
          taxAmount: '120.0000',
          lineTotal: '2520.0000',
          receivedQuantity: '0',
          billedQuantity: '0',
        }
      ]
    }, purchaseUserCtx);

    poId = po.id;
    procurementService.approvePurchaseOrder(poId, purchaseManagerCtx);

    // PO creation must NOT increase physical stock
    const stock1 = inventoryService.getStockBalance(product1Pcs.id, mainWarehouseId, companyAdminCtx);
    assert.equal(stock1.quantity, 0, 'PO creation must NOT alter physical inventory');
  });

  test('UAT Phase 2.2: Warehouse Manager GRN Receipt (Physical Stock Increased & GRNI Liability Accrued)', () => {
    const grn = procurementService.receiveGoods({
      branchId: hqBranchId,
      receiptNumber: 'GRN-UAT-2026-001',
      receiptDate: '2026-09-03',
      supplierId: supplierA.id,
      warehouseId: mainWarehouseId,
      purchaseOrderId: poId,
      status: 'completed',
      items: [
        {
          poItemId: 'po-item-1',
          itemCode: product1Pcs.itemCode,
          description: product1Pcs.name,
          receivedQuantity: '100',
          acceptedQuantity: '100',
          rejectedQuantity: '0',
          uom: 'PCS',
        },
        {
          poItemId: 'po-item-2',
          itemCode: product2Box.itemCode,
          description: product2Box.name,
          receivedQuantity: '10',
          acceptedQuantity: '10',
          rejectedQuantity: '0',
          uom: 'BOX',
        }
      ]
    }, warehouseManagerCtx);

    grnId = grn.id;
    inventoryService.processGoodsReceiptToStock(grnId, mainWarehouseId, warehouseManagerCtx);

    const stockPcs = inventoryService.getStockBalance(product1Pcs.id, mainWarehouseId, companyAdminCtx);
    const stockBox = inventoryService.getStockBalance(product2Box.id, mainWarehouseId, companyAdminCtx);

    assert.equal(stockPcs.quantity, 100, 'Physical inventory for Product 1 must be 100 PCS');
    assert.equal(stockBox.quantity, 10, 'Physical inventory for Product 2 must be 10 BOX');
  });

  test('UAT Phase 2.3: Accountant 3-Way Match Verification, Supplier Bill Posting & Payment Settlement', () => {
    let bill = procurementService.createSupplierBill({
      branchId: hqBranchId,
      billNumber: 'BILL-GULF-2026-001',
      billDate: '2026-09-04',
      dueDate: '2026-10-04',
      supplierId: supplierA.id,
      currency: 'OMR',
      exchangeRate: '1.000000',
      purchaseOrderId: poId,
      goodsReceiptId: grnId,
      subtotal: '12400.0000',
      taxTotal: '620.0000',
      total: '13020.0000',
      status: 'draft',
      matchStatus: 'matched',
      items: [
        {
          itemId: product1Pcs.id,
          description: product1Pcs.name,
          quantity: '100',
          unitPrice: '100.0000',
          taxRate: '0.0500',
          taxAmount: '500.0000',
          lineTotal: '10500.0000',
          expenseAccountId: '1300',
        },
        {
          itemId: product2Box.id,
          description: product2Box.name,
          quantity: '10',
          unitPrice: '240.0000',
          taxRate: '0.0500',
          taxAmount: '120.0000',
          lineTotal: '2520.0000',
          expenseAccountId: '1300',
        }
      ]
    }, accountantCtx);

    billId = bill.id;
    bill = procurementService.postSupplierBill(billId, accountantCtx);
    assert.equal(bill.status, 'posted');
    assert.equal(bill.balanceDue, '13020.0000');

    // Pay Supplier
    const pmt = accountsPayableService.postSupplierPaymentWithAllocation({
      paymentNumber: 'PMT-SUP-UAT-001',
      supplierId: supplierA.id,
      paymentDate: '2026-09-05',
      paymentMethod: 'bank_transfer',
      bankAccountId: bankAccountId,
      amount: '13020.0000',
      allocations: [{ billId, allocatedAmount: '13020.0000' }]
    }, accountantCtx);

    assert.equal(pmt.status, 'posted');
    const updatedBill = db.getSupplierBills(companyAdminCtx).find((b) => b.id === billId);
    assert.equal(updatedBill?.balanceDue, '0.0000');
  });

  // ==========================================================================
  // PHASE 3: REAL SALES JOURNEY & 2-STEP PAYMENT VERIFICATION GUARD
  // ==========================================================================
  test('UAT Phase 3.1: Sales User creates Quotation and accepts Sales Order', () => {
    const quote = salesService.createQuotation({
      quotationNumber: 'QT-UAT-2026-001',
      customerId: customerA.id,
      date: '2026-09-06',
      validUntil: '2026-09-30',
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '3600.0000',
      discountTotal: '0.0000',
      taxTotal: '180.0000',
      total: '3780.0000',
      status: 'draft',
      items: [
        {
          id: 'item-1',
          itemId: product1Pcs.id,
          description: product1Pcs.name,
          quantity: '20',
          unitPrice: '180.0000',
          discount: '0.0000',
          taxRate: '0.0500',
          taxAmount: '180.0000',
          total: '3780.0000',
        }
      ]
    }, salesUserCtx);

    quoteId = quote.id;
    assert.equal(quote.status, 'draft');

    const order = salesService.convertQuotationToOrder(quoteId, salesUserCtx);
    soId = order.id;
    assert.equal(order.status, 'confirmed');
  });

  test('UAT Phase 3.2: Sales Invoice Generation with Tax Line Computation (GL #2200)', () => {
    const invoice = salesService.createInvoice({
      branchId: hqBranchId,
      invoiceNumber: 'INV-UAT-2026-001',
      invoiceDate: '2026-09-07',
      dueDate: '2026-10-07',
      customerId: customerA.id,
      salesOrderId: soId,
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '3600.0000',
      discountTotal: '0.0000',
      taxTotal: '180.0000',
      total: '3780.0000',
      status: 'draft',
      items: [
        {
          id: 'item-1',
          itemId: product1Pcs.id,
          description: product1Pcs.name,
          quantity: '20',
          unitPrice: '180.0000',
          discount: '0.0000',
          taxRate: '0.0500',
          taxAmount: '180.0000',
          total: '3780.0000',
        }
      ]
    }, salesUserCtx);

    invoiceId = invoice.id;
    const posted = salesService.postInvoice(invoiceId, salesUserCtx);
    assert.equal(posted.status, 'posted');
    assert.equal(posted.balanceDue, '3780.0000');
  });

  test('UAT Phase 3.3: 2-Step Payment Verification Guard (Submission with Proof -> Accountant GL Settlement)', () => {
    // 1. Assert sales rep direct posting is blocked by guard
    assert.throws(
      () => accountsReceivableService.postReceiptWithAllocation({
        receiptNumber: 'RCPT-FORBIDDEN-01',
        customerId: customerA.id,
        paymentDate: '2026-09-08',
        paymentMethod: 'bank_transfer',
        bankAccountId: bankAccountId,
        amount: '3780.0000',
        allocations: [{ invoiceId, allocatedAmount: '3780.0000' }]
      }, salesUserCtx),
      /Direct payment posting is restricted when 2-Step Payment Proof Verification is enabled/,
      'Sales user must be blocked from direct payment posting'
    );

    // 2. Sales User submits Payment Request with proof
    const bankBefore = generalLedgerService.getAccountLedger(bankGlAccountId, undefined, companyAdminCtx);

    paymentRequest = accountsReceivableService.submitPaymentRequest({
      receiptNumber: 'REQ-WIRE-OMR-001',
      customerId: customerA.id,
      paymentDate: '2026-09-08',
      paymentMethod: 'bank_transfer',
      bankAccountId: bankAccountId,
      amount: '3780.0000',
      reference: 'WIRE-NBO-881920',
      notes: 'Customer transferred full invoice payment via NBO Corporate Banking',
      proofDocumentUrl: 'https://storage.uat-trading.om/proofs/wire-881920.pdf',
      proofDocumentName: 'nbo_transfer_sultanate.pdf',
      allocations: [{ invoiceId, allocatedAmount: '3780.0000' }]
    }, salesUserCtx);

    assert.equal(paymentRequest.status, 'pending_approval');
    assert.equal(paymentRequest.submittedBy, salesUserCtx.userId);

    // Verify no unapproved GL entry
    const bankAfter = generalLedgerService.getAccountLedger(bankGlAccountId, undefined, companyAdminCtx);
    assert.equal(bankAfter.closingBalance, bankBefore.closingBalance);

    // 3. Senior Accountant verifies proof and approves payment
    const approved = accountsReceivableService.approveAndPostPayment(paymentRequest.id, accountantCtx);
    assert.equal(approved.status, 'posted');
    assert.equal(approved.approvedBy, accountantCtx.userId);

    const inv = db.getSalesInvoices(companyAdminCtx).find((i) => i.id === invoiceId);
    assert.equal(inv?.balanceDue, '0.0000');
    assert.equal(inv?.amountPaid, '3780.0000');
  });

  // ==========================================================================
  // PHASE 4: INVENTORY MANAGEMENT & WAREHOUSE MOVEMENTS
  // ==========================================================================
  test('UAT Phase 4.1: Inter-Warehouse Stock Transfer (20 PCS Main WH -> Retail WH)', () => {
    const transfer = inventoryService.createStockTransfer({
      transferNumber: 'TRF-UAT-001',
      fromWarehouseId: mainWarehouseId,
      toWarehouseId: retailWarehouseId,
      transferDate: '2026-09-10',
      status: 'approved',
      requestedBy: warehouseManagerCtx.userId,
      items: [
        {
          id: 'trf-item-1',
          itemId: product1Pcs.id,
          quantity: '20.0000',
          unitCost: '100.0000',
          totalCost: '2000.0000',
        }
      ]
    }, warehouseManagerCtx);

    inventoryService.executeStockTransfer(transfer.id, warehouseManagerCtx);

    const mainBal = inventoryService.getStockBalance(product1Pcs.id, mainWarehouseId, companyAdminCtx);
    const retBal = inventoryService.getStockBalance(product1Pcs.id, retailWarehouseId, companyAdminCtx);

    assert.equal(mainBal.quantity, 80, 'Main Warehouse stock must reduce to 80 PCS (100 - 20)');
    assert.equal(retBal.quantity, 20, 'Retail Warehouse stock must increase to 20 PCS');
  });

  test('UAT Phase 4.2: Physical Stock Count & Shrinkage Adjustment GL Posting (2 PCS Shortage)', () => {
    const adj = inventoryService.createStockAdjustment({
      adjustmentNumber: 'ADJ-SHRINK-001',
      adjustmentDate: '2026-09-11',
      warehouseId: mainWarehouseId,
      reason: 'damage',
      status: 'draft',
      requestedBy: warehouseManagerCtx.userId,
      items: [
        {
          id: 'adj-line-1',
          itemId: product1Pcs.id,
          warehouseId: mainWarehouseId,
          systemQuantity: '80.0000',
          countedQuantity: '78.0000',
          differenceQuantity: '-2.0000',
          unitCost: '100.0000',
          totalVarianceCost: '-200.0000',
        }
      ]
    }, warehouseManagerCtx);

    inventoryService.approveAndPostStockAdjustment(adj.id, accountantCtx);

    const postCountBal = inventoryService.getStockBalance(product1Pcs.id, mainWarehouseId, companyAdminCtx);
    assert.equal(postCountBal.quantity, 78, 'Physical stock in Main Warehouse must equal 78 PCS after shortage post');
  });

  // ==========================================================================
  // PHASE 5: HR & PAYROLL CYCLE
  // ==========================================================================
  test('UAT Phase 5.1: Employee Onboarding with Structured Compensation & PASI Social Security', () => {
    const emp1 = employeeService.createEmployee({
      employeeCode: 'EMP-OMR-001',
      firstName: 'Salim',
      lastName: 'Al-Harthy',
      dateOfBirth: '1988-01-01',
      gender: 'male',
      nationality: 'Omani',
      email: 'salim.harthy@uat-trading.om',
      phone: '+968 9911 2233',
      jobTitle: 'Senior Account Executive',
      joiningDate: '2026-01-01',
      employmentType: 'full_time',
      basicSalary: '1200.0000',
      paymentMethod: 'bank_transfer',
      bankAccountNumber: 'OM99-NBO-0011-2233',
    }, hrPayrollManagerCtx);

    const emp2 = employeeService.createEmployee({
      employeeCode: 'EMP-OMR-002',
      firstName: 'Fatima',
      lastName: 'Al-Balushi',
      dateOfBirth: '1992-05-12',
      gender: 'female',
      nationality: 'Omani',
      email: 'fatima.balushi@uat-trading.om',
      phone: '+968 9944 5566',
      jobTitle: 'Financial Analyst',
      joiningDate: '2026-01-01',
      employmentType: 'full_time',
      basicSalary: '1000.0000',
      paymentMethod: 'bank_transfer',
      bankAccountNumber: 'OM99-BMUS-4455-6677',
    }, hrPayrollManagerCtx);

    emp1Id = emp1.id;
    emp2Id = emp2.id;
    assert.ok(emp1Id);
    assert.ok(emp2Id);
  });

  test('UAT Phase 5.2: Monthly Payroll Execution, Approval & GL Posting', () => {
    const period = payrollService.createPayrollPeriod({
      name: 'September 2026 Regular Salary Cycle',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      payDate: '2026-09-25',
    }, hrPayrollManagerCtx);

    const calculated = payrollService.calculatePeriodPayroll(period.id, hrPayrollManagerCtx);
    assert.ok(calculated.employeeCount >= 2, 'Payroll period must include registered employees');

    const approved = payrollService.approvePayrollPeriod(period.id, companyAdminCtx);
    assert.equal(approved.status, 'approved');

    const posted = payrollService.postPayrollPeriod(period.id, accountantCtx);
    assert.equal(posted.status, 'posted');
    assert.ok(posted.journalEntryId, 'Payroll must link to General Ledger journal');
  });

  // ==========================================================================
  // PHASE 6: FIXED ASSETS LIFECYCLE
  // ==========================================================================
  test('UAT Phase 6.1: Fixed Asset Acquisition, Capitalization, Depreciation & Disposal', () => {
    const assetCategory = assetService.createCategory({
      code: 'CAT-IT-HW',
      name: 'IT Hardware & Compute Nodes',
      assetAccountId: '1510',
      accumDepAccountId: '1520',
      depExpenseAccountId: '6020',
      disposalGainLossAccountId: '4085',
      defaultUsefulLifeMonths: 36,
      defaultResidualValueRate: '0.1000',
      defaultDepreciationMethod: 'straight_line',
      isActive: true,
    }, accountantCtx);

    uatAsset = assetService.createAsset({
      assetCode: 'AST-UAT-SRV-001',
      name: 'Enterprise AI Compute Cluster',
      description: 'Server rack infrastructure node',
      categoryId: assetCategory.id,
      assetType: 'tangible',
      purchaseDate: '2026-09-01',
      originalCost: '6000.0000',
      residualValue: '600.0000',
      usefulLifeMonths: 36,
      depreciationMethod: 'straight_line',
      depreciationFrequency: 'monthly',
      assetAccountId: '1510',
      accumDepAccountId: '1520',
      depExpenseAccountId: '6020',
      custodianName: 'Tariq Al-Balushi',
      location: 'HQ Data Center Rack 4',
      branchId: hqBranchId,
      currency: 'OMR',
      exchangeRate: '1.000000',
      status: 'draft',
    }, accountantCtx);

    assetService.capitalizeAsset(uatAsset.id, {
      capitalizationDate: '2026-09-01',
      inServiceDate: '2026-09-01',
    }, accountantCtx);

    // Run monthly depreciation for September 2026
    const periods = db.getAccountingPeriods(accountantCtx);
    const sepPeriod = periods.find((p) => p.periodNumber === 9) || periods[8] || periods[0];
    const depRun = depreciationService.executeDepreciationRun(sepPeriod.id, 'September 2026 Batch Depreciation', accountantCtx);
    assert.equal(depRun.status, 'posted', 'Depreciation journal must be committed');

    // Dispose asset at residual book value
    const disposal = assetService.disposeAsset(uatAsset.id, {
      disposalDate: '2026-09-28',
      disposalType: 'sale',
      disposalProceeds: '5850.0000',
      bankAccountId: bankAccountId,
      notes: 'Strategic hardware trade-in',
    }, accountantCtx);

    assert.equal(disposal.status, 'posted');
  });

  // ==========================================================================
  // PHASE 7: PROJECT MANAGEMENT & PROJECT ACCOUNTING
  // ==========================================================================
  test('UAT Phase 7.1: Turnkey Project Management, Cost Tracking & Milestone Billing', () => {
    const projectType = projectService.createProjectType({
      code: 'TURNKEY',
      name: 'Turnkey Smart Solutions',
      description: 'Enterprise turn-key infrastructure contracts',
      isActive: true,
    }, companyAdminCtx);

    uatProject = projectService.createProject({
      code: 'PRJ-OMAN-GRID-01',
      name: 'Muscat Smart Infrastructure Project',
      projectTypeId: projectType.id,
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      billingMethod: 'milestone',
      budgetAmount: '50000.0000',
      contractValue: '75000.0000',
      customerName: customerA.name,
      projectManagerName: 'Said Al-Riyami',
    }, companyAdminCtx);

    // Record direct project materials cost
    projectCostService.recordCost({
      projectId: uatProject.id,
      costType: 'material',
      amount: '2500.0000',
      date: '2026-09-15',
      description: 'Control cabling and network transceivers',
      reference: 'MAT-PRJ-001',
    }, accountantCtx);

    // Bill Milestone 1
    const milestone = projectBillingService.createMilestone({
      projectId: uatProject.id,
      name: 'Milestone 1: Architectural Blueprint Approval',
      amount: '25000.0000',
      dueDate: '2026-09-20',
    }, companyAdminCtx);

    projectBillingService.approveMilestone(milestone.id, companyAdminCtx);
    const billResult = projectBillingService.billMilestone(milestone.id, accountantCtx);
    assert.ok(billResult.salesInvoice.id, 'Project milestone billing must generate invoice');

    const prof = projectProfitabilityService.calculateProjectProfitability(uatProject.id, companyAdminCtx);
    assert.ok(parseFloat(prof.totalRevenue) >= 25000, 'Project revenue must reflect billed milestone');
  });

  // ==========================================================================
  // PHASE 8: BANK RECONCILIATION
  // ==========================================================================
  test('UAT Phase 8.1: Bank Statement Import & Reconciliation Matching', () => {
    const statement = bankReconciliationService.importBankStatement({
      bankAccountId,
      statementNumber: 'STMT-SEP-2026-001',
      statementDate: '2026-09-30',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      openingBalance: '0.0000',
      closingBalance: '3765.0000',
      lines: [
        {
          lineDate: '2026-09-04',
          description: 'NBO WIRE TRANSFER INWARD - SULTANATE OIL',
          reference: 'WIRE-NBO-881920',
          amount: '3780.0000',
          debitCredit: 'debit',
          externalTransactionId: 'EXT-WIRE-001',
        },
        {
          lineDate: '2026-09-28',
          description: 'MONTHLY CORPORATE ACCOUNT MAINTENANCE FEE',
          reference: 'CHG-SEP-001',
          amount: '15.0000',
          debitCredit: 'credit',
          externalTransactionId: 'EXT-CHG-001',
        },
      ]
    }, bankCashUserCtx);

    assert.equal(statement.lines.length, 2, 'Statement lines must import correctly');
  });

  // ==========================================================================
  // PHASE 9: TAX & VAT RETURN
  // ==========================================================================
  test('UAT Phase 9.1: Sovereign Tax & VAT Return Compilation and Period Lock', () => {
    const jur = taxConfigurationService.getJurisdictions(accountantCtx)[0] || taxConfigurationService.createJurisdiction({
      code: 'OM-OTA',
      name: 'Oman Tax Authority',
      countryCode: 'OM',
      taxAuthorityName: 'Oman Tax Authority',
      currency: 'OMR',
      isDefault: true,
    }, accountantCtx);

    const taxPeriod = taxReturnService.createPeriod({
      jurisdictionId: jur.id,
      periodCode: 'TAX-2026-Q3',
      periodName: 'Q3 2026 VAT Period',
      frequency: 'quarterly',
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      filingDeadline: '2026-10-31',
    }, accountantCtx);

    const returnDoc = taxReturnService.prepareTaxReturn({
      jurisdictionId: jur.id,
      taxPeriodId: taxPeriod.id,
      priorPeriodAdjustments: '0.0000',
    }, accountantCtx);

    assert.ok(returnDoc.id, 'Tax return must be compiled from subledger');
    const filed = taxReturnService.fileTaxReturn(returnDoc.id, accountantCtx);
    assert.equal(filed.taxReturn.status, 'filed');

    // Lock tax period
    taxReturnService.updatePeriodStatus(taxPeriod.id, 'locked', accountantCtx);
    const lockedPeriod = db.getTaxPeriodById(taxPeriod.id, accountantCtx);
    assert.equal(lockedPeriod?.status, 'locked');
  });

  // ==========================================================================
  // PHASE 10: MONTH-END & YEAR-END CLOSE
  // ==========================================================================
  test('UAT Phase 10.1: Month-End Accruals & Accounting Period Locking', () => {
    const accrual = accrualsPrepaymentsService.createAccrual({
      accrualNumber: 'ACC-SEP-2026-001',
      accrualType: 'expense',
      title: 'Statutory Audit Fees',
      description: 'Accrued Statutory Audit Fees for Q3',
      accrualDate: '2026-09-30',
      effectiveDate: '2026-09-30',
      amount: '500.0000',
      currency: 'OMR',
      exchangeRate: '1.000000',
      debitAccountId: '6080',
      creditAccountId: '2050',
      status: 'draft',
    }, accountantCtx);

    const postedAccrual = accrualsPrepaymentsService.postAccrual(accrual.id, accountantCtx);
    assert.equal(postedAccrual.status, 'posted');

    // Test period lock guard
    const periods = db.getAccountingPeriods(companyAdminCtx);
    const sepPeriod = periods.find((p) => p.startDate <= '2026-09-15' && p.endDate >= '2026-09-15') || periods[0];

    db.setPeriodStatus(sepPeriod.id, 'closed', companyAdminCtx);

    assert.throws(
      () => {
        accountingPostingService.post('MANUAL_JOURNAL', {
          documentDate: sepPeriod.startDate,
          documentNumber: 'JRN-BLOCKED-001',
          memo: 'Unauthorized back-dated entry in closed month',
          currency: 'OMR',
          exchangeRate: '1.000000',
          amount: '500.0000',
          entries: [
            { accountId: bankGlAccountId, debit: '500.0000', credit: '0.0000', description: 'Debit' },
            { accountId: pettyCashAccountId, debit: '0.0000', credit: '500.0000', description: 'Credit' }
          ]
        }, accountantCtx);
      },
      PeriodClosedError,
      'Posting into closed period must be strictly rejected'
    );

    // Reopen period
    db.setPeriodStatus(sepPeriod.id, 'open', companyAdminCtx);
  });

  test('UAT Phase 10.2: Year-End Close Simulation (Nominal Accounts Cleared to Retained Earnings)', () => {
    const fiscalYears = db.getFiscalYears(companyAdminCtx);
    if (fiscalYears.length > 0) {
      const fy = fiscalYears[0];
      const summary = advancedFinancials.getYearEndPreClosingSummary(fy.id, companyAdminCtx);
      assert.ok(summary, 'Year-End pre-closing checklist must compute');

      const closeResult = advancedFinancials.executeYearEndClose(fy.id, fy.endDate, companyAdminCtx);
      assert.ok(closeResult.yearEndClose.id, 'Year-End close must execute and generate closing journal');
    }
  });

  // ==========================================================================
  // PHASE 11: USER ROLE SEGREGATION & VVIP GOVERNANCE
  // ==========================================================================
  test('UAT Phase 11.1: RBAC Permission Enforcement (Management Viewer Read-Only Invariant)', () => {
    const tb = generalLedgerService.getTrialBalance(undefined, managementViewerCtx);
    assert.ok(tb.rows.length > 0, 'Management Viewer can inspect Trial Balance');

    assert.throws(
      () => {
        permissionService.assertPermission(managementViewerCtx, 'accounting.journal.post');
      },
      UnauthorizedAccessError,
      'Management Viewer must be prevented from financial mutations'
    );
  });

  test('UAT Phase 11.2: VVIP Super Admin Tenant Freeze & Complete Write-Block Protection', () => {
    // 1. Company Admin cannot suspend tenant
    assert.throws(
      () => db.updateCompanyStatus(uatCompanyId, 'suspended', companyAdminCtx),
      TenantViolationError,
      'Only VVIP Super Admin can suspend company'
    );

    // 2. VVIP Super Admin suspends tenant
    db.updateCompanyStatus(uatCompanyId, 'suspended', vvipSuperAdminCtx);

    // 3. Write mutation blocked
    assert.throws(
      () => db.createCustomer({
        code: 'CUST-FROZEN-001',
        name: 'Forbidden Frozen Customer',
        currency: 'OMR',
        creditLimit: '1000.0000',
        paymentTermsDays: 15,
        isActive: true,
        currentBalance: '0.0000',
      }, companyAdminCtx),
      TenantViolationError,
      'All write operations must be rejected when company is suspended'
    );

    // 4. Reactivate company
    db.updateCompanyStatus(uatCompanyId, 'active', vvipSuperAdminCtx);
  });

  // ==========================================================================
  // PHASE 12: TENANT ISOLATION BOUNDARY VERIFICATION
  // ==========================================================================
  test('UAT Phase 12.1: Multi-Tenant Data Isolation & Cross-Company Breach Prevention', () => {
    assert.throws(
      () => db.getCustomerById(customerA.id, compBAdminCtx),
      TenantViolationError,
      'Cross-tenant access must throw TenantViolationError'
    );

    assert.throws(
      () => db.updateCustomer(customerA.id, { name: 'Compromised Breach Customer' }, compBAdminCtx),
      TenantViolationError,
      'Cross-tenant modification must be blocked'
    );
  });

  // ==========================================================================
  // PHASE 13: 10-POINT SUB-LEDGER RECONCILIATION & MATHEMATICAL INVARIANTS
  // ==========================================================================
  test('UAT Phase 13.1: 10-Point Central Sub-Ledger Reconciliation (All Variances == 0.0000)', () => {
    // Point 1: Accounts Receivable Control Reconciled (GL 1100/1200 vs AR Subledger)
    const reconAR = subLedgerService.reconcileSubLedger('customer', companyAdminCtx);
    assert.equal(reconAR.isReconciled, true, `AR variance must be 0, got ${reconAR.variance}`);

    // Point 2: Accounts Payable Control Reconciled (GL 2100/2010 vs AP Subledger)
    const reconAP = subLedgerService.reconcileSubLedger('supplier', companyAdminCtx);
    assert.equal(reconAP.isReconciled, true, `AP variance must be 0, got ${reconAP.variance}`);

    // Point 3: Bank & Cash Accounts Reconciled (GL 1010/1020 vs Bank Register)
    const reconBank = subLedgerService.reconcileSubLedger('bank_account', companyAdminCtx);
    assert.equal(reconBank.isReconciled, true, `Bank variance must be 0, got ${reconBank.variance}`);

    // Point 4: Inventory Asset Valuation Reconciled (GL 1300 vs Inventory Register)
    const reconInv = subLedgerService.reconcileSubLedger('inventory_item', companyAdminCtx);
    assert.equal(reconInv.isReconciled, true, `Inventory variance must be 0, got ${reconInv.variance}`);

    // Point 5: Fixed Asset Cost & Accum Depreciation Reconciled (GL 1500/1510 vs Asset Register)
    const reconFA = subLedgerService.reconcileSubLedger('fixed_asset', companyAdminCtx);
    assert.equal(reconFA.isReconciled, true, `Fixed Asset variance must be 0, got ${reconFA.variance}`);

    // Point 6: Payroll & Statutory Clearing Reconciled (GL 2200/2300 vs Payroll Subledger)
    const reconPR = subLedgerService.reconcileSubLedger('employee', companyAdminCtx);
    assert.equal(reconPR.isReconciled, true, `Payroll variance must be 0, got ${reconPR.variance}`);

    // Point 7: Tax / VAT Control Reconciled (GL 2150/2200 vs Tax Subledger)
    const reconTax = subLedgerService.reconcileSubLedger('tax_code', companyAdminCtx);
    assert.equal(reconTax.isReconciled, true, `Tax variance must be 0, got ${reconTax.variance}`);

    // Point 8: Intercompany Clearing Reconciled (GL 1900/1220 vs Intercompany Subledger)
    const reconIC = subLedgerService.reconcileSubLedger('intercompany', companyAdminCtx);
    assert.equal(reconIC.isReconciled, true, `Intercompany variance must be 0, got ${reconIC.variance}`);

    // Point 9: GRNI / Accrued Purchases Clearing Account Reconciled
    const grniAcc = db.getAccounts(companyAdminCtx).find((a) => a.code === '2110');
    if (grniAcc) {
      const ledger = generalLedgerService.getAccountLedger(grniAcc.id, undefined, companyAdminCtx);
      assert.equal(parseFloat(ledger.closingBalance), 0, 'GRNI accrued liability must balance cleanly');
    }

    // Point 10: Suspense / Clearing Zero Balance Verification
    const suspenseAcc = db.getAccounts(companyAdminCtx).find((a) => a.code === '9999');
    if (suspenseAcc) {
      const ledger = generalLedgerService.getAccountLedger(suspenseAcc.id, undefined, companyAdminCtx);
      assert.equal(parseFloat(ledger.closingBalance), 0, 'Suspense account balance must remain exactly zero');
    }
  });

  test('UAT Phase 13.2: Trial Balance Equality (Debits == Credits) & Balance Sheet Equilibrium', () => {
    const tb = generalLedgerService.getTrialBalance(undefined, companyAdminCtx);
    const deb = parseFloat(tb.totalClosingDebit);
    const cred = parseFloat(tb.totalClosingCredit);

    assert.equal(tb.isBalanced, true, 'Trial balance must be mathematically balanced');
    assert.equal(deb.toFixed(2), cred.toFixed(2), 'Debits must equal Credits');

    const bs = generalLedgerService.getBalanceSheet(undefined, companyAdminCtx);
    const assets = parseFloat(bs.totalAssets);
    const liabEquity = parseFloat(bs.totalLiabilitiesAndEquity);

    assert.equal(bs.isBalanced, true, 'Balance sheet must balance: Assets = Liabilities + Equity');
    assert.equal(assets.toFixed(2), liabEquity.toFixed(2), 'Assets must equal Liabilities + Equity');
  });
});
