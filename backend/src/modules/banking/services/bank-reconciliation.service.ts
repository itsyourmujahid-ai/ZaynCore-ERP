// ============================================================================
// Bank Reconciliation & Treasury Matching Engine Service
// Automated statement parsing, rule-based matching, reconciliation sessions,
// physical cash counts, and dynamic cash position forecasting
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { 
  DbBankStatement, 
  DbBankStatementLine, 
  DbBankReconciliation, 
  DbCashCount,
  DbBankTransaction 
} from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { bankingService } from './banking.service';

export interface ImportStatementLineInput {
  lineDate: string;
  valueDate?: string;
  description: string;
  reference?: string;
  amount: string;
  debitCredit: 'debit' | 'credit'; // 'debit' = inflow, 'credit' = outflow
  externalTransactionId?: string;
}

export interface ImportStatementPayload {
  bankAccountId: string;
  statementNumber: string;
  statementDate: string;
  startDate: string;
  endDate: string;
  openingBalance: string;
  closingBalance: string;
  currency?: string;
  filename?: string;
  lines: ImportStatementLineInput[];
}

export interface MatchResult {
  statementLineId: string;
  bankTransactionId: string;
  matchScore: number; // 0 to 100
  matchReason: string;
}

export interface CashPositionReport {
  asOfDate: string;
  totalBankBalances: string;
  totalCashBalances: string;
  totalLiquidFunds: string;
  expectedARInflows: string;
  expectedAPOutflows: string;
  netForecastedCashPosition: string;
  bankAccounts: Array<{
    id: string;
    accountName: string;
    bankName: string;
    currency: string;
    currentBalance: string;
  }>;
  cashAccounts: Array<{
    id: string;
    accountName: string;
    custodianName?: string;
    currency: string;
    currentBalance: string;
  }>;
}

export class BankReconciliationService {
  // ==========================================================================
  // 1. Bank Statement Import & Deduplication
  // ==========================================================================

  public importBankStatement(payload: ImportStatementPayload, ctx: TenantContext): {
    statement: DbBankStatement;
    lines: DbBankStatementLine[];
    duplicatesSkipped: number;
  } {
    const bank = db.getBankAccountById(payload.bankAccountId, ctx);
    if (!bank) throw new Error(`Bank Account '${payload.bankAccountId}' not found.`);

    const batchId = 'batch-' + Date.now().toString(36);
    const existingLines = db.getBankStatementLines(undefined, ctx);

    const statement = db.createBankStatement({
      bankAccountId: payload.bankAccountId,
      statementNumber: payload.statementNumber.trim(),
      statementDate: payload.statementDate,
      startDate: payload.startDate,
      endDate: payload.endDate,
      openingBalance: parseFloat(payload.openingBalance).toFixed(4),
      closingBalance: parseFloat(payload.closingBalance).toFixed(4),
      currency: payload.currency || bank.currency,
      importBatchId: batchId,
      status: 'imported',
      filename: payload.filename,
      totalLinesCount: payload.lines.length,
      matchedLinesCount: 0,
      importedBy: ctx.userId,
    }, ctx);

    const createdLines: DbBankStatementLine[] = [];
    let duplicatesSkipped = 0;

    for (const raw of payload.lines) {
      // Deduplication: check if line with same externalTransactionId already exists for this bank account
      if (raw.externalTransactionId) {
        const isDuplicate = existingLines.some(
          (el) => el.bankAccountId === bank.id && el.externalTransactionId === raw.externalTransactionId
        );
        if (isDuplicate) {
          duplicatesSkipped++;
          continue;
        }
      }

      const line = db.createBankStatementLine({
        statementId: statement.id,
        bankAccountId: bank.id,
        lineDate: raw.lineDate,
        valueDate: raw.valueDate || raw.lineDate,
        description: raw.description.trim(),
        reference: raw.reference?.trim(),
        amount: parseFloat(raw.amount).toFixed(4),
        debitCredit: raw.debitCredit,
        currency: payload.currency || bank.currency,
        externalTransactionId: raw.externalTransactionId?.trim(),
        matchStatus: 'unmatched',
      }, ctx);

      createdLines.push(line);
    }

    // Auto-run rules on imported lines
    this.runAutoMatchRules(statement.id, ctx);

    return { statement, lines: createdLines, duplicatesSkipped };
  }

  // ==========================================================================
  // 2. Rule-Based Transaction Matching Engine
  // ==========================================================================

  public runAutoMatchRules(statementId: string, ctx: TenantContext): MatchResult[] {
    const stmt = db.getBankStatementById(statementId, ctx);
    if (!stmt) throw new Error(`Bank statement '${statementId}' not found.`);

    const stmtLines = db.getBankStatementLines(stmt.id, ctx).filter((l) => l.matchStatus === 'unmatched');
    const erpTransactions = db.getBankTransactions(stmt.bankAccountId, ctx).filter(
      (tx) => tx.status === 'posted' && tx.reconciliationStatus === 'unreconciled'
    );

    const matches: MatchResult[] = [];
    const usedTxIds = new Set<string>();

    for (const line of stmtLines) {
      const lineAmt = parseFloat(line.amount);

      // Find best candidate match
      let bestMatch: DbBankTransaction | null = null;
      let highestScore = 0;
      let reason = '';

      for (const tx of erpTransactions) {
        if (usedTxIds.has(tx.id)) continue;
        if (tx.debitCredit !== line.debitCredit) continue;

        const txAmt = parseFloat(tx.amount);
        let score = 0;
        const reasons: string[] = [];

        // Exact amount match
        if (Math.abs(txAmt - lineAmt) < 0.0001) {
          score += 50;
          reasons.push('Exact Amount');
        } else {
          continue; // Amount must match for automated rule
        }

        // Reference match
        if (line.reference && tx.reference && line.reference.toLowerCase().includes(tx.reference.toLowerCase())) {
          score += 30;
          reasons.push('Reference Match');
        }

        // Date match (within ±3 days)
        const dateDiff = Math.abs(
          (new Date(line.lineDate).getTime() - new Date(tx.transactionDate).getTime()) / (1000 * 3600 * 24)
        );
        if (dateDiff === 0) {
          score += 20;
          reasons.push('Exact Date');
        } else if (dateDiff <= 3) {
          score += 10;
          reasons.push('Close Date Window');
        }

        // Description similarity
        if (tx.description && line.description && tx.description.toLowerCase().includes(line.description.toLowerCase().slice(0, 5))) {
          score += 10;
          reasons.push('Description Match');
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = tx;
          reason = reasons.join(', ');
        }
      }

      if (bestMatch && highestScore >= 70) {
        usedTxIds.add(bestMatch.id);
        db.updateBankStatementLine(line.id, {
          matchStatus: 'matched',
          matchedBankTransactionId: bestMatch.id,
        }, ctx);

        db.updateBankTransaction(bestMatch.id, {
          reconciliationStatus: 'matched',
          statementLineId: line.id,
        }, ctx);

        matches.push({
          statementLineId: line.id,
          bankTransactionId: bestMatch.id,
          matchScore: highestScore,
          matchReason: reason,
        });
      }
    }

    return matches;
  }

  // ==========================================================================
  // 3. Manual Matching & Unmatching
  // ==========================================================================

  public manualMatchLines(
    statementLineId: string,
    bankTransactionId: string,
    ctx: TenantContext
  ): void {
    const line = db.getBankStatementLines(undefined, ctx).find((l) => l.id === statementLineId);
    const tx = db.getBankTransactionById(bankTransactionId, ctx);

    if (!line || !tx) throw new Error('Statement Line or Bank Transaction not found.');

    db.updateBankStatementLine(line.id, {
      matchStatus: 'matched',
      matchedBankTransactionId: tx.id,
    }, ctx);

    db.updateBankTransaction(tx.id, {
      reconciliationStatus: 'matched',
      statementLineId: line.id,
    }, ctx);
  }

  public unmatchLine(statementLineId: string, ctx: TenantContext): void {
    const line = db.getBankStatementLines(undefined, ctx).find((l) => l.id === statementLineId);
    if (!line) throw new Error(`Statement Line '${statementLineId}' not found.`);

    if (line.matchedBankTransactionId) {
      const tx = db.getBankTransactionById(line.matchedBankTransactionId, ctx);
      if (tx) {
        db.updateBankTransaction(tx.id, {
          reconciliationStatus: 'unreconciled',
          statementLineId: undefined,
        }, ctx);
      }
    }

    db.updateBankStatementLine(line.id, {
      matchStatus: 'unmatched',
      matchedBankTransactionId: undefined,
    }, ctx);
  }

  // ==========================================================================
  // 4. Reconciliation Sessions & Calculation
  // ==========================================================================

  public createReconciliationSession(
    payload: { bankAccountId: string; statementId?: string; asOfDate: string; statementEndingBalance: string; notes?: string },
    ctx: TenantContext
  ): DbBankReconciliation {
    const bank = db.getBankAccountById(payload.bankAccountId, ctx);
    if (!bank) throw new Error(`Bank Account '${payload.bankAccountId}' not found.`);

    const recNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const session = db.createBankReconciliation({
      bankAccountId: payload.bankAccountId,
      statementId: payload.statementId,
      reconciliationNumber: recNumber,
      asOfDate: payload.asOfDate,
      statementEndingBalance: parseFloat(payload.statementEndingBalance).toFixed(4),
      erpEndingBalance: bank.currentBalance,
      outstandingReceiptsTotal: '0.0000',
      outstandingPaymentsTotal: '0.0000',
      unmatchedChargesTotal: '0.0000',
      unmatchedInterestTotal: '0.0000',
      adjustedBalance: '0.0000',
      variance: '0.0000',
      status: 'in_progress',
      matchedLineIds: [],
      matchedTransactionIds: [],
      notes: payload.notes,
    }, ctx);

    return this.recalculateReconciliationMetrics(session.id, ctx);
  }

  public recalculateReconciliationMetrics(reconciliationId: string, ctx: TenantContext): DbBankReconciliation {
    const rec = db.getBankReconciliationById(reconciliationId, ctx);
    if (!rec) throw new Error(`Reconciliation session '${reconciliationId}' not found.`);

    const bank = db.getBankAccountById(rec.bankAccountId, ctx);
    if (!bank) throw new Error(`Bank Account '${rec.bankAccountId}' not found.`);

    const allTx = db.getBankTransactions(bank.id, ctx).filter((t) => t.transactionDate <= rec.asOfDate);
    const stmtLines = rec.statementId ? db.getBankStatementLines(rec.statementId, ctx) : [];

    let outstandingReceipts = 0;
    let outstandingPayments = 0;
    const matchedTxIds: string[] = [];
    const matchedLineIds: string[] = [];

    for (const tx of allTx) {
      if (tx.reconciliationStatus === 'matched' || tx.reconciliationStatus === 'reconciled') {
        matchedTxIds.push(tx.id);
      } else {
        if (tx.debitCredit === 'debit') {
          outstandingReceipts += parseFloat(tx.amount);
        } else {
          outstandingPayments += parseFloat(tx.amount);
        }
      }
    }

    for (const line of stmtLines) {
      if (line.matchStatus === 'matched') {
        matchedLineIds.push(line.id);
      }
    }

    // Adjusted Bank Balance = Statement Ending Balance + Outstanding Receipts - Outstanding Payments
    const stmtEnd = parseFloat(rec.statementEndingBalance);
    const erpEnd = parseFloat(bank.currentBalance);
    const adjustedBank = stmtEnd + outstandingReceipts - outstandingPayments;
    const variance = (erpEnd - adjustedBank).toFixed(4);

    const status = Math.abs(parseFloat(variance)) < 0.0001 ? 'balanced' : 'in_progress';

    return db.updateBankReconciliation(rec.id, {
      erpEndingBalance: erpEnd.toFixed(4),
      outstandingReceiptsTotal: outstandingReceipts.toFixed(4),
      outstandingPaymentsTotal: outstandingPayments.toFixed(4),
      adjustedBalance: adjustedBank.toFixed(4),
      variance: variance,
      status: rec.status === 'completed' ? 'completed' : status,
      matchedLineIds,
      matchedTransactionIds: matchedTxIds,
    }, ctx);
  }

  public completeReconciliation(reconciliationId: string, ctx: TenantContext): DbBankReconciliation {
    const rec = this.recalculateReconciliationMetrics(reconciliationId, ctx);
    if (Math.abs(parseFloat(rec.variance)) > 0.0001) {
      throw new Error(`Cannot complete reconciliation with an active variance of ${rec.variance}.`);
    }

    // Mark all matched transactions as fully reconciled
    for (const txId of rec.matchedTransactionIds) {
      db.updateBankTransaction(txId, {
        reconciliationStatus: 'reconciled',
        reconciliationId: rec.id,
      }, ctx);
    }

    if (rec.statementId) {
      db.updateBankStatement(rec.statementId, { status: 'reconciled' }, ctx);
    }

    return db.updateBankReconciliation(rec.id, {
      status: 'completed',
      reconciledBy: ctx.userId,
      reconciledAt: new Date().toISOString(),
    }, ctx);
  }

  // ==========================================================================
  // 5. In-Reconciliation Missing Adjustments
  // ==========================================================================

  public createReconciliationAdjustment(
    reconciliationId: string,
    statementLineId: string,
    adjustmentType: 'bank_charge' | 'interest' | 'other',
    contraAccountId?: string,
    ctx?: TenantContext
  ): DbBankTransaction {
    if (!ctx) throw new Error('Tenant context required');
    const rec = db.getBankReconciliationById(reconciliationId, ctx);
    if (!rec) throw new Error(`Reconciliation session '${reconciliationId}' not found.`);

    const line = db.getBankStatementLines(undefined, ctx).find((l) => l.id === statementLineId);
    if (!line) throw new Error(`Statement Line '${statementLineId}' not found.`);

    let tx: DbBankTransaction;
    if (adjustmentType === 'bank_charge') {
      tx = bankingService.recordBankCharge({
        bankAccountId: rec.bankAccountId,
        transactionDate: line.lineDate,
        amount: line.amount,
        currency: line.currency,
        reference: line.reference || `REC-ADJ-${rec.reconciliationNumber}`,
        description: line.description || 'Unmatched Bank Service Fee',
      }, ctx);
    } else if (adjustmentType === 'interest') {
      tx = bankingService.recordBankInterest({
        bankAccountId: rec.bankAccountId,
        transactionDate: line.lineDate,
        amount: line.amount,
        currency: line.currency,
        reference: line.reference || `REC-ADJ-${rec.reconciliationNumber}`,
        description: line.description || 'Unmatched Bank Interest Earned',
      }, ctx);
    } else {
      if (line.debitCredit === 'debit') {
        tx = bankingService.recordGeneralReceipt({
          bankAccountId: rec.bankAccountId,
          transactionDate: line.lineDate,
          amount: line.amount,
          currency: line.currency,
          contraAccountId,
          reference: line.reference || `REC-ADJ-${rec.reconciliationNumber}`,
          description: line.description,
        }, ctx);
      } else {
        tx = bankingService.recordGeneralPayment({
          bankAccountId: rec.bankAccountId,
          transactionDate: line.lineDate,
          amount: line.amount,
          currency: line.currency,
          contraAccountId,
          reference: line.reference || `REC-ADJ-${rec.reconciliationNumber}`,
          description: line.description,
        }, ctx);
      }
    }

    // Auto-match the newly created transaction to this statement line
    this.manualMatchLines(line.id, tx.id, ctx);
    this.recalculateReconciliationMetrics(rec.id, ctx);

    return tx;
  }

  // ==========================================================================
  // 6. Physical Cash Count & Variance Adjustment
  // ==========================================================================

  public recordCashCount(
    payload: { cashAccountId: string; countDate: string; physicalCount: string; reason?: string; counterName: string; notes?: string },
    ctx: TenantContext
  ): DbCashCount {
    const cash = db.getCashAccountById(payload.cashAccountId, ctx);
    if (!cash) throw new Error(`Cash Account '${payload.cashAccountId}' not found.`);

    const sysBal = parseFloat(cash.currentBalance);
    const physCount = parseFloat(payload.physicalCount);
    const diff = (physCount - sysBal).toFixed(4);

    const countNumber = `CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return db.createCashCount({
      cashAccountId: payload.cashAccountId,
      countNumber,
      countDate: payload.countDate,
      systemBalance: sysBal.toFixed(4),
      physicalCount: physCount.toFixed(4),
      difference: diff,
      reason: payload.reason,
      counterName: payload.counterName,
      status: 'draft',
      notes: payload.notes,
    }, ctx);
  }

  public approveAndPostCashCountAdjustment(countId: string, ctx: TenantContext): {
    count: DbCashCount;
    transaction?: DbBankTransaction;
  } {
    const count = db.getCashCountById(countId, ctx);
    if (!count) throw new Error(`Cash Count audit '${countId}' not found.`);
    if (count.status === 'posted') throw new Error(`Cash count '${count.countNumber}' is already posted.`);

    const cash = db.getCashAccountById(count.cashAccountId, ctx);
    if (!cash) throw new Error(`Cash account '${count.cashAccountId}' not found.`);

    const diff = parseFloat(count.difference);

    if (Math.abs(diff) < 0.0001) {
      // Zero variance, just mark completed
      const updated = db.updateCashCount(count.id, {
        status: 'posted',
        reviewerName: ctx.userFullName,
      }, ctx);
      return { count: updated };
    }

    // Post GL Adjustment journal
    const journal = accountingPostingService.post('CASH_COUNT_ADJUSTMENT_POSTED', {
      sourceType: 'CashCountAudit',
      sourceId: count.id,
      documentNumber: count.countNumber,
      documentDate: count.countDate,
      memo: `Cash Count Audit Variance: ${count.reason || 'Physical Count Adjustment'}`,
      currency: cash.currency,
      amount: diff.toFixed(4),
      taxCodeId: cash.glAccountId,
      subLedgerType: 'bank_account',
      subLedgerEntityId: cash.id,
    }, ctx);

    // Record bank transaction movement
    const tx = db.recordBankTransaction({
      bankAccountId: cash.id,
      transactionNumber: `TX-ADJ-${count.countNumber}`,
      transactionDate: count.countDate,
      valueDate: count.countDate,
      transactionType: 'adjustment',
      amount: Math.abs(diff).toFixed(4),
      debitCredit: diff > 0 ? 'debit' : 'credit',
      currency: cash.currency,
      exchangeRate: '1.000000',
      baseAmount: Math.abs(diff).toFixed(4),
      reference: count.countNumber,
      description: `Physical Count Variance Adjustment (${count.reason || 'Audit difference'})`,
      sourceDocumentType: 'cash_count',
      sourceDocumentId: count.id,
      sourceDocumentNumber: count.countNumber,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'reconciled',
    }, ctx);

    // Update Cash Account Balance to match Physical Count
    db.updateCashAccount(cash.id, { currentBalance: count.physicalCount }, ctx);

    const updated = db.updateCashCount(count.id, {
      status: 'posted',
      reviewerName: ctx.userFullName,
      adjustmentTransactionId: tx.id,
      journalEntryId: journal.id,
    }, ctx);

    return { count: updated, transaction: tx };
  }

  // ==========================================================================
  // 7. Multi-Account Cash Position & Forecast
  // ==========================================================================

  public calculateCashPosition(asOfDate?: string, ctx?: TenantContext): CashPositionReport {
    if (!ctx) throw new Error('Tenant context required');
    const date = asOfDate || new Date().toISOString().slice(0, 10);

    const banks = db.getBankAccounts(ctx).filter((b) => b.isActive);
    const cashes = db.getCashAccounts(ctx).filter((c) => c.isActive);

    const totalBank = banks.reduce((sum, b) => sum + parseFloat(b.currentBalance), 0);
    const totalCash = cashes.reduce((sum, c) => sum + parseFloat(c.currentBalance), 0);
    const totalLiquid = totalBank + totalCash;

    // Expected AR Inflows (Open Invoices)
    const invoices = db.getSalesInvoices(ctx).filter((i) => i.status === 'posted');
    const expectedAR = invoices.reduce((sum, inv) => sum + parseFloat(inv.balanceDue), 0);

    // Expected AP Outflows (Open Bills)
    const bills = db.getSupplierBills(ctx).filter((b) => b.status === 'posted');
    const expectedAP = bills.reduce((sum, bill) => sum + parseFloat(bill.balanceDue), 0);

    const netForecast = totalLiquid + expectedAR - expectedAP;

    return {
      asOfDate: date,
      totalBankBalances: totalBank.toFixed(4),
      totalCashBalances: totalCash.toFixed(4),
      totalLiquidFunds: totalLiquid.toFixed(4),
      expectedARInflows: expectedAR.toFixed(4),
      expectedAPOutflows: expectedAP.toFixed(4),
      netForecastedCashPosition: netForecast.toFixed(4),
      bankAccounts: banks.map((b) => ({
        id: b.id,
        accountName: b.accountName,
        bankName: b.bankName,
        currency: b.currency,
        currentBalance: b.currentBalance,
      })),
      cashAccounts: cashes.map((c) => ({
        id: c.id,
        accountName: c.accountName,
        custodianName: c.custodianName,
        currency: c.currency,
        currentBalance: c.currentBalance,
      })),
    };
  }
}

export const bankReconciliationService = new BankReconciliationService();
