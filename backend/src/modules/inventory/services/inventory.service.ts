// ============================================================================
// Phase 7: Inventory & Warehouse Management Domain Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { 
  DbItem, 
  DbItemCategory, 
  DbUnitOfMeasure, 
  DbWarehouse, 
  DbWarehouseLocation,
  DbStockMovement,
  DbStockTransfer,
  DbStockAdjustment,
  DbStockCount,
  DbSalesDelivery,
  DbSupplierReturn
} from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface ItemStockSummary {
  itemId: string;
  itemCode: string;
  name: string;
  categoryName: string;
  uomSymbol: string;
  totalQuantity: string;
  averageUnitCost: string;
  totalValuation: string;
  minStockLevel: string;
  reorderLevel: string;
  maxStockLevel: string;
  isLowStock: boolean;
  warehouseBreakdown: Array<{
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    quantity: string;
    valuation: string;
  }>;
}

export class InventoryService {
  // --------------------------------------------------------------------------
  // Item Master & Categories & UOM
  // --------------------------------------------------------------------------
  public getItems(ctx: TenantContext): DbItem[] {
    return db.getItems(ctx);
  }

  public getItemById(id: string, ctx: TenantContext): DbItem | undefined {
    return db.getItemById(id, ctx);
  }

  public getItemByCode(itemCode: string, ctx: TenantContext): DbItem | undefined {
    return db.getItemByCode(itemCode, ctx);
  }

  public createItem(
    payload: Omit<DbItem, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbItem {
    return db.createItem(payload, ctx);
  }

  public updateItem(id: string, payload: Partial<DbItem>, ctx: TenantContext): DbItem {
    return db.updateItem(id, payload, ctx);
  }

  public getItemCategories(ctx: TenantContext): DbItemCategory[] {
    return db.getItemCategories(ctx);
  }

  public createItemCategory(
    payload: Omit<DbItemCategory, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbItemCategory {
    return db.createItemCategory(payload, ctx);
  }

  public getUnitsOfMeasure(ctx: TenantContext): DbUnitOfMeasure[] {
    return db.getUnitsOfMeasure(ctx);
  }

  public createUnitOfMeasure(
    payload: Omit<DbUnitOfMeasure, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbUnitOfMeasure {
    return db.createUnitOfMeasure(payload, ctx);
  }

  // --------------------------------------------------------------------------
  // Warehouses & Internal Locations
  // --------------------------------------------------------------------------
  public getWarehouses(ctx: TenantContext): DbWarehouse[] {
    return db.getWarehouses(ctx);
  }

  public getWarehouseById(id: string, ctx: TenantContext): DbWarehouse | undefined {
    return db.getWarehouseById(id, ctx);
  }

  public createWarehouse(
    payload: Omit<DbWarehouse, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbWarehouse {
    return db.createWarehouse(payload, ctx);
  }

  public getLocations(warehouseId: string | undefined, ctx: TenantContext): DbWarehouseLocation[] {
    return db.getWarehouseLocations(warehouseId, ctx);
  }

  public createLocation(
    payload: Omit<DbWarehouseLocation, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbWarehouseLocation {
    return db.createWarehouseLocation(payload, ctx);
  }

  // --------------------------------------------------------------------------
  // Stock Ledger & Balance Aggregations
  // --------------------------------------------------------------------------
  public getStockMovements(ctx: TenantContext): DbStockMovement[] {
    return db.getStockMovements(ctx).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Computes closing stock balance for an item across all or a specific warehouse
   */
  public getStockBalance(
    itemId: string, 
    warehouseId: string | undefined, 
    ctx: TenantContext
  ): { quantity: number; valuation: number; averageCost: number } {
    const movements = db.getStockMovements(ctx).filter(
      (m) => m.itemId === itemId && (!warehouseId || m.warehouseId === warehouseId)
    );

    let currentQty = 0;
    for (const m of movements) {
      const q = parseFloat(m.quantity);
      if (m.direction === 'IN') {
        currentQty += q;
      } else {
        currentQty -= q;
      }
    }

    const item = db.getItemById(itemId, ctx);
    const avgCost = item ? parseFloat(item.currentAverageCost) : 0;
    const valuation = currentQty * avgCost;

    return {
      quantity: Math.max(0, currentQty),
      valuation: Math.max(0, valuation),
      averageCost: avgCost,
    };
  }

  /**
   * Generates comprehensive item stock summary with warehouse breakdown
   */
  public getItemStockSummary(itemId: string, ctx: TenantContext): ItemStockSummary {
    const item = db.getItemById(itemId, ctx);
    if (!item) throw new Error(`Item '${itemId}' not found`);

    const categories = db.getItemCategories(ctx);
    const uoms = db.getUnitsOfMeasure(ctx);
    const warehouses = db.getWarehouses(ctx);

    const cat = categories.find((c) => c.id === item.categoryId);
    const uom = uoms.find((u) => u.id === item.uomId);

    const warehouseBreakdown: ItemStockSummary['warehouseBreakdown'] = [];
    let totalQty = 0;

    for (const wh of warehouses) {
      const bal = this.getStockBalance(item.id, wh.id, ctx);
      totalQty += bal.quantity;
      warehouseBreakdown.push({
        warehouseId: wh.id,
        warehouseCode: wh.code,
        warehouseName: wh.name,
        quantity: bal.quantity.toFixed(4),
        valuation: bal.valuation.toFixed(4),
      });
    }

    const avgCost = parseFloat(item.currentAverageCost);
    const totalValuation = totalQty * avgCost;
    const reorderThreshold = parseFloat(item.reorderLevel || '0');

    return {
      itemId: item.id,
      itemCode: item.itemCode,
      name: item.name,
      categoryName: cat?.name || 'Unassigned',
      uomSymbol: uom?.symbol || 'pcs',
      totalQuantity: totalQty.toFixed(4),
      averageUnitCost: avgCost.toFixed(4),
      totalValuation: totalValuation.toFixed(4),
      minStockLevel: item.minStockLevel || '0.0000',
      reorderLevel: item.reorderLevel || '0.0000',
      maxStockLevel: item.maxStockLevel || '0.0000',
      isLowStock: totalQty <= reorderThreshold,
      warehouseBreakdown,
    };
  }

  // --------------------------------------------------------------------------
  // Perpetual Weighted Average Cost Calculation
  // --------------------------------------------------------------------------
  public calculateWeightedAverageCost(
    currentQty: number,
    currentAvgCost: number,
    receivedQty: number,
    receivedUnitCost: number
  ): number {
    const totalQty = currentQty + receivedQty;
    if (totalQty <= 0) return currentAvgCost > 0 ? currentAvgCost : receivedUnitCost;

    const existingTotalValue = currentQty * currentAvgCost;
    const newInwardValue = receivedQty * receivedUnitCost;
    const newAverage = (existingTotalValue + newInwardValue) / totalQty;

    return Number(newAverage.toFixed(6));
  }

  // --------------------------------------------------------------------------
  // Phase 6 Goods Receipt Integration (Procurement -> Inventory)
  // --------------------------------------------------------------------------
  public processGoodsReceiptToStock(
    goodsReceiptId: string, 
    warehouseId: string | undefined, 
    ctx: TenantContext
  ): { movements: DbStockMovement[]; journalEntryId?: string } {
    const receipt = db.getGoodsReceipts(ctx).find((gr) => gr.id === goodsReceiptId);
    if (!receipt) throw new Error(`Goods Receipt '${goodsReceiptId}' not found`);
    if (receipt.status === 'cancelled') throw new Error(`Cannot process cancelled Goods Receipt`);

    const po = db.getPurchaseOrderById(receipt.purchaseOrderId, ctx);
    if (!po) throw new Error(`Purchase Order '${receipt.purchaseOrderId}' not found`);

    const defaultWh = db.getWarehouses(ctx).find((w) => w.isDefault) || db.getWarehouses(ctx)[0];
    const targetWarehouseId = warehouseId || defaultWh?.id;
    if (!targetWarehouseId) throw new Error(`No target warehouse available for receiving`);

    const createdMovements: DbStockMovement[] = [];
    let totalInwardValuation = 0;

    for (const rItem of receipt.items) {
      const acceptedQty = parseFloat(rItem.acceptedQuantity);
      if (acceptedQty <= 0) continue;

      const poItem = po.items.find((poi) => poi.id === rItem.poItemId);
      if (!poItem) continue;

      let item: DbItem | undefined;
      if (poItem.itemId) {
        item = db.getItemById(poItem.itemId, ctx);
      } else {
        // Try finding item by description or create stock item
        item = db.getItems(ctx).find(
          (i) => i.name.toLowerCase() === poItem.description.toLowerCase() || i.itemCode === poItem.description
        );
      }

      const unitCost = parseFloat(poItem.unitPrice || '0');
      const itemInwardTotal = acceptedQty * unitCost;
      totalInwardValuation += itemInwardTotal;

      if (item && item.trackInventory) {
        // Calculate new Weighted Average Cost
        const currentStock = this.getStockBalance(item.id, undefined, ctx);
        const newAverageCost = this.calculateWeightedAverageCost(
          currentStock.quantity,
          parseFloat(item.currentAverageCost),
          acceptedQty,
          unitCost
        );

        const newTotalQty = currentStock.quantity + acceptedQty;
        const newTotalVal = newTotalQty * newAverageCost;

        db.updateItem(item.id, {
          currentAverageCost: newAverageCost.toFixed(4),
          totalStockQuantity: newTotalQty.toFixed(4),
          totalStockValue: newTotalVal.toFixed(4),
        }, ctx);

        // Record immutable stock ledger entry
        const movement = db.recordStockMovement({
          movementNumber: `SM-GRN-${Date.now().toString(36).toUpperCase()}`,
          movementDate: receipt.receiptDate,
          movementType: 'purchase_receipt',
          itemId: item.id,
          warehouseId: targetWarehouseId,
          uomId: item.uomId,
          direction: 'IN',
          quantity: acceptedQty.toFixed(4),
          unitCost: unitCost.toFixed(4),
          totalCost: itemInwardTotal.toFixed(4),
          currency: po.currency || ctx.baseCurrency,
          sourceDocumentType: 'goods_receipt',
          sourceDocumentId: receipt.id,
          sourceDocumentNumber: receipt.receiptNumber,
          departmentId: po.departmentId,
          costCenterId: po.costCenterId,
          projectId: po.projectId,
          notes: `Goods received against PO ${po.poNumber}`,
        }, ctx);

        createdMovements.push(movement);
      }
    }

    let journalEntryId: string | undefined;

    // Trigger Centralized Accounting Posting if stock value received
    if (totalInwardValuation > 0) {
      const primaryItem = createdMovements[0]?.itemId;
      const journal = accountingPostingService.post('INVENTORY_RECEIPT_POSTED', {
        branchId: po.branchId,
        sourceType: 'goods_receipt',
        sourceId: receipt.id,
        documentNumber: receipt.receiptNumber,
        documentDate: receipt.receiptDate,
        memo: `Inventory Inward Valuation for GRN ${receipt.receiptNumber} (PO ${po.poNumber})`,
        currency: po.currency || ctx.baseCurrency,
        exchangeRate: po.exchangeRate || '1.000000',
        amount: totalInwardValuation.toFixed(4),
        subLedgerType: 'inventory_item',
        subLedgerEntityId: primaryItem,
        departmentId: po.departmentId,
        costCenterId: po.costCenterId,
        projectId: po.projectId,
      }, ctx);

      journalEntryId = journal.id;

      // Stamp journalEntryId on created movements
      for (const m of createdMovements) {
        m.journalEntryId = journal.id;
      }
    }

    return { movements: createdMovements, journalEntryId };
  }

  // --------------------------------------------------------------------------
  // Sales Delivery & COGS Integration (Sales -> Inventory)
  // --------------------------------------------------------------------------
  public createSalesDelivery(
    payload: Omit<DbSalesDelivery, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbSalesDelivery {
    let totalCogsValuation = 0;
    const resolvedItems = payload.items.map((itemPayload) => {
      const item = db.getItemById(itemPayload.itemId, ctx);
      if (!item) throw new Error(`Item '${itemPayload.itemId}' not found`);

      const deliveredQty = parseFloat(itemPayload.deliveredQuantity);
      const unitCost = parseFloat(item.currentAverageCost || '0');
      const totalCost = deliveredQty * unitCost;
      totalCogsValuation += totalCost;

      return {
        ...itemPayload,
        unitCost: unitCost.toFixed(4),
        totalCost: totalCost.toFixed(4),
      };
    });

    // Create sales delivery document
    const delivery = db.createSalesDelivery({
      ...payload,
      items: resolvedItems,
    }, ctx);

    // Record stock OUT movements and reduce stock
    for (const dItem of resolvedItems) {
      const item = db.getItemById(dItem.itemId, ctx);
      if (!item || !item.trackInventory) continue;

      const deliveredQty = parseFloat(dItem.deliveredQuantity);
      const currentStock = this.getStockBalance(item.id, undefined, ctx);

      const newQty = Math.max(0, currentStock.quantity - deliveredQty);
      const avgCost = parseFloat(item.currentAverageCost);
      const newTotalVal = newQty * avgCost;

      db.updateItem(item.id, {
        totalStockQuantity: newQty.toFixed(4),
        totalStockValue: newTotalVal.toFixed(4),
      }, ctx);

      db.recordStockMovement({
        movementNumber: `SM-DEL-${Date.now().toString(36).toUpperCase()}`,
        movementDate: delivery.deliveryDate,
        movementType: 'sales_delivery',
        itemId: item.id,
        warehouseId: dItem.warehouseId,
        locationId: dItem.locationId,
        uomId: item.uomId,
        direction: 'OUT',
        quantity: deliveredQty.toFixed(4),
        unitCost: dItem.unitCost,
        totalCost: dItem.totalCost,
        currency: ctx.baseCurrency,
        sourceDocumentType: 'sales_delivery',
        sourceDocumentId: delivery.id,
        sourceDocumentNumber: delivery.deliveryNumber,
        notes: `Sales delivery for customer ${delivery.customerId}`,
      }, ctx);
    }

    // Post COGS automatic journal entry: Dr COGS (#5010), Cr Inventory (#1300)
    if (totalCogsValuation > 0) {
      const primaryItem = resolvedItems[0]?.itemId;
      const journal = accountingPostingService.post('SALES_DELIVERY_POSTED', {
        branchId: delivery.branchId,
        sourceType: 'sales_delivery',
        sourceId: delivery.id,
        documentNumber: delivery.deliveryNumber,
        documentDate: delivery.deliveryDate,
        memo: `COGS for Sales Delivery ${delivery.deliveryNumber}`,
        currency: ctx.baseCurrency,
        exchangeRate: '1.000000',
        amount: totalCogsValuation.toFixed(4),
        subLedgerType: 'inventory_item',
        subLedgerEntityId: primaryItem,
      }, ctx);

      delivery.journalEntryId = journal.id;
    }

    return delivery;
  }

  // --------------------------------------------------------------------------
  // Inter-Warehouse & Inter-Location Stock Transfers
  // --------------------------------------------------------------------------
  public createStockTransfer(
    payload: Omit<DbStockTransfer, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbStockTransfer {
    return db.createStockTransfer(payload, ctx);
  }

  public submitStockTransfer(transferId: string, ctx: TenantContext): DbStockTransfer {
    const t = db.getStockTransferById(transferId, ctx);
    if (!t) throw new Error(`Stock Transfer '${transferId}' not found`);
    return db.updateStockTransfer(transferId, { status: 'submitted' }, ctx);
  }

  public approveStockTransfer(transferId: string, ctx: TenantContext): DbStockTransfer {
    const t = db.getStockTransferById(transferId, ctx);
    if (!t) throw new Error(`Stock Transfer '${transferId}' not found`);
    return db.updateStockTransfer(transferId, { 
      status: 'approved',
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  public executeStockTransfer(transferId: string, ctx: TenantContext): DbStockTransfer {
    const transfer = db.getStockTransferById(transferId, ctx);
    if (!transfer) throw new Error(`Stock Transfer '${transferId}' not found`);
    if (transfer.status === 'completed') throw new Error(`Transfer is already completed`);

    for (const tItem of transfer.items) {
      const item = db.getItemById(tItem.itemId, ctx);
      if (!item) continue;

      const qty = parseFloat(tItem.quantity);
      const unitCost = parseFloat(item.currentAverageCost || tItem.unitCost || '0');
      const totalCost = qty * unitCost;

      // 1. Record Outflow from Source Warehouse
      db.recordStockMovement({
        movementNumber: `SM-TRF-OUT-${Date.now().toString(36).toUpperCase()}`,
        movementDate: transfer.transferDate,
        movementType: 'stock_transfer_out',
        itemId: item.id,
        warehouseId: transfer.fromWarehouseId,
        locationId: tItem.fromLocationId,
        uomId: item.uomId,
        direction: 'OUT',
        quantity: qty.toFixed(4),
        unitCost: unitCost.toFixed(4),
        totalCost: totalCost.toFixed(4),
        currency: ctx.baseCurrency,
        sourceDocumentType: 'stock_transfer',
        sourceDocumentId: transfer.id,
        sourceDocumentNumber: transfer.transferNumber,
        notes: `Transfer outflow to ${transfer.toWarehouseId}`,
      }, ctx);

      // 2. Record Inflow into Destination Warehouse
      db.recordStockMovement({
        movementNumber: `SM-TRF-IN-${Date.now().toString(36).toUpperCase()}`,
        movementDate: transfer.transferDate,
        movementType: 'stock_transfer_in',
        itemId: item.id,
        warehouseId: transfer.toWarehouseId,
        locationId: tItem.toLocationId,
        uomId: item.uomId,
        direction: 'IN',
        quantity: qty.toFixed(4),
        unitCost: unitCost.toFixed(4),
        totalCost: totalCost.toFixed(4),
        currency: ctx.baseCurrency,
        sourceDocumentType: 'stock_transfer',
        sourceDocumentId: transfer.id,
        sourceDocumentNumber: transfer.transferNumber,
        notes: `Transfer inflow from ${transfer.fromWarehouseId}`,
      }, ctx);
    }

    return db.updateStockTransfer(transferId, { status: 'completed' }, ctx);
  }

  // --------------------------------------------------------------------------
  // Stock Adjustments & Controlled Write-Offs
  // --------------------------------------------------------------------------
  public createStockAdjustment(
    payload: Omit<DbStockAdjustment, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbStockAdjustment {
    return db.createStockAdjustment(payload, ctx);
  }

  public approveAndPostStockAdjustment(adjustmentId: string, ctx: TenantContext): DbStockAdjustment {
    const adj = db.getStockAdjustmentById(adjustmentId, ctx);
    if (!adj) throw new Error(`Stock adjustment '${adjustmentId}' not found`);
    if (adj.status === 'posted') throw new Error(`Adjustment '${adjustmentId}' is already posted`);

    let netAdjustmentValuation = 0;

    for (const itemAdj of adj.items) {
      const item = db.getItemById(itemAdj.itemId, ctx);
      if (!item) continue;

      const diffQty = parseFloat(itemAdj.differenceQuantity);
      const unitCost = parseFloat(item.currentAverageCost || itemAdj.unitCost || '0');
      const diffVal = diffQty * unitCost;
      netAdjustmentValuation += diffVal;

      const direction = diffQty >= 0 ? 'IN' : 'OUT';
      const absQty = Math.abs(diffQty);

      // Record stock ledger adjustment
      db.recordStockMovement({
        movementNumber: `SM-ADJ-${Date.now().toString(36).toUpperCase()}`,
        movementDate: adj.adjustmentDate,
        movementType: 'stock_adjustment',
        itemId: item.id,
        warehouseId: itemAdj.warehouseId || adj.warehouseId,
        locationId: itemAdj.locationId || adj.locationId,
        uomId: item.uomId,
        direction,
        quantity: absQty.toFixed(4),
        unitCost: unitCost.toFixed(4),
        totalCost: Math.abs(diffVal).toFixed(4),
        currency: ctx.baseCurrency,
        sourceDocumentType: 'stock_adjustment',
        sourceDocumentId: adj.id,
        sourceDocumentNumber: adj.adjustmentNumber,
        notes: `Stock adjustment reason: ${adj.reason}`,
      }, ctx);

      // Update item on-hand stock quantity and total value
      const curStock = this.getStockBalance(item.id, undefined, ctx);
      const newTotalQty = Math.max(0, curStock.quantity);
      const newTotalVal = newTotalQty * unitCost;

      db.updateItem(item.id, {
        totalStockQuantity: newTotalQty.toFixed(4),
        totalStockValue: newTotalVal.toFixed(4),
      }, ctx);
    }

    // Post automatic accounting journal
    let journalEntryId: string | undefined;
    if (netAdjustmentValuation !== 0) {
      const primaryItem = adj.items[0]?.itemId;
      const journal = accountingPostingService.post('INVENTORY_ADJUSTMENT_POSTED', {
        branchId: adj.branchId,
        sourceType: 'stock_adjustment',
        sourceId: adj.id,
        documentNumber: adj.adjustmentNumber,
        documentDate: adj.adjustmentDate,
        memo: `Inventory Adjustment for ${adj.reason.toUpperCase()}`,
        currency: ctx.baseCurrency,
        exchangeRate: '1.000000',
        amount: netAdjustmentValuation.toFixed(4),
        subLedgerType: 'inventory_item',
        subLedgerEntityId: primaryItem,
      }, ctx);

      journalEntryId = journal.id;
    }

    return db.updateStockAdjustment(adjustmentId, {
      status: 'posted',
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
      journalEntryId,
    }, ctx);
  }

  // --------------------------------------------------------------------------
  // Physical Stock Counts & Cycle Audits
  // --------------------------------------------------------------------------
  public createStockCount(
    payload: Omit<DbStockCount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbStockCount {
    return db.createStockCount(payload, ctx);
  }

  public completeStockCountAndGenerateAdjustment(countId: string, ctx: TenantContext): {
    count: DbStockCount;
    adjustment?: DbStockAdjustment;
  } {
    const count = db.getStockCountById(countId, ctx);
    if (!count) throw new Error(`Stock Count '${countId}' not found`);

    const varianceItems: Array<{
      itemId: string;
      warehouseId: string;
      systemQuantity: string;
      countedQuantity: string;
      differenceQuantity: string;
      unitCost: string;
      totalVarianceCost: string;
    }> = [];

    for (const cItem of count.items) {
      const counted = parseFloat(cItem.countedQuantity || cItem.systemQuantity);
      const system = parseFloat(cItem.systemQuantity);
      const diff = counted - system;

      if (Math.abs(diff) > 0.0001) {
        const item = db.getItemById(cItem.itemId, ctx);
        const unitCost = item ? parseFloat(item.currentAverageCost) : parseFloat(cItem.unitCost);
        varianceItems.push({
          itemId: cItem.itemId,
          warehouseId: count.warehouseId,
          systemQuantity: system.toFixed(4),
          countedQuantity: counted.toFixed(4),
          differenceQuantity: diff.toFixed(4),
          unitCost: unitCost.toFixed(4),
          totalVarianceCost: (diff * unitCost).toFixed(4),
        });
      }
    }

    let adjustment: DbStockAdjustment | undefined;

    if (varianceItems.length > 0) {
      adjustment = this.createStockAdjustment({
        adjustmentNumber: `ADJ-COUNT-${Date.now().toString(36).toUpperCase()}`,
        adjustmentDate: count.countDate,
        warehouseId: count.warehouseId,
        locationId: count.locationId,
        reason: 'counting_difference',
        status: 'draft',
        requestedBy: ctx.userId,
        items: varianceItems.map((vi, idx) => ({
          id: `adj-item-${idx + 1}`,
          ...vi,
        })),
        notes: `Generated from Physical Stock Count ${count.countNumber}`,
      }, ctx);

      // Auto-approve and post if admin
      this.approveAndPostStockAdjustment(adjustment.id, ctx);
    }

    const updatedCount = db.updateStockCount(countId, {
      status: 'completed',
      reviewedBy: ctx.userId,
      reviewedAt: new Date().toISOString(),
      adjustmentId: adjustment?.id,
    }, ctx);

    return { count: updatedCount, adjustment };
  }

  // --------------------------------------------------------------------------
  // Supplier Returns
  // --------------------------------------------------------------------------
  public createSupplierReturn(
    payload: Omit<DbSupplierReturn, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbSupplierReturn {
    return db.createSupplierReturn(payload, ctx);
  }

  public postSupplierReturn(returnId: string, ctx: TenantContext): DbSupplierReturn {
    const ret = db.getSupplierReturns(ctx).find((r) => r.id === returnId);
    if (!ret) throw new Error(`Supplier Return '${returnId}' not found`);
    if (ret.status === 'posted') throw new Error(`Supplier Return is already posted`);

    let totalReturnValue = 0;

    for (const rItem of ret.items) {
      const item = db.getItemById(rItem.itemId, ctx);
      if (!item) continue;

      const qty = parseFloat(rItem.quantity);
      const unitCost = parseFloat(item.currentAverageCost || rItem.unitCost || '0');
      const itemTotal = qty * unitCost;
      totalReturnValue += itemTotal;

      // Deduct stock via OUT movement
      db.recordStockMovement({
        movementNumber: `SM-RET-${Date.now().toString(36).toUpperCase()}`,
        movementDate: ret.returnDate,
        movementType: 'supplier_return',
        itemId: item.id,
        warehouseId: rItem.warehouseId,
        locationId: rItem.locationId,
        uomId: item.uomId,
        direction: 'OUT',
        quantity: qty.toFixed(4),
        unitCost: unitCost.toFixed(4),
        totalCost: itemTotal.toFixed(4),
        currency: ctx.baseCurrency,
        sourceDocumentType: 'supplier_return',
        sourceDocumentId: ret.id,
        sourceDocumentNumber: ret.returnNumber,
        notes: `Supplier return reason: ${ret.reason}`,
      }, ctx);

      // Update on-hand quantity
      const curStock = this.getStockBalance(item.id, undefined, ctx);
      const newQty = Math.max(0, curStock.quantity);
      const newTotalVal = newQty * unitCost;

      db.updateItem(item.id, {
        totalStockQuantity: newQty.toFixed(4),
        totalStockValue: newTotalVal.toFixed(4),
      }, ctx);
    }

    // Post automatic accounting journal
    let journalEntryId: string | undefined;
    if (totalReturnValue > 0) {
      const primaryItem = ret.items[0]?.itemId;
      const journal = accountingPostingService.post('SUPPLIER_RETURN_POSTED', {
        branchId: ret.branchId,
        sourceType: 'supplier_return',
        sourceId: ret.id,
        documentNumber: ret.returnNumber,
        documentDate: ret.returnDate,
        memo: `Supplier Return: ${ret.reason}`,
        currency: ctx.baseCurrency,
        exchangeRate: '1.000000',
        amount: totalReturnValue.toFixed(4),
        subLedgerType: 'inventory_item',
        subLedgerEntityId: primaryItem,
      }, ctx);

      journalEntryId = journal.id;
    }

    return db.updateSupplierReturn(ret.id, {
      status: 'posted',
      journalEntryId,
    }, ctx);
  }
}

export const inventoryService = new InventoryService();
