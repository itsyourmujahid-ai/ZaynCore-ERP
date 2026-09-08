// ============================================================================
// Business Unit & Divisional Accounting Service (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { DbBusinessUnit } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export interface BusinessUnitPnLSummary {
  businessUnitId: string;
  code: string;
  name: string;
  description?: string;
  managerName?: string;
  totalRevenue: string;
  directCosts: string;
  allocatedOverhead: string;
  totalCosts: string;
  contributionMargin: string;
  contributionMarginPercentage: string;
  netOperatingProfit: string;
  netProfitMarginPercentage: string;
  status: string;
}

export class BusinessUnitService {
  public getBusinessUnits(ctx: TenantContext): DbBusinessUnit[] {
    const list = db.getBusinessUnits(ctx);
    if (list.length === 0) {
      // Seed initial default business units if none exist
      const defaultBUs: Array<Omit<DbBusinessUnit, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>> = [
        { code: 'BU-COMMERCIAL', name: 'Commercial Products & Enterprise Solutions', description: 'B2B commercial sales and high-volume enterprise engagements', managerName: 'Director of Commercial Operations', status: 'active' },
        { code: 'BU-SERVICES', name: 'Professional Services & Consulting', description: 'Implementation, architecture, managed services, and technical consulting', managerName: 'Head of Professional Services', status: 'active' },
        { code: 'BU-DIGITAL', name: 'Digital Platforms & SaaS Division', description: 'Cloud subscription services, digital products, and platform licensing', managerName: 'VP of Digital Business', status: 'active' },
      ];
      return defaultBUs.map((bu) => db.createBusinessUnit(bu, ctx));
    }
    return list;
  }

  public getBusinessUnitById(id: string, ctx: TenantContext): DbBusinessUnit | undefined {
    return db.getBusinessUnitById(id, ctx);
  }

  public createBusinessUnit(
    payload: {
      code: string;
      name: string;
      description?: string;
      parentBusinessUnitId?: string;
      managerName?: string;
      currency?: string;
    },
    ctx: TenantContext
  ): DbBusinessUnit {
    const existing = db.getBusinessUnits(ctx).find((bu) => bu.code === payload.code);
    if (existing) {
      throw new DomainValidationError(`Business Unit code '${payload.code}' already exists.`);
    }

    return db.createBusinessUnit({
      ...payload,
      status: 'active',
    }, ctx);
  }

  public updateBusinessUnit(
    id: string,
    payload: Partial<DbBusinessUnit>,
    ctx: TenantContext
  ): DbBusinessUnit {
    return db.updateBusinessUnit(id, payload, ctx);
  }

  /**
   * Calculates Business Unit Divisional P&L and Contribution Margin
   */
  public calculateBusinessUnitPnL(businessUnitId: string, ctx: TenantContext): BusinessUnitPnLSummary {
    const bu = db.getBusinessUnitById(businessUnitId, ctx);
    if (!bu) throw new DomainValidationError(`Business Unit '${businessUnitId}' not found.`);

    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');

    let totalRevenueNum = 0;
    let directCostsNum = 0;
    let allocatedOverheadNum = 0;

    for (const journal of journals) {
      for (const line of journal.lines) {
        if (line.businessUnitId !== businessUnitId) continue;

        const acc = accounts.find((a) => a.id === line.accountId);
        if (!acc) continue;

        const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
        const cred = parseFloat(line.baseCredit || line.creditAmount || '0');

        if (acc.classification === 'revenue' || acc.accountType === 'revenue') {
          totalRevenueNum += (cred - deb);
        } else if (acc.classification === 'expense' || acc.accountType === 'expense' || acc.accountType === 'cost_of_sales') {
          if (journal.postingEvent === 'COST_ALLOCATION_POSTED') {
            allocatedOverheadNum += (deb - cred);
          } else {
            directCostsNum += (deb - cred);
          }
        }
      }
    }

    const contributionMarginNum = totalRevenueNum - directCostsNum;
    const cmPct = totalRevenueNum > 0 ? ((contributionMarginNum / totalRevenueNum) * 100).toFixed(2) : '0.00';

    const totalCostsNum = directCostsNum + allocatedOverheadNum;
    const netProfitNum = totalRevenueNum - totalCostsNum;
    const netMarginPct = totalRevenueNum > 0 ? ((netProfitNum / totalRevenueNum) * 100).toFixed(2) : '0.00';

    return {
      businessUnitId: bu.id,
      code: bu.code,
      name: bu.name,
      description: bu.description,
      managerName: bu.managerName,
      totalRevenue: totalRevenueNum.toFixed(4),
      directCosts: directCostsNum.toFixed(4),
      allocatedOverhead: allocatedOverheadNum.toFixed(4),
      totalCosts: totalCostsNum.toFixed(4),
      contributionMargin: contributionMarginNum.toFixed(4),
      contributionMarginPercentage: cmPct,
      netOperatingProfit: netProfitNum.toFixed(4),
      netProfitMarginPercentage: netMarginPct,
      status: bu.status,
    };
  }

  public getBusinessUnitPortfolio(ctx: TenantContext): BusinessUnitPnLSummary[] {
    const list = this.getBusinessUnits(ctx);
    return list.map((bu) => this.calculateBusinessUnitPnL(bu.id, ctx));
  }
}

export const businessUnitService = new BusinessUnitService();
