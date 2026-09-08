// ============================================================================
// Currency Translation & FX Rate Engine Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { DbCurrencyTranslationRate, CurrencyRateType } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { ValidationError } from '@/core/errors/DomainErrors';
import { parseDecimal, formatDecimal } from '@/core/utils/money';

export interface SetTranslationRateDTO {
  fromCurrency: string;
  toCurrency: string;
  effectiveDate: string;
  rateType: CurrencyRateType;
  rate: string;
  rateSource?: string;
}

export class CurrencyTranslationService {
  public getRates(): DbCurrencyTranslationRate[] {
    return db.getCurrencyTranslationRates();
  }

  public setRate(dto: SetTranslationRateDTO, ctx: TenantContext): DbCurrencyTranslationRate {
    if (!dto.fromCurrency || !dto.toCurrency || !dto.rate) {
      throw new ValidationError('From currency, to currency, and translation rate are required.');
    }

    const rateNum = parseFloat(dto.rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      throw new ValidationError('Translation rate must be a valid positive number.');
    }

    const fromUpper = dto.fromCurrency.toUpperCase();
    const toUpper = dto.toCurrency.toUpperCase();
    const effDate = dto.effectiveDate || new Date().toISOString().split('T')[0];

    const existing = db.getCurrencyTranslationRates().find(
      (r) => r.fromCurrency === fromUpper && r.toCurrency === toUpper && r.rateType === dto.rateType && r.effectiveDate === effDate
    );

    if (existing) {
      return db.updateCurrencyTranslationRate(existing.id, {
        rate: formatDecimal(parseDecimal(dto.rate)),
        rateSource: dto.rateSource || existing.rateSource,
      }, ctx);
    }

    return db.createCurrencyTranslationRate({
      fromCurrency: fromUpper,
      toCurrency: toUpper,
      effectiveDate: effDate,
      rateType: dto.rateType,
      rate: formatDecimal(parseDecimal(dto.rate)),
      rateSource: dto.rateSource || 'Central Bank / Standard Group Translation',
    }, ctx);
  }

  public getTranslationRate(
    fromCurrency: string,
    toCurrency: string,
    rateType: CurrencyRateType = 'closing_rate',
    asOfDate?: string
  ): number {
    const fromUpper = fromCurrency.toUpperCase();
    const toUpper = toCurrency.toUpperCase();

    if (fromUpper === toUpper) return 1.0;

    const rates = db.getCurrencyTranslationRates();
    const dateLimit = asOfDate || new Date().toISOString().split('T')[0];

    // Filter matching pair and rateType <= asOfDate
    const matching = rates
      .filter((r) => r.fromCurrency === fromUpper && r.toCurrency === toUpper && r.rateType === rateType && r.effectiveDate <= dateLimit)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    if (matching.length > 0) {
      return parseFloat(matching[0].rate);
    }

    // Check inverse rate
    const inverse = rates
      .filter((r) => r.fromCurrency === toUpper && r.toCurrency === fromUpper && r.rateType === rateType && r.effectiveDate <= dateLimit)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    if (inverse.length > 0) {
      const invRate = parseFloat(inverse[0].rate);
      return invRate !== 0 ? 1 / invRate : 1.0;
    }

    return 1.0; // Default 1:1 if not explicitly configured
  }

  public translateAmount(
    amount: string | number,
    fromCurrency: string,
    toCurrency: string,
    rateType: CurrencyRateType = 'closing_rate',
    asOfDate?: string
  ): string {
    const amtNum = typeof amount === 'number' ? amount : parseFloat(amount || '0');
    const rate = this.getTranslationRate(fromCurrency, toCurrency, rateType, asOfDate);
    const converted = amtNum * rate;
    return formatDecimal(parseDecimal(converted.toFixed(4)));
  }
}

export const currencyTranslationService = new CurrencyTranslationService();
