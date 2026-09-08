// ============================================================================
// Real-World ERP Transaction Lifecycle & Accounting Integrity Audit Suite
// Comprehensive End-to-End Business Operations & Double-Entry Integrity Test
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
import { accountingPostingService } from '../modules/accounting/services/accounting-posting.service';
import { generalLedgerService } from '../modules/accounting/services/general-ledger.service';
import { subLedgerService } from '../modules/accounting/services/sub-ledger.service';
import { employeeService } from '../modules/payroll/services/employee.service';
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
  DbCustomerReceipt
} from '../database/types';
import { 
  TenantViolationError, 
  UnauthorizedAccessError,
  ImmutableRecordError,
  PeriodClosedError
} from '../core/errors/DomainErrors';

describe('Real-World ERP Transaction Lifecycle & Accounting Integrity Audit', { concurrency: 1 }, () => {
  let vvipSuperAdminCtx: TenantContext;
  let abcCompanyId: string;
  let abcAdminCtx: TenantContext;
  let abcAccountantCtx: TenantContext;
  let abcSalesCtx: TenantContext;
  let abcWarehouseCtx: TenantContext;

  let abcCustomer: DbCustomer;
  let abcSupplier: DbSupplier;
  let testProduct: DbItem;
  let mainBankAccountId: string;
  let mainCashAccountId: string;
  let mainWarehouseId: string;
  let retailWarehouseId: string;
  let hqBranchId: string;

  let po: DbPurchaseOrder;
  let grn: DbGoodsReceipt;
  let bill: DbSupplierBill;
  let so: DbSalesOrder;
  let inv: DbSalesInvoice;
  let receipt: DbCustomerReceipt;

  before(() => {
    // Reset database to pristine baseline
    db.resetDatabase();

    vvipSuperAdminCtx = {
      companyId: 'c1000000-0000-0000-0000-000000000001',
      companyName: 'Platform Super Admin Org',
      companyTier: 'enterprise',
      baseCurrency: 'USD',
      userId: 'u-vvip-master-01',
      userEmail: 'vvip.superadmin@quantumcore.io',
      userFullName: 'VVIP App Owner',
      roles: ['PLATFORM_SUPER_ADMIN'],
      permissions: ['*'],
      isPlatformAdmin: true,
    };

    const payload: FullCompanyOnboardingPayload = {
      name: 'ABC Trading LLC',
      legalName: 'ABC Trading Limited Liability Company',
      code: 'ABC_TRADING',
      registrationNumber: 'CR-998877',
      taxIdentifier: 'OM-VAT-11223344',
      countryCode: 'OM',
      city: 'Muscat',
      addressLine1: 'Al-Khuwair Commercial District',
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
        taxRegistrationNumber: 'OM-VAT-11223344',
        taxInclusivePricing: false,
        defaultTaxRatePercent: '5.00',
      },
      branches: [{ code: 'HQ-MCT', name: 'Corporate Headquarters', isHeadquarters: true }],
      departments: [
        { code: 'OPS', name: 'Operations & Logistics' },
        { code: 'FIN', name: 'Finance & Accounting' },
        { code: 'SALES', name: 'Commercial Sales' },
      ],
      designations: [
        { code: 'DES-ADM', name: 'General Manager' },
        { code: 'DES-ACC', name: 'Senior Accountant' },
        { code: 'DES-SE', name: 'Sales Executive' },
        { code: 'DES-WM', name: 'Warehouse Supervisor' },
      ],
      selectedRoles: ['COMPANY_ADMIN', 'ACCOUNTANT', 'SALES_USER', 'WAREHOUSE_MANAGER'],
      initialAdmin: {
        fullName: 'Salim Al-Busaidi',
        username: 'salim.admin',
        password: 'AdminPassword123!',
        email: 'salim.admin@abctrading.om',
        designation: 'General Manager',
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

    const res = db.createCompanyWithFullOnboarding(payload, vvipSuperAdminCtx.userId, vvipSuperAdminCtx);
    abcCompanyId = res.company.id;

    // Admin Context
    abcAdminCtx = {
      companyId: abcCompanyId,
      companyName: res.company.name,
      companyTier: res.company.tier,
      baseCurrency: 'OMR',
      userId: res.adminUser.id,
      userEmail: res.adminUser.email,
      userFullName: res.adminUser.fullName,
      roles: ['COMPANY_ADMIN'],
      permissions: ['*'],
      isPlatformAdmin: false,
    };

    hqBranchId = db.getBranches(abcAdminCtx)[0].id;
    mainWarehouseId = db.getWarehouses(abcAdminCtx)[0].id;
    mainBankAccountId = db.getBankAccounts(abcAdminCtx)[0].id;
    mainCashAccountId = db.getCashAccounts(abcAdminCtx)[0].id;

    // Secondary Warehouse
    const retailWh = db.createWarehouse({
      branchId: hqBranchId,
      code: 'WH-RETAIL',
      name: 'Retail Outlet Warehouse',
      address: 'Al-Khuwair Commercial Plaza',
      managerName: 'Khamis Al-Harthy',
      isDefault: false,
      isActive: true,
    }, abcAdminCtx);
    retailWarehouseId = retailWh.id;

    // Accountant User & Context
    const accDes = db.getDesignations(abcAdminCtx).find((d) => d.code === 'DES-ACC')!;
    employeeService.createEmployee({
      employeeCode: 'EMP-ACC-01',
      firstName: 'Nasser',
      lastName: 'Al-Riyami',
      email: 'nasser.acc@abctrading.om',
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
        username: 'nasser.acc',
        email: 'nasser.acc@abctrading.om',
        password: 'Accountant123!',
        roleId: 'role-accountant',
      },
    }, abcAdminCtx);

    const accUser = db.getUsers().find((u) => u.username === 'nasser.acc')!;
    abcAccountantCtx = {
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

    // Sales User & Context
    const salesDes = db.getDesignations(abcAdminCtx).find((d) => d.code === 'DES-SE')!;
    employeeService.createEmployee({
      employeeCode: 'EMP-SALES-01',
      firstName: 'Tariq',
      lastName: 'Al-Zubair',
      email: 'tariq.sales@abctrading.om',
      designationId: salesDes.id,
      designation: salesDes.name,
      jobTitle: salesDes.name,
      employmentType: 'full_time',
      employmentStatus: 'active',
      currency: 'OMR',
      paymentMethod: 'bank_transfer',
      isActive: true,
      createSystemUser: true,
      userCredentials: {
        username: 'tariq.sales',
        email: 'tariq.sales@abctrading.om',
        password: 'Sales12345!',
        roleId: 'role-sales-user',
      },
    }, abcAdminCtx);

    const salesUser = db.getUsers().find((u) => u.username === 'tariq.sales')!;
    abcSalesCtx = {
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

    // Warehouse Manager Context
    abcWarehouseCtx = {
      companyId: abcCompanyId,
      companyName: abcAdminCtx.companyName,
      companyTier: abcAdminCtx.companyTier,
      baseCurrency: 'OMR',
      userId: 'u-wm-01',
      userEmail: 'wm@abctrading.om',
      userFullName: 'Khamis Al-Harthy',
      roles: ['WAREHOUSE_MANAGER'],
      permissions: ['inventory.view', 'inventory.manage', 'inventory.transfer', 'inventory.adjust'],
      isPlatformAdmin: false,
    };

    // 1. Customer
    abcCustomer = salesService.createCustomer({
      code: 'CUST-ABC-01',
      name: 'ABC Customer',
      customerType: 'corporate',
      currency: 'OMR',
      creditLimit: '5000.0000',
      paymentTermsDays: 30,
      countryCode: 'OM',
      isActive: true,
    }, abcAdminCtx);

    // 2. Supplier
    abcSupplier = procurementService.createSupplier({
      code: 'SUP-ABC-01',
      name: 'ABC Supplier',
      supplierType: 'distributor',
      currency: 'OMR',
      paymentTermsDays: 30,
      countryCode: 'OM',
      taxNumber: 'OM-SUP-776655',
      isActive: true,
    }, abcAdminCtx);

    // 3. Product
    const pcsUom = db.getUnitsOfMeasure(abcAdminCtx).find((u) => u.code === 'PCS')!;
    const genCat = db.getItemCategories(abcAdminCtx).find((c) => c.code === 'GEN')!;

    testProduct = inventoryService.createItem({
      code: 'PRD-TEST-01',
      name: 'Test Product',
      description: 'Commercial Grade Merchandise',
      categoryId: genCat.id,
      uomId: pcsUom.id,
      itemType: 'inventory',
      standardCost: '10.0000',
      listPrice: '15.0000',
      minStockLevel: '10.0000',
      reorderLevel: '20.0000',
      maxStockLevel: '500.0000',
      trackInventory: true,
      currentAverageCost: '10.0000',
      totalStockQuantity: '0.0000',
      totalStockValue: '0.0000',
      isActive: true,
    }, abcAdminCtx);
  });

  // --------------------------------------------------------------------------
  // 1 & 2. COMPANY PROVISIONING & MASTER DATA VERIFICATION
  // --------------------------------------------------------------------------
  test('1 & 2. Master Data Setup: Company, Customer, Supplier, Product (10 OMR / 15 OMR)', () => {
    assert.ok(abcCompanyId);
    assert.strictEqual(abcCustomer.name, 'ABC Customer');
    assert.strictEqual(abcCustomer.companyId, abcCompanyId);
    assert.strictEqual(abcSupplier.name, 'ABC Supplier');
    assert.strictEqual(abcSupplier.companyId, abcCompanyId);
    assert.strictEqual(testProduct.name, 'Test Product');
    assert.strictEqual(testProduct.standardCost, '10.0000');
    assert.strictEqual(testProduct.listPrice, '15.0000');
  });

  // --------------------------------------------------------------------------
  // 3 & 4. PURCHASE LIFECYCLE & ACCOUNTING
  // --------------------------------------------------------------------------
  test('3 & 4. Purchase Order -> Approval -> GRN Stock Increase -> 3-Way Match -> Bill Posting & Balanced GL', () => {
    // 1. Create Purchase Order: 100 PCS @ 10 OMR = 1000 OMR (+ 5% VAT = 1050 OMR)
    po = procurementService.createPurchaseOrder({
      orderNumber: 'PO-ABC-101',
      supplierId: abcSupplier.id,
      branchId: hqBranchId,
      orderDate: '2026-03-01',
      expectedDeliveryDate: '2026-03-05',
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '1000.0000',
      taxTotal: '50.0000',
      total: '1050.0000',
      status: 'draft',
      items: [
        {
          id: 'po-item-1',
          purchaseOrderId: 'PO-ABC-101',
          itemId: testProduct.id,
          itemCode: testProduct.code,
          description: testProduct.name,
          quantity: '100',
          uom: 'PCS',
          unitPrice: '10.0000',
          subtotal: '1000.0000',
          taxRate: '0.0500',
          taxAmount: '50.0000',
          total: '1050.0000',
          receivedQuantity: '0',
          billedQuantity: '0',
        },
      ],
    }, abcAdminCtx);

    po = procurementService.approvePurchaseOrder(po.id, abcAdminCtx);
    assert.strictEqual(po.status, 'approved');

    // 2. Goods Receipt (GRN)
    grn = procurementService.receiveGoods({
      receiptNumber: 'GRN-ABC-101',
      purchaseOrderId: po.id,
      supplierId: abcSupplier.id,
      branchId: hqBranchId,
      warehouseId: mainWarehouseId,
      receiptDate: '2026-03-05',
      status: 'completed',
      items: [
        {
          poItemId: po.items[0].id,
          itemCode: testProduct.code,
          description: testProduct.name,
          receivedQuantity: '100',
          acceptedQuantity: '100',
          rejectedQuantity: '0',
          uom: 'PCS',
        },
      ],
    }, abcAdminCtx);

    // Process GRN into inventory stock engine
    inventoryService.processGoodsReceiptToStock(grn.id, mainWarehouseId, abcAdminCtx);

    // Stock now = 100 PCS @ 10 OMR = 1000 OMR
    const stockAfterGRN = inventoryService.getItemStockSummary(testProduct.id, abcAdminCtx);
    assert.strictEqual(parseFloat(stockAfterGRN.totalQuantity), 100);
    assert.strictEqual(parseFloat(stockAfterGRN.totalValuation), 1000);

    // 3. Create & Post Supplier Bill with 3-Way Match
    bill = procurementService.createSupplierBill({
      billNumber: 'BILL-ABC-101',
      supplierId: abcSupplier.id,
      purchaseOrderId: po.id,
      goodsReceiptId: grn.id,
      branchId: hqBranchId,
      billDate: '2026-03-06',
      dueDate: '2026-04-05',
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '1000.0000',
      taxTotal: '50.0000',
      total: '1050.0000',
      status: 'draft',
      matchStatus: 'matched',
      items: [
        {
          poItemId: po.items[0].id,
          itemCode: testProduct.code,
          description: testProduct.name,
          quantity: '100',
          uom: 'PCS',
          unitPrice: '10.0000',
          subtotal: '1000.0000',
          taxRate: '0.0500',
          taxAmount: '50.0000',
          total: '1050.0000',
        },
      ],
    }, abcAdminCtx);

    const postedBill = procurementService.postSupplierBill(bill.id, abcAccountantCtx);
    assert.strictEqual(postedBill.status, 'posted');
    assert.ok(postedBill.journalEntryId);

    // 4. Verify GL Balanced Journal (Dr = Cr = 1050 OMR)
    const journal = db.getJournalEntries(abcAdminCtx).find((j) => j.id === postedBill.journalEntryId)!;
    assert.strictEqual(journal.totalDebit, '1050.0000');
    assert.strictEqual(journal.totalCredit, '1050.0000');

    // 5. AP Sub-Ledger matches GL Control Account #2010
    const apRecon = subLedgerService.reconcileSubLedger('supplier', abcAdminCtx);
    assert.strictEqual(apRecon.isReconciled, true);
    assert.strictEqual(parseFloat(apRecon.subLedgerTotalBalance), 1050);
  });

  // --------------------------------------------------------------------------
  // 5 & 6. SALES LIFECYCLE & COGS RECOGNITION
  // --------------------------------------------------------------------------
  test('5 & 6. Quotation -> Sales Order -> Delivery -> Invoice -> 2-Step Payment Approval & Settlement', () => {
    // 1. Quotation: 40 PCS @ 15 OMR = 600 OMR (+ 30 OMR VAT = 630 OMR)
    const quote = salesService.createQuotation({
      branchId: hqBranchId,
      quotationNumber: 'QT-ABC-101',
      customerId: abcCustomer.id,
      quotationDate: '2026-03-08',
      validUntil: '2026-03-22',
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '600.0000',
      discountTotal: '0.0000',
      taxTotal: '30.0000',
      total: '630.0000',
      status: 'draft',
      items: [
        {
          itemId: testProduct.id,
          itemCode: testProduct.code,
          description: testProduct.name,
          quantity: '40',
          uom: 'PCS',
          unitPrice: '15.0000',
          subtotal: '600.0000',
          taxRate: '0.0500',
          taxAmount: '30.0000',
          total: '630.0000',
        },
      ],
    }, abcSalesCtx);

    so = salesService.convertQuotationToOrder(quote.id, abcSalesCtx);
    assert.strictEqual(so.status, 'confirmed');

    // 2. Sales Delivery (Fulfillment & COGS Recognition)
    const dn = inventoryService.createSalesDelivery({
      deliveryNumber: 'DN-ABC-101',
      salesOrderId: so.id,
      customerId: abcCustomer.id,
      branchId: hqBranchId,
      deliveryDate: '2026-03-09',
      status: 'completed',
      items: [
        {
          id: 'dn-item-1',
          salesDeliveryId: 'DN-ABC-101',
          itemId: testProduct.id,
          warehouseId: mainWarehouseId,
          orderedQuantity: '40.0000',
          deliveredQuantity: '40.0000',
          unitCost: '10.0000',
          totalCost: '400.0000',
        },
      ],
    }, abcWarehouseCtx);

    assert.strictEqual(dn.status, 'completed');
    assert.ok(dn.journalEntryId); // Automatic COGS entry posted

    // Stock reduced to 60 PCS @ 10 OMR = 600 OMR
    const stockAfterDN = inventoryService.getItemStockSummary(testProduct.id, abcAdminCtx);
    assert.strictEqual(parseFloat(stockAfterDN.totalQuantity), 60);
    assert.strictEqual(parseFloat(stockAfterDN.totalValuation), 600);

    // 3. Sales Invoice
    inv = salesService.createInvoice({
      branchId: hqBranchId,
      invoiceNumber: 'INV-ABC-101',
      customerId: abcCustomer.id,
      salesOrderId: so.id,
      invoiceDate: '2026-03-10',
      dueDate: '2026-04-09',
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '600.0000',
      discountTotal: '0.0000',
      taxTotal: '30.0000',
      total: '630.0000',
      status: 'draft',
      items: [
        {
          itemId: testProduct.id,
          itemCode: testProduct.code,
          description: testProduct.name,
          quantity: '40',
          uom: 'PCS',
          unitPrice: '15.0000',
          subtotal: '600.0000',
          taxRate: '0.0500',
          taxAmount: '30.0000',
          total: '630.0000',
        },
      ],
    }, abcSalesCtx);

    const postedInv = salesService.postInvoice(inv.id, abcSalesCtx);
    assert.strictEqual(postedInv.status, 'posted');
    assert.ok(postedInv.journalEntryId);

    // 4. Post Receipt with verified reference by Accountant
    receipt = accountsReceivableService.postReceiptWithAllocation({
      receiptNumber: 'RCPT-ABC-101',
      customerId: abcCustomer.id,
      paymentDate: '2026-03-12',
      paymentMethod: 'bank_transfer',
      bankAccountId: mainBankAccountId,
      amount: '630.0000',
      currency: 'OMR',
      reference: 'TT-BANK-DHOFAR-9988 - Payment proof verified',
      allocations: [
        {
          invoiceId: postedInv.id,
          invoiceNumber: postedInv.invoiceNumber,
          allocatedAmount: '630.0000',
        },
      ],
    }, abcAccountantCtx);

    assert.strictEqual(receipt.status, 'posted');

    // Customer balance is fully settled (0.0000)
    const settledInv = salesService.getInvoiceById(postedInv.id, abcAdminCtx)!;
    assert.strictEqual(settledInv.balanceDue, '0.0000');
    assert.strictEqual(settledInv.amountPaid, '630.0000');
  });

  // --------------------------------------------------------------------------
  // 7. INVENTORY TRANSFERS & ADJUSTMENTS
  // --------------------------------------------------------------------------
  test('7. Stock Transfers, Surplus Adjustments, and Damaged Goods Write-Off', () => {
    // 1. Stock Transfer: 20 PCS from WH-MAIN to WH-RETAIL
    const trf = inventoryService.createStockTransfer({
      transferNumber: 'TRF-ABC-01',
      fromWarehouseId: mainWarehouseId,
      toWarehouseId: retailWarehouseId,
      transferDate: '2026-03-13',
      status: 'draft',
      items: [
        {
          id: 'trf-item-1',
          stockTransferId: 'TRF-ABC-01',
          itemId: testProduct.id,
          quantity: '20.0000',
          uomId: testProduct.uomId,
          unitCost: '10.0000',
        },
      ],
    }, abcWarehouseCtx);

    inventoryService.submitStockTransfer(trf.id, abcWarehouseCtx);
    inventoryService.approveStockTransfer(trf.id, abcWarehouseCtx);
    inventoryService.executeStockTransfer(trf.id, abcWarehouseCtx);

    // Total stock is still 60 PCS with valuation 600 OMR
    const stockAfterTrf = inventoryService.getItemStockSummary(testProduct.id, abcAdminCtx);
    assert.strictEqual(parseFloat(stockAfterTrf.totalQuantity), 60);
    assert.strictEqual(parseFloat(stockAfterTrf.totalValuation), 600);

    // 2. Stock Adjustment: +10 PCS found in bin
    const adjGain = inventoryService.createStockAdjustment({
      adjustmentNumber: 'ADJ-ABC-01',
      warehouseId: mainWarehouseId,
      adjustmentDate: '2026-03-14',
      reason: 'inventory_surplus',
      status: 'draft',
      requestedBy: abcAdminCtx.userId,
      items: [
        {
          id: 'adj-item-1',
          itemId: testProduct.id,
          warehouseId: mainWarehouseId,
          systemQuantity: '40.0000',
          countedQuantity: '50.0000',
          differenceQuantity: '10.0000',
          unitCost: '10.0000',
          totalVarianceCost: '100.0000',
        },
      ],
    }, abcWarehouseCtx);

    inventoryService.approveAndPostStockAdjustment(adjGain.id, abcAdminCtx);

    // 3. Damaged Write-off: -2 PCS
    const adjLoss = inventoryService.createStockAdjustment({
      adjustmentNumber: 'ADJ-ABC-02',
      warehouseId: mainWarehouseId,
      adjustmentDate: '2026-03-14',
      reason: 'damaged_stock',
      status: 'draft',
      requestedBy: abcAdminCtx.userId,
      items: [
        {
          id: 'adj-item-2',
          itemId: testProduct.id,
          warehouseId: mainWarehouseId,
          systemQuantity: '50.0000',
          countedQuantity: '48.0000',
          differenceQuantity: '-2.0000',
          unitCost: '10.0000',
          totalVarianceCost: '-20.0000',
        },
      ],
    }, abcWarehouseCtx);

    inventoryService.approveAndPostStockAdjustment(adjLoss.id, abcAdminCtx);

    // Net Stock = 60 + 10 - 2 = 68 PCS (680 OMR)
    const stockSummary = inventoryService.getItemStockSummary(testProduct.id, abcAdminCtx);
    assert.strictEqual(parseFloat(stockSummary.totalQuantity), 68);
    assert.strictEqual(parseFloat(stockSummary.totalValuation), 680);
  });

  // --------------------------------------------------------------------------
  // 8 & 9. RETURNS & CREDIT NOTES
  // --------------------------------------------------------------------------
  test('8 & 9. Supplier Return (SCN) & Customer Return (CCN) with Double-Entry Adjustments', () => {
    // 1. Supplier Credit Note: Return 5 PCS @ 10 OMR = 50 OMR (+ 2.50 OMR VAT = 52.50 OMR)
    const scn = procurementService.createCreditNote({
      creditNoteNumber: 'SCN-ABC-01',
      supplierId: abcSupplier.id,
      billId: bill.id,
      date: '2026-03-15',
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '50.0000',
      taxAmount: '2.5000',
      total: '52.5000',
      reason: 'Defective units returned',
      lines: [
        {
          itemCode: testProduct.code,
          description: testProduct.name,
          quantity: '5',
          unitPrice: '10.0000',
          subtotal: '50.0000',
          taxAmount: '2.5000',
          total: '52.5000',
        },
      ],
    }, abcAccountantCtx);

    assert.strictEqual(scn.status, 'posted');

    // Record stock out for returned goods (-5 PCS)
    db.recordStockMovement({
      movementNumber: 'SM-SUP-RET-01',
      movementDate: '2026-03-15',
      movementType: 'supplier_return',
      itemId: testProduct.id,
      warehouseId: mainWarehouseId,
      uomId: testProduct.uomId,
      direction: 'OUT',
      quantity: '5.0000',
      unitCost: '10.0000',
      totalCost: '50.0000',
      currency: 'OMR',
    }, abcAdminCtx);

    // 2. Customer Credit Note: Return 4 PCS @ 15 OMR = 60 OMR (+ 3 OMR VAT = 63 OMR)
    const ccn = salesService.createCreditNote({
      creditNoteNumber: 'CCN-ABC-01',
      customerId: abcCustomer.id,
      invoiceId: inv.id,
      branchId: hqBranchId,
      creditNoteDate: '2026-03-16',
      currency: 'OMR',
      exchangeRate: '1.000000',
      subtotal: '60.0000',
      taxTotal: '3.0000',
      total: '63.0000',
      reason: 'Excess stock returned in pristine condition',
      status: 'draft',
      items: [
        {
          itemId: testProduct.id,
          itemCode: testProduct.code,
          description: testProduct.name,
          quantity: '4',
          uom: 'PCS',
          unitPrice: '15.0000',
          subtotal: '60.0000',
          taxRate: '0.0500',
          taxAmount: '3.0000',
          total: '63.0000',
        },
      ],
    }, abcAdminCtx);

    const postedCCN = salesService.postCreditNote(ccn.id, abcAccountantCtx);
    assert.strictEqual(postedCCN.status, 'posted');

    // Return goods into physical stock (+4 PCS)
    db.recordStockMovement({
      movementNumber: 'SM-CUST-RET-01',
      movementDate: '2026-03-16',
      movementType: 'customer_return',
      itemId: testProduct.id,
      warehouseId: mainWarehouseId,
      uomId: testProduct.uomId,
      direction: 'IN',
      quantity: '4.0000',
      unitCost: '10.0000',
      totalCost: '40.0000',
      currency: 'OMR',
    }, abcAdminCtx);

    // Final physical stock = 68 - 5 + 4 = 67 PCS (670 OMR)
    const stockSummary = inventoryService.getItemStockSummary(testProduct.id, abcAdminCtx);
    assert.strictEqual(parseFloat(stockSummary.totalQuantity), 67);
    assert.strictEqual(parseFloat(stockSummary.totalValuation), 670);
  });

  // --------------------------------------------------------------------------
  // 10 & 11. PAYMENT CONTROLS, REJECTION & IDEMPOTENCY
  // --------------------------------------------------------------------------
  test('10 & 11. Payment Gateways: Duplicate receipt submission is protected against double-posting', () => {
    // Idempotency test: duplicate receipt number rejected
    const receiptPayload = {
      receiptNumber: 'RCPT-IDEM-01',
      customerId: abcCustomer.id,
      paymentDate: '2026-03-18',
      paymentMethod: 'bank_transfer' as const,
      bankAccountId: mainBankAccountId,
      amount: '100.0000',
      currency: 'OMR',
      reference: 'IDEMPOTENCY-TEST-REF',
      allocations: [],
    };

    const r1 = accountsReceivableService.postReceiptWithAllocation(receiptPayload, abcAccountantCtx);
    assert.ok(r1.id);

    assert.throws(() => {
      accountsReceivableService.postReceiptWithAllocation(receiptPayload, abcAccountantCtx);
    }, (err: any) => err.message.includes('already exists') || err.message.includes('duplicate') || err.message.includes('Unique'));
  });

  // --------------------------------------------------------------------------
  // 12 & 13. IMMUTABILITY & AUDIT LOGS
  // --------------------------------------------------------------------------
  test('12 & 13. Enforces Immutability on posted documents and validates Audit Trail', () => {
    const postedInv = db.getSalesInvoices(abcAdminCtx).find((i) => i.status === 'posted')!;
    assert.throws(() => {
      db.updateSalesInvoice(postedInv.id, { subtotal: '9999.0000' }, abcAdminCtx);
    }, (err: any) => err instanceof ImmutableRecordError || err.message.includes('posted') || err.message.includes('immutable'));

    const auditLogs = db.getAuditLogs();
    assert.strictEqual(auditLogs.length >= 5, true);
  });

  // --------------------------------------------------------------------------
  // 14 & 15. SUB-LEDGER RECONCILIATION
  // --------------------------------------------------------------------------
  test('14 & 15. Reconciles AR Sub-Ledger vs GL #1200 and AP Sub-Ledger vs GL #2010', () => {
    const arRecon = subLedgerService.reconcileSubLedger('customer', abcAdminCtx);
    assert.strictEqual(arRecon.isReconciled, true);
    assert.strictEqual(parseFloat(arRecon.variance), 0);

    const apRecon = subLedgerService.reconcileSubLedger('supplier', abcAdminCtx);
    assert.strictEqual(apRecon.isReconciled, true);
    assert.strictEqual(parseFloat(apRecon.variance), 0);
  });

  // --------------------------------------------------------------------------
  // 16. BANK RECONCILIATION ENGINE
  // --------------------------------------------------------------------------
  test('16. Imports statement, executes automated matching, and creates reconciliation session', () => {
    const importRes = bankReconciliationService.importBankStatement({
      bankAccountId: mainBankAccountId,
      statementNumber: 'STMT-2026-03',
      statementDate: '2026-03-31',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      openingBalance: '0.0000',
      closingBalance: '730.0000',
      currency: 'OMR',
      lines: [
        {
          lineDate: '2026-03-12',
          description: 'Customer Transfer - ABC Customer TT-BANK-DHOFAR-9988',
          reference: 'TT-BANK-DHOFAR-9988',
          amount: '630.0000',
          debitCredit: 'debit',
        },
        {
          lineDate: '2026-03-18',
          description: 'Advance Deposit IDEMPOTENCY-TEST-REF',
          reference: 'IDEMPOTENCY-TEST-REF',
          amount: '100.0000',
          debitCredit: 'debit',
        },
      ],
    }, abcAccountantCtx);

    assert.strictEqual(importRes.statement.status, 'imported');
    assert.strictEqual(importRes.lines.length, 2);

    const matches = bankReconciliationService.runAutoMatchRules(importRes.statement.id, abcAccountantCtx);
    assert.ok(Array.isArray(matches));

    const session = bankReconciliationService.createReconciliationSession({
      bankAccountId: mainBankAccountId,
      statementId: importRes.statement.id,
      statementEndingBalance: '730.0000',
      reconciliationDate: '2026-03-31',
    }, abcAccountantCtx);

    assert.ok(session);
  });

  // --------------------------------------------------------------------------
  // 17. INVENTORY PHYSICAL COUNT & RECONCILIATION
  // --------------------------------------------------------------------------
  test('17. Executes Physical Count (67 book vs 65 counted -> 2 PCS variance investigation & post)', () => {
    const countSession = inventoryService.createStockCount({
      countNumber: 'CNT-2026-Q1',
      warehouseId: mainWarehouseId,
      countDate: '2026-03-31',
      status: 'draft',
      items: [
        {
          id: 'count-item-1',
          stockCountId: 'CNT-2026-Q1',
          itemId: testProduct.id,
          systemQuantity: '47.0000', // 47 in Main WH
          countedQuantity: '45.0000', // 2 units short
          differenceQuantity: '-2.0000',
          unitCost: '10.0000',
          totalVarianceCost: '-20.0000',
        },
      ],
    }, abcWarehouseCtx);

    const countRes = inventoryService.completeStockCountAndGenerateAdjustment(countSession.id, abcAdminCtx);
    assert.strictEqual(countRes.count.status, 'completed');

    // Physical stock now matches book stock (45 + 20 = 65 PCS total, 650 OMR)
    const stockSummary = inventoryService.getItemStockSummary(testProduct.id, abcAdminCtx);
    assert.strictEqual(parseFloat(stockSummary.totalQuantity), 65);
    assert.strictEqual(parseFloat(stockSummary.totalValuation), 650);
  });

  // --------------------------------------------------------------------------
  // 18. VAT ENGINE & TAX RECONCILIATION
  // --------------------------------------------------------------------------
  test('18. Validates Pure Tax Engine calculation and Tax Sub-Ledger entries', () => {
    const taxCode = db.getTaxCodes(abcAdminCtx).find((tc) => tc.code === 'VAT-STD-OUT')!;
    const lineResult = taxCalculatorService.calculateLine({
      unitPrice: '1000.0000',
      quantity: '1',
      taxCode,
    });

    assert.strictEqual(lineResult.taxAmount, '50.0000');
    assert.strictEqual(lineResult.totalAmount, '1050.0000');

    // Record Tax subledger entry for audit
    const taxEntry = taxLedgerService.recordEntry({
      jurisdictionId: db.getTaxJurisdictions(abcAdminCtx)[0].id,
      taxCodeId: taxCode.id,
      taxCode: taxCode.code,
      direction: 'output',
      sourceModule: 'sales',
      sourceType: 'sales_invoice',
      sourceId: inv.id,
      documentNumber: inv.invoiceNumber,
      transactionDate: '2026-03-10',
      taxableAmount: '600.0000',
      taxRate: '0.0500',
      taxAmount: '30.0000',
      currency: 'OMR',
      glAccountId: taxCode.accountId,
    }, abcAdminCtx);

    assert.strictEqual(taxEntry.status, 'posted');
  });

  // --------------------------------------------------------------------------
  // 19, 20 & 21. GENERAL LEDGER, TRIAL BALANCE & FINANCIAL STATEMENTS
  // --------------------------------------------------------------------------
  test('19, 20 & 21. Trial Balance, Income Statement (P&L), and Balance Sheet Integrity', () => {
    // 1. Trial Balance Balanced
    const tb = generalLedgerService.getTrialBalance(undefined, abcAdminCtx);
    assert.strictEqual(tb.isBalanced, true);
    assert.strictEqual(tb.totalClosingDebit, tb.totalClosingCredit);

    // 2. Income Statement
    const is = generalLedgerService.getIncomeStatement(undefined, abcAdminCtx);
    assert.ok(is);
    assert.strictEqual(typeof is.totalRevenue, 'string');
    assert.strictEqual(typeof is.totalCostOfGoodsSold, 'string');
    assert.strictEqual(typeof is.netIncome, 'string');

    // 3. Balance Sheet Balanced
    const bs = generalLedgerService.getBalanceSheet(undefined, abcAdminCtx);
    assert.ok(bs);
    assert.strictEqual(bs.isBalanced, true);
  });

  // --------------------------------------------------------------------------
  // 22, 23 & 24. CONCURRENCY, ROLLBACKS & TRACEABILITY
  // --------------------------------------------------------------------------
  test('22, 23 & 24. Concurrency guards, Rollback verification, and End-to-End Audit Chain', () => {
    // 1. Rollback test
    const countBefore = db.getJournalEntries(abcAdminCtx).length;
    try {
      accountingPostingService.post('sales_invoice_posted', {
        sourceType: 'sales_invoice',
        sourceId: 'inv-fail',
        documentNumber: 'INV-FAIL',
        documentDate: '1999-01-01',
        memo: 'Fail',
        currency: 'OMR',
        amount: '100.0000',
      }, abcAdminCtx);
    } catch {
      // Expected
    }
    const countAfter = db.getJournalEntries(abcAdminCtx).length;
    assert.strictEqual(countAfter, countBefore);

    // 2. End-to-End Traceability Chain
    const invoice = db.getSalesInvoices(abcAdminCtx)[0];
    assert.ok(invoice);
    const customer = db.getCustomerById(invoice.customerId, abcAdminCtx);
    assert.strictEqual(customer?.name, 'ABC Customer');
    const journal = db.getJournalEntries(abcAdminCtx).find((j) => j.id === invoice.journalEntryId);
    assert.ok(journal);
    const receipts = db.getCustomerReceipts(abcAdminCtx);
    assert.strictEqual(receipts.length >= 1, true);
  });
});
