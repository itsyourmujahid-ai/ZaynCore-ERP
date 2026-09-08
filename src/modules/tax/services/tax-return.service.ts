// ============================================================================
// Tax Return & Period Management Service (Real Data Compilation & GL Settlement)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import {
  DbTaxPeriod,
  DbTaxReturn,
  TaxPeriodFrequency,
  TaxPeriodStatus,
} from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export class TaxReturnService {
  // --- Tax Periods ---
  public getPeriods(ctx: TenantContext, jurisdictionId?: string): DbTaxPeriod[] {
    return db.getTaxPeriods(ctx, jurisdictionId);
  }

  public getPeriodById(id: string, ctx: TenantContext): DbTaxPeriod | undefined {
    return db.getTaxPeriodById(id, ctx);
  }

  public createPeriod(
    payload: {
      jurisdictionId: string;
      periodCode: string;
      periodName: string;
      frequency: TaxPeriodFrequency;
      startDate: string;
      endDate: string;
      filingDeadline: string;
    },
    ctx: TenantContext
  ): DbTaxPeriod {
    const existing = db.getTaxPeriods(ctx).find(
      (p) => p.jurisdictionId === payload.jurisdictionId && p.periodCode === payload.periodCode
    );
    if (existing) {
      throw new Error(`Tax period '${payload.periodCode}' already exists for jurisdiction`);
    }

    return db.createTaxPeriod(
      {
        jurisdictionId: payload.jurisdictionId,
        periodCode: payload.periodCode,
        periodName: payload.periodName,
        frequency: payload.frequency,
        startDate: payload.startDate,
        endDate: payload.endDate,
        filingDeadline: payload.filingDeadline,
        status: 'open',
        totalOutputTax: '0.0000',
        totalRecoverableInputTax: '0.0000',
        netTaxPayable: '0.0000',
      },
      ctx
    );
  }

  public updatePeriodStatus(
    id: string,
    status: TaxPeriodStatus,
    ctx: TenantContext
  ): DbTaxPeriod {
    return db.updateTaxPeriod(id, { status }, ctx);
  }

  // --- Tax Returns ---
  public getReturns(ctx: TenantContext, jurisdictionId?: string): DbTaxReturn[] {
    return db.getTaxReturns(ctx, jurisdictionId);
  }

  public getReturnById(id: string, ctx: TenantContext): DbTaxReturn | undefined {
    return db.getTaxReturnById(id, ctx);
  }

  /**
   * Compiles live Tax Return figures directly from actual posted Tax Ledger transactions.
   */
  public prepareTaxReturn(
    payload: {
      jurisdictionId: string;
      taxPeriodId: string;
      returnNumber?: string;
      filingDate?: string;
      priorPeriodAdjustments?: string | number;
      otherAdjustments?: string | number;
      notes?: string;
    },
    ctx: TenantContext
  ): DbTaxReturn {
    const period = db.getTaxPeriodById(payload.taxPeriodId, ctx);
    if (!period) throw new Error(`Tax period '${payload.taxPeriodId}' not found`);

    const entries = db.getTaxLedgerEntries(ctx, {
      jurisdictionId: payload.jurisdictionId,
      startDate: period.startDate,
      endDate: period.endDate,
    });

    let stdSalesTaxable = 0;
    let stdSalesTax = 0;
    let zeroRatedSales = 0;
    let exemptSales = 0;
    let exportSales = 0;
    let totalOutputTax = 0;

    let stdPurchasesTaxable = 0;
    let stdPurchasesTax = 0;
    let totalRecoverableInputTax = 0;
    let totalNonRecoverableInputTax = 0;
    let capitalGoodsInputTax = 0;

    for (const e of entries) {
      if (e.status !== 'posted') continue;
      const baseTaxable = parseFloat(e.baseTaxableAmount || '0');
      const baseTax = parseFloat(e.baseTaxAmount || '0');
      const baseRec = parseFloat(e.baseRecoverableAmount || '0');
      const baseNonRec = parseFloat(e.baseNonRecoverableAmount || '0');

      if (e.direction === 'output') {
        const rate = parseFloat(e.taxRate || '0');
        if (rate > 0) {
          stdSalesTaxable += baseTaxable;
          stdSalesTax += baseTax;
          totalOutputTax += baseTax;
        } else if (e.taxCode.toUpperCase().includes('ZERO')) {
          zeroRatedSales += baseTaxable;
        } else if (e.taxCode.toUpperCase().includes('EXEMPT')) {
          exemptSales += baseTaxable;
        } else {
          exportSales += baseTaxable;
        }
      } else if (e.direction === 'input') {
        stdPurchasesTaxable += baseTaxable;
        stdPurchasesTax += baseTax;
        totalRecoverableInputTax += baseRec;
        totalNonRecoverableInputTax += baseNonRec;
        if (e.sourceModule === 'assets') {
          capitalGoodsInputTax += baseRec;
        }
      }
    }

    const priorAdj = parseFloat(String(payload.priorPeriodAdjustments || '0'));
    const otherAdj = parseFloat(String(payload.otherAdjustments || '0'));

    // Net Tax Payable / (Refundable) = Output Tax - Recoverable Input Tax + Prior Adjustments + Other Adjustments
    const netTax = totalOutputTax - totalRecoverableInputTax + priorAdj + otherAdj;

    const returnNumber = payload.returnNumber || `VAT-RET-${period.periodCode}-${Date.now().toString(36).substring(2, 6).toUpperCase()}`;

    const ret = db.createTaxReturn(
      {
        jurisdictionId: payload.jurisdictionId,
        taxPeriodId: payload.taxPeriodId,
        returnNumber,
        filingDate: payload.filingDate || new Date().toISOString().split('T')[0],
        status: 'prepared',
        standardRatedSalesTaxable: stdSalesTaxable.toFixed(4),
        standardRatedSalesTax: stdSalesTax.toFixed(4),
        zeroRatedSales: zeroRatedSales.toFixed(4),
        exemptSales: exemptSales.toFixed(4),
        exportSales: exportSales.toFixed(4),
        totalOutputTax: totalOutputTax.toFixed(4),
        standardRatedPurchasesTaxable: stdPurchasesTaxable.toFixed(4),
        standardRatedPurchasesTax: stdPurchasesTax.toFixed(4),
        totalRecoverableInputTax: totalRecoverableInputTax.toFixed(4),
        totalNonRecoverableInputTax: totalNonRecoverableInputTax.toFixed(4),
        capitalGoodsInputTax: capitalGoodsInputTax.toFixed(4),
        priorPeriodAdjustments: priorAdj.toFixed(4),
        otherAdjustments: otherAdj.toFixed(4),
        netTaxPayableOrRefundable: netTax.toFixed(4),
        paymentStatus: netTax > 0 ? 'unpaid' : (netTax < 0 ? 'refund_pending' : 'paid'),
        notes: payload.notes,
        preparedBy: ctx.userId,
        preparedAt: new Date().toISOString(),
      },
      ctx
    );

    // Update tax period figures
    db.updateTaxPeriod(
      period.id,
      {
        totalOutputTax: totalOutputTax.toFixed(4),
        totalRecoverableInputTax: totalRecoverableInputTax.toFixed(4),
        netTaxPayable: netTax.toFixed(4),
      },
      ctx
    );

    return ret;
  }

  /**
   * Reviews and marks tax return as reviewed.
   */
  public reviewTaxReturn(id: string, ctx: TenantContext): DbTaxReturn {
    return db.updateTaxReturn(id, { status: 'reviewed' }, ctx);
  }

  /**
   * Approves tax return for filing.
   */
  public approveTaxReturn(id: string, ctx: TenantContext): DbTaxReturn {
    return db.updateTaxReturn(
      id,
      {
        status: 'approved',
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
      },
      ctx
    );
  }

  /**
   * Files tax return and creates double-entry GL journal settling Output vs Input Tax accounts into Net Tax Control.
   */
  public fileTaxReturn(id: string, ctx: TenantContext): { taxReturn: DbTaxReturn; journalEntryId?: string } {
    const tr = db.getTaxReturnById(id, ctx);
    if (!tr) throw new Error(`Tax return '${id}' not found`);

    if (tr.status === 'filed' || tr.status === 'closed') {
      return { taxReturn: tr, journalEntryId: tr.settlementJournalId };
    }

    const outputTax = parseFloat(tr.totalOutputTax);
    const recInputTax = parseFloat(tr.totalRecoverableInputTax);
    const netTax = parseFloat(tr.netTaxPayableOrRefundable);

    const accounts = db.getAccounts(ctx);
    const outputAcc = accounts.find((a) => a.code === '2200') || accounts[0];
    const inputAcc = accounts.find((a) => a.code === '1450') || accounts[0];
    const netPayableAcc = accounts.find((a) => a.code === '2210') || outputAcc;
    const netRecAcc = accounts.find((a) => a.code === '1460') || inputAcc;

    const customLines: Array<{
      accountCode: string;
      description: string;
      debitAmount: string;
      creditAmount: string;
      subLedgerType?: 'customer' | 'supplier' | 'bank_account' | 'inventory_item' | 'fixed_asset' | 'employee' | 'tax_code' | 'tax_jurisdiction';
      subLedgerEntityId?: string;
    }> = [];

    // Line 1: Clear Output VAT (Debit Output VAT #2200)
    if (outputTax > 0) {
      customLines.push({
        accountCode: outputAcc.code,
        description: `Clear Output VAT on filing: ${tr.returnNumber}`,
        debitAmount: outputTax.toFixed(4),
        creditAmount: '0.0000',
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: tr.jurisdictionId,
      });
    }

    // Line 2: Clear Recoverable Input VAT (Credit Input VAT #1450)
    if (recInputTax > 0) {
      customLines.push({
        accountCode: inputAcc.code,
        description: `Clear Input VAT on filing: ${tr.returnNumber}`,
        debitAmount: '0.0000',
        creditAmount: recInputTax.toFixed(4),
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: tr.jurisdictionId,
      });
    }

    // Line 3: Net Tax Balance
    if (netTax > 0) {
      // Credit Net Tax Payable (#2210)
      customLines.push({
        accountCode: netPayableAcc.code,
        description: `Accrue Net Tax Payable: ${tr.returnNumber}`,
        debitAmount: '0.0000',
        creditAmount: netTax.toFixed(4),
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: tr.jurisdictionId,
      });
    } else if (netTax < 0) {
      // Debit Net Tax Refund Receivable (#1460)
      customLines.push({
        accountCode: netRecAcc.code,
        description: `Accrue Net Tax Refund Due: ${tr.returnNumber}`,
        debitAmount: Math.abs(netTax).toFixed(4),
        creditAmount: '0.0000',
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: tr.jurisdictionId,
      });
    }

    let journalEntryId: string | undefined;

    if (customLines.length >= 2) {
      const journal = accountingPostingService.post(
        'TAX_RETURN_FILED',
        {
          sourceType: 'TaxReturn',
          sourceId: tr.id,
          documentNumber: tr.returnNumber,
          documentDate: tr.filingDate,
          memo: `Tax Return Filing Settlement: ${tr.returnNumber}`,
          currency: ctx.baseCurrency,
          amount: Math.max(outputTax, recInputTax).toFixed(4),
          subLedgerType: 'tax_jurisdiction',
          subLedgerEntityId: tr.jurisdictionId,
          customLines,
        },
        ctx
      );
      journalEntryId = journal.id;
    }

    const updated = db.updateTaxReturn(
      tr.id,
      {
        status: 'filed',
        settlementJournalId: journalEntryId,
        filedBy: ctx.userId,
        filedAt: new Date().toISOString(),
      },
      ctx
    );

    // Lock the tax period
    db.updateTaxPeriod(tr.taxPeriodId, { status: 'filed', filedAt: new Date().toISOString(), filedBy: ctx.userId }, ctx);

    return { taxReturn: updated, journalEntryId };
  }
}

export const taxReturnService = new TaxReturnService();
