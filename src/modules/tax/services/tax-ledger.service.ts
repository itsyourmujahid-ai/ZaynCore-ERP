// ============================================================================
// Tax Sub-Ledger Service (Dedicated Transaction Stream & Query Engine)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbTaxLedgerEntry, TaxDirection } from '@/database/types';

export interface RecordTaxLedgerInput {
  branchId?: string;
  jurisdictionId: string;
  taxCodeId: string;
  taxCode: string;
  taxTypeId?: string;
  direction: TaxDirection;
  sourceModule: 'sales' | 'purchases' | 'assets' | 'payroll' | 'general_journal' | 'tax_adjustment';
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  transactionDate: string;
  taxPeriodId?: string;
  taxableAmount: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  recoverableAmount?: string | number;
  nonRecoverableAmount?: string | number;
  currency: string;
  exchangeRate?: string | number;
  journalEntryId?: string;
  glAccountId: string;
  customerOrSupplierId?: string;
  notes?: string;
}

export class TaxLedgerService {
  /**
   * Posts an entry into the dedicated Tax Sub-Ledger.
   */
  public recordEntry(input: RecordTaxLedgerInput, ctx: TenantContext): DbTaxLedgerEntry {
    const taxableNum = parseFloat(String(input.taxableAmount || '0'));
    const taxRateNum = parseFloat(String(input.taxRate || '0'));
    const taxAmountNum = parseFloat(String(input.taxAmount || '0'));
    const recNum = input.recoverableAmount !== undefined
      ? parseFloat(String(input.recoverableAmount))
      : (input.direction === 'output' ? taxAmountNum : taxAmountNum);
    const nonRecNum = input.nonRecoverableAmount !== undefined
      ? parseFloat(String(input.nonRecoverableAmount))
      : taxAmountNum - recNum;

    const exRateNum = parseFloat(String(input.exchangeRate || '1.000000'));

    return db.createTaxLedgerEntry(
      {
        branchId: input.branchId,
        jurisdictionId: input.jurisdictionId,
        taxCodeId: input.taxCodeId,
        taxCode: input.taxCode,
        taxTypeId: input.taxTypeId,
        direction: input.direction,
        sourceModule: input.sourceModule,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        documentNumber: input.documentNumber,
        transactionDate: input.transactionDate,
        taxPeriodId: input.taxPeriodId,
        taxableAmount: taxableNum.toFixed(4),
        taxRate: taxRateNum.toFixed(4),
        taxAmount: taxAmountNum.toFixed(4),
        recoverableAmount: recNum.toFixed(4),
        nonRecoverableAmount: nonRecNum.toFixed(4),
        currency: input.currency.toUpperCase(),
        exchangeRate: exRateNum.toFixed(6),
        baseTaxableAmount: (taxableNum * exRateNum).toFixed(4),
        baseTaxAmount: (taxAmountNum * exRateNum).toFixed(4),
        baseRecoverableAmount: (recNum * exRateNum).toFixed(4),
        baseNonRecoverableAmount: (nonRecNum * exRateNum).toFixed(4),
        journalEntryId: input.journalEntryId,
        glAccountId: input.glAccountId,
        status: 'posted',
        customerOrSupplierId: input.customerOrSupplierId,
        notes: input.notes,
      },
      ctx
    );
  }

  /**
   * Returns all tax ledger entries matching criteria.
   */
  public getEntries(
    ctx: TenantContext,
    filters?: {
      jurisdictionId?: string;
      direction?: 'output' | 'input' | 'both';
      taxPeriodId?: string;
      startDate?: string;
      endDate?: string;
      sourceModule?: string;
      taxCodeId?: string;
    }
  ): DbTaxLedgerEntry[] {
    return db.getTaxLedgerEntries(ctx, filters);
  }

  /**
   * Calculates aggregate totals for a given date range or tax period.
   */
  public getPeriodTotals(
    ctx: TenantContext,
    options: {
      jurisdictionId?: string;
      taxPeriodId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): {
    totalOutputTaxable: number;
    totalOutputTax: number;
    totalInputTaxable: number;
    totalInputTax: number;
    totalRecoverableInputTax: number;
    totalNonRecoverableInputTax: number;
    netTaxLiability: number; // Output Tax - Recoverable Input Tax
  } {
    const entries = db.getTaxLedgerEntries(ctx, {
      jurisdictionId: options.jurisdictionId,
      taxPeriodId: options.taxPeriodId,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    let totalOutputTaxable = 0;
    let totalOutputTax = 0;
    let totalInputTaxable = 0;
    let totalInputTax = 0;
    let totalRecoverableInputTax = 0;
    let totalNonRecoverableInputTax = 0;

    for (const e of entries) {
      if (e.status !== 'posted') continue;
      const baseTaxable = parseFloat(e.baseTaxableAmount);
      const baseTax = parseFloat(e.baseTaxAmount);
      const baseRec = parseFloat(e.baseRecoverableAmount);
      const baseNonRec = parseFloat(e.baseNonRecoverableAmount);

      if (e.direction === 'output') {
        totalOutputTaxable += baseTaxable;
        totalOutputTax += baseTax;
      } else if (e.direction === 'input') {
        totalInputTaxable += baseTaxable;
        totalInputTax += baseTax;
        totalRecoverableInputTax += baseRec;
        totalNonRecoverableInputTax += baseNonRec;
      }
    }

    return {
      totalOutputTaxable,
      totalOutputTax,
      totalInputTaxable,
      totalInputTax,
      totalRecoverableInputTax,
      totalNonRecoverableInputTax,
      netTaxLiability: totalOutputTax - totalRecoverableInputTax,
    };
  }
}

export const taxLedgerService = new TaxLedgerService();
