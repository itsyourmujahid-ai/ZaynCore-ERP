// ============================================================================
// Sub-Ledger Reconciliation & Variance Detection Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext, SubLedgerType } from '@/core/types/common';

export interface SubLedgerEntityBalance {
  entityId: string;
  entityName: string;
  subLedgerType: SubLedgerType;
  totalDebit: string;
  totalCredit: string;
  netBalance: string;
  currency: string;
}

export interface SubLedgerReconciliationReport {
  subLedgerType: SubLedgerType;
  subLedgerName: string;
  glAccountCode: string;
  glAccountName: string;
  subLedgerTotalBalance: string;
  glControlAccountBalance: string;
  variance: string;
  isReconciled: boolean;
  entities: SubLedgerEntityBalance[];
}

export class SubLedgerService {
  /**
   * Reconciles a specific Sub-Ledger against its General Ledger control account
   */
  public reconcileSubLedger(
    subLedgerType: SubLedgerType,
    ctx: TenantContext
  ): SubLedgerReconciliationReport {
    const subEntries = db.getSubLedgerEntries(ctx).filter((e) => e.subLedgerType === subLedgerType);
    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');

    let controlCode = '1200';
    let subLedgerName = 'Accounts Receivable';

    switch (subLedgerType) {
      case 'customer':
        controlCode = '1200';
        subLedgerName = 'Accounts Receivable (Customers)';
        break;
      case 'supplier':
        controlCode = '2010';
        subLedgerName = 'Accounts Payable (Suppliers)';
        break;
      case 'bank_account':
        controlCode = '1010';
        subLedgerName = 'Bank & Treasury Accounts';
        break;
      case 'inventory_item':
        controlCode = '1300';
        subLedgerName = 'Perpetual Merchandise Inventory';
        break;
      case 'fixed_asset':
        controlCode = '1510';
        subLedgerName = 'Capitalized Fixed Assets';
        break;
      case 'employee':
        controlCode = '2300';
        subLedgerName = 'Payroll & Staff Payables';
        break;
      case 'tax_code':
        controlCode = '2200';
        subLedgerName = 'Tax & VAT Control Sub-Ledger';
        break;
      case 'intercompany':
        controlCode = '1220';
        subLedgerName = 'Intercompany Clearing & Balances';
        break;
      default:
        controlCode = '1200';
        subLedgerName = 'Sub-Ledger Register';
        break;
    }

    const controlAccount = accounts.find((a) => {
      if (a.code === controlCode) return true;
      if (subLedgerType === 'customer' && a.code === '1100') return true;
      if (subLedgerType === 'supplier' && a.code === '2100') return true;
      if (subLedgerType === 'bank_account' && (a.code === '1010' || a.code === '1020')) return true;
      if (subLedgerType === 'inventory_item' && (a.code === '1300' || a.code === '1310')) return true;
      if (subLedgerType === 'fixed_asset' && (a.code === '1500' || a.code === '1510')) return true;
      if (subLedgerType === 'employee' && (a.code === '2300' || a.code === '2130' || a.code === '2220')) return true;
      if (subLedgerType === 'tax_code' && (a.code === '2150' || a.code === '2200' || a.code === '1150')) return true;
      if (subLedgerType === 'intercompany' && (a.code === '1900' || a.code === '2900' || a.code === '1220')) return true;
      return false;
    });

    // Compute GL Control Account Balance from posted journals
    let glDebits = 0;
    let glCredits = 0;
    if (controlAccount) {
      for (const j of journals) {
        for (const line of j.lines) {
          if (line.accountId === controlAccount.id) {
            glDebits += parseFloat(line.debitAmount);
            glCredits += parseFloat(line.creditAmount);
          }
        }
      }
    }

    const isDebitNormal = controlAccount ? controlAccount.normalBalance === 'debit' : true;
    const glControlBalanceNum = isDebitNormal ? (glDebits - glCredits) : (glCredits - glDebits);

    // Compute Sub-Ledger Entity Groupings
    const entityMap = new Map<string, { entityName: string; debits: number; credits: number }>();
    for (const entry of subEntries) {
      const existing = entityMap.get(entry.entityId) || { entityName: entry.entityName, debits: 0, credits: 0 };
      existing.debits += parseFloat(entry.debitAmount);
      existing.credits += parseFloat(entry.creditAmount);
      entityMap.set(entry.entityId, existing);
    }

    let subLedgerTotalNum = 0;
    const entities: SubLedgerEntityBalance[] = [];

    entityMap.forEach((val, id) => {
      const net = isDebitNormal ? (val.debits - val.credits) : (val.credits - val.debits);
      subLedgerTotalNum += net;
      entities.push({
        entityId: id,
        entityName: val.entityName,
        subLedgerType,
        totalDebit: val.debits.toFixed(4),
        totalCredit: val.credits.toFixed(4),
        netBalance: net.toFixed(4),
        currency: controlAccount?.currency || ctx.baseCurrency,
      });
    });

    const varianceNum = subLedgerTotalNum - glControlBalanceNum;
    const isReconciled = Math.abs(varianceNum) < 0.0001;

    return {
      subLedgerType,
      subLedgerName,
      glAccountCode: controlAccount ? controlAccount.code : controlCode,
      glAccountName: controlAccount ? controlAccount.name : subLedgerName,
      subLedgerTotalBalance: subLedgerTotalNum.toFixed(4),
      glControlAccountBalance: glControlBalanceNum.toFixed(4),
      variance: varianceNum.toFixed(4),
      isReconciled,
      entities,
    };
  }
}

export const subLedgerService = new SubLedgerService();
