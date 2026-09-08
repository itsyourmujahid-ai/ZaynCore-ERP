// ============================================================================
// Tax Adjustment Management Service (Controlled Corrections & Audit Posting)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbTaxAdjustment, TaxAdjustmentType } from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { taxLedgerService } from './tax-ledger.service';

export class TaxAdjustmentService {
  public getAdjustments(ctx: TenantContext, jurisdictionId?: string): DbTaxAdjustment[] {
    return db.getTaxAdjustments(ctx, jurisdictionId);
  }

  public getAdjustmentById(id: string, ctx: TenantContext): DbTaxAdjustment | undefined {
    return db.getTaxAdjustmentById(id, ctx);
  }

  public createAdjustment(
    payload: {
      jurisdictionId: string;
      taxPeriodId?: string;
      adjustmentDate?: string;
      adjustmentType: TaxAdjustmentType;
      direction: 'increase_liability' | 'decrease_liability' | 'increase_recoverable' | 'decrease_recoverable';
      amount: string | number;
      currency?: string;
      reason: string;
      taxCodeId?: string;
      glAccountId?: string;
      offsetAccountId?: string;
    },
    ctx: TenantContext
  ): DbTaxAdjustment {
    const amountNum = parseFloat(String(payload.amount || '0'));
    if (amountNum <= 0) {
      throw new Error('Tax adjustment amount must be greater than zero');
    }

    const adjustmentNumber = `TAX-ADJ-${Date.now().toString(36).substring(2, 7).toUpperCase()}`;

    return db.createTaxAdjustment(
      {
        jurisdictionId: payload.jurisdictionId,
        taxPeriodId: payload.taxPeriodId,
        adjustmentNumber,
        adjustmentDate: payload.adjustmentDate || new Date().toISOString().split('T')[0],
        adjustmentType: payload.adjustmentType,
        direction: payload.direction,
        amount: amountNum.toFixed(4),
        currency: (payload.currency || ctx.baseCurrency).toUpperCase(),
        reason: payload.reason,
        taxCodeId: payload.taxCodeId,
        glAccountId: payload.glAccountId,
        offsetAccountId: payload.offsetAccountId,
        status: 'draft',
      },
      ctx
    );
  }

  public approveAdjustment(id: string, ctx: TenantContext): DbTaxAdjustment {
    return db.updateTaxAdjustment(
      id,
      {
        status: 'approved',
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
      },
      ctx
    );
  }

  public postAdjustment(id: string, ctx: TenantContext): { adjustment: DbTaxAdjustment; journalEntryId: string } {
    const adj = db.getTaxAdjustmentById(id, ctx);
    if (!adj) throw new Error(`Tax adjustment '${id}' not found`);

    if (adj.status === 'posted' && adj.journalEntryId) {
      return { adjustment: adj, journalEntryId: adj.journalEntryId };
    }

    const accounts = db.getAccounts(ctx);
    const taxExpenseAcc = accounts.find((a) => a.code === '6080') || accounts.find((a) => a.classification === 'expense') || accounts[0];
    const taxIncomeAcc = accounts.find((a) => a.code === '4080') || accounts.find((a) => a.classification === 'other_income') || accounts[0];
    const outputVatAcc = accounts.find((a) => a.code === '2200') || accounts[0];
    const inputVatAcc = accounts.find((a) => a.code === '1450') || accounts[0];

    const amountVal = parseFloat(adj.amount);

    const customLines: Array<{
      accountCode: string;
      description: string;
      debitAmount: string;
      creditAmount: string;
      subLedgerType?: 'customer' | 'supplier' | 'bank_account' | 'inventory_item' | 'fixed_asset' | 'employee' | 'tax_code' | 'tax_jurisdiction';
      subLedgerEntityId?: string;
    }> = [];

    if (adj.direction === 'increase_liability') {
      // Dr Tax Adjustment Expense (#6080), Cr Output VAT (#2200)
      customLines.push({
        accountCode: taxExpenseAcc.code,
        description: `Tax Adjustment Expense: ${adj.adjustmentNumber} (${adj.reason})`,
        debitAmount: amountVal.toFixed(4),
        creditAmount: '0.0000',
      });
      customLines.push({
        accountCode: outputVatAcc.code,
        description: `Increase Output Tax: ${adj.adjustmentNumber}`,
        debitAmount: '0.0000',
        creditAmount: amountVal.toFixed(4),
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: adj.jurisdictionId,
      });
    } else if (adj.direction === 'decrease_liability') {
      // Dr Output VAT (#2200), Cr Tax Adjustment Income (#4080)
      customLines.push({
        accountCode: outputVatAcc.code,
        description: `Decrease Output Tax: ${adj.adjustmentNumber}`,
        debitAmount: amountVal.toFixed(4),
        creditAmount: '0.0000',
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: adj.jurisdictionId,
      });
      customLines.push({
        accountCode: taxIncomeAcc.code,
        description: `Tax Adjustment Credit: ${adj.adjustmentNumber} (${adj.reason})`,
        debitAmount: '0.0000',
        creditAmount: amountVal.toFixed(4),
      });
    } else if (adj.direction === 'increase_recoverable') {
      // Dr Input VAT (#1450), Cr Tax Adjustment Income (#4080)
      customLines.push({
        accountCode: inputVatAcc.code,
        description: `Increase Recoverable Input VAT: ${adj.adjustmentNumber}`,
        debitAmount: amountVal.toFixed(4),
        creditAmount: '0.0000',
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: adj.jurisdictionId,
      });
      customLines.push({
        accountCode: taxIncomeAcc.code,
        description: `Tax Adjustment Credit: ${adj.adjustmentNumber} (${adj.reason})`,
        debitAmount: '0.0000',
        creditAmount: amountVal.toFixed(4),
      });
    } else {
      // decrease_recoverable: Dr Tax Adjustment Expense (#6080), Cr Input VAT (#1450)
      customLines.push({
        accountCode: taxExpenseAcc.code,
        description: `Decrease Recoverable Input VAT Expense: ${adj.adjustmentNumber}`,
        debitAmount: amountVal.toFixed(4),
        creditAmount: '0.0000',
      });
      customLines.push({
        accountCode: inputVatAcc.code,
        description: `Reduce Input VAT: ${adj.adjustmentNumber}`,
        debitAmount: '0.0000',
        creditAmount: amountVal.toFixed(4),
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: adj.jurisdictionId,
      });
    }

    const journal = accountingPostingService.post(
      'TAX_ADJUSTMENT_POSTED',
      {
        sourceType: 'TaxAdjustment',
        sourceId: adj.id,
        documentNumber: adj.adjustmentNumber,
        documentDate: adj.adjustmentDate,
        memo: `Tax Adjustment: ${adj.adjustmentNumber} (${adj.reason})`,
        currency: adj.currency,
        amount: amountVal.toFixed(4),
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: adj.jurisdictionId,
        customLines,
      },
      ctx
    );

    // Record in tax sub-ledger
    taxLedgerService.recordEntry(
      {
        jurisdictionId: adj.jurisdictionId,
        taxCodeId: adj.taxCodeId || 'tax-adj',
        taxCode: 'TAX-ADJUSTMENT',
        direction: adj.direction.includes('liability') ? 'output' : 'input',
        sourceModule: 'tax_adjustment',
        sourceType: 'TaxAdjustment',
        sourceId: adj.id,
        documentNumber: adj.adjustmentNumber,
        transactionDate: adj.adjustmentDate,
        taxPeriodId: adj.taxPeriodId,
        taxableAmount: '0.0000',
        taxRate: '0.0000',
        taxAmount: amountVal.toFixed(4),
        recoverableAmount: adj.direction.includes('recoverable') ? amountVal.toFixed(4) : '0.0000',
        currency: adj.currency,
        journalEntryId: journal.id,
        glAccountId: adj.direction.includes('liability') ? outputVatAcc.id : inputVatAcc.id,
        notes: adj.reason,
      },
      ctx
    );

    const updated = db.updateTaxAdjustment(
      adj.id,
      {
        status: 'posted',
        journalEntryId: journal.id,
        postedBy: ctx.userId,
        postedAt: new Date().toISOString(),
      },
      ctx
    );

    return { adjustment: updated, journalEntryId: journal.id };
  }
}

export const taxAdjustmentService = new TaxAdjustmentService();
