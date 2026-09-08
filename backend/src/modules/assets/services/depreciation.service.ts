// ============================================================================
// Fixed Assets Depreciation Engine Service
// ============================================================================

import { db } from '@/database/storage';
import {
  DbFixedAsset,
  DbDepreciationScheduleLine,
  DbDepreciationRun,
  DbAccountingPeriod,
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { PeriodClosedError } from '@/core/errors/DomainErrors';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface DepreciationCalculationResult {
  depreciableAmount: string;
  monthlyDepreciation: string;
  annualDepreciation: string;
  totalPeriods: number;
}

export interface DepreciationRunPreview {
  period: DbAccountingPeriod;
  eligibleAssetsCount: number;
  totalDepreciationAmount: string;
  assets: Array<{
    assetId: string;
    assetCode: string;
    name: string;
    originalCost: string;
    currentAccumDep: string;
    currentNBV: string;
    periodDepreciation: string;
    newAccumDep: string;
    newNBV: string;
    scheduleLineId?: string;
  }>;
  validationErrors: string[];
}

export class DepreciationService {
  /**
   * Calculates straight-line periodic depreciation with 4-decimal precision
   */
  public calculateStraightLine(
    costStr: string,
    residualValueStr: string,
    usefulLifeMonths: number
  ): DepreciationCalculationResult {
    const cost = parseFloat(costStr) || 0;
    const residual = parseFloat(residualValueStr) || 0;
    const depreciable = Math.max(0, cost - residual);
    const months = Math.max(1, usefulLifeMonths);

    const monthly = depreciable / months;
    const annual = monthly * 12;

    return {
      depreciableAmount: depreciable.toFixed(4),
      monthlyDepreciation: monthly.toFixed(4),
      annualDepreciation: annual.toFixed(4),
      totalPeriods: months,
    };
  }

  /**
   * Generates or regenerates a full depreciation schedule for an asset
   */
  public generateSchedule(asset: DbFixedAsset, ctx: TenantContext): DbDepreciationScheduleLine[] {
    // Clean up any unposted existing schedule lines for this asset
    db.deleteDepreciationScheduleForAsset(asset.id, ctx);

    const periods = db.getAccountingPeriods(ctx);
    const residual = parseFloat(asset.residualValue || '0');
    const usefulMonths = asset.usefulLifeMonths || 36;
    const monthlyDep = parseFloat(this.calculateStraightLine(asset.originalCost, asset.residualValue, usefulMonths).monthlyDepreciation);

    const scheduleLines: DbDepreciationScheduleLine[] = [];
    let currentOpening = parseFloat(asset.netBookValue || asset.originalCost);
    let runningAccum = parseFloat(asset.accumulatedDepreciation || '0');

    // Generate schedule lines for usefulMonths
    for (let i = 0; i < usefulMonths; i++) {
      if (currentOpening <= residual) break;

      let dep = monthlyDep;
      if (currentOpening - dep < residual) {
        dep = currentOpening - residual;
      }

      const closing = Math.max(residual, currentOpening - dep);
      runningAccum += dep;

      const periodIndex = i % (periods.length || 1);
      const period = periods[periodIndex];

      const line = db.createDepreciationScheduleLine({
        assetId: asset.id,
        periodId: period ? period.id : `period-${i + 1}`,
        periodName: period ? period.name : `Month ${i + 1}`,
        fiscalYearId: period ? period.fiscalYearId : undefined,
        openingNBV: currentOpening.toFixed(4),
        depreciationAmount: dep.toFixed(4),
        accumulatedDepreciation: runningAccum.toFixed(4),
        closingNBV: closing.toFixed(4),
        isPosted: false,
      }, ctx);

      scheduleLines.push(line);
      currentOpening = closing;
    }

    return scheduleLines;
  }

  /**
   * Previews a batch depreciation run for a specific accounting period
   */
  public previewDepreciationRun(periodId: string, ctx: TenantContext): DepreciationRunPreview {
    const periods = db.getAccountingPeriods(ctx);
    const period = periods.find((p) => p.id === periodId);
    if (!period) throw new Error(`Accounting period '${periodId}' not found`);

    const errors: string[] = [];
    if (period.status === 'closed') {
      errors.push(`Accounting period '${period.name}' is closed. Depreciation cannot be posted into a closed period.`);
    }

    const assets = db.getFixedAssets(ctx).filter(
      (a) => a.status === 'in_service' || a.status === 'impaired' || a.status === 'capitalized'
    );

    const allSchedules = db.getDepreciationSchedules(undefined, ctx);
    const previewAssets: DepreciationRunPreview['assets'] = [];
    let totalDep = 0;

    for (const asset of assets) {
      const schedule = allSchedules.find(
        (s) => s.assetId === asset.id && s.periodId === periodId && !s.isPosted
      );

      // If a schedule line exists for this period, use it; otherwise compute regular monthly depreciation
      let periodDep = 0;
      let lineId: string | undefined = undefined;

      if (schedule) {
        periodDep = parseFloat(schedule.depreciationAmount);
        lineId = schedule.id;
      } else {
        const residual = parseFloat(asset.residualValue || '0');
        const nbv = parseFloat(asset.netBookValue);
        if (nbv > residual) {
          const calc = this.calculateStraightLine(asset.originalCost, asset.residualValue, asset.usefulLifeMonths);
          const standardDep = parseFloat(calc.monthlyDepreciation);
          periodDep = Math.min(standardDep, nbv - residual);
        }
      }

      if (periodDep > 0) {
        const currentAccum = parseFloat(asset.accumulatedDepreciation);
        const currentNBV = parseFloat(asset.netBookValue);
        const newAccum = currentAccum + periodDep;
        const newNBV = Math.max(parseFloat(asset.residualValue || '0'), currentNBV - periodDep);

        totalDep += periodDep;
        previewAssets.push({
          assetId: asset.id,
          assetCode: asset.assetCode,
          name: asset.name,
          originalCost: asset.originalCost,
          currentAccumDep: currentAccum.toFixed(4),
          currentNBV: currentNBV.toFixed(4),
          periodDepreciation: periodDep.toFixed(4),
          newAccumDep: newAccum.toFixed(4),
          newNBV: newNBV.toFixed(4),
          scheduleLineId: lineId,
        });
      }
    }

    return {
      period,
      eligibleAssetsCount: previewAssets.length,
      totalDepreciationAmount: totalDep.toFixed(4),
      assets: previewAssets,
      validationErrors: errors,
    };
  }

  /**
   * Executes a batch depreciation run, updates asset carrying values, and posts automatic GL entries
   */
  public executeDepreciationRun(periodId: string, notes: string | undefined, ctx: TenantContext): DbDepreciationRun {
    const preview = this.previewDepreciationRun(periodId, ctx);
    if (preview.validationErrors.length > 0) {
      throw new PeriodClosedError(preview.period.name, preview.period.status || 'closed');
    }

    if (preview.assets.length === 0) {
      throw new Error(`No eligible active fixed assets found for depreciation in period '${preview.period.name}'`);
    }

    const runNumber = 'DRUN-' + Date.now().toString(36).toUpperCase();
    const runDate = preview.period.endDate;

    // Create the batch depreciation run record
    const depRun = db.createDepreciationRun({
      runNumber,
      periodId,
      fiscalYearId: preview.period.fiscalYearId,
      runDate,
      totalAssetsCount: preview.eligibleAssetsCount,
      totalDepreciationAmount: preview.totalDepreciationAmount,
      status: 'posted',
      postedBy: ctx.userFullName || ctx.userEmail,
      postedAt: new Date().toISOString(),
      notes: notes || `Batch monthly depreciation run for ${preview.period.name}`,
    }, ctx);

    // Process each asset: update balances, schedule lines, and post double-entry GL journal
    for (const item of preview.assets) {
      const asset = db.getFixedAssetById(item.assetId, ctx);
      if (!asset) continue;

      // 1. Post automatic double-entry journal via centralized posting service
      // Dr Depreciation Expense (#6020), Cr Accumulated Depreciation (#1520)
      const journal = accountingPostingService.post('ASSET_DEPRECIATION_POSTED', {
        documentNumber: `${runNumber}-${asset.assetCode}`,
        documentDate: runDate,
        amount: item.periodDepreciation,
        currency: asset.currency || ctx.baseCurrency,
        exchangeRate: asset.exchangeRate || '1.000000',
        sourceType: 'FixedAssetDepreciation',
        sourceId: `${depRun.id}:${asset.id}`,
        subLedgerType: 'fixed_asset',
        subLedgerEntityId: asset.id,
        departmentId: asset.departmentId,
        costCenterId: asset.costCenterId,
        projectId: asset.projectId,
        memo: `Depreciation for ${asset.assetCode} (${asset.name}) in ${preview.period.name}`,
      }, ctx);

      // 2. Update asset carrying value
      const isFullyDepreciated = parseFloat(item.newNBV) <= parseFloat(asset.residualValue || '0');
      db.updateFixedAsset(asset.id, {
        accumulatedDepreciation: item.newAccumDep,
        netBookValue: item.newNBV,
        status: isFullyDepreciated ? 'fully_depreciated' : (asset.status === 'impaired' ? 'impaired' : 'in_service'),
      }, ctx);

      // 3. Mark schedule line as posted if found
      if (item.scheduleLineId) {
        db.updateDepreciationScheduleLine(item.scheduleLineId, {
          isPosted: true,
          journalEntryId: journal.id,
          postedDate: runDate,
        }, ctx);
      }
    }

    return depRun;
  }
}

export const depreciationService = new DepreciationService();
