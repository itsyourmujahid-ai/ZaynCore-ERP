// ============================================================================
// Employee Expense Claims Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbEmployeeExpenseClaim } from '@/database/types';
import { AccountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export class ExpenseClaimsService {
  private static instance: ExpenseClaimsService;
  private postingService = AccountingPostingService.getInstance();

  private constructor() {}

  public static getInstance(): ExpenseClaimsService {
    if (!ExpenseClaimsService.instance) {
      ExpenseClaimsService.instance = new ExpenseClaimsService();
    }
    return ExpenseClaimsService.instance;
  }

  public createExpenseClaim(
    input: {
      employeeId: string;
      employeeName: string;
      claimDate: string;
      purpose: string;
      notes?: string;
      lines: {
        category: string;
        expenseAccountId: string;
        description: string;
        amount: string;
        taxRate?: number;
        taxAmount?: string;
        receiptUrl?: string;
        costCenterId?: string;
        departmentId?: string;
        projectId?: string;
      }[];
    },
    ctx: TenantContext
  ): DbEmployeeExpenseClaim {
    const existing = db.getEmployeeExpenseClaims(ctx);
    const count = existing.length + 1;
    const claimNumber = `EXP-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    let subtotalNum = 0;
    let taxTotalNum = 0;

    const formattedLines = input.lines.map((line, idx) => {
      const amt = parseFloat(line.amount) || 0;
      const taxAmt = line.taxAmount ? parseFloat(line.taxAmount) : 0;
      subtotalNum += amt;
      taxTotalNum += taxAmt;

      return {
        id: `line-${idx + 1}-${Date.now()}`,
        category: line.category,
        expenseAccountId: line.expenseAccountId,
        description: line.description,
        amount: amt.toFixed(4),
        taxRate: line.taxRate,
        taxAmount: taxAmt.toFixed(4),
        receiptUrl: line.receiptUrl,
        costCenterId: line.costCenterId,
        departmentId: line.departmentId,
        projectId: line.projectId,
      };
    });

    const totalAmount = (subtotalNum + taxTotalNum).toFixed(4);

    return db.createEmployeeExpenseClaim(
      {
        claimNumber,
        employeeId: input.employeeId,
        employeeName: input.employeeName,
        claimDate: input.claimDate,
        purpose: input.purpose,
        subtotal: subtotalNum.toFixed(4),
        taxTotal: taxTotalNum.toFixed(4),
        totalAmount,
        currency: ctx.baseCurrency || 'USD',
        status: 'draft',
        notes: input.notes,
        lines: formattedLines,
      },
      ctx
    );
  }

  public submitExpenseClaim(claimId: string, ctx: TenantContext): DbEmployeeExpenseClaim {
    const claim = db.getEmployeeExpenseClaim(claimId, ctx);
    if (!claim) throw new Error(`Expense claim '${claimId}' not found.`);
    if (claim.status !== 'draft') throw new Error(`Only draft expense claims can be submitted.`);

    return db.updateEmployeeExpenseClaim(claimId, { status: 'submitted' }, ctx)!;
  }

  public approveExpenseClaim(claimId: string, ctx: TenantContext): DbEmployeeExpenseClaim {
    const claim = db.getEmployeeExpenseClaim(claimId, ctx);
    if (!claim) throw new Error(`Expense claim '${claimId}' not found.`);
    if (claim.status !== 'submitted') throw new Error(`Only submitted expense claims can be approved.`);

    return db.updateEmployeeExpenseClaim(
      claimId,
      {
        status: 'approved',
        approvedByUserId: ctx.userId || 'manager-admin',
      },
      ctx
    )!;
  }

  public postExpenseClaimToGL(
    claimId: string,
    ctx: TenantContext
  ): { claim: DbEmployeeExpenseClaim; journalEntryId: string } {
    const claim = db.getEmployeeExpenseClaim(claimId, ctx);
    if (!claim) throw new Error(`Expense claim '${claimId}' not found.`);
    if (claim.status !== 'approved') throw new Error(`Only approved expense claims can be posted to GL.`);

    const accounts = db.getAccounts(ctx);
    const payableAcc =
      accounts.find((a) => a.code === '2130' || a.name.toLowerCase().includes('employee payable')) ||
      accounts.find((a) => a.classification === 'liability' && (a as any).type === 'accounts_payable') ||
      accounts.find((a) => a.code === '2010') ||
      accounts.find((a) => a.code === '2100');

    if (!payableAcc) {
      throw new Error(`Employee Payable or Accounts Payable account not found in Chart of Accounts.`);
    }

    const customLines: any[] = [];

    // Debit each expense line
    for (const line of claim.lines) {
      const lineAmt = parseFloat(line.amount) + (line.taxAmount ? parseFloat(line.taxAmount) : 0);
      customLines.push({
        accountId: line.expenseAccountId,
        description: line.description || `Expense: ${claim.purpose}`,
        debitAmount: lineAmt.toFixed(4),
        creditAmount: '0.0000',
        departmentId: line.departmentId,
        costCenterId: line.costCenterId,
        projectId: line.projectId,
      });
    }

    // Credit Employee Payable for total
    customLines.push({
      accountId: payableAcc.id,
      description: `Employee Payable: ${claim.employeeName} (${claim.claimNumber})`,
      debitAmount: '0.0000',
      creditAmount: claim.totalAmount,
    });

    const journal = this.postingService.post(
      'MANUAL_JOURNAL_POSTED',
      {
        sourceType: 'expense_claim',
        sourceId: claim.id,
        documentNumber: claim.claimNumber,
        documentDate: claim.claimDate,
        memo: `Employee Expense Claim ${claim.claimNumber} - ${claim.employeeName} (${claim.purpose})`,
        currency: claim.currency,
        amount: claim.totalAmount,
        customLines,
      },
      ctx
    );

    const updated = db.updateEmployeeExpenseClaim(
      claim.id,
      {
        status: 'posted',
        journalEntryId: journal.id,
      },
      ctx
    )!;

    return { claim: updated, journalEntryId: journal.id };
  }

  public reimburseExpenseClaim(
    claimId: string,
    input: {
      reimbursementDate: string;
      bankAccountId: string;
      paymentMethod?: string;
      referenceNumber?: string;
    },
    ctx: TenantContext
  ): { claim: DbEmployeeExpenseClaim; journalEntryId: string } {
    const claim = db.getEmployeeExpenseClaim(claimId, ctx);
    if (!claim) throw new Error(`Expense claim '${claimId}' not found.`);
    if (claim.status !== 'posted') throw new Error(`Only posted expense claims can be reimbursed.`);

    const accounts = db.getAccounts(ctx);
    const payableAcc =
      accounts.find((a) => a.code === '2130' || a.name.toLowerCase().includes('employee payable')) ||
      accounts.find((a) => a.code === '2010') ||
      accounts.find((a) => a.code === '2100');

    if (!payableAcc) {
      throw new Error(`Employee Payable account not found.`);
    }

    const customLines = [
      {
        accountId: payableAcc.id,
        description: `Settlement of Employee Payable: ${claim.employeeName} (${claim.claimNumber})`,
        debitAmount: claim.totalAmount,
        creditAmount: '0.0000',
      },
      {
        accountId: input.bankAccountId,
        description: `Bank disbursement for Expense Claim ${claim.claimNumber}`,
        debitAmount: '0.0000',
        creditAmount: claim.totalAmount,
      },
    ];

    const journal = this.postingService.post(
      'MANUAL_JOURNAL_POSTED',
      {
        sourceType: 'expense_reimbursement',
        sourceId: claim.id,
        documentNumber: `REIMB-${claim.claimNumber}`,
        documentDate: input.reimbursementDate,
        memo: `Reimbursement for Expense Claim ${claim.claimNumber} (${claim.employeeName})`,
        currency: claim.currency,
        amount: claim.totalAmount,
        customLines,
      },
      ctx
    );

    const updated = db.updateEmployeeExpenseClaim(
      claim.id,
      {
        status: 'reimbursed',
        reimbursementDate: input.reimbursementDate,
        reimbursementJournalEntryId: journal.id,
      },
      ctx
    )!;

    return { claim: updated, journalEntryId: journal.id };
  }
}
