// ============================================================================
// Tax Analytics & Reporting Service (Registers, Summaries & KPI Dashboard)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { taxLedgerService } from './tax-ledger.service';
import { taxReconciliationService } from './tax-reconciliation.service';

export interface TaxDashboardMetrics {
  totalOutputTax: string;
  totalRecoverableInputTax: string;
  totalNonRecoverableInputTax: string;
  netTaxPayable: string;
  netTaxRefundable: string;
  activeJurisdictionsCount: number;
  openTaxPeriodsCount: number;
  pendingReturnsCount: number;
  nextFilingDeadline?: string;
  isFullyReconciled: boolean;
  totalTransactionsCount: number;
}

export class TaxReportsService {
  /**
   * Aggregates real-time dashboard KPIs across all active tax operations.
   */
  public getDashboardMetrics(ctx: TenantContext): TaxDashboardMetrics {
    const jurisdictions = db.getTaxJurisdictions(ctx).filter((j) => j.status === 'active');
    const periods = db.getTaxPeriods(ctx);
    const openPeriods = periods.filter((p) => p.status === 'open');
    const returns = db.getTaxReturns(ctx);
    const pendingReturns = returns.filter((r) => r.status === 'draft' || r.status === 'prepared' || r.status === 'reviewed');

    const totals = taxLedgerService.getPeriodTotals(ctx, {});
    const recon = taxReconciliationService.getReconciliationReport(ctx);

    // Find next upcoming filing deadline
    const upcomingDeadlines = openPeriods
      .map((p) => p.filingDeadline)
      .sort((a, b) => a.localeCompare(b));
    const nextFilingDeadline = upcomingDeadlines[0];

    const netVal = totals.netTaxLiability;

    return {
      totalOutputTax: totals.totalOutputTax.toFixed(4),
      totalRecoverableInputTax: totals.totalRecoverableInputTax.toFixed(4),
      totalNonRecoverableInputTax: totals.totalNonRecoverableInputTax.toFixed(4),
      netTaxPayable: (netVal > 0 ? netVal : 0).toFixed(4),
      netTaxRefundable: (netVal < 0 ? Math.abs(netVal) : 0).toFixed(4),
      activeJurisdictionsCount: jurisdictions.length,
      openTaxPeriodsCount: openPeriods.length,
      pendingReturnsCount: pendingReturns.length,
      nextFilingDeadline,
      isFullyReconciled: recon.isFullyReconciled,
      totalTransactionsCount: recon.totalTaxTransactionsCount,
    };
  }

  /**
   * Generates detailed Output Tax Register (Sales).
   */
  public getOutputTaxRegister(
    ctx: TenantContext,
    filters?: { jurisdictionId?: string; startDate?: string; endDate?: string }
  ) {
    const entries = db.getTaxLedgerEntries(ctx, {
      ...filters,
      direction: 'output',
    });

    const customers = db.getCustomers(ctx);
    return entries.map((e) => {
      const cust = customers.find((c) => c.id === e.customerOrSupplierId);
      return {
        ...e,
        counterpartyName: cust?.name || 'Commercial Client',
      };
    });
  }

  /**
   * Generates detailed Input Tax Register (Purchases).
   */
  public getInputTaxRegister(
    ctx: TenantContext,
    filters?: { jurisdictionId?: string; startDate?: string; endDate?: string }
  ) {
    const entries = db.getTaxLedgerEntries(ctx, {
      ...filters,
      direction: 'input',
    });

    const suppliers = db.getSuppliers(ctx);
    return entries.map((e) => {
      const supp = suppliers.find((s) => s.id === e.customerOrSupplierId);
      return {
        ...e,
        counterpartyName: supp?.name || 'Vendor / Supplier',
      };
    });
  }

  /**
   * Generates Tax Summary grouped by Jurisdiction.
   */
  public getTaxSummaryByJurisdiction(ctx: TenantContext) {
    const jurisdictions = db.getTaxJurisdictions(ctx);
    const entries = db.getTaxLedgerEntries(ctx);

    return jurisdictions.map((j) => {
      const jurEntries = entries.filter((e) => e.jurisdictionId === j.id && e.status === 'posted');
      let outputTax = 0;
      let recoverableInputTax = 0;
      let nonRecoverableInputTax = 0;
      let taxableSales = 0;
      let taxablePurchases = 0;

      for (const e of jurEntries) {
        const taxable = parseFloat(e.baseTaxableAmount || '0');
        const tax = parseFloat(e.baseTaxAmount || '0');
        const rec = parseFloat(e.baseRecoverableAmount || '0');
        const nonRec = parseFloat(e.baseNonRecoverableAmount || '0');

        if (e.direction === 'output') {
          outputTax += tax;
          taxableSales += taxable;
        } else {
          recoverableInputTax += rec;
          nonRecoverableInputTax += nonRec;
          taxablePurchases += taxable;
        }
      }

      return {
        jurisdictionId: j.id,
        code: j.code,
        name: j.name,
        currency: j.currency,
        taxableSales: taxableSales.toFixed(4),
        outputTax: outputTax.toFixed(4),
        taxablePurchases: taxablePurchases.toFixed(4),
        recoverableInputTax: recoverableInputTax.toFixed(4),
        nonRecoverableInputTax: nonRecoverableInputTax.toFixed(4),
        netTaxLiability: (outputTax - recoverableInputTax).toFixed(4),
        transactionsCount: jurEntries.length,
      };
    });
  }
}

export const taxReportsService = new TaxReportsService();
