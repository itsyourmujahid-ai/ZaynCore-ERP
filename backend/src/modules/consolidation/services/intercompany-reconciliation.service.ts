// ============================================================================
// Intercompany Reconciliation & Discrepancy Matching Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { DbIntercompanyTransaction } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { parseDecimal, formatDecimal } from '@/core/utils/money';

export type ReconciliationMatchStatus = 'matched' | 'partially_matched' | 'unmatched' | 'discrepancy';

export interface IntercompanyReconciliationItem {
  id: string;
  sourceCompanyId: string;
  sourceCompanyName: string;
  targetCompanyId: string;
  targetCompanyName: string;
  sourceReceivableAmount: string;
  targetPayableAmount: string;
  differenceAmount: string;
  currency: string;
  status: ReconciliationMatchStatus;
  transactions: DbIntercompanyTransaction[];
  notes?: string;
}

export interface IntercompanyReconciliationSummary {
  totalPairs: number;
  matchedPairs: number;
  discrepancyPairs: number;
  totalReceivableBalance: string;
  totalPayableBalance: string;
  netVariance: string;
  items: IntercompanyReconciliationItem[];
}

export class IntercompanyReconciliationService {
  public reconcileIntercompanyPairs(_groupId?: string, _ctx?: TenantContext): IntercompanyReconciliationSummary {
    const allCompanies = db.getCompanies();
    const allTx = db.getIntercompanyTransactions();

    // Group transactions by bilateral company pairs (A -> B or B -> A)
    const pairMap = new Map<string, DbIntercompanyTransaction[]>();

    allTx.forEach((tx) => {
      const pairKey = [tx.sourceCompanyId, tx.targetCompanyId].sort().join('___');
      const list = pairMap.get(pairKey) || [];
      list.push(tx);
      pairMap.set(pairKey, list);
    });

    const items: IntercompanyReconciliationItem[] = [];
    let grandTotalRec = 0;
    let grandTotalPay = 0;
    let matchedCount = 0;
    let discrepancyCount = 0;

    pairMap.forEach((txList, pairKey) => {
      const [comp1Id, comp2Id] = pairKey.split('___');
      const comp1 = allCompanies.find((c) => c.id === comp1Id) || { id: comp1Id, name: comp1Id };
      const comp2 = allCompanies.find((c) => c.id === comp2Id) || { id: comp2Id, name: comp2Id };

      let comp1ReceivableFrom2 = 0;
      let comp2PayableTo1 = 0;

      txList.forEach((tx) => {
        if (tx.status === 'posted' || tx.status === 'settled') {
          const amt = parseFloat(tx.amount || '0');
          if (tx.sourceCompanyId === comp1Id && tx.targetCompanyId === comp2Id) {
            comp1ReceivableFrom2 += amt;
            comp2PayableTo1 += amt; // Synchronized in posting
          } else if (tx.sourceCompanyId === comp2Id && tx.targetCompanyId === comp1Id) {
            // Reverse direction
            comp1ReceivableFrom2 -= amt;
            comp2PayableTo1 -= amt;
          }
        }
      });

      const recStr = formatDecimal(parseDecimal(comp1ReceivableFrom2.toFixed(4)));
      const payStr = formatDecimal(parseDecimal(comp2PayableTo1.toFixed(4)));
      const diff = Math.abs(comp1ReceivableFrom2 - comp2PayableTo1);
      const diffStr = formatDecimal(parseDecimal(diff.toFixed(4)));

      let status: ReconciliationMatchStatus = 'matched';
      if (diff > 0.001) {
        status = 'discrepancy';
        discrepancyCount++;
      } else if (txList.length === 0) {
        status = 'unmatched';
      } else {
        matchedCount++;
      }

      grandTotalRec += comp1ReceivableFrom2;
      grandTotalPay += comp2PayableTo1;

      items.push({
        id: `rec-${pairKey}`,
        sourceCompanyId: comp1.id,
        sourceCompanyName: comp1.name,
        targetCompanyId: comp2.id,
        targetCompanyName: comp2.name,
        sourceReceivableAmount: recStr,
        targetPayableAmount: payStr,
        differenceAmount: diffStr,
        currency: 'USD',
        status,
        transactions: txList,
      });
    });

    const netVarianceVal = Math.abs(grandTotalRec - grandTotalPay);

    return {
      totalPairs: items.length,
      matchedPairs: matchedCount,
      discrepancyPairs: discrepancyCount,
      totalReceivableBalance: formatDecimal(parseDecimal(grandTotalRec.toFixed(4))),
      totalPayableBalance: formatDecimal(parseDecimal(grandTotalPay.toFixed(4))),
      netVariance: formatDecimal(parseDecimal(netVarianceVal.toFixed(4))),
      items,
    };
  }
}

export const intercompanyReconciliationService = new IntercompanyReconciliationService();
