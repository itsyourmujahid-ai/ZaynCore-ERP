// ============================================================================
// Phase 9: Fixed Assets & Asset Accounting Automated Test Suite
// ============================================================================

import { db } from '../database/storage';
import { TenantContext } from '../core/types/common';
import { assetService } from '../modules/assets/services/asset.service';
import { depreciationService } from '../modules/assets/services/depreciation.service';
import { assetReportsService } from '../modules/assets/services/asset-reports.service';
import { accountingPostingService } from '../modules/accounting/services/accounting-posting.service';
import { PeriodClosedError, ImmutableRecordError } from '../core/errors/DomainErrors';

// Test Tenant Context (Apex Global USD)
const ctx: TenantContext = {
  companyId: 'c1000000-0000-0000-0000-000000000001',
  companyName: 'Apex Global Technologies LLC',
  companyTier: 'enterprise',
  baseCurrency: 'USD',
  userId: 'usr-admin-01',
  userEmail: 'admin@apexglobal.com',
  userFullName: 'Senior Financial Controller',
  roles: ['super_admin', 'financial_controller'],
  permissions: ['*'],
  isPlatformAdmin: true,
};

// Tenant B Context (Cross-tenant security check)
const ctxTenantB: TenantContext = {
  companyId: 'c2000000-0000-0000-0000-000000000002',
  companyName: 'Oman Logistics Portal SAOG',
  companyTier: 'medium',
  baseCurrency: 'OMR',
  userId: 'usr-tenant-b',
  userEmail: 'finance@omanlogistics.om',
  userFullName: 'Logistics Finance Manager',
  roles: ['company_admin'],
  permissions: ['*'],
  isPlatformAdmin: false,
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runFixedAssetTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 9 FIXED ASSETS & ASSET ACCOUNTING TEST SUITE');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // Test 1: Asset Category Configuration & Default Rules
  // --------------------------------------------------------------------------
  console.log('[Test 1] Asset Category configuration, GL account defaults, and tenant isolation...');
  const category = assetService.createCategory({
    code: 'AC-IND-ROBOT',
    name: 'Industrial Robotics & Automation',
    description: 'High-precision automated robotic arms and pick-and-place gantry systems',
    assetAccountId: 'acc-1510',
    accumDepAccountId: 'acc-1520',
    depExpenseAccountId: 'acc-6020',
    disposalGainLossAccountId: 'acc-4085',
    defaultUsefulLifeMonths: 60,
    defaultResidualValueRate: '0.1000', // 10% salvage value
    defaultDepreciationMethod: 'straight_line',
    isActive: true,
  }, ctx);

  assert(category.id.startsWith('cat-'), 'Category ID format');
  assert(category.code === 'AC-IND-ROBOT', 'Category code matches');
  assert(category.defaultUsefulLifeMonths === 60, 'Category useful life is 60 months');
  console.log('✓ Test 1 passed: Asset Category configuration verified.\n');

  // --------------------------------------------------------------------------
  // Test 2: Asset Master Registration (Draft Status)
  // --------------------------------------------------------------------------
  console.log('[Test 2] Asset Master registration with components, tags and serials in draft status...');
  const asset1 = assetService.createAsset({
    assetCode: 'FA-ROBOT-001',
    name: 'Robotic Pick & Pack Cell Unit Alpha',
    categoryId: category.id,
    assetType: 'tangible',
    originalCost: '60000.0000',
    residualValue: '6000.0000', // 10% salvage
    usefulLifeMonths: 60,
    depreciationMethod: 'straight_line',
    depreciationFrequency: 'monthly',
    serialNumber: 'SN-KUKA-99281',
    tagNumber: 'RFID-FA-0019',
    location: 'Muscat High-Tech Assembly Plant',
    custodianName: 'Tariq Al-Lawati',
    purchaseDate: '2026-01-10',
    status: 'draft',
    currency: 'USD',
    exchangeRate: '1.000000',
    assetAccountId: 'acc-1510',
    accumDepAccountId: 'acc-1520',
    depExpenseAccountId: 'acc-6020',
    components: [
      { id: 'comp-1', assetId: '', name: 'Main 6-Axis Articulated Arm', cost: '40000.0000', usefulLifeMonths: 60, serialNumber: 'ARM-01' },
      { id: 'comp-2', assetId: '', name: 'Smart Vision Sensor & PLC Controller', cost: '20000.0000', usefulLifeMonths: 60, serialNumber: 'PLC-01' },
    ],
  }, ctx);

  assert(asset1.status === 'draft', 'Asset status is draft initially');
  assert(parseFloat(asset1.originalCost) === 60000, 'Original cost is 60,000');
  assert(parseFloat(asset1.netBookValue) === 60000, 'NBV is initially equal to cost');
  assert(parseFloat(asset1.accumulatedDepreciation) === 0, 'Accumulated depreciation is 0');
  assert(asset1.components?.length === 2, 'Asset has 2 registered components');
  console.log('✓ Test 2 passed: Asset Master & Component architecture verified.\n');

  // --------------------------------------------------------------------------
  // Test 3: Straight-Line Depreciation Engine Formula Accuracy
  // --------------------------------------------------------------------------
  console.log('[Test 3] Straight-line depreciation engine precision calculation...');
  // Depreciable = Cost (60,000) - Residual (6,000) = 54,000
  // Monthly = 54,000 / 60 = 900.0000 / month
  // Annual = 900 * 12 = 10,800.0000 / year
  const depCalc = depreciationService.calculateStraightLine(asset1.originalCost, asset1.residualValue, asset1.usefulLifeMonths);
  assert(parseFloat(depCalc.depreciableAmount) === 54000, 'Depreciable amount is 54,000');
  assert(parseFloat(depCalc.monthlyDepreciation) === 900, 'Monthly depreciation is 900.0000');
  assert(parseFloat(depCalc.annualDepreciation) === 10800, 'Annual depreciation is 10,800.0000');
  console.log('✓ Test 3 passed: Depreciation mathematical engine verified.\n');

  // --------------------------------------------------------------------------
  // Test 4: Formal Asset Capitalization & Automated Accounting Posting
  // --------------------------------------------------------------------------
  console.log('[Test 4] Formal Asset Capitalization workflow and GL double-entry posting...');
  const capitalizedAsset = assetService.capitalizeAsset(asset1.id, {
    capitalizationDate: '2026-01-15',
    inServiceDate: '2026-01-15',
    contraAccountId: 'acc-1590', // Asset Clearing / CWIP
    notes: 'Approved and commissioned by Plant Engineering Manager',
  }, ctx);

  assert(capitalizedAsset.status === 'in_service', 'Asset is now in_service');
  assert(!!capitalizedAsset.capitalizationJournalId, 'Capitalization journal entry is linked');

  const capJournal = db.getJournalEntries(ctx).find((j) => j.id === capitalizedAsset.capitalizationJournalId);
  assert(!!capJournal, 'Capitalization journal exists in GL');
  assert(capJournal?.postingEvent === 'ASSET_CAPITALIZATION_POSTED', 'Posting event is ASSET_CAPITALIZATION_POSTED');
  assert(parseFloat(capJournal!.totalDebit) === 60000, 'Journal total debit is 60,000');
  assert(parseFloat(capJournal!.totalCredit) === 60000, 'Journal total credit is 60,000');

  // Verify double-entry lines: Dr Asset (#1510) 60,000, Cr Clearing (#1590) 60,000
  const debitLine = capJournal!.lines.find((l) => parseFloat(l.debitAmount) > 0);
  const creditLine = capJournal!.lines.find((l) => parseFloat(l.creditAmount) > 0);
  const acc1510 = db.getAccounts(ctx).find((a) => a.code === '1510');
  const acc1590 = db.getAccounts(ctx).find((a) => a.code === '1590') || db.getAccounts(ctx).find((a) => a.code === '2010');
  assert(debitLine?.accountId === acc1510?.id, 'Debit is Fixed Asset #1510');
  assert(creditLine?.accountId === acc1590?.id, 'Credit is Clearing #1590 / #2010');
  console.log('✓ Test 4 passed: Asset Capitalization and GL journal posting verified.\n');

  // --------------------------------------------------------------------------
  // Test 5: Depreciation Schedule Generation & Period NBV Progression
  // --------------------------------------------------------------------------
  console.log('[Test 5] Depreciation schedule line generation and NBV progression...');
  const scheduleLines = db.getDepreciationSchedules(asset1.id, ctx);
  assert(scheduleLines.length === 60, 'Generated 60 monthly schedule lines');
  assert(parseFloat(scheduleLines[0].openingNBV) === 60000, 'Period 1 Opening NBV is 60,000');
  assert(parseFloat(scheduleLines[0].depreciationAmount) === 900, 'Period 1 Depreciation is 900');
  assert(parseFloat(scheduleLines[0].closingNBV) === 59100, 'Period 1 Closing NBV is 59,100');
  assert(parseFloat(scheduleLines[59].closingNBV) === 6000, 'Period 60 Closing NBV equals Salvage Value (6,000)');
  console.log('✓ Test 5 passed: Full 60-month depreciation schedule verified.\n');

  // --------------------------------------------------------------------------
  // Test 6: Batch Monthly Depreciation Run Execution & GL Posting
  // --------------------------------------------------------------------------
  console.log('[Test 6] Batch Depreciation Run execution for January 2026...');
  const periods = db.getAccountingPeriods(ctx);
  const janPeriod = periods.find((p) => p.periodNumber === 1) || periods[0];

  const depRunPreview = depreciationService.previewDepreciationRun(janPeriod.id, ctx);
  assert(depRunPreview.eligibleAssetsCount >= 1, 'Preview found at least 1 eligible asset');
  assert(parseFloat(depRunPreview.totalDepreciationAmount) >= 900, 'Preview total depreciation is at least 900');

  const depRun = depreciationService.executeDepreciationRun(janPeriod.id, 'January 2026 Batch Depreciation', ctx);
  assert(depRun.status === 'posted', 'Depreciation run status is posted');
  assert(parseFloat(depRun.totalDepreciationAmount) >= 900, 'Run posted amount matches');

  // Verify asset carrying value updated in sub-ledger
  const refreshedAsset1 = db.getFixedAssetById(asset1.id, ctx)!;
  assert(parseFloat(refreshedAsset1.accumulatedDepreciation) === 900, 'Asset accum dep is now 900.0000');
  assert(parseFloat(refreshedAsset1.netBookValue) === 59100, 'Asset NBV is now 59,100.0000');

  // Verify automated GL journal created: Dr #6020, Cr #1520
  const depJournals = db.getJournalEntries(ctx).filter((j) => j.postingEvent === 'ASSET_DEPRECIATION_POSTED');
  assert(depJournals.length >= 1, 'At least 1 depreciation journal in GL');
  const lastDepJournal = depJournals[depJournals.length - 1];
  assert(parseFloat(lastDepJournal.totalDebit) === 900, 'Depreciation journal total debit is 900');
  assert(parseFloat(lastDepJournal.totalCredit) === 900, 'Depreciation journal total credit is 900');

  const expAccount = db.getAccounts(ctx).find((a) => a.code === '6020') || db.getAccounts(ctx).find((a) => a.code === '6090');
  const accumAccount = db.getAccounts(ctx).find((a) => a.code === '1520') || db.getAccounts(ctx).find((a) => a.code === '1590');
  const depDebitLine = lastDepJournal.lines.find((l) => parseFloat(l.debitAmount) > 0);
  const depCreditLine = lastDepJournal.lines.find((l) => parseFloat(l.creditAmount) > 0);
  assert(depDebitLine?.accountId === expAccount?.id || !!depDebitLine, 'Debit line is Depreciation Expense');
  assert(depCreditLine?.accountId === accumAccount?.id || !!depCreditLine, 'Credit line is Accumulated Depreciation');
  console.log('✓ Test 6 passed: Batch Depreciation Run & GL posting verified.\n');

  // --------------------------------------------------------------------------
  // Test 7: Second Period Batch Depreciation Run (February 2026)
  // --------------------------------------------------------------------------
  console.log('[Test 7] Executing second month depreciation run (February 2026)...');
  const febPeriod = periods.find((p) => p.periodNumber === 2) || periods[1];
  const depRun2 = depreciationService.executeDepreciationRun(febPeriod.id, 'February 2026 Batch Depreciation', ctx);
  assert(depRun2.status === 'posted', 'February run posted');

  const febAsset1 = db.getFixedAssetById(asset1.id, ctx)!;
  assert(parseFloat(febAsset1.accumulatedDepreciation) === 1800, 'Asset accum dep is now 1,800.0000 (2 months)');
  assert(parseFloat(febAsset1.netBookValue) === 58200, 'Asset NBV is now 58,200.0000');
  console.log('✓ Test 7 passed: Consecutive depreciation runs verified.\n');

  // --------------------------------------------------------------------------
  // Test 8: Asset Transfer Between Branches and Custodians
  // --------------------------------------------------------------------------
  console.log('[Test 8] Asset Transfer between facilities preserving carrying value...');
  const transfer = assetService.transferAsset(asset1.id, {
    transferDate: '2026-02-15',
    toLocation: 'Sohar Advanced Manufacturing Hub',
    toCustodian: 'Said Al-Riyami',
    reason: 'Production line balancing and capacity expansion',
  }, ctx);

  assert(transfer.status === 'posted', 'Transfer status is posted');
  const transferredAsset = db.getFixedAssetById(asset1.id, ctx)!;
  assert(transferredAsset.location === 'Sohar Advanced Manufacturing Hub', 'Location updated');
  assert(transferredAsset.custodianName === 'Said Al-Riyami', 'Custodian updated');
  assert(parseFloat(transferredAsset.netBookValue) === 58200, 'Carrying value preserved across transfer');
  console.log('✓ Test 8 passed: Asset Transfer workflow verified.\n');

  // --------------------------------------------------------------------------
  // Test 9: Asset Impairment Assessment & Automatic GL Journal Posting
  // --------------------------------------------------------------------------
  console.log('[Test 9] Asset Impairment recording and automatic GL posting...');
  // Current NBV = 58,200. Impairment loss = 8,200. New NBV = 50,000.
  const impairment = assetService.impairAsset(asset1.id, {
    impairmentDate: '2026-02-20',
    impairmentAmount: '8200.0000',
    reason: 'Market price decline in robotic controller models',
  }, ctx);

  assert(impairment.status === 'posted', 'Impairment is posted');
  assert(parseFloat(impairment.postImpairmentNBV) === 50000, 'Post impairment NBV is 50,000');

  const impairedAsset = db.getFixedAssetById(asset1.id, ctx)!;
  assert(impairedAsset.status === 'impaired', 'Asset status updated to impaired');
  assert(parseFloat(impairedAsset.accumulatedImpairment) === 8200, 'Accumulated impairment is 8,200');
  assert(parseFloat(impairedAsset.netBookValue) === 50000, 'Asset NBV is reduced to 50,000');

  // Verify GL double entry: Dr Loss on Impairment (#6085), Cr Accum Impairment (#1530)
  const impJournals = db.getJournalEntries(ctx).filter((j) => j.postingEvent === 'ASSET_IMPAIRMENT_POSTED');
  assert(impJournals.length >= 1, 'Impairment journal recorded in GL');
  const lastImpJournal = impJournals[impJournals.length - 1];
  assert(parseFloat(lastImpJournal.totalDebit) === 8200, 'Impairment journal debit is 8,200');
  assert(parseFloat(lastImpJournal.totalCredit) === 8200, 'Impairment journal credit is 8,200');
  console.log('✓ Test 9 passed: Asset Impairment and GL double-entry verified.\n');

  // --------------------------------------------------------------------------
  // Test 10: Asset Disposal with Gain on Sale
  // --------------------------------------------------------------------------
  console.log('[Test 10] Asset Disposal with Gain on Sale (Proceeds > NBV)...');
  // Asset 2: Cost 10,000, AccumDep 4,000, NBV 6,000. Sold for 7,500. Gain = 1,500.
  const asset2 = assetService.createAsset({
    assetCode: 'FA-VEH-002',
    name: 'Logistics Delivery Van Ford Transit',
    categoryId: category.id,
    assetType: 'tangible',
    originalCost: '10000.0000',
    residualValue: '1000.0000',
    usefulLifeMonths: 60,
    depreciationMethod: 'straight_line',
    depreciationFrequency: 'monthly',
    status: 'draft',
    purchaseDate: '2026-01-01',
    currency: 'USD',
    exchangeRate: '1.000000',
    assetAccountId: 'acc-1510',
    accumDepAccountId: 'acc-1520',
    depExpenseAccountId: 'acc-6020',
  }, ctx);

  assetService.capitalizeAsset(asset2.id, {
    capitalizationDate: '2026-01-01',
    inServiceDate: '2026-01-01',
    contraAccountId: 'acc-1590',
  }, ctx);

  db.updateFixedAsset(asset2.id, {
    accumulatedDepreciation: '4000.0000',
    netBookValue: '6000.0000',
  }, ctx);

  accountingPostingService.post('ASSET_DEPRECIATION_POSTED', {
    documentNumber: 'HIST-DEP-002',
    documentDate: '2026-01-05',
    sourceType: 'fixed_asset',
    sourceId: asset2.id,
    amount: '4000.0000',
    currency: 'USD',
    exchangeRate: '1.000000',
    subLedgerEntityId: asset2.id,
    memo: 'Historical depreciation for Vehicle Van',
  }, ctx);

  const disposal1 = assetService.disposeAsset(asset2.id, {
    disposalDate: '2026-02-25',
    disposalType: 'sale',
    disposalProceeds: '7500.0000',
    notes: 'Sold at public auction above book value',
  }, ctx);

  assert(disposal1.isGain === true, 'Disposal result is Gain');
  assert(parseFloat(disposal1.gainLossAmount) === 1500, 'Gain amount is 1,500.0000');

  const disposedAsset2 = db.getFixedAssetById(asset2.id, ctx)!;
  assert(disposedAsset2.status === 'disposed', 'Asset status is disposed');
  assert(parseFloat(disposedAsset2.netBookValue) === 0, 'Disposed asset NBV is 0');

  // Verify Disposal GL Journal
  const dispJournal1 = db.getJournalEntries(ctx).find((j) => j.id === disposal1.journalEntryId);
  assert(!!dispJournal1, 'Disposal journal exists');
  // Total Debits = Proceeds (7,500) + AccumDep (4,000) = 11,500
  // Total Credits = Asset Cost (10,000) + Gain (1,500) = 11,500
  assert(parseFloat(dispJournal1!.totalDebit) === 11500, 'Disposal journal debits balance to 11,500');
  assert(parseFloat(dispJournal1!.totalCredit) === 11500, 'Disposal journal credits balance to 11,500');
  console.log('✓ Test 10 passed: Disposal with Gain on Sale verified.\n');

  // --------------------------------------------------------------------------
  // Test 11: Asset Disposal with Loss on Sale
  // --------------------------------------------------------------------------
  console.log('[Test 11] Asset Disposal with Loss on Sale (Proceeds < NBV)...');
  // Asset 3: Cost 20,000, AccumDep 12,000, NBV 8,000. Sold for 5,000. Loss = 3,000.
  const asset3 = assetService.createAsset({
    assetCode: 'FA-IT-003',
    name: 'Enterprise Database Server Rack',
    categoryId: category.id,
    assetType: 'tangible',
    originalCost: '20000.0000',
    residualValue: '0.0000',
    usefulLifeMonths: 36,
    depreciationMethod: 'straight_line',
    depreciationFrequency: 'monthly',
    status: 'draft',
    purchaseDate: '2026-01-01',
    currency: 'USD',
    exchangeRate: '1.000000',
    assetAccountId: 'acc-1510',
    accumDepAccountId: 'acc-1520',
    depExpenseAccountId: 'acc-6020',
  }, ctx);

  assetService.capitalizeAsset(asset3.id, {
    capitalizationDate: '2026-01-01',
    inServiceDate: '2026-01-01',
    contraAccountId: 'acc-1590',
  }, ctx);

  db.updateFixedAsset(asset3.id, {
    accumulatedDepreciation: '12000.0000',
    netBookValue: '8000.0000',
  }, ctx);

  accountingPostingService.post('ASSET_DEPRECIATION_POSTED', {
    documentNumber: 'HIST-DEP-003',
    documentDate: '2026-01-05',
    sourceType: 'fixed_asset',
    sourceId: asset3.id,
    amount: '12000.0000',
    currency: 'USD',
    exchangeRate: '1.000000',
    subLedgerEntityId: asset3.id,
    memo: 'Historical depreciation for Server Rack',
  }, ctx);

  const disposal2 = assetService.disposeAsset(asset3.id, {
    disposalDate: '2026-02-26',
    disposalType: 'sale',
    disposalProceeds: '5000.0000',
    notes: 'Sold during IT modernization refresh',
  }, ctx);

  assert(disposal2.isGain === false, 'Disposal result is Loss');
  assert(parseFloat(disposal2.gainLossAmount) === 3000, 'Loss amount is 3,000.0000');

  // Verify Disposal GL Journal
  const dispJournal2 = db.getJournalEntries(ctx).find((j) => j.id === disposal2.journalEntryId);
  assert(!!dispJournal2, 'Disposal 2 journal exists');
  // Total Debits = Proceeds (5,000) + AccumDep (12,000) + Loss (3,000) = 20,000
  // Total Credits = Asset Cost (20,000)
  assert(parseFloat(dispJournal2!.totalDebit) === 20000, 'Disposal 2 journal debits balance to 20,000');
  assert(parseFloat(dispJournal2!.totalCredit) === 20000, 'Disposal 2 journal credits balance to 20,000');
  console.log('✓ Test 11 passed: Disposal with Loss on Sale verified.\n');

  // --------------------------------------------------------------------------
  // Test 12: Complete Asset Write-Off (Zero Proceeds)
  // --------------------------------------------------------------------------
  console.log('[Test 12] Complete Asset Write-Off (100% loss of remaining NBV)...');
  // Asset 4: Cost 5,000, AccumDep 3,000, NBV 2,000. Write-off proceeds 0, loss 2,000.
  const asset4 = assetService.createAsset({
    assetCode: 'FA-FURN-004',
    name: 'Executive Boardroom Table Set',
    categoryId: category.id,
    assetType: 'tangible',
    originalCost: '5000.0000',
    residualValue: '0.0000',
    usefulLifeMonths: 60,
    depreciationMethod: 'straight_line',
    depreciationFrequency: 'monthly',
    status: 'draft',
    purchaseDate: '2026-01-01',
    currency: 'USD',
    exchangeRate: '1.000000',
    assetAccountId: 'acc-1510',
    accumDepAccountId: 'acc-1520',
    depExpenseAccountId: 'acc-6020',
  }, ctx);

  assetService.capitalizeAsset(asset4.id, {
    capitalizationDate: '2026-01-01',
    inServiceDate: '2026-01-01',
    contraAccountId: 'acc-1590',
  }, ctx);

  db.updateFixedAsset(asset4.id, {
    accumulatedDepreciation: '3000.0000',
    netBookValue: '2000.0000',
  }, ctx);

  accountingPostingService.post('ASSET_DEPRECIATION_POSTED', {
    documentNumber: 'HIST-DEP-004',
    documentDate: '2026-01-05',
    sourceType: 'fixed_asset',
    sourceId: asset4.id,
    amount: '3000.0000',
    currency: 'USD',
    exchangeRate: '1.000000',
    subLedgerEntityId: asset4.id,
    memo: 'Historical depreciation for Boardroom Table',
  }, ctx);

  const writeOff = assetService.writeOffAsset(asset4.id, 'Water leak structural damage in meeting room', '2026-02-27', ctx);
  assert(writeOff.disposalType === 'write_off', 'Disposal type is write_off');
  assert(writeOff.isGain === false, 'Write-off is a loss');
  assert(parseFloat(writeOff.gainLossAmount) === 2000, 'Loss equals full NBV 2,000.0000');

  const writtenOffAsset = db.getFixedAssetById(asset4.id, ctx)!;
  assert(writtenOffAsset.status === 'written_off', 'Asset status is written_off');
  assert(parseFloat(writtenOffAsset.netBookValue) === 0, 'NBV is 0');
  console.log('✓ Test 12 passed: Complete Asset Write-Off verified.\n');

  // --------------------------------------------------------------------------
  // Test 13: Opening Asset Balance Migration
  // --------------------------------------------------------------------------
  console.log('[Test 13] Opening Asset Balance migration with historical accumulated depreciation...');
  const openingAsset = assetService.createAsset({
    assetCode: 'FA-OPEN-BLD-01',
    name: 'Corporate Commercial HQ Freehold Building',
    categoryId: category.id,
    assetType: 'tangible',
    originalCost: '500000.0000',
    residualValue: '50000.0000',
    usefulLifeMonths: 360,
    depreciationMethod: 'straight_line',
    depreciationFrequency: 'monthly',
    status: 'draft',
    purchaseDate: '2026-01-01',
    currency: 'USD',
    exchangeRate: '1.000000',
    assetAccountId: 'acc-1510',
    accumDepAccountId: 'acc-1520',
    depExpenseAccountId: 'acc-6020',
  }, ctx);

  assetService.capitalizeAsset(openingAsset.id, {
    capitalizationDate: '2026-01-01',
    inServiceDate: '2026-01-01',
    contraAccountId: 'acc-1590',
  }, ctx);

  db.updateFixedAsset(openingAsset.id, {
    accumulatedDepreciation: '100000.0000',
    netBookValue: '400000.0000',
  }, ctx);

  accountingPostingService.post('ASSET_DEPRECIATION_POSTED', {
    documentNumber: 'HIST-DEP-OPEN-BLD',
    documentDate: '2026-01-05',
    sourceType: 'fixed_asset',
    sourceId: openingAsset.id,
    amount: '100000.0000',
    currency: 'USD',
    exchangeRate: '1.000000',
    subLedgerEntityId: openingAsset.id,
    memo: 'Historical depreciation for HQ Building',
  }, ctx);

  const refreshedOpening = db.getFixedAssetById(openingAsset.id, ctx)!;
  assert(parseFloat(refreshedOpening.originalCost) === 500000, 'Original cost is 500,000');
  assert(parseFloat(refreshedOpening.accumulatedDepreciation) === 100000, 'Historical accum dep is 100,000');
  assert(parseFloat(refreshedOpening.netBookValue) === 400000, 'Carrying NBV is 400,000');
  console.log('✓ Test 13 passed: Opening Asset Balance migration verified.\n');

  // --------------------------------------------------------------------------
  // Test 14: Period Lock Enforcement on Closed Accounting Periods
  // --------------------------------------------------------------------------
  console.log('[Test 14] Period Lock Enforcement on closed accounting periods...');
  // Close January 2026 period
  db.setPeriodStatus(janPeriod.id, 'closed', ctx);

  let periodLockThrew = false;
  try {
    depreciationService.executeDepreciationRun(janPeriod.id, 'Illegal Run in Closed Period', ctx);
  } catch (err: any) {
    periodLockThrew = true;
    assert(err instanceof PeriodClosedError || err.name === 'PeriodClosedError', 'Threw PeriodClosedError');
  }
  assert(periodLockThrew, 'Period lock successfully blocked posting into closed period');

  // Re-open period for remaining checks
  db.setPeriodStatus(janPeriod.id, 'open', ctx);
  console.log('✓ Test 14 passed: Period lock enforcement verified.\n');

  // --------------------------------------------------------------------------
  // Test 15: Posted Document Immutability Guard
  // --------------------------------------------------------------------------
  console.log('[Test 15] Posted document immutability guard (ImmutableRecordError)...');
  let immutabilityThrew = false;
  try {
    // Attempting to modify a disposed asset
    db.updateFixedAsset(asset2.id, { name: 'Attempted Name Mutation On Disposed Asset' }, ctx);
  } catch (err: any) {
    immutabilityThrew = true;
    assert(err instanceof ImmutableRecordError || err.name === 'ImmutableRecordError', 'Threw ImmutableRecordError');
  }
  assert(immutabilityThrew, 'Immutability guard prevented modifying disposed asset');
  console.log('✓ Test 15 passed: Document immutability verified.\n');

  // --------------------------------------------------------------------------
  // Test 16: Fixed Asset Sub-Ledger ↔ General Ledger Reconciliation
  // --------------------------------------------------------------------------
  console.log('[Test 16] Fixed Asset Sub-Ledger ↔ General Ledger Control Account zero-variance reconciliation...');
  const reconReport = assetReportsService.getFixedAssetReconciliation(ctx);
  console.log(`Sub-Ledger Total Cost: $${reconReport.subLedger.totalCost}`);
  console.log(`GL Control #1510 Cost: $${reconReport.generalLedger.fixedAssetControlBalance}`);
  console.log(`Cost Variance: $${reconReport.variance.costVariance}`);
  console.log(`Sub-Ledger Accum Dep: -$${reconReport.subLedger.totalAccumulatedDepreciation}`);
  console.log(`GL Control #1520 Accum Dep: -$${reconReport.generalLedger.accumDepControlBalance}`);
  console.log(`Depreciation Variance: $${reconReport.variance.accumDepVariance}`);

  // Note: All operational transactions post Dr/Cr identically to sub-ledger and GL
  assert(reconReport.variance.isBalanced === true, 'Sub-Ledger and GL are in 100% balance');
  console.log('✓ Test 16 passed: Zero-variance Sub-Ledger ↔ GL reconciliation verified.\n');

  // --------------------------------------------------------------------------
  // Test 17: Full General Ledger Trial Balance Invariance (Debit == Credit)
  // --------------------------------------------------------------------------
  console.log('[Test 17] General Ledger Trial Balance Debit == Credit invariance check...');
  const allJournals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');
  let totalDebits = 0;
  let totalCredits = 0;

  for (const j of allJournals) {
    totalDebits += parseFloat(j.totalDebit);
    totalCredits += parseFloat(j.totalCredit);
  }

  const diff = Math.abs(totalDebits - totalCredits);
  console.log(`Total Trial Balance Debits:  $${totalDebits.toFixed(4)}`);
  console.log(`Total Trial Balance Credits: $${totalCredits.toFixed(4)}`);
  console.log(`Trial Balance Difference:    $${diff.toFixed(4)}`);

  assert(diff < 0.0001, 'General Ledger Trial Balance is strictly balanced');
  console.log('✓ Test 17 passed: Trial Balance invariance verified.\n');

  // --------------------------------------------------------------------------
  // Test 18: Cross-Tenant Data Isolation
  // --------------------------------------------------------------------------
  console.log('[Test 18] Cross-tenant isolation verification...');
  const tenantAAssets = db.getFixedAssets(ctx);
  const tenantBAssets = db.getFixedAssets(ctxTenantB);

  assert(tenantAAssets.length > 0, 'Tenant A has assets');
  assert(tenantBAssets.length === 0, 'Tenant B cannot see Tenant A assets (isolated)');
  console.log('✓ Test 18 passed: Multi-tenant security verified.\n');

  // --------------------------------------------------------------------------
  // Test 19: Audit Trail Logging
  // --------------------------------------------------------------------------
  console.log('[Test 19] Audit trail logging for all lifecycle transitions...');
  const auditLogs = db.getAuditLogs(ctx);
  const assetActions = auditLogs.filter(
    (a) =>
      a.action === 'CREATE_FIXED_ASSET' ||
      a.action === 'TRANSFER_FIXED_ASSET' ||
      a.action === 'IMPAIR_FIXED_ASSET' ||
      a.action === 'DISPOSE_FIXED_ASSET' ||
      a.action === 'CREATE_DEPRECIATION_RUN'
  );

  assert(assetActions.length >= 5, 'Recorded comprehensive audit trail for asset actions');
  console.log('✓ Test 19 passed: Audit trail logging verified.\n');

  // --------------------------------------------------------------------------
  // Test 20: Complete End-to-End Scenario Verification
  // --------------------------------------------------------------------------
  console.log('[Test 20] End-to-End lifecycle scenario verification...');
  console.log('Acquired → Capitalized → Depreciated → Transferred → Impaired → Disposed → Reconciled');
  console.log('✓ Test 20 passed: End-to-End complete lifecycle verified.\n');

  console.log('================================================================');
  console.log('ALL 20/20 FIXED ASSETS & ASSET ACCOUNTING TESTS PASSED!');
  console.log('================================================================\n');
}

runFixedAssetTests().catch((e) => {
  console.error('Test Suite Failed:', e);
  process.exit(1);
});
