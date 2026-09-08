// ============================================================================
// Centralized Pure Tax Calculation Engine (Decimal-Safe & Deterministic)
// ============================================================================

import { DbTaxCode } from '@/database/types';

export interface TaxCalculationLineInput {
  lineId?: string;
  unitPrice: string | number;
  quantity: string | number;
  discountPercentage?: string | number; // e.g. "0.10" for 10%
  discountAmount?: string | number;
  taxCode: DbTaxCode;
  isInclusive?: boolean; // Overrides taxCode.isInclusive if specified
  exchangeRate?: string | number; // Transaction to base currency
}

export interface TaxCalculationLineResult {
  lineId?: string;
  taxCodeId: string;
  taxCode: string;
  taxRate: string; // e.g. "0.0500"
  taxTreatment: string; // 'standard' | 'zero_rated' | 'exempt' | 'out_of_scope'
  grossAmount: string; // Price * Qty
  discountAmount: string;
  netTaxableAmount: string; // Taxable base amount
  taxAmount: string;
  totalAmount: string; // netTaxableAmount + taxAmount
  recoverablePercentage: string; // e.g. "1.0000"
  recoverableTaxAmount: string;
  nonRecoverableTaxAmount: string;
  isInclusive: boolean;
  baseTaxableAmount: string;
  baseTaxAmount: string;
  baseRecoverableTaxAmount: string;
  baseNonRecoverableTaxAmount: string;
}

export interface TaxCalculationDocumentResult {
  lines: TaxCalculationLineResult[];
  subtotalAmount: string; // Sum of gross lines minus line discounts
  totalDiscountAmount: string;
  totalTaxableAmount: string;
  totalTaxAmount: string;
  totalRecoverableTaxAmount: string;
  totalNonRecoverableTaxAmount: string;
  grandTotalAmount: string; // Total invoice / bill payable amount
  baseTaxableAmount: string;
  baseTaxAmount: string;
  baseGrandTotalAmount: string;
  taxBreakdownByCode: Record<
    string,
    {
      code: string;
      rate: string;
      taxableAmount: string;
      taxAmount: string;
      recoverableAmount: string;
      nonRecoverableAmount: string;
      accountId: string;
      nonRecoverableExpenseAccountId?: string;
    }
  >;
}

export class TaxCalculatorService {
  /**
   * Calculates tax for a single line item with 4-decimal precision safety.
   */
  public calculateLine(input: TaxCalculationLineInput): TaxCalculationLineResult {
    const unitPrice = parseFloat(String(input.unitPrice || '0'));
    const qty = parseFloat(String(input.quantity || '0'));
    const lineGross = unitPrice * qty;

    let discount = 0;
    if (input.discountAmount) {
      discount = parseFloat(String(input.discountAmount));
    } else if (input.discountPercentage) {
      discount = lineGross * parseFloat(String(input.discountPercentage));
    }

    const netLine = Math.max(0, lineGross - discount);
    const rate = parseFloat(input.taxCode.rate || '0');
    const isInclusive = input.isInclusive !== undefined ? input.isInclusive : Boolean(input.taxCode.isInclusive);
    const recoverabilityRate = parseFloat(input.taxCode.recoverablePercentage ?? (input.taxCode.recoverability === 'non_recoverable' ? '0' : '1.0000'));
    const exRate = parseFloat(String(input.exchangeRate || '1.000000'));

    let taxableAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    if (rate === 0 || input.taxCode.taxTreatment === 'exempt' || input.taxCode.taxTreatment === 'zero_rated') {
      taxableAmount = netLine;
      taxAmount = 0;
      totalAmount = netLine;
    } else if (isInclusive) {
      // Inclusive formula: Taxable = Net / (1 + Rate), Tax = Net - Taxable
      taxableAmount = netLine / (1 + rate);
      taxAmount = netLine - taxableAmount;
      totalAmount = netLine;
    } else {
      // Exclusive formula: Tax = Net * Rate, Total = Net + Tax
      taxableAmount = netLine;
      taxAmount = netLine * rate;
      totalAmount = netLine + taxAmount;
    }

    const recoverableTax = taxAmount * recoverabilityRate;
    const nonRecoverableTax = taxAmount - recoverableTax;

    return {
      lineId: input.lineId,
      taxCodeId: input.taxCode.id,
      taxCode: input.taxCode.code,
      taxRate: rate.toFixed(4),
      taxTreatment: input.taxCode.taxTreatment || (rate === 0 ? 'zero_rated' : 'standard'),
      grossAmount: lineGross.toFixed(4),
      discountAmount: discount.toFixed(4),
      netTaxableAmount: taxableAmount.toFixed(4),
      taxAmount: taxAmount.toFixed(4),
      totalAmount: totalAmount.toFixed(4),
      recoverablePercentage: recoverabilityRate.toFixed(4),
      recoverableTaxAmount: recoverableTax.toFixed(4),
      nonRecoverableTaxAmount: nonRecoverableTax.toFixed(4),
      isInclusive,
      baseTaxableAmount: (taxableAmount * exRate).toFixed(4),
      baseTaxAmount: (taxAmount * exRate).toFixed(4),
      baseRecoverableTaxAmount: (recoverableTax * exRate).toFixed(4),
      baseNonRecoverableTaxAmount: (nonRecoverableTax * exRate).toFixed(4),
    };
  }

  /**
   * Calculates aggregate multi-line document tax breakdown.
   */
  public calculateDocument(
    lines: TaxCalculationLineInput[],
    documentDiscountAmount: number = 0,
    exchangeRate: number = 1.0
  ): TaxCalculationDocumentResult {
    const computedLines = lines.map((l) =>
      this.calculateLine({ ...l, exchangeRate: l.exchangeRate || exchangeRate })
    );

    let subtotal = 0;
    let lineDiscounts = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    let totalRecoverable = 0;
    let totalNonRecoverable = 0;
    let grandTotal = 0;

    const breakdown: TaxCalculationDocumentResult['taxBreakdownByCode'] = {};

    for (let i = 0; i < computedLines.length; i++) {
      const cl = computedLines[i];
      const origInput = lines[i];

      subtotal += parseFloat(cl.grossAmount);
      lineDiscounts += parseFloat(cl.discountAmount);
      totalTaxable += parseFloat(cl.netTaxableAmount);
      totalTax += parseFloat(cl.taxAmount);
      totalRecoverable += parseFloat(cl.recoverableTaxAmount);
      totalNonRecoverable += parseFloat(cl.nonRecoverableTaxAmount);
      grandTotal += parseFloat(cl.totalAmount);

      if (!breakdown[cl.taxCode]) {
        breakdown[cl.taxCode] = {
          code: cl.taxCode,
          rate: cl.taxRate,
          taxableAmount: '0.0000',
          taxAmount: '0.0000',
          recoverableAmount: '0.0000',
          nonRecoverableAmount: '0.0000',
          accountId: origInput.taxCode.accountId,
          nonRecoverableExpenseAccountId: origInput.taxCode.nonRecoverableExpenseAccountId,
        };
      }

      breakdown[cl.taxCode].taxableAmount = (
        parseFloat(breakdown[cl.taxCode].taxableAmount) + parseFloat(cl.netTaxableAmount)
      ).toFixed(4);
      breakdown[cl.taxCode].taxAmount = (
        parseFloat(breakdown[cl.taxCode].taxAmount) + parseFloat(cl.taxAmount)
      ).toFixed(4);
      breakdown[cl.taxCode].recoverableAmount = (
        parseFloat(breakdown[cl.taxCode].recoverableAmount) + parseFloat(cl.recoverableTaxAmount)
      ).toFixed(4);
      breakdown[cl.taxCode].nonRecoverableAmount = (
        parseFloat(breakdown[cl.taxCode].nonRecoverableAmount) + parseFloat(cl.nonRecoverableTaxAmount)
      ).toFixed(4);
    }

    // Apply document-level discount if specified
    if (documentDiscountAmount > 0) {
      grandTotal = Math.max(0, grandTotal - documentDiscountAmount);
    }

    return {
      lines: computedLines,
      subtotalAmount: subtotal.toFixed(4),
      totalDiscountAmount: (lineDiscounts + documentDiscountAmount).toFixed(4),
      totalTaxableAmount: totalTaxable.toFixed(4),
      totalTaxAmount: totalTax.toFixed(4),
      totalRecoverableTaxAmount: totalRecoverable.toFixed(4),
      totalNonRecoverableTaxAmount: totalNonRecoverable.toFixed(4),
      grandTotalAmount: grandTotal.toFixed(4),
      baseTaxableAmount: (totalTaxable * exchangeRate).toFixed(4),
      baseTaxAmount: (totalTax * exchangeRate).toFixed(4),
      baseGrandTotalAmount: (grandTotal * exchangeRate).toFixed(4),
      taxBreakdownByCode: breakdown,
    };
  }
}

export const taxCalculatorService = new TaxCalculatorService();
