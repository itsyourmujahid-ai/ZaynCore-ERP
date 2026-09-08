// ============================================================================
// Intercompany Transaction & Synchronized Journal Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbIntercompanyTransaction, 
  IntercompanyTransactionType,
  DbAccount 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { ValidationError, NotFoundError, ImmutableRecordError } from '@/core/errors/DomainErrors';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { parseDecimal, formatDecimal } from '@/core/utils/money';

export interface CreateIntercompanyTransactionDTO {
  sourceCompanyId: string;
  targetCompanyId: string;
  transactionType: IntercompanyTransactionType;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  targetDocumentType?: string;
  targetDocumentId?: string;
  targetDocumentNumber?: string;
  transactionDate: string; // YYYY-MM-DD
  currency?: string;
  exchangeRate?: string;
  amount: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  intercompanyReceivableAccountId?: string;
  intercompanyPayableAccountId?: string;
  memo?: string;
}

export class IntercompanyService {
  public getTransactions(ctx?: TenantContext): DbIntercompanyTransaction[] {
    return db.getIntercompanyTransactions(ctx);
  }

  public getTransactionById(id: string, ctx?: TenantContext): DbIntercompanyTransaction {
    const tx = db.getIntercompanyTransactionById(id, ctx);
    if (!tx) {
      throw new NotFoundError('IntercompanyTransaction', id);
    }
    return tx;
  }

  public createTransaction(dto: CreateIntercompanyTransactionDTO, ctx: TenantContext): DbIntercompanyTransaction {
    if (!dto.sourceCompanyId || !dto.targetCompanyId) {
      throw new ValidationError('Source company and target company are required.');
    }

    if (dto.sourceCompanyId === dto.targetCompanyId) {
      throw new ValidationError('Source company and target company cannot be identical.');
    }

    const amountNum = parseFloat(dto.amount || '0');
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new ValidationError('Intercompany transaction amount must be greater than 0.');
    }

    const sourceCompany = db.getCompanyById(dto.sourceCompanyId, ctx);
    const targetCompany = db.getCompanyById(dto.targetCompanyId, ctx);
    if (!sourceCompany || !targetCompany) {
      throw new ValidationError('One or both companies do not exist.');
    }

    const txNumber = 'IC-' + Date.now().toString(36).toUpperCase();

    return db.createIntercompanyTransaction({
      transactionNumber: txNumber,
      sourceCompanyId: dto.sourceCompanyId,
      targetCompanyId: dto.targetCompanyId,
      transactionType: dto.transactionType || 'sales_purchase',
      sourceDocumentType: dto.sourceDocumentType,
      sourceDocumentId: dto.sourceDocumentId,
      sourceDocumentNumber: dto.sourceDocumentNumber,
      targetDocumentType: dto.targetDocumentType,
      targetDocumentId: dto.targetDocumentId,
      targetDocumentNumber: dto.targetDocumentNumber,
      transactionDate: dto.transactionDate || new Date().toISOString().split('T')[0],
      currency: dto.currency || sourceCompany.baseCurrency,
      exchangeRate: dto.exchangeRate || '1.000000',
      amount: formatDecimal(parseDecimal(dto.amount)),
      sourceAccountId: dto.sourceAccountId,
      targetAccountId: dto.targetAccountId,
      intercompanyReceivableAccountId: dto.intercompanyReceivableAccountId,
      intercompanyPayableAccountId: dto.intercompanyPayableAccountId,
      status: 'draft',
      memo: dto.memo,
      createdById: ctx.userId,
    }, ctx);
  }

  public approveTransaction(id: string, ctx: TenantContext): DbIntercompanyTransaction {
    const tx = this.getTransactionById(id, ctx);
    if (tx.status !== 'draft' && tx.status !== 'submitted') {
      throw new ValidationError(`Cannot approve transaction in status '${tx.status}'.`);
    }

    return db.updateIntercompanyTransaction(id, {
      status: 'approved',
      approvedById: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  private ensureCompanyAccounts(ctx: TenantContext): DbAccount[] {
    let accounts = db.getAccounts(ctx);
    if (accounts.length === 0) {
      const standard = [
        { code: '1010', name: 'Operating Bank Account', classification: 'asset' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '1200', name: 'Trade Receivables (AR)', classification: 'asset' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '1220', name: 'Intercompany Receivables', classification: 'asset' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '2010', name: 'Trade Payables (AP)', classification: 'liability' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '2020', name: 'Intercompany Payables', classification: 'liability' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '3010', name: 'Shareholders Capital & Equity', classification: 'equity' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '4010', name: 'Sales & Service Revenue', classification: 'revenue' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '5010', name: 'Cost of Goods Sold', classification: 'cost_of_sales' as const, currency: ctx.baseCurrency || 'USD' },
        { code: '6080', name: 'Operating & Admin Expenses', classification: 'expense' as const, currency: ctx.baseCurrency || 'USD' },
      ];
      standard.forEach((s) => {
        const isDebit = s.classification === 'asset' || s.classification === 'expense' || s.classification === 'cost_of_sales';
        db.createAccount({
          code: s.code,
          name: s.name,
          classification: s.classification,
          accountType: s.classification,
          groupId: 'grp-root',
          level: 1,
          normalBalance: isDebit ? 'debit' : 'credit',
          currency: s.currency,
          isActive: true,
          isControlAccount: false,
          isReconciliationAccount: false,
          isSystemAccount: true,
          allowManualJournal: true,
        }, ctx);
      });
      accounts = db.getAccounts(ctx);
    }
    return accounts;
  }

  public postTransaction(id: string, ctx: TenantContext): DbIntercompanyTransaction {
    const tx = db.getIntercompanyTransactionById(id, ctx);
    if (!tx) {
      throw new NotFoundError('IntercompanyTransaction', id);
    }

    if (tx.status === 'posted' || tx.status === 'settled' || tx.status === 'closed') {
      throw new ImmutableRecordError('IntercompanyTransaction', id);
    }

    const sourceCompany = db.getCompanyById(tx.sourceCompanyId, ctx) || db.getCompanies()[0];
    const targetCompany = db.getCompanyById(tx.targetCompanyId, ctx) || db.getCompanies()[0];

    // Context for Source Company
    const sourceCtx: TenantContext = {
      ...ctx,
      companyId: sourceCompany.id,
      companyTier: sourceCompany.tier,
      baseCurrency: sourceCompany.baseCurrency,
    };

    // Context for Target Company
    const targetCtx: TenantContext = {
      ...ctx,
      companyId: targetCompany.id,
      companyTier: targetCompany.tier,
      baseCurrency: targetCompany.baseCurrency,
    };

    // 1. Post Source Company Entry (Dr Intercompany Receivable, Cr Revenue)
    const sourceAccounts = this.ensureCompanyAccounts(sourceCtx);
    const sourceRevAcc = tx.sourceAccountId 
      ? sourceAccounts.find((a) => a.id === tx.sourceAccountId)
      : sourceAccounts.find((a) => a.code === '4010') || sourceAccounts.find((a) => a.classification === 'revenue') || sourceAccounts[0];
    const sourceIcRecAcc = tx.intercompanyReceivableAccountId
      ? sourceAccounts.find((a) => a.id === tx.intercompanyReceivableAccountId)
      : sourceAccounts.find((a) => a.code === '1220') || sourceAccounts.find((a) => a.code === '1200') || sourceAccounts[0];

    const sourceJournal = accountingPostingService.post('INTERCOMPANY_TRANSACTION_POSTED', {
      sourceType: 'IntercompanyTransaction',
      sourceId: tx.id,
      documentNumber: tx.transactionNumber,
      documentDate: tx.transactionDate,
      amount: tx.amount,
      currency: tx.currency,
      exchangeRate: tx.exchangeRate,
      memo: `Intercompany Outflow to ${targetCompany.name}: ${tx.memo || tx.transactionNumber}`,
      subLedgerType: 'customer',
      subLedgerEntityId: targetCompany.id,
      customLines: [
        {
          accountId: sourceIcRecAcc ? sourceIcRecAcc.id : sourceAccounts[0].id,
          debitAmount: tx.amount,
          creditAmount: '0.0000',
          description: `IC Receivable from ${targetCompany.name}`,
          subLedgerType: 'intercompany',
          subLedgerEntityId: targetCompany.id,
        },
        {
          accountId: sourceRevAcc ? sourceRevAcc.id : sourceAccounts[0].id,
          debitAmount: '0.0000',
          creditAmount: tx.amount,
          description: `IC Revenue from ${targetCompany.name}`,
          subLedgerType: 'intercompany',
          subLedgerEntityId: targetCompany.id,
        },
      ],
    }, sourceCtx);

    // 2. Post Target Company Entry (Dr Intercompany Expense, Cr Intercompany Payable)
    const targetAccounts = this.ensureCompanyAccounts(targetCtx);
    const targetExpAcc = tx.targetAccountId
      ? targetAccounts.find((a) => a.id === tx.targetAccountId)
      : targetAccounts.find((a) => a.code === '6080') || targetAccounts.find((a) => a.code === '5010') || targetAccounts.find((a) => a.classification === 'expense') || targetAccounts[0];
    const targetIcPayAcc = tx.intercompanyPayableAccountId
      ? targetAccounts.find((a) => a.id === tx.intercompanyPayableAccountId)
      : targetAccounts.find((a) => a.code === '2020') || targetAccounts.find((a) => a.code === '2000') || targetAccounts.find((a) => a.code === '2100') || targetAccounts[0];

    const targetJournal = accountingPostingService.post('INTERCOMPANY_TRANSACTION_POSTED', {
      sourceType: 'IntercompanyTransaction',
      sourceId: tx.id,
      documentNumber: tx.transactionNumber,
      documentDate: tx.transactionDate,
      amount: tx.amount,
      currency: tx.currency,
      exchangeRate: tx.exchangeRate,
      memo: `Intercompany Inflow from ${sourceCompany.name}: ${tx.memo || tx.transactionNumber}`,
      subLedgerType: 'supplier',
      subLedgerEntityId: sourceCompany.id,
      customLines: [
        {
          accountId: targetExpAcc ? targetExpAcc.id : targetAccounts[0].id,
          debitAmount: tx.amount,
          creditAmount: '0.0000',
          description: `IC Expense from ${sourceCompany.name}`,
          subLedgerType: 'intercompany',
          subLedgerEntityId: sourceCompany.id,
        },
        {
          accountId: targetIcPayAcc ? targetIcPayAcc.id : targetAccounts[0].id,
          debitAmount: '0.0000',
          creditAmount: tx.amount,
          description: `IC Payable to ${sourceCompany.name}`,
          subLedgerType: 'intercompany',
          subLedgerEntityId: sourceCompany.id,
        },
      ],
    }, targetCtx);

    return db.updateIntercompanyTransaction(id, {
      status: 'posted',
      sourceJournalId: sourceJournal.id,
      targetJournalId: targetJournal.id,
      postedAt: new Date().toISOString(),
    }, ctx);
  }

  public settleTransaction(id: string, ctx: TenantContext): DbIntercompanyTransaction {
    const tx = this.getTransactionById(id, ctx);
    if (tx.status !== 'posted') {
      throw new ValidationError(`Cannot settle transaction in status '${tx.status}'. Must be posted first.`);
    }

    return db.updateIntercompanyTransaction(id, {
      status: 'settled',
      settledAt: new Date().toISOString(),
    }, ctx);
  }
}

export const intercompanyService = new IntercompanyService();
