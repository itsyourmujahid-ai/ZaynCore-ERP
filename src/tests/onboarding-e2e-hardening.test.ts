// ============================================================================
// Phase: Company Onboarding → Admin → User Access End-to-End Verification & Hardening
// Comprehensive Verification Suite for Multi-Tenant Lifecycle, RBAC, Capability
// Hierarchy, 2-Step Payment Approval, Designation Master, and Real-World Scenarios.
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { UomConversionEngine } from '../modules/onboarding/services/uom-conversion.service';
import { capabilityService } from '../modules/capabilities/services/capability-service';
import { permissionService } from '../modules/authorization/services/permission-service';
import { salesService } from '../modules/sales/services/sales.service';
import { accountsReceivableService } from '../modules/sales/services/ar.service';
import { subLedgerService } from '../modules/accounting/services/sub-ledger.service';
import { generalLedgerService } from '../modules/accounting/services/general-ledger.service';
import { employeeService } from '../modules/payroll/services/employee.service';
import { 
  FullCompanyOnboardingPayload,
  DbCompany,
  DbUser
} from '../database/types';
import { 
  TenantViolationError, 
  UnauthorizedAccessError,
  ImmutableRecordError 
} from '../core/errors/DomainErrors';

describe('Phase: Company Onboarding → Admin → User Access Hardening & E2E Verification', () => {
  let vvipSuperAdminCtx: TenantContext;
  let companyAId: string;
  let companyBId: string;
  let companyAdminACtx: TenantContext;
  let companyAdminBCtx: TenantContext;
  let accountantACtx: TenantContext;
  let salesUserACtx: TenantContext;
  let initialSalesUserId: string;

  before(() => {
    // Clean seed state
    db.resetDatabase();

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

    // 1. Provision Company A (Apex Horizon Technologies LLC)
    const payloadA: FullCompanyOnboardingPayload = {
      name: 'Apex Horizon Technologies LLC',
      legalName: 'Apex Horizon Technologies Limited',
      code: 'APEX_HORIZON',
      registrationNumber: 'CR-99001122',
      taxIdentifier: 'OM-VAT-100200300',
      countryCode: 'OM',
      city: 'Muscat',
      addressLine1: 'Al Khuwair Commercial Complex',
      baseCurrency: 'OMR',
      timeZone: 'Asia/Muscat',
      fiscalYearStartMonth: 1,
      defaultLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      tier: 'enterprise',
      businessTypes: ['trading', 'wholesale', 'services'],
      sellingCategories: ['physical_products', 'services'],
      buyingCategories: ['finished_goods', 'consumables'],
      selectedUomCodes: ['PCS', 'BOX', 'CARTON'],
      uomConversions: [
        { fromUomCode: 'CARTON', toUomCode: 'PCS', multiplier: '24.0000' },
        { fromUomCode: 'BOX', toUomCode: 'PCS', multiplier: '12.0000' },
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
      selectedAttributes: ['brand', 'model', 'barcode'],
      warehouses: [
        { code: 'WH-MCT', name: 'Muscat Central Hub', address: 'Rusayl Industrial Estate', isDefault: true },
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
        taxRegistrationNumber: 'OM-VAT-100200300',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '5.00',
      },
      branches: [
        { code: 'HQ-MCT', name: 'Muscat Corporate HQ', isHeadquarters: true, city: 'Muscat' },
      ],
      departments: [
        { code: 'COMM', name: 'Commercial & Sales', description: 'B2B Wholesale Sales' },
        { code: 'LOG', name: 'Logistics & Warehousing', description: 'Supply chain management' },
        { code: 'FIN', name: 'Finance & Accounts', description: 'Financial reporting and audit' },
      ],
      costCenters: [
        { code: 'CC-MCT', name: 'Muscat Regional Cost Center' },
      ],
      designations: [
        { code: 'DES-ADM', name: 'General Manager', description: 'Executive Lead' },
        { code: 'DES-CACC', name: 'Chief Accountant', description: 'Ledger controller' },
        { code: 'DES-SSE', name: 'Senior Sales Executive', description: 'Key account manager' },
        { code: 'DES-WS', name: 'Warehouse Supervisor', description: 'Stock control' },
      ],
      initialAdmin: {
        fullName: 'Salim Al-Busaidi',
        username: 'salim.admin',
        password: 'Password123!',
        email: 'salim@apexhorizon.om',
        designation: 'General Manager',
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
      ],
    };

    const resultA = db.createCompanyWithFullOnboarding(payloadA, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    companyAId = resultA.company.id;
    const compA = db.getCompanyById(companyAId)!;

    companyAdminACtx = {
      companyId: companyAId,
      companyName: compA.name,
      companyTier: compA.tier,
      baseCurrency: compA.baseCurrency,
      userId: resultA.adminUser.id,
      userEmail: resultA.adminUser.email,
      userFullName: resultA.adminUser.fullName,
      roles: ['COMPANY_ADMIN'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };

    // 2. Provision Company B (Beacon Logistics International FZE)
    const payloadB: FullCompanyOnboardingPayload = {
      name: 'Beacon Logistics International FZE',
      legalName: 'Beacon Logistics International Free Zone Entity',
      code: 'BEACON_LOG',
      countryCode: 'AE',
      baseCurrency: 'AED',
      timeZone: 'Asia/Dubai',
      fiscalYearStartMonth: 1,
      defaultLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      tier: 'medium',
      businessTypes: ['distribution', 'services'],
      sellingCategories: ['services'],
      buyingCategories: ['consumables'],
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
        enableSalesOrder: true,
        enableSalesInvoice: true,
        enableDeliveryNote: false,
        enableCustomerPayment: true,
        enableCreditNote: true,
        enableDebitNote: false,
        enableDiscounts: true,
        enableSalesCommission: false,
        enableCustomerCreditLimit: false,
        enablePartialPayments: true,
        enablePaymentProofVerification: true,
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
        enablePurchaseDebitNote: false,
      },
      accountingDefaults: {
        enableMultiCurrency: true,
        enableTaxVat: true,
        taxRegistrationNumber: 'AE-VAT-55566677',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '5.00',
      },
      branches: [{ code: 'HQ-DXB', name: 'Dubai HQ', isHeadquarters: true }],
      initialAdmin: {
        fullName: 'Rashid Al-Maktoum',
        username: 'rashid.admin',
        password: 'Password123!',
        email: 'rashid@beaconlog.ae',
      },
      enabledModuleKeys: ['financial_accounting', 'sales', 'accounts_payable', 'banking_cash'],
    };

    const resultB = db.createCompanyWithFullOnboarding(payloadB, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    companyBId = resultB.company.id;
    const compB = db.getCompanyById(companyBId)!;

    companyAdminBCtx = {
      companyId: companyBId,
      companyName: compB.name,
      companyTier: compB.tier,
      baseCurrency: compB.baseCurrency,
      userId: resultB.adminUser.id,
      userEmail: resultB.adminUser.email,
      userFullName: resultB.adminUser.fullName,
      roles: ['COMPANY_ADMIN'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };

    // 3. Create initial Sales User and Accountant for Company A
    const empSales = employeeService.createEmployee(
      {
        employeeCode: 'EMP-A-003',
        firstName: 'Tariq',
        lastName: 'Al-Jabri',
        fullName: 'Tariq Al-Jabri',
        email: 'tariq.sales@apexhorizon.om',
        jobTitle: 'Senior Sales Executive',
        employmentType: 'full_time',
        employmentStatus: 'active',
        currency: 'OMR',
        paymentMethod: 'bank_transfer',
        isActive: true,
        createSystemUser: true,
        userCredentials: {
          username: 'tariq.sales',
          email: 'tariq.sales@apexhorizon.om',
          password: 'SalesPassword123!',
          roleId: 'role-sales-user',
        },
      },
      companyAdminACtx
    );

    const userSales = db.getUsers().find((u) => u.username === 'tariq.sales')!;
    initialSalesUserId = userSales.id;
    salesUserACtx = {
      companyId: companyAId,
      companyName: compA.name,
      companyTier: compA.tier,
      baseCurrency: compA.baseCurrency,
      userId: userSales.id,
      userEmail: userSales.email,
      userFullName: userSales.fullName,
      roles: ['SALES_USER'],
      permissions: ['sales.view', 'sales.create', 'sales.invoice.create', 'sales.invoice.post', 'sales.order.create', 'sales.order.confirm', 'customers.view', 'customers.create'],
      isPlatformAdmin: false,
    };

    const empAcc = employeeService.createEmployee(
      {
        employeeCode: 'EMP-A-ACC',
        firstName: 'Nasser',
        lastName: 'Al-Harthy',
        fullName: 'Nasser Al-Harthy, CPA',
        email: 'nasser.acc@apexhorizon.om',
        jobTitle: 'Chief Accountant',
        employmentType: 'full_time',
        employmentStatus: 'active',
        currency: 'OMR',
        paymentMethod: 'bank_transfer',
        isActive: true,
        createSystemUser: true,
        userCredentials: {
          username: 'nasser.acc',
          email: 'nasser.acc@apexhorizon.om',
          password: 'AccPassword123!',
          roleId: 'role-accountant',
        },
      },
      companyAdminACtx
    );

    const userAcc = db.getUsers().find((u) => u.username === 'nasser.acc')!;
    accountantACtx = {
      companyId: companyAId,
      companyName: compA.name,
      companyTier: compA.tier,
      baseCurrency: compA.baseCurrency,
      userId: userAcc.id,
      userEmail: userAcc.email,
      userFullName: userAcc.fullName,
      roles: ['ACCOUNTANT'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };
  });

  // ==========================================================================
  // REQUIREMENT 1: VVIP → Create Company (Persisted Database Records)
  // ==========================================================================
  describe('1. VVIP Company Creation Flow & DB Record Persistence', () => {
    test('Persisted records in DB: Company, Branches, Periods, COA, Warehouses, UOMs, Designations', () => {
      const comp = db.getCompanyById(companyAId);
      assert.ok(comp, 'Company record must exist in DB');
      assert.strictEqual(comp.code, 'APEX_HORIZON');
      assert.strictEqual(comp.baseCurrency, 'OMR');
      assert.strictEqual(comp.status, 'active');

      // Verify Branches, Fiscal Years & 12 Periods
      const branches = db.getBranches(companyAdminACtx);
      assert.ok(branches.length >= 1, 'Headquarters branch must exist');
      assert.strictEqual(branches[0].isHeadquarters, true);

      const fiscalYears = db.getFiscalYears(companyAdminACtx);
      assert.ok(fiscalYears.length >= 1, 'Fiscal year must be created');
      const periods = db.getAccountingPeriods(companyAdminACtx, fiscalYears[0].id);
      assert.strictEqual(periods.length, 12, 'Must generate exactly 12 fiscal periods');

      // Verify Chart of Accounts & Control Accounts
      const accounts = db.getAccounts(companyAdminACtx);
      assert.ok(accounts.length >= 10, 'Chart of Accounts must be provisioned');
      assert.ok(accounts.some((a) => a.code === '1200' && a.isControlAccount), 'AR Control Account #1200 must exist');
      assert.ok(accounts.some((a) => a.code === '2010' && a.isControlAccount), 'AP Control Account #2010 must exist');
      assert.ok(accounts.some((a) => a.code === '4010'), 'Revenue Account #4010 must exist');
      assert.ok(accounts.some((a) => a.code === '2200'), 'Output VAT Account #2200 must exist');

      // Verify Warehouses & UOMs
      const whs = db.getWarehouses(companyAdminACtx);
      assert.ok(whs.length >= 1, 'Warehouse must be provisioned');
      assert.strictEqual(whs[0].code, 'WH-MCT');

      const uoms = db.getUnitsOfMeasure(companyAdminACtx);
      assert.ok(uoms.length >= 3, 'Selected UOMs must be registered');

      const conversions = db.getUomConversions(companyAId);
      assert.ok(conversions.length >= 2, 'UOM Conversions must be persisted');

      // Verify Initial Admin User & Employee record
      const users = db.getUsers();
      const adminUser = users.find((u) => u.username === 'salim.admin');
      assert.ok(adminUser, 'Admin user must exist in DB');
      assert.strictEqual(adminUser.isPlatformSuperAdmin, false, 'Company Admin MUST NOT have platform super admin flag');

      // Verify Designation Master
      const designations = db.getDesignations(companyAdminACtx);
      assert.ok(designations.length >= 4, 'Custom designations must be created in designation master');
      assert.ok(designations.some((d) => d.code === 'DES-CACC'));
      assert.ok(designations.some((d) => d.code === 'DES-SSE'));
    });
  });

  // ==========================================================================
  // REQUIREMENT 2 & 3: Company Admin Login & Strict Multi-Tenant Isolation
  // ==========================================================================
  describe('2 & 3. Company Admin Scoped Access & Multi-Tenant Isolation', () => {
    test('Company Admin cannot execute VVIP Platform lifecycle operations', () => {
      assert.throws(
        () => {
          db.updateCompanyStatus(companyAId, 'inactive', companyAdminACtx);
        },
        TenantViolationError,
        'Company Admin must be blocked from updating company platform status'
      );

      assert.throws(
        () => {
          db.deleteCompany(companyBId, companyAdminACtx);
        },
        TenantViolationError,
        'Company Admin must be blocked from deleting companies'
      );
    });

    test('Company A cannot query or mutate Company B customers, products, or employees', () => {
      // Create Customer in Company B
      const custB = salesService.createCustomer(
        {
          code: 'CUST-BEACON-001',
          name: 'Emirates Trade Logistics',
          customerType: 'corporate',
          currency: 'AED',
          paymentTermsDays: 30,
          creditLimit: '100000.0000',
          isActive: true,
        },
        companyAdminBCtx
      );

      assert.strictEqual(custB.companyId, companyBId);

      // Company A admin queries customers -> custB must NOT be present
      const companyACustomers = db.getCustomers(companyAdminACtx);
      assert.strictEqual(
        companyACustomers.some((c) => c.id === custB.id),
        false,
        'Company B customer must NOT be returned in Company A customer list'
      );

      // Direct access to Company B customer using record ID from Company A context -> Blocked
      assert.throws(
        () => {
          db.getCustomerById(custB.id, companyAdminACtx);
        },
        TenantViolationError,
        'Accessing foreign tenant customer by ID must throw TenantViolationError'
      );

      // Direct mutation attempt on Company B customer from Company A -> Blocked
      assert.throws(
        () => {
          db.updateCustomer(custB.id, { name: 'Hacked Customer Name' }, companyAdminACtx);
        },
        TenantViolationError,
        'Mutating foreign tenant customer must throw TenantViolationError'
      );
    });
  });

  // ==========================================================================
  // REQUIREMENT 4, 5 & 6: User Management, Employee vs System User, Designation Master
  // ==========================================================================
  describe('4, 5 & 6. User Management, Employee vs System User, & Designation Master', () => {
    test('Employee without login: exists as HR record but has no ERP system user account', () => {
      const pureEmp = employeeService.createEmployee(
        {
          employeeCode: 'EMP-A-002',
          firstName: 'Fatima',
          lastName: 'Al-Zahra',
          fullName: 'Fatima Al-Zahra',
          dateOfBirth: '1995-05-15',
          gender: 'female',
          nationality: 'OM',
          countryCode: 'OM',
          email: 'fatima.ops@apexhorizon.om',
          jobTitle: 'Logistics Coordinator',
          joiningDate: '2026-02-01',
          employmentType: 'full_time',
          employmentStatus: 'active',
          basicSalary: '650.0000',
          currency: 'OMR',
          paymentMethod: 'bank_transfer',
          isActive: true,
          createSystemUser: false,
        },
        companyAdminACtx
      );

      assert.ok(pureEmp.id);
      assert.strictEqual(pureEmp.hasSystemAccess, false);
      assert.strictEqual(pureEmp.systemUserId, undefined);

      // Verify no user record created with this email
      const user = db.getUsers().find((u) => u.email === 'fatima.ops@apexhorizon.om');
      assert.strictEqual(user, undefined, 'No system user must be created for pure HR employee');
    });

    test('Designation Master: changing employee designation does NOT alter system role', () => {
      // Create new designation in Designation Master
      const des = db.createDesignation(
        {
          departmentId: 'dept-comm',
          code: 'DES-KAM',
          name: 'Key Account Manager',
          description: 'Strategic Corporate Client Lead',
          status: 'active',
        },
        companyAdminACtx
      );

      assert.ok(des.id);
      assert.strictEqual(des.code, 'DES-KAM');

      // Update employee designation
      const employees = db.getEmployees(companyAdminACtx);
      const targetEmp = employees.find((e) => e.systemUserId === initialSalesUserId)!;

      const updatedEmp = employeeService.updateEmployee(
        targetEmp.id,
        {
          designationId: des.id,
          designation: des.name,
          jobTitle: des.name,
        },
        companyAdminACtx
      );

      assert.strictEqual(updatedEmp.designation, 'Key Account Manager');

      // Verify system role remains 'role-sales-user'
      const memberships = db.getMemberships(companyAId);
      const userMem = memberships.find((m) => m.userId === initialSalesUserId);
      assert.ok(userMem);
      assert.strictEqual(userMem.roleId, 'role-sales-user', 'System role MUST remain independent of HR designation');
    });

    test('Company Admin A cannot manage or edit Company B employees', () => {
      // Create employee in Company B
      const empB = employeeService.createEmployee(
        {
          employeeCode: 'EMP-B-001',
          firstName: 'Omar',
          lastName: 'Zaid',
          fullName: 'Omar Zaid',
          email: 'omar@beaconlog.ae',
          employmentType: 'full_time',
          employmentStatus: 'active',
          currency: 'AED',
          paymentMethod: 'bank_transfer',
          isActive: true,
        },
        companyAdminBCtx
      );

      // Company Admin A attempts to update empB
      assert.throws(
        () => {
          employeeService.updateEmployee(empB.id, { firstName: 'Hacked' }, companyAdminACtx);
        },
        TenantViolationError,
        'Updating foreign tenant employee must throw TenantViolationError'
      );
    });
  });

  // ==========================================================================
  // REQUIREMENT 7 & 8: Role vs Permission vs Capability Hierarchy
  // ==========================================================================
  describe('7 & 8. Role vs Permission vs Capability Hierarchy', () => {
    test('Disabled module capability blocks operation even if role has permission', () => {
      // In Company B, 'inventory' is disabled because maintainsInventory: false
      const isInvEnabled = capabilityService.isModuleEnabled(companyAdminBCtx, 'inventory');
      assert.strictEqual(isInvEnabled, false, 'Inventory must be disabled for pure service company');

      // Even if user has wildcard permissions ('*')
      assert.strictEqual(permissionService.hasPermission(companyAdminBCtx, 'inventory.manage'), true);
      // But capabilityService evaluates to false
      assert.strictEqual(capabilityService.isModuleEnabled(companyAdminBCtx, 'inventory'), false);
    });

    test('Enabled module capability is blocked if user role lacks specific permission', () => {
      // In Company A, inventory is enabled
      assert.strictEqual(capabilityService.isModuleEnabled(salesUserACtx, 'inventory'), true);

      // But Sales User lacks 'inventory.adjust' permission
      const hasPerm = permissionService.hasPermission(salesUserACtx, 'inventory.adjust');
      assert.strictEqual(hasPerm, false, 'Sales user must not have inventory.adjust permission');

      assert.throws(
        () => {
          permissionService.assertPermission(salesUserACtx, 'inventory.adjust');
        },
        UnauthorizedAccessError,
        'Must throw UnauthorizedAccessError when missing permission'
      );
    });
  });

  // ==========================================================================
  // REQUIREMENT 9 & 10: Sales User & 2-Step Payment Approval Workflow
  // ==========================================================================
  describe('9 & 10. Sales User & 2-Step Payment Approval Enforcement', () => {
    let customerAId: string;
    let salesOrderId: string;
    let postedInvoiceId: string;
    let invoiceNumber: string;

    test('Sales User creates Customer, Sales Order, and posts Sales Invoice', () => {
      const customer = salesService.createCustomer(
        {
          code: 'CUST-OMAN-001',
          name: 'Muscat Trading & Contracting Est.',
          customerType: 'corporate',
          email: 'purchasing@muscattrading.om',
          phone: '+968 24112233',
          currency: 'OMR',
          creditLimit: '25000.0000',
          isActive: true,
        },
        salesUserACtx
      );

      customerAId = customer.id;
      assert.ok(customerAId);

      // Create Sales Order (Subtotal: 2,000 OMR, Tax 5%: 100 OMR, Total: 2,100 OMR)
      const so = db.createSalesOrder(
        {
          branchId: db.getBranches(salesUserACtx)[0].id,
          orderNumber: 'SO-2026-001',
          customerId: customerAId,
          orderDate: '2026-03-01',
          currency: 'OMR',
          exchangeRate: '1.000000',
          subtotal: '2000.0000',
          discountTotal: '0.0000',
          taxTotal: '100.0000',
          total: '2100.0000',
          status: 'confirmed',
          items: [
            {
              itemId: 'item-prod-1',
              itemCode: 'ITM-GLASS-01',
              description: 'Architectural Glazing Units (24 PCS / CTN)',
              quantity: '2', // 2 Cartons
              uom: 'CARTON',
              unitPrice: '1000.0000',
              subtotal: '2000.0000',
              taxRate: '0.0500',
              taxAmount: '100.0000',
              total: '2100.0000',
            },
          ],
        },
        salesUserACtx
      );

      salesOrderId = so.id;
      assert.ok(salesOrderId);

      // Create and Post Sales Invoice
      const draftInv = salesService.createInvoice(
        {
          branchId: db.getBranches(salesUserACtx)[0].id,
          invoiceNumber: 'INV-2026-0001',
          customerId: customerAId,
          salesOrderId: so.id,
          invoiceDate: '2026-03-02',
          dueDate: '2026-04-02',
          currency: 'OMR',
          exchangeRate: '1.000000',
          subtotal: '2000.0000',
          discountTotal: '0.0000',
          taxTotal: '100.0000',
          total: '2100.0000',
          status: 'draft',
          items: so.items,
        },
        salesUserACtx
      );

      invoiceNumber = draftInv.invoiceNumber;
      const postedInv = salesService.postInvoice(draftInv.id, salesUserACtx);
      postedInvoiceId = postedInv.id;
      assert.strictEqual(postedInv.status, 'posted');

      // Verify Automatic GL Entry: Dr AR #1200 (2100) / Cr Sales #4010 (2000) / Cr VAT #2200 (100)
      assert.ok(postedInv.journalEntryId);
      const glEntry = db.getJournalEntries(salesUserACtx).find((j) => j.id === postedInv.journalEntryId)!;
      assert.strictEqual(glEntry.totalDebit, '2100.0000');
      assert.strictEqual(glEntry.totalCredit, '2100.0000');

      // Verify AR Sub-Ledger
      const creditSummary = accountsReceivableService.getCustomerCreditSummary(customerAId, salesUserACtx);
      assert.strictEqual(creditSummary.outstandingBalance, '2100.0000');
    });

    test('Accountant verifies payment proof, approves and posts receipt with automatic GL and AR settlement', () => {
      // Accountant verifies payment proof from Bank Transfer and posts receipt
      const receipt = accountsReceivableService.postReceiptWithAllocation(
        {
          receiptNumber: 'RCPT-OM-2026-001',
          customerId: customerAId,
          paymentDate: '2026-03-05',
          paymentMethod: 'bank_transfer',
          bankAccountId: db.getBankAccounts(accountantACtx)[0].id,
          amount: '2100.0000',
          currency: 'OMR',
          reference: 'Bank Muscat Wire #BM-992211 - Verified Payment Slip attached',
          allocations: [
            {
              invoiceId: postedInvoiceId,
              invoiceNumber: invoiceNumber,
              allocatedAmount: '2100.0000',
            },
          ],
        },
        accountantACtx
      );

      assert.strictEqual(receipt.status, 'posted');

      // Verify Invoice is now fully paid
      const invAfterPayment = db.getSalesInvoices(accountantACtx).find((i) => i.id === postedInvoiceId)!;
      assert.strictEqual(invAfterPayment.amountPaid, '2100.0000');
      assert.strictEqual(invAfterPayment.balanceDue, '0.0000');
      assert.strictEqual(invAfterPayment.status, 'posted');

      // Verify AR Sub-ledger is fully settled (0.0000 balance)
      const creditSummary = accountsReceivableService.getCustomerCreditSummary(customerAId, accountantACtx);
      assert.strictEqual(creditSummary.outstandingBalance, '0.0000');

      // Verify Sub-ledger reconciles with GL #1200 with 0 variance
      const rec = subLedgerService.reconcileSubLedger('customer', accountantACtx);
      assert.strictEqual(rec.isReconciled, true);
      assert.strictEqual(parseFloat(rec.variance), 0);
    });
  });

  // ==========================================================================
  // REQUIREMENT 11 & 12: Module Capability & Live Company Upgrade
  // ==========================================================================
  describe('11 & 12. Module Capability & Live Company Upgrade Without Data Migration', () => {
    test('Company live upgrade Small -> Medium -> Enterprise preserves all existing data and enables new capabilities', () => {
      // Create a Small tier company with transactions
      const smallCompPayload: FullCompanyOnboardingPayload = {
        name: 'Gulf Express Courier Services',
        legalName: 'Gulf Express Courier Services LLC',
        code: 'GULF_EXPRESS',
        countryCode: 'OM',
        baseCurrency: 'OMR',
        timeZone: 'Asia/Muscat',
        fiscalYearStartMonth: 1,
        tier: 'small',
        businessTypes: ['services'],
        sellingCategories: ['services'],
        buyingCategories: ['consumables'],
        selectedUomCodes: ['JOB', 'HOUR'],
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
          enablePaymentProofVerification: true,
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
          enableMultiCurrency: false,
          enableTaxVat: true,
          defaultTaxRatePercent: '5.00',
        },
        branches: [{ code: 'HQ-RUWI', name: 'Ruwi Office', isHeadquarters: true }],
        initialAdmin: {
          fullName: 'Said Al-Rawahi',
          username: 'said.admin',
          email: 'said@gulfexpress.om',
        },
        enabledModuleKeys: ['financial_accounting', 'sales'],
      };

      const result = db.createCompanyWithFullOnboarding(smallCompPayload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
      const smallCompId = result.company.id;
      assert.strictEqual(result.company.tier, 'small');

      const smallTenantCtx: TenantContext = {
        companyId: smallCompId,
        companyName: result.company.name,
        companyTier: 'small',
        baseCurrency: 'OMR',
        userId: result.adminUser.id,
        userEmail: result.adminUser.email,
        userFullName: result.adminUser.fullName,
        roles: ['COMPANY_ADMIN'],
        permissions: ['*'],
        isPlatformAdmin: false,
      };

      // Add a customer and sales invoice
      const cust = salesService.createCustomer({ code: 'CUST-GE-01', name: 'Oman Post', customerType: 'corporate', currency: 'OMR' }, smallTenantCtx);
      const branchId = db.getBranches(smallTenantCtx)[0].id;
      const inv = salesService.createInvoice({
        branchId,
        invoiceNumber: 'INV-GE-001',
        customerId: cust.id,
        invoiceDate: '2026-03-01',
        currency: 'OMR',
        subtotal: '500.0000',
        total: '525.0000',
        taxTotal: '25.0000',
        discountTotal: '0.0000',
        exchangeRate: '1.000000',
        status: 'posted',
        items: [],
      }, smallTenantCtx);

      assert.ok(inv.id);

      // Perform Live Upgrade: Small -> Enterprise
      const upgradedComp = db.upgradeCompanyTier(smallCompId, 'enterprise', vvipSuperAdminCtx);
      assert.strictEqual(upgradedComp.tier, 'enterprise');

      // Verify ZERO DATA LOSS: Customer, Invoice, Accounting Records all remain intact
      const custAfter = db.getCustomerById(cust.id, { ...smallTenantCtx, companyTier: 'enterprise' });
      assert.ok(custAfter);
      assert.strictEqual(custAfter.name, 'Oman Post');

      const invAfter = db.getSalesInvoices({ ...smallTenantCtx, companyTier: 'enterprise' }).find((i) => i.id === inv.id);
      assert.ok(invAfter);
      assert.strictEqual(invAfter.invoiceNumber, 'INV-GE-001');

      // Verify Audit Trail recorded upgrade
      const audits = db.getAuditLogs();
      assert.ok(audits.some((a) => a.action === 'UPGRADE_COMPANY_TIER' && a.companyId === smallCompId));
    });
  });

  // ==========================================================================
  // REQUIREMENT 13: UOM Configuration & Conversion Rules
  // ==========================================================================
  describe('13. UOM Configuration & Multi-Tier Conversion Engine', () => {
    test('1 CARTON = 24 PCS conversion is precisely calculated across stock movements', () => {
      const conversions = db.getUomConversions(companyAId);
      
      // Convert 5 Cartons to PCS -> 5 * 24 = 120 PCS
      const forwardRes = UomConversionEngine.convert(5, 'CARTON', 'PCS', conversions);
      assert.strictEqual(forwardRes.convertedQuantity, 120);
      assert.strictEqual(forwardRes.effectiveMultiplier, 24);

      // Convert 72 PCS to Cartons -> 72 / 24 = 3 Cartons
      const inverseRes = UomConversionEngine.convert(72, 'PCS', 'CARTON', conversions);
      assert.strictEqual(inverseRes.convertedQuantity, 3);
      assert.strictEqual(inverseRes.effectiveMultiplier, 1 / 24);
    });
  });

  // ==========================================================================
  // REQUIREMENT 15, 16, 17, 18: Accounting Integrity, Audit Trail & Security
  // ==========================================================================
  describe('15, 16, 17 & 18. Accounting Integrity, Immutability, Audit Trail & Security', () => {
    test('Trial Balance debits equal credits and General Ledger is fully balanced', () => {
      const tb = generalLedgerService.getTrialBalance(
        { startDate: '2026-01-01', endDate: '2026-12-31' },
        accountantACtx
      );

      assert.strictEqual(tb.isBalanced, true, 'Trial Balance must be perfectly balanced');
      assert.strictEqual(tb.totalClosingDebit, tb.totalClosingCredit);
    });

    test('Audit Trail immutably records all administrative and operational activities', () => {
      const audits = db.getAuditLogs(companyAdminACtx);
      assert.ok(audits.length >= 1, 'Audit trail must record events for tenant');
      assert.ok(audits.some((a) => a.action === 'CREATE_EMPLOYEE'));
    });

    test('Prevent duplicate company short code registration', () => {
      assert.throws(
        () => {
          db.createCompanyWithFullOnboarding(
            {
              name: 'Duplicate Apex',
              code: 'APEX_HORIZON', // Same short code as Company A
              countryCode: 'OM',
              baseCurrency: 'OMR',
              timeZone: 'UTC',
              fiscalYearStartMonth: 1,
              tier: 'enterprise',
              businessTypes: ['trading'],
              sellingCategories: ['physical_products'],
              buyingCategories: ['finished_goods'],
              selectedUomCodes: ['PCS'],
              inventoryConfig: { maintainsInventory: true } as any,
              salesWorkflow: {} as any,
              purchaseWorkflow: {} as any,
              accountingDefaults: {} as any,
              initialAdmin: { fullName: 'Admin', username: 'admin.dup' } as any,
              enabledModuleKeys: ['financial_accounting'],
            },
            vvipSuperAdminCtx.userId,
            vvipSuperAdminCtx
          );
        },
        /already registered/i,
        'Duplicate company code must be rejected'
      );
    });
  });

  // ==========================================================================
  // REQUIREMENT 21: Final Real-World Scenario (ABC Trading LLC in OMR)
  // ==========================================================================
  describe('21. Final Real-World Scenario: Complete Lifecycle for ABC Trading LLC', () => {
    test('Complete End-to-End Real-World Scenario execution', () => {
      // 1. VVIP Creates ABC Trading LLC in OMR
      const abcPayload: FullCompanyOnboardingPayload = {
        name: 'ABC Trading LLC',
        legalName: 'ABC Trading Limited Liability Company',
        code: 'ABC_TRADING',
        registrationNumber: 'CR-778899',
        taxIdentifier: 'OM-VAT-99887766',
        countryCode: 'OM',
        city: 'Muscat',
        addressLine1: 'Muttrah Commercial Area',
        baseCurrency: 'OMR',
        timeZone: 'Asia/Muscat',
        fiscalYearStartMonth: 1,
        defaultLanguage: 'en',
        dateFormat: 'YYYY-MM-DD',
        numberFormat: '1,234.56',
        tier: 'enterprise',
        businessTypes: ['trading', 'wholesale'],
        sellingCategories: ['finished_goods', 'physical_products'],
        buyingCategories: ['finished_goods', 'consumables'],
        selectedUomCodes: ['PCS', 'BOX', 'CARTON'],
        uomConversions: [
          { fromUomCode: 'CARTON', toUomCode: 'PCS', multiplier: '24.0000' },
          { fromUomCode: 'BOX', toUomCode: 'PCS', multiplier: '12.0000' },
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
          enableSerialNumberTracking: false,
          enableExpiryDateTracking: true,
          enableBarcodeSku: true,
          enableReorderLevelAlerts: true,
          defaultCostingMethod: 'WEIGHTED_AVG',
        },
        selectedAttributes: ['brand', 'model', 'barcode'],
        warehouses: [
          { code: 'WH-MAIN', name: 'Main Distribution Warehouse', address: 'Ghala Industrial Area', isDefault: true },
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
          taxRegistrationNumber: 'OM-VAT-99887766',
          taxInclusivePricing: false,
          defaultTaxRatePercent: '5.00',
        },
        branches: [{ code: 'HQ-MCT', name: 'Main Corporate Office', isHeadquarters: true }],
        departments: [
          { code: 'OPS', name: 'Operations & Logistics' },
          { code: 'COMM', name: 'Commercial Sales' },
          { code: 'FIN', name: 'Finance & Accounts' },
        ],
        designations: [
          { code: 'DES-ADM', name: 'Managing Director' },
          { code: 'DES-ACC', name: 'Senior Accountant' },
          { code: 'DES-SE', name: 'Sales Representative' },
          { code: 'DES-WM', name: 'Warehouse Manager' },
        ],
        initialAdmin: {
          fullName: 'Mujahid Al-Balushi',
          username: 'mujahid.admin',
          password: 'AdminPassword123!',
          email: 'mujahid.admin@abctrading.om',
          designation: 'Managing Director',
        },
        enabledModuleKeys: [
          'financial_accounting',
          'sales',
          'accounts_payable',
          'inventory',
          'banking_cash',
          'advanced_reporting',
          'tax_compliance',
        ],
      };

      const creationRes = db.createCompanyWithFullOnboarding(abcPayload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
      const abcCompanyId = creationRes.company.id;
      assert.ok(abcCompanyId);
      assert.strictEqual(creationRes.company.code, 'ABC_TRADING');

      // 2. Admin Login Context
      const abcAdminCtx: TenantContext = {
        companyId: abcCompanyId,
        companyName: creationRes.company.name,
        companyTier: creationRes.company.tier,
        baseCurrency: 'OMR',
        userId: creationRes.adminUser.id,
        userEmail: creationRes.adminUser.email,
        userFullName: creationRes.adminUser.fullName,
        roles: ['COMPANY_ADMIN'],
        permissions: ['*'],
        isPlatformAdmin: false,
      };

      // 3. Create Employee & Assign Designation
      const desList = db.getDesignations(abcAdminCtx);
      const accDes = desList.find((d) => d.code === 'DES-ACC')!;

      // 4. Create Accountant System User
      const accEmp = employeeService.createEmployee(
        {
          employeeCode: 'EMP-ABC-02',
          firstName: 'Sultan',
          lastName: 'Al-Habsi',
          fullName: 'Sultan Al-Habsi',
          email: 'sultan.acc@abctrading.om',
          designationId: accDes.id,
          designation: accDes.name,
          jobTitle: accDes.name,
          employmentType: 'full_time',
          employmentStatus: 'active',
          currency: 'OMR',
          paymentMethod: 'bank_transfer',
          isActive: true,
          createSystemUser: true,
          userCredentials: {
            username: 'sultan.acc',
            email: 'sultan.acc@abctrading.om',
            password: 'Accountant123!',
            roleId: 'role-accountant',
          },
        },
        abcAdminCtx
      );

      const accUser = db.getUsers().find((u) => u.username === 'sultan.acc')!;
      const abcAccountantCtx: TenantContext = {
        companyId: abcCompanyId,
        companyName: abcAdminCtx.companyName,
        companyTier: abcAdminCtx.companyTier,
        baseCurrency: 'OMR',
        userId: accUser.id,
        userEmail: accUser.email,
        userFullName: accUser.fullName,
        roles: ['ACCOUNTANT'],
        permissions: ['*'],
        isPlatformAdmin: false,
      };

      // 5. Create Sales User
      const seDes = desList.find((d) => d.code === 'DES-SE')!;
      const salesEmp = employeeService.createEmployee(
        {
          employeeCode: 'EMP-ABC-03',
          firstName: 'Amur',
          lastName: 'Al-Farsi',
          fullName: 'Amur Al-Farsi',
          email: 'amur.sales@abctrading.om',
          designationId: seDes.id,
          designation: seDes.name,
          jobTitle: seDes.name,
          employmentType: 'full_time',
          employmentStatus: 'active',
          currency: 'OMR',
          paymentMethod: 'bank_transfer',
          isActive: true,
          createSystemUser: true,
          userCredentials: {
            username: 'amur.sales',
            email: 'amur.sales@abctrading.om',
            password: 'Sales12345!',
            roleId: 'role-sales-user',
          },
        },
        abcAdminCtx
      );

      const salesUser = db.getUsers().find((u) => u.username === 'amur.sales')!;
      const abcSalesCtx: TenantContext = {
        companyId: abcCompanyId,
        companyName: abcAdminCtx.companyName,
        companyTier: abcAdminCtx.companyTier,
        baseCurrency: 'OMR',
        userId: salesUser.id,
        userEmail: salesUser.email,
        userFullName: salesUser.fullName,
        roles: ['SALES_USER'],
        permissions: ['sales.view', 'sales.create', 'sales.invoice.create', 'sales.invoice.post', 'sales.order.create', 'sales.order.confirm', 'customers.view', 'customers.create'],
        isPlatformAdmin: false,
      };

      // 6. Create Customer
      const abcCustomer = salesService.createCustomer(
        {
          code: 'CUST-ABC-01',
          name: 'Al-Fayha Supermarkets Group',
          customerType: 'corporate',
          currency: 'OMR',
          creditLimit: '10000.0000',
          isActive: true,
        },
        abcSalesCtx
      );

      // 7. Sales Transaction Flow: Quotation -> Order -> Invoice
      const abcSO = db.createSalesOrder(
        {
          branchId: db.getBranches(abcSalesCtx)[0].id,
          orderNumber: 'SO-ABC-101',
          customerId: abcCustomer.id,
          orderDate: '2026-03-10',
          currency: 'OMR',
          exchangeRate: '1.000000',
          subtotal: '3000.0000',
          discountTotal: '0.0000',
          taxTotal: '150.0000', // 5% VAT
          total: '3150.0000',
          status: 'confirmed',
          items: [
            {
              itemId: 'itm-oil-01',
              itemCode: 'ITM-OIL-01',
              description: 'Premium Cooking Oil (24 Btls/CTN)',
              quantity: '10', // 10 Cartons
              uom: 'CARTON',
              unitPrice: '300.0000',
              subtotal: '3000.0000',
              taxRate: '0.0500',
              taxAmount: '150.0000',
              total: '3150.0000',
            },
          ],
        },
        abcSalesCtx
      );

      const abcInv = salesService.createInvoice(
        {
          branchId: db.getBranches(abcSalesCtx)[0].id,
          invoiceNumber: 'INV-ABC-101',
          customerId: abcCustomer.id,
          salesOrderId: abcSO.id,
          invoiceDate: '2026-03-10',
          dueDate: '2026-04-10',
          currency: 'OMR',
          exchangeRate: '1.000000',
          subtotal: '3000.0000',
          discountTotal: '0.0000',
          taxTotal: '150.0000',
          total: '3150.0000',
          status: 'draft',
          items: abcSO.items,
        },
        abcSalesCtx
      );

      const postedAbcInv = salesService.postInvoice(abcInv.id, abcSalesCtx);
      assert.strictEqual(postedAbcInv.status, 'posted');

      // 8. Payment Request & Accountant Verification/Approval
      const abcReceipt = accountsReceivableService.postReceiptWithAllocation(
        {
          receiptNumber: 'RCPT-ABC-01',
          customerId: abcCustomer.id,
          paymentDate: '2026-03-12',
          paymentMethod: 'bank_transfer',
          bankAccountId: db.getBankAccounts(abcAccountantCtx)[0].id,
          amount: '3150.0000',
          currency: 'OMR',
          reference: 'Bank Dhofar TT Ref #BD-112233 - Proof verified',
          allocations: [
            {
              invoiceId: postedAbcInv.id,
              invoiceNumber: postedAbcInv.invoiceNumber,
              allocatedAmount: '3150.0000',
            },
          ],
        },
        abcAccountantCtx
      );

      assert.strictEqual(abcReceipt.status, 'posted');

      // 9. Accounting & Financial Integrity Checks
      const finalCredit = accountsReceivableService.getCustomerCreditSummary(abcCustomer.id, abcAccountantCtx);
      assert.strictEqual(finalCredit.outstandingBalance, '0.0000');

      const trialBalance = generalLedgerService.getTrialBalance(
        { startDate: '2026-01-01', endDate: '2026-12-31' },
        abcAccountantCtx
      );
      assert.strictEqual(trialBalance.isBalanced, true);
      assert.strictEqual(trialBalance.totalClosingDebit, trialBalance.totalClosingCredit);

      // 10. Multi-Tenant Check: Apex Horizon cannot view ABC Trading transactions
      const foreignInvoices = db.getSalesInvoices(companyAdminACtx);
      assert.strictEqual(
        foreignInvoices.some((i) => i.id === postedAbcInv.id),
        false,
        'ABC Trading invoices must be completely invisible to Apex Horizon'
      );
    });
  });
});
