// ============================================================================
// Banking & Treasury Domain Service
// Centralized financial movement layer connecting Bank Accounts, Cash Accounts,
// AR Receipts, AP Payments, Transfers, Bank Charges, and General Transactions
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { 
  DbBankAccount, 
  DbCashAccount, 
  DbBankTransaction, 
  DbBankTransfer, 
  DbCheque,
  BankAccountType,
  CashAccountType
} from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface CreateBankAccountPayload {
  accountName: string;
  bankName: string;
  branch?: string;
  accountNumber: string;
  iban?: string;
  swiftBic?: string;
  accountType: BankAccountType;
  currency: string;
  glAccountId: string;
  openingBalance?: string;
  openingBalanceDate?: string;
  isActive?: boolean;
  isDefault?: boolean;
  notes?: string;
}

export interface CreateCashAccountPayload {
  accountName: string;
  cashAccountType: CashAccountType;
  custodianName?: string;
  maxLimit?: string;
  currency: string;
  glAccountId: string;
  openingBalance?: string;
  openingBalanceDate?: string;
  isActive?: boolean;
  isDefault?: boolean;
  notes?: string;
}

export interface CreateBankTransferPayload {
  fromBankAccountId: string;
  toBankAccountId: string;
  transferDate: string;
  amount: string;
  currency: string;
  exchangeRate?: string;
  feeAmount?: string;
  notes?: string;
}

export interface GeneralTransactionPayload {
  bankAccountId: string;
  transactionDate: string;
  amount: string;
  currency: string;
  contraAccountId?: string; // Revenue or Expense account
  reference: string;
  description: string;
  counterpartyName?: string;
}

export class BankingService {
  // ==========================================================================
  // 1. Bank Account Master & Masking
  // ==========================================================================

  public createBankAccount(payload: CreateBankAccountPayload, ctx: TenantContext): DbBankAccount {
    const glAcc = db.getAccounts(ctx).find((a) => a.id === payload.glAccountId);
    if (!glAcc) {
      throw new Error(`GL Account '${payload.glAccountId}' not found in Chart of Accounts.`);
    }

    const initialBal = payload.openingBalance ? parseFloat(payload.openingBalance).toFixed(4) : '0.0000';

    const account = db.createBankAccount({
      accountName: payload.accountName.trim(),
      bankName: payload.bankName.trim(),
      branch: payload.branch?.trim(),
      accountNumber: payload.accountNumber.trim(),
      iban: payload.iban?.trim().toUpperCase(),
      swiftBic: payload.swiftBic?.trim().toUpperCase(),
      accountType: payload.accountType,
      currency: payload.currency || ctx.baseCurrency,
      glAccountId: payload.glAccountId,
      openingBalance: initialBal,
      openingBalanceDate: payload.openingBalanceDate || new Date().toISOString().slice(0, 10),
      currentBalance: initialBal,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      isDefault: payload.isDefault || false,
      notes: payload.notes,
    }, ctx);

    // If opening balance > 0, record initial opening transaction
    if (parseFloat(initialBal) > 0) {
      this.postOpeningBalance({
        accountId: account.id,
        accountType: 'bank',
        amount: initialBal,
        date: account.openingBalanceDate,
        currency: account.currency,
      }, ctx);
    }

    return account;
  }

  public updateBankAccount(id: string, payload: Partial<DbBankAccount>, ctx: TenantContext): DbBankAccount {
    return db.updateBankAccount(id, payload, ctx);
  }

  public getMaskedAccountNumber(accountNumber: string): string {
    if (!accountNumber) return '';
    if (accountNumber.length <= 4) return accountNumber;
    return '••••••••' + accountNumber.slice(-4);
  }

  // ==========================================================================
  // 2. Cash Account Master
  // ==========================================================================

  public createCashAccount(payload: CreateCashAccountPayload, ctx: TenantContext): DbCashAccount {
    const glAcc = db.getAccounts(ctx).find((a) => a.id === payload.glAccountId);
    if (!glAcc) {
      throw new Error(`GL Account '${payload.glAccountId}' not found in Chart of Accounts.`);
    }

    const initialBal = payload.openingBalance ? parseFloat(payload.openingBalance).toFixed(4) : '0.0000';

    const account = db.createCashAccount({
      accountName: payload.accountName.trim(),
      cashAccountType: payload.cashAccountType,
      custodianName: payload.custodianName?.trim(),
      maxLimit: payload.maxLimit ? parseFloat(payload.maxLimit).toFixed(4) : undefined,
      currency: payload.currency || ctx.baseCurrency,
      glAccountId: payload.glAccountId,
      openingBalance: initialBal,
      openingBalanceDate: payload.openingBalanceDate || new Date().toISOString().slice(0, 10),
      currentBalance: initialBal,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      isDefault: payload.isDefault || false,
      notes: payload.notes,
    }, ctx);

    if (parseFloat(initialBal) > 0) {
      this.postOpeningBalance({
        accountId: account.id,
        accountType: 'cash',
        amount: initialBal,
        date: account.openingBalanceDate,
        currency: account.currency,
      }, ctx);
    }

    return account;
  }

  public updateCashAccount(id: string, payload: Partial<DbCashAccount>, ctx: TenantContext): DbCashAccount {
    return db.updateCashAccount(id, payload, ctx);
  }

  // ==========================================================================
  // 3. Bank Opening Balance Posting
  // ==========================================================================

  public postOpeningBalance(
    params: { accountId: string; accountType: 'bank' | 'cash'; amount: string; date: string; currency: string },
    ctx: TenantContext
  ): DbBankTransaction {
    const bank = params.accountType === 'bank' 
      ? db.getBankAccountById(params.accountId, ctx) 
      : db.getCashAccountById(params.accountId, ctx);
    
    if (!bank) throw new Error(`Account '${params.accountId}' not found.`);

    // Post to GL via centralized engine
    const journal = accountingPostingService.post('OPENING_BALANCE_POSTED', {
      sourceType: 'BankAccountOpening',
      sourceId: bank.id,
      documentNumber: `OPB-${bank.id.slice(-6).toUpperCase()}`,
      documentDate: params.date,
      memo: `Opening Balance for ${bank.accountName}`,
      currency: params.currency,
      amount: params.amount,
      subLedgerType: 'bank_account',
      subLedgerEntityId: bank.id,
    }, ctx);

    // Record in Bank Transaction Ledger
    return db.recordBankTransaction({
      bankAccountId: bank.id,
      transactionNumber: `TX-OPB-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: params.date,
      valueDate: params.date,
      transactionType: 'deposit',
      amount: parseFloat(params.amount).toFixed(4),
      debitCredit: 'debit',
      currency: params.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(params.amount).toFixed(4),
      reference: `OPB-${bank.id.slice(-6).toUpperCase()}`,
      description: `Opening Balance for ${bank.accountName}`,
      sourceDocumentType: 'opening_balance',
      sourceDocumentId: bank.id,
      sourceDocumentNumber: `OPB-${bank.id.slice(-6).toUpperCase()}`,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);
  }

  // ==========================================================================
  // 4. Inter-Bank & Cash Transfers
  // ==========================================================================

  public createBankTransfer(payload: CreateBankTransferPayload, ctx: TenantContext): DbBankTransfer {
    if (payload.fromBankAccountId === payload.toBankAccountId) {
      throw new Error('Source and Destination accounts cannot be identical.');
    }

    const trfNumber = `BTRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return db.createBankTransfer({
      transferNumber: trfNumber,
      fromBankAccountId: payload.fromBankAccountId,
      toBankAccountId: payload.toBankAccountId,
      transferDate: payload.transferDate,
      amount: parseFloat(payload.amount).toFixed(4),
      currency: payload.currency || ctx.baseCurrency,
      exchangeRate: payload.exchangeRate || '1.000000',
      feeAmount: payload.feeAmount ? parseFloat(payload.feeAmount).toFixed(4) : '0.0000',
      notes: payload.notes,
      status: 'draft',
    }, ctx);
  }

  public executeBankTransfer(transferId: string, ctx: TenantContext): {
    transfer: DbBankTransfer;
    outTx: DbBankTransaction;
    inTx: DbBankTransaction;
  } {
    const trf = db.getBankTransferById(transferId, ctx);
    if (!trf) throw new Error(`Bank transfer '${transferId}' not found.`);
    if (trf.status === 'posted') throw new Error(`Transfer '${trf.transferNumber}' is already posted.`);

    const fromAcc = db.getBankAccountById(trf.fromBankAccountId, ctx) || db.getCashAccountById(trf.fromBankAccountId, ctx);
    const toAcc = db.getBankAccountById(trf.toBankAccountId, ctx) || db.getCashAccountById(trf.toBankAccountId, ctx);

    if (!fromAcc || !toAcc) {
      throw new Error('Source or Destination account does not exist.');
    }

    // 1. Post Centralized Accounting Journal
    const journal = accountingPostingService.post('BANK_TRANSFER_POSTED', {
      sourceType: 'BankTransfer',
      sourceId: trf.fromBankAccountId, // Source Account ID
      documentNumber: trf.transferNumber,
      documentDate: trf.transferDate,
      memo: `Bank Transfer from ${fromAcc.accountName} to ${toAcc.accountName}`,
      currency: trf.currency,
      amount: trf.amount,
      taxAmount: trf.feeAmount || '0.0000', // Used for fee amount
      taxCodeId: toAcc.glAccountId, // Destination GL Account
      departmentId: fromAcc.glAccountId, // Source GL Account
      subLedgerType: 'bank_account',
      subLedgerEntityId: toAcc.id, // Destination subledger tag
    }, ctx);

    // 2. Record Outward Bank Movement
    const outTx = db.recordBankTransaction({
      bankAccountId: fromAcc.id,
      transactionNumber: `TX-OUT-${trf.transferNumber}`,
      transactionDate: trf.transferDate,
      valueDate: trf.transferDate,
      transactionType: 'transfer_out',
      amount: trf.amount,
      debitCredit: 'credit',
      currency: trf.currency,
      exchangeRate: trf.exchangeRate,
      baseAmount: (parseFloat(trf.amount) * parseFloat(trf.exchangeRate)).toFixed(4),
      reference: trf.transferNumber,
      description: `Transfer Out to ${toAcc.accountName}`,
      sourceDocumentType: 'bank_transfer',
      sourceDocumentId: trf.id,
      sourceDocumentNumber: trf.transferNumber,
      counterpartyName: toAcc.accountName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    // 3. Record Inward Bank Movement
    const inTx = db.recordBankTransaction({
      bankAccountId: toAcc.id,
      transactionNumber: `TX-IN-${trf.transferNumber}`,
      transactionDate: trf.transferDate,
      valueDate: trf.transferDate,
      transactionType: 'transfer_in',
      amount: trf.amount,
      debitCredit: 'debit',
      currency: trf.currency,
      exchangeRate: trf.exchangeRate,
      baseAmount: (parseFloat(trf.amount) * parseFloat(trf.exchangeRate)).toFixed(4),
      reference: trf.transferNumber,
      description: `Transfer In from ${fromAcc.accountName}`,
      sourceDocumentType: 'bank_transfer',
      sourceDocumentId: trf.id,
      sourceDocumentNumber: trf.transferNumber,
      counterpartyName: fromAcc.accountName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    // 4. Update Current Balances
    const transferTotalOutflow = parseFloat(trf.amount) + parseFloat(trf.feeAmount || '0.0000');
    const newFromBal = (parseFloat(fromAcc.currentBalance) - transferTotalOutflow).toFixed(4);
    const newToBal = (parseFloat(toAcc.currentBalance) + parseFloat(trf.amount)).toFixed(4);

    if ('bankName' in fromAcc) {
      db.updateBankAccount(fromAcc.id, { currentBalance: newFromBal }, ctx);
    } else {
      db.updateCashAccount(fromAcc.id, { currentBalance: newFromBal }, ctx);
    }

    if ('bankName' in toAcc) {
      db.updateBankAccount(toAcc.id, { currentBalance: newToBal }, ctx);
    } else {
      db.updateCashAccount(toAcc.id, { currentBalance: newToBal }, ctx);
    }

    // 5. Update Transfer Document Status
    const updatedTrf = db.updateBankTransfer(trf.id, {
      status: 'posted',
      transferOutTransactionId: outTx.id,
      transferInTransactionId: inTx.id,
      journalEntryId: journal.id,
    }, ctx);

    return { transfer: updatedTrf, outTx, inTx };
  }

  // ==========================================================================
  // 5. Bank Charges & Interest Income
  // ==========================================================================

  public recordBankCharge(payload: GeneralTransactionPayload, ctx: TenantContext): DbBankTransaction {
    const bank = db.getBankAccountById(payload.bankAccountId, ctx);
    if (!bank) throw new Error(`Bank Account '${payload.bankAccountId}' not found.`);

    const journal = accountingPostingService.post('BANK_CHARGE_POSTED', {
      sourceType: 'BankCharge',
      sourceId: bank.id,
      documentNumber: payload.reference,
      documentDate: payload.transactionDate,
      memo: payload.description || `Bank Charge - ${bank.accountName}`,
      currency: payload.currency,
      amount: payload.amount,
      taxCodeId: bank.glAccountId, // Bank GL Account
      subLedgerType: 'bank_account',
      subLedgerEntityId: bank.id,
    }, ctx);

    const tx = db.recordBankTransaction({
      bankAccountId: bank.id,
      transactionNumber: `TX-CHG-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: payload.transactionDate,
      valueDate: payload.transactionDate,
      transactionType: 'bank_charge',
      amount: parseFloat(payload.amount).toFixed(4),
      debitCredit: 'credit',
      currency: payload.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(payload.amount).toFixed(4),
      reference: payload.reference,
      description: payload.description || 'Monthly Service & Wire Processing Fee',
      sourceDocumentType: 'bank_charge',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: payload.reference,
      counterpartyName: bank.bankName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    const newBal = (parseFloat(bank.currentBalance) - parseFloat(payload.amount)).toFixed(4);
    db.updateBankAccount(bank.id, { currentBalance: newBal }, ctx);

    return tx;
  }

  public recordBankInterest(payload: GeneralTransactionPayload, ctx: TenantContext): DbBankTransaction {
    const bank = db.getBankAccountById(payload.bankAccountId, ctx);
    if (!bank) throw new Error(`Bank Account '${payload.bankAccountId}' not found.`);

    const journal = accountingPostingService.post('BANK_INTEREST_POSTED', {
      sourceType: 'BankInterest',
      sourceId: bank.id,
      documentNumber: payload.reference,
      documentDate: payload.transactionDate,
      memo: payload.description || `Bank Interest - ${bank.accountName}`,
      currency: payload.currency,
      amount: payload.amount,
      taxCodeId: bank.glAccountId, // Bank GL Account
      subLedgerType: 'bank_account',
      subLedgerEntityId: bank.id,
    }, ctx);

    const tx = db.recordBankTransaction({
      bankAccountId: bank.id,
      transactionNumber: `TX-INT-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: payload.transactionDate,
      valueDate: payload.transactionDate,
      transactionType: 'interest',
      amount: parseFloat(payload.amount).toFixed(4),
      debitCredit: 'debit',
      currency: payload.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(payload.amount).toFixed(4),
      reference: payload.reference,
      description: payload.description || 'Deposit Interest Earned',
      sourceDocumentType: 'bank_interest',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: payload.reference,
      counterpartyName: bank.bankName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    const newBal = (parseFloat(bank.currentBalance) + parseFloat(payload.amount)).toFixed(4);
    db.updateBankAccount(bank.id, { currentBalance: newBal }, ctx);

    return tx;
  }

  // ==========================================================================
  // 6. General Receipts & Payments
  // ==========================================================================

  public recordGeneralReceipt(payload: GeneralTransactionPayload, ctx: TenantContext): DbBankTransaction {
    const bank = db.getBankAccountById(payload.bankAccountId, ctx) || db.getCashAccountById(payload.bankAccountId, ctx);
    if (!bank) throw new Error(`Account '${payload.bankAccountId}' not found.`);

    const journal = accountingPostingService.post('GENERAL_RECEIPT_POSTED', {
      sourceType: 'GeneralReceipt',
      sourceId: bank.id,
      documentNumber: payload.reference,
      documentDate: payload.transactionDate,
      memo: payload.description || `General Receipt Inward`,
      currency: payload.currency,
      amount: payload.amount,
      taxCodeId: bank.glAccountId,
      departmentId: payload.contraAccountId, // Revenue / Income Account
      subLedgerType: 'bank_account',
      subLedgerEntityId: bank.id,
    }, ctx);

    const tx = db.recordBankTransaction({
      bankAccountId: bank.id,
      transactionNumber: `TX-REC-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: payload.transactionDate,
      valueDate: payload.transactionDate,
      transactionType: 'receipt',
      amount: parseFloat(payload.amount).toFixed(4),
      debitCredit: 'debit',
      currency: payload.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(payload.amount).toFixed(4),
      reference: payload.reference,
      description: payload.description,
      sourceDocumentType: 'general_receipt',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: payload.reference,
      counterpartyName: payload.counterpartyName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    const newBal = (parseFloat(bank.currentBalance) + parseFloat(payload.amount)).toFixed(4);
    if ('bankName' in bank) {
      db.updateBankAccount(bank.id, { currentBalance: newBal }, ctx);
    } else {
      db.updateCashAccount(bank.id, { currentBalance: newBal }, ctx);
    }

    return tx;
  }

  public recordGeneralPayment(payload: GeneralTransactionPayload, ctx: TenantContext): DbBankTransaction {
    const bank = db.getBankAccountById(payload.bankAccountId, ctx) || db.getCashAccountById(payload.bankAccountId, ctx);
    if (!bank) throw new Error(`Account '${payload.bankAccountId}' not found.`);

    const journal = accountingPostingService.post('GENERAL_PAYMENT_POSTED', {
      sourceType: 'GeneralPayment',
      sourceId: bank.id,
      documentNumber: payload.reference,
      documentDate: payload.transactionDate,
      memo: payload.description || `General Payment Outward`,
      currency: payload.currency,
      amount: payload.amount,
      taxCodeId: bank.glAccountId,
      departmentId: payload.contraAccountId, // Expense Account
      subLedgerType: 'bank_account',
      subLedgerEntityId: bank.id,
    }, ctx);

    const tx = db.recordBankTransaction({
      bankAccountId: bank.id,
      transactionNumber: `TX-PAY-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: payload.transactionDate,
      valueDate: payload.transactionDate,
      transactionType: 'payment',
      amount: parseFloat(payload.amount).toFixed(4),
      debitCredit: 'credit',
      currency: payload.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(payload.amount).toFixed(4),
      reference: payload.reference,
      description: payload.description,
      sourceDocumentType: 'general_payment',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: payload.reference,
      counterpartyName: payload.counterpartyName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    const newBal = (parseFloat(bank.currentBalance) - parseFloat(payload.amount)).toFixed(4);
    if ('bankName' in bank) {
      db.updateBankAccount(bank.id, { currentBalance: newBal }, ctx);
    } else {
      db.updateCashAccount(bank.id, { currentBalance: newBal }, ctx);
    }

    return tx;
  }

  // ==========================================================================
  // 7. Cash Deposits & Withdrawals
  // ==========================================================================

  public recordCashDeposit(
    params: { bankAccountId: string; cashAccountId: string; date: string; amount: string; reference: string; notes?: string },
    ctx: TenantContext
  ): { bankTx: DbBankTransaction; cashTx: DbBankTransaction } {
    const bank = db.getBankAccountById(params.bankAccountId, ctx);
    const cash = db.getCashAccountById(params.cashAccountId, ctx);
    if (!bank || !cash) throw new Error('Valid Bank and Cash accounts are required.');

    const journal = accountingPostingService.post('CASH_DEPOSIT_POSTED', {
      sourceType: 'CashDeposit',
      sourceId: cash.id, // Source Cash Account ID
      documentNumber: params.reference,
      documentDate: params.date,
      memo: `Cash Deposit into ${bank.accountName} from ${cash.accountName}`,
      currency: bank.currency,
      amount: params.amount,
      taxCodeId: bank.glAccountId,
      departmentId: cash.glAccountId,
      subLedgerType: 'bank_account',
      subLedgerEntityId: bank.id,
    }, ctx);

    const bankTx = db.recordBankTransaction({
      bankAccountId: bank.id,
      transactionNumber: `TX-DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: params.date,
      valueDate: params.date,
      transactionType: 'deposit',
      amount: parseFloat(params.amount).toFixed(4),
      debitCredit: 'debit',
      currency: bank.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(params.amount).toFixed(4),
      reference: params.reference,
      description: `Cash Deposit from ${cash.accountName}`,
      sourceDocumentType: 'cash_deposit',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: params.reference,
      counterpartyName: cash.accountName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    const cashTx = db.recordBankTransaction({
      bankAccountId: cash.id,
      transactionNumber: `TX-WTH-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: params.date,
      valueDate: params.date,
      transactionType: 'withdrawal',
      amount: parseFloat(params.amount).toFixed(4),
      debitCredit: 'credit',
      currency: cash.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(params.amount).toFixed(4),
      reference: params.reference,
      description: `Cash Deposit to ${bank.accountName}`,
      sourceDocumentType: 'cash_deposit',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: params.reference,
      counterpartyName: bank.accountName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    db.updateBankAccount(bank.id, { currentBalance: (parseFloat(bank.currentBalance) + parseFloat(params.amount)).toFixed(4) }, ctx);
    db.updateCashAccount(cash.id, { currentBalance: (parseFloat(cash.currentBalance) - parseFloat(params.amount)).toFixed(4) }, ctx);

    return { bankTx, cashTx };
  }

  public recordCashWithdrawal(
    params: { bankAccountId: string; cashAccountId: string; date: string; amount: string; reference: string; notes?: string },
    ctx: TenantContext
  ): { cashTx: DbBankTransaction; bankTx: DbBankTransaction } {
    const bank = db.getBankAccountById(params.bankAccountId, ctx);
    const cash = db.getCashAccountById(params.cashAccountId, ctx);
    if (!bank || !cash) throw new Error('Valid Bank and Cash accounts are required.');

    const journal = accountingPostingService.post('CASH_WITHDRAWAL_POSTED', {
      sourceType: 'CashWithdrawal',
      sourceId: cash.id,
      documentNumber: params.reference,
      documentDate: params.date,
      memo: `Cash Withdrawal from ${bank.accountName} into ${cash.accountName}`,
      currency: bank.currency,
      amount: params.amount,
      taxCodeId: bank.glAccountId,
      departmentId: cash.glAccountId,
      subLedgerType: 'bank_account',
      subLedgerEntityId: bank.id,
    }, ctx);

    const cashTx = db.recordBankTransaction({
      bankAccountId: cash.id,
      transactionNumber: `TX-IN-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: params.date,
      valueDate: params.date,
      transactionType: 'deposit',
      amount: parseFloat(params.amount).toFixed(4),
      debitCredit: 'debit',
      currency: cash.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(params.amount).toFixed(4),
      reference: params.reference,
      description: `Petty Cash Inflow from ${bank.accountName}`,
      sourceDocumentType: 'cash_withdrawal',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: params.reference,
      counterpartyName: bank.accountName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    const bankTx = db.recordBankTransaction({
      bankAccountId: bank.id,
      transactionNumber: `TX-OUT-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionDate: params.date,
      valueDate: params.date,
      transactionType: 'withdrawal',
      amount: parseFloat(params.amount).toFixed(4),
      debitCredit: 'credit',
      currency: bank.currency,
      exchangeRate: '1.000000',
      baseAmount: parseFloat(params.amount).toFixed(4),
      reference: params.reference,
      description: `Bank Withdrawal Outflow to ${cash.accountName}`,
      sourceDocumentType: 'cash_withdrawal',
      sourceDocumentId: journal.id,
      sourceDocumentNumber: params.reference,
      counterpartyName: cash.accountName,
      status: 'posted',
      journalEntryId: journal.id,
      reconciliationStatus: 'unreconciled',
    }, ctx);

    db.updateCashAccount(cash.id, { currentBalance: (parseFloat(cash.currentBalance) + parseFloat(params.amount)).toFixed(4) }, ctx);
    db.updateBankAccount(bank.id, { currentBalance: (parseFloat(bank.currentBalance) - parseFloat(params.amount)).toFixed(4) }, ctx);

    return { cashTx, bankTx };
  }

  // ==========================================================================
  // 8. Cheque Management
  // ==========================================================================

  public issueCheque(
    payload: { chequeType: 'incoming' | 'outgoing'; chequeNumber: string; bankAccountId?: string; bankName: string; payeeName: string; issueDate: string; dueDate: string; amount: string; currency: string; reference?: string; notes?: string },
    ctx: TenantContext
  ): DbCheque {
    return db.createCheque({
      chequeType: payload.chequeType,
      chequeNumber: payload.chequeNumber.trim(),
      bankAccountId: payload.bankAccountId,
      bankName: payload.bankName.trim(),
      payeeName: payload.payeeName.trim(),
      issueDate: payload.issueDate,
      dueDate: payload.dueDate,
      amount: parseFloat(payload.amount).toFixed(4),
      currency: payload.currency || ctx.baseCurrency,
      status: payload.chequeType === 'incoming' ? 'received' : 'issued',
      reference: payload.reference,
      notes: payload.notes,
    }, ctx);
  }

  public clearCheque(chequeId: string, ctx: TenantContext): DbCheque {
    const chq = db.getChequeById(chequeId, ctx);
    if (!chq) throw new Error(`Cheque '${chequeId}' not found.`);
    return db.updateCheque(chq.id, { status: 'cleared' }, ctx);
  }

  public bounceCheque(chequeId: string, ctx: TenantContext): DbCheque {
    const chq = db.getChequeById(chequeId, ctx);
    if (!chq) throw new Error(`Cheque '${chequeId}' not found.`);
    return db.updateCheque(chq.id, { status: 'bounced' }, ctx);
  }

  // ==========================================================================
  // 9. Account Statement Ledger & Running Balance
  // ==========================================================================

  public getAccountStatement(
    accountId: string,
    startDate?: string,
    endDate?: string,
    ctx?: TenantContext
  ): {
    openingBalance: string;
    totalDebits: string;
    totalCredits: string;
    closingBalance: string;
    transactions: Array<DbBankTransaction & { runningBalance: string }>;
  } {
    if (!ctx) throw new Error('Tenant context is required');
    const bank = db.getBankAccountById(accountId, ctx) || db.getCashAccountById(accountId, ctx);
    if (!bank) throw new Error(`Account '${accountId}' not found.`);

    const allTx = db.getBankTransactions(accountId, ctx).sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

    let running = parseFloat(bank.openingBalance || '0.0000');
    let totalDebits = 0;
    let totalCredits = 0;

    const rows: Array<DbBankTransaction & { runningBalance: string }> = [];

    for (const tx of allTx) {
      const amt = parseFloat(tx.amount);
      if (tx.debitCredit === 'debit') {
        running += amt;
        totalDebits += amt;
      } else {
        running -= amt;
        totalCredits += amt;
      }

      const matchesStart = !startDate || tx.transactionDate >= startDate;
      const matchesEnd = !endDate || tx.transactionDate <= endDate;

      if (matchesStart && matchesEnd) {
        rows.push({
          ...tx,
          runningBalance: running.toFixed(4),
        });
      }
    }

    return {
      openingBalance: bank.openingBalance || '0.0000',
      totalDebits: totalDebits.toFixed(4),
      totalCredits: totalCredits.toFixed(4),
      closingBalance: running.toFixed(4),
      transactions: rows,
    };
  }
}

export const bankingService = new BankingService();
