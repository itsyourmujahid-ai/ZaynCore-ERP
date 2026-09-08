// ============================================================================
// Work In Progress (WIP) Accounting & Capitalization Service (Phase 12)
// ============================================================================

import { db } from '@/database/storage';
import { DbProjectWipBalance } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface CapitalizeWipResult {
  wipBalance: DbProjectWipBalance;
  journalEntryId: string;
}

export class ProjectWipService {
  public getWipBalance(projectId: string, ctx: TenantContext): DbProjectWipBalance {
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    return db.getProjectWipBalance(projectId, ctx);
  }

  // --- Capitalize Direct Project Costs to WIP Asset (#1350) ---
  public capitalizeCostsToWip(
    projectId: string,
    amount: string,
    memo?: string,
    ctx?: TenantContext
  ): CapitalizeWipResult {
    if (!ctx) throw new Error('Tenant context required');
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    const amountVal = parseFloat(amount || '0') || 0;
    if (amountVal <= 0) throw new DomainValidationError('Capitalization amount must be greater than zero.');

    const docNum = `WIP-CAP-${project.code}-${Date.now().toString(36).toUpperCase()}`;
    const date = new Date().toISOString().slice(0, 10);

    // Dr Work In Progress (#1350), Cr Project Cost Clearing (#5010)
    const posting = accountingPostingService.post(
      'PROJECT_WIP_CAPITALIZED',
      {
        sourceType: 'wip_capitalization',
        sourceId: `wip-cap-${projectId}`,
        documentNumber: docNum,
        documentDate: date,
        amount: amountVal.toFixed(4),
        currency: project.currency,
        exchangeRate: '1.000000',
        projectId: project.id,
        subLedgerType: 'project',
        subLedgerEntityId: project.id,
        memo: memo || `Capitalize direct project costs to WIP Asset (#1350) for ${project.code}`,
      },
      ctx
    );

    const wip = db.getProjectWipBalance(projectId, ctx);
    const newCap = (parseFloat(wip.capitalizedAmount) + amountVal).toFixed(4);
    const newBal = (parseFloat(wip.currentWipBalance) + amountVal).toFixed(4);

    const updatedWip = db.updateProjectWipBalance(projectId, {
      capitalizedAmount: newCap,
      currentWipBalance: newBal,
    }, ctx);

    return {
      wipBalance: updatedWip,
      journalEntryId: posting.id,
    };
  }

  // --- Transfer / Realize WIP Asset (#1350) to Cost of Sales (#5010) ---
  public transferWipToCogs(
    projectId: string,
    amount: string,
    memo?: string,
    ctx?: TenantContext
  ): { wipBalance: DbProjectWipBalance; journalEntryId: string } {
    if (!ctx) throw new Error('Tenant context required');
    const project = db.getProjectById(projectId, ctx);
    if (!project) throw new DomainValidationError(`Project '${projectId}' not found.`);

    const amountVal = parseFloat(amount || '0') || 0;
    if (amountVal <= 0) throw new DomainValidationError('Transfer amount must be greater than zero.');

    const wip = db.getProjectWipBalance(projectId, ctx);
    const curBal = parseFloat(wip.currentWipBalance);
    if (amountVal > curBal + 0.0001) {
      throw new DomainValidationError(
        `Cannot transfer $${amountVal} from WIP. Current available WIP balance is $${wip.currentWipBalance}.`
      );
    }

    const docNum = `WIP-TRF-${project.code}-${Date.now().toString(36).toUpperCase()}`;
    const date = new Date().toISOString().slice(0, 10);

    // Dr Cost of Goods Sold (#5010), Cr Work In Progress (#1350)
    const posting = accountingPostingService.post(
      'PROJECT_WIP_TRANSFER',
      {
        sourceType: 'wip_transfer',
        sourceId: `wip-trf-${projectId}`,
        documentNumber: docNum,
        documentDate: date,
        amount: amountVal.toFixed(4),
        currency: project.currency,
        exchangeRate: '1.000000',
        projectId: project.id,
        subLedgerType: 'project',
        subLedgerEntityId: project.id,
        memo: memo || `WIP Asset Realization to COGS (#5010) upon milestone delivery for ${project.code}`,
      },
      ctx
    );

    const newTrf = (parseFloat(wip.transferredToCogs) + amountVal).toFixed(4);
    const newBal = Math.max(0, curBal - amountVal).toFixed(4);

    const updatedWip = db.updateProjectWipBalance(projectId, {
      transferredToCogs: newTrf,
      currentWipBalance: newBal,
    }, ctx);

    return {
      wipBalance: updatedWip,
      journalEntryId: posting.id,
    };
  }
}

export const projectWipService = new ProjectWipService();
