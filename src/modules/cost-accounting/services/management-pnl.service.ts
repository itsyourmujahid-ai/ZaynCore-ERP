// ============================================================================
// Multi-Dimensional Management P&L Aggregation Service (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';

export interface ManagementPnLLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: 'revenue' | 'direct_material' | 'direct_labor' | 'direct_expense' | 'operating_expense' | 'allocated_overhead' | 'other';
  amount: string;
  percentageOfRevenue: string;
}

export interface ManagementPnLStatement {
  currency: string;
  periodLabel: string;
  filtersApplied: {
    branchId?: string;
    branchName?: string;
    departmentId?: string;
    departmentName?: string;
    costCenterId?: string;
    costCenterName?: string;
    businessUnitId?: string;
    businessUnitName?: string;
    projectId?: string;
    projectName?: string;
  };
  totalRevenue: string;
  directMaterials: string;
  directLabor: string;
  directExpenses: string;
  totalDirectCosts: string;
  grossProfit: string;
  grossMarginPercentage: string;
  salariesAndBenefits: string;
  rentAndFacilities: string;
  utilitiesAndTech: string;
  generalAndAdmin: string;
  allocatedOverhead: string;
  totalOperatingExpenses: string;
  operatingProfit: string;
  operatingMarginPercentage: string;
  otherIncomeAndExpense: string;
  netProfit: string;
  netMarginPercentage: string;
  isProfitable: boolean;
  revenueLines: ManagementPnLLine[];
  directCostLines: ManagementPnLLine[];
  operatingExpenseLines: ManagementPnLLine[];
}

export class ManagementPnLService {
  public generateManagementPnL(
    filters?: {
      startDate?: string;
      endDate?: string;
      branchId?: string;
      departmentId?: string;
      costCenterId?: string;
      businessUnitId?: string;
      projectId?: string;
    },
    ctx?: TenantContext
  ): ManagementPnLStatement {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const accounts = db.getAccounts(tenantCtx);
    const journals = db.getJournalEntries(tenantCtx).filter((j) => j.status === 'posted');
    const branches = db.getBranches(tenantCtx);
    const depts = db.getDepartments(tenantCtx);
    const costCenters = db.getCostCenters(tenantCtx);
    const businessUnits = db.getBusinessUnits(tenantCtx);
    const projects = db.getProjects(tenantCtx);

    const revenueLines: ManagementPnLLine[] = [];
    const directCostLines: ManagementPnLLine[] = [];
    const operatingExpenseLines: ManagementPnLLine[] = [];

    // Temporary map of account movements
    const accountTotals = new Map<string, number>();

    for (const journal of journals) {
      if (filters?.startDate && journal.postingDate < filters.startDate) continue;
      if (filters?.endDate && journal.postingDate > filters.endDate) continue;
      if (filters?.branchId && journal.branchId !== filters.branchId) continue;

      for (const line of journal.lines) {
        if (filters?.departmentId && line.departmentId !== filters.departmentId) continue;
        if (filters?.costCenterId && line.costCenterId !== filters.costCenterId) continue;
        if (filters?.businessUnitId && line.businessUnitId !== filters.businessUnitId) continue;
        if (filters?.projectId && line.projectId !== filters.projectId) continue;

        const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
        const cred = parseFloat(line.baseCredit || line.creditAmount || '0');

        const prev = accountTotals.get(line.accountId) || 0;
        accountTotals.set(line.accountId, prev + (deb - cred));
      }
    }

    let totalRev = 0;
    let directMat = 0;
    let directLab = 0;
    let directExp = 0;
    let salBenef = 0;
    let rentFac = 0;
    let utilTech = 0;
    let genAdm = 0;
    let allocOvh = 0;
    let otherIncExp = 0;

    for (const acc of accounts) {
      const balanceDebMinusCred = accountTotals.get(acc.id) || 0;
      if (balanceDebMinusCred === 0) continue;

      if (acc.classification === 'revenue' || acc.accountType === 'revenue') {
        const revAmt = -balanceDebMinusCred; // Credit balance is positive revenue
        totalRev += revAmt;
        revenueLines.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          category: 'revenue',
          amount: revAmt.toFixed(4),
          percentageOfRevenue: '0.00',
        });
      } else if (acc.classification === 'cost_of_sales' || acc.code.startsWith('5')) {
        const cogsAmt = balanceDebMinusCred;
        if (acc.code.includes('5010') || acc.code.includes('5000')) {
          directMat += cogsAmt;
          directCostLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'direct_material', amount: cogsAmt.toFixed(4), percentageOfRevenue: '0.00' });
        } else if (acc.code.includes('5020')) {
          directLab += cogsAmt;
          directCostLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'direct_labor', amount: cogsAmt.toFixed(4), percentageOfRevenue: '0.00' });
        } else {
          directExp += cogsAmt;
          directCostLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'direct_expense', amount: cogsAmt.toFixed(4), percentageOfRevenue: '0.00' });
        }
      } else if (acc.classification === 'expense' || acc.code.startsWith('6')) {
        const expAmt = balanceDebMinusCred;
        if (acc.code.includes('6010') || acc.code.includes('6012') || acc.code.includes('6015')) {
          salBenef += expAmt;
          operatingExpenseLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'operating_expense', amount: expAmt.toFixed(4), percentageOfRevenue: '0.00' });
        } else if (acc.code.includes('6020')) {
          rentFac += expAmt;
          operatingExpenseLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'operating_expense', amount: expAmt.toFixed(4), percentageOfRevenue: '0.00' });
        } else if (acc.code.includes('6030')) {
          utilTech += expAmt;
          operatingExpenseLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'operating_expense', amount: expAmt.toFixed(4), percentageOfRevenue: '0.00' });
        } else if (acc.code.includes('6080')) {
          allocOvh += expAmt;
          operatingExpenseLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'allocated_overhead', amount: expAmt.toFixed(4), percentageOfRevenue: '0.00' });
        } else {
          genAdm += expAmt;
          operatingExpenseLines.push({ accountId: acc.id, accountCode: acc.code, accountName: acc.name, category: 'operating_expense', amount: expAmt.toFixed(4), percentageOfRevenue: '0.00' });
        }
      } else if (acc.classification === 'other_income' || acc.classification === 'other_expense') {
        otherIncExp += balanceDebMinusCred;
      }
    }

    // Compute percentages of revenue
    const calculatePct = (amt: number) => totalRev > 0 ? ((amt / totalRev) * 100).toFixed(2) : '0.00';

    revenueLines.forEach((l) => l.percentageOfRevenue = calculatePct(parseFloat(l.amount)));
    directCostLines.forEach((l) => l.percentageOfRevenue = calculatePct(parseFloat(l.amount)));
    operatingExpenseLines.forEach((l) => l.percentageOfRevenue = calculatePct(parseFloat(l.amount)));

    const totalDirect = directMat + directLab + directExp;
    const grossProf = totalRev - totalDirect;
    const grossMarginPct = calculatePct(grossProf);

    const totalOpex = salBenef + rentFac + utilTech + genAdm + allocOvh;
    const opProf = grossProf - totalOpex;
    const opMarginPct = calculatePct(opProf);

    const netProf = opProf - otherIncExp;
    const netMarginPct = calculatePct(netProf);

    return {
      currency: tenantCtx.baseCurrency,
      periodLabel: filters?.startDate ? `${filters.startDate} to ${filters.endDate || 'Present'}` : 'Year to Date',
      filtersApplied: {
        branchId: filters?.branchId,
        branchName: branches.find((b) => b.id === filters?.branchId)?.name,
        departmentId: filters?.departmentId,
        departmentName: depts.find((d) => d.id === filters?.departmentId)?.name,
        costCenterId: filters?.costCenterId,
        costCenterName: costCenters.find((c) => c.id === filters?.costCenterId)?.name,
        businessUnitId: filters?.businessUnitId,
        businessUnitName: businessUnits.find((bu) => bu.id === filters?.businessUnitId)?.name,
        projectId: filters?.projectId,
        projectName: projects.find((p) => p.id === filters?.projectId)?.name,
      },
      totalRevenue: totalRev.toFixed(4),
      directMaterials: directMat.toFixed(4),
      directLabor: directLab.toFixed(4),
      directExpenses: directExp.toFixed(4),
      totalDirectCosts: totalDirect.toFixed(4),
      grossProfit: grossProf.toFixed(4),
      grossMarginPercentage: grossMarginPct,
      salariesAndBenefits: salBenef.toFixed(4),
      rentAndFacilities: rentFac.toFixed(4),
      utilitiesAndTech: utilTech.toFixed(4),
      generalAndAdmin: genAdm.toFixed(4),
      allocatedOverhead: allocOvh.toFixed(4),
      totalOperatingExpenses: totalOpex.toFixed(4),
      operatingProfit: opProf.toFixed(4),
      operatingMarginPercentage: opMarginPct,
      otherIncomeAndExpense: otherIncExp.toFixed(4),
      netProfit: netProf.toFixed(4),
      netMarginPercentage: netMarginPct,
      isProfitable: netProf >= 0,
      revenueLines,
      directCostLines,
      operatingExpenseLines,
    };
  }
}

export const managementPnLService = new ManagementPnLService();
