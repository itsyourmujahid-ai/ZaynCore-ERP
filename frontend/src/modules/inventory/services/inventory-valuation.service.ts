// ============================================================================
// Phase 7: Inventory Valuation & GRNI Reconciliation Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { inventoryService } from './inventory.service';

export interface ValuationReportRow {
  itemId: string;
  itemCode: string;
  name: string;
  categoryName: string;
  uomSymbol: string;
  warehouseId?: string;
  warehouseCode?: string;
  warehouseName?: string;
  quantity: string;
  averageUnitCost: string;
  totalValuation: string;
  costingMethod: string;
}

export interface InventoryValuationReport {
  asOfDate: string;
  totalQuantity: string;
  totalValuation: string;
  baseCurrency: string;
  rows: ValuationReportRow[];
}

export interface GRNIReconciliationItem {
  goodsReceiptId: string;
  receiptNumber: string;
  receiptDate: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  receivedAmount: string;
  billedAmount: string;
  unbilledBalance: string;
  status: 'fully_billed' | 'partially_billed' | 'unbilled';
}

export interface GRNIReconciliationReport {
  asOfDate: string;
  totalReceived: string;
  totalBilled: string;
  totalGRNIBalance: string;
  baseCurrency: string;
  items: GRNIReconciliationItem[];
}

export class InventoryValuationService {
  /**
   * Generates a comprehensive perpetual stock valuation schedule
   */
  public getValuationReport(
    filters: { warehouseId?: string; categoryId?: string } | undefined,
    ctx: TenantContext
  ): InventoryValuationReport {
    const items = db.getItems(ctx).filter((i) => i.trackInventory && (!filters?.categoryId || i.categoryId === filters.categoryId));
    const categories = db.getItemCategories(ctx);
    const uoms = db.getUnitsOfMeasure(ctx);
    const warehouses = db.getWarehouses(ctx).filter((w) => !filters?.warehouseId || w.id === filters.warehouseId);

    const rows: ValuationReportRow[] = [];
    let grandTotalQty = 0;
    let grandTotalVal = 0;

    for (const item of items) {
      const cat = categories.find((c) => c.id === item.categoryId);
      const uom = uoms.find((u) => u.id === item.uomId);
      const avgCost = parseFloat(item.currentAverageCost || '0');

      if (filters?.warehouseId) {
        const wh = warehouses.find((w) => w.id === filters.warehouseId);
        const bal = inventoryService.getStockBalance(item.id, filters.warehouseId, ctx);
        if (bal.quantity > 0 || parseFloat(item.totalStockQuantity) > 0) {
          grandTotalQty += bal.quantity;
          grandTotalVal += bal.valuation;
          rows.push({
            itemId: item.id,
            itemCode: item.itemCode,
            name: item.name,
            categoryName: cat?.name || 'Unassigned',
            uomSymbol: uom?.symbol || 'pcs',
            warehouseId: wh?.id,
            warehouseCode: wh?.code,
            warehouseName: wh?.name,
            quantity: bal.quantity.toFixed(4),
            averageUnitCost: avgCost.toFixed(4),
            totalValuation: bal.valuation.toFixed(4),
            costingMethod: item.costingMethod.replace('_', ' ').toUpperCase(),
          });
        }
      } else {
        const bal = inventoryService.getStockBalance(item.id, undefined, ctx);
        grandTotalQty += bal.quantity;
        grandTotalVal += bal.valuation;
        rows.push({
          itemId: item.id,
          itemCode: item.itemCode,
          name: item.name,
          categoryName: cat?.name || 'Unassigned',
          uomSymbol: uom?.symbol || 'pcs',
          quantity: bal.quantity.toFixed(4),
          averageUnitCost: avgCost.toFixed(4),
          totalValuation: bal.valuation.toFixed(4),
          costingMethod: item.costingMethod.replace('_', ' ').toUpperCase(),
        });
      }
    }

    return {
      asOfDate: new Date().toISOString().slice(0, 10),
      totalQuantity: grandTotalQty.toFixed(4),
      totalValuation: grandTotalVal.toFixed(4),
      baseCurrency: ctx.baseCurrency,
      rows,
    };
  }

  /**
   * Generates Goods Received Not Invoiced (GRNI) reconciliation schedule
   */
  public getGRNIReconciliation(ctx: TenantContext): GRNIReconciliationReport {
    const receipts = db.getGoodsReceipts(ctx).filter((r) => r.status !== 'cancelled');
    const bills = db.getSupplierBills(ctx).filter((b) => b.status === 'posted');
    const pos = db.getPurchaseOrders(ctx);
    const suppliers = db.getSuppliers(ctx);

    const items: GRNIReconciliationItem[] = [];
    let grandReceived = 0;
    let grandBilled = 0;
    let grandBalance = 0;

    for (const rec of receipts) {
      const po = pos.find((p) => p.id === rec.purchaseOrderId);
      const supplier = suppliers.find((s) => s.id === rec.supplierId);

      // Compute total received value on this GRN
      let receivedVal = 0;
      if (po) {
        for (const rItem of rec.items) {
          const poItem = po.items.find((poi) => poi.id === rItem.poItemId);
          const unitPrice = parseFloat(poItem?.unitPrice || '0');
          const accepted = parseFloat(rItem.acceptedQuantity || '0');
          receivedVal += accepted * unitPrice;
        }
      }

      // Find bills referencing this GRN or PO
      const matchedBills = bills.filter(
        (b) => b.goodsReceiptId === rec.id || (b.purchaseOrderId === rec.purchaseOrderId && !b.goodsReceiptId)
      );

      const billedVal = matchedBills.reduce((sum, b) => sum + parseFloat(b.subtotal || b.total), 0);
      const unbilledBal = Math.max(0, receivedVal - billedVal);

      grandReceived += receivedVal;
      grandBilled += billedVal;
      grandBalance += unbilledBal;

      let status: GRNIReconciliationItem['status'] = 'unbilled';
      if (unbilledBal <= 0.001) {
        status = 'fully_billed';
      } else if (billedVal > 0) {
        status = 'partially_billed';
      }

      items.push({
        goodsReceiptId: rec.id,
        receiptNumber: rec.receiptNumber,
        receiptDate: rec.receiptDate,
        purchaseOrderId: po?.id || rec.purchaseOrderId,
        poNumber: po?.poNumber || 'N/A',
        supplierId: rec.supplierId,
        supplierName: supplier?.name || 'Unknown Vendor',
        receivedAmount: receivedVal.toFixed(4),
        billedAmount: billedVal.toFixed(4),
        unbilledBalance: unbilledBal.toFixed(4),
        status,
      });
    }

    return {
      asOfDate: new Date().toISOString().slice(0, 10),
      totalReceived: grandReceived.toFixed(4),
      totalBilled: grandBilled.toFixed(4),
      totalGRNIBalance: grandBalance.toFixed(4),
      baseCurrency: ctx.baseCurrency,
      items,
    };
  }
}

export const inventoryValuationService = new InventoryValuationService();
