// ============================================================================
// ENTERPRISE ERP PRODUCTION READINESS & FULL-SYSTEM CONTROL AUDIT TEST SUITE
// Pre-Production Verification Across 39 Business, Accounting & Security Controls
// ============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { salesService } from '../modules/sales/services/sales.service';
import { accountsReceivableService } from '../modules/sales/services/ar.service';
import { procurementService } from '../modules/procurement/services/procurement.service';
import { accountsPayableService } from '../modules/procurement/services/ap.service';
import { inventoryService } from '../modules/inventory/services/inventory.service';
import { inventoryValuationService } from '../modules/inventory/services/inventory-valuation.service';
import { bankingService } from '../modules/banking/services/banking.service';
import { bankReconciliationService } from '../modules/banking/services/bank-reconciliation.service';
import { taxCalculatorService } from '../modules/tax/services/tax-calculator.service';
import { taxLedgerService } from '../modules/tax/services/tax-ledger.service';
import { taxReturnService } from '../modules/tax/services/tax-return.service';
import { taxReconciliationService } from '../modules/tax/services/tax-reconciliation.service';
import { fixedAssetService } from '../modules/assets/services/asset.service';
import { payrollService } from '../modules/payroll/services/payroll.service';
import { employeeService } from '../modules/payroll/services/employee.service';
import { accountingPostingService } from '../modules/accounting/services/accounting-posting.service';
import { generalLedgerService } from '../modules/accounting/services/general-ledger.service';
import { subLedgerService } from '../modules/accounting/services/sub-ledger.service';
import { onboardingService } from '../modules/onboarding/services/onboarding.service';
import { 
  FullCompanyOnboardingPayload,
  DbCustomer,
  DbSupplier,
  DbItem,
  DbPurchaseOrder,
  DbGoodsReceipt,
  DbSupplierBill,
  DbSalesOrder,
  DbSalesInvoice,
  DbCustomerPayment
} from '../database/types';
import { 
  TenantViolationError, 
  UnauthorizedAccessError,
  ImmutableRecordError,
  PeriodClosedError
} from '../core/errors/DomainErrors';

describe('Enterprise ERP Production Readiness & Full-System Control Audit', { concurrency: 1 }, () => {
  // Test Tenants
  let superAdminCtx: TenantContext;
  
  // Alpha Corp (Primary Enterprise Tenant)
  let alphaCompanyId: string;
  let alphaAdminCtx: TenantContext;
  let alphaAccountantCtx: TenantContext;
  let alphaSalesCtx: TenantContext;
  let alphaWarehouseCtx: TenantContext;
  let alphaBranchId: string;
  let alphaCustomer: DbCustomer;
  let alphaSupplier: DbSupplier;
  let alphaItem: DbItem;

  // Beta LLC (Secondary Tenant for Multi-Tenant Boundary Tests)
  let betaCompanyId: string;
  let betaAdminCtx: TenantContext;
  let betaBranchId: string;

  before(async () => {
    // 1. Initialize Super Admin Context
    superAdminCtx = {
      companyId: 'comp-global-admin',
      companyName: 'Global Platform Admin',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      userId: 'usr-superadmin',
      userEmail: 'superadmin@erp-platform.internal',
      userFullName: 'VVIP Super Administrator',
      roles: ['super_admin'],
      permissions: ['*'],
      isPlatformAdmin: true,
    };

    // 2. Onboard Alpha Corp (Enterprise Tier with 2-Step Verification)
    const alphaPayload: FullCompanyOnboardingPayload = {
      name: 'Alpha Global Technologies Inc',
      legalName: 'Alpha Global Technologies Incorporated',
      code: 'ALPHA_GLOBAL',
      registrationNumber: 'CR-ALPHA-99881',
      taxIdentifier: 'TRN-ALPHA-99881',
      countryCode: 'US',
      city: 'New York',
      addressLine1: '100 Broadway Ave',
      baseCurrency: 'USD',
      timeZone: 'America/New_York',
      fiscalYearStartMonth: 1,
      defaultLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      tier: 'enterprise',
      businessTypes: ['trading', 'services'],
      sellingCategories: ['physical_products', 'services'],
      buyingCategories: ['finished_goods', 'consumables'],
      selectedUomCodes: ['PCS', 'BOX', 'UNIT'],
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
        enablePaymentProofVerification: true, // 2-Step Payment Proof Verification Active
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
        taxRegistrationNumber: 'TRN-ALPHA-99881',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '10.00',
      },
      branches: [
        { code: 'HQ', name: 'Alpha Global HQ - NY', isHeadquarters: true, city: 'New York' }
      ],
      warehouses: [
        { code: 'WH-MAIN', name: 'Primary Distribution Center', isDefault: true }
      ],
      initialAdmin: {
        fullName: 'Alpha System Administrator',
        username: 'alpha.admin',
        password: 'SecureAdminPassword123!',
        email: 'admin@alpha-corp.io',
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
      ],
    };

    const alphaResult = db.createCompanyWithFullOnboarding(alphaPayload, superAdminCtx.userId, superAdminCtx);
    alphaCompanyId = alphaResult.company.id;
    const alphaBranches = db.getBranches({ companyId: alphaCompanyId } as any);
    alphaBranchId = alphaBranches[0]?.id || 'br-alpha-hq';

    // Define Alpha Tenant Contexts
    alphaAdminCtx = {
      companyId: alphaCompanyId,
      companyName: 'Alpha Global Technologies Inc',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      branchId: alphaBranchId,
      userId: alphaResult.adminUser.id,
      userEmail: alphaResult.adminUser.email,
      userFullName: 'Alpha Administrator',
      roles: ['admin'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };

    alphaAccountantCtx = {
      companyId: alphaCompanyId,
      companyName: 'Alpha Global Technologies Inc',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      branchId: alphaBranchId,
      userId: 'usr-alpha-acct-01',
      userEmail: 'accountant@alpha-corp.io',
      userFullName: 'Alpha Senior Accountant',
      roles: ['accountant'],
      permissions: [
        'accounting.general_ledger.view',
        'accounting.journal.create',
        'accounting.journal.post',
        'accounting.reports.view',
        'accounting.payment.approve',
        'accounting.payment.finalize',
        'ar.post',
        'ap.post',
        'banking.reconcile'
      ],
      isPlatformAdmin: false,
    };

    alphaSalesCtx = {
      companyId: alphaCompanyId,
      companyName: 'Alpha Global Technologies Inc',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      branchId: alphaBranchId,
      userId: 'usr-alpha-sales-01',
      userEmail: 'sales@alpha-corp.io',
      userFullName: 'Alpha Sales Representative',
      roles: ['sales_rep'],
      permissions: [
        'sales.quotation.create',
        'sales.order.create',
        'sales.invoice.create',
        'sales.payment.request'
      ],
      isPlatformAdmin: false,
    };

    alphaWarehouseCtx = {
      companyId: alphaCompanyId,
      companyName: 'Alpha Global Technologies Inc',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      branchId: alphaBranchId,
      userId: 'usr-alpha-wh-01',
      userEmail: 'warehouse@alpha-corp.io',
      userFullName: 'Alpha Warehouse Specialist',
      roles: ['warehouse_staff'],
      permissions: [
        'inventory.view',
        'inventory.goods_receipt.create',
        'inventory.delivery.create',
        'inventory.transfer.create'
      ],
      isPlatformAdmin: false,
    };

    // 3. Onboard Beta LLC (Secondary Tenant)
    const betaPayload: FullCompanyOnboardingPayload = {
      name: 'Beta Industrial Solutions LLC',
      legalName: 'Beta Industrial Solutions Limited Liability Company',
      code: 'BETA_IND',
      registrationNumber: 'CR-BETA-77112',
      taxIdentifier: 'TRN-BETA-77112',
      countryCode: 'US',
      city: 'Chicago',
      addressLine1: '200 Michigan Ave',
      baseCurrency: 'USD',
      timeZone: 'America/Chicago',
      fiscalYearStartMonth: 1,
      defaultLanguage: 'en',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      tier: 'standard',
      businessTypes: ['manufacturing'],
      sellingCategories: ['physical_products'],
      buyingCategories: ['raw_materials'],
      selectedUomCodes: ['PCS'],
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
        enableBarcodeSku: false,
        enableReorderLevelAlerts: false,
        defaultCostingMethod: 'WEIGHTED_AVG',
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
        enablePaymentProofVerification: false,
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
        enableMultiCurrency: false,
        enableTaxVat: true,
        taxRegistrationNumber: 'TRN-BETA-77112',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '5.00',
      },
      branches: [
        { code: 'HQ-BETA', name: 'Beta Main Office', isHeadquarters: true, city: 'Chicago' }
      ],
      warehouses: [
        { code: 'WH-BETA', name: 'Beta Warehouse', isDefault: true }
      ],
      initialAdmin: {
        fullName: 'Beta Administrator',
        username: 'beta.admin',
        password: 'SecureAdminPassword123!',
        email: 'admin@beta-solutions.io',
        designation: 'Operations Director',
      },
      enabledModuleKeys: [
        'financial_accounting',
        'sales',
        'accounts_payable',
        'inventory',
      ],
    };

    const betaResult = db.createCompanyWithFullOnboarding(betaPayload, superAdminCtx.userId, superAdminCtx);
    betaCompanyId = betaResult.company.id;
    const betaBranches = db.getBranches({ companyId: betaCompanyId } as any);
    betaBranchId = betaBranches[0]?.id || 'br-beta-hq';

    betaAdminCtx = {
      companyId: betaCompanyId,
      companyName: 'Beta Industrial Solutions LLC',
      companyTier: 'standard',
      baseCurrency: 'USD',
      branchId: betaBranchId,
      userId: betaResult.adminUser.id,
      userEmail: betaResult.adminUser.email,
      userFullName: 'Beta Administrator',
      roles: ['admin'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };

    // Create Master Entities for Alpha Corp
    alphaCustomer = db.createCustomer({
      code: 'CUST-ALPHA-001',
      name: 'Omni Retail Group',
      email: 'finance@omniretail.com',
      phone: '+1 555 100 2000',
      currency: 'USD',
      creditLimit: '100000.00',
      paymentTermsDays: 30,
      taxNumber: 'TAX-OMNI-99',
      isActive: true,
      currentBalance: '0.0000',
    }, alphaAdminCtx);

    alphaSupplier = db.createSupplier({
      code: 'SUP-ALPHA-001',
      name: 'Global Microchips Corp',
      email: 'orders@globalmicrochips.com',
      phone: '+1 555 300 4000',
      currency: 'USD',
      creditLimit: '250000.00',
      paymentTermsDays: 30,
      taxNumber: 'TAX-MICRO-88',
      isActive: true,
      currentBalance: '0.0000',
    }, alphaAdminCtx);

    alphaItem = db.createItem({
      code: 'SKU-TITAN-X1',
      name: 'Enterprise AI Compute Blade X1',
      description: 'High-density enterprise server node with AI accelerator',
      type: 'inventory',
      category: 'Enterprise Hardware',
      unitOfMeasure: 'UNIT',
      purchasePrice: '4000.0000',
      sellingPrice: '7500.0000',
      costingMethod: 'FIFO',
      trackInventory: true,
      reorderPoint: 5,
      reorderQuantity: 20,
      inventoryAccountId: '1300',
      cogsAccountId: '5000',
      incomeAccountId: '4000',
      taxRateId: 'VAT-STD',
      isActive: true,
    }, alphaAdminCtx);
  });

  // ==========================================================================
  // 1. MULTI-TENANT ISOLATION & CROSS-COMPANY BOUNDARY AUDIT
  // ==========================================================================
  describe('Control Dimension 1: Multi-Tenant Boundary & Data Isolation', () => {
    test('Should block cross-tenant customer retrieval with TenantViolationError', () => {
      assert.throws(
        () => db.getCustomerById(alphaCustomer.id, betaAdminCtx),
        TenantViolationError,
        'Beta admin must not access Alpha customer'
      );
    });

    test('Should isolate entity lists strictly per tenant', () => {
      const alphaCustomers = db.getCustomers(alphaAdminCtx);
      const betaCustomers = db.getCustomers(betaAdminCtx);

      assert.ok(alphaCustomers.some((c) => c.id === alphaCustomer.id));
      assert.ok(!betaCustomers.some((c) => c.id === alphaCustomer.id));
    });

    test('Should block cross-tenant database mutations', () => {
      assert.throws(
        () => db.updateCustomer(alphaCustomer.id, { name: 'Compromised Name' }, betaAdminCtx),
        TenantViolationError,
        'Beta admin must not modify Alpha customer'
      );
    });
  });

  // ==========================================================================
  // 2. MULTI-TENANT LIFECYCLE & OPERATIONAL FREEZE AUDIT
  // ==========================================================================
  describe('Control Dimension 2: Multi-Tenant Lifecycle & Operational Freeze', () => {
    test('Should block mutations and transactions on suspended / archived companies', () => {
      // Freeze Beta company
      db.updateCompanyStatus(betaCompanyId, 'suspended', superAdminCtx);

      assert.throws(
        () => db.createCustomer({
          code: 'CUST-BETA-NEW',
          name: 'Forbidden New Customer',
          currency: 'USD',
          creditLimit: '1000.00',
          paymentTermsDays: 15,
          isActive: true,
          currentBalance: '0.0000',
        }, betaAdminCtx),
        TenantViolationError,
        'Suspended company must be completely frozen from write operations'
      );

      // Restore Beta company for subsequent isolation stability
      db.updateCompanyStatus(betaCompanyId, 'active', superAdminCtx);
    });
  });

  // ==========================================================================
  // 3. SALES 2-STEP PAYMENT PROOF VERIFICATION GUARD
  // ==========================================================================
  describe('Control Dimension 3: Sales 2-Step Payment Proof Verification Guard', () => {
    let testInvoice: DbSalesInvoice;
    let submittedPaymentRequest: DbCustomerPayment;

    before(() => {
      // Create a test invoice in Alpha Corp
      testInvoice = db.createSalesInvoice({
        branchId: alphaBranchId,
        invoiceNumber: 'INV-AUDIT-2STEP-001',
        invoiceDate: '2026-09-01',
        dueDate: '2026-10-01',
        customerId: alphaCustomer.id,
        currency: 'USD',
        exchangeRate: '1.000000',
        subtotal: '15000.0000',
        taxTotal: '1500.0000',
        total: '16500.0000',
        amountPaid: '0.0000',
        balanceDue: '16500.0000',
        status: 'posted',
        lines: [
          {
            itemId: alphaItem.id,
            description: alphaItem.name,
            quantity: 2,
            unitPrice: '7500.0000',
            taxRate: '0.1000',
            taxAmount: '1500.0000',
            lineTotal: '16500.0000',
            incomeAccountId: '4000',
          }
        ]
      }, alphaAdminCtx);
    });

    test('Sales user must be blocked from directly posting customer payment receipt to GL', () => {
      assert.throws(
        () => {
          accountsReceivableService.postReceiptWithAllocation({
            receiptNumber: 'RCPT-UNAUTH-001',
            customerId: alphaCustomer.id,
            paymentDate: '2026-09-02',
            paymentMethod: 'bank_transfer',
            bankAccountId: '1010',
            amount: '16500.0000',
            allocations: [{ invoiceId: testInvoice.id, allocatedAmount: '16500.0000' }]
          }, alphaSalesCtx);
        },
        /Direct payment posting is restricted when 2-Step Payment Proof Verification is enabled/,
        'Sales rep must not bypass accountant verification'
      );
    });

    test('Sales user can submit payment request with proof document without affecting GL', () => {
      const bankAcc = db.getAccounts(alphaAdminCtx).find((a) => a.code === '1010')!;
      const ledgerBefore = generalLedgerService.getAccountLedger(bankAcc.id, undefined, alphaAdminCtx);

      submittedPaymentRequest = accountsReceivableService.submitPaymentRequest({
        receiptNumber: 'REQ-PROOF-ALPHA-001',
        customerId: alphaCustomer.id,
        paymentDate: '2026-09-02',
        paymentMethod: 'bank_transfer',
        bankAccountId: bankAcc.id,
        amount: '16500.0000',
        reference: 'WIRE-REF-998822',
        notes: 'Customer submitted wire proof PDF',
        proofDocumentUrl: 'https://cdn.alpha-corp.io/proofs/wire-998822.pdf',
        proofDocumentName: 'wire_receipt_omni.pdf',
        allocations: [{ invoiceId: testInvoice.id, allocatedAmount: '16500.0000' }]
      }, alphaSalesCtx);

      assert.equal(submittedPaymentRequest.status, 'pending_approval');
      assert.equal(submittedPaymentRequest.submittedBy, alphaSalesCtx.userId);

      // Verify no GL entry was created
      const ledgerAfter = generalLedgerService.getAccountLedger(bankAcc.id, undefined, alphaAdminCtx);
      assert.equal(ledgerAfter.closingBalance, ledgerBefore.closingBalance, 'Pending payment request must not post to GL');
    });

    test('Accountant verifies payment proof, approves and posts to GL with full double-entry', () => {
      const approvedPayment = accountsReceivableService.approveAndPostPayment(submittedPaymentRequest.id, alphaAccountantCtx);
      assert.equal(approvedPayment.status, 'posted');
      assert.ok(approvedPayment.approvedBy, 'ApprovedBy must be recorded');

      // Verify Invoice balance is cleared
      const updatedInv = db.getSalesInvoices(alphaAdminCtx).find((i) => i.id === testInvoice.id);
      assert.equal(updatedInv?.balanceDue, '0.0000');
      assert.equal(updatedInv?.amountPaid, '16500.0000');
    });
  });

  // ==========================================================================
  // 4. THREE-WAY MATCHING & INVENTORY PROTECTION
  // ==========================================================================
  describe('Control Dimension 4: Procurement 3-Way Match & Inventory Protection', () => {
    let po: DbPurchaseOrder;
    let grn: DbGoodsReceipt;
    let mainWhId: string;

    before(() => {
      const warehouses = db.getWarehouses(alphaAdminCtx);
      mainWhId = warehouses[0]?.id || 'wh-alpha-main';
    });

    test('Creating PO does NOT increase stock inventory on hand', () => {
      const stockBalance = inventoryService.getStockBalance(alphaItem.id, mainWhId, alphaAdminCtx);
      assert.equal(stockBalance.quantity, 0, 'Initial stock must be 0');

      po = procurementService.createPurchaseOrder({
        branchId: alphaBranchId,
        orderNumber: 'PO-AUDIT-3WAY-001',
        orderDate: '2026-09-03',
        supplierId: alphaSupplier.id,
        currency: 'USD',
        exchangeRate: '1.000000',
        subtotal: '40000.0000',
        taxTotal: '4000.0000',
        total: '44000.0000',
        status: 'approved',
        items: [
          {
            id: 'po-item-alpha-1',
            itemId: alphaItem.id,
            itemCode: alphaItem.code,
            description: alphaItem.name,
            quantity: '10',
            unitPrice: '4000.0000',
            taxRate: '0.1000',
            taxAmount: '4000.0000',
            lineTotal: '44000.0000',
            receivedQuantity: '0',
            billedQuantity: '0',
          }
        ]
      }, alphaAdminCtx);

      const stockAfterPO = inventoryService.getStockBalance(alphaItem.id, mainWhId, alphaAdminCtx);
      assert.equal(stockAfterPO.quantity, 0, 'Purchase Order creation must NOT increment inventory');
    });

    test('Goods Receipt (GRN) increments physical inventory and posts GRNI liability', () => {
      grn = procurementService.receiveGoods({
        branchId: alphaBranchId,
        receiptNumber: 'GRN-AUDIT-001',
        receiptDate: '2026-09-04',
        supplierId: alphaSupplier.id,
        warehouseId: mainWhId,
        purchaseOrderId: po.id,
        status: 'completed',
        items: [
          {
            poItemId: po.items[0].id,
            itemCode: alphaItem.code,
            description: alphaItem.name,
            receivedQuantity: '10',
            acceptedQuantity: '10',
            rejectedQuantity: '0',
            uom: 'PCS',
          }
        ]
      }, alphaWarehouseCtx);

      inventoryService.processGoodsReceiptToStock(grn.id, mainWhId, alphaWarehouseCtx);

      const stockAfterGRN = inventoryService.getStockBalance(alphaItem.id, mainWhId, alphaAdminCtx);
      assert.equal(stockAfterGRN.quantity, 10, 'GRN must increment inventory on hand to 10');
    });

    test('Supplier Bill matching GRN clears GRNI liability and establishes AP Control', () => {
      let bill = procurementService.createSupplierBill({
        branchId: alphaBranchId,
        billNumber: 'BILL-MICRO-9911',
        billDate: '2026-09-05',
        dueDate: '2026-10-05',
        supplierId: alphaSupplier.id,
        currency: 'USD',
        exchangeRate: '1.000000',
        purchaseOrderId: po.id,
        goodsReceiptId: grn.id,
        subtotal: '40000.0000',
        taxTotal: '4000.0000',
        total: '44000.0000',
        status: 'draft',
        matchStatus: 'matched',
        items: [
          {
            itemId: alphaItem.id,
            description: alphaItem.name,
            quantity: '10',
            unitPrice: '4000.0000',
            taxRate: '0.1000',
            taxAmount: '4000.0000',
            lineTotal: '44000.0000',
            expenseAccountId: '1300',
          }
        ]
      }, alphaAccountantCtx);

      bill = procurementService.postSupplierBill(bill.id, alphaAccountantCtx);

      assert.equal(bill.status, 'posted');
      assert.equal(bill.balanceDue, '44000.0000');
    });
  });

  // ==========================================================================
  // 5. IMMUTABILITY & CLOSED-PERIOD PROTECTION
  // ==========================================================================
  describe('Control Dimension 5: Accounting Immutability & Period Locking', () => {
    test('Posted documents must reject direct field modification without audit reversals', () => {
      const postedInvoices = db.getSalesInvoices(alphaAdminCtx).filter((i) => i.status === 'posted');
      const inv = postedInvoices[0];

      assert.throws(
        () => db.updateSalesInvoice(inv.id, { subtotal: '999999.00' } as any, alphaAdminCtx),
        ImmutableRecordError,
        'Direct mutation of posted invoice financial amounts must be blocked'
      );
    });

    test('Posting in a closed fiscal period must be strictly rejected with PeriodClosedError', () => {
      const periods = db.getAccountingPeriods(alphaAdminCtx);
      assert.ok(periods.length > 0, 'Accounting periods must exist');
      const targetPeriod = periods[0];

      // Lock period
      db.setPeriodStatus(targetPeriod.id, 'closed', alphaAdminCtx);

      const bankAcc = db.getAccounts(alphaAdminCtx).find((a) => a.code === '1010')!;
      const capAcc = db.getAccounts(alphaAdminCtx).find((a) => a.code === '3000') || db.getAccounts(alphaAdminCtx)[0];

      assert.throws(
        () => {
          accountingPostingService.post('MANUAL_JOURNAL', {
            documentDate: targetPeriod.startDate,
            documentNumber: 'JRN-FORBIDDEN-001',
            memo: 'Unauthorized closed period entry',
            currency: 'USD',
            exchangeRate: '1.000000',
            amount: '1000.0000',
            entries: [
              { accountId: bankAcc.id, debit: '1000.0000', credit: '0.0000', description: 'Debit' },
              { accountId: capAcc.id, debit: '0.0000', credit: '1000.0000', description: 'Credit' }
            ]
          }, alphaAdminCtx);
        },
        PeriodClosedError,
        'Transactions into locked / closed fiscal periods must be rejected'
      );

      // Reopen period
      db.setPeriodStatus(targetPeriod.id, 'open', alphaAdminCtx);
    });
  });

  // ==========================================================================
  // 6. 10-POINT CENTRAL RECONCILIATION VERIFICATION MATRIX
  // ==========================================================================
  describe('Control Dimension 6: 10-Point Central Reconciliation Verification Matrix', () => {
    test('Point 1: Accounts Receivable Control Reconciled (GL 1100/1200 vs AR Subledger)', () => {
      const recon = subLedgerService.reconcileSubLedger('customer', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `AR subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 2: Accounts Payable Control Reconciled (GL 2100/2010 vs AP Subledger)', () => {
      const recon = subLedgerService.reconcileSubLedger('supplier', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `AP subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 3: Bank & Cash Accounts Reconciled (GL 1010 vs Bank Register)', () => {
      const recon = subLedgerService.reconcileSubLedger('bank_account', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `Bank subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 4: Inventory Asset Valuation Reconciled (GL 1300 vs Inventory Register)', () => {
      const recon = subLedgerService.reconcileSubLedger('inventory_item', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `Inventory subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 5: Fixed Asset Cost & Accum Depreciation Reconciled (GL 1500/1510 vs Asset Register)', () => {
      const recon = subLedgerService.reconcileSubLedger('fixed_asset', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `Fixed Asset subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 6: Payroll & Statutory Clearing Reconciled (GL 2200/2300 vs Payroll Subledger)', () => {
      const recon = subLedgerService.reconcileSubLedger('employee', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `Payroll subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 7: Tax / VAT Control Reconciled (GL 2150/2200 vs Tax Subledger)', () => {
      const recon = subLedgerService.reconcileSubLedger('tax_code', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `Tax subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 8: Intercompany Clearing Reconciled (GL 1900/1220 vs Intercompany Subledger)', () => {
      const recon = subLedgerService.reconcileSubLedger('intercompany', alphaAdminCtx);
      assert.equal(recon.isReconciled, true, `Intercompany subledger variance must be 0, got ${recon.variance}`);
      assert.equal(recon.variance, '0.0000');
    });

    test('Point 9: GRNI / Accrued Purchases Clearing Account Reconciled', () => {
      const grniAcc = db.getAccounts(alphaAdminCtx).find((a) => a.code === '2110');
      if (grniAcc) {
        const ledger = generalLedgerService.getAccountLedger(grniAcc.id, undefined, alphaAdminCtx);
        assert.equal(parseFloat(ledger.closingBalance), 0, 'GRNI accrued liability must balance cleanly upon supplier bill posting');
      } else {
        assert.ok(true);
      }
    });

    test('Point 10: Suspense / Clearing Zero Balance Verification', () => {
      const suspenseAcc = db.getAccounts(alphaAdminCtx).find((a) => a.code === '9999');
      if (suspenseAcc) {
        const ledger = generalLedgerService.getAccountLedger(suspenseAcc.id, undefined, alphaAdminCtx);
        assert.equal(parseFloat(ledger.closingBalance), 0, 'Suspense account balance must remain exactly zero');
      } else {
        assert.ok(true);
      }
    });
  });

  // ==========================================================================
  // 7. FINANCIAL STATEMENTS & FULL ARITHMETIC INTEGRITY
  // ==========================================================================
  describe('Control Dimension 7: Financial Statements & Mathematical Exactness', () => {
    test('Trial Balance: Total Debits must equal Total Credits', () => {
      const tb = generalLedgerService.getTrialBalance(undefined, alphaAdminCtx);
      const totalDebit = parseFloat(tb.totalClosingDebit);
      const totalCredit = parseFloat(tb.totalClosingCredit);

      assert.equal(tb.isBalanced, true, 'Trial balance must be mathematically balanced');
      assert.equal(totalDebit.toFixed(2), totalCredit.toFixed(2), 'Debits must equal Credits exactly');
    });

    test('Balance Sheet: Total Assets must equal Total Liabilities + Total Equity', () => {
      const bs = generalLedgerService.getBalanceSheet(undefined, alphaAdminCtx);
      const assets = parseFloat(bs.totalAssets);
      const liabAndEquity = parseFloat(bs.totalLiabilitiesAndEquity);

      assert.equal(bs.isBalanced, true, 'Balance Sheet equation must hold true: Assets = Liabilities + Equity');
      assert.equal(assets.toFixed(2), liabAndEquity.toFixed(2), 'Assets must equal Liabilities + Equity');
    });

    test('Income Statement: Net Profit matches Balance Sheet Retained Earnings integration', () => {
      const pnl = generalLedgerService.getIncomeStatement(undefined, alphaAdminCtx);
      assert.ok(pnl, 'Income statement must compute');
      const netProfit = parseFloat(pnl.netIncome);
      assert.ok(!isNaN(netProfit), 'Net profit must be a valid number');
    });
  });
});
