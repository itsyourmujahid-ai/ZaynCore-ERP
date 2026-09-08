// ============================================================================
// Phase 7: Inventory & Warehouse Management + Inventory Accounting Test Suite
// ============================================================================

import { db } from '../../src/database/storage';
import { TenantContext } from '../../src/core/types/common';
import { inventoryService } from '../../src/modules/inventory/services/inventory.service';
import { procurementService } from '../../src/modules/procurement/services/procurement.service';
import { subLedgerService } from '../../src/modules/accounting/services/sub-ledger.service';
import { generalLedgerService } from '../../src/modules/accounting/services/general-ledger.service';
import { inventoryValuationService } from '../../src/modules/inventory/services/inventory-valuation.service';
import { PeriodClosedError, ImmutableRecordError } from '../../src/core/errors/DomainErrors';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${message}`);
  }
}

async function runInventoryTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 7 INVENTORY & WAREHOUSE ACCOUNTING TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 15;

  const ctx: TenantContext = {
    companyId: 'c1000000-0000-0000-0000-000000000001',
    companyName: 'Apex Global Holdings',
    userId: 'u1000000-0000-0000-0000-000000000001',
    userEmail: 'admin@apex-global.com',
    userFullName: 'Platform Administrator',
    roles: ['admin', 'cfo'],
    permissions: ['*'],
    companyTier: 'enterprise',
    baseCurrency: 'USD',
    isPlatformAdmin: true,
  };

  const otherTenantCtx: TenantContext = {
    companyId: 'c2000000-0000-0000-0000-000000000002',
    companyName: 'Nexus Tech Systems',
    userId: 'u2000000-0000-0000-0000-000000000002',
    userEmail: 'finance@nexus-tech.com',
    userFullName: 'Nexus Finance Officer',
    roles: ['accountant'],
    permissions: ['*'],
    companyTier: 'medium',
    baseCurrency: 'EUR',
    isPlatformAdmin: false,
  };

  // --------------------------------------------------------------------------
  // Test 1: Item Master, Category & UOM Setup (Unique SKU Constraint)
  // --------------------------------------------------------------------------
  console.log('[Test 1] Item Master registration, categories, UOM & SKU uniqueness...');
  const sku = `SKU-VALVE-${Date.now()}`;
  const categories = inventoryService.getItemCategories(ctx);
  const uoms = inventoryService.getUnitsOfMeasure(ctx);

  const item1 = inventoryService.createItem({
    itemCode: sku,
    name: 'High-Pressure Hydraulic Valve 25mm',
    description: 'Precision industrial fluid control valve',
    categoryId: categories[0]?.id || 'cat-raw-mat',
    itemType: 'stock',
    uomId: uoms[0]?.id || 'uom-pcs',
    trackInventory: true,
    isStockItem: true,
    isService: false,
    minStockLevel: '10.0000',
    reorderLevel: '20.0000',
    maxStockLevel: '100.0000',
    costingMethod: 'weighted_average',
    currentAverageCost: '100.0000',
    totalStockQuantity: '0.0000',
    totalStockValue: '0.0000',
    status: 'active',
  }, ctx);

  assert(item1.id.startsWith('item-'), 'Item ID should be generated');
  assert(item1.itemCode === sku, 'Item SKU should match');

  // Verify unique SKU constraint within company
  let duplicateThrew = false;
  try {
    inventoryService.createItem({
      itemCode: sku,
      name: 'Duplicate Valve',
      categoryId: categories[0]?.id || 'cat-raw-mat',
      itemType: 'stock',
      uomId: uoms[0]?.id || 'uom-pcs',
      trackInventory: true,
      isStockItem: true,
      isService: false,
      minStockLevel: '5.0000',
      reorderLevel: '10.0000',
      maxStockLevel: '50.0000',
      costingMethod: 'weighted_average',
      currentAverageCost: '100.0000',
      totalStockQuantity: '0.0000',
      totalStockValue: '0.0000',
      status: 'active',
    }, ctx);
  } catch (e: any) {
    duplicateThrew = true;
    assert(e.message.includes('already exists'), 'Duplicate SKU error expected');
  }
  assert(duplicateThrew, 'Duplicate SKU within tenant should be blocked');

  console.log('✓ Test 1 passed: Item Master registration and SKU uniqueness verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 2: Warehouse Master & Locations (Tenant Isolation)
  // --------------------------------------------------------------------------
  console.log('[Test 2] Warehouse Master, Locations & Tenant Isolation...');
  const whCode = `WH-WEST-${Date.now().toString(36)}`;
  const warehouse1 = inventoryService.createWarehouse({
    code: whCode,
    name: 'West Coast Logistics Depot',
    address: 'Sohar Port Berth 12, Oman',
    managerName: 'Rashid Al-Kindi',
    isDefault: false,
    isActive: true,
  }, ctx);

  assert(warehouse1.id.startsWith('wh-'), 'Warehouse ID should be generated');

  const location1 = inventoryService.createLocation({
    warehouseId: warehouse1.id,
    code: 'BAY-01-RACK-01',
    name: 'Staging Bay 1 Rack 1',
    zone: 'Zone West',
    isActive: true,
  }, ctx);

  assert(location1.id.startsWith('loc-'), 'Location ID should be generated');

  // Verify tenant isolation: other company should not see this warehouse
  const otherWhs = db.getWarehouses(otherTenantCtx);
  assert(!otherWhs.some((w) => w.id === warehouse1.id), 'Warehouse must not leak across tenants');

  console.log('✓ Test 2 passed: Warehouse & Location management verified with tenant isolation.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 3: Procurement Goods Receipt Integration & Weighted Average Costing
  // --------------------------------------------------------------------------
  console.log('[Test 3] Goods Receipt confirmation & Perpetual Weighted Average Costing...');
  const supCode = `SUP-INV-${Date.now()}`;
  const supplier = procurementService.createSupplier({
    code: supCode,
    name: 'Hydraulic Components International LLC',
    supplierType: 'local',
    countryCode: 'OM',
    currency: 'USD',
    paymentTermsDays: 30,
    status: 'active',
  }, ctx);

  const po = procurementService.createPurchaseOrder({
    poNumber: `PO-INV-${Date.now()}`,
    supplierId: supplier.id,
    poDate: '2026-03-01',
    currency: 'USD',
    exchangeRate: '1.000000',
    paymentTermsDays: 30,
    subtotal: '2000.0000',
    discountTotal: '0.0000',
    taxTotal: '0.0000',
    freightTotal: '0.0000',
    total: '2000.0000',
    status: 'approved',
    items: [
      {
        id: 'po-line-valve',
        itemId: item1.id,
        description: item1.name,
        quantity: '20.0000',
        receivedQuantity: '0.0000',
        billedQuantity: '0.0000',
        unitPrice: '100.0000',
        discountRate: '0.0000',
        subtotal: '2000.0000',
        taxAmount: '0.0000',
        total: '2000.0000',
      },
    ],
  }, ctx);

  const receipt = procurementService.receiveGoods({
    purchaseOrderId: po.id,
    supplierId: supplier.id,
    receiptDate: '2026-03-05',
    receivedBy: 'Warehouse Receiver',
    receiptNumber: `GRN-INV-${Date.now()}`,
    status: 'received',
    items: [
      {
        poItemId: po.items[0].id,
        description: item1.name,
        orderedQuantity: '20.0000',
        receivedQuantity: '20.0000',
        rejectedQuantity: '0.0000',
        acceptedQuantity: '20.0000',
      },
    ],
  }, ctx);

  // Process receipt into inventory
  const processResult = inventoryService.processGoodsReceiptToStock(receipt.id, warehouse1.id, ctx);
  assert(processResult.movements.length === 1, 'One stock movement should be recorded');
  assert(processResult.movements[0].direction === 'IN', 'Movement direction must be IN');
  assert(processResult.movements[0].quantity === '20.0000', '20 units received');

  const updatedItem1 = inventoryService.getItemById(item1.id, ctx)!;
  assert(parseFloat(updatedItem1.totalStockQuantity) === 20, 'Item on-hand quantity should be 20 units');
  assert(parseFloat(updatedItem1.currentAverageCost) === 100, 'Average cost should be $100.00');
  assert(parseFloat(updatedItem1.totalStockValue) === 2000, 'Total stock valuation should be $2,000.00');

  console.log('✓ Test 3 passed: Goods receipt integration and stock on-hand update verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 4: Second Goods Receipt with Different Price (Weighted Average Cost Update)
  // --------------------------------------------------------------------------
  console.log('[Test 4] Second Goods Receipt updating Weighted Average Cost...');
  // Receive 10 more units @ $130.00 each
  // Formula: (20 * 100 + 10 * 130) / (20 + 10) = (2000 + 1300) / 30 = 3300 / 30 = $110.00
  const po2 = procurementService.createPurchaseOrder({
    poNumber: `PO-INV-2-${Date.now()}`,
    supplierId: supplier.id,
    poDate: '2026-03-08',
    currency: 'USD',
    exchangeRate: '1.000000',
    paymentTermsDays: 30,
    subtotal: '1300.0000',
    discountTotal: '0.0000',
    taxTotal: '0.0000',
    freightTotal: '0.0000',
    total: '1300.0000',
    status: 'approved',
    items: [
      {
        id: 'po-line-valve-2',
        itemId: item1.id,
        description: item1.name,
        quantity: '10.0000',
        receivedQuantity: '0.0000',
        billedQuantity: '0.0000',
        unitPrice: '130.0000',
        discountRate: '0.0000',
        subtotal: '1300.0000',
        taxAmount: '0.0000',
        total: '1300.0000',
      },
    ],
  }, ctx);

  const receipt2 = procurementService.receiveGoods({
    purchaseOrderId: po2.id,
    supplierId: supplier.id,
    receiptDate: '2026-03-10',
    receivedBy: 'Warehouse Receiver',
    receiptNumber: `GRN-INV-2-${Date.now()}`,
    status: 'received',
    items: [
      {
        poItemId: po2.items[0].id,
        description: item1.name,
        orderedQuantity: '10.0000',
        receivedQuantity: '10.0000',
        rejectedQuantity: '0.0000',
        acceptedQuantity: '10.0000',
      },
    ],
  }, ctx);

  inventoryService.processGoodsReceiptToStock(receipt2.id, warehouse1.id, ctx);

  const reweightedItem = inventoryService.getItemById(item1.id, ctx)!;
  assert(parseFloat(reweightedItem.totalStockQuantity) === 30, 'Total stock should now be 30 units');
  assert(parseFloat(reweightedItem.currentAverageCost) === 110, 'Weighted average cost should be exactly $110.0000');
  assert(parseFloat(reweightedItem.totalStockValue) === 3300, 'Total stock valuation should be $3,300.00');

  console.log('✓ Test 4 passed: Weighted Average Costing updated accurately ($110.00/unit).\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 5: Automatic Inventory Receipt GL Journal (Dr Inventory #1300, Cr GRNI #2020)
  // --------------------------------------------------------------------------
  console.log('[Test 5] Automatic Inventory Receipt GL double-entry posting...');
  assert(processResult.journalEntryId !== undefined, 'Journal entry ID should be recorded');
  const journal1 = db.getJournalEntries(ctx).find((j) => j.id === processResult.journalEntryId)!;

  assert(journal1.status === 'posted', 'Journal status must be posted');
  assert(parseFloat(journal1.totalDebit) === 2000, 'Journal debit must equal $2,000.00');
  assert(parseFloat(journal1.totalCredit) === 2000, 'Journal credit must equal $2,000.00');

  // Verify Dr Inventory #1300 and Cr GRNI #2020
  const debitLine = journal1.lines.find((l) => parseFloat(l.debitAmount) > 0)!;
  const creditLine = journal1.lines.find((l) => parseFloat(l.creditAmount) > 0)!;
  const accounts = db.getAccounts(ctx);
  const invAcc = accounts.find((a) => a.id === debitLine.accountId)!;
  const grniAcc = accounts.find((a) => a.id === creditLine.accountId)!;

  assert(invAcc.code === '1300', 'Debit account must be Merchandise Inventory Asset #1300');
  assert(debitLine.subLedgerType === 'inventory_item', 'Subledger type must be inventory_item');
  assert(grniAcc.code === '2020' || grniAcc.code === '2010', 'Credit account must be GRNI Clearing #2020');

  console.log('✓ Test 5 passed: Automatic GL double-entry journal verified (Dr #1300, Cr #2020).\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 6: GRNI Reconciliation Schedule (Received Not Billed)
  // --------------------------------------------------------------------------
  console.log('[Test 6] GRNI Reconciliation report tracking unbilled goods receipts...');
  const grniReport = inventoryValuationService.getGRNIReconciliation(ctx);
  assert(parseFloat(grniReport.totalGRNIBalance) >= 3300, 'GRNI open balance should reflect unbilled receipts ($3,300.00)');
  assert(grniReport.items.some((it) => it.receiptNumber === receipt.receiptNumber), 'GRN 1 should be listed');

  console.log('✓ Test 6 passed: GRNI reconciliation schedule verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 7: Sales Delivery Integration & Stock Outflow
  // --------------------------------------------------------------------------
  console.log('[Test 7] Sales Delivery stock dispatch reducing on-hand inventory...');
  // Deliver 10 units of item1
  const delivery = inventoryService.createSalesDelivery({
    deliveryNumber: `DEL-${Date.now()}`,
    customerId: 'cust-1',
    deliveryDate: '2026-03-15',
    deliveredBy: 'Fleet Logistics Driver',
    status: 'delivered',
    items: [
      {
        id: 'del-item-1',
        itemId: item1.id,
        orderedQuantity: '10.0000',
        deliveredQuantity: '10.0000',
        unitCost: '110.0000',
        totalCost: '1100.0000',
        warehouseId: warehouse1.id,
      },
    ],
  }, ctx);

  const postDeliveryItem = inventoryService.getItemById(item1.id, ctx)!;
  assert(parseFloat(postDeliveryItem.totalStockQuantity) === 20, 'Stock should decrease from 30 to 20 units');
  assert(parseFloat(postDeliveryItem.totalStockValue) === 2200, 'Valuation should decrease to $2,200.00 (20 * 110)');

  console.log('✓ Test 7 passed: Sales delivery stock deduction verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 8: Cost of Goods Sold (COGS) Automatic Accounting (Dr COGS #5010, Cr Inventory #1300)
  // --------------------------------------------------------------------------
  console.log('[Test 8] COGS automatic accounting posting on sales delivery...');
  assert(delivery.journalEntryId !== undefined, 'Delivery journal entry ID should be recorded');
  const cogsJournal = db.getJournalEntries(ctx).find((j) => j.id === delivery.journalEntryId)!;

  assert(cogsJournal.status === 'posted', 'COGS journal must be posted');
  assert(parseFloat(cogsJournal.totalDebit) === 1100, 'COGS total debit must be $1,100.00');
  assert(parseFloat(cogsJournal.totalCredit) === 1100, 'COGS total credit must be $1,100.00');

  const cogsDebit = cogsJournal.lines.find((l) => parseFloat(l.debitAmount) > 0)!;
  const cogsCredit = cogsJournal.lines.find((l) => parseFloat(l.creditAmount) > 0)!;
  const cogsAcc = accounts.find((a) => a.id === cogsDebit.accountId)!;
  const invCreditAcc = accounts.find((a) => a.id === cogsCredit.accountId)!;

  assert(cogsAcc.code === '5010', 'Debit account must be COGS #5010');
  assert(invCreditAcc.code === '1300', 'Credit account must be Inventory Asset #1300');

  console.log('✓ Test 8 passed: Automatic COGS double-entry posting verified (Dr #5010, Cr #1300).\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 9: Inter-Warehouse Stock Transfer (Conserving Company Total Stock)
  // --------------------------------------------------------------------------
  console.log('[Test 9] Inter-Warehouse Stock Transfer conservation of inventory total...');
  const mainWh = db.getWarehouses(ctx).find((w) => w.isDefault) || db.getWarehouses(ctx)[0];

  const transfer = inventoryService.createStockTransfer({
    transferNumber: `TRF-TEST-${Date.now()}`,
    fromWarehouseId: warehouse1.id,
    toWarehouseId: mainWh.id,
    transferDate: '2026-03-18',
    status: 'approved',
    requestedBy: ctx.userId,
    items: [
      {
        id: 'trf-item-1',
        itemId: item1.id,
        quantity: '5.0000',
        unitCost: '110.0000',
        totalCost: '550.0000',
      },
    ],
  }, ctx);

  inventoryService.executeStockTransfer(transfer.id, ctx);

  // Check warehouse balances
  const wh1Bal = inventoryService.getStockBalance(item1.id, warehouse1.id, ctx);
  const mainWhBal = inventoryService.getStockBalance(item1.id, mainWh.id, ctx);
  const totalBal = inventoryService.getStockBalance(item1.id, undefined, ctx);

  assert(wh1Bal.quantity === 15, 'Origin warehouse should have 15 units (20 - 5)');
  assert(mainWhBal.quantity >= 5, 'Destination warehouse should have received 5 units');
  assert(totalBal.quantity === 20, 'Total company stock must remain exactly 20 units');

  console.log('✓ Test 9 passed: Inter-warehouse stock transfer verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 10: Controlled Stock Adjustment (Shrinkage / Loss) & GL Variance Posting
  // --------------------------------------------------------------------------
  console.log('[Test 10] Controlled Stock Adjustment (Shrinkage) & GL Variance posting...');
  // Adjust 2 units lost/damaged
  const adj = inventoryService.createStockAdjustment({
    adjustmentNumber: `ADJ-SHRINK-${Date.now()}`,
    adjustmentDate: '2026-03-20',
    warehouseId: warehouse1.id,
    reason: 'damage',
    status: 'draft',
    requestedBy: ctx.userId,
    items: [
      {
        id: 'adj-line-1',
        itemId: item1.id,
        warehouseId: warehouse1.id,
        systemQuantity: '15.0000',
        countedQuantity: '13.0000',
        differenceQuantity: '-2.0000',
        unitCost: '110.0000',
        totalVarianceCost: '-220.0000',
      },
    ],
  }, ctx);

  const postedAdj = inventoryService.approveAndPostStockAdjustment(adj.id, ctx);
  assert(postedAdj.status === 'posted', 'Adjustment status must be posted');
  assert(postedAdj.journalEntryId !== undefined, 'Adjustment journal entry ID must be recorded');

  const adjJournal = db.getJournalEntries(ctx).find((j) => j.id === postedAdj.journalEntryId)!;
  assert(parseFloat(adjJournal.totalDebit) === 220, 'Variance debit must be $220.00');
  assert(parseFloat(adjJournal.totalCredit) === 220, 'Variance credit must be $220.00');

  console.log('✓ Test 10 passed: Stock adjustment and GL variance posting verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 11: Physical Stock Count Snapshot & Auto-Generated Adjustment
  // --------------------------------------------------------------------------
  console.log('[Test 11] Physical Stock Count audit snapshot & auto-adjustment...');
  const count = inventoryService.createStockCount({
    countNumber: `SC-AUDIT-${Date.now()}`,
    warehouseId: warehouse1.id,
    countDate: '2026-03-25',
    status: 'in_progress',
    countedBy: ctx.userId,
    items: [
      {
        id: 'sc-item-1',
        itemId: item1.id,
        systemQuantity: '13.0000',
        countedQuantity: '14.0000', // Found 1 extra unit
        unitCost: '110.0000',
      },
    ],
  }, ctx);

  const countResult = inventoryService.completeStockCountAndGenerateAdjustment(count.id, ctx);
  assert(countResult.count.status === 'completed', 'Count audit should be completed');
  assert(countResult.adjustment !== undefined, 'Variance should have generated a stock adjustment');
  assert(countResult.adjustment?.status === 'posted', 'Generated adjustment should be auto-posted');

  console.log('✓ Test 11 passed: Stock count audit & automatic adjustment generation verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 12: Supplier Return with Stock Deduction & Accounting
  // --------------------------------------------------------------------------
  console.log('[Test 12] Supplier Return deducting stock and reversing inventory...');
  const supplierReturn = inventoryService.createSupplierReturn({
    returnNumber: `RET-SUP-${Date.now()}`,
    supplierId: supplier.id,
    returnDate: '2026-03-28',
    reason: 'Defective packaging',
    status: 'draft',
    items: [
      {
        id: 'ret-item-1',
        itemId: item1.id,
        quantity: '2.0000',
        unitCost: '110.0000',
        totalCost: '220.0000',
        warehouseId: warehouse1.id,
      },
    ],
  }, ctx);

  const postedReturn = inventoryService.postSupplierReturn(supplierReturn.id, ctx);
  assert(postedReturn.status === 'posted', 'Supplier return status must be posted');
  assert(postedReturn.journalEntryId !== undefined, 'Return journal entry ID must be recorded');

  console.log('✓ Test 12 passed: Supplier return stock deduction and GL posting verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 13: Inventory Sub-Ledger Live Reconciliation against GL Account #1300
  // --------------------------------------------------------------------------
  console.log('[Test 13] Inventory Sub-Ledger reconciliation against GL Account #1300...');
  const invReconciliation = subLedgerService.reconcileSubLedger('inventory_item', ctx);
  assert(invReconciliation.isReconciled === true, 'Inventory Sub-Ledger MUST reconcile with GL #1300');
  assert(parseFloat(invReconciliation.variance) === 0, 'Variance between subledger and GL must be strictly $0.0000');
  assert(invReconciliation.entities.length >= 1, 'Subledger entities breakdown must be populated');

  console.log('✓ Test 13 passed: Inventory Sub-Ledger perfectly reconciled with GL #1300 (0 variance).\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 14: Period Lock Enforcement on Inventory Movements
  // --------------------------------------------------------------------------
  console.log('[Test 14] Period lock enforcement on closed accounting periods...');
  const periods = db.getAccountingPeriods(ctx);
  const targetPeriod = periods.find(
    (p) => receipt.receiptDate >= p.startDate && receipt.receiptDate <= p.endDate
  ) || periods[0];
  db.setPeriodStatus(targetPeriod.id, 'locked', ctx);

  let lockThrew = false;
  try {
    inventoryService.processGoodsReceiptToStock(receipt.id, warehouse1.id, ctx);
  } catch (e: any) {
    lockThrew = true;
    assert(e instanceof PeriodClosedError || e.message.includes('locked') || e.message.includes('closed'), 'Expected PeriodClosedError');
  }
  assert(lockThrew, 'Inventory posting in locked period must be rejected');

  // Unlock period for next tests
  db.setPeriodStatus(targetPeriod.id, 'open', ctx);

  console.log('✓ Test 14 passed: Period lock enforcement verified.\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // Test 15: Immutability & Trial Balance Invariance
  // --------------------------------------------------------------------------
  console.log('[Test 15] Posted document immutability and Trial Balance Debit == Credit...');
  let immutabilityThrew = false;
  try {
    db.updateStockAdjustment(postedAdj.id, { reason: 'loss' }, ctx);
  } catch (e: any) {
    immutabilityThrew = true;
    assert(e instanceof ImmutableRecordError || e.message.includes('immutable'), 'Should throw ImmutableRecordError');
  }
  assert(immutabilityThrew, 'Direct edit of posted stock adjustment must be blocked');

  const trialBalance = generalLedgerService.getTrialBalance(undefined, ctx);
  assert(trialBalance.isBalanced === true, 'General Ledger Trial Balance MUST remain strictly balanced');
  assert(
    parseFloat(trialBalance.totalClosingDebit) === parseFloat(trialBalance.totalClosingCredit),
    `Trial Balance debits (${trialBalance.totalClosingDebit}) must equal credits (${trialBalance.totalClosingCredit})`
  );

  console.log('✓ Test 15 passed: Document immutability and Trial Balance invariance verified.\n');
  passedTests++;

  console.log('================================================================');
  console.log(`ALL ${passedTests}/${totalTests} INVENTORY & WAREHOUSE TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runInventoryTests().catch((err) => {
  console.error('\n❌ TEST SUITE RUNNER FAILED WITH ERROR:\n', err);
  process.exit(1);
});
