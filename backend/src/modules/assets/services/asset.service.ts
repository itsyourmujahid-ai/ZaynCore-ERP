// ============================================================================
// Fixed Assets Domain & Lifecycle Service
// ============================================================================

import { db } from '@/database/storage';
import {
  DbFixedAsset,
  DbAssetCategory,
  DbAssetTransfer,
  DbAssetImpairment,
  DbAssetDisposal,
  DisposalType,
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { PeriodClosedError, ImmutableRecordError } from '@/core/errors/DomainErrors';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { depreciationService } from './depreciation.service';

export class AssetService {
  // --------------------------------------------------------------------------
  // Category Management
  // --------------------------------------------------------------------------
  public getCategories(ctx: TenantContext): DbAssetCategory[] {
    return db.getAssetCategories(ctx);
  }

  public getCategoryById(id: string, ctx: TenantContext): DbAssetCategory | undefined {
    return db.getAssetCategoryById(id, ctx);
  }

  public createCategory(
    payload: Omit<DbAssetCategory, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbAssetCategory {
    return db.createAssetCategory(payload, ctx);
  }

  public updateCategory(
    id: string,
    payload: Partial<DbAssetCategory>,
    ctx: TenantContext
  ): DbAssetCategory {
    return db.updateAssetCategory(id, payload, ctx);
  }

  // --------------------------------------------------------------------------
  // Asset Master Registration & Retrieval
  // --------------------------------------------------------------------------
  public getAssets(ctx: TenantContext): DbFixedAsset[] {
    return db.getFixedAssets(ctx);
  }

  public getAssetById(id: string, ctx: TenantContext): DbFixedAsset | undefined {
    return db.getFixedAssetById(id, ctx);
  }

  public createAsset(
    payload: Omit<DbFixedAsset, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'accumulatedDepreciation' | 'accumulatedImpairment' | 'netBookValue'> & {
      accumulatedDepreciation?: string;
      accumulatedImpairment?: string;
      netBookValue?: string;
    },
    ctx: TenantContext
  ): DbFixedAsset {
    const cost = parseFloat(payload.originalCost) || 0;
    const accumDep = parseFloat(payload.accumulatedDepreciation || '0') || 0;
    const accumImp = parseFloat(payload.accumulatedImpairment || '0') || 0;
    const residual = parseFloat(payload.residualValue || '0') || 0;
    const calculatedNBV = Math.max(0, cost - accumDep - accumImp);

    // If category provided, inherit default accounts if not explicitly set
    let assetAcc = payload.assetAccountId || 'acc-1510';
    let accumDepAcc = payload.accumDepAccountId || 'acc-1520';
    let depExpAcc = payload.depExpenseAccountId || 'acc-6020';
    let dispAcc = payload.disposalGainLossAccountId || 'acc-4085';

    if (payload.categoryId) {
      const cat = db.getAssetCategoryById(payload.categoryId, ctx);
      if (cat) {
        assetAcc = payload.assetAccountId || cat.assetAccountId || assetAcc;
        accumDepAcc = payload.accumDepAccountId || cat.accumDepAccountId || accumDepAcc;
        depExpAcc = payload.depExpenseAccountId || cat.depExpenseAccountId || depExpAcc;
        dispAcc = payload.disposalGainLossAccountId || cat.disposalGainLossAccountId || dispAcc;
      }
    }

    const asset = db.createFixedAsset({
      ...payload,
      assetAccountId: assetAcc,
      accumDepAccountId: accumDepAcc,
      depExpenseAccountId: depExpAcc,
      disposalGainLossAccountId: dispAcc,
      residualValue: residual.toFixed(4),
      accumulatedDepreciation: accumDep.toFixed(4),
      accumulatedImpairment: accumImp.toFixed(4),
      netBookValue: calculatedNBV.toFixed(4),
    }, ctx);

    // If opening asset balance entered with active in_service status, generate initial schedule
    if (asset.status === 'in_service' && calculatedNBV > residual) {
      depreciationService.generateSchedule(asset, ctx);
    }

    return asset;
  }

  public updateAsset(
    id: string,
    payload: Partial<DbFixedAsset>,
    ctx: TenantContext
  ): DbFixedAsset {
    return db.updateFixedAsset(id, payload, ctx);
  }

  // --------------------------------------------------------------------------
  // Asset Capitalization Workflow
  // --------------------------------------------------------------------------
  public capitalizeAsset(
    assetId: string,
    payload: {
      capitalizationDate: string;
      inServiceDate?: string;
      contraAccountId?: string; // default clearing / AP / bank
      notes?: string;
    },
    ctx: TenantContext
  ): DbFixedAsset {
    const asset = db.getFixedAssetById(assetId, ctx);
    if (!asset) throw new Error(`Fixed asset '${assetId}' not found`);

    if (asset.status === 'capitalized' || asset.status === 'in_service') {
      throw new Error(`Asset '${asset.assetCode}' is already capitalized.`);
    }
    if (asset.status === 'disposed' || asset.status === 'written_off') {
      throw new ImmutableRecordError('FixedAsset', assetId);
    }

    // Verify accounting period is open for capitalizationDate
    const periods = db.getAccountingPeriods(ctx);
    const period = periods.find(
      (p) => payload.capitalizationDate >= p.startDate && payload.capitalizationDate <= p.endDate
    );
    if (period && period.status === 'closed') {
      throw new PeriodClosedError(period.name);
    }

    // Post double-entry Capitalization Journal
    // Dr Fixed Asset (#1510), Cr Asset Clearing / AP / Bank (#1590 / #2010 / #1010)
    const journal = accountingPostingService.post('ASSET_CAPITALIZATION_POSTED', {
      documentNumber: `CAP-${asset.assetCode}`,
      documentDate: payload.capitalizationDate,
      amount: asset.originalCost,
      currency: asset.currency || ctx.baseCurrency,
      exchangeRate: asset.exchangeRate || '1.000000',
      sourceType: 'FixedAssetCapitalization',
      sourceId: asset.id,
      subLedgerType: 'fixed_asset',
      subLedgerEntityId: asset.id,
      departmentId: asset.departmentId,
      costCenterId: asset.costCenterId,
      projectId: asset.projectId,
      memo: `Capitalization of ${asset.assetCode} - ${asset.name}`,
    }, ctx);

    // Update asset status and link journal
    const updatedAsset = db.updateFixedAsset(asset.id, {
      status: 'in_service',
      capitalizationDate: payload.capitalizationDate,
      inServiceDate: payload.inServiceDate || payload.capitalizationDate,
      capitalizationJournalId: journal.id,
      netBookValue: asset.originalCost,
      accumulatedDepreciation: '0.0000',
      accumulatedImpairment: '0.0000',
      notes: payload.notes || asset.notes,
    }, ctx);

    // Generate monthly straight-line depreciation schedule
    depreciationService.generateSchedule(updatedAsset, ctx);

    return updatedAsset;
  }

  // --------------------------------------------------------------------------
  // Asset Transfer Workflow
  // --------------------------------------------------------------------------
  public transferAsset(
    assetId: string,
    payload: {
      transferDate: string;
      toBranchId?: string;
      toDepartmentId?: string;
      toCostCenterId?: string;
      toLocation?: string;
      toCustodian?: string;
      reason?: string;
    },
    ctx: TenantContext
  ): DbAssetTransfer {
    const asset = db.getFixedAssetById(assetId, ctx);
    if (!asset) throw new Error(`Fixed asset '${assetId}' not found`);

    if (asset.status === 'disposed' || asset.status === 'written_off') {
      throw new ImmutableRecordError('FixedAsset', assetId);
    }

    const transferNumber = 'ATRF-' + Date.now().toString(36).toUpperCase();

    const transfer = db.createAssetTransfer({
      transferNumber,
      assetId: asset.id,
      transferDate: payload.transferDate,
      fromBranchId: asset.branchId,
      toBranchId: payload.toBranchId || asset.branchId,
      fromDepartmentId: asset.departmentId,
      toDepartmentId: payload.toDepartmentId || asset.departmentId,
      fromCostCenterId: asset.costCenterId,
      toCostCenterId: payload.toCostCenterId || asset.costCenterId,
      fromLocation: asset.location,
      toLocation: payload.toLocation || asset.location,
      fromCustodian: asset.custodianName,
      toCustodian: payload.toCustodian || asset.custodianName,
      reason: payload.reason,
      status: 'posted',
    }, ctx);

    // Update asset dimensions
    db.updateFixedAsset(asset.id, {
      branchId: payload.toBranchId || asset.branchId,
      departmentId: payload.toDepartmentId || asset.departmentId,
      costCenterId: payload.toCostCenterId || asset.costCenterId,
      location: payload.toLocation || asset.location,
      custodianName: payload.toCustodian || asset.custodianName,
    }, ctx);

    return transfer;
  }

  // --------------------------------------------------------------------------
  // Asset Impairment Workflow
  // --------------------------------------------------------------------------
  public impairAsset(
    assetId: string,
    payload: {
      impairmentDate: string;
      impairmentAmount: string;
      reason: string;
    },
    ctx: TenantContext
  ): DbAssetImpairment {
    const asset = db.getFixedAssetById(assetId, ctx);
    if (!asset) throw new Error(`Fixed asset '${assetId}' not found`);

    if (asset.status === 'disposed' || asset.status === 'written_off') {
      throw new ImmutableRecordError('FixedAsset', assetId);
    }

    const impAmt = parseFloat(payload.impairmentAmount);
    if (impAmt <= 0) throw new Error('Impairment amount must be greater than zero');

    const currentNBV = parseFloat(asset.netBookValue);
    const residual = parseFloat(asset.residualValue || '0');
    if (impAmt > currentNBV - residual) {
      throw new Error(`Impairment amount ($${impAmt.toFixed(4)}) exceeds remaining recoverable net book value ($${(currentNBV - residual).toFixed(4)})`);
    }

    // Verify accounting period is open
    const periods = db.getAccountingPeriods(ctx);
    const period = periods.find(
      (p) => payload.impairmentDate >= p.startDate && payload.impairmentDate <= p.endDate
    );
    if (period && period.status === 'closed') {
      throw new PeriodClosedError(period.name);
    }

    const impairmentNumber = 'IMP-' + Date.now().toString(36).toUpperCase();
    const postNBV = currentNBV - impAmt;

    // Post double-entry Impairment journal:
    // Dr Loss on Impairment (#6085), Cr Accumulated Impairment (#1530)
    const journal = accountingPostingService.post('ASSET_IMPAIRMENT_POSTED', {
      documentNumber: impairmentNumber,
      documentDate: payload.impairmentDate,
      amount: impAmt.toFixed(4),
      currency: asset.currency || ctx.baseCurrency,
      exchangeRate: asset.exchangeRate || '1.000000',
      sourceType: 'FixedAssetImpairment',
      sourceId: asset.id,
      subLedgerType: 'fixed_asset',
      subLedgerEntityId: asset.id,
      departmentId: asset.departmentId,
      costCenterId: asset.costCenterId,
      projectId: asset.projectId,
      memo: `Asset Impairment for ${asset.assetCode} (${asset.name}): ${payload.reason}`,
    }, ctx);

    // Record impairment
    const impairment = db.createAssetImpairment({
      impairmentNumber,
      assetId: asset.id,
      impairmentDate: payload.impairmentDate,
      preImpairmentNBV: currentNBV.toFixed(4),
      impairmentAmount: impAmt.toFixed(4),
      postImpairmentNBV: postNBV.toFixed(4),
      reason: payload.reason,
      status: 'posted',
      journalEntryId: journal.id,
      approvedBy: ctx.userFullName || ctx.userEmail,
    }, ctx);

    // Update asset balances
    const currentAccumImp = parseFloat(asset.accumulatedImpairment || '0');
    const updatedAsset = db.updateFixedAsset(asset.id, {
      accumulatedImpairment: (currentAccumImp + impAmt).toFixed(4),
      netBookValue: postNBV.toFixed(4),
      status: postNBV <= residual ? 'fully_depreciated' : 'impaired',
    }, ctx);

    // Recalculate remaining depreciation schedule on reduced carrying value
    if (postNBV > residual) {
      depreciationService.generateSchedule(updatedAsset, ctx);
    }

    return impairment;
  }

  // --------------------------------------------------------------------------
  // Asset Disposal & Write-Off Workflow
  // --------------------------------------------------------------------------
  public disposeAsset(
    assetId: string,
    payload: {
      disposalDate: string;
      disposalType: DisposalType;
      disposalProceeds?: string;
      customerId?: string;
      bankAccountId?: string;
      notes?: string;
    },
    ctx: TenantContext
  ): DbAssetDisposal {
    const asset = db.getFixedAssetById(assetId, ctx);
    if (!asset) throw new Error(`Fixed asset '${assetId}' not found`);

    if (asset.status === 'disposed' || asset.status === 'written_off') {
      throw new ImmutableRecordError('FixedAsset', assetId);
    }

    // Verify period is open
    const periods = db.getAccountingPeriods(ctx);
    const period = periods.find(
      (p) => payload.disposalDate >= p.startDate && payload.disposalDate <= p.endDate
    );
    if (period && period.status === 'closed') {
      throw new PeriodClosedError(period.name);
    }

    const cost = parseFloat(asset.originalCost);
    const accumDep = parseFloat(asset.accumulatedDepreciation || '0');
    const accumImp = parseFloat(asset.accumulatedImpairment || '0');
    const nbv = Math.max(0, cost - accumDep - accumImp);
    const proceeds = parseFloat(payload.disposalProceeds || '0');

    // Gain / Loss calculation: Proceeds - NBV
    const gainLoss = proceeds - nbv;
    const isGain = gainLoss >= 0;
    const gainLossAmount = Math.abs(gainLoss);

    const disposalNumber = 'DISP-' + Date.now().toString(36).toUpperCase();

    // Construct balanced multi-line double-entry lines:
    // Debit side: Proceeds (Cash/Bank #1010) + Accum Dep (#1520) + Accum Imp (#1530) + Loss (#6085 if Loss)
    // Credit side: Fixed Asset (#1510) + Gain (#4085 if Gain)
    const customLines: Array<{
      accountCode: string;
      description: string;
      debitAmount: string;
      creditAmount: string;
      subLedgerType?: 'fixed_asset' | 'bank_account' | 'customer';
      subLedgerEntityId?: string;
    }> = [];

    // 1. Proceeds (Dr Bank / AR)
    if (proceeds > 0) {
      customLines.push({
        accountCode: '1010', // Operating Bank Account
        description: `Disposal Proceeds for ${asset.assetCode}`,
        debitAmount: proceeds.toFixed(4),
        creditAmount: '0.0000',
        subLedgerType: 'bank_account',
        subLedgerEntityId: payload.bankAccountId || 'ba-apex-main-usd',
      });
    }

    // 2. Accumulated Depreciation Removal (Dr #1520)
    if (accumDep > 0) {
      customLines.push({
        accountCode: '1520',
        description: `Derecognize Accum Dep for ${asset.assetCode}`,
        debitAmount: accumDep.toFixed(4),
        creditAmount: '0.0000',
        subLedgerType: 'fixed_asset',
        subLedgerEntityId: asset.id,
      });
    }

    // 3. Accumulated Impairment Removal (Dr #1530)
    if (accumImp > 0) {
      customLines.push({
        accountCode: '1530',
        description: `Derecognize Accum Impairment for ${asset.assetCode}`,
        debitAmount: accumImp.toFixed(4),
        creditAmount: '0.0000',
        subLedgerType: 'fixed_asset',
        subLedgerEntityId: asset.id,
      });
    }

    // 4. Loss on Disposal (Dr #6085)
    if (!isGain && gainLossAmount > 0) {
      customLines.push({
        accountCode: '6085',
        description: `Loss on Disposal of ${asset.assetCode}`,
        debitAmount: gainLossAmount.toFixed(4),
        creditAmount: '0.0000',
      });
    }

    // 5. Fixed Asset Cost Derecognition (Cr #1510)
    customLines.push({
      accountCode: '1510',
      description: `Derecognize Asset Cost: ${asset.assetCode}`,
      debitAmount: '0.0000',
      creditAmount: cost.toFixed(4),
      subLedgerType: 'fixed_asset',
      subLedgerEntityId: asset.id,
    });

    // 6. Gain on Disposal (Cr #4085)
    if (isGain && gainLossAmount > 0) {
      customLines.push({
        accountCode: '4085',
        description: `Gain on Disposal of ${asset.assetCode}`,
        debitAmount: '0.0000',
        creditAmount: gainLossAmount.toFixed(4),
      });
    }

    // Post double-entry journal
    const journal = accountingPostingService.post('ASSET_DISPOSAL_POSTED', {
      documentNumber: disposalNumber,
      documentDate: payload.disposalDate,
      amount: cost.toFixed(4),
      currency: asset.currency || ctx.baseCurrency,
      exchangeRate: asset.exchangeRate || '1.000000',
      sourceType: 'FixedAssetDisposal',
      sourceId: asset.id,
      subLedgerType: 'fixed_asset',
      subLedgerEntityId: asset.id,
      customLines,
      memo: `Disposal of ${asset.assetCode} (${payload.disposalType}): Net Book Value $${nbv.toFixed(4)}, Proceeds $${proceeds.toFixed(4)}, Gain/Loss $${gainLossAmount.toFixed(4)}`,
    }, ctx);

    // Record disposal
    const disposal = db.createAssetDisposal({
      disposalNumber,
      assetId: asset.id,
      disposalDate: payload.disposalDate,
      disposalType: payload.disposalType,
      originalCost: cost.toFixed(4),
      accumulatedDepreciation: accumDep.toFixed(4),
      accumulatedImpairment: accumImp.toFixed(4),
      netBookValue: nbv.toFixed(4),
      disposalProceeds: proceeds.toFixed(4),
      customerId: payload.customerId,
      bankAccountId: payload.bankAccountId,
      gainLossAmount: gainLossAmount.toFixed(4),
      isGain,
      status: 'posted',
      journalEntryId: journal.id,
      notes: payload.notes,
    }, ctx);

    // Update asset status to disposed
    db.updateFixedAsset(asset.id, {
      status: payload.disposalType === 'write_off' ? 'written_off' : 'disposed',
      netBookValue: '0.0000',
    }, ctx);

    // Delete future unposted depreciation schedule lines
    db.deleteDepreciationScheduleForAsset(asset.id, ctx);

    return disposal;
  }

  public writeOffAsset(
    assetId: string,
    reason: string,
    date: string,
    ctx: TenantContext
  ): DbAssetDisposal {
    return this.disposeAsset(assetId, {
      disposalDate: date,
      disposalType: 'write_off',
      disposalProceeds: '0.0000',
      notes: `Asset Complete Write-off: ${reason}`,
    }, ctx);
  }
}

export const assetService = new AssetService();
