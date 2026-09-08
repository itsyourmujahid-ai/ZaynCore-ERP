// ============================================================================
// Tax Configuration Service (Jurisdictions, Registrations, Types & Codes)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import {
  DbTaxJurisdiction,
  DbTaxRegistration,
  DbTaxType,
  DbTaxCode,
  TaxDirection,
  TaxTreatment,
  TaxRecoverability,
} from '@/database/types';

export class TaxConfigurationService {
  // --- Jurisdictions ---
  public getJurisdictions(ctx: TenantContext): DbTaxJurisdiction[] {
    return db.getTaxJurisdictions(ctx);
  }

  public getJurisdictionById(id: string, ctx: TenantContext): DbTaxJurisdiction | undefined {
    return db.getTaxJurisdictionById(id, ctx);
  }

  public createJurisdiction(
    payload: {
      code: string;
      name: string;
      countryCode: string;
      stateOrRegion?: string;
      taxAuthorityName: string;
      defaultRegistrationNumber?: string;
      currency: string;
      effectiveDate?: string;
      notes?: string;
    },
    ctx: TenantContext
  ): DbTaxJurisdiction {
    const existing = db.getTaxJurisdictions(ctx).find((j) => j.code.toUpperCase() === payload.code.toUpperCase());
    if (existing) {
      throw new Error(`Tax jurisdiction code '${payload.code}' already exists`);
    }

    return db.createTaxJurisdiction(
      {
        code: payload.code.toUpperCase(),
        name: payload.name,
        countryCode: payload.countryCode.toUpperCase(),
        stateOrRegion: payload.stateOrRegion,
        taxAuthorityName: payload.taxAuthorityName,
        defaultRegistrationNumber: payload.defaultRegistrationNumber,
        currency: payload.currency.toUpperCase(),
        effectiveDate: payload.effectiveDate || new Date().toISOString().split('T')[0],
        status: 'active',
        notes: payload.notes,
      },
      ctx
    );
  }

  public updateJurisdiction(
    id: string,
    payload: Partial<DbTaxJurisdiction>,
    ctx: TenantContext
  ): DbTaxJurisdiction {
    return db.updateTaxJurisdiction(id, payload, ctx);
  }

  // --- Registrations ---
  public getRegistrations(ctx: TenantContext, jurisdictionId?: string): DbTaxRegistration[] {
    return db.getTaxRegistrations(ctx, jurisdictionId);
  }

  public createRegistration(
    payload: {
      jurisdictionId: string;
      registrationNumber: string;
      registrationType: string;
      taxAuthorityName?: string;
      effectiveDate?: string;
      expiryDate?: string;
      notes?: string;
    },
    ctx: TenantContext
  ): DbTaxRegistration {
    const jur = db.getTaxJurisdictionById(payload.jurisdictionId, ctx);
    if (!jur) {
      throw new Error(`Jurisdiction '${payload.jurisdictionId}' not found`);
    }

    return db.createTaxRegistration(
      {
        jurisdictionId: payload.jurisdictionId,
        registrationNumber: payload.registrationNumber.trim(),
        registrationType: payload.registrationType,
        taxAuthorityName: payload.taxAuthorityName || jur.taxAuthorityName,
        effectiveDate: payload.effectiveDate || new Date().toISOString().split('T')[0],
        expiryDate: payload.expiryDate,
        isActive: true,
        notes: payload.notes,
      },
      ctx
    );
  }

  public updateRegistration(
    id: string,
    payload: Partial<DbTaxRegistration>,
    ctx: TenantContext
  ): DbTaxRegistration {
    return db.updateTaxRegistration(id, payload, ctx);
  }

  // --- Tax Types ---
  public getTaxTypes(ctx: TenantContext): DbTaxType[] {
    return db.getTaxTypes(ctx);
  }

  public createTaxType(
    payload: {
      code: string;
      name: string;
      category: 'vat' | 'sales_tax' | 'purchase_tax' | 'withholding_tax' | 'customs_duty' | 'other';
      description?: string;
      isRecoverableByDefault?: boolean;
    },
    ctx: TenantContext
  ): DbTaxType {
    const existing = db.getTaxTypes(ctx).find((t) => t.code.toUpperCase() === payload.code.toUpperCase());
    if (existing) {
      throw new Error(`Tax type code '${payload.code}' already exists`);
    }

    return db.createTaxType(
      {
        code: payload.code.toUpperCase(),
        name: payload.name,
        category: payload.category,
        description: payload.description,
        isRecoverableByDefault: payload.isRecoverableByDefault ?? true,
        isActive: true,
      },
      ctx
    );
  }

  // --- Tax Codes & Rates ---
  public getTaxCodes(ctx: TenantContext, jurisdictionId?: string): DbTaxCode[] {
    return db.getTaxCodes(ctx, jurisdictionId);
  }

  public getTaxCodeById(id: string, ctx: TenantContext): DbTaxCode | undefined {
    return db.getTaxCodeById(id, ctx);
  }

  public createTaxCode(
    payload: {
      code: string;
      name: string;
      rate: string | number; // e.g. 0.05 or "0.0500"
      taxTypeId?: string;
      taxType: 'input_vat' | 'output_vat' | 'exempt';
      jurisdictionId?: string;
      direction?: TaxDirection;
      taxTreatment?: TaxTreatment;
      recoverability?: TaxRecoverability;
      recoverablePercentage?: string | number;
      accountId: string;
      nonRecoverableExpenseAccountId?: string;
      isInclusive?: boolean;
      effectiveFrom?: string;
      effectiveTo?: string;
      description?: string;
    },
    ctx: TenantContext
  ): DbTaxCode {
    const existing = db.getTaxCodes(ctx).find((t) => t.code.toUpperCase() === payload.code.toUpperCase());
    if (existing) {
      throw new Error(`Tax code '${payload.code}' already exists`);
    }

    const rateNum = typeof payload.rate === 'number' ? payload.rate : parseFloat(payload.rate || '0');
    const recPctNum = payload.recoverablePercentage !== undefined
      ? (typeof payload.recoverablePercentage === 'number' ? payload.recoverablePercentage : parseFloat(payload.recoverablePercentage))
      : (payload.recoverability === 'non_recoverable' ? 0.0 : 1.0);

    return db.createTaxCode(
      {
        code: payload.code.toUpperCase(),
        name: payload.name,
        rate: rateNum.toFixed(4),
        taxTypeId: payload.taxTypeId,
        taxType: payload.taxType,
        jurisdictionId: payload.jurisdictionId,
        direction: payload.direction || (payload.taxType === 'output_vat' ? 'output' : 'input'),
        taxTreatment: payload.taxTreatment || (rateNum === 0 ? 'zero_rated' : 'standard'),
        recoverability: payload.recoverability || (payload.taxType === 'output_vat' ? 'fully_recoverable' : 'fully_recoverable'),
        recoverablePercentage: recPctNum.toFixed(4),
        accountId: payload.accountId,
        nonRecoverableExpenseAccountId: payload.nonRecoverableExpenseAccountId,
        isInclusive: Boolean(payload.isInclusive),
        effectiveFrom: payload.effectiveFrom,
        effectiveTo: payload.effectiveTo,
        isActive: true,
        description: payload.description,
      },
      ctx
    );
  }

  public updateTaxCode(id: string, payload: Partial<DbTaxCode>, ctx: TenantContext): DbTaxCode {
    if (payload.rate !== undefined) {
      const rateNum = typeof payload.rate === 'number' ? payload.rate : parseFloat(payload.rate as string);
      payload.rate = rateNum.toFixed(4);
    }
    if (payload.recoverablePercentage !== undefined) {
      const recNum = typeof payload.recoverablePercentage === 'number' ? payload.recoverablePercentage : parseFloat(payload.recoverablePercentage as string);
      payload.recoverablePercentage = recNum.toFixed(4);
    }
    return db.updateTaxCode(id, payload, ctx);
  }
}

export const taxConfigurationService = new TaxConfigurationService();
