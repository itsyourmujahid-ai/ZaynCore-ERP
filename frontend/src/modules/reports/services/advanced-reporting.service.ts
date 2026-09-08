// ============================================================================
// Advanced Enterprise Reporting & Financial Analytics Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { parseDecimal, formatDecimal } from '@/core/utils/money';

export type ReportCategory = 
  | 'financial'
  | 'sales_ar'
  | 'purchases_ap'
  | 'inventory'
  | 'banking'
  | 'assets'
  | 'payroll'
  | 'tax'
  | 'projects'
  | 'management'
  | 'group_consolidation';

export interface ReportFilterCriteria {
  startDate?: string;
  endDate?: string;
  fiscalYearId?: string;
  periodId?: string;
  companyId?: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
  accountId?: string;
  currency?: string;
}

export interface ReportColumnDefinition {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  isNumeric?: boolean;
}

export interface GenericReportData {
  reportKey: string;
  title: string;
  category: ReportCategory;
  columns: ReportColumnDefinition[];
  rows: Record<string, any>[];
  summary?: Record<string, string>;
  generatedAt: string;
  filters: ReportFilterCriteria;
}

export interface DrillDownSourceItem {
  type: 'journal' | 'invoice' | 'bill' | 'payment' | 'project' | 'cost_allocation' | 'intercompany';
  id: string;
  referenceNumber: string;
  date: string;
  amount: string;
  currency: string;
  description: string;
  companyName: string;
  accountName: string;
}

export class AdvancedReportingService {
  public getAvailableReportCategories(): Array<{ key: ReportCategory; label: string; count: number }> {
    return [
      { key: 'financial', label: 'Financial Statements & GL', count: 4 },
      { key: 'sales_ar', label: 'Sales & Accounts Receivable', count: 3 },
      { key: 'purchases_ap', label: 'Purchases & Accounts Payable', count: 3 },
      { key: 'inventory', label: 'Inventory & Stock Valuation', count: 2 },
      { key: 'banking', label: 'Banking & Cash Management', count: 2 },
      { key: 'assets', label: 'Fixed Assets & Depreciation', count: 2 },
      { key: 'payroll', label: 'HR & Payroll Register', count: 2 },
      { key: 'tax', label: 'Tax & VAT Returns', count: 2 },
      { key: 'projects', label: 'Project Accounting & WIP', count: 3 },
      { key: 'management', label: 'Cost Centers & Budgets (BvA)', count: 3 },
      { key: 'group_consolidation', label: 'Group & Consolidation Statements', count: 4 },
    ];
  }

  public generateReport(
    reportKey: string,
    filters: ReportFilterCriteria,
    ctx: TenantContext
  ): GenericReportData {
    const targetCompId = filters.companyId || ctx.companyId;
    const targetCtx: TenantContext = {
      ...ctx,
      companyId: targetCompId,
    };

    switch (reportKey) {
      case 'trial_balance': {
        const accounts = db.getAccounts(targetCtx);
        const journals = db.getJournalEntries(targetCtx);

        let totalDeb = 0;
        let totalCred = 0;

        const rows = accounts.map((acc) => {
          let deb = 0;
          let cred = 0;

          journals.forEach((j) => {
            if (j.status === 'posted') {
              if (!filters.startDate || j.entryDate >= filters.startDate) {
                if (!filters.endDate || j.entryDate <= filters.endDate) {
                  j.lines.forEach((l) => {
                    if (l.accountId === acc.id) {
                      deb += parseFloat(l.debitAmount || '0');
                      cred += parseFloat(l.creditAmount || '0');
                    }
                  });
                }
              }
            }
          });

          totalDeb += deb;
          totalCred += cred;
          const net = deb - cred;

          return {
            id: acc.id,
            code: acc.code,
            name: acc.name,
            classification: acc.classification.toUpperCase(),
            debit: formatDecimal(parseDecimal(deb.toFixed(4))),
            credit: formatDecimal(parseDecimal(cred.toFixed(4))),
            netBalance: formatDecimal(parseDecimal(net.toFixed(4))),
          };
        });

        return {
          reportKey: 'trial_balance',
          title: 'General Ledger Trial Balance',
          category: 'financial',
          columns: [
            { key: 'code', label: 'Account Code', align: 'left' },
            { key: 'name', label: 'Account Name', align: 'left' },
            { key: 'classification', label: 'Type', align: 'left' },
            { key: 'debit', label: 'Debit Total', align: 'right', isNumeric: true },
            { key: 'credit', label: 'Credit Total', align: 'right', isNumeric: true },
            { key: 'netBalance', label: 'Net Balance', align: 'right', isNumeric: true },
          ],
          rows,
          summary: {
            totalDebit: formatDecimal(parseDecimal(totalDeb.toFixed(4))),
            totalCredit: formatDecimal(parseDecimal(totalCred.toFixed(4))),
            variance: formatDecimal(parseDecimal(Math.abs(totalDeb - totalCred).toFixed(4))),
          },
          generatedAt: new Date().toISOString(),
          filters,
        };
      }

      case 'customer_aging': {
        const invoices = db.getSalesInvoices(targetCtx);
        const customers = db.getCustomers(targetCtx);

        let currentSum = 0;
        let totalOut = 0;

        const rows = customers.map((c) => {
          let cCurrent = 0;
          let c30 = 0;
          let c60 = 0;
          let c90 = 0;

          invoices.forEach((inv) => {
            if (inv.customerId === c.id && inv.status === 'posted') {
              const bal = parseFloat(inv.balanceDue || '0');
              if (bal > 0) {
                // Determine bucket based on date
                cCurrent += bal;
              }
            }
          });

          const cTotal = cCurrent + c30 + c60 + c90;
          currentSum += cCurrent;
          totalOut += cTotal;

          return {
            id: c.id,
            customerCode: c.code,
            customerName: c.name,
            current: formatDecimal(parseDecimal(cCurrent.toFixed(4))),
            days30: formatDecimal(parseDecimal(c30.toFixed(4))),
            days60: formatDecimal(parseDecimal(c60.toFixed(4))),
            days90Plus: formatDecimal(parseDecimal(c90.toFixed(4))),
            totalOutstanding: formatDecimal(parseDecimal(cTotal.toFixed(4))),
          };
        });

        return {
          reportKey: 'customer_aging',
          title: 'Accounts Receivable Aging Portfolio',
          category: 'sales_ar',
          columns: [
            { key: 'customerCode', label: 'Code', align: 'left' },
            { key: 'customerName', label: 'Customer Name', align: 'left' },
            { key: 'current', label: 'Current (0-30d)', align: 'right', isNumeric: true },
            { key: 'days30', label: '31-60 Days', align: 'right', isNumeric: true },
            { key: 'days60', label: '61-90 Days', align: 'right', isNumeric: true },
            { key: 'days90Plus', label: '90+ Days', align: 'right', isNumeric: true },
            { key: 'totalOutstanding', label: 'Total Due', align: 'right', isNumeric: true },
          ],
          rows,
          summary: {
            totalOutstanding: formatDecimal(parseDecimal(totalOut.toFixed(4))),
          },
          generatedAt: new Date().toISOString(),
          filters,
        };
      }

      default: {
        // Generic fallback report
        const accounts = db.getAccounts(targetCtx);
        const rows = accounts.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          classification: a.classification,
          currency: targetCtx.baseCurrency,
        }));

        return {
          reportKey,
          title: `Standard Report (${reportKey})`,
          category: 'financial',
          columns: [
            { key: 'code', label: 'Code', align: 'left' },
            { key: 'name', label: 'Name', align: 'left' },
            { key: 'classification', label: 'Classification', align: 'left' },
            { key: 'currency', label: 'Currency', align: 'center' },
          ],
          rows,
          generatedAt: new Date().toISOString(),
          filters,
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // Financial Drill-Down Engine
  // --------------------------------------------------------------------------
  public drillDownAccount(
    accountId: string,
    filters: ReportFilterCriteria,
    ctx: TenantContext
  ): DrillDownSourceItem[] {
    const targetCompId = filters.companyId || ctx.companyId;
    const targetCtx: TenantContext = {
      ...ctx,
      companyId: targetCompId,
    };

    const company = db.getCompanyById(targetCompId, targetCtx) || db.getCompanies()[0];
    const accounts = db.getAccounts(targetCtx);
    const targetAcc = accounts.find((a) => a.id === accountId);
    const accName = targetAcc ? `${targetAcc.code} - ${targetAcc.name}` : 'Unknown Account';

    const journals = db.getJournalEntries(targetCtx);
    const items: DrillDownSourceItem[] = [];

    journals.forEach((j) => {
      if (j.status === 'posted') {
        if (!filters.startDate || j.entryDate >= filters.startDate) {
          if (!filters.endDate || j.entryDate <= filters.endDate) {
            j.lines.forEach((l) => {
              if (l.accountId === accountId) {
                const amt = parseFloat(l.debitAmount) > 0 ? l.debitAmount : l.creditAmount;
                items.push({
                  type: 'journal',
                  id: j.id,
                  referenceNumber: j.entryNumber,
                  date: j.entryDate,
                  amount: formatDecimal(parseDecimal(amt)),
                  currency: l.currency || company.baseCurrency,
                  description: l.description || j.memo || 'GL Transaction',
                  companyName: company.name,
                  accountName: accName,
                });
              }
            });
          }
        }
      }
    });

    return items;
  }

  // --------------------------------------------------------------------------
  // Export Engine
  // --------------------------------------------------------------------------
  public exportToCsv(report: GenericReportData): string {
    const headers = report.columns.map((c) => `"${c.label}"`).join(',');
    const rows = report.rows.map((row) =>
      report.columns.map((c) => `"${row[c.key] ?? ''}"`).join(',')
    );

    let csv = [headers, ...rows].join('\n');
    if (report.summary) {
      csv += '\n\nSUMMARY TOTALS\n';
      for (const [k, v] of Object.entries(report.summary)) {
        csv += `"${k}","${v}"\n`;
      }
    }

    return csv;
  }
}

export const advancedReportingService = new AdvancedReportingService();
