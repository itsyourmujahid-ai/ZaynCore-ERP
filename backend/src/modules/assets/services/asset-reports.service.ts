// ============================================================================
// Fixed Assets Reports & GL Sub-Ledger Reconciliation Service
// ============================================================================

import { db } from '@/database/storage';
import {
  DbFixedAsset,
  DbAssetTransfer,
  DbAssetDisposal,
  DbDepreciationScheduleLine,
} from '@/database/types';
import { TenantContext } from '@/core/types/common';

export interface FixedAssetOverviewStats {
  totalOriginalCost: string;
  totalAccumulatedDepreciation: string;
  totalAccumulatedImpairment: string;
  totalNetBookValue: string;
  activeAssetsCount: number;
  fullyDepreciatedCount: number;
  disposedCount: number;
  draftCount: number;
  totalAssetsCount: number;
}

export interface FixedAssetReconciliationResult {
  asOfDate: string;
  subLedger: {
    totalCost: string;
    totalAccumulatedDepreciation: string;
    totalAccumulatedImpairment: string;
    totalNetBookValue: string;
    activeAssetCount: number;
  };
  generalLedger: {
    fixedAssetControlBalance: string; // Account #1510
    accumDepControlBalance: string; // Account #1520
    accumImpControlBalance: string; // Account #1530
    glNetBookValue: string;
  };
  variance: {
    costVariance: string;
    accumDepVariance: string;
    accumImpVariance: string;
    netBookValueVariance: string;
    isBalanced: boolean;
  };
}

export class AssetReportsService {
  /**
   * Executive summary metrics for the Fixed Assets Dashboard
   */
  public getOverviewStats(ctx: TenantContext): FixedAssetOverviewStats {
    const assets = db.getFixedAssets(ctx);

    let cost = 0;
    let accumDep = 0;
    let accumImp = 0;
    let nbv = 0;
    let active = 0;
    let fullyDep = 0;
    let disposed = 0;
    let draft = 0;

    for (const a of assets) {
      if (a.status === 'in_service' || a.status === 'impaired' || a.status === 'capitalized') {
        cost += parseFloat(a.originalCost);
        accumDep += parseFloat(a.accumulatedDepreciation || '0');
        accumImp += parseFloat(a.accumulatedImpairment || '0');
        nbv += parseFloat(a.netBookValue || '0');
        active++;
      } else if (a.status === 'fully_depreciated') {
        cost += parseFloat(a.originalCost);
        accumDep += parseFloat(a.accumulatedDepreciation || '0');
        accumImp += parseFloat(a.accumulatedImpairment || '0');
        nbv += parseFloat(a.netBookValue || '0');
        fullyDep++;
      } else if (a.status === 'disposed' || a.status === 'written_off') {
        disposed++;
      } else if (a.status === 'draft' || a.status === 'acquired') {
        draft++;
      }
    }

    return {
      totalOriginalCost: cost.toFixed(4),
      totalAccumulatedDepreciation: accumDep.toFixed(4),
      totalAccumulatedImpairment: accumImp.toFixed(4),
      totalNetBookValue: nbv.toFixed(4),
      activeAssetsCount: active,
      fullyDepreciatedCount: fullyDep,
      disposedCount: disposed,
      draftCount: draft,
      totalAssetsCount: assets.length,
    };
  }

  /**
   * Comprehensive Asset Register Report
   */
  public getAssetRegister(
    filter?: { categoryId?: string; status?: string; branchId?: string },
    ctx: TenantContext = {} as TenantContext
  ): Array<DbFixedAsset & { categoryName: string }> {
    const assets = db.getFixedAssets(ctx);
    const categories = db.getAssetCategories(ctx);

    return assets
      .filter((a) => {
        if (filter?.categoryId && a.categoryId !== filter.categoryId) return false;
        if (filter?.status && a.status !== filter.status) return false;
        if (filter?.branchId && a.branchId !== filter.branchId) return false;
        return true;
      })
      .map((a) => {
        const cat = categories.find((c) => c.id === a.categoryId);
        return {
          ...a,
          categoryName: cat ? cat.name : 'Unassigned Category',
        };
      });
  }

  /**
   * Depreciation Schedule Report for an Asset
   */
  public getDepreciationScheduleReport(
    assetId: string,
    ctx: TenantContext
  ): DbDepreciationScheduleLine[] {
    return db.getDepreciationSchedules(assetId, ctx);
  }

  /**
   * Asset Movement & Transfer History Report
   */
  public getAssetMovementReport(
    assetId: string | undefined,
    ctx: TenantContext
  ): DbAssetTransfer[] {
    return db.getAssetTransfers(assetId, ctx);
  }

  /**
   * Disposals & Gain/Loss Schedule Report
   */
  public getDisposalGainLossReport(
    ctx: TenantContext
  ): Array<DbAssetDisposal & { assetCode: string; assetName: string }> {
    const disposals = db.getAssetDisposals(undefined, ctx);
    const assets = db.getFixedAssets(ctx);

    return disposals.map((d) => {
      const asset = assets.find((a) => a.id === d.assetId);
      return {
        ...d,
        assetCode: asset ? asset.assetCode : 'UNKNOWN',
        assetName: asset ? asset.name : 'Unknown Asset',
      };
    });
  }

  /**
   * Fixed Asset Sub-Ledger ↔ General Ledger Control Account Reconciliation
   * Reconciles Sub-Ledger Cost & Accum Dep with GL Accounts #1510 & #1520
   */
  public getFixedAssetReconciliation(ctx: TenantContext): FixedAssetReconciliationResult {
    const assets = db.getFixedAssets(ctx);
    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');

    // Sub-ledger calculations (Active + Fully Depreciated carrying amounts)
    let subCost = 0;
    let subAccumDep = 0;
    let subAccumImp = 0;
    let subNBV = 0;
    let activeCount = 0;

    for (const a of assets) {
      if (
        a.status === 'in_service' ||
        a.status === 'impaired' ||
        a.status === 'capitalized' ||
        a.status === 'fully_depreciated'
      ) {
        subCost += parseFloat(a.originalCost);
        subAccumDep += parseFloat(a.accumulatedDepreciation || '0');
        subAccumImp += parseFloat(a.accumulatedImpairment || '0');
        subNBV += parseFloat(a.netBookValue || '0');
        activeCount++;
      }
    }

    // GL Control Account balance resolution
    const faAccount = accounts.find((a) => a.code === '1510') || accounts.find((a) => a.classification === 'asset');
    const accumDepAccount = accounts.find((a) => a.code === '1520');
    const accumImpAccount = accounts.find((a) => a.code === '1530');

    let glFACost = 0;
    let glAccumDep = 0;
    let glAccumImp = 0;

    for (const j of journals) {
      for (const line of j.lines) {
        if (faAccount && line.accountId === faAccount.id) {
          glFACost += parseFloat(line.baseDebit) - parseFloat(line.baseCredit);
        }
        if (accumDepAccount && line.accountId === accumDepAccount.id) {
          // Contra asset account (Credit balance is positive accumulated depreciation)
          glAccumDep += parseFloat(line.baseCredit) - parseFloat(line.baseDebit);
        }
        if (accumImpAccount && line.accountId === accumImpAccount.id) {
          // Contra asset account
          glAccumImp += parseFloat(line.baseCredit) - parseFloat(line.baseDebit);
        }
      }
    }

    const glNBV = glFACost - glAccumDep - glAccumImp;

    const costDiff = Math.abs(subCost - glFACost);
    const depDiff = Math.abs(subAccumDep - glAccumDep);
    const impDiff = Math.abs(subAccumImp - glAccumImp);
    const nbvDiff = Math.abs(subNBV - glNBV);

    const isBalanced = costDiff < 0.005 && depDiff < 0.005 && impDiff < 0.005 && nbvDiff < 0.005;

    return {
      asOfDate: new Date().toISOString().split('T')[0],
      subLedger: {
        totalCost: subCost.toFixed(4),
        totalAccumulatedDepreciation: subAccumDep.toFixed(4),
        totalAccumulatedImpairment: subAccumImp.toFixed(4),
        totalNetBookValue: subNBV.toFixed(4),
        activeAssetCount: activeCount,
      },
      generalLedger: {
        fixedAssetControlBalance: glFACost.toFixed(4),
        accumDepControlBalance: glAccumDep.toFixed(4),
        accumImpControlBalance: glAccumImp.toFixed(4),
        glNetBookValue: glNBV.toFixed(4),
      },
      variance: {
        costVariance: (subCost - glFACost).toFixed(4),
        accumDepVariance: (subAccumDep - glAccumDep).toFixed(4),
        accumImpVariance: (subAccumImp - glAccumImp).toFixed(4),
        netBookValueVariance: (subNBV - glNBV).toFixed(4),
        isBalanced,
      },
    };
  }
}

export const assetReportsService = new AssetReportsService();
