// ============================================================================
// Multi-Tenant Relational Persistence & Core Accounting Database Engine
// ============================================================================

import { 
  DbCompany, 
  DbBranch, 
  DbDepartment, 
  DbCostCenter, 
  DbFiscalYear, 
  DbAccountingPeriod, 
  DbUser, 
  DbRole, 
  DbCompanyMembership, 
  DbCompanyModule, 
  DbAccountGroup, 
  DbAccount, 
  DbTaxCode,
  DbAccountingRule,
  DbJournalEntry, 
  DbJournalLine, 
  DbSubLedgerEntry,
  DbCustomerGroup,
  DbCustomer,
  DbSalesQuotation,
  DbSalesOrder,
  DbSalesInvoice,
  DbCustomerPayment,
  DbSalesCreditNote,
  DbSupplierGroup,
  DbSupplier,
  DbPurchaseRequest,
  DbRFQ,
  DbSupplierQuotation,
  DbPurchaseOrder,
  DbGoodsReceipt,
  DbSupplierBill,
  MatchStatus,
  DbSupplierPayment,
  DbSupplierCreditNote,
  DbSupplierDebitNote,
  DbItemCategory,
  DbUnitOfMeasure,
  DbItem,
  DbWarehouse,
  DbWarehouseLocation,
  DbStockMovement,
  DbStockTransfer,
  DbStockAdjustment,
  DbStockCount,
  DbSalesDelivery,
  DbSupplierReturn,
  DbBatchLot,
  DbSerialNumber,
  DbAuditLog,
  DbBankAccount,
  DbCashAccount,
  DbBankTransaction,
  DbBankTransfer,
  DbBankStatement,
  DbBankStatementLine,
  DbBankReconciliation,
  DbCashCount,
  DbPaymentMethod,
  DbCheque,
  DbAssetCategory,
  DbFixedAsset,
  DbDepreciationScheduleLine,
  DbDepreciationRun,
  DbAssetTransfer,
  DbAssetImpairment,
  DbAssetDisposal,
  DbDesignation,
  DbEmployee,
  DbSalaryComponent,
  DbSalaryStructure,
  DbAttendanceRecord,
  DbLeaveType,
  DbLeaveBalance,
  DbLeaveRequest,
  DbPayrollPeriod,
  DbPayrollEntry,
  DbEmployeeAdvance,
  DbFinalSettlement,
  DbTaxJurisdiction,
  DbTaxRegistration,
  DbTaxType,
  DbTaxLedgerEntry,
  DbTaxPeriod,
  DbTaxReturn,
  DbTaxAdjustment,
  DbProjectType,
  DbProject,
  DbProjectBudget,
  DbProjectBudgetLine,
  DbProjectTask,
  DbProjectCost,
  DbProjectRevenue,
  DbProjectMilestone,
  DbProjectWipBalance,
  DbProjectCostAllocation,
  DbBusinessUnit,
  DbManagementDimension,
  DbManagementBudget,
  DbCostAllocationRule,
  DbCostAllocationRun,
  DbCompanyGroup,
  DbCompanyRelationship,
  DbCompanyAccess,
  DbIntercompanyTransaction,
  DbGroupChartOfAccounts,
  DbGroupAccountMapping,
  DbConsolidationSet,
  DbConsolidationRun,
  DbConsolidationAdjustment,
  DbEliminationRule,
  DbCurrencyTranslationRate,
  DbCompanyProfile,
  DbProductAttribute,
  DbUomConversion,
  DbCompanyRoleConfig,
  DbOnboardingDraft,
  FullCompanyOnboardingPayload,
  DbAccrualEntry,
  DbPrepaymentSchedule,
  DbDeferredRevenueSchedule,
  DbProvision,
  DbRecurringJournalTemplate,
  DbYearEndClose,
  DbFxRevaluation,
  DbEclCalculation,
  DbBadDebtWriteOff,
  DbEmployeeExpenseClaim,
} from './types';
import { 
  INITIAL_COMPANIES, 
  INITIAL_BRANCHES, 
  INITIAL_DEPARTMENTS, 
  INITIAL_COST_CENTERS, 
  INITIAL_FISCAL_YEARS, 
  INITIAL_ACCOUNTING_PERIODS, 
  INITIAL_USERS, 
  INITIAL_ROLES, 
  INITIAL_MEMBERSHIPS, 
  INITIAL_ACCOUNT_GROUPS, 
  INITIAL_ACCOUNTS, 
  INITIAL_TAX_CODES,
  INITIAL_TAX_JURISDICTIONS,
  INITIAL_TAX_REGISTRATIONS,
  INITIAL_TAX_TYPES,
  INITIAL_PROJECT_TYPES,
  INITIAL_ACCOUNTING_RULES,
  INITIAL_JOURNAL_ENTRIES, 
  INITIAL_JOURNAL_LINES, 
  INITIAL_AUDIT_LOGS,
  generateCompanyModuleEntitlements
} from './seed';
import { TenantContext, CompanyTier, EntityStatus } from '@/core/types/common';
import { TenantViolationError, PeriodClosedError, ImmutableRecordError } from '@/core/errors/DomainErrors';
import { areDebitsAndCreditsBalanced, createMoney } from '@/core/utils/money';

const STORAGE_KEY = 'ENTERPRISE_ERP_DB_V6_SECURE';

interface StorageSchema {
  companies: DbCompany[];
  branches: DbBranch[];
  departments: DbDepartment[];
  costCenters: DbCostCenter[];
  fiscalYears: DbFiscalYear[];
  accountingPeriods: DbAccountingPeriod[];
  users: DbUser[];
  roles: DbRole[];
  memberships: DbCompanyMembership[];
  companyModules: DbCompanyModule[];
  accountGroups: DbAccountGroup[];
  accounts: DbAccount[];
  taxCodes: DbTaxCode[];
  accountingRules: DbAccountingRule[];
  journalEntries: DbJournalEntry[];
  journalLines: DbJournalLine[];
  subLedgerEntries: DbSubLedgerEntry[];
  customerGroups: DbCustomerGroup[];
  customers: DbCustomer[];
  salesQuotations: DbSalesQuotation[];
  salesOrders: DbSalesOrder[];
  salesInvoices: DbSalesInvoice[];
  customerPayments: DbCustomerPayment[];
  salesCreditNotes: DbSalesCreditNote[];
  supplierGroups: DbSupplierGroup[];
  suppliers: DbSupplier[];
  purchaseRequests: DbPurchaseRequest[];
  rfqs: DbRFQ[];
  supplierQuotations: DbSupplierQuotation[];
  purchaseOrders: DbPurchaseOrder[];
  goodsReceipts: DbGoodsReceipt[];
  supplierBills: DbSupplierBill[];
  supplierPayments: DbSupplierPayment[];
  supplierCreditNotes: DbSupplierCreditNote[];
  supplierDebitNotes: DbSupplierDebitNote[];
  itemCategories: DbItemCategory[];
  unitsOfMeasure: DbUnitOfMeasure[];
  items: DbItem[];
  warehouses: DbWarehouse[];
  warehouseLocations: DbWarehouseLocation[];
  stockMovements: DbStockMovement[];
  stockTransfers: DbStockTransfer[];
  stockAdjustments: DbStockAdjustment[];
  stockCounts: DbStockCount[];
  salesDeliveries: DbSalesDelivery[];
  supplierReturns: DbSupplierReturn[];
  batchLots: DbBatchLot[];
  serialNumbers: DbSerialNumber[];
  bankAccounts: DbBankAccount[];
  cashAccounts: DbCashAccount[];
  bankTransactions: DbBankTransaction[];
  bankTransfers: DbBankTransfer[];
  bankStatements: DbBankStatement[];
  bankStatementLines: DbBankStatementLine[];
  bankReconciliations: DbBankReconciliation[];
  cashCounts: DbCashCount[];
  paymentMethods: DbPaymentMethod[];
  cheques: DbCheque[];
  assetCategories: DbAssetCategory[];
  fixedAssets: DbFixedAsset[];
  depreciationSchedules: DbDepreciationScheduleLine[];
  depreciationRuns: DbDepreciationRun[];
  assetTransfers: DbAssetTransfer[];
  assetImpairments: DbAssetImpairment[];
  assetDisposals: DbAssetDisposal[];
  employees: DbEmployee[];
  designations: DbDesignation[];
  salaryComponents: DbSalaryComponent[];
  salaryStructures: DbSalaryStructure[];
  attendanceRecords: DbAttendanceRecord[];
  leaveTypes: DbLeaveType[];
  leaveBalances: DbLeaveBalance[];
  leaveRequests: DbLeaveRequest[];
  payrollPeriods: DbPayrollPeriod[];
  payrollEntries: DbPayrollEntry[];
  employeeAdvances: DbEmployeeAdvance[];
  finalSettlements: DbFinalSettlement[];
  taxJurisdictions: DbTaxJurisdiction[];
  taxRegistrations: DbTaxRegistration[];
  taxTypes: DbTaxType[];
  taxLedgerEntries: DbTaxLedgerEntry[];
  taxPeriods: DbTaxPeriod[];
  taxReturns: DbTaxReturn[];
  taxAdjustments: DbTaxAdjustment[];
  projects: DbProject[];
  projectTypes: DbProjectType[];
  projectBudgets: DbProjectBudget[];
  projectBudgetLines: DbProjectBudgetLine[];
  projectTasks: DbProjectTask[];
  projectCosts: DbProjectCost[];
  projectRevenues: DbProjectRevenue[];
  projectMilestones: DbProjectMilestone[];
  projectWipBalances: DbProjectWipBalance[];
  projectCostAllocations: DbProjectCostAllocation[];
  businessUnits: DbBusinessUnit[];
  managementDimensions: DbManagementDimension[];
  managementBudgets: DbManagementBudget[];
  costAllocationRules: DbCostAllocationRule[];
  costAllocationRuns: DbCostAllocationRun[];
  companyGroups: DbCompanyGroup[];
  companyRelationships: DbCompanyRelationship[];
  companyAccesses: DbCompanyAccess[];
  intercompanyTransactions: DbIntercompanyTransaction[];
  groupChartOfAccounts: DbGroupChartOfAccounts[];
  groupAccountMappings: DbGroupAccountMapping[];
  consolidationSets: DbConsolidationSet[];
  consolidationRuns: DbConsolidationRun[];
  consolidationAdjustments: DbConsolidationAdjustment[];
  eliminationRules: DbEliminationRule[];
  currencyTranslationRates: DbCurrencyTranslationRate[];
  companyProfiles: DbCompanyProfile[];
  uomConversions: DbUomConversion[];
  productAttributes: DbProductAttribute[];
  companyRoleConfigs: DbCompanyRoleConfig[];
  onboardingDrafts: DbOnboardingDraft[];
  accrualEntries: DbAccrualEntry[];
  prepaymentSchedules: DbPrepaymentSchedule[];
  deferredRevenueSchedules: DbDeferredRevenueSchedule[];
  provisions: DbProvision[];
  recurringJournalTemplates: DbRecurringJournalTemplate[];
  yearEndCloses: DbYearEndClose[];
  fxRevaluations: DbFxRevaluation[];
  eclCalculations: DbEclCalculation[];
  badDebtWriteOffs: DbBadDebtWriteOff[];
  employeeExpenseClaims: DbEmployeeExpenseClaim[];
  auditLogs: DbAuditLog[];
}

class RelationalStorageEngine {
  private data: StorageSchema;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.data = this.loadInitialData();
  }

  private loadInitialData(): StorageSchema {
    let saved: string | null = null;
    if (typeof localStorage !== 'undefined') {
      const legacyKeys = [
        'ENTERPRISE_ERP_DB_V5',
        'ENTERPRISE_ERP_DB_V4',
        'ENTERPRISE_ERP_DB_V3',
        'ENTERPRISE_ERP_DB_V2',
        'ENTERPRISE_ERP_DB_V1',
        'ENTERPRISE_ERP_DB',
        'ERP_STORAGE_KEY',
        'ERP_DATABASE',
      ];
      for (const k of legacyKeys) {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      }
      saved = localStorage.getItem(STORAGE_KEY);
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.supplierGroups = parsed.supplierGroups || [];
        parsed.suppliers = parsed.suppliers || [];
        parsed.purchaseRequests = parsed.purchaseRequests || [];
        parsed.rfqs = parsed.rfqs || [];
        parsed.supplierQuotations = parsed.supplierQuotations || [];
        parsed.purchaseOrders = parsed.purchaseOrders || [];
        parsed.goodsReceipts = parsed.goodsReceipts || [];
        parsed.supplierBills = parsed.supplierBills || [];
        parsed.supplierPayments = parsed.supplierPayments || [];
        parsed.supplierCreditNotes = parsed.supplierCreditNotes || [];
        parsed.supplierDebitNotes = parsed.supplierDebitNotes || [];
        parsed.itemCategories = parsed.itemCategories || [];
        parsed.unitsOfMeasure = parsed.unitsOfMeasure || [];
        parsed.items = parsed.items || [];
        parsed.warehouses = parsed.warehouses || [];
        parsed.warehouseLocations = parsed.warehouseLocations || [];
        parsed.stockMovements = parsed.stockMovements || [];
        parsed.stockTransfers = parsed.stockTransfers || [];
        parsed.stockAdjustments = parsed.stockAdjustments || [];
        parsed.stockCounts = parsed.stockCounts || [];
        parsed.salesDeliveries = parsed.salesDeliveries || [];
        parsed.supplierReturns = parsed.supplierReturns || [];
        parsed.batchLots = parsed.batchLots || [];
        parsed.serialNumbers = parsed.serialNumbers || [];
        parsed.bankAccounts = parsed.bankAccounts || [];
        parsed.cashAccounts = parsed.cashAccounts || [];
        parsed.bankTransactions = parsed.bankTransactions || [];
        parsed.bankTransfers = parsed.bankTransfers || [];
        parsed.bankStatements = parsed.bankStatements || [];
        parsed.bankStatementLines = parsed.bankStatementLines || [];
        parsed.bankReconciliations = parsed.bankReconciliations || [];
        parsed.cashCounts = parsed.cashCounts || [];
        parsed.paymentMethods = parsed.paymentMethods || [];
        parsed.cheques = parsed.cheques || [];
        parsed.assetCategories = parsed.assetCategories || [];
        parsed.fixedAssets = parsed.fixedAssets || [];
        parsed.depreciationSchedules = parsed.depreciationSchedules || [];
        parsed.depreciationRuns = parsed.depreciationRuns || [];
        parsed.assetTransfers = parsed.assetTransfers || [];
        parsed.assetImpairments = parsed.assetImpairments || [];
        parsed.assetDisposals = parsed.assetDisposals || [];
        parsed.employees = parsed.employees || [];
        parsed.designations = parsed.designations || [];
        parsed.salaryComponents = parsed.salaryComponents || [];
        parsed.salaryStructures = parsed.salaryStructures || [];
        parsed.attendanceRecords = parsed.attendanceRecords || [];
        parsed.leaveTypes = parsed.leaveTypes || [];
        parsed.leaveBalances = parsed.leaveBalances || [];
        parsed.leaveRequests = parsed.leaveRequests || [];
        parsed.payrollPeriods = parsed.payrollPeriods || [];
        parsed.payrollEntries = parsed.payrollEntries || [];
        parsed.employeeAdvances = parsed.employeeAdvances || [];
        parsed.finalSettlements = parsed.finalSettlements || [];
        parsed.taxJurisdictions = parsed.taxJurisdictions || [...INITIAL_TAX_JURISDICTIONS];
        parsed.taxRegistrations = parsed.taxRegistrations || [...INITIAL_TAX_REGISTRATIONS];
        parsed.taxTypes = parsed.taxTypes || [...INITIAL_TAX_TYPES];
        parsed.taxLedgerEntries = parsed.taxLedgerEntries || [];
        parsed.taxPeriods = parsed.taxPeriods || [];
        parsed.taxReturns = parsed.taxReturns || [];
        parsed.taxAdjustments = parsed.taxAdjustments || [];
        parsed.companyProfiles = parsed.companyProfiles || [];
        parsed.uomConversions = parsed.uomConversions || [];
        parsed.productAttributes = parsed.productAttributes || [];
        parsed.companyRoleConfigs = parsed.companyRoleConfigs || [];
        parsed.onboardingDrafts = parsed.onboardingDrafts || [];
        parsed.accrualEntries = parsed.accrualEntries || [];
        parsed.prepaymentSchedules = parsed.prepaymentSchedules || [];
        parsed.deferredRevenueSchedules = parsed.deferredRevenueSchedules || [];
        parsed.provisions = parsed.provisions || [];
        parsed.recurringJournalTemplates = parsed.recurringJournalTemplates || [];
        parsed.yearEndCloses = parsed.yearEndCloses || [];
        parsed.fxRevaluations = parsed.fxRevaluations || [];
        parsed.eclCalculations = parsed.eclCalculations || [];
        parsed.badDebtWriteOffs = parsed.badDebtWriteOffs || [];
        parsed.employeeExpenseClaims = parsed.employeeExpenseClaims || [];
        if (parsed.users) {
          const superAdmin = parsed.users.find((u: DbUser) => u.isPlatformSuperAdmin);
          if (superAdmin) {
            superAdmin.email = 'admin@mujahid.com';
            superAdmin.username = 'admin@mujahid.com';
            superAdmin.password = 'bahwanmge';
            superAdmin.passwordHash = 'argon2:$bahwanmge$';
          }
        }
        return parsed;
      } catch (e) {
        console.warn('Failed to parse existing ERP database, resetting to seed data.', e);
      }
    }

    // Build fresh seed dataset
    const allModules: DbCompanyModule[] = [];
    for (const comp of INITIAL_COMPANIES) {
      allModules.push(...generateCompanyModuleEntitlements(comp.id, comp.tier));
    }

    const defaultCategories: DbItemCategory[] = [
      { id: 'cat-raw-mat', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'RAW-MAT', name: 'Raw Materials & Components', description: 'Direct manufacturing supplies', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'cat-fin-goods', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'FIN-GOODS', name: 'Finished Merchandise', description: 'Commercial products ready for sale', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'cat-consumables', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'CONSUMABLES', name: 'Operational Consumables', description: 'Internal supplies and packaging', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'cat-spares', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'SPARES', name: 'Maintenance & Spare Parts', description: 'Equipment replacement parts', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
    ];

    const defaultUOMs: DbUnitOfMeasure[] = [
      { id: 'uom-pcs', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'PCS', name: 'Piece / Unit', symbol: 'pcs', category: 'quantity', isBaseUnit: true, conversionFactor: '1.0000', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'uom-box-12', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'BOX-12', name: 'Box of 12', symbol: 'box', category: 'quantity', isBaseUnit: false, baseUnitId: 'uom-pcs', conversionFactor: '12.0000', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'uom-kg', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'KG', name: 'Kilogram', symbol: 'kg', category: 'weight', isBaseUnit: true, conversionFactor: '1.0000', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'uom-gram', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'G', name: 'Gram', symbol: 'g', category: 'weight', isBaseUnit: false, baseUnitId: 'uom-kg', conversionFactor: '0.0010', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'uom-liter', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'LTR', name: 'Liter', symbol: 'L', category: 'volume', isBaseUnit: true, conversionFactor: '1.0000', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'uom-meter', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'MTR', name: 'Meter', symbol: 'm', category: 'length', isBaseUnit: true, conversionFactor: '1.0000', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
    ];

    const defaultWarehouses: DbWarehouse[] = [
      {
        id: 'wh-main-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'WH-MAIN',
        name: 'Central Logistics & Distribution Hub',
        address: 'Building 4, Port Logistics Park, Muscat, Oman',
        managerName: 'Tariq Al-Busaidi',
        isDefault: true,
        isActive: true,
        notes: 'Primary bonded central warehouse',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'wh-sec-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'WH-EAST',
        name: 'Regional Depot East',
        address: 'Sohar Industrial Zone, Sohar, Oman',
        managerName: 'Fatima Al-Hinai',
        isDefault: false,
        isActive: true,
        notes: 'Secondary staging depot',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const defaultLocations: DbWarehouseLocation[] = [
      { id: 'loc-main-a1', companyId: 'c1000000-0000-0000-0000-000000000001', warehouseId: 'wh-main-apex', code: 'A1-R01-B01', name: 'Zone A - Aisle 1 Rack 1 Bin 1', zone: 'Zone A', aisle: 'A1', rack: 'R01', bin: 'B01', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'loc-main-a2', companyId: 'c1000000-0000-0000-0000-000000000001', warehouseId: 'wh-main-apex', code: 'A1-R01-B02', name: 'Zone A - Aisle 1 Rack 1 Bin 2', zone: 'Zone A', aisle: 'A1', rack: 'R01', bin: 'B02', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'loc-east-b1', companyId: 'c1000000-0000-0000-0000-000000000001', warehouseId: 'wh-sec-apex', code: 'EAST-BAY-01', name: 'East Inward Staging Bay', zone: 'Bay 1', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
    ];

    const defaultBankAccounts: DbBankAccount[] = [
      {
        id: 'ba-apex-main-usd',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        accountName: 'Operating Commercial Checking Account',
        bankName: 'Bank Muscat Global Corporate',
        branch: 'Corporate Banking HQ, Muscat',
        accountNumber: '••••••••8819',
        iban: 'OM88BMUS1000293819283819',
        swiftBic: 'BMUSOMRX',
        accountType: 'current',
        currency: 'USD',
        glAccountId: 'acc-1010',
        openingBalance: '0.0000',
        openingBalanceDate: '2026-01-01',
        currentBalance: '0.0000',
        isActive: true,
        isDefault: true,
        notes: 'Primary operating account for payroll, receipts, and vendor disbursements',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const defaultCashAccounts: DbCashAccount[] = [
      {
        id: 'ca-apex-petty-usd',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        accountName: 'Headquarters Petty Cash Drawer',
        cashAccountType: 'petty_cash',
        custodianName: 'Finance Cashier',
        maxLimit: '5000.0000',
        currency: 'USD',
        glAccountId: 'acc-1020',
        openingBalance: '0.0000',
        openingBalanceDate: '2026-01-01',
        currentBalance: '0.0000',
        isActive: true,
        isDefault: true,
        notes: 'Main office petty cash for immediate low-value disbursements',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const defaultPaymentMethods: DbPaymentMethod[] = [
      { id: 'pm-bank-trf', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'BANK_TRF', name: 'Bank Wire / EFT Transfer', type: 'bank_transfer', defaultBankAccountId: 'ba-apex-main-usd', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'pm-cash', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'CASH', name: 'Physical Cash Currency', type: 'cash', defaultBankAccountId: 'ca-apex-petty-usd', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'pm-cheque', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'CHEQUE', name: 'Bank Corporate Cheque', type: 'cheque', defaultBankAccountId: 'ba-apex-main-usd', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'pm-card', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'CARD', name: 'Corporate Debit / Credit Card', type: 'card', defaultBankAccountId: 'ba-apex-main-usd', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
    ];

    const defaultAssetCategories: DbAssetCategory[] = [
      {
        id: 'cat-bld-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'AC-BLD',
        name: 'Buildings & Structural Improvements',
        description: 'Freehold and leasehold commercial buildings, offices, and warehouses',
        assetAccountId: 'acc-1510',
        accumDepAccountId: 'acc-1520',
        depExpenseAccountId: 'acc-6020',
        disposalGainLossAccountId: 'acc-4085',
        defaultUsefulLifeMonths: 360,
        defaultResidualValueRate: '0.1000',
        defaultDepreciationMethod: 'straight_line',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat-veh-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'AC-VEH',
        name: 'Motor Vehicles & Fleet Logistics',
        description: 'Company logistics trucks, delivery vans, and executive cars',
        assetAccountId: 'acc-1510',
        accumDepAccountId: 'acc-1520',
        depExpenseAccountId: 'acc-6020',
        disposalGainLossAccountId: 'acc-4085',
        defaultUsefulLifeMonths: 60,
        defaultResidualValueRate: '0.1500',
        defaultDepreciationMethod: 'straight_line',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat-mach-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'AC-MACH',
        name: 'Plant, Machinery & Heavy Equipment',
        description: 'Industrial manufacturing machinery, packaging lines, and heavy power units',
        assetAccountId: 'acc-1510',
        accumDepAccountId: 'acc-1520',
        depExpenseAccountId: 'acc-6020',
        disposalGainLossAccountId: 'acc-4085',
        defaultUsefulLifeMonths: 120,
        defaultResidualValueRate: '0.0500',
        defaultDepreciationMethod: 'straight_line',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat-it-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'AC-IT',
        name: 'IT, Servers & Computer Hardware',
        description: 'Data center servers, corporate workstations, laptops, and networking switches',
        assetAccountId: 'acc-1510',
        accumDepAccountId: 'acc-1520',
        depExpenseAccountId: 'acc-6020',
        disposalGainLossAccountId: 'acc-4085',
        defaultUsefulLifeMonths: 36,
        defaultResidualValueRate: '0.0000',
        defaultDepreciationMethod: 'straight_line',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'cat-furn-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'AC-FURN',
        name: 'Office Furniture & Commercial Fixtures',
        description: 'Office executive desks, ergonomic chairs, boardrooms, and display partitions',
        assetAccountId: 'acc-1510',
        accumDepAccountId: 'acc-1520',
        depExpenseAccountId: 'acc-6020',
        disposalGainLossAccountId: 'acc-4085',
        defaultUsefulLifeMonths: 84,
        defaultResidualValueRate: '0.0500',
        defaultDepreciationMethod: 'straight_line',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const defaultLeaveTypes: DbLeaveType[] = [
      { id: 'lt-ann-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'ANNUAL', name: 'Annual Paid Vacation', isPaid: true, defaultDaysPerYear: 30, allowNegativeBalance: false, requiresApproval: true, colorCode: '#10b981', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'lt-sick-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'SICK', name: 'Certified Medical Sick Leave', isPaid: true, defaultDaysPerYear: 15, allowNegativeBalance: false, requiresApproval: true, colorCode: '#3b82f6', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'lt-unpaid-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'UNPAID', name: 'Unpaid Leave of Absence', isPaid: false, defaultDaysPerYear: 0, allowNegativeBalance: false, requiresApproval: true, colorCode: '#f59e0b', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'lt-emerg-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'EMERGENCY', name: 'Emergency & Compassionate Leave', isPaid: true, defaultDaysPerYear: 5, allowNegativeBalance: false, requiresApproval: true, colorCode: '#8b5cf6', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
    ];

    const defaultSalaryComponents: DbSalaryComponent[] = [
      { id: 'sc-basic', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'BASIC', name: 'Basic Salary', type: 'earning', calculationMethod: 'fixed_amount', defaultRateOrAmount: '0.0000', isTaxable: true, isStatutory: true, expenseAccountId: 'a-6010', liabilityAccountId: 'a-2300', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'sc-housing', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'HOUSING', name: 'Housing & Accommodation Allowance', type: 'earning', calculationMethod: 'percentage_of_basic', defaultRateOrAmount: '0.2500', isTaxable: true, isStatutory: false, expenseAccountId: 'a-6012', liabilityAccountId: 'a-2300', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'sc-transport', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'TRANSPORT', name: 'Transportation & Travel Allowance', type: 'earning', calculationMethod: 'fixed_amount', defaultRateOrAmount: '150.0000', isTaxable: true, isStatutory: false, expenseAccountId: 'a-6012', liabilityAccountId: 'a-2300', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'sc-overtime', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'OVERTIME', name: 'Overtime Work Hours Pay', type: 'earning', calculationMethod: 'hourly_rate', defaultRateOrAmount: '1.5000', isTaxable: true, isStatutory: false, expenseAccountId: 'a-6015', liabilityAccountId: 'a-2300', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'sc-tax', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'TAX_DEDUCTION', name: 'Statutory Income Tax Withholding', type: 'deduction', calculationMethod: 'percentage_of_gross', defaultRateOrAmount: '0.0000', isTaxable: false, isStatutory: true, expenseAccountId: 'a-6010', liabilityAccountId: 'a-2040', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'sc-advance', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'ADVANCE_DEDUCTION', name: 'Employee Advance & Loan Recovery', type: 'deduction', calculationMethod: 'fixed_amount', defaultRateOrAmount: '0.0000', isTaxable: false, isStatutory: false, expenseAccountId: 'a-6010', liabilityAccountId: 'a-1250', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
    ];

    const defaultSalaryStructures: DbSalaryStructure[] = [
      {
        id: 'ss-std-apex',
        companyId: 'c1000000-0000-0000-0000-000000000001',
        code: 'STD-PROFESSIONAL',
        name: 'Standard Corporate & Professional Grade Structure',
        description: 'Default structure with Basic + 25% Housing + $150 Transport + Overtime support',
        currency: 'USD',
        isDefault: true,
        isActive: true,
        components: [
          { componentId: 'sc-basic', componentCode: 'BASIC', componentName: 'Basic Salary', type: 'earning', calculationMethod: 'fixed_amount', rateOrAmount: '0.0000', expenseAccountId: 'a-6010', liabilityAccountId: 'a-2300' },
          { componentId: 'sc-housing', componentCode: 'HOUSING', componentName: 'Housing Allowance', type: 'earning', calculationMethod: 'percentage_of_basic', rateOrAmount: '0.2500', expenseAccountId: 'a-6012', liabilityAccountId: 'a-2300' },
          { componentId: 'sc-transport', componentCode: 'TRANSPORT', componentName: 'Transport Allowance', type: 'earning', calculationMethod: 'fixed_amount', rateOrAmount: '150.0000', expenseAccountId: 'a-6012', liabilityAccountId: 'a-2300' },
          { componentId: 'sc-overtime', componentCode: 'OVERTIME', componentName: 'Overtime Pay', type: 'earning', calculationMethod: 'hourly_rate', rateOrAmount: '1.5000', expenseAccountId: 'a-6015', liabilityAccountId: 'a-2300' },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const initial: StorageSchema = {
      companies: [...INITIAL_COMPANIES],
      branches: [...INITIAL_BRANCHES],
      departments: [...INITIAL_DEPARTMENTS],
      costCenters: [...INITIAL_COST_CENTERS],
      fiscalYears: [...INITIAL_FISCAL_YEARS],
      accountingPeriods: [...INITIAL_ACCOUNTING_PERIODS],
      users: [...INITIAL_USERS],
      roles: [...INITIAL_ROLES],
      memberships: [...INITIAL_MEMBERSHIPS],
      companyModules: allModules,
      accountGroups: [...INITIAL_ACCOUNT_GROUPS],
      accounts: [...INITIAL_ACCOUNTS],
      taxCodes: [...INITIAL_TAX_CODES],
      accountingRules: [...INITIAL_ACCOUNTING_RULES],
      journalEntries: [...INITIAL_JOURNAL_ENTRIES],
      journalLines: [...INITIAL_JOURNAL_LINES],
      subLedgerEntries: [],
      customerGroups: [
        { id: 'cg-corp-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'CORP', name: 'Corporate Enterprise Clients', defaultPaymentTermsDays: 30, description: 'Net 30 Commercial Accounts', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'cg-ret-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'RETAIL', name: 'Direct Commercial Retail', defaultPaymentTermsDays: 0, description: 'Immediate Due Invoices', createdAt: '2026-01-01T00:00:00Z' },
      ],
      customers: [],
      salesQuotations: [],
      salesOrders: [],
      salesInvoices: [],
      customerPayments: [],
      salesCreditNotes: [],
      supplierGroups: [
        { id: 'sg-local-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'LOCAL', name: 'Local Domestic Vendors', defaultPaymentTermsDays: 30, description: 'Standard Domestic Suppliers', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'sg-intl-apex', companyId: 'c1000000-0000-0000-0000-000000000001', code: 'INTL', name: 'International Supply Chain', defaultPaymentTermsDays: 60, description: 'Global Logistics & Import Vendors', createdAt: '2026-01-01T00:00:00Z' },
      ],
      suppliers: [],
      purchaseRequests: [],
      rfqs: [],
      supplierQuotations: [],
      purchaseOrders: [],
      goodsReceipts: [],
      supplierBills: [],
      supplierPayments: [],
      supplierCreditNotes: [],
      supplierDebitNotes: [],
      itemCategories: defaultCategories,
      unitsOfMeasure: defaultUOMs,
      items: [],
      warehouses: defaultWarehouses,
      warehouseLocations: defaultLocations,
      stockMovements: [],
      stockTransfers: [],
      stockAdjustments: [],
      stockCounts: [],
      salesDeliveries: [],
      supplierReturns: [],
      batchLots: [],
      serialNumbers: [],
      bankAccounts: defaultBankAccounts,
      cashAccounts: defaultCashAccounts,
      bankTransactions: [],
      bankTransfers: [],
      bankStatements: [],
      bankStatementLines: [],
      bankReconciliations: [],
      cashCounts: [],
      paymentMethods: defaultPaymentMethods,
      cheques: [],
      assetCategories: defaultAssetCategories,
      fixedAssets: [],
      depreciationSchedules: [],
      depreciationRuns: [],
      assetTransfers: [],
      assetImpairments: [],
      assetDisposals: [],
      employees: [],
      designations: [],
      salaryComponents: defaultSalaryComponents,
      salaryStructures: defaultSalaryStructures,
      attendanceRecords: [],
      leaveTypes: defaultLeaveTypes,
      leaveBalances: [],
      leaveRequests: [],
      payrollPeriods: [],
      payrollEntries: [],
      employeeAdvances: [],
      finalSettlements: [],
      taxJurisdictions: [...INITIAL_TAX_JURISDICTIONS],
      taxRegistrations: [...INITIAL_TAX_REGISTRATIONS],
      taxTypes: [...INITIAL_TAX_TYPES],
      taxLedgerEntries: [],
      taxPeriods: [],
      taxReturns: [],
      taxAdjustments: [],
      projects: [],
      projectTypes: [...INITIAL_PROJECT_TYPES],
      projectBudgets: [],
      projectBudgetLines: [],
      projectTasks: [],
      projectCosts: [],
      projectRevenues: [],
      projectMilestones: [],
      projectWipBalances: [],
      projectCostAllocations: [],
      businessUnits: [],
      managementDimensions: [],
      managementBudgets: [],
      costAllocationRules: [],
      costAllocationRuns: [],
      companyGroups: [],
      companyRelationships: [],
      companyAccesses: [],
      intercompanyTransactions: [],
      groupChartOfAccounts: [],
      groupAccountMappings: [],
      consolidationSets: [],
      consolidationRuns: [],
      consolidationAdjustments: [],
      eliminationRules: [],
      currencyTranslationRates: [],
      companyProfiles: [],
      uomConversions: [],
      productAttributes: [],
      companyRoleConfigs: [],
      onboardingDrafts: [],
      accrualEntries: [],
      prepaymentSchedules: [],
      deferredRevenueSchedules: [],
      provisions: [],
      recurringJournalTemplates: [],
      yearEndCloses: [],
      fxRevaluations: [],
      eclCalculations: [],
      badDebtWriteOffs: [],
      employeeExpenseClaims: [],
      auditLogs: [...INITIAL_AUDIT_LOGS],
    };

    this.saveData(initial);
    return initial;
  }

  private saveData(data: StorageSchema): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save ERP database state', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  public resetDatabase(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.data = this.loadInitialData();
    this.notifyListeners();
  }

  // --------------------------------------------------------------------------
  // Multi-Tenant Isolation Interceptor
  // --------------------------------------------------------------------------
  public assertTenantOwnership(recordCompanyId: string, ctx: TenantContext): void {
    if (ctx.isPlatformAdmin) return;
    if (recordCompanyId !== ctx.companyId) {
      this.logAudit({
        companyId: ctx.companyId,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        action: 'SECURITY_ALERT_CROSS_TENANT_VIOLATION',
        entityType: 'TenantSecurityGuard',
        entityId: recordCompanyId,
        details: `Blocked attempt to access resource of company '${recordCompanyId}' from context '${ctx.companyId}'`,
      });
      throw new TenantViolationError(`Access to company '${recordCompanyId}' is denied for active context '${ctx.companyId}'`);
    }

    const company = this.data.companies.find((c) => c.id === ctx.companyId);
    if (company && (company.status === 'archived' || company.status === 'suspended' || company.status === 'inactive')) {
      throw new TenantViolationError(`Company '${company.name}' is currently ${company.status.toUpperCase()} and cannot perform operational transactions.`);
    }
  }

  // --------------------------------------------------------------------------
  // Audit Trail Logger
  // --------------------------------------------------------------------------
  public logAudit(entry: Omit<DbAuditLog, 'id' | 'createdAt' | 'ipAddress' | 'userAgent'>): DbAuditLog {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Enterprise ERP Server/Node';
    const log: DbAuditLog = {
      ...entry,
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      ipAddress: '127.0.0.1 (Local Session)',
      userAgent,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    this.saveData(this.data);
    return log;
  }

  public getAuditLogs(ctx?: TenantContext): DbAuditLog[] {
    if (!ctx || ctx.isPlatformAdmin) {
      return [...this.data.auditLogs];
    }
    return this.data.auditLogs.filter((l) => l.companyId === ctx.companyId);
  }

  public getMemberships(companyId?: string, _ctx?: TenantContext): DbCompanyMembership[] {
    return this.data.memberships.filter((m) => !companyId || m.companyId === companyId);
  }

  // --------------------------------------------------------------------------
  // Companies & Platform Admin
  // --------------------------------------------------------------------------
  public getCompanies(ctx?: TenantContext): DbCompany[] {
    if (!ctx || ctx.isPlatformAdmin) {
      return [...this.data.companies];
    }
    const userCompanyIds = new Set(
      this.data.memberships.filter((m) => m.userId === ctx.userId).map((m) => m.companyId)
    );
    return this.data.companies.filter((c) => userCompanyIds.has(c.id));
  }

  public getCompanyById(companyId: string, ctx?: TenantContext): DbCompany | undefined {
    if (ctx) this.assertTenantOwnership(companyId, ctx);
    return this.data.companies.find((c) => c.id === companyId);
  }

  public createCompany(
    payload: Omit<DbCompany, 'id' | 'createdAt' | 'updatedAt'>,
    adminUserId: string,
    ctx: TenantContext
  ): DbCompany {
    const newCompanyId = 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const newCompany: DbCompany = {
      ...payload,
      id: newCompanyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.companies.push(newCompany);

    const hqBranch: DbBranch = {
      id: 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: newCompanyId,
      code: 'HQ',
      name: `${payload.name} Headquarters`,
      isHeadquarters: true,
      countryCode: payload.countryCode,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.data.branches.push(hqBranch);

    const currentYear = new Date().getFullYear();
    const fyId = `fy-${currentYear}-${newCompanyId.slice(0, 4)}`;
    const fiscalYear: DbFiscalYear = {
      id: fyId,
      companyId: newCompanyId,
      name: `FY-${currentYear}`,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      isClosed: false,
      createdAt: new Date().toISOString(),
    };
    this.data.fiscalYears.push(fiscalYear);

    for (let i = 1; i <= 12; i++) {
      const monthStr = i.toString().padStart(2, '0');
      const lastDay = new Date(currentYear, i, 0).getDate();
      this.data.accountingPeriods.push({
        id: `p-${newCompanyId.slice(0, 4)}-${monthStr}`,
        companyId: newCompanyId,
        fiscalYearId: fyId,
        periodNumber: i,
        name: `Period ${i} (${currentYear}-${monthStr})`,
        startDate: `${currentYear}-${monthStr}-01`,
        endDate: `${currentYear}-${monthStr}-${lastDay}`,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
    }

    for (const g of INITIAL_ACCOUNT_GROUPS) {
      this.data.accountGroups.push({
        ...g,
        id: `g-${newCompanyId.slice(0, 4)}-${g.code}`,
        companyId: newCompanyId,
      });
    }

    for (const acc of INITIAL_ACCOUNTS) {
      this.data.accounts.push({
        ...acc,
        id: `a-${newCompanyId.slice(0, 4)}-${acc.code}`,
        companyId: newCompanyId,
        groupId: `g-${newCompanyId.slice(0, 4)}-${acc.code.slice(0, 1)}000`,
        currency: payload.baseCurrency,
      });
    }

    const entitlements = generateCompanyModuleEntitlements(newCompanyId, payload.tier);
    this.data.companyModules.push(...entitlements);

    this.data.memberships.push({
      id: 'm-' + Date.now().toString(36),
      companyId: newCompanyId,
      userId: adminUserId,
      roleId: 'role-cfo',
      branchId: hqBranch.id,
      isPrimaryCompany: true,
      createdAt: new Date().toISOString(),
    });

    this.logAudit({
      companyId: newCompanyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'PROVISION_COMPANY',
      entityType: 'Company',
      entityId: newCompanyId,
      details: `Provisioned company '${payload.name}' under Tier '${payload.tier}' with Base Currency '${payload.baseCurrency}'`,
      newState: newCompany as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return newCompany;
  }

  public upgradeCompanyTier(companyId: string, newTier: CompanyTier, ctx: TenantContext): DbCompany {
    return this.updateCompanyTier(companyId, newTier, ctx);
  }

  public updateCompanyTier(companyId: string, newTier: CompanyTier, ctx: TenantContext): DbCompany {
    this.assertTenantOwnership(companyId, ctx);
    const company = this.data.companies.find((c) => c.id === companyId);
    if (!company) throw new Error(`Company '${companyId}' not found`);

    const prevTier = company.tier;
    company.tier = newTier;
    company.updatedAt = new Date().toISOString();

    const standardEntitlements = generateCompanyModuleEntitlements(companyId, newTier);
    for (const std of standardEntitlements) {
      const existing = this.data.companyModules.find(
        (m) => m.companyId === companyId && m.moduleKey === std.moduleKey
      );
      if (existing) {
        existing.isEnabled = std.isEnabled;
      } else {
        this.data.companyModules.push(std);
      }
    }

    this.logAudit({
      companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPGRADE_COMPANY_TIER',
      entityType: 'Company',
      entityId: companyId,
      details: `Changed company tier from '${prevTier}' to '${newTier}'. Capabilities updated seamlessly in-place.`,
      previousState: { tier: prevTier },
      newState: { tier: newTier },
    });

    this.saveData(this.data);
    return company;
  }

  // --------------------------------------------------------------------------
  // Module Entitlements
  // --------------------------------------------------------------------------
  public getCompanyModules(companyId: string, ctx: TenantContext): DbCompanyModule[] {
    this.assertTenantOwnership(companyId, ctx);
    return this.data.companyModules.filter((m) => m.companyId === companyId);
  }

  public toggleCompanyModule(
    companyId: string, 
    moduleKey: string, 
    isEnabled: boolean, 
    ctx: TenantContext
  ): DbCompanyModule {
    this.assertTenantOwnership(companyId, ctx);
    let mod = this.data.companyModules.find((m) => m.companyId === companyId && m.moduleKey === moduleKey);
    if (!mod) {
      mod = {
        id: `cm-${companyId.slice(0, 4)}-${moduleKey}`,
        companyId,
        moduleKey,
        isEnabled,
        enabledAt: new Date().toISOString(),
      };
      this.data.companyModules.push(mod);
    } else {
      mod.isEnabled = isEnabled;
    }

    this.logAudit({
      companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: isEnabled ? 'ENABLE_MODULE' : 'DISABLE_MODULE',
      entityType: 'CompanyModule',
      entityId: `${companyId}:${moduleKey}`,
      details: `${isEnabled ? 'Enabled' : 'Disabled'} ERP module '${moduleKey}' for company '${companyId}'`,
      newState: { moduleKey, isEnabled },
    });

    this.saveData(this.data);
    return mod;
  }

  // --------------------------------------------------------------------------
  // Organization Structure
  // --------------------------------------------------------------------------
  public getBranches(ctx: TenantContext): DbBranch[] {
    return this.data.branches.filter((b) => b.companyId === ctx.companyId);
  }

  public createBranch(payload: Omit<DbBranch, 'id' | 'createdAt' | 'companyId'>, ctx: TenantContext): DbBranch {
    const branch: DbBranch = {
      ...payload,
      id: 'b-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.branches.push(branch);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_BRANCH',
      entityType: 'Branch',
      entityId: branch.id,
      details: `Created branch '${branch.name}' (${branch.code})`,
      newState: branch as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return branch;
  }

  public getDepartments(ctx: TenantContext): DbDepartment[] {
    return this.data.departments.filter((d) => d.companyId === ctx.companyId);
  }

  public getDepartmentById(id: string, ctx: TenantContext): DbDepartment | undefined {
    const dept = this.data.departments.find((d) => d.id === id);
    if (dept) this.assertTenantOwnership(dept.companyId, ctx);
    return dept;
  }

  public createDepartment(
    payload: Omit<DbDepartment, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbDepartment {
    const dept: DbDepartment = {
      ...payload,
      id: 'dept-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.departments.push(dept);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: dept.id,
      details: `Created department '${dept.name}' (${dept.code})`,
      newState: dept as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return dept;
  }

  public updateDepartment(
    id: string,
    payload: Partial<Omit<DbDepartment, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbDepartment {
    const dept = this.data.departments.find((d) => d.id === id);
    if (!dept) throw new Error(`Department '${id}' not found`);
    this.assertTenantOwnership(dept.companyId, ctx);
    Object.assign(dept, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: dept.id,
      details: `Updated department '${dept.name}'`,
      newState: dept as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return dept;
  }

  public getCostCenters(ctx: TenantContext): DbCostCenter[] {
    return this.data.costCenters.filter((cc) => cc.companyId === ctx.companyId);
  }

  public getCostCenterById(id: string, ctx: TenantContext): DbCostCenter | undefined {
    const cc = this.data.costCenters.find((c) => c.id === id);
    if (cc) this.assertTenantOwnership(cc.companyId, ctx);
    return cc;
  }

  public createCostCenter(
    payload: Omit<DbCostCenter, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCostCenter {
    const cc: DbCostCenter = {
      ...payload,
      id: 'cc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.costCenters.push(cc);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_COST_CENTER',
      entityType: 'CostCenter',
      entityId: cc.id,
      details: `Created cost center '${cc.name}' (${cc.code})`,
      newState: cc as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return cc;
  }

  public updateCostCenter(
    id: string,
    payload: Partial<Omit<DbCostCenter, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbCostCenter {
    const cc = this.data.costCenters.find((c) => c.id === id);
    if (!cc) throw new Error(`Cost center '${id}' not found`);
    this.assertTenantOwnership(cc.companyId, ctx);
    Object.assign(cc, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_COST_CENTER',
      entityType: 'CostCenter',
      entityId: cc.id,
      details: `Updated cost center '${cc.name}'`,
      newState: cc as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return cc;
  }

  // --------------------------------------------------------------------------
  // Business Units & Management Dimensions
  // --------------------------------------------------------------------------
  public getBusinessUnits(ctx: TenantContext): DbBusinessUnit[] {
    return this.data.businessUnits.filter((bu) => bu.companyId === ctx.companyId);
  }

  public getBusinessUnitById(id: string, ctx: TenantContext): DbBusinessUnit | undefined {
    const bu = this.data.businessUnits.find((b) => b.id === id);
    if (bu) this.assertTenantOwnership(bu.companyId, ctx);
    return bu;
  }

  public createBusinessUnit(
    payload: Omit<DbBusinessUnit, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbBusinessUnit {
    const bu: DbBusinessUnit = {
      ...payload,
      id: 'bu-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.businessUnits.push(bu);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_BUSINESS_UNIT',
      entityType: 'BusinessUnit',
      entityId: bu.id,
      details: `Created business unit '${bu.name}' (${bu.code})`,
      newState: bu as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return bu;
  }

  public updateBusinessUnit(
    id: string,
    payload: Partial<Omit<DbBusinessUnit, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbBusinessUnit {
    const bu = this.data.businessUnits.find((b) => b.id === id);
    if (!bu) throw new Error(`Business unit '${id}' not found`);
    this.assertTenantOwnership(bu.companyId, ctx);
    Object.assign(bu, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_BUSINESS_UNIT',
      entityType: 'BusinessUnit',
      entityId: bu.id,
      details: `Updated business unit '${bu.name}'`,
      newState: bu as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return bu;
  }

  public getManagementDimensions(ctx: TenantContext): DbManagementDimension[] {
    return this.data.managementDimensions.filter((md) => md.companyId === ctx.companyId);
  }

  public createManagementDimension(
    payload: Omit<DbManagementDimension, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbManagementDimension {
    const md: DbManagementDimension = {
      ...payload,
      id: 'dim-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.managementDimensions.push(md);
    this.saveData(this.data);
    return md;
  }

  public updateManagementDimension(
    id: string,
    payload: Partial<Omit<DbManagementDimension, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbManagementDimension {
    const md = this.data.managementDimensions.find((d) => d.id === id);
    if (!md) throw new Error(`Management dimension '${id}' not found`);
    this.assertTenantOwnership(md.companyId, ctx);
    Object.assign(md, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return md;
  }

  // --------------------------------------------------------------------------
  // Management Budgets
  // --------------------------------------------------------------------------
  public getManagementBudgets(ctx: TenantContext): DbManagementBudget[] {
    return this.data.managementBudgets.filter((b) => b.companyId === ctx.companyId);
  }

  public getManagementBudgetById(id: string, ctx: TenantContext): DbManagementBudget | undefined {
    const b = this.data.managementBudgets.find((bg) => bg.id === id);
    if (b) this.assertTenantOwnership(b.companyId, ctx);
    return b;
  }

  public createManagementBudget(
    payload: Omit<DbManagementBudget, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbManagementBudget {
    const budget: DbManagementBudget = {
      ...payload,
      id: 'mbg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.managementBudgets.push(budget);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_MANAGEMENT_BUDGET',
      entityType: 'ManagementBudget',
      entityId: budget.id,
      details: `Created management budget '${budget.budgetName}' (${budget.code}) v${budget.version}`,
      newState: budget as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return budget;
  }

  public updateManagementBudget(
    id: string,
    payload: Partial<Omit<DbManagementBudget, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbManagementBudget {
    const budget = this.data.managementBudgets.find((b) => b.id === id);
    if (!budget) throw new Error(`Management budget '${id}' not found`);
    this.assertTenantOwnership(budget.companyId, ctx);
    Object.assign(budget, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_MANAGEMENT_BUDGET',
      entityType: 'ManagementBudget',
      entityId: budget.id,
      details: `Updated management budget '${budget.budgetName}' (status: ${budget.status})`,
      newState: budget as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return budget;
  }

  // --------------------------------------------------------------------------
  // Cost Allocation Rules & Runs
  // --------------------------------------------------------------------------
  public getCostAllocationRules(ctx: TenantContext): DbCostAllocationRule[] {
    return this.data.costAllocationRules.filter((r) => r.companyId === ctx.companyId);
  }

  public getCostAllocationRuleById(id: string, ctx: TenantContext): DbCostAllocationRule | undefined {
    const r = this.data.costAllocationRules.find((rule) => rule.id === id);
    if (r) this.assertTenantOwnership(r.companyId, ctx);
    return r;
  }

  public createCostAllocationRule(
    payload: Omit<DbCostAllocationRule, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCostAllocationRule {
    const rule: DbCostAllocationRule = {
      ...payload,
      id: 'car-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.costAllocationRules.push(rule);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_ALLOCATION_RULE',
      entityType: 'CostAllocationRule',
      entityId: rule.id,
      details: `Created cost allocation rule '${rule.name}' (${rule.code})`,
      newState: rule as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return rule;
  }

  public updateCostAllocationRule(
    id: string,
    payload: Partial<Omit<DbCostAllocationRule, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbCostAllocationRule {
    const rule = this.data.costAllocationRules.find((r) => r.id === id);
    if (!rule) throw new Error(`Cost allocation rule '${id}' not found`);
    this.assertTenantOwnership(rule.companyId, ctx);
    Object.assign(rule, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return rule;
  }

  public getCostAllocationRuns(ctx: TenantContext): DbCostAllocationRun[] {
    return this.data.costAllocationRuns.filter((r) => r.companyId === ctx.companyId);
  }

  public getCostAllocationRunById(id: string, ctx: TenantContext): DbCostAllocationRun | undefined {
    const r = this.data.costAllocationRuns.find((run) => run.id === id);
    if (r) this.assertTenantOwnership(r.companyId, ctx);
    return r;
  }

  public createCostAllocationRun(
    payload: Omit<DbCostAllocationRun, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCostAllocationRun {
    const run: DbCostAllocationRun = {
      ...payload,
      id: 'crun-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.costAllocationRuns.push(run);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_ALLOCATION_RUN',
      entityType: 'CostAllocationRun',
      entityId: run.id,
      details: `Created cost allocation run '${run.runNumber}' for $${run.totalAllocatedAmount}`,
      newState: run as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return run;
  }

  public updateCostAllocationRun(
    id: string,
    payload: Partial<Omit<DbCostAllocationRun, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbCostAllocationRun {
    const run = this.data.costAllocationRuns.find((r) => r.id === id);
    if (!run) throw new Error(`Cost allocation run '${id}' not found`);
    this.assertTenantOwnership(run.companyId, ctx);
    Object.assign(run, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return run;
  }

  // --------------------------------------------------------------------------
  // Phase 14: Multi-Company, Groups & Relationships
  // --------------------------------------------------------------------------
  public getCompanyGroups(): DbCompanyGroup[] {
    return [...this.data.companyGroups];
  }

  public getCompanyGroupById(id: string): DbCompanyGroup | undefined {
    return this.data.companyGroups.find((g) => g.id === id);
  }

  public createCompanyGroup(
    payload: Omit<DbCompanyGroup, 'id' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCompanyGroup {
    const group: DbCompanyGroup = {
      ...payload,
      id: 'grp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.companyGroups.push(group);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_COMPANY_GROUP',
      entityType: 'CompanyGroup',
      entityId: group.id,
      details: `Created corporate group '${group.name}' (${group.code})`,
      newState: group as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return group;
  }

  public updateCompanyGroup(
    id: string,
    payload: Partial<Omit<DbCompanyGroup, 'id' | 'createdAt'>>,
    ctx: TenantContext
  ): DbCompanyGroup {
    const group = this.data.companyGroups.find((g) => g.id === id);
    if (!group) throw new Error(`Company group '${id}' not found`);
    Object.assign(group, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_COMPANY_GROUP',
      entityType: 'CompanyGroup',
      entityId: group.id,
      details: `Updated corporate group '${group.name}'`,
      newState: group as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return group;
  }

  public getCompanyRelationships(groupId?: string): DbCompanyRelationship[] {
    if (groupId) {
      return this.data.companyRelationships.filter((r) => r.groupId === groupId);
    }
    return [...this.data.companyRelationships];
  }

  public getCompanyRelationshipById(id: string): DbCompanyRelationship | undefined {
    return this.data.companyRelationships.find((r) => r.id === id);
  }

  public createCompanyRelationship(
    payload: Omit<DbCompanyRelationship, 'id' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCompanyRelationship {
    const rel: DbCompanyRelationship = {
      ...payload,
      id: 'rel-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.companyRelationships.push(rel);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_COMPANY_RELATIONSHIP',
      entityType: 'CompanyRelationship',
      entityId: rel.id,
      details: `Configured relationship ${rel.relationshipType} (${rel.ownershipPercentage}%) between ${rel.parentCompanyId} and ${rel.childCompanyId}`,
      newState: rel as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return rel;
  }

  public updateCompanyRelationship(
    id: string,
    payload: Partial<Omit<DbCompanyRelationship, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbCompanyRelationship {
    const rel = this.data.companyRelationships.find((r) => r.id === id);
    if (!rel) throw new Error(`Company relationship '${id}' not found`);
    Object.assign(rel, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return rel;
  }

  public getCompanyAccesses(userId?: string): DbCompanyAccess[] {
    if (userId) {
      return this.data.companyAccesses.filter((a) => a.userId === userId);
    }
    return [...this.data.companyAccesses];
  }

  public createCompanyAccess(
    payload: Omit<DbCompanyAccess, 'id' | 'createdAt' | 'updatedAt'>,
    _ctx?: TenantContext
  ): DbCompanyAccess {
    const access: DbCompanyAccess = {
      ...payload,
      id: 'cacc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.companyAccesses.push(access);
    this.saveData(this.data);
    return access;
  }

  public updateCompanyAccess(
    id: string,
    payload: Partial<Omit<DbCompanyAccess, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbCompanyAccess {
    const access = this.data.companyAccesses.find((a) => a.id === id);
    if (!access) throw new Error(`Company access '${id}' not found`);
    Object.assign(access, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return access;
  }

  // --------------------------------------------------------------------------
  // Intercompany Transactions
  // --------------------------------------------------------------------------
  public getIntercompanyTransactions(ctx?: TenantContext): DbIntercompanyTransaction[] {
    if (ctx && !ctx.isPlatformAdmin) {
      return this.data.intercompanyTransactions.filter(
        (tx) => tx.sourceCompanyId === ctx.companyId || tx.targetCompanyId === ctx.companyId
      );
    }
    return [...this.data.intercompanyTransactions];
  }

  public getIntercompanyTransactionById(id: string, ctx?: TenantContext): DbIntercompanyTransaction | undefined {
    const tx = this.data.intercompanyTransactions.find((t) => t.id === id);
    if (tx && ctx && !ctx.isPlatformAdmin) {
      if (tx.sourceCompanyId !== ctx.companyId && tx.targetCompanyId !== ctx.companyId) {
        throw new TenantViolationError('intercompany_transaction');
      }
    }
    return tx;
  }

  public createIntercompanyTransaction(
    payload: Omit<DbIntercompanyTransaction, 'id' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbIntercompanyTransaction {
    const tx: DbIntercompanyTransaction = {
      ...payload,
      id: 'ictx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.intercompanyTransactions.push(tx);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_INTERCOMPANY_TRANSACTION',
      entityType: 'IntercompanyTransaction',
      entityId: tx.id,
      details: `Created intercompany transaction '${tx.transactionNumber}' for ${tx.amount} ${tx.currency}`,
      newState: tx as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return tx;
  }

  public updateIntercompanyTransaction(
    id: string,
    payload: Partial<Omit<DbIntercompanyTransaction, 'id' | 'createdAt'>>,
    ctx: TenantContext
  ): DbIntercompanyTransaction {
    const tx = this.data.intercompanyTransactions.find((t) => t.id === id);
    if (!tx) throw new Error(`Intercompany transaction '${id}' not found`);
    if (!ctx.isPlatformAdmin && tx.sourceCompanyId !== ctx.companyId && tx.targetCompanyId !== ctx.companyId) {
      throw new TenantViolationError('intercompany_transaction');
    }
    Object.assign(tx, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return tx;
  }

  // --------------------------------------------------------------------------
  // Group Chart of Accounts & Mappings
  // --------------------------------------------------------------------------
  public getGroupChartOfAccounts(groupId?: string): DbGroupChartOfAccounts[] {
    if (groupId) {
      return this.data.groupChartOfAccounts.filter((a) => a.groupId === groupId);
    }
    return [...this.data.groupChartOfAccounts];
  }

  public createGroupAccount(
    payload: Omit<DbGroupChartOfAccounts, 'id' | 'createdAt' | 'updatedAt'>,
    _ctx?: TenantContext
  ): DbGroupChartOfAccounts {
    const acc: DbGroupChartOfAccounts = {
      ...payload,
      id: 'gacc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.groupChartOfAccounts.push(acc);
    this.saveData(this.data);
    return acc;
  }

  public updateGroupAccount(
    id: string,
    payload: Partial<Omit<DbGroupChartOfAccounts, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbGroupChartOfAccounts {
    const acc = this.data.groupChartOfAccounts.find((a) => a.id === id);
    if (!acc) throw new Error(`Group account '${id}' not found`);
    Object.assign(acc, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return acc;
  }

  public getGroupAccountMappings(groupId?: string, companyId?: string): DbGroupAccountMapping[] {
    return this.data.groupAccountMappings.filter(
      (m) => (!groupId || m.groupId === groupId) && (!companyId || m.companyId === companyId)
    );
  }

  public createGroupAccountMapping(
    payload: Omit<DbGroupAccountMapping, 'id' | 'createdAt' | 'updatedAt'>,
    _ctx?: TenantContext
  ): DbGroupAccountMapping {
    const mapping: DbGroupAccountMapping = {
      ...payload,
      id: 'gmap-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.groupAccountMappings.push(mapping);
    this.saveData(this.data);
    return mapping;
  }

  public updateGroupAccountMapping(
    id: string,
    payload: Partial<Omit<DbGroupAccountMapping, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbGroupAccountMapping {
    const mapping = this.data.groupAccountMappings.find((m) => m.id === id);
    if (!mapping) throw new Error(`Group account mapping '${id}' not found`);
    Object.assign(mapping, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return mapping;
  }

  // --------------------------------------------------------------------------
  // Consolidation Sets, Runs & Adjustments
  // --------------------------------------------------------------------------
  public getConsolidationSets(groupId?: string): DbConsolidationSet[] {
    if (groupId) {
      return this.data.consolidationSets.filter((s) => s.groupId === groupId);
    }
    return [...this.data.consolidationSets];
  }

  public getConsolidationSetById(id: string): DbConsolidationSet | undefined {
    return this.data.consolidationSets.find((s) => s.id === id);
  }

  public createConsolidationSet(
    payload: Omit<DbConsolidationSet, 'id' | 'createdAt' | 'updatedAt'>,
    _ctx?: TenantContext
  ): DbConsolidationSet {
    const set: DbConsolidationSet = {
      ...payload,
      id: 'cset-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.consolidationSets.push(set);
    this.saveData(this.data);
    return set;
  }

  public updateConsolidationSet(
    id: string,
    payload: Partial<Omit<DbConsolidationSet, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbConsolidationSet {
    const set = this.data.consolidationSets.find((s) => s.id === id);
    if (!set) throw new Error(`Consolidation set '${id}' not found`);
    Object.assign(set, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return set;
  }

  public getConsolidationRuns(consolidationSetId?: string): DbConsolidationRun[] {
    if (consolidationSetId) {
      return this.data.consolidationRuns.filter((r) => r.consolidationSetId === consolidationSetId);
    }
    return [...this.data.consolidationRuns];
  }

  public getConsolidationRunById(id: string): DbConsolidationRun | undefined {
    return this.data.consolidationRuns.find((r) => r.id === id);
  }

  public createConsolidationRun(
    payload: Omit<DbConsolidationRun, 'id' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbConsolidationRun {
    const run: DbConsolidationRun = {
      ...payload,
      id: 'crun-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.consolidationRuns.push(run);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_CONSOLIDATION_RUN',
      entityType: 'ConsolidationRun',
      entityId: run.id,
      details: `Generated consolidation run for period ${run.startDate} to ${run.endDate}`,
      newState: run as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return run;
  }

  public updateConsolidationRun(
    id: string,
    payload: Partial<Omit<DbConsolidationRun, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbConsolidationRun {
    const run = this.data.consolidationRuns.find((r) => r.id === id);
    if (!run) throw new Error(`Consolidation run '${id}' not found`);
    Object.assign(run, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return run;
  }

  public getConsolidationAdjustments(consolidationRunId?: string): DbConsolidationAdjustment[] {
    if (consolidationRunId) {
      return this.data.consolidationAdjustments.filter((a) => a.consolidationRunId === consolidationRunId);
    }
    return [...this.data.consolidationAdjustments];
  }

  public getConsolidationAdjustmentById(id: string): DbConsolidationAdjustment | undefined {
    return this.data.consolidationAdjustments.find((a) => a.id === id);
  }

  public createConsolidationAdjustment(
    payload: Omit<DbConsolidationAdjustment, 'id' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbConsolidationAdjustment {
    const adj: DbConsolidationAdjustment = {
      ...payload,
      id: 'cadj-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.consolidationAdjustments.push(adj);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_CONSOLIDATION_ADJUSTMENT',
      entityType: 'ConsolidationAdjustment',
      entityId: adj.id,
      details: `Created consolidation adjustment '${adj.adjustmentNumber}' (${adj.adjustmentType}) for ${adj.totalAmount} ${adj.currency}`,
      newState: adj as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return adj;
  }

  public updateConsolidationAdjustment(
    id: string,
    payload: Partial<Omit<DbConsolidationAdjustment, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbConsolidationAdjustment {
    const adj = this.data.consolidationAdjustments.find((a) => a.id === id);
    if (!adj) throw new Error(`Consolidation adjustment '${id}' not found`);
    Object.assign(adj, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return adj;
  }

  // --------------------------------------------------------------------------
  // Elimination Rules & FX Translation Rates
  // --------------------------------------------------------------------------
  public getEliminationRules(groupId?: string): DbEliminationRule[] {
    if (groupId) {
      return this.data.eliminationRules.filter((r) => r.groupId === groupId);
    }
    return [...this.data.eliminationRules];
  }

  public createEliminationRule(
    payload: Omit<DbEliminationRule, 'id' | 'createdAt' | 'updatedAt'>,
    _ctx?: TenantContext
  ): DbEliminationRule {
    const rule: DbEliminationRule = {
      ...payload,
      id: 'elim-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.eliminationRules.push(rule);
    this.saveData(this.data);
    return rule;
  }

  public updateEliminationRule(
    id: string,
    payload: Partial<Omit<DbEliminationRule, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbEliminationRule {
    const rule = this.data.eliminationRules.find((r) => r.id === id);
    if (!rule) throw new Error(`Elimination rule '${id}' not found`);
    Object.assign(rule, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return rule;
  }

  public getCurrencyTranslationRates(): DbCurrencyTranslationRate[] {
    return [...this.data.currencyTranslationRates];
  }

  public createCurrencyTranslationRate(
    payload: Omit<DbCurrencyTranslationRate, 'id' | 'createdAt' | 'updatedAt'>,
    _ctx?: TenantContext
  ): DbCurrencyTranslationRate {
    const rate: DbCurrencyTranslationRate = {
      ...payload,
      id: 'cxr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.currencyTranslationRates.push(rate);
    this.saveData(this.data);
    return rate;
  }

  public updateCurrencyTranslationRate(
    id: string,
    payload: Partial<Omit<DbCurrencyTranslationRate, 'id' | 'createdAt'>>,
    _ctx?: TenantContext
  ): DbCurrencyTranslationRate {
    const r = this.data.currencyTranslationRates.find((rate) => rate.id === id);
    if (!r) throw new Error(`Currency translation rate '${id}' not found`);
    Object.assign(r, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return r;
  }

  // --------------------------------------------------------------------------
  // Fiscal Years & Accounting Periods
  // --------------------------------------------------------------------------
  public getFiscalYears(ctx: TenantContext): DbFiscalYear[] {
    return this.data.fiscalYears.filter((fy) => fy.companyId === ctx.companyId);
  }

  public createFiscalYear(
    payload: { name: string; startDate: string; endDate: string; periodCount: 12 | 4 },
    ctx: TenantContext
  ): DbFiscalYear {
    const fyId = 'fy-' + Date.now().toString(36);
    const fy: DbFiscalYear = {
      id: fyId,
      companyId: ctx.companyId,
      name: payload.name,
      startDate: payload.startDate,
      endDate: payload.endDate,
      isClosed: false,
      createdAt: new Date().toISOString(),
    };
    this.data.fiscalYears.push(fy);

    const startYear = parseInt(payload.startDate.slice(0, 4));
    for (let i = 1; i <= payload.periodCount; i++) {
      const monthStr = i.toString().padStart(2, '0');
      this.data.accountingPeriods.push({
        id: `p-${fyId.slice(0, 4)}-${monthStr}`,
        companyId: ctx.companyId,
        fiscalYearId: fyId,
        periodNumber: i,
        name: `Period ${i} (${startYear}-${monthStr})`,
        startDate: `${startYear}-${monthStr}-01`,
        endDate: `${startYear}-${monthStr}-28`,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
    }

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_FISCAL_YEAR',
      entityType: 'FiscalYear',
      entityId: fy.id,
      details: `Created fiscal year '${fy.name}' with ${payload.periodCount} accounting periods`,
      newState: fy as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return fy;
  }

  public updateFiscalYear(
    id: string,
    payload: Partial<DbFiscalYear>,
    ctx: TenantContext
  ): DbFiscalYear {
    const fy = this.data.fiscalYears.find((f) => f.id === id);
    if (!fy) throw new Error(`Fiscal Year '${id}' not found`);
    this.assertTenantOwnership(fy.companyId, ctx);
    Object.assign(fy, payload);
    this.saveData(this.data);
    return fy;
  }

  public getAccountingPeriods(ctx: TenantContext): DbAccountingPeriod[] {
    return this.data.accountingPeriods.filter((p) => p.companyId === ctx.companyId);
  }

  public updateAccountingPeriod(
    id: string,
    payload: Partial<DbAccountingPeriod>,
    ctx: TenantContext
  ): DbAccountingPeriod {
    const period = this.data.accountingPeriods.find((p) => p.id === id);
    if (!period) throw new Error(`Period '${id}' not found`);
    this.assertTenantOwnership(period.companyId, ctx);
    Object.assign(period, payload);
    this.saveData(this.data);
    return period;
  }

  public createAccountingPeriod(
    payload: Omit<DbAccountingPeriod, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbAccountingPeriod {
    const period: DbAccountingPeriod = {
      ...payload,
      id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.accountingPeriods.push(period);
    this.saveData(this.data);
    return period;
  }

  public setPeriodStatus(
    periodId: string, 
    status: 'open' | 'soft_closed' | 'locked' | 'closed', 
    ctx: TenantContext
  ): DbAccountingPeriod {
    const period = this.data.accountingPeriods.find((p) => p.id === periodId);
    if (!period) throw new Error(`Period '${periodId}' not found`);
    this.assertTenantOwnership(period.companyId, ctx);

    const prevStatus = period.status;
    period.status = status;
    if (status === 'locked' || status === 'closed') {
      period.lockedAt = new Date().toISOString();
      period.lockedBy = ctx.userId;
    } else {
      period.lockedAt = undefined;
      period.lockedBy = undefined;
    }

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: `CHANGE_PERIOD_STATUS_${status.toUpperCase()}`,
      entityType: 'AccountingPeriod',
      entityId: periodId,
      details: `Changed period '${period.name}' status from '${prevStatus}' to '${status}'`,
      previousState: { status: prevStatus },
      newState: { status, lockedAt: period.lockedAt },
    });

    this.saveData(this.data);
    return period;
  }

  // --------------------------------------------------------------------------
  // Identity & RBAC
  // --------------------------------------------------------------------------
  public getUsers(ctx?: TenantContext): DbUser[] {
    if (!ctx || ctx.isPlatformAdmin) return [...this.data.users];
    const companyUserIds = new Set(
      this.data.memberships.filter((m) => m.companyId === ctx.companyId).map((m) => m.userId)
    );
    return this.data.users.filter((u) => companyUserIds.has(u.id) || u.isPlatformSuperAdmin);
  }

  public getUserById(id: string, _ctx?: TenantContext): DbUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getRoles(ctx?: TenantContext): DbRole[] {
    if (!ctx || ctx.isPlatformAdmin) return [...this.data.roles];
    return this.data.roles.filter((r) => !r.companyId || r.companyId === ctx.companyId);
  }

  public getRoleById(id: string): DbRole | undefined {
    return this.data.roles.find((r) => r.id === id);
  }

  public getMembershipsForUser(userId: string): DbCompanyMembership[] {
    return this.data.memberships.filter((m) => m.userId === userId);
  }

  public getMembershipsForCompany(ctx: TenantContext): DbCompanyMembership[] {
    return this.data.memberships.filter((m) => m.companyId === ctx.companyId);
  }

  public getCompanyMemberships(companyId: string, ctx?: TenantContext): DbCompanyMembership[] {
    if (ctx && !ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Unauthorized to access memberships for company '${companyId}'`);
    }
    return this.data.memberships.filter((m) => m.companyId === companyId);
  }

  public updateRolePermissions(roleId: string, permissions: string[], ctx: TenantContext): DbRole {
    const role = this.data.roles.find((r) => r.id === roleId);
    if (!role) throw new Error(`Role '${roleId}' not found`);
    if (role.companyId) this.assertTenantOwnership(role.companyId, ctx);

    const prevPerms = [...role.permissions];
    role.permissions = permissions;

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_ROLE_PERMISSIONS',
      entityType: 'Role',
      entityId: roleId,
      details: `Updated permissions for role '${role.name}' (${role.code})`,
      previousState: { permissions: prevPerms },
      newState: { permissions },
    });

    this.saveData(this.data);
    return role;
  }

  // --------------------------------------------------------------------------
  // Chart of Accounts & General Ledger
  // --------------------------------------------------------------------------
  public getAccountGroups(ctx: TenantContext): DbAccountGroup[] {
    return this.data.accountGroups.filter((g) => g.companyId === ctx.companyId);
  }

  public createAccountGroup(
    payload: Omit<DbAccountGroup, 'id' | 'companyId' | 'createdAt'>, 
    ctx: TenantContext
  ): DbAccountGroup {
    const group: DbAccountGroup = {
      ...payload,
      id: 'g-' + Date.now().toString(36),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.accountGroups.push(group);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_ACCOUNT_GROUP',
      entityType: 'AccountGroup',
      entityId: group.id,
      details: `Created account group '${group.name}' (${group.code})`,
      newState: group as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return group;
  }

  public getAccounts(ctx: TenantContext): DbAccount[] {
    return this.data.accounts.filter((a) => a.companyId === ctx.companyId);
  }

  public createAccount(
    payload: Omit<DbAccount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbAccount {
    const existing = this.data.accounts.find(
      (a) => a.companyId === ctx.companyId && a.code === payload.code
    );
    if (existing) {
      throw new Error(`Account code '${payload.code}' already exists in company context`);
    }

    const account: DbAccount = {
      ...payload,
      id: (payload as any).id || ('a-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7)),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.accounts.push(account);

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_ACCOUNT',
      entityType: 'Account',
      entityId: account.id,
      details: `Created GL account '${account.code} - ${account.name}' (${(account.accountType || account.classification || 'asset').toUpperCase()})`,
      newState: account as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return account;
  }

  public updateAccount(
    accountId: string,
    payload: Partial<Omit<DbAccount, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbAccount {
    const account = this.data.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);
    this.assertTenantOwnership(account.companyId, ctx);

    const prev = { ...account };
    Object.assign(account, payload, { updatedAt: new Date().toISOString() });

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_ACCOUNT',
      entityType: 'Account',
      entityId: account.id,
      details: `Updated account '${account.code} - ${account.name}'`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: account as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return account;
  }

  // --------------------------------------------------------------------------
  // Tax Codes & VAT Configuration
  // --------------------------------------------------------------------------
  public getTaxCodes(ctx: TenantContext, jurisdictionId?: string): DbTaxCode[] {
    return this.data.taxCodes.filter(
      (t) => t.companyId === ctx.companyId && (!jurisdictionId || t.jurisdictionId === jurisdictionId)
    );
  }

  public getTaxCodeById(id: string, ctx: TenantContext): DbTaxCode | undefined {
    const code = this.data.taxCodes.find((t) => t.id === id);
    if (code) this.assertTenantOwnership(code.companyId, ctx);
    return code;
  }

  public createTaxCode(payload: Omit<DbTaxCode, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbTaxCode {
    const taxCode: DbTaxCode = {
      ...payload,
      id: 'tax-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taxCodes.push(taxCode);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_TAX_CODE',
      entityType: 'TaxCode',
      entityId: taxCode.id,
      details: `Created tax code '${taxCode.code}' (${taxCode.rate})`,
      newState: taxCode as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return taxCode;
  }

  public updateTaxCode(id: string, payload: Partial<DbTaxCode>, ctx: TenantContext): DbTaxCode {
    const taxCode = this.data.taxCodes.find((t) => t.id === id);
    if (!taxCode) throw new Error(`Tax code '${id}' not found`);
    this.assertTenantOwnership(taxCode.companyId, ctx);

    const prev = { ...taxCode };
    Object.assign(taxCode, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_TAX_CODE',
      entityType: 'TaxCode',
      entityId: taxCode.id,
      details: `Updated tax code '${taxCode.code}'`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: taxCode as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return taxCode;
  }

  // --------------------------------------------------------------------------
  // Accounting Rules Matrix
  // --------------------------------------------------------------------------
  public getAccountingRules(ctx: TenantContext): DbAccountingRule[] {
    return this.data.accountingRules.filter((r) => !r.companyId || r.companyId === ctx.companyId);
  }

  // --------------------------------------------------------------------------
  // Sub-Ledger Registry & Reconciliation
  // --------------------------------------------------------------------------
  public getSubLedgerEntries(ctx: TenantContext): DbSubLedgerEntry[] {
    return this.data.subLedgerEntries.filter((s) => s.companyId === ctx.companyId);
  }

  // --------------------------------------------------------------------------
  // Double-Entry Journals & General Ledger
  // --------------------------------------------------------------------------
  public getJournalEntries(ctx: TenantContext): (DbJournalEntry & { lines: DbJournalLine[] })[] {
    const entries = this.data.journalEntries.filter((je) => je.companyId === ctx.companyId);
    return entries.map((entry) => ({
      ...entry,
      lines: this.data.journalLines.filter((jl) => jl.journalEntryId === entry.id),
    }));
  }

  public getJournalEntry(id: string, ctx: TenantContext): (DbJournalEntry & { lines: DbJournalLine[] }) | undefined {
    const entry = this.data.journalEntries.find((je) => je.id === id && je.companyId === ctx.companyId);
    if (!entry) return undefined;
    return {
      ...entry,
      lines: this.data.journalLines.filter((jl) => jl.journalEntryId === entry.id),
    };
  }

  public getJournalEntryById(id: string, ctx: TenantContext): (DbJournalEntry & { lines: DbJournalLine[] }) | undefined {
    return this.getJournalEntry(id, ctx);
  }

  public createJournalEntry(
    entry: Omit<DbJournalEntry, 'id' | 'createdAt' | 'postedAt' | 'postedBy'> & {
      lines: Omit<DbJournalLine, 'id' | 'journalEntryId' | 'companyId'>[];
    },
    ctx: TenantContext
  ): DbJournalEntry {
    return this.postJournalEntry(entry, ctx);
  }

  public getJournalLines(arg1?: TenantContext | string, arg2?: TenantContext): DbJournalLine[] {
    if (typeof arg1 === 'string') {
      const entryId = arg1;
      const ctx = arg2;
      return this.data.journalLines.filter((l) => {
        const matchEntry = l.journalEntryId === entryId;
        const matchTenant = !ctx || l.companyId === ctx.companyId;
        return matchEntry && matchTenant;
      });
    }
    const ctx = arg1;
    if (!ctx || ctx.isPlatformAdmin) return [...this.data.journalLines];
    return this.data.journalLines.filter((l) => l.companyId === ctx.companyId);
  }

  public postJournalEntry(
    entry: Omit<DbJournalEntry, 'id' | 'createdAt' | 'postedAt' | 'postedBy' | 'companyId'> & {
      companyId?: string;
      lines: Omit<DbJournalLine, 'id' | 'journalEntryId' | 'companyId'>[];
    },
    ctx: TenantContext
  ): DbJournalEntry {
    const companyId = entry.companyId || ctx.companyId;
    this.assertTenantOwnership(companyId, ctx);

    let period = this.data.accountingPeriods.find((p) => p.id === entry.periodId && p.companyId === companyId);
    if (!period) {
      period = this.data.accountingPeriods.find(
        (p) => p.companyId === companyId && entry.postingDate >= p.startDate && entry.postingDate <= p.endDate
      );
    }
    if (!period) throw new Error(`Target accounting period not found for date ${entry.postingDate}`);
    if (period.status !== 'open') {
      throw new PeriodClosedError(period.name, period.status);
    }

    const debitMoney = createMoney(entry.totalDebit, entry.currency);
    const creditMoney = createMoney(entry.totalCredit, entry.currency);
    if (!areDebitsAndCreditsBalanced(debitMoney, creditMoney)) {
      throw new Error(`Cannot post unbalanced journal: Debits (${entry.totalDebit}) != Credits (${entry.totalCredit})`);
    }

    const newEntryId = 'je-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
    const isDraft = entry.status === 'draft' || entry.status === 'submitted';
    const journalRecord: DbJournalEntry = {
      ...entry,
      companyId,
      id: newEntryId,
      status: entry.status || 'posted',
      postedAt: isDraft ? undefined : new Date().toISOString(),
      postedBy: isDraft ? undefined : ctx.userId,
      createdAt: new Date().toISOString(),
    };

    this.data.journalEntries.push(journalRecord);

    for (let i = 0; i < entry.lines.length; i++) {
      const line = entry.lines[i];
      const lineId = 'jl-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7) + '-' + i;
      const lineRecord: DbJournalLine = {
        ...line,
        id: lineId,
        companyId,
        journalEntryId: newEntryId,
      };
      this.data.journalLines.push(lineRecord);

      if (!isDraft && line.subLedgerType && line.subLedgerEntityId) {
        this.data.subLedgerEntries.push({
          id: 'sle-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7) + '-' + i,
          companyId: companyId,
          subLedgerType: line.subLedgerType,
          entityId: line.subLedgerEntityId,
          entityName: line.description,
          journalEntryId: newEntryId,
          journalLineId: lineId,
          documentNumber: entry.entryNumber,
          documentDate: entry.entryDate,
          glAccountId: line.accountId,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          currency: line.currency,
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: isDraft ? 'SAVE_DRAFT_JOURNAL' : 'POST_JOURNAL_ENTRY',
      entityType: 'JournalEntry',
      entityId: newEntryId,
      details: `Committed Journal Entry '${entry.entryNumber}' (${entry.memo}) for ${entry.totalDebit} ${entry.currency}`,
      newState: journalRecord as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return journalRecord;
  }

  public reverseJournalEntry(entryId: string, reason: string, ctx: TenantContext): DbJournalEntry {
    const original = this.data.journalEntries.find((je) => je.id === entryId);
    if (!original) throw new Error(`Journal entry '${entryId}' not found`);
    this.assertTenantOwnership(original.companyId, ctx);

    if (original.status === 'reversed') {
      throw new ImmutableRecordError('JournalEntry', entryId);
    }

    const originalLines = this.data.journalLines.filter((jl) => jl.journalEntryId === original.id);

    const reversingLines = originalLines.map((line) => ({
      accountId: line.accountId,
      lineNumber: line.lineNumber,
      description: `Reversal of [${original.entryNumber}]: ${line.description}`,
      debitAmount: line.creditAmount,
      creditAmount: line.debitAmount,
      currency: line.currency,
      exchangeRate: line.exchangeRate,
      baseDebit: line.baseCredit,
      baseCredit: line.baseDebit,
      departmentId: line.departmentId,
      costCenterId: line.costCenterId,
      projectId: line.projectId,
      subLedgerType: line.subLedgerType,
      subLedgerEntityId: line.subLedgerEntityId,
      taxCodeId: line.taxCodeId,
      taxAmount: line.taxAmount,
    }));

    const reversingEntry = this.postJournalEntry({
      companyId: original.companyId,
      branchId: original.branchId,
      periodId: original.periodId,
      entryNumber: `${original.entryNumber}-REV`,
      entryDate: new Date().toISOString().slice(0, 10),
      postingDate: new Date().toISOString().slice(0, 10),
      sourceModule: 'manual_reversal',
      sourceType: original.sourceType,
      sourceId: original.sourceId,
      postingEvent: 'MANUAL_REVERSAL_POSTED',
      memo: `Reversal of ${original.entryNumber}. Reason: ${reason}`,
      totalDebit: original.totalCredit,
      totalCredit: original.totalDebit,
      currency: original.currency,
      exchangeRate: original.exchangeRate,
      status: 'posted',
      reversesEntryId: original.id,
      reversedByEntryId: undefined,
      lines: reversingLines,
    }, ctx);

    original.status = 'reversed';
    original.reversedByEntryId = reversingEntry.id;

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'REVERSE_JOURNAL_ENTRY',
      entityType: 'JournalEntry',
      entityId: original.id,
      details: `Reversed Journal Entry '${original.entryNumber}' via Reversal Entry '${reversingEntry.entryNumber}'. Reason: ${reason}`,
      previousState: { status: 'posted' },
      newState: { status: 'reversed', reversedByEntryId: reversingEntry.id },
    });

    this.saveData(this.data);
    return reversingEntry;
  }

  // --------------------------------------------------------------------------
  // Sales & Accounts Receivable Repository
  // --------------------------------------------------------------------------
  public getCustomerGroups(ctx: TenantContext): DbCustomerGroup[] {
    return this.data.customerGroups.filter((cg) => cg.companyId === ctx.companyId);
  }

  public createCustomerGroup(payload: Omit<DbCustomerGroup, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbCustomerGroup {
    const group: DbCustomerGroup = {
      ...payload,
      id: 'cg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.customerGroups.push(group);
    this.saveData(this.data);
    return group;
  }

  public getCustomers(ctx: TenantContext): DbCustomer[] {
    return this.data.customers.filter((c) => c.companyId === ctx.companyId);
  }

  public getCustomerById(id: string, ctx: TenantContext): DbCustomer | undefined {
    const customer = this.data.customers.find((c) => c.id === id);
    if (customer) this.assertTenantOwnership(customer.companyId, ctx);
    return customer;
  }

  public createCustomer(payload: Omit<DbCustomer, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbCustomer {
    this.assertTenantOwnership(ctx.companyId, ctx);
    const existing = this.data.customers.find((c) => c.companyId === ctx.companyId && c.code === payload.code);
    if (existing) throw new Error(`Customer code '${payload.code}' already exists`);

    const customer: DbCustomer = {
      ...payload,
      id: 'cust-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.customers.push(customer);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer.id,
      details: `Created customer '${customer.name}' (${customer.code}) with Credit Limit ${customer.creditLimit} ${customer.currency}`,
      newState: customer as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return customer;
  }

  public updateCustomer(id: string, payload: Partial<Omit<DbCustomer, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbCustomer {
    const customer = this.data.customers.find((c) => c.id === id);
    if (!customer) throw new Error(`Customer '${id}' not found`);
    this.assertTenantOwnership(customer.companyId, ctx);

    Object.assign(customer, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return customer;
  }

  public getSalesQuotations(ctx: TenantContext): DbSalesQuotation[] {
    return this.data.salesQuotations.filter((q) => q.companyId === ctx.companyId);
  }

  public createSalesQuotation(payload: Omit<DbSalesQuotation, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbSalesQuotation {
    const quote: DbSalesQuotation = {
      ...payload,
      id: 'qt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.salesQuotations.push(quote);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_SALES_QUOTATION',
      entityType: 'SalesQuotation',
      entityId: quote.id,
      details: `Created sales quotation '${quote.quotationNumber}' for total ${quote.total} ${quote.currency}`,
      newState: quote as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return quote;
  }

  public updateSalesQuotation(id: string, payload: Partial<DbSalesQuotation>, ctx: TenantContext): DbSalesQuotation {
    const quote = this.data.salesQuotations.find((q) => q.id === id);
    if (!quote) throw new Error(`Quotation '${id}' not found`);
    this.assertTenantOwnership(quote.companyId, ctx);
    Object.assign(quote, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return quote;
  }

  public getSalesOrders(ctx: TenantContext): DbSalesOrder[] {
    return this.data.salesOrders.filter((o) => o.companyId === ctx.companyId);
  }

  public createSalesOrder(payload: Omit<DbSalesOrder, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbSalesOrder {
    const order: DbSalesOrder = {
      ...payload,
      id: 'so-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.salesOrders.push(order);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_SALES_ORDER',
      entityType: 'SalesOrder',
      entityId: order.id,
      details: `Created sales order '${order.orderNumber}' for total ${order.total} ${order.currency}`,
      newState: order as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return order;
  }

  public updateSalesOrder(id: string, payload: Partial<DbSalesOrder>, ctx: TenantContext): DbSalesOrder {
    const order = this.data.salesOrders.find((o) => o.id === id);
    if (!order) throw new Error(`Sales Order '${id}' not found`);
    this.assertTenantOwnership(order.companyId, ctx);
    Object.assign(order, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return order;
  }

  public getSalesInvoices(ctx: TenantContext): DbSalesInvoice[] {
    return this.data.salesInvoices.filter((i) => i.companyId === ctx.companyId);
  }

  public createSalesInvoice(payload: Omit<DbSalesInvoice, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbSalesInvoice {
    const invoice: DbSalesInvoice = {
      ...payload,
      id: 'inv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.salesInvoices.push(invoice);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_SALES_INVOICE',
      entityType: 'SalesInvoice',
      entityId: invoice.id,
      details: `Created sales invoice '${invoice.invoiceNumber}' with status '${invoice.status}'`,
      newState: invoice as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return invoice;
  }

  public updateSalesInvoice(id: string, payload: Partial<DbSalesInvoice>, ctx: TenantContext): DbSalesInvoice {
    const invoice = this.data.salesInvoices.find((i) => i.id === id);
    if (!invoice) throw new Error(`Sales invoice '${id}' not found`);
    this.assertTenantOwnership(invoice.companyId, ctx);

    if (invoice.status === 'posted' && payload.status === undefined && payload.amountPaid === undefined && payload.balanceDue === undefined) {
      throw new ImmutableRecordError('SalesInvoice', id);
    }

    Object.assign(invoice, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return invoice;
  }

  public getCustomerPayments(ctx: TenantContext): DbCustomerPayment[] {
    return this.data.customerPayments.filter((p) => p.companyId === ctx.companyId);
  }

  public getCustomerReceipts(ctx: TenantContext): DbCustomerPayment[] {
    return this.getCustomerPayments(ctx);
  }

  public createCustomerPayment(payload: Omit<DbCustomerPayment, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbCustomerPayment {
    const existing = this.data.customerPayments.find(
      (p) => p.companyId === ctx.companyId && p.receiptNumber.toLowerCase() === payload.receiptNumber.toLowerCase()
    );
    if (existing) {
      throw new Error(`Customer payment receipt '${payload.receiptNumber}' already exists.`);
    }

    const payment: DbCustomerPayment = {
      ...payload,
      id: 'pmt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.customerPayments.push(payment);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_CUSTOMER_PAYMENT',
      entityType: 'CustomerPayment',
      entityId: payment.id,
      details: `Posted customer receipt '${payment.receiptNumber}' for ${payment.amount} ${payment.currency}`,
      newState: payment as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return payment;
  }

  public updateCustomerPayment(
    id: string,
    payload: Partial<Omit<DbCustomerPayment, 'id' | 'companyId' | 'createdAt'>>,
    ctx: TenantContext
  ): DbCustomerPayment {
    const payment = this.data.customerPayments.find((p) => p.id === id && p.companyId === ctx.companyId);
    if (!payment) throw new Error(`Customer payment '${id}' not found`);
    Object.assign(payment, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_CUSTOMER_PAYMENT',
      entityType: 'CustomerPayment',
      entityId: payment.id,
      details: `Updated customer payment '${payment.receiptNumber}' (status: ${payment.status})`,
      newState: payment as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return payment;
  }

  public getSalesCreditNotes(ctx: TenantContext): DbSalesCreditNote[] {
    return this.data.salesCreditNotes.filter((cn) => cn.companyId === ctx.companyId);
  }

  public createSalesCreditNote(payload: Omit<DbSalesCreditNote, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSalesCreditNote {
    const cn: DbSalesCreditNote = {
      ...payload,
      id: 'cn-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.salesCreditNotes.push(cn);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_SALES_CREDIT_NOTE',
      entityType: 'SalesCreditNote',
      entityId: cn.id,
      details: `Posted sales credit note '${cn.creditNoteNumber}' for total ${cn.total} ${cn.currency}`,
      newState: cn as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return cn;
  }

  // ==========================================================================
  // PHASE 6: PROCUREMENT & ACCOUNTS PAYABLE (AP) REPOSITORIES
  // ==========================================================================

  // --- Supplier Groups ---
  public getSupplierGroups(ctx: TenantContext): DbSupplierGroup[] {
    return this.data.supplierGroups.filter((g) => g.companyId === ctx.companyId);
  }

  public createSupplierGroup(payload: Omit<DbSupplierGroup, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSupplierGroup {
    const group: DbSupplierGroup = {
      ...payload,
      id: 'sg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.supplierGroups.push(group);
    this.saveData(this.data);
    return group;
  }

  // --- Supplier Master ---
  public getSuppliers(ctx: TenantContext): DbSupplier[] {
    return this.data.suppliers.filter((s) => s.companyId === ctx.companyId);
  }

  public getSupplierById(id: string, ctx: TenantContext): DbSupplier | undefined {
    const supplier = this.data.suppliers.find((s) => s.id === id);
    if (supplier) this.assertTenantOwnership(supplier.companyId, ctx);
    return supplier;
  }

  public createSupplier(payload: Omit<DbSupplier, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbSupplier {
    // Unique supplier code constraint within tenant
    const existing = this.data.suppliers.find((s) => s.companyId === ctx.companyId && s.code.toUpperCase() === payload.code.toUpperCase());
    if (existing) {
      throw new Error(`Supplier code '${payload.code}' already exists in company.`);
    }

    const supplier: DbSupplier = {
      ...payload,
      id: 'sup-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.suppliers.push(supplier);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_SUPPLIER',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: `Registered supplier '${supplier.name}' (${supplier.code})`,
      newState: supplier as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return supplier;
  }

  public updateSupplier(id: string, payload: Partial<DbSupplier>, ctx: TenantContext): DbSupplier {
    const supplier = this.data.suppliers.find((s) => s.id === id);
    if (!supplier) throw new Error(`Supplier '${id}' not found`);
    this.assertTenantOwnership(supplier.companyId, ctx);

    Object.assign(supplier, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_SUPPLIER',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: `Updated supplier details for '${supplier.name}'`,
      newState: supplier as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return supplier;
  }

  // --- Purchase Requests ---
  public getPurchaseRequests(ctx: TenantContext): DbPurchaseRequest[] {
    return this.data.purchaseRequests.filter((pr) => pr.companyId === ctx.companyId);
  }

  public getPurchaseRequestById(id: string, ctx: TenantContext): DbPurchaseRequest | undefined {
    const pr = this.data.purchaseRequests.find((r) => r.id === id);
    if (pr) this.assertTenantOwnership(pr.companyId, ctx);
    return pr;
  }

  public createPurchaseRequest(payload: Omit<DbPurchaseRequest, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbPurchaseRequest {
    const pr: DbPurchaseRequest = {
      ...payload,
      id: 'pr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.purchaseRequests.push(pr);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PURCHASE_REQUEST',
      entityType: 'PurchaseRequest',
      entityId: pr.id,
      details: `Created purchase requisition '${pr.requestNumber}' for ${pr.totalEstimatedCost}`,
      newState: pr as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return pr;
  }

  public updatePurchaseRequest(id: string, payload: Partial<DbPurchaseRequest>, ctx: TenantContext): DbPurchaseRequest {
    const pr = this.data.purchaseRequests.find((r) => r.id === id);
    if (!pr) throw new Error(`Purchase request '${id}' not found`);
    this.assertTenantOwnership(pr.companyId, ctx);

    Object.assign(pr, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return pr;
  }

  // --- Requests for Quotation (RFQs) & Supplier Quotations ---
  public getRFQs(ctx: TenantContext): DbRFQ[] {
    return this.data.rfqs.filter((r) => r.companyId === ctx.companyId);
  }

  public getRFQById(id: string, ctx: TenantContext): DbRFQ | undefined {
    const rfq = this.data.rfqs.find((r) => r.id === id);
    if (rfq) this.assertTenantOwnership(rfq.companyId, ctx);
    return rfq;
  }

  public createRFQ(payload: Omit<DbRFQ, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbRFQ {
    const rfq: DbRFQ = {
      ...payload,
      id: 'rfq-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.rfqs.push(rfq);
    this.saveData(this.data);
    return rfq;
  }

  public updateRFQ(id: string, payload: Partial<DbRFQ>, ctx: TenantContext): DbRFQ {
    const rfq = this.data.rfqs.find((r) => r.id === id);
    if (!rfq) throw new Error(`RFQ '${id}' not found`);
    this.assertTenantOwnership(rfq.companyId, ctx);
    Object.assign(rfq, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return rfq;
  }

  public getSupplierQuotations(ctx: TenantContext): DbSupplierQuotation[] {
    return this.data.supplierQuotations.filter((sq) => sq.companyId === ctx.companyId);
  }

  public getSupplierQuotationById(id: string, ctx: TenantContext): DbSupplierQuotation | undefined {
    const sq = this.data.supplierQuotations.find((q) => q.id === id);
    if (sq) this.assertTenantOwnership(sq.companyId, ctx);
    return sq;
  }

  public createSupplierQuotation(payload: Omit<DbSupplierQuotation, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSupplierQuotation {
    const quote: DbSupplierQuotation = {
      ...payload,
      id: 'sq-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.supplierQuotations.push(quote);
    this.saveData(this.data);
    return quote;
  }

  public updateSupplierQuotation(id: string, payload: Partial<DbSupplierQuotation>, ctx: TenantContext): DbSupplierQuotation {
    const quote = this.data.supplierQuotations.find((q) => q.id === id);
    if (!quote) throw new Error(`Supplier quotation '${id}' not found`);
    this.assertTenantOwnership(quote.companyId, ctx);
    Object.assign(quote, payload);
    this.saveData(this.data);
    return quote;
  }

  // --- Purchase Orders ---
  public getPurchaseOrders(ctx: TenantContext): DbPurchaseOrder[] {
    return this.data.purchaseOrders.filter((po) => po.companyId === ctx.companyId);
  }

  public getPurchaseOrderById(id: string, ctx: TenantContext): DbPurchaseOrder | undefined {
    const po = this.data.purchaseOrders.find((p) => p.id === id);
    if (po) this.assertTenantOwnership(po.companyId, ctx);
    return po;
  }

  public createPurchaseOrder(payload: Omit<DbPurchaseOrder, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbPurchaseOrder {
    const po: DbPurchaseOrder = {
      ...payload,
      id: 'po-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.purchaseOrders.push(po);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PURCHASE_ORDER',
      entityType: 'PurchaseOrder',
      entityId: po.id,
      details: `Created Purchase Order '${po.poNumber}' for total ${po.total} ${po.currency}`,
      newState: po as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return po;
  }

  public updatePurchaseOrder(id: string, payload: Partial<DbPurchaseOrder>, ctx: TenantContext): DbPurchaseOrder {
    const po = this.data.purchaseOrders.find((p) => p.id === id);
    if (!po) throw new Error(`Purchase order '${id}' not found`);
    this.assertTenantOwnership(po.companyId, ctx);

    Object.assign(po, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return po;
  }

  // --- Goods Receipts ---
  public getGoodsReceipts(ctx: TenantContext): DbGoodsReceipt[] {
    return this.data.goodsReceipts.filter((gr) => gr.companyId === ctx.companyId);
  }

  public createGoodsReceipt(payload: Omit<DbGoodsReceipt, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbGoodsReceipt {
    const gr: DbGoodsReceipt = {
      ...payload,
      id: 'gr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.goodsReceipts.push(gr);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_GOODS_RECEIPT',
      entityType: 'GoodsReceipt',
      entityId: gr.id,
      details: `Recorded Goods Receipt '${gr.receiptNumber}' for PO '${gr.purchaseOrderId}'`,
      newState: gr as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return gr;
  }

  // --- Supplier Bills ---
  public getSupplierBills(ctx: TenantContext): DbSupplierBill[] {
    return this.data.supplierBills.filter((b) => b.companyId === ctx.companyId);
  }

  public getSupplierBillById(id: string, ctx: TenantContext): DbSupplierBill | undefined {
    const bill = this.data.supplierBills.find((b) => b.id === id);
    if (bill) this.assertTenantOwnership(bill.companyId, ctx);
    return bill;
  }

  public createSupplierBill(
    payload: Omit<DbSupplierBill, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'balanceDue' | 'freightTotal' | 'supplierInvoiceNumber' | 'matchStatus'> & {
      amountPaid?: string;
      balanceDue?: string;
      freightTotal?: string;
      supplierInvoiceNumber?: string;
      matchStatus?: MatchStatus;
    },
    ctx: TenantContext
  ): DbSupplierBill {
    const bill: DbSupplierBill = {
      ...payload,
      id: 'bill-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      amountPaid: payload.amountPaid || '0.0000',
      balanceDue: payload.balanceDue || payload.total,
      freightTotal: payload.freightTotal || '0.0000',
      supplierInvoiceNumber: payload.supplierInvoiceNumber || payload.billNumber,
      matchStatus: payload.matchStatus || 'matched',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.supplierBills.push(bill);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_SUPPLIER_BILL',
      entityType: 'SupplierBill',
      entityId: bill.id,
      details: `Created supplier bill '${bill.billNumber}' (Vendor Invoice: '${bill.supplierInvoiceNumber}') for ${bill.total} ${bill.currency}`,
      newState: bill as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return bill;
  }

  public updateSupplierBill(id: string, payload: Partial<DbSupplierBill>, ctx: TenantContext): DbSupplierBill {
    const bill = this.data.supplierBills.find((b) => b.id === id);
    if (!bill) throw new Error(`Supplier bill '${id}' not found`);
    this.assertTenantOwnership(bill.companyId, ctx);

    if (bill.status === 'posted' && payload.status === undefined && payload.amountPaid === undefined && payload.balanceDue === undefined) {
      throw new ImmutableRecordError('SupplierBill', id);
    }

    Object.assign(bill, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return bill;
  }

  // --- Supplier Payments ---
  public getSupplierPayments(ctx: TenantContext): DbSupplierPayment[] {
    return this.data.supplierPayments.filter((p) => p.companyId === ctx.companyId);
  }

  public createSupplierPayment(payload: Omit<DbSupplierPayment, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSupplierPayment {
    const payment: DbSupplierPayment = {
      ...payload,
      id: 'spmt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.supplierPayments.push(payment);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_SUPPLIER_PAYMENT',
      entityType: 'SupplierPayment',
      entityId: payment.id,
      details: `Disbursed supplier payment '${payment.paymentNumber}' for ${payment.amount} ${payment.currency}`,
      newState: payment as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return payment;
  }

  // --- Supplier Credit & Debit Notes ---
  public getSupplierCreditNotes(ctx: TenantContext): DbSupplierCreditNote[] {
    return this.data.supplierCreditNotes.filter((cn) => cn.companyId === ctx.companyId);
  }

  public createSupplierCreditNote(payload: Omit<DbSupplierCreditNote, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSupplierCreditNote {
    const cn: DbSupplierCreditNote = {
      ...payload,
      id: 'scn-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.supplierCreditNotes.push(cn);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_SUPPLIER_CREDIT_NOTE',
      entityType: 'SupplierCreditNote',
      entityId: cn.id,
      details: `Posted supplier credit note '${cn.creditNoteNumber}' for ${cn.total} ${cn.currency}`,
      newState: cn as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return cn;
  }

  public getSupplierDebitNotes(ctx: TenantContext): DbSupplierDebitNote[] {
    return this.data.supplierDebitNotes.filter((dn) => dn.companyId === ctx.companyId);
  }

  public createSupplierDebitNote(payload: Omit<DbSupplierDebitNote, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSupplierDebitNote {
    const dn: DbSupplierDebitNote = {
      ...payload,
      id: 'sdn-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.supplierDebitNotes.push(dn);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_SUPPLIER_DEBIT_NOTE',
      entityType: 'SupplierDebitNote',
      entityId: dn.id,
      details: `Posted supplier debit note '${dn.debitNoteNumber}' for ${dn.total} ${dn.currency}`,
      newState: dn as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return dn;
  }

  // ============================================================================
  // Phase 7: Inventory & Warehouse Repositories
  // ============================================================================

  // --- Item Categories ---
  public getItemCategories(ctx: TenantContext): DbItemCategory[] {
    return this.data.itemCategories.filter((c) => c.companyId === ctx.companyId);
  }

  public createItemCategory(payload: Omit<DbItemCategory, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbItemCategory {
    const cat: DbItemCategory = {
      ...payload,
      id: 'cat-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.itemCategories.push(cat);
    this.saveData(this.data);
    return cat;
  }

  // --- Units of Measure (UOM) ---
  public getUnitsOfMeasure(ctx: TenantContext): DbUnitOfMeasure[] {
    return this.data.unitsOfMeasure.filter((u) => u.companyId === ctx.companyId);
  }

  public createUnitOfMeasure(payload: Omit<DbUnitOfMeasure, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbUnitOfMeasure {
    const uom: DbUnitOfMeasure = {
      ...payload,
      id: 'uom-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.unitsOfMeasure.push(uom);
    this.saveData(this.data);
    return uom;
  }

  // --- Item Master (SKU) ---
  public getItems(ctx: TenantContext): DbItem[] {
    return this.data.items.filter((i) => i.companyId === ctx.companyId);
  }

  public getItemById(id: string, ctx: TenantContext): DbItem | undefined {
    const item = this.data.items.find((i) => i.id === id);
    if (item) this.assertTenantOwnership(item.companyId, ctx);
    return item;
  }

  public getItemByCode(itemCode: string, ctx: TenantContext): DbItem | undefined {
    const item = this.data.items.find((i) => i.companyId === ctx.companyId && i.itemCode.toUpperCase() === itemCode.toUpperCase());
    return item;
  }

  public createItem(payload: Omit<DbItem, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbItem {
    // Unique SKU constraint per tenant
    const existing = this.data.items.find(
      (i) => i.companyId === ctx.companyId && i.itemCode.toUpperCase() === payload.itemCode.toUpperCase()
    );
    if (existing) {
      throw new Error(`Item SKU '${payload.itemCode}' already exists in company.`);
    }

    const item: DbItem = {
      ...payload,
      id: 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      currentAverageCost: payload.currentAverageCost || payload.standardCost || '0.0000',
      totalStockQuantity: payload.totalStockQuantity || '0.0000',
      totalStockValue: payload.totalStockValue || '0.0000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.items.push(item);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_ITEM_MASTER',
      entityType: 'Item',
      entityId: item.id,
      details: `Registered item SKU '${item.itemCode}' (${item.name})`,
      newState: item as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return item;
  }

  public updateItem(id: string, payload: Partial<DbItem>, ctx: TenantContext): DbItem {
    const item = this.data.items.find((i) => i.id === id);
    if (!item) throw new Error(`Item '${id}' not found`);
    this.assertTenantOwnership(item.companyId, ctx);

    Object.assign(item, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return item;
  }

  // --- Warehouses & Locations ---
  public getWarehouses(ctxOrCompanyId?: TenantContext | string, ctx?: TenantContext): DbWarehouse[] {
    let companyId: string | undefined;
    let effectiveCtx: TenantContext | undefined;

    if (typeof ctxOrCompanyId === 'string') {
      companyId = ctxOrCompanyId;
      effectiveCtx = ctx;
    } else if (ctxOrCompanyId && typeof ctxOrCompanyId === 'object') {
      companyId = ctxOrCompanyId.companyId;
      effectiveCtx = ctxOrCompanyId;
    }

    if (effectiveCtx && !effectiveCtx.isPlatformAdmin && companyId && effectiveCtx.companyId !== companyId) {
      throw new TenantViolationError(`Cannot access warehouses for foreign company`);
    }
    return this.data.warehouses.filter((w) => !companyId || w.companyId === companyId);
  }

  public getWarehouseById(id: string, ctx: TenantContext): DbWarehouse | undefined {
    const wh = this.data.warehouses.find((w) => w.id === id);
    if (wh) this.assertTenantOwnership(wh.companyId, ctx);
    return wh;
  }

  public createWarehouse(payload: Omit<DbWarehouse, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbWarehouse {
    const existing = this.data.warehouses.find(
      (w) => w.companyId === ctx.companyId && w.code.toUpperCase() === payload.code.toUpperCase()
    );
    if (existing) {
      throw new Error(`Warehouse code '${payload.code}' already exists in company.`);
    }

    const wh: DbWarehouse = {
      ...payload,
      id: 'wh-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.warehouses.push(wh);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_WAREHOUSE',
      entityType: 'Warehouse',
      entityId: wh.id,
      details: `Created warehouse '${wh.name}' (${wh.code})`,
      newState: wh as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return wh;
  }

  public getWarehouseLocations(warehouseId: string | undefined, ctx: TenantContext): DbWarehouseLocation[] {
    return this.data.warehouseLocations.filter(
      (l) => l.companyId === ctx.companyId && (!warehouseId || l.warehouseId === warehouseId)
    );
  }

  public createWarehouseLocation(payload: Omit<DbWarehouseLocation, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbWarehouseLocation {
    const loc: DbWarehouseLocation = {
      ...payload,
      id: 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.warehouseLocations.push(loc);
    this.saveData(this.data);
    return loc;
  }

  // --- Stock Movements (Immutable Ledger) ---
  public getStockMovements(ctx: TenantContext): DbStockMovement[] {
    return this.data.stockMovements.filter((m) => m.companyId === ctx.companyId);
  }

  public recordStockMovement(payload: Omit<DbStockMovement, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbStockMovement {
    const movement: DbStockMovement = {
      ...payload,
      id: 'smvt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdBy: ctx.userId,
      createdAt: new Date().toISOString(),
    };
    this.data.stockMovements.push(movement);
    this.saveData(this.data);
    return movement;
  }

  // --- Stock Transfers ---
  public getStockTransfers(ctx: TenantContext): DbStockTransfer[] {
    return this.data.stockTransfers.filter((t) => t.companyId === ctx.companyId);
  }

  public getStockTransferById(id: string, ctx: TenantContext): DbStockTransfer | undefined {
    const t = this.data.stockTransfers.find((x) => x.id === id);
    if (t) this.assertTenantOwnership(t.companyId, ctx);
    return t;
  }

  public createStockTransfer(payload: Omit<DbStockTransfer, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbStockTransfer {
    const transfer: DbStockTransfer = {
      ...payload,
      id: 'strf-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.stockTransfers.push(transfer);
    this.saveData(this.data);
    return transfer;
  }

  public updateStockTransfer(id: string, payload: Partial<DbStockTransfer>, ctx: TenantContext): DbStockTransfer {
    const transfer = this.data.stockTransfers.find((t) => t.id === id);
    if (!transfer) throw new Error(`Stock transfer '${id}' not found`);
    this.assertTenantOwnership(transfer.companyId, ctx);

    Object.assign(transfer, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return transfer;
  }

  // --- Stock Adjustments ---
  public getStockAdjustments(ctx: TenantContext): DbStockAdjustment[] {
    return this.data.stockAdjustments.filter((a) => a.companyId === ctx.companyId);
  }

  public getStockAdjustmentById(id: string, ctx: TenantContext): DbStockAdjustment | undefined {
    const adj = this.data.stockAdjustments.find((a) => a.id === id);
    if (adj) this.assertTenantOwnership(adj.companyId, ctx);
    return adj;
  }

  public createStockAdjustment(payload: Omit<DbStockAdjustment, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbStockAdjustment {
    const adj: DbStockAdjustment = {
      ...payload,
      id: 'sadj-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.stockAdjustments.push(adj);
    this.saveData(this.data);
    return adj;
  }

  public updateStockAdjustment(id: string, payload: Partial<DbStockAdjustment>, ctx: TenantContext): DbStockAdjustment {
    const adj = this.data.stockAdjustments.find((a) => a.id === id);
    if (!adj) throw new Error(`Stock adjustment '${id}' not found`);
    this.assertTenantOwnership(adj.companyId, ctx);

    if (adj.status === 'posted' && payload.status === undefined) {
      throw new ImmutableRecordError('StockAdjustment', id);
    }

    Object.assign(adj, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return adj;
  }

  // --- Stock Counts ---
  public getStockCounts(ctx: TenantContext): DbStockCount[] {
    return this.data.stockCounts.filter((c) => c.companyId === ctx.companyId);
  }

  public getStockCountById(id: string, ctx: TenantContext): DbStockCount | undefined {
    const count = this.data.stockCounts.find((c) => c.id === id);
    if (count) this.assertTenantOwnership(count.companyId, ctx);
    return count;
  }

  public createStockCount(payload: Omit<DbStockCount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbStockCount {
    const count: DbStockCount = {
      ...payload,
      id: 'scnt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.stockCounts.push(count);
    this.saveData(this.data);
    return count;
  }

  public updateStockCount(id: string, payload: Partial<DbStockCount>, ctx: TenantContext): DbStockCount {
    const count = this.data.stockCounts.find((c) => c.id === id);
    if (!count) throw new Error(`Stock count '${id}' not found`);
    this.assertTenantOwnership(count.companyId, ctx);

    Object.assign(count, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return count;
  }

  // --- Sales Deliveries ---
  public getSalesDeliveries(ctx: TenantContext): DbSalesDelivery[] {
    return this.data.salesDeliveries.filter((d) => d.companyId === ctx.companyId);
  }

  public createSalesDelivery(payload: Omit<DbSalesDelivery, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSalesDelivery {
    const delivery: DbSalesDelivery = {
      ...payload,
      id: 'sdel-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.salesDeliveries.push(delivery);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_SALES_DELIVERY',
      entityType: 'SalesDelivery',
      entityId: delivery.id,
      details: `Recorded sales delivery '${delivery.deliveryNumber}' for customer '${delivery.customerId}'`,
      newState: delivery as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return delivery;
  }

  // --- Supplier Returns ---
  public getSupplierReturns(ctx: TenantContext): DbSupplierReturn[] {
    return this.data.supplierReturns.filter((r) => r.companyId === ctx.companyId);
  }

  public createSupplierReturn(payload: Omit<DbSupplierReturn, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSupplierReturn {
    const ret: DbSupplierReturn = {
      ...payload,
      id: 'sret-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.supplierReturns.push(ret);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_SUPPLIER_RETURN',
      entityType: 'SupplierReturn',
      entityId: ret.id,
      details: `Issued supplier return '${ret.returnNumber}' to supplier '${ret.supplierId}'`,
      newState: ret as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return ret;
  }

  public updateSupplierReturn(id: string, payload: Partial<DbSupplierReturn>, ctx: TenantContext): DbSupplierReturn {
    const ret = this.data.supplierReturns.find((r) => r.id === id);
    if (!ret) throw new Error(`Supplier Return '${id}' not found`);
    this.assertTenantOwnership(ret.companyId, ctx);

    Object.assign(ret, payload);
    this.saveData(this.data);
    return ret;
  }

  // --- Batch / Lot & Serial Tracking ---
  public getBatchLots(itemId: string | undefined, ctx: TenantContext): DbBatchLot[] {
    return this.data.batchLots.filter((b) => b.companyId === ctx.companyId && (!itemId || b.itemId === itemId));
  }

  public createBatchLot(payload: Omit<DbBatchLot, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbBatchLot {
    const batch: DbBatchLot = {
      ...payload,
      id: 'batch-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.batchLots.push(batch);
    this.saveData(this.data);
    return batch;
  }

  public getSerialNumbers(itemId: string | undefined, ctx: TenantContext): DbSerialNumber[] {
    return this.data.serialNumbers.filter((s) => s.companyId === ctx.companyId && (!itemId || s.itemId === itemId));
  }

  public createSerialNumber(payload: Omit<DbSerialNumber, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbSerialNumber {
    const serial: DbSerialNumber = {
      ...payload,
      id: 'ser-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.serialNumbers.push(serial);
    this.saveData(this.data);
    return serial;
  }

  // ============================================================================
  // Phase 8: Banking & Cash Management Repositories
  // ============================================================================

  // --- Bank Account Master ---
  public getBankAccounts(ctx: TenantContext): DbBankAccount[] {
    return this.data.bankAccounts.filter((b) => b.companyId === ctx.companyId);
  }

  public getBankAccountById(id: string, ctx: TenantContext): DbBankAccount | undefined {
    const acc = this.data.bankAccounts.find((b) => b.id === id);
    if (acc) this.assertTenantOwnership(acc.companyId, ctx);
    return acc;
  }

  public createBankAccount(
    payload: Omit<DbBankAccount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbBankAccount {
    const account: DbBankAccount = {
      ...payload,
      id: 'ba-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      currentBalance: payload.currentBalance || payload.openingBalance || '0.0000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.bankAccounts.push(account);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_BANK_ACCOUNT',
      entityType: 'BankAccount',
      entityId: account.id,
      details: `Registered bank account '${account.accountName}' (${account.bankName})`,
      newState: { ...account, accountNumber: '••••' + account.accountNumber.slice(-4) } as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return account;
  }

  public updateBankAccount(id: string, payload: Partial<DbBankAccount>, ctx: TenantContext): DbBankAccount {
    const acc = this.data.bankAccounts.find((b) => b.id === id);
    if (!acc) throw new Error(`Bank Account '${id}' not found`);
    this.assertTenantOwnership(acc.companyId, ctx);

    Object.assign(acc, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return acc;
  }

  // --- Cash Account Master ---
  public getCashAccounts(ctx: TenantContext): DbCashAccount[] {
    return this.data.cashAccounts.filter((c) => c.companyId === ctx.companyId);
  }

  public getCashAccountById(id: string, ctx: TenantContext): DbCashAccount | undefined {
    const acc = this.data.cashAccounts.find((c) => c.id === id);
    if (acc) this.assertTenantOwnership(acc.companyId, ctx);
    return acc;
  }

  public createCashAccount(
    payload: Omit<DbCashAccount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCashAccount {
    const account: DbCashAccount = {
      ...payload,
      id: 'ca-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      currentBalance: payload.currentBalance || payload.openingBalance || '0.0000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.cashAccounts.push(account);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_CASH_ACCOUNT',
      entityType: 'CashAccount',
      entityId: account.id,
      details: `Created cash account / drawer '${account.accountName}' (${account.cashAccountType})`,
      newState: account as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return account;
  }

  public updateCashAccount(id: string, payload: Partial<DbCashAccount>, ctx: TenantContext): DbCashAccount {
    const acc = this.data.cashAccounts.find((c) => c.id === id);
    if (!acc) throw new Error(`Cash Account '${id}' not found`);
    this.assertTenantOwnership(acc.companyId, ctx);

    Object.assign(acc, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return acc;
  }

  // --- Bank & Cash Transactions (Material Ledger) ---
  public getBankTransactions(bankAccountId: string | undefined, ctx: TenantContext): DbBankTransaction[] {
    return this.data.bankTransactions.filter(
      (t) => t.companyId === ctx.companyId && (!bankAccountId || t.bankAccountId === bankAccountId)
    );
  }

  public getBankTransactionById(id: string, ctx: TenantContext): DbBankTransaction | undefined {
    const tx = this.data.bankTransactions.find((t) => t.id === id);
    if (tx) this.assertTenantOwnership(tx.companyId, ctx);
    return tx;
  }

  public recordBankTransaction(
    payload: Omit<DbBankTransaction, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbBankTransaction {
    const tx: DbBankTransaction = {
      ...payload,
      id: 'btx-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdBy: ctx.userId,
      createdAt: new Date().toISOString(),
    };
    this.data.bankTransactions.push(tx);
    this.saveData(this.data);
    return tx;
  }

  public createBankTransaction(
    payload: Omit<DbBankTransaction, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbBankTransaction {
    return this.recordBankTransaction(payload, ctx);
  }

  public updateBankTransaction(id: string, payload: Partial<DbBankTransaction>, ctx: TenantContext): DbBankTransaction {
    const tx = this.data.bankTransactions.find((t) => t.id === id);
    if (!tx) throw new Error(`Bank transaction '${id}' not found`);
    this.assertTenantOwnership(tx.companyId, ctx);

    if (tx.status === 'posted' && (payload.amount !== undefined || payload.currency !== undefined || payload.debitCredit !== undefined)) {
      throw new ImmutableRecordError('BankTransaction', id);
    }

    Object.assign(tx, payload);
    this.saveData(this.data);
    return tx;
  }

  // --- Bank Transfers ---
  public getBankTransfers(ctx: TenantContext): DbBankTransfer[] {
    return this.data.bankTransfers.filter((t) => t.companyId === ctx.companyId);
  }

  public getBankTransferById(id: string, ctx: TenantContext): DbBankTransfer | undefined {
    const trf = this.data.bankTransfers.find((t) => t.id === id);
    if (trf) this.assertTenantOwnership(trf.companyId, ctx);
    return trf;
  }

  public createBankTransfer(
    payload: Omit<DbBankTransfer, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    ctx: TenantContext
  ): DbBankTransfer {
    const trf: DbBankTransfer = {
      ...payload,
      id: 'btrf-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdBy: ctx.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.bankTransfers.push(trf);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_BANK_TRANSFER',
      entityType: 'BankTransfer',
      entityId: trf.id,
      details: `Initiated transfer '${trf.transferNumber}' for ${trf.amount} ${trf.currency}`,
      newState: trf as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return trf;
  }

  public updateBankTransfer(id: string, payload: Partial<DbBankTransfer>, ctx: TenantContext): DbBankTransfer {
    const trf = this.data.bankTransfers.find((t) => t.id === id);
    if (!trf) throw new Error(`Bank transfer '${id}' not found`);
    this.assertTenantOwnership(trf.companyId, ctx);

    Object.assign(trf, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return trf;
  }

  // --- Bank Statements & Lines ---
  public getBankStatements(bankAccountId: string | undefined, ctx: TenantContext): DbBankStatement[] {
    return this.data.bankStatements.filter(
      (s) => s.companyId === ctx.companyId && (!bankAccountId || s.bankAccountId === bankAccountId)
    );
  }

  public getBankStatementById(id: string, ctx: TenantContext): DbBankStatement | undefined {
    const s = this.data.bankStatements.find((x) => x.id === id);
    if (s) this.assertTenantOwnership(s.companyId, ctx);
    return s;
  }

  public createBankStatement(
    payload: Omit<DbBankStatement, 'id' | 'companyId' | 'importedAt'>,
    ctx: TenantContext
  ): DbBankStatement {
    const stmt: DbBankStatement = {
      ...payload,
      id: 'stmt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      importedAt: new Date().toISOString(),
    };
    this.data.bankStatements.push(stmt);
    this.saveData(this.data);
    return stmt;
  }

  public updateBankStatement(id: string, payload: Partial<DbBankStatement>, ctx: TenantContext): DbBankStatement {
    const stmt = this.data.bankStatements.find((s) => s.id === id);
    if (!stmt) throw new Error(`Bank statement '${id}' not found`);
    this.assertTenantOwnership(stmt.companyId, ctx);

    Object.assign(stmt, payload);
    this.saveData(this.data);
    return stmt;
  }

  public getBankStatementLines(statementId: string | undefined, ctx: TenantContext): DbBankStatementLine[] {
    return this.data.bankStatementLines.filter(
      (l) => l.companyId === ctx.companyId && (!statementId || l.statementId === statementId)
    );
  }

  public createBankStatementLine(
    payload: Omit<DbBankStatementLine, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbBankStatementLine {
    const line: DbBankStatementLine = {
      ...payload,
      id: 'stl-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.bankStatementLines.push(line);
    this.saveData(this.data);
    return line;
  }

  public updateBankStatementLine(id: string, payload: Partial<DbBankStatementLine>, ctx: TenantContext): DbBankStatementLine {
    const line = this.data.bankStatementLines.find((l) => l.id === id);
    if (!line) throw new Error(`Statement line '${id}' not found`);
    this.assertTenantOwnership(line.companyId, ctx);

    Object.assign(line, payload);
    this.saveData(this.data);
    return line;
  }

  // --- Bank Reconciliations ---
  public getBankReconciliations(bankAccountId: string | undefined, ctx: TenantContext): DbBankReconciliation[] {
    return this.data.bankReconciliations.filter(
      (r) => r.companyId === ctx.companyId && (!bankAccountId || r.bankAccountId === bankAccountId)
    );
  }

  public getBankReconciliationById(id: string, ctx: TenantContext): DbBankReconciliation | undefined {
    const r = this.data.bankReconciliations.find((x) => x.id === id);
    if (r) this.assertTenantOwnership(r.companyId, ctx);
    return r;
  }

  public createBankReconciliation(
    payload: Omit<DbBankReconciliation, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbBankReconciliation {
    const rec: DbBankReconciliation = {
      ...payload,
      id: 'brec-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.bankReconciliations.push(rec);
    this.saveData(this.data);
    return rec;
  }

  public updateBankReconciliation(id: string, payload: Partial<DbBankReconciliation>, ctx: TenantContext): DbBankReconciliation {
    const rec = this.data.bankReconciliations.find((r) => r.id === id);
    if (!rec) throw new Error(`Bank reconciliation '${id}' not found`);
    this.assertTenantOwnership(rec.companyId, ctx);

    Object.assign(rec, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return rec;
  }

  // --- Cash Physical Counts & Reconciliations ---
  public getCashCounts(cashAccountId: string | undefined, ctx: TenantContext): DbCashCount[] {
    return this.data.cashCounts.filter(
      (c) => c.companyId === ctx.companyId && (!cashAccountId || c.cashAccountId === cashAccountId)
    );
  }

  public getCashCountById(id: string, ctx: TenantContext): DbCashCount | undefined {
    const c = this.data.cashCounts.find((x) => x.id === id);
    if (c) this.assertTenantOwnership(c.companyId, ctx);
    return c;
  }

  public createCashCount(
    payload: Omit<DbCashCount, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCashCount {
    const count: DbCashCount = {
      ...payload,
      id: 'ccnt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.cashCounts.push(count);
    this.saveData(this.data);
    return count;
  }

  public updateCashCount(id: string, payload: Partial<DbCashCount>, ctx: TenantContext): DbCashCount {
    const count = this.data.cashCounts.find((c) => c.id === id);
    if (!count) throw new Error(`Cash count '${id}' not found`);
    this.assertTenantOwnership(count.companyId, ctx);

    Object.assign(count, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return count;
  }

  // --- Payment Methods ---
  public getPaymentMethods(ctx: TenantContext): DbPaymentMethod[] {
    return this.data.paymentMethods.filter((p) => p.companyId === ctx.companyId);
  }

  public createPaymentMethod(
    payload: Omit<DbPaymentMethod, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbPaymentMethod {
    const pm: DbPaymentMethod = {
      ...payload,
      id: 'pm-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.paymentMethods.push(pm);
    this.saveData(this.data);
    return pm;
  }

  // --- Cheque Register ---
  public getCheques(ctx: TenantContext): DbCheque[] {
    return this.data.cheques.filter((c) => c.companyId === ctx.companyId);
  }

  public getChequeById(id: string, ctx: TenantContext): DbCheque | undefined {
    const chq = this.data.cheques.find((c) => c.id === id);
    if (chq) this.assertTenantOwnership(chq.companyId, ctx);
    return chq;
  }

  public createCheque(payload: Omit<DbCheque, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbCheque {
    const chq: DbCheque = {
      ...payload,
      id: 'chq-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.cheques.push(chq);
    this.saveData(this.data);
    return chq;
  }

  public updateCheque(id: string, payload: Partial<DbCheque>, ctx: TenantContext): DbCheque {
    const chq = this.data.cheques.find((c) => c.id === id);
    if (!chq) throw new Error(`Cheque '${id}' not found`);
    this.assertTenantOwnership(chq.companyId, ctx);

    Object.assign(chq, payload);
    this.saveData(this.data);
    return chq;
  }

  // ==========================================================================
  // Phase 9: Fixed Assets & Asset Accounting Storage Methods
  // ==========================================================================

  // --- Asset Categories ---
  public getAssetCategories(ctx: TenantContext): DbAssetCategory[] {
    return this.data.assetCategories.filter((c) => c.companyId === ctx.companyId);
  }

  public getAssetCategoryById(id: string, ctx: TenantContext): DbAssetCategory | undefined {
    const cat = this.data.assetCategories.find((c) => c.id === id);
    if (cat) this.assertTenantOwnership(cat.companyId, ctx);
    return cat;
  }

  public createAssetCategory(
    payload: Omit<DbAssetCategory, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbAssetCategory {
    const cat: DbAssetCategory = {
      ...payload,
      id: 'cat-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.assetCategories.push(cat);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_ASSET_CATEGORY',
      entityType: 'AssetCategory',
      entityId: cat.id,
      details: `Created fixed asset category '${cat.code}' - ${cat.name}`,
      newState: cat as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return cat;
  }

  public updateAssetCategory(id: string, payload: Partial<DbAssetCategory>, ctx: TenantContext): DbAssetCategory {
    const cat = this.data.assetCategories.find((c) => c.id === id);
    if (!cat) throw new Error(`Asset category '${id}' not found`);
    this.assertTenantOwnership(cat.companyId, ctx);

    Object.assign(cat, payload);
    this.saveData(this.data);
    return cat;
  }

  // --- Fixed Assets ---
  public getFixedAssets(ctx: TenantContext): DbFixedAsset[] {
    return this.data.fixedAssets.filter((a) => a.companyId === ctx.companyId);
  }

  public getFixedAssetById(id: string, ctx: TenantContext): DbFixedAsset | undefined {
    const asset = this.data.fixedAssets.find((a) => a.id === id);
    if (asset) this.assertTenantOwnership(asset.companyId, ctx);
    return asset;
  }

  public createFixedAsset(
    payload: Omit<DbFixedAsset, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'accumulatedDepreciation' | 'accumulatedImpairment' | 'netBookValue'> & {
      accumulatedDepreciation?: string;
      accumulatedImpairment?: string;
      netBookValue?: string;
    },
    ctx: TenantContext
  ): DbFixedAsset {
    const accumDep = payload.accumulatedDepreciation || '0.0000';
    const accumImp = payload.accumulatedImpairment || '0.0000';
    const cost = parseFloat(payload.originalCost) || 0;
    const nbv = payload.netBookValue || (cost - parseFloat(accumDep) - parseFloat(accumImp)).toFixed(4);

    const asset: DbFixedAsset = {
      ...payload,
      id: 'fa-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      accumulatedDepreciation: accumDep,
      accumulatedImpairment: accumImp,
      netBookValue: nbv,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.fixedAssets.push(asset);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_FIXED_ASSET',
      entityType: 'FixedAsset',
      entityId: asset.id,
      details: `Registered fixed asset '${asset.assetCode}' - ${asset.name} (Cost: $${asset.originalCost} ${asset.currency})`,
      newState: asset as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return asset;
  }

  public updateFixedAsset(id: string, payload: Partial<DbFixedAsset>, ctx: TenantContext): DbFixedAsset {
    const asset = this.data.fixedAssets.find((a) => a.id === id);
    if (!asset) throw new Error(`Fixed asset '${id}' not found`);
    this.assertTenantOwnership(asset.companyId, ctx);

    // Guard: Modifying an already disposed or written off asset
    if ((asset.status === 'disposed' || asset.status === 'written_off') && payload.status === undefined) {
      throw new ImmutableRecordError('FixedAsset', id);
    }

    Object.assign(asset, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return asset;
  }

  // --- Depreciation Schedules ---
  public getDepreciationSchedules(assetId: string | undefined, ctx: TenantContext): DbDepreciationScheduleLine[] {
    return this.data.depreciationSchedules.filter(
      (s) => s.companyId === ctx.companyId && (!assetId || s.assetId === assetId)
    );
  }

  public createDepreciationScheduleLine(
    payload: Omit<DbDepreciationScheduleLine, 'id' | 'companyId'>,
    ctx: TenantContext
  ): DbDepreciationScheduleLine {
    const line: DbDepreciationScheduleLine = {
      ...payload,
      id: 'ds-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
    };
    this.data.depreciationSchedules.push(line);
    this.saveData(this.data);
    return line;
  }

  public updateDepreciationScheduleLine(
    id: string,
    payload: Partial<DbDepreciationScheduleLine>,
    ctx: TenantContext
  ): DbDepreciationScheduleLine {
    const line = this.data.depreciationSchedules.find((s) => s.id === id);
    if (!line) throw new Error(`Depreciation schedule line '${id}' not found`);
    this.assertTenantOwnership(line.companyId, ctx);

    Object.assign(line, payload);
    this.saveData(this.data);
    return line;
  }

  public deleteDepreciationScheduleForAsset(assetId: string, ctx: TenantContext): void {
    const beforeCount = this.data.depreciationSchedules.length;
    this.data.depreciationSchedules = this.data.depreciationSchedules.filter(
      (s) => !(s.companyId === ctx.companyId && s.assetId === assetId && !s.isPosted)
    );
    if (this.data.depreciationSchedules.length !== beforeCount) {
      this.saveData(this.data);
    }
  }

  // --- Depreciation Runs ---
  public getDepreciationRuns(ctx: TenantContext): DbDepreciationRun[] {
    return this.data.depreciationRuns.filter((r) => r.companyId === ctx.companyId);
  }

  public getDepreciationRunById(id: string, ctx: TenantContext): DbDepreciationRun | undefined {
    const run = this.data.depreciationRuns.find((r) => r.id === id);
    if (run) this.assertTenantOwnership(run.companyId, ctx);
    return run;
  }

  public createDepreciationRun(
    payload: Omit<DbDepreciationRun, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbDepreciationRun {
    const run: DbDepreciationRun = {
      ...payload,
      id: 'drun-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.depreciationRuns.push(run);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_DEPRECIATION_RUN',
      entityType: 'DepreciationRun',
      entityId: run.id,
      details: `Created depreciation run '${run.runNumber}' for period '${run.periodId}' (${run.totalAssetsCount} assets, total $${run.totalDepreciationAmount})`,
      newState: run as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return run;
  }

  public updateDepreciationRun(
    id: string,
    payload: Partial<DbDepreciationRun>,
    ctx: TenantContext
  ): DbDepreciationRun {
    const run = this.data.depreciationRuns.find((r) => r.id === id);
    if (!run) throw new Error(`Depreciation run '${id}' not found`);
    this.assertTenantOwnership(run.companyId, ctx);

    if (run.status === 'posted' && payload.status === undefined) {
      throw new ImmutableRecordError('DepreciationRun', id);
    }

    Object.assign(run, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return run;
  }

  // --- Asset Transfers ---
  public getAssetTransfers(assetId: string | undefined, ctx: TenantContext): DbAssetTransfer[] {
    return this.data.assetTransfers.filter(
      (t) => t.companyId === ctx.companyId && (!assetId || t.assetId === assetId)
    );
  }

  public createAssetTransfer(
    payload: Omit<DbAssetTransfer, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbAssetTransfer {
    const trf: DbAssetTransfer = {
      ...payload,
      id: 'atrf-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.assetTransfers.push(trf);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'TRANSFER_FIXED_ASSET',
      entityType: 'AssetTransfer',
      entityId: trf.id,
      details: `Executed asset transfer '${trf.transferNumber}' for asset '${trf.assetId}' (Reason: ${trf.reason || 'Relocation'})`,
      newState: trf as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return trf;
  }

  // --- Asset Impairments ---
  public getAssetImpairments(assetId: string | undefined, ctx: TenantContext): DbAssetImpairment[] {
    return this.data.assetImpairments.filter(
      (i) => i.companyId === ctx.companyId && (!assetId || i.assetId === assetId)
    );
  }

  public createAssetImpairment(
    payload: Omit<DbAssetImpairment, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbAssetImpairment {
    const imp: DbAssetImpairment = {
      ...payload,
      id: 'imp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.assetImpairments.push(imp);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'IMPAIR_FIXED_ASSET',
      entityType: 'AssetImpairment',
      entityId: imp.id,
      details: `Recorded impairment '${imp.impairmentNumber}' on asset '${imp.assetId}' for $${imp.impairmentAmount}`,
      newState: imp as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return imp;
  }

  public updateAssetImpairment(
    id: string,
    payload: Partial<DbAssetImpairment>,
    ctx: TenantContext
  ): DbAssetImpairment {
    const imp = this.data.assetImpairments.find((i) => i.id === id);
    if (!imp) throw new Error(`Asset impairment '${id}' not found`);
    this.assertTenantOwnership(imp.companyId, ctx);

    Object.assign(imp, payload);
    this.saveData(this.data);
    return imp;
  }

  // --- Asset Disposals ---
  public getAssetDisposals(assetId: string | undefined, ctx: TenantContext): DbAssetDisposal[] {
    return this.data.assetDisposals.filter(
      (d) => d.companyId === ctx.companyId && (!assetId || d.assetId === assetId)
    );
  }

  public createAssetDisposal(
    payload: Omit<DbAssetDisposal, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbAssetDisposal {
    const disp: DbAssetDisposal = {
      ...payload,
      id: 'disp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.assetDisposals.push(disp);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'DISPOSE_FIXED_ASSET',
      entityType: 'AssetDisposal',
      entityId: disp.id,
      details: `Processed disposal '${disp.disposalNumber}' for asset '${disp.assetId}' (Proceeds: $${disp.disposalProceeds}, Gain/Loss: $${disp.gainLossAmount})`,
      newState: disp as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return disp;
  }

  public updateAssetDisposal(
    id: string,
    payload: Partial<DbAssetDisposal>,
    ctx: TenantContext
  ): DbAssetDisposal {
    const disp = this.data.assetDisposals.find((d) => d.id === id);
    if (!disp) throw new Error(`Asset disposal '${id}' not found`);
    this.assertTenantOwnership(disp.companyId, ctx);

    Object.assign(disp, payload);
    this.saveData(this.data);
    return disp;
  }

  // ==========================================================================
  // PHASE 10: HR, EMPLOYEE & PAYROLL REPOSITORIES
  // ==========================================================================

  // --- HR Designation Master ---
  public getDesignations(ctx: TenantContext, departmentId?: string): DbDesignation[] {
    return this.data.designations.filter((d) => {
      if (d.companyId !== ctx.companyId) return false;
      if (departmentId && d.departmentId !== departmentId) return false;
      return true;
    });
  }

  public getDesignationById(id: string, ctx: TenantContext): DbDesignation | undefined {
    const des = this.data.designations.find((d) => d.id === id);
    if (des) this.assertTenantOwnership(des.companyId, ctx);
    return des;
  }

  public createDesignation(
    payload: Omit<DbDesignation, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbDesignation {
    const des: DbDesignation = {
      ...payload,
      id: 'des-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      status: payload.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.designations.push(des);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_DESIGNATION',
      entityType: 'Designation',
      entityId: des.id,
      details: `Created HR designation '${des.name}' (${des.code})`,
      newState: des as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return des;
  }

  public updateDesignation(
    id: string,
    payload: Partial<DbDesignation>,
    ctx: TenantContext
  ): DbDesignation {
    const des = this.data.designations.find((d) => d.id === id);
    if (!des) throw new Error(`Designation '${id}' not found`);
    this.assertTenantOwnership(des.companyId, ctx);
    Object.assign(des, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return des;
  }

  public deleteDesignation(id: string, ctx: TenantContext): boolean {
    const idx = this.data.designations.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    const des = this.data.designations[idx];
    this.assertTenantOwnership(des.companyId, ctx);
    this.data.designations.splice(idx, 1);
    this.saveData(this.data);
    return true;
  }

  // --- Employee Master ---
  public getEmployees(ctx: TenantContext): DbEmployee[] {
    return this.data.employees.filter((e) => e.companyId === ctx.companyId);
  }

  public getEmployeeById(id: string, ctx: TenantContext): DbEmployee | undefined {
    const emp = this.data.employees.find((e) => e.id === id);
    if (emp) this.assertTenantOwnership(emp.companyId, ctx);
    return emp;
  }

  public createEmployee(
    payload: Omit<DbEmployee, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbEmployee {
    const emp: DbEmployee = {
      ...payload,
      id: 'emp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.employees.push(emp);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: emp.id,
      details: `Created employee '${emp.employeeCode}' - ${emp.fullName} (${emp.jobTitle || emp.designation || 'Staff'})`,
      newState: emp as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return emp;
  }

  public createEmployeeWithSystemUser(
    payload: Omit<DbEmployee, 'id' | 'companyId' | 'createdAt' | 'updatedAt'> & {
      createSystemUser?: boolean;
      userCredentials?: {
        username?: string;
        email?: string;
        password?: string;
        roleId?: string;
      };
    },
    ctx: TenantContext
  ): { employee: DbEmployee; user?: DbUser } {
    let systemUserId: string | undefined;
    let systemRoleId: string | undefined;
    let createdUser: DbUser | undefined;

    if (payload.createSystemUser && payload.userCredentials) {
      const email = payload.userCredentials.email || payload.email;
      if (!email) throw new Error('Email is required to create a system user.');
      
      const newUserId = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      createdUser = {
        id: newUserId,
        username: payload.userCredentials.username || email.split('@')[0],
        email,
        fullName: payload.fullName,
        passwordHash: payload.userCredentials.password ? `argon2:$${payload.userCredentials.password}$` : 'seeded_hash',
        password: payload.userCredentials.password,
        isPlatformSuperAdmin: false,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      this.data.users.push(createdUser);

      systemUserId = createdUser.id;
      systemRoleId = payload.userCredentials.roleId || 'role-junior-clerk';

      this.data.memberships.push({
        id: 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        userId: createdUser.id,
        companyId: ctx.companyId,
        roleId: systemRoleId,
        branchId: payload.branchId,
        isPrimaryCompany: true,
        createdAt: new Date().toISOString(),
      });
    }

    const employeePayload = { ...payload };
    delete (employeePayload as any).createSystemUser;
    delete (employeePayload as any).userCredentials;

    const emp: DbEmployee = {
      ...employeePayload,
      id: 'emp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      hasSystemAccess: !!systemUserId,
      systemUserId,
      systemRoleId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.employees.push(emp);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: emp.id,
      details: `Created employee '${emp.employeeCode}' - ${emp.fullName} (${emp.jobTitle || emp.designation || 'Staff'})${systemUserId ? ' with ERP user access' : ''}`,
      newState: emp as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return { employee: emp, user: createdUser };
  }

  public updateEmployee(
    id: string,
    payload: Partial<DbEmployee>,
    ctx: TenantContext
  ): DbEmployee {
    const emp = this.data.employees.find((e) => e.id === id);
    if (!emp) throw new Error(`Employee '${id}' not found`);
    this.assertTenantOwnership(emp.companyId, ctx);

    Object.assign(emp, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return emp;
  }

  // --- Salary Components ---
  public getSalaryComponents(ctx: TenantContext): DbSalaryComponent[] {
    return this.data.salaryComponents.filter((sc) => sc.companyId === ctx.companyId);
  }

  public getSalaryComponentById(id: string, ctx: TenantContext): DbSalaryComponent | undefined {
    const sc = this.data.salaryComponents.find((c) => c.id === id);
    if (sc) this.assertTenantOwnership(sc.companyId, ctx);
    return sc;
  }

  public createSalaryComponent(
    payload: Omit<DbSalaryComponent, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbSalaryComponent {
    const comp: DbSalaryComponent = {
      ...payload,
      id: 'sc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.salaryComponents.push(comp);
    this.saveData(this.data);
    return comp;
  }

  public updateSalaryComponent(
    id: string,
    payload: Partial<DbSalaryComponent>,
    ctx: TenantContext
  ): DbSalaryComponent {
    const comp = this.data.salaryComponents.find((c) => c.id === id);
    if (!comp) throw new Error(`Salary component '${id}' not found`);
    this.assertTenantOwnership(comp.companyId, ctx);

    Object.assign(comp, payload);
    this.saveData(this.data);
    return comp;
  }

  // --- Salary Structures ---
  public getSalaryStructures(ctx: TenantContext): DbSalaryStructure[] {
    return this.data.salaryStructures.filter((ss) => ss.companyId === ctx.companyId);
  }

  public getSalaryStructureById(id: string, ctx: TenantContext): DbSalaryStructure | undefined {
    const ss = this.data.salaryStructures.find((s) => s.id === id);
    if (ss) this.assertTenantOwnership(ss.companyId, ctx);
    return ss;
  }

  public createSalaryStructure(
    payload: Omit<DbSalaryStructure, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbSalaryStructure {
    const ss: DbSalaryStructure = {
      ...payload,
      id: 'ss-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.salaryStructures.push(ss);
    this.saveData(this.data);
    return ss;
  }

  public updateSalaryStructure(
    id: string,
    payload: Partial<DbSalaryStructure>,
    ctx: TenantContext
  ): DbSalaryStructure {
    const ss = this.data.salaryStructures.find((s) => s.id === id);
    if (!ss) throw new Error(`Salary structure '${id}' not found`);
    this.assertTenantOwnership(ss.companyId, ctx);

    Object.assign(ss, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return ss;
  }

  // --- Attendance Records ---
  public getAttendanceRecords(
    ctx: TenantContext,
    date?: string,
    employeeId?: string
  ): DbAttendanceRecord[] {
    return this.data.attendanceRecords.filter((a) => {
      if (a.companyId !== ctx.companyId) return false;
      if (date && a.attendanceDate !== date) return false;
      if (employeeId && a.employeeId !== employeeId) return false;
      return true;
    });
  }

  public createAttendanceRecord(
    payload: Omit<DbAttendanceRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbAttendanceRecord {
    // Check if record already exists for this employee on this date
    const existingIndex = this.data.attendanceRecords.findIndex(
      (a) => a.companyId === ctx.companyId && a.employeeId === payload.employeeId && a.attendanceDate === payload.attendanceDate
    );

    if (existingIndex >= 0) {
      const existing = this.data.attendanceRecords[existingIndex];
      Object.assign(existing, payload, { updatedAt: new Date().toISOString() });
      this.saveData(this.data);
      return existing;
    }

    const att: DbAttendanceRecord = {
      ...payload,
      id: 'att-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.attendanceRecords.push(att);
    this.saveData(this.data);
    return att;
  }

  public updateAttendanceRecord(
    id: string,
    payload: Partial<DbAttendanceRecord>,
    ctx: TenantContext
  ): DbAttendanceRecord {
    const att = this.data.attendanceRecords.find((a) => a.id === id);
    if (!att) throw new Error(`Attendance record '${id}' not found`);
    this.assertTenantOwnership(att.companyId, ctx);

    Object.assign(att, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return att;
  }

  // --- Leave Management ---
  public getLeaveTypes(ctx: TenantContext): DbLeaveType[] {
    return this.data.leaveTypes.filter((lt) => lt.companyId === ctx.companyId);
  }

  public getLeaveTypeById(id: string, ctx: TenantContext): DbLeaveType | undefined {
    const lt = this.data.leaveTypes.find((l) => l.id === id);
    if (lt) this.assertTenantOwnership(lt.companyId, ctx);
    return lt;
  }

  public createLeaveType(
    payload: Omit<DbLeaveType, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbLeaveType {
    const lt: DbLeaveType = {
      ...payload,
      id: 'lt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.leaveTypes.push(lt);
    this.saveData(this.data);
    return lt;
  }

  public updateLeaveType(
    id: string,
    payload: Partial<DbLeaveType>,
    ctx: TenantContext
  ): DbLeaveType {
    const lt = this.data.leaveTypes.find((l) => l.id === id);
    if (!lt) throw new Error(`Leave type '${id}' not found`);
    this.assertTenantOwnership(lt.companyId, ctx);

    Object.assign(lt, payload);
    this.saveData(this.data);
    return lt;
  }

  public getLeaveBalances(employeeId: string, ctx: TenantContext): DbLeaveBalance[] {
    return this.data.leaveBalances.filter(
      (lb) => lb.companyId === ctx.companyId && lb.employeeId === employeeId
    );
  }

  public getLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    ctx: TenantContext
  ): DbLeaveBalance | undefined {
    return this.data.leaveBalances.find(
      (lb) => lb.companyId === ctx.companyId && lb.employeeId === employeeId && lb.leaveTypeId === leaveTypeId && lb.year === year
    );
  }

  public upsertLeaveBalance(
    payload: Omit<DbLeaveBalance, 'id' | 'companyId' | 'updatedAt'>,
    ctx: TenantContext
  ): DbLeaveBalance {
    const existing = this.data.leaveBalances.find(
      (lb) => lb.companyId === ctx.companyId && lb.employeeId === payload.employeeId && lb.leaveTypeId === payload.leaveTypeId && lb.year === payload.year
    );

    if (existing) {
      Object.assign(existing, payload, { updatedAt: new Date().toISOString() });
      this.saveData(this.data);
      return existing;
    }

    const lb: DbLeaveBalance = {
      ...payload,
      id: 'lb-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      updatedAt: new Date().toISOString(),
    };
    this.data.leaveBalances.push(lb);
    this.saveData(this.data);
    return lb;
  }

  public getLeaveRequests(ctx: TenantContext, employeeId?: string): DbLeaveRequest[] {
    return this.data.leaveRequests.filter(
      (lr) => lr.companyId === ctx.companyId && (!employeeId || lr.employeeId === employeeId)
    );
  }

  public getLeaveRequestById(id: string, ctx: TenantContext): DbLeaveRequest | undefined {
    const lr = this.data.leaveRequests.find((r) => r.id === id);
    if (lr) this.assertTenantOwnership(lr.companyId, ctx);
    return lr;
  }

  public createLeaveRequest(
    payload: Omit<DbLeaveRequest, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbLeaveRequest {
    const req: DbLeaveRequest = {
      ...payload,
      id: 'lr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.leaveRequests.push(req);
    this.saveData(this.data);
    return req;
  }

  public updateLeaveRequest(
    id: string,
    payload: Partial<DbLeaveRequest>,
    ctx: TenantContext
  ): DbLeaveRequest {
    const req = this.data.leaveRequests.find((r) => r.id === id);
    if (!req) throw new Error(`Leave request '${id}' not found`);
    this.assertTenantOwnership(req.companyId, ctx);

    Object.assign(req, payload);
    this.saveData(this.data);
    return req;
  }

  // --- Payroll Periods & Entries ---
  public getPayrollPeriods(ctx: TenantContext): DbPayrollPeriod[] {
    return this.data.payrollPeriods.filter((p) => p.companyId === ctx.companyId);
  }

  public getPayrollPeriodById(id: string, ctx: TenantContext): DbPayrollPeriod | undefined {
    const p = this.data.payrollPeriods.find((item) => item.id === id);
    if (p) this.assertTenantOwnership(p.companyId, ctx);
    return p;
  }

  public createPayrollPeriod(
    payload: Omit<DbPayrollPeriod, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbPayrollPeriod {
    const period: DbPayrollPeriod = {
      ...payload,
      id: 'pp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.payrollPeriods.push(period);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PAYROLL_PERIOD',
      entityType: 'PayrollPeriod',
      entityId: period.id,
      details: `Created payroll period '${period.periodName}' (${period.periodCode})`,
      newState: period as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return period;
  }

  public updatePayrollPeriod(
    id: string,
    payload: Partial<DbPayrollPeriod>,
    ctx: TenantContext
  ): DbPayrollPeriod {
    const period = this.data.payrollPeriods.find((p) => p.id === id);
    if (!period) throw new Error(`Payroll period '${id}' not found`);
    this.assertTenantOwnership(period.companyId, ctx);

    // Guard: Modifying an already closed, posted, or paid period back to processing/pending
    if (
      (period.status === 'posted' || period.status === 'paid' || period.status === 'closed') &&
      ((payload.status as string) === 'draft' || payload.status === 'processing' || payload.status === 'pending_approval')
    ) {
      throw new ImmutableRecordError('PayrollPeriod', id);
    }

    Object.assign(period, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return period;
  }

  public getPayrollEntries(periodId: string, ctx: TenantContext): DbPayrollEntry[] {
    return this.data.payrollEntries.filter(
      (e) => e.companyId === ctx.companyId && e.payrollPeriodId === periodId
    );
  }

  public createPayrollEntry(
    payload: Omit<DbPayrollEntry, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbPayrollEntry {
    const entry: DbPayrollEntry = {
      ...payload,
      id: 'pe-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.payrollEntries.push(entry);
    this.saveData(this.data);
    return entry;
  }

  public deletePayrollEntriesForPeriod(periodId: string, ctx: TenantContext): void {
    this.data.payrollEntries = this.data.payrollEntries.filter(
      (e) => !(e.companyId === ctx.companyId && e.payrollPeriodId === periodId)
    );
    this.saveData(this.data);
  }

  // --- Employee Advances ---
  public getEmployeeAdvances(ctx: TenantContext, employeeId?: string): DbEmployeeAdvance[] {
    return this.data.employeeAdvances.filter(
      (ea) => ea.companyId === ctx.companyId && (!employeeId || ea.employeeId === employeeId)
    );
  }

  public getEmployeeAdvanceById(id: string, ctx: TenantContext): DbEmployeeAdvance | undefined {
    const ea = this.data.employeeAdvances.find((a) => a.id === id);
    if (ea) this.assertTenantOwnership(ea.companyId, ctx);
    return ea;
  }

  public createEmployeeAdvance(
    payload: Omit<DbEmployeeAdvance, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbEmployeeAdvance {
    const adv: DbEmployeeAdvance = {
      ...payload,
      id: 'adv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.employeeAdvances.push(adv);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_EMPLOYEE_ADVANCE',
      entityType: 'EmployeeAdvance',
      entityId: adv.id,
      details: `Created staff advance '${adv.advanceNumber}' for employee '${adv.employeeId}' ($${adv.principalAmount})`,
      newState: adv as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return adv;
  }

  public updateEmployeeAdvance(
    id: string,
    payload: Partial<DbEmployeeAdvance>,
    ctx: TenantContext
  ): DbEmployeeAdvance {
    const adv = this.data.employeeAdvances.find((a) => a.id === id);
    if (!adv) throw new Error(`Employee advance '${id}' not found`);
    this.assertTenantOwnership(adv.companyId, ctx);

    Object.assign(adv, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return adv;
  }

  // --- Final Settlements ---
  public getFinalSettlements(ctx: TenantContext, employeeId?: string): DbFinalSettlement[] {
    return this.data.finalSettlements.filter(
      (fs) => fs.companyId === ctx.companyId && (!employeeId || fs.employeeId === employeeId)
    );
  }

  public getFinalSettlementById(id: string, ctx: TenantContext): DbFinalSettlement | undefined {
    const fs = this.data.finalSettlements.find((s) => s.id === id);
    if (fs) this.assertTenantOwnership(fs.companyId, ctx);
    return fs;
  }

  public createFinalSettlement(
    payload: Omit<DbFinalSettlement, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbFinalSettlement {
    const fs: DbFinalSettlement = {
      ...payload,
      id: 'fs-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.finalSettlements.push(fs);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_FINAL_SETTLEMENT',
      entityType: 'FinalSettlement',
      entityId: fs.id,
      details: `Processed final settlement '${fs.settlementNumber}' for employee '${fs.employeeId}' (Net: $${fs.netSettlementAmount})`,
      newState: fs as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return fs;
  }

  public updateFinalSettlement(
    id: string,
    payload: Partial<DbFinalSettlement>,
    ctx: TenantContext
  ): DbFinalSettlement {
    const fs = this.data.finalSettlements.find((s) => s.id === id);
    if (!fs) throw new Error(`Final settlement '${id}' not found`);
    this.assertTenantOwnership(fs.companyId, ctx);

    Object.assign(fs, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return fs;
  }

  // ==========================================================================
  // Phase 11: Tax & VAT Management Engine Repositories
  // ==========================================================================

  // --- Tax Jurisdictions ---
  public getTaxJurisdictions(ctx: TenantContext): DbTaxJurisdiction[] {
    return this.data.taxJurisdictions.filter((tj) => tj.companyId === ctx.companyId);
  }

  public getTaxJurisdictionById(id: string, ctx: TenantContext): DbTaxJurisdiction | undefined {
    const tj = this.data.taxJurisdictions.find((j) => j.id === id);
    if (tj) this.assertTenantOwnership(tj.companyId, ctx);
    return tj;
  }

  public createTaxJurisdiction(
    payload: Omit<DbTaxJurisdiction, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbTaxJurisdiction {
    const tj: DbTaxJurisdiction = {
      ...payload,
      id: 'tj-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taxJurisdictions.push(tj);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_TAX_JURISDICTION',
      entityType: 'TaxJurisdiction',
      entityId: tj.id,
      details: `Configured tax jurisdiction '${tj.code}' (${tj.name})`,
      newState: tj as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return tj;
  }

  public updateTaxJurisdiction(
    id: string,
    payload: Partial<DbTaxJurisdiction>,
    ctx: TenantContext
  ): DbTaxJurisdiction {
    const tj = this.data.taxJurisdictions.find((j) => j.id === id);
    if (!tj) throw new Error(`Tax jurisdiction '${id}' not found`);
    this.assertTenantOwnership(tj.companyId, ctx);

    Object.assign(tj, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return tj;
  }

  // --- Tax Registrations ---
  public getTaxRegistrations(ctx: TenantContext, jurisdictionId?: string): DbTaxRegistration[] {
    return this.data.taxRegistrations.filter(
      (tr) => tr.companyId === ctx.companyId && (!jurisdictionId || tr.jurisdictionId === jurisdictionId)
    );
  }

  public createTaxRegistration(
    payload: Omit<DbTaxRegistration, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbTaxRegistration {
    const reg: DbTaxRegistration = {
      ...payload,
      id: 'tr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taxRegistrations.push(reg);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_TAX_REGISTRATION',
      entityType: 'TaxRegistration',
      entityId: reg.id,
      details: `Created tax registration '${reg.registrationNumber}' (${reg.registrationType})`,
      newState: reg as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return reg;
  }

  public updateTaxRegistration(
    id: string,
    payload: Partial<DbTaxRegistration>,
    ctx: TenantContext
  ): DbTaxRegistration {
    const reg = this.data.taxRegistrations.find((r) => r.id === id);
    if (!reg) throw new Error(`Tax registration '${id}' not found`);
    this.assertTenantOwnership(reg.companyId, ctx);

    Object.assign(reg, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return reg;
  }

  // --- Tax Types ---
  public getTaxTypes(ctx: TenantContext): DbTaxType[] {
    return this.data.taxTypes.filter((tt) => tt.companyId === ctx.companyId);
  }

  public createTaxType(
    payload: Omit<DbTaxType, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbTaxType {
    const tt: DbTaxType = {
      ...payload,
      id: 'tt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taxTypes.push(tt);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_TAX_TYPE',
      entityType: 'TaxType',
      entityId: tt.id,
      details: `Created tax type '${tt.code}' (${tt.name})`,
      newState: tt as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return tt;
  }

  public updateTaxType(
    id: string,
    payload: Partial<DbTaxType>,
    ctx: TenantContext
  ): DbTaxType {
    const tt = this.data.taxTypes.find((t) => t.id === id);
    if (!tt) throw new Error(`Tax type '${id}' not found`);
    this.assertTenantOwnership(tt.companyId, ctx);

    Object.assign(tt, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return tt;
  }

  // --- Tax Ledger Sub-Ledger Entries ---
  public getTaxLedgerEntries(
    ctx: TenantContext,
    filters?: {
      jurisdictionId?: string;
      direction?: 'output' | 'input' | 'both';
      taxPeriodId?: string;
      startDate?: string;
      endDate?: string;
      sourceModule?: string;
      taxCodeId?: string;
    }
  ): DbTaxLedgerEntry[] {
    return this.data.taxLedgerEntries.filter((entry) => {
      if (entry.companyId !== ctx.companyId) return false;
      if (filters?.jurisdictionId && entry.jurisdictionId !== filters.jurisdictionId) return false;
      if (filters?.direction && filters.direction !== 'both' && entry.direction !== filters.direction) return false;
      if (filters?.taxPeriodId && entry.taxPeriodId !== filters.taxPeriodId) return false;
      if (filters?.startDate && entry.transactionDate < filters.startDate) return false;
      if (filters?.endDate && entry.transactionDate > filters.endDate) return false;
      if (filters?.sourceModule && entry.sourceModule !== filters.sourceModule) return false;
      if (filters?.taxCodeId && entry.taxCodeId !== filters.taxCodeId) return false;
      return true;
    });
  }

  public createTaxLedgerEntry(
    payload: Omit<DbTaxLedgerEntry, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbTaxLedgerEntry {
    const entry: DbTaxLedgerEntry = {
      ...payload,
      id: 'tle-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.taxLedgerEntries.push(entry);
    this.saveData(this.data);
    return entry;
  }

  // --- Tax Periods ---
  public getTaxPeriods(ctx: TenantContext, jurisdictionId?: string): DbTaxPeriod[] {
    return this.data.taxPeriods.filter(
      (tp) => tp.companyId === ctx.companyId && (!jurisdictionId || tp.jurisdictionId === jurisdictionId)
    );
  }

  public getTaxPeriodById(id: string, ctx: TenantContext): DbTaxPeriod | undefined {
    const tp = this.data.taxPeriods.find((p) => p.id === id);
    if (tp) this.assertTenantOwnership(tp.companyId, ctx);
    return tp;
  }

  public createTaxPeriod(
    payload: Omit<DbTaxPeriod, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbTaxPeriod {
    const tp: DbTaxPeriod = {
      ...payload,
      id: 'tp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taxPeriods.push(tp);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_TAX_PERIOD',
      entityType: 'TaxPeriod',
      entityId: tp.id,
      details: `Created tax period '${tp.periodCode}' (${tp.startDate} to ${tp.endDate})`,
      newState: tp as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return tp;
  }

  public updateTaxPeriod(
    id: string,
    payload: Partial<DbTaxPeriod>,
    ctx: TenantContext
  ): DbTaxPeriod {
    const tp = this.data.taxPeriods.find((p) => p.id === id);
    if (!tp) throw new Error(`Tax period '${id}' not found`);
    this.assertTenantOwnership(tp.companyId, ctx);

    Object.assign(tp, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return tp;
  }

  // --- Tax Returns ---
  public getTaxReturns(ctx: TenantContext, jurisdictionId?: string): DbTaxReturn[] {
    return this.data.taxReturns.filter(
      (tr) => tr.companyId === ctx.companyId && (!jurisdictionId || tr.jurisdictionId === jurisdictionId)
    );
  }

  public getTaxReturnById(id: string, ctx: TenantContext): DbTaxReturn | undefined {
    const tr = this.data.taxReturns.find((r) => r.id === id);
    if (tr) this.assertTenantOwnership(tr.companyId, ctx);
    return tr;
  }

  public createTaxReturn(
    payload: Omit<DbTaxReturn, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbTaxReturn {
    const tr: DbTaxReturn = {
      ...payload,
      id: 'tret-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taxReturns.push(tr);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_TAX_RETURN',
      entityType: 'TaxReturn',
      entityId: tr.id,
      details: `Prepared tax return '${tr.returnNumber}' (Net Tax: $${tr.netTaxPayableOrRefundable})`,
      newState: tr as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return tr;
  }

  public updateTaxReturn(
    id: string,
    payload: Partial<DbTaxReturn>,
    ctx: TenantContext
  ): DbTaxReturn {
    const tr = this.data.taxReturns.find((r) => r.id === id);
    if (!tr) throw new Error(`Tax return '${id}' not found`);
    this.assertTenantOwnership(tr.companyId, ctx);

    // Guard: Cannot alter filed/closed tax return back to draft/prepared
    if (
      (tr.status === 'filed' || tr.status === 'closed') &&
      (payload.status === 'draft' || payload.status === 'prepared' || payload.status === 'reviewed')
    ) {
      throw new ImmutableRecordError('TaxReturn', id);
    }

    const prev = { ...tr };
    Object.assign(tr, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_TAX_RETURN',
      entityType: 'TaxReturn',
      entityId: tr.id,
      details: `Updated tax return '${tr.returnNumber}' status to '${tr.status}'`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: tr as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return tr;
  }

  // --- Tax Adjustments ---
  public getTaxAdjustments(ctx: TenantContext, jurisdictionId?: string): DbTaxAdjustment[] {
    return this.data.taxAdjustments.filter(
      (adj) => adj.companyId === ctx.companyId && (!jurisdictionId || adj.jurisdictionId === jurisdictionId)
    );
  }

  public getTaxAdjustmentById(id: string, ctx: TenantContext): DbTaxAdjustment | undefined {
    const adj = this.data.taxAdjustments.find((a) => a.id === id);
    if (adj) this.assertTenantOwnership(adj.companyId, ctx);
    return adj;
  }

  public createTaxAdjustment(
    payload: Omit<DbTaxAdjustment, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbTaxAdjustment {
    const adj: DbTaxAdjustment = {
      ...payload,
      id: 'tadj-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taxAdjustments.push(adj);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_TAX_ADJUSTMENT',
      entityType: 'TaxAdjustment',
      entityId: adj.id,
      details: `Created tax adjustment '${adj.adjustmentNumber}' ($${adj.amount} - ${adj.direction})`,
      newState: adj as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return adj;
  }

  public updateTaxAdjustment(
    id: string,
    payload: Partial<DbTaxAdjustment>,
    ctx: TenantContext
  ): DbTaxAdjustment {
    const adj = this.data.taxAdjustments.find((a) => a.id === id);
    if (!adj) throw new Error(`Tax adjustment '${id}' not found`);
    this.assertTenantOwnership(adj.companyId, ctx);

    // Guard: Cannot alter posted adjustment back to draft
    if (adj.status === 'posted' && payload.status === 'draft') {
      throw new ImmutableRecordError('TaxAdjustment', id);
    }

    const prev = { ...adj };
    Object.assign(adj, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_TAX_ADJUSTMENT',
      entityType: 'TaxAdjustment',
      entityId: adj.id,
      details: `Updated tax adjustment '${adj.adjustmentNumber}' status to '${adj.status}'`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: adj as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return adj;
  }

  // --------------------------------------------------------------------------
  // Phase 12: Project Management & Project Accounting
  // --------------------------------------------------------------------------

  // --- Project Types ---
  public getProjectTypes(ctx?: TenantContext): DbProjectType[] {
    if (!ctx || ctx.isPlatformAdmin) return [...this.data.projectTypes];
    return this.data.projectTypes.filter((pt) => !pt.companyId || pt.companyId === ctx.companyId);
  }

  public getProjectTypeById(id: string, ctx?: TenantContext): DbProjectType | undefined {
    const pt = this.data.projectTypes.find((t) => t.id === id);
    if (pt && pt.companyId && ctx) this.assertTenantOwnership(pt.companyId, ctx);
    return pt;
  }

  public createProjectType(
    payload: Omit<DbProjectType, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbProjectType {
    const pt: DbProjectType = {
      ...payload,
      id: 'pt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.projectTypes.push(pt);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PROJECT_TYPE',
      entityType: 'ProjectType',
      entityId: pt.id,
      details: `Created project type '${pt.name}' (${pt.code})`,
      newState: pt as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return pt;
  }

  public updateProjectType(
    id: string,
    payload: Partial<DbProjectType>,
    ctx: TenantContext
  ): DbProjectType {
    const pt = this.data.projectTypes.find((t) => t.id === id);
    if (!pt) throw new Error(`Project type '${id}' not found`);
    if (pt.companyId) this.assertTenantOwnership(pt.companyId, ctx);

    const prev = { ...pt };
    Object.assign(pt, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_PROJECT_TYPE',
      entityType: 'ProjectType',
      entityId: pt.id,
      details: `Updated project type '${pt.name}'`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: pt as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return pt;
  }

  // --- Project Master ---
  public getProjects(ctx: TenantContext): DbProject[] {
    return this.data.projects.filter((p) => p.companyId === ctx.companyId);
  }

  public getProjectById(id: string, ctx: TenantContext): DbProject | undefined {
    const p = this.data.projects.find((proj) => proj.id === id);
    if (p) this.assertTenantOwnership(p.companyId, ctx);
    return p;
  }

  public createProject(
    payload: Omit<DbProject, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbProject {
    const proj: DbProject = {
      ...payload,
      id: 'proj-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.projects.push(proj);

    // Initialize WIP balance tracker for project
    const defaultWipAcc = payload.wipAccountId || 'a-1350';
    this.data.projectWipBalances.push({
      id: 'wip-' + proj.id,
      companyId: ctx.companyId,
      projectId: proj.id,
      accumulatedCost: '0.0000',
      capitalizedAmount: '0.0000',
      transferredToCogs: '0.0000',
      currentWipBalance: '0.0000',
      wipAccountId: defaultWipAcc,
      lastUpdatedAt: new Date().toISOString(),
    });

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PROJECT',
      entityType: 'Project',
      entityId: proj.id,
      details: `Created project '${proj.name}' (${proj.code}) with billing method '${proj.billingMethod}'`,
      newState: proj as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return proj;
  }

  public updateProject(
    id: string,
    payload: Partial<DbProject>,
    ctx: TenantContext
  ): DbProject {
    const proj = this.data.projects.find((p) => p.id === id);
    if (!proj) throw new Error(`Project '${id}' not found`);
    this.assertTenantOwnership(proj.companyId, ctx);

    const prev = { ...proj };
    Object.assign(proj, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_PROJECT',
      entityType: 'Project',
      entityId: proj.id,
      details: `Updated project '${proj.name}' (${proj.code})`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: proj as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return proj;
  }

  public deleteProject(id: string, ctx: TenantContext): void {
    const proj = this.data.projects.find((p) => p.id === id);
    if (!proj) throw new Error(`Project '${id}' not found`);
    this.assertTenantOwnership(proj.companyId, ctx);

    // Immutability rule: Cannot delete project with historical transactions
    const hasCosts = this.data.projectCosts.some((c) => c.projectId === id);
    const hasRevenues = this.data.projectRevenues.some((r) => r.projectId === id);
    const hasMilestones = this.data.projectMilestones.some((m) => m.projectId === id);
    const hasTasks = this.data.projectTasks.some((t) => t.projectId === id);

    if (hasCosts || hasRevenues || hasMilestones || hasTasks) {
      throw new ImmutableRecordError('Project', id);
    }

    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this.data.projectWipBalances = this.data.projectWipBalances.filter((w) => w.projectId !== id);

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'DELETE_PROJECT',
      entityType: 'Project',
      entityId: id,
      details: `Deleted project '${proj.name}' (${proj.code})`,
    });
    this.saveData(this.data);
  }

  // --- Project Budgets ---
  public getProjectBudgets(ctx: TenantContext, projectId?: string): DbProjectBudget[] {
    return this.data.projectBudgets.filter(
      (b) => b.companyId === ctx.companyId && (!projectId || b.projectId === projectId)
    );
  }

  public getProjectBudgetById(id: string, ctx: TenantContext): DbProjectBudget | undefined {
    const b = this.data.projectBudgets.find((bg) => bg.id === id);
    if (b) this.assertTenantOwnership(b.companyId, ctx);
    return b;
  }

  public createProjectBudget(
    payload: Omit<DbProjectBudget, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbProjectBudget {
    const budget: DbProjectBudget = {
      ...payload,
      id: 'bg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.projectBudgets.push(budget);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PROJECT_BUDGET',
      entityType: 'ProjectBudget',
      entityId: budget.id,
      details: `Created budget '${budget.budgetName}' (v${budget.versionNumber}) for project '${budget.projectId}' ($${budget.totalBudgetAmount})`,
      newState: budget as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return budget;
  }

  public updateProjectBudget(
    id: string,
    payload: Partial<DbProjectBudget>,
    ctx: TenantContext
  ): DbProjectBudget {
    const budget = this.data.projectBudgets.find((b) => b.id === id);
    if (!budget) throw new Error(`Project budget '${id}' not found`);
    this.assertTenantOwnership(budget.companyId, ctx);

    // Guard: Approved budgets cannot be silently changed back to draft without revision
    if (budget.status === 'approved' && payload.status === 'draft') {
      throw new ImmutableRecordError('ProjectBudget', id);
    }

    const prev = { ...budget };
    Object.assign(budget, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_PROJECT_BUDGET',
      entityType: 'ProjectBudget',
      entityId: budget.id,
      details: `Updated project budget '${budget.budgetName}' status to '${budget.status}'`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: budget as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return budget;
  }

  // --- Project Budget Lines ---
  public getProjectBudgetLines(budgetId: string, ctx: TenantContext): DbProjectBudgetLine[] {
    return this.data.projectBudgetLines.filter(
      (l) => l.companyId === ctx.companyId && l.budgetId === budgetId
    );
  }

  public createProjectBudgetLine(
    payload: Omit<DbProjectBudgetLine, 'id' | 'companyId'>,
    ctx: TenantContext
  ): DbProjectBudgetLine {
    const line: DbProjectBudgetLine = {
      ...payload,
      id: 'bgl-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
    };
    this.data.projectBudgetLines.push(line);
    this.saveData(this.data);
    return line;
  }

  public deleteProjectBudgetLine(lineId: string, ctx: TenantContext): void {
    const line = this.data.projectBudgetLines.find((l) => l.id === lineId);
    if (!line) return;
    this.assertTenantOwnership(line.companyId, ctx);
    this.data.projectBudgetLines = this.data.projectBudgetLines.filter((l) => l.id !== lineId);
    this.saveData(this.data);
  }

  // --- Project Tasks ---
  public getProjectTasks(ctx: TenantContext, projectId?: string): DbProjectTask[] {
    return this.data.projectTasks.filter(
      (t) => t.companyId === ctx.companyId && (!projectId || t.projectId === projectId)
    );
  }

  public getProjectTaskById(id: string, ctx: TenantContext): DbProjectTask | undefined {
    const t = this.data.projectTasks.find((task) => task.id === id);
    if (t) this.assertTenantOwnership(t.companyId, ctx);
    return t;
  }

  public createProjectTask(
    payload: Omit<DbProjectTask, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbProjectTask {
    const task: DbProjectTask = {
      ...payload,
      id: 'tsk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.projectTasks.push(task);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PROJECT_TASK',
      entityType: 'ProjectTask',
      entityId: task.id,
      details: `Created task '${task.taskName}' (${task.taskCode}) for project '${task.projectId}'`,
      newState: task as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return task;
  }

  public updateProjectTask(
    id: string,
    payload: Partial<DbProjectTask>,
    ctx: TenantContext
  ): DbProjectTask {
    const task = this.data.projectTasks.find((t) => t.id === id);
    if (!task) throw new Error(`Project task '${id}' not found`);
    this.assertTenantOwnership(task.companyId, ctx);

    const prev = { ...task };
    Object.assign(task, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_PROJECT_TASK',
      entityType: 'ProjectTask',
      entityId: task.id,
      details: `Updated task '${task.taskName}' (${task.status})`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: task as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return task;
  }

  public deleteProjectTask(id: string, ctx: TenantContext): void {
    const task = this.data.projectTasks.find((t) => t.id === id);
    if (!task) throw new Error(`Project task '${id}' not found`);
    this.assertTenantOwnership(task.companyId, ctx);

    this.data.projectTasks = this.data.projectTasks.filter((t) => t.id !== id);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'DELETE_PROJECT_TASK',
      entityType: 'ProjectTask',
      entityId: id,
      details: `Deleted task '${task.taskName}'`,
    });
    this.saveData(this.data);
  }

  // --- Project Costs ---
  public getProjectCosts(ctx: TenantContext, projectId?: string): DbProjectCost[] {
    return this.data.projectCosts.filter(
      (c) => c.companyId === ctx.companyId && (!projectId || c.projectId === projectId)
    );
  }

  public getProjectCostById(id: string, ctx: TenantContext): DbProjectCost | undefined {
    const c = this.data.projectCosts.find((cost) => cost.id === id);
    if (c) this.assertTenantOwnership(c.companyId, ctx);
    return c;
  }

  public createProjectCost(
    payload: Omit<DbProjectCost, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbProjectCost {
    const cost: DbProjectCost = {
      ...payload,
      id: 'pcst-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.projectCosts.push(cost);

    // Update WIP accumulation balance for this project
    const wip = this.getProjectWipBalance(cost.projectId, ctx);
    if (wip) {
      const newAcc = (parseFloat(wip.accumulatedCost) + parseFloat(cost.baseAmount)).toFixed(4);
      const newBal = (parseFloat(wip.currentWipBalance) + parseFloat(cost.baseAmount)).toFixed(4);
      this.updateProjectWipBalance(cost.projectId, {
        accumulatedCost: newAcc,
        currentWipBalance: newBal,
      }, ctx);
    }

    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'RECORD_PROJECT_COST',
      entityType: 'ProjectCost',
      entityId: cost.id,
      details: `Recorded project cost of $${cost.amount} ${cost.currency} (${cost.costCategory}) via ${cost.sourceModule}:${cost.sourceType}`,
      newState: cost as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return cost;
  }

  public updateProjectCost(
    id: string,
    payload: Partial<DbProjectCost>,
    ctx: TenantContext
  ): DbProjectCost {
    const cost = this.data.projectCosts.find((c) => c.id === id);
    if (!cost) throw new Error(`Project cost '${id}' not found`);
    this.assertTenantOwnership(cost.companyId, ctx);

    Object.assign(cost, payload);
    this.saveData(this.data);
    return cost;
  }

  // --- Project Revenues ---
  public getProjectRevenues(ctx: TenantContext, projectId?: string): DbProjectRevenue[] {
    return this.data.projectRevenues.filter(
      (r) => r.companyId === ctx.companyId && (!projectId || r.projectId === projectId)
    );
  }

  public createProjectRevenue(
    payload: Omit<DbProjectRevenue, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbProjectRevenue {
    const rev: DbProjectRevenue = {
      ...payload,
      id: 'prev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.projectRevenues.push(rev);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'RECORD_PROJECT_REVENUE',
      entityType: 'ProjectRevenue',
      entityId: rev.id,
      details: `Recorded project revenue of $${rev.amount} ${rev.currency} via ${rev.sourceModule}`,
      newState: rev as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return rev;
  }

  // --- Project Milestones ---
  public getProjectMilestones(ctx: TenantContext, projectId?: string): DbProjectMilestone[] {
    return this.data.projectMilestones.filter(
      (m) => m.companyId === ctx.companyId && (!projectId || m.projectId === projectId)
    );
  }

  public getProjectMilestoneById(id: string, ctx: TenantContext): DbProjectMilestone | undefined {
    const m = this.data.projectMilestones.find((milestone) => milestone.id === id);
    if (m) this.assertTenantOwnership(m.companyId, ctx);
    return m;
  }

  public createProjectMilestone(
    payload: Omit<DbProjectMilestone, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbProjectMilestone {
    const milestone: DbProjectMilestone = {
      ...payload,
      id: 'ms-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.projectMilestones.push(milestone);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PROJECT_MILESTONE',
      entityType: 'ProjectMilestone',
      entityId: milestone.id,
      details: `Created milestone #${milestone.milestoneNumber} '${milestone.name}' ($${milestone.amount}) for project '${milestone.projectId}'`,
      newState: milestone as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return milestone;
  }

  public updateProjectMilestone(
    id: string,
    payload: Partial<DbProjectMilestone>,
    ctx: TenantContext
  ): DbProjectMilestone {
    const m = this.data.projectMilestones.find((ms) => ms.id === id);
    if (!m) throw new Error(`Project milestone '${id}' not found`);
    this.assertTenantOwnership(m.companyId, ctx);

    const prev = { ...m };
    Object.assign(m, payload, { updatedAt: new Date().toISOString() });
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_PROJECT_MILESTONE',
      entityType: 'ProjectMilestone',
      entityId: m.id,
      details: `Updated project milestone '${m.name}' status to '${m.status}'`,
      previousState: prev as unknown as Record<string, unknown>,
      newState: m as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return m;
  }

  // --- Project WIP Balances ---
  public getProjectWipBalance(projectId: string, ctx: TenantContext): DbProjectWipBalance {
    let wip = this.data.projectWipBalances.find(
      (w) => w.companyId === ctx.companyId && w.projectId === projectId
    );
    if (!wip) {
      wip = {
        id: 'wip-' + projectId,
        companyId: ctx.companyId,
        projectId,
        accumulatedCost: '0.0000',
        capitalizedAmount: '0.0000',
        transferredToCogs: '0.0000',
        currentWipBalance: '0.0000',
        wipAccountId: 'a-1350',
        lastUpdatedAt: new Date().toISOString(),
      };
      this.data.projectWipBalances.push(wip);
      this.saveData(this.data);
    }
    return wip;
  }

  public updateProjectWipBalance(
    projectId: string,
    payload: Partial<DbProjectWipBalance>,
    ctx: TenantContext
  ): DbProjectWipBalance {
    const wip = this.getProjectWipBalance(projectId, ctx);
    Object.assign(wip, payload, { lastUpdatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return wip;
  }

  // --- Project Cost Allocations ---
  public getProjectCostAllocations(ctx: TenantContext, projectId?: string): DbProjectCostAllocation[] {
    return this.data.projectCostAllocations.filter(
      (a) => a.companyId === ctx.companyId && (!projectId || a.projectId === projectId)
    );
  }

  public createProjectCostAllocation(
    payload: Omit<DbProjectCostAllocation, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbProjectCostAllocation {
    const alloc: DbProjectCostAllocation = {
      ...payload,
      id: 'palloc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.projectCostAllocations.push(alloc);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'ALLOCATE_PROJECT_COST',
      entityType: 'ProjectCostAllocation',
      entityId: alloc.id,
      details: `Executed cost allocation of $${alloc.allocatedAmount} to project '${alloc.projectId}' (${alloc.allocationType})`,
      newState: alloc as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return alloc;
  }

  // ==========================================================================
  // PHASE 15 — Company Onboarding & Business Configuration Methods
  // ==========================================================================

  public getCompanyProfile(companyId: string, ctx?: TenantContext): DbCompanyProfile | undefined {
    if (ctx && !ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Access denied to company profile for company '${companyId}'`);
    }
    return this.data.companyProfiles.find((p) => p.companyId === companyId);
  }

  public ensureCompanyProfile(companyId?: string): DbCompanyProfile {
    const validCompId = companyId || (this.data.companies[0]?.id) || 'comp-default';
    let profile = this.data.companyProfiles.find((p) => p.companyId === validCompId);
    if (!profile) {
      const company = this.getCompanyById(validCompId);
      const isEnterprise = company?.tier === 'enterprise';
      const isMedium = company?.tier === 'medium';

      profile = {
        id: 'prof-' + validCompId.slice(0, 8),
        companyId: validCompId,
        businessTypes: ['trading', 'services'],
        sellingCategories: ['physical_products', 'services'],
        buyingCategories: ['finished_goods', 'services'],
        inventoryConfig: {
          maintainsInventory: true,
          allowNegativeStock: false,
          enableMultipleWarehouses: isEnterprise || isMedium,
          enableStorageLocations: isEnterprise,
          enableStockTransfers: true,
          enableStockCount: true,
          enableStockAdjustments: true,
          enableBatchLotTracking: isEnterprise,
          enableSerialNumberTracking: isEnterprise,
          enableExpiryDateTracking: isEnterprise,
          enableBarcodeSku: true,
          enableReorderLevelAlerts: true,
          defaultCostingMethod: 'WEIGHTED_AVG',
        },
        salesWorkflow: {
          enableQuotation: true,
          enableSalesOrder: true,
          enableSalesInvoice: true,
          enableDeliveryNote: true,
          enableCustomerPayment: true,
          enableCreditNote: true,
          enableDebitNote: true,
          enableDiscounts: true,
          enableSalesCommission: isEnterprise,
          enableCustomerCreditLimit: true,
          enablePartialPayments: true,
          enablePaymentProofVerification: true,
        },
        purchaseWorkflow: {
          enablePurchaseRequest: true,
          enableRfq: true,
          enableSupplierQuotation: true,
          enablePurchaseOrder: true,
          enableGoodsReceipt: true,
          enableServiceReceipt: true,
          enableSupplierBill: true,
          enableThreeWayMatch: true,
          enableSupplierPayment: true,
          enablePurchaseCreditNote: true,
          enablePurchaseDebitNote: true,
        },
        accountingDefaults: {
          enableMultiCurrency: isEnterprise || isMedium,
          enableTaxVat: true,
          taxRegistrationNumber: company?.taxIdentifier || 'VAT-DEFAULT-001',
          taxInclusivePricing: false,
          defaultTaxRatePercent: '5.00',
        },
        timeZone: 'UTC',
        fiscalYearStartMonth: 1,
        dateFormat: 'YYYY-MM-DD',
        numberFormat: '1,234.56',
        defaultLanguage: 'en',
        onboardingStatus: 'completed',
        onboardingCompletedAt: company?.createdAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.companyProfiles.push(profile);
      this.saveData(this.data);
    }
    return profile;
  }

  public updateCompanyProfile(
    companyId: string,
    payload: Partial<DbCompanyProfile>,
    ctx: TenantContext
  ): DbCompanyProfile {
    if (!ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Cannot update company profile for company '${companyId}'`);
    }
    const profile = this.ensureCompanyProfile(companyId);
    const oldState = { ...profile };
    Object.assign(profile, payload, { updatedAt: new Date().toISOString() });

    this.logAudit({
      companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_COMPANY_PROFILE',
      entityType: 'CompanyProfile',
      entityId: profile.id,
      details: `Updated business configuration for company '${companyId}'`,
      previousState: oldState as unknown as Record<string, unknown>,
      newState: profile as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return profile;
  }

  // --- UOM Conversions ---
  public getUomConversions(companyId: string, ctx?: TenantContext): DbUomConversion[] {
    if (ctx && !ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Access denied to UOM conversions for company '${companyId}'`);
    }
    return this.data.uomConversions.filter((c) => c.companyId === companyId);
  }

  public createUomConversion(
    payload: Omit<DbUomConversion, 'id' | 'createdAt'>,
    ctx: TenantContext
  ): DbUomConversion {
    if (!ctx.isPlatformAdmin && ctx.companyId !== payload.companyId) {
      throw new TenantViolationError(`Cannot create UOM conversion for foreign company '${payload.companyId}'`);
    }
    const multNum = parseFloat(payload.multiplier);
    if (isNaN(multNum) || multNum <= 0) {
      throw new Error(`UOM conversion multiplier must be a positive number greater than 0. Received '${payload.multiplier}'`);
    }

    const conversion: DbUomConversion = {
      ...payload,
      id: 'conv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.uomConversions.push(conversion);

    this.logAudit({
      companyId: payload.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_UOM_CONVERSION',
      entityType: 'UomConversion',
      entityId: conversion.id,
      details: `Created conversion: 1 ${payload.fromUomCode} = ${payload.multiplier} ${payload.toUomCode}`,
      newState: conversion as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return conversion;
  }

  public deleteUomConversion(id: string, companyId: string, ctx: TenantContext): boolean {
    if (!ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Cannot delete UOM conversion for company '${companyId}'`);
    }
    const idx = this.data.uomConversions.findIndex((c) => c.id === id && c.companyId === companyId);
    if (idx === -1) return false;

    const removed = this.data.uomConversions.splice(idx, 1)[0];
    this.logAudit({
      companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'DELETE_UOM_CONVERSION',
      entityType: 'UomConversion',
      entityId: id,
      details: `Deleted conversion between ${removed.fromUomCode} and ${removed.toUomCode}`,
      previousState: removed as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return true;
  }

  // --- Product Attributes ---
  public getProductAttributes(companyId: string, ctx?: TenantContext): DbProductAttribute[] {
    if (ctx && !ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Access denied to product attributes for company '${companyId}'`);
    }
    return this.data.productAttributes
      .filter((a) => a.companyId === companyId)
      .sort((a, b) => a.order - b.order);
  }

  public createProductAttribute(
    payload: Omit<DbProductAttribute, 'id' | 'createdAt'>,
    ctx: TenantContext
  ): DbProductAttribute {
    if (!ctx.isPlatformAdmin && ctx.companyId !== payload.companyId) {
      throw new TenantViolationError(`Cannot create product attribute for company '${payload.companyId}'`);
    }
    const attr: DbProductAttribute = {
      ...payload,
      id: 'attr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    this.data.productAttributes.push(attr);

    this.logAudit({
      companyId: payload.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PRODUCT_ATTRIBUTE',
      entityType: 'ProductAttribute',
      entityId: attr.id,
      details: `Registered product attribute '${attr.label}' (${attr.attributeKey})`,
      newState: attr as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return attr;
  }

  public updateProductAttribute(
    id: string,
    payload: Partial<DbProductAttribute>,
    ctx: TenantContext
  ): DbProductAttribute {
    const attr = this.data.productAttributes.find((a) => a.id === id);
    if (!attr) throw new Error(`Product attribute '${id}' not found.`);
    if (!ctx.isPlatformAdmin && ctx.companyId !== attr.companyId) {
      throw new TenantViolationError(`Cannot update product attribute for company '${attr.companyId}'`);
    }

    Object.assign(attr, payload);
    this.saveData(this.data);
    return attr;
  }

  public deleteProductAttribute(id: string, companyId: string, ctx: TenantContext): boolean {
    if (!ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Cannot delete product attribute for company '${companyId}'`);
    }
    const idx = this.data.productAttributes.findIndex((a) => a.id === id && a.companyId === companyId);
    if (idx === -1) return false;

    this.data.productAttributes.splice(idx, 1);
    this.saveData(this.data);
    return true;
  }

  // --- Company Role Configs ---
  public getCompanyRoleConfigs(companyId: string, ctx?: TenantContext): DbCompanyRoleConfig[] {
    if (ctx && !ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Access denied to role configurations for company '${companyId}'`);
    }
    return this.data.companyRoleConfigs.filter((r) => r.companyId === companyId);
  }

  public updateCompanyRoleConfigs(companyId: string, configs: DbCompanyRoleConfig[], ctx: TenantContext): void {
    if (!ctx.isPlatformAdmin && ctx.companyId !== companyId) {
      throw new TenantViolationError(`Cannot update role configurations for company '${companyId}'`);
    }
    this.data.companyRoleConfigs = this.data.companyRoleConfigs.filter((r) => r.companyId !== companyId);
    this.data.companyRoleConfigs.push(...configs);
    this.saveData(this.data);
  }

  // --- Onboarding Drafts ---
  public getOnboardingDrafts(createdById?: string): DbOnboardingDraft[] {
    return this.data.onboardingDrafts.filter((d) => !createdById || d.createdById === createdById);
  }

  public getOnboardingDraftById(id: string): DbOnboardingDraft | undefined {
    return this.data.onboardingDrafts.find((d) => d.id === id);
  }

  public saveOnboardingDraft(payload: {
    id?: string;
    draftName: string;
    currentStep: number;
    payload: FullCompanyOnboardingPayload;
    createdById: string;
  }): DbOnboardingDraft {
    let draft: DbOnboardingDraft;
    if (payload.id) {
      const existing = this.data.onboardingDrafts.find((d) => d.id === payload.id);
      if (existing) {
        existing.draftName = payload.draftName;
        existing.currentStep = payload.currentStep;
        existing.payload = payload.payload;
        existing.updatedAt = new Date().toISOString();
        draft = existing;
      } else {
        draft = {
          id: payload.id,
          draftName: payload.draftName,
          currentStep: payload.currentStep,
          payload: payload.payload,
          createdById: payload.createdById,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.data.onboardingDrafts.push(draft);
      }
    } else {
      draft = {
        id: 'draft-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
        draftName: payload.draftName || `${payload.payload.name || 'Untitled Company'} (Draft)`,
        currentStep: payload.currentStep,
        payload: payload.payload,
        createdById: payload.createdById,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.onboardingDrafts.push(draft);
    }

    this.saveData(this.data);
    return draft;
  }

  public deleteOnboardingDraft(id: string): boolean {
    const idx = this.data.onboardingDrafts.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    this.data.onboardingDrafts.splice(idx, 1);
    this.saveData(this.data);
    return true;
  }

  // --- Complete Atomic Company Onboarding & Activation ---
  public createCompanyWithFullOnboarding(
    payload: FullCompanyOnboardingPayload,
    _adminUserId: string,
    ctx: TenantContext
  ): { company: DbCompany; adminUser: DbUser; profile: DbCompanyProfile } {
    if (!ctx.isPlatformAdmin) {
      throw new TenantViolationError('Only Platform VVIP Super Admin is authorized to provision and onboard customer companies.');
    }

    // 1. Validation Checks
    if (!payload.name || !payload.name.trim()) {
      throw new Error('Company Name is mandatory.');
    }
    if (!payload.code || !payload.code.trim()) {
      throw new Error('Company Short Code is mandatory.');
    }
    const cleanCode = payload.code.trim().toUpperCase();
    if (this.data.companies.some((c) => c.code === cleanCode)) {
      throw new Error(`Company code '${cleanCode}' is already registered. Please choose a unique short code.`);
    }

    // 2. Instantiate Company Entity
    const newCompanyId = 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const newCompany: DbCompany = {
      id: newCompanyId,
      code: cleanCode,
      accessCode: (payload.accessCode?.trim() || cleanCode).toUpperCase(),
      name: payload.name.trim(),
      legalName: payload.legalName?.trim() || payload.name.trim(),
      countryCode: payload.countryCode || 'US',
      industry: payload.businessTypes.join(' + ') || 'General Commercial Business',
      tier: payload.tier || 'enterprise',
      baseCurrency: payload.baseCurrency || 'USD',
      taxIdentifier: payload.taxIdentifier || payload.accountingDefaults?.taxRegistrationNumber || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.companies.push(newCompany);

    // 3. Instantiate Branches
    const hqBranchId = 'b-' + newCompanyId + '-hq';
    if (payload.branches && payload.branches.length > 0) {
      for (const b of payload.branches) {
        if (b.isHeadquarters || b.code === 'HQ' || b.code === 'MAIN') {
          this.data.branches.push({
            id: hqBranchId,
            companyId: newCompanyId,
            code: b.code.toUpperCase(),
            name: b.name,
            addressLine1: b.address || payload.addressLine1 || '',
            city: payload.city || '',
            countryCode: payload.countryCode || 'US',
            isHeadquarters: true,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        } else {
          this.data.branches.push({
            id: 'b-' + newCompanyId + '-' + b.code.toLowerCase(),
            companyId: newCompanyId,
            code: b.code.toUpperCase(),
            name: b.name,
            addressLine1: b.address || '',
            city: payload.city || '',
            countryCode: payload.countryCode || 'US',
            isHeadquarters: false,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else {
      this.data.branches.push({
        id: hqBranchId,
        companyId: newCompanyId,
        code: 'HQ',
        name: `${payload.name} Corporate HQ`,
        addressLine1: payload.addressLine1 || '',
        city: payload.city || '',
        countryCode: payload.countryCode || 'US',
        isHeadquarters: true,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Instantiate Fiscal Year and 12 Monthly Accounting Periods
    const currentYear = new Date().getFullYear();
    const fyId = `fy-${currentYear}-${newCompanyId}`;
    const startMonth = payload.fiscalYearStartMonth || 1;
    const startMonthStr = startMonth.toString().padStart(2, '0');
    
    this.data.fiscalYears.push({
      id: fyId,
      companyId: newCompanyId,
      name: `FY-${currentYear}`,
      startDate: `${currentYear}-${startMonthStr}-01`,
      endDate: `${currentYear + (startMonth > 1 ? 1 : 0)}-${((startMonth + 11) % 12 || 12).toString().padStart(2, '0')}-28`,
      isClosed: false,
      createdAt: new Date().toISOString(),
    });

    for (let i = 1; i <= 12; i++) {
      const monthNum = ((startMonth + i - 2) % 12) + 1;
      const yr = startMonth + i - 2 >= 12 ? currentYear + 1 : currentYear;
      const monthStr = monthNum.toString().padStart(2, '0');
      const lastDay = new Date(yr, monthNum, 0).getDate();
      this.data.accountingPeriods.push({
        id: `p-${newCompanyId}-${i.toString().padStart(2, '0')}`,
        companyId: newCompanyId,
        fiscalYearId: fyId,
        periodNumber: i,
        name: `Period ${i} (${yr}-${monthStr})`,
        startDate: `${yr}-${monthStr}-01`,
        endDate: `${yr}-${monthStr}-${lastDay}`,
        status: 'open',
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Instantiate Chart of Accounts
    for (const g of INITIAL_ACCOUNT_GROUPS) {
      this.data.accountGroups.push({
        ...g,
        id: `g-${newCompanyId}-${g.code}`,
        companyId: newCompanyId,
      });
    }

    for (const acc of INITIAL_ACCOUNTS) {
      this.data.accounts.push({
        ...acc,
        id: `a-${newCompanyId}-${acc.code}`,
        companyId: newCompanyId,
        groupId: `g-${newCompanyId}-${acc.code.slice(0, 1)}000`,
        currency: payload.baseCurrency || 'USD',
      });
    }

    // 6. Instantiate Departments & Cost Centers
    if (payload.departments && payload.departments.length > 0) {
      for (const d of payload.departments) {
        this.data.departments.push({
          id: 'dept-' + newCompanyId + '-' + d.code.toLowerCase(),
          companyId: newCompanyId,
          code: d.code.toUpperCase(),
          name: d.name,
          description: d.description || '',
          branchId: hqBranchId,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Default initial departments
      this.data.departments.push(
        { id: 'dept-' + newCompanyId + '-ops', companyId: newCompanyId, code: 'OPS', name: 'Operations', branchId: hqBranchId, status: 'active', createdAt: new Date().toISOString() },
        { id: 'dept-' + newCompanyId + '-fin', companyId: newCompanyId, code: 'FIN', name: 'Finance & Accounting', branchId: hqBranchId, status: 'active', createdAt: new Date().toISOString() },
        { id: 'dept-' + newCompanyId + '-sales', companyId: newCompanyId, code: 'SALES', name: 'Sales & Business Dev', branchId: hqBranchId, status: 'active', createdAt: new Date().toISOString() }
      );
    }

    if (payload.costCenters && payload.costCenters.length > 0) {
      for (const cc of payload.costCenters) {
        this.data.costCenters.push({
          id: 'cc-' + newCompanyId + '-' + cc.code.toLowerCase(),
          companyId: newCompanyId,
          code: cc.code.toUpperCase(),
          name: cc.name,
          branchId: hqBranchId,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      this.data.costCenters.push(
        { id: 'cc-' + newCompanyId + '-gen', companyId: newCompanyId, code: 'CC-GEN', name: 'General & Administrative', branchId: hqBranchId, status: 'active', createdAt: new Date().toISOString() }
      );
    }

    // 7. Instantiate UOMs and UOM Conversions
    const uomMap: Record<string, string> = {};
    const standardUomsToCreate = payload.selectedUomCodes && payload.selectedUomCodes.length > 0
      ? payload.selectedUomCodes
      : ['PCS', 'BOX', 'CARTON', 'KG', 'METER', 'HOUR', 'JOB'];

    const PRESET_UOM_DATA: Record<string, { name: string; symbol: string; category: any }> = {
      PCS: { name: 'Piece / Unit', symbol: 'pcs', category: 'quantity' },
      BOX: { name: 'Box', symbol: 'box', category: 'quantity' },
      CARTON: { name: 'Carton', symbol: 'ctn', category: 'quantity' },
      PACK: { name: 'Pack', symbol: 'pk', category: 'quantity' },
      SET: { name: 'Set', symbol: 'set', category: 'quantity' },
      ROLL: { name: 'Roll', symbol: 'roll', category: 'quantity' },
      SHEET: { name: 'Sheet', symbol: 'sht', category: 'quantity' },
      BOTTLE: { name: 'Bottle', symbol: 'btl', category: 'quantity' },
      METER: { name: 'Meter', symbol: 'm', category: 'length' },
      SQM: { name: 'Square Meter', symbol: 'm²', category: 'area' },
      CBM: { name: 'Cubic Meter', symbol: 'm³', category: 'volume' },
      KG: { name: 'Kilogram', symbol: 'kg', category: 'weight' },
      GRAM: { name: 'Gram', symbol: 'g', category: 'weight' },
      TON: { name: 'Metric Ton', symbol: 't', category: 'weight' },
      LITER: { name: 'Liter', symbol: 'L', category: 'volume' },
      ML: { name: 'Milliliter', symbol: 'mL', category: 'volume' },
      HOUR: { name: 'Hour', symbol: 'hr', category: 'time' },
      DAY: { name: 'Day', symbol: 'day', category: 'time' },
      MONTH: { name: 'Month', symbol: 'mo', category: 'time' },
      JOB: { name: 'Job / Milestone', symbol: 'job', category: 'quantity' },
    };

    for (const code of standardUomsToCreate) {
      const uomCode = code.toUpperCase();
      const meta = PRESET_UOM_DATA[uomCode] || { name: uomCode, symbol: uomCode.toLowerCase(), category: 'quantity' };
      const uomId = 'uom-' + newCompanyId + '-' + uomCode.toLowerCase();
      uomMap[uomCode] = uomId;
      this.data.unitsOfMeasure.push({
        id: uomId,
        companyId: newCompanyId,
        code: uomCode,
        name: meta.name,
        symbol: meta.symbol,
        category: meta.category,
        isBaseUnit: true,
        conversionFactor: '1.0000',
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }

    if (payload.customUoms && payload.customUoms.length > 0) {
      for (const cu of payload.customUoms) {
        const uomCode = cu.code.toUpperCase();
        const uomId = 'uom-' + newCompanyId + '-' + uomCode.toLowerCase();
        uomMap[uomCode] = uomId;
        this.data.unitsOfMeasure.push({
          id: uomId,
          companyId: newCompanyId,
          code: uomCode,
          name: cu.name,
          symbol: cu.symbol || uomCode.toLowerCase(),
          category: cu.category || 'quantity',
          isBaseUnit: true,
          conversionFactor: cu.conversionFactor || '1.0000',
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (payload.uomConversions && payload.uomConversions.length > 0) {
      for (const conv of payload.uomConversions) {
        const fromCode = conv.fromUomCode.toUpperCase();
        const toCode = conv.toUomCode.toUpperCase();
        const fromId = uomMap[fromCode] || 'uom-' + newCompanyId + '-' + fromCode.toLowerCase();
        const toId = uomMap[toCode] || 'uom-' + newCompanyId + '-' + toCode.toLowerCase();
        this.data.uomConversions.push({
          id: 'conv-' + newCompanyId + '-' + fromCode.toLowerCase() + '-' + toCode.toLowerCase(),
          companyId: newCompanyId,
          fromUomId: fromId,
          fromUomCode: fromCode,
          toUomId: toId,
          toUomCode: toCode,
          multiplier: conv.multiplier,
          precision: 4,
          isStandard: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 8. Instantiate Warehouses & Default Storage Location (if inventory enabled)
    if (payload.inventoryConfig?.maintainsInventory) {
      if (payload.warehouses && payload.warehouses.length > 0) {
        for (const w of payload.warehouses) {
          const whId = 'wh-' + newCompanyId + '-' + w.code.toLowerCase();
          this.data.warehouses.push({
            id: whId,
            companyId: newCompanyId,
            branchId: hqBranchId,
            code: w.code.toUpperCase(),
            name: w.name,
            address: w.address || `${payload.city || ''}, ${payload.countryCode || ''}`,
            managerName: payload.initialAdmin.fullName || 'Warehouse Manager',
            isDefault: w.isDefault,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          this.data.warehouseLocations.push({
            id: 'loc-' + whId + '-a1',
            companyId: newCompanyId,
            warehouseId: whId,
            code: 'MAIN-BAY-01',
            name: `${w.name} - General Staging Bay`,
            zone: 'Zone A',
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        const defaultWhId = 'wh-' + newCompanyId + '-main';
        this.data.warehouses.push({
          id: defaultWhId,
          companyId: newCompanyId,
          branchId: hqBranchId,
          code: 'WH-MAIN',
          name: `${payload.name} Main Warehouse`,
          address: `${payload.city || ''}, ${payload.countryCode || ''}`,
          managerName: payload.initialAdmin.fullName || 'Warehouse Manager',
          isDefault: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        this.data.warehouseLocations.push({
          id: 'loc-' + defaultWhId + '-a1',
          companyId: newCompanyId,
          warehouseId: defaultWhId,
          code: 'A1-BAY-01',
          name: 'Primary Staging & Storage Bay',
          zone: 'Zone A',
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }

      // Initial Item Categories
      this.data.itemCategories.push(
        { id: 'cat-' + newCompanyId + '-gen', companyId: newCompanyId, code: 'GEN', name: 'General Products & Inventory', description: 'Standard operating items', isActive: true, createdAt: new Date().toISOString() },
        { id: 'cat-' + newCompanyId + '-serv', companyId: newCompanyId, code: 'SERV', name: 'Services & Labor', description: 'Billable services and work items', isActive: true, createdAt: new Date().toISOString() }
      );
    }

    // 9. Instantiate Product Attributes
    if (payload.selectedAttributes && payload.selectedAttributes.length > 0) {
      const PRESET_ATTR_DATA: Record<string, { label: string; dataType: any }> = {
        brand: { label: 'Brand', dataType: 'text' },
        model: { label: 'Model Number', dataType: 'text' },
        size: { label: 'Size / Dimensions', dataType: 'text' },
        color: { label: 'Color / Finish', dataType: 'text' },
        thickness: { label: 'Thickness (mm)', dataType: 'number' },
        weight: { label: 'Unit Weight (kg)', dataType: 'number' },
        length: { label: 'Length', dataType: 'number' },
        width: { label: 'Width', dataType: 'number' },
        height: { label: 'Height', dataType: 'number' },
        batch: { label: 'Batch / Lot No', dataType: 'text' },
        serial_number: { label: 'Serial Number', dataType: 'text' },
        expiry_date: { label: 'Expiry Date', dataType: 'date' },
        barcode: { label: 'Barcode / EAN', dataType: 'text' },
      };

      let order = 1;
      for (const attrKey of payload.selectedAttributes) {
        const meta = PRESET_ATTR_DATA[attrKey] || { label: attrKey.toUpperCase(), dataType: 'text' };
        this.data.productAttributes.push({
          id: 'attr-' + newCompanyId + '-' + attrKey.toLowerCase(),
          companyId: newCompanyId,
          attributeKey: attrKey.toLowerCase(),
          label: meta.label,
          dataType: meta.dataType,
          isRequired: false,
          isActive: true,
          order: order++,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (payload.customAttributes && payload.customAttributes.length > 0) {
      let order = (payload.selectedAttributes?.length || 0) + 1;
      for (const ca of payload.customAttributes) {
        this.data.productAttributes.push({
          id: 'attr-' + newCompanyId + '-' + ca.attributeKey.toLowerCase(),
          companyId: newCompanyId,
          attributeKey: ca.attributeKey.toLowerCase(),
          label: ca.label,
          dataType: ca.dataType || 'text',
          options: ca.options,
          isRequired: !!ca.isRequired,
          isActive: true,
          order: order++,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 10. Instantiate Tax Configuration (if tax enabled)
    if (payload.accountingDefaults?.enableTaxVat) {
      const taxJurId = 'tj-' + newCompanyId + '-dom';
      this.data.taxJurisdictions.push({
        id: taxJurId,
        companyId: newCompanyId,
        code: `${payload.countryCode || 'DOM'}-TAX`,
        name: `${payload.countryCode || 'Domestic'} Standard Tax Jurisdiction`,
        countryCode: payload.countryCode || 'US',
        taxAuthorityName: `${payload.countryCode || 'National'} Tax Authority`,
        currency: payload.baseCurrency || 'USD',
        effectiveDate: `${currentYear}-01-01`,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      this.data.taxRegistrations.push({
        id: 'tr-' + newCompanyId + '-vat',
        companyId: newCompanyId,
        jurisdictionId: taxJurId,
        registrationNumber: payload.accountingDefaults.taxRegistrationNumber || payload.taxIdentifier || 'VAT-REG-001',
        registrationType: 'standard_vat',
        effectiveDate: `${currentYear}-01-01`,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const taxRate = payload.accountingDefaults.defaultTaxRatePercent || '5.00';
      this.data.taxCodes.push(
        {
          id: 'tc-' + newCompanyId + '-std-out',
          companyId: newCompanyId,
          code: 'VAT-STD-OUT',
          name: `Standard Output VAT (${taxRate}%)`,
          taxTypeId: 'tt-vat',
          taxType: 'output_vat',
          jurisdictionId: taxJurId,
          rate: (parseFloat(taxRate) / 100).toFixed(4),
          direction: 'output',
          taxTreatment: 'standard',
          recoverability: 'fully_recoverable',
          recoverablePercentage: '1.0000',
          accountId: `a-${newCompanyId}-2200`,
          isInclusive: false,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'tc-' + newCompanyId + '-std-in',
          companyId: newCompanyId,
          code: 'VAT-STD-IN',
          name: `Standard Input VAT (${taxRate}%)`,
          taxTypeId: 'tt-vat',
          taxType: 'input_vat',
          jurisdictionId: taxJurId,
          rate: (parseFloat(taxRate) / 100).toFixed(4),
          direction: 'input',
          taxTreatment: 'standard',
          recoverability: 'fully_recoverable',
          recoverablePercentage: '1.0000',
          accountId: `a-${newCompanyId}-1450`,
          isInclusive: false,
          isActive: true,
          createdAt: new Date().toISOString(),
        }
      );
    }

    // 11. Instantiate Bank & Cash Accounts
    this.data.bankAccounts.push({
      id: 'ba-' + newCompanyId + '-main',
      companyId: newCompanyId,
      accountName: `${payload.name} Operating Commercial Account`,
      bankName: 'Primary Commercial Bank',
      branch: 'Main Corporate Branch',
      accountNumber: '••••••••' + Math.floor(1000 + Math.random() * 9000),
      accountType: 'current',
      currency: payload.baseCurrency || 'USD',
      glAccountId: `a-${newCompanyId}-1010`,
      openingBalance: '0.0000',
      openingBalanceDate: `${currentYear}-01-01`,
      currentBalance: '0.0000',
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.data.cashAccounts.push({
      id: 'ca-' + newCompanyId + '-petty',
      companyId: newCompanyId,
      branchId: hqBranchId,
      accountName: 'Headquarters Petty Cash Drawer',
      cashAccountType: 'petty_cash',
      glAccountId: `a-${newCompanyId}-1020`,
      currency: payload.baseCurrency || 'USD',
      currentBalance: '0.0000',
      openingBalance: '0.0000',
      openingBalanceDate: `${currentYear}-01-01`,
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 12. Configure Module Entitlements
    const allModuleKeys = payload.enabledModuleKeys && payload.enabledModuleKeys.length > 0
      ? payload.enabledModuleKeys
      : ['financial_accounting', 'sales', 'accounts_payable', 'banking_cash', 'advanced_reporting', 'inventory'];

    // Map module entitlements
    const baseEntitlements = generateCompanyModuleEntitlements(newCompanyId, payload.tier || 'enterprise');
    for (const ent of baseEntitlements) {
      if (allModuleKeys.includes(ent.moduleKey)) {
        ent.isEnabled = true;
      } else {
        // If explicitly excluded by wizard (e.g. Services company disabling inventory)
        ent.isEnabled = false;
      }
      this.data.companyModules.push(ent);
    }

    // 13. Create Initial Company Admin User
    const adminEmail = payload.initialAdmin.email || (payload.initialAdmin.username.includes('@') ? payload.initialAdmin.username : `${payload.initialAdmin.username.toLowerCase()}@${cleanCode.toLowerCase()}.com`);
    const adminUser: DbUser = {
      id: 'u-' + newCompanyId + '-admin',
      username: payload.initialAdmin.username,
      fullName: payload.initialAdmin.fullName || `${payload.name} Admin`,
      email: adminEmail,
      passwordHash: payload.initialAdmin.password ? `argon2:$${payload.initialAdmin.password}$` : 'seeded_hash',
      password: payload.initialAdmin.password,
      status: 'active',
      isPlatformSuperAdmin: false, // Strict privilege isolation
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(adminUser);

    this.data.memberships.push({
      id: 'm-' + newCompanyId + '-admin',
      userId: adminUser.id,
      companyId: newCompanyId,
      roleId: 'role-company-admin',
      isPrimaryCompany: true,
      createdAt: new Date().toISOString(),
    });

    // 14. Save Company Role Configs
    const selectedRoles = payload.selectedRoles && payload.selectedRoles.length > 0
      ? payload.selectedRoles
      : ['COMPANY_ADMIN', 'ACCOUNTANT', 'SALES_USER', 'PURCHASE_USER'];

    for (const rKey of selectedRoles) {
      this.data.companyRoleConfigs.push({
        id: 'rc-' + newCompanyId + '-' + rKey.toLowerCase(),
        companyId: newCompanyId,
        roleKey: rKey,
        roleName: rKey.replace('_', ' '),
        description: `Operational role for ${payload.name}`,
        isRecommended: true,
        isSelected: true,
        isCore: rKey === 'COMPANY_ADMIN',
        assignedPermissions: ['*'],
        createdAt: new Date().toISOString(),
      });
    }

    // 14b. Create initial Designation and Initial Admin Employee record
    const adminDesignation = payload.initialAdmin.designation || 'Company Administrator';
    const adminDesId = 'des-' + newCompanyId + '-admin';
    this.data.designations.push({
      id: adminDesId,
      companyId: newCompanyId,
      departmentId: 'dept-' + newCompanyId + '-ops',
      code: 'DES-ADM',
      name: adminDesignation,
      description: 'Primary Administrative & Management Lead',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    if (payload.designations && payload.designations.length > 0) {
      for (const des of payload.designations) {
        if (des.code === 'DES-ADM' || this.data.designations.some((d) => d.companyId === newCompanyId && d.code === des.code)) {
          continue;
        }
        this.data.designations.push({
          id: 'des-' + newCompanyId + '-' + des.code.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          companyId: newCompanyId,
          departmentId: 'dept-' + newCompanyId + '-ops',
          code: des.code,
          name: des.name,
          description: des.description || `${des.name} role`,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.data.employees.push({
      id: 'emp-' + newCompanyId + '-admin',
      companyId: newCompanyId,
      branchId: hqBranchId,
      departmentId: 'dept-' + newCompanyId + '-ops',
      designationId: adminDesId,
      designation: adminDesignation,
      employeeCode: 'EMP-001',
      firstName: payload.initialAdmin.fullName.split(' ')[0] || 'Admin',
      lastName: payload.initialAdmin.fullName.split(' ').slice(1).join(' ') || 'User',
      fullName: payload.initialAdmin.fullName || `${payload.name} Admin`,
      dateOfBirth: '1990-01-01',
      gender: 'other',
      nationality: payload.countryCode || 'US',
      countryCode: payload.countryCode || 'US',
      email: adminEmail,
      phone: payload.initialAdmin.phone || payload.phone || '+1 555-0100',
      jobTitle: adminDesignation,
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'full_time',
      employmentStatus: 'active',
      basicSalary: '0.0000',
      currency: payload.baseCurrency || 'USD',
      paymentMethod: 'bank_transfer',
      isActive: true,
      hasSystemAccess: true,
      systemUserId: adminUser.id,
      systemRoleId: 'role-company-admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 15. Create and Attach Company Profile
    const profile: DbCompanyProfile = {
      id: 'prof-' + newCompanyId.slice(0, 8),
      companyId: newCompanyId,
      businessTypes: payload.businessTypes,
      sellingCategories: payload.sellingCategories,
      buyingCategories: payload.buyingCategories,
      inventoryConfig: payload.inventoryConfig,
      salesWorkflow: payload.salesWorkflow,
      purchaseWorkflow: payload.purchaseWorkflow,
      accountingDefaults: payload.accountingDefaults,
      timeZone: payload.timeZone || 'UTC',
      fiscalYearStartMonth: payload.fiscalYearStartMonth || 1,
      dateFormat: payload.dateFormat || 'YYYY-MM-DD',
      numberFormat: payload.numberFormat || '1,234.56',
      defaultLanguage: payload.defaultLanguage || 'en',
      website: payload.website,
      phone: payload.phone,
      email: payload.email,
      addressLine1: payload.addressLine1,
      city: payload.city,
      stateProvince: payload.stateProvince,
      postalCode: payload.postalCode,
      registrationNumber: payload.registrationNumber,
      onboardingCompletedAt: new Date().toISOString(),
      onboardingStatus: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.companyProfiles.push(profile);

    // 16. Log Audit Trail
    this.logAudit({
      companyId: newCompanyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'ONBOARD_AND_ACTIVATE_COMPANY',
      entityType: 'Company',
      entityId: newCompanyId,
      details: `VVIP Super Admin provisioned and fully onboarded company '${payload.name}' [${cleanCode}] with ${payload.businessTypes.join(', ')} configuration. Initial Admin: '${adminUser.fullName}' (${adminUser.email}).`,
      newState: newCompany as unknown as Record<string, unknown>,
    });

    this.saveData(this.data);
    return { company: newCompany, adminUser, profile };
  }

  // --- Company Lifecycle Management (Platform Super Admin) ---
  public updateCompanyStatus(
    companyId: string,
    status: EntityStatus,
    ctx: TenantContext
  ): DbCompany {
    if (!ctx.isPlatformAdmin) {
      throw new TenantViolationError('Only Platform Super Admin can change company operational status.');
    }
    const company = this.data.companies.find((c) => c.id === companyId);
    if (!company) throw new Error(`Company '${companyId}' not found`);
    company.status = status;
    company.updatedAt = new Date().toISOString();
    this.logAudit({
      companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'UPDATE_COMPANY_STATUS',
      entityType: 'Company',
      entityId: companyId,
      details: `Platform Super Admin updated company '${company.name}' status to ${status.toUpperCase()}`,
      newState: company as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return company;
  }

  public deleteCompany(companyId: string, ctx: TenantContext): boolean {
    if (!ctx.isPlatformAdmin) {
      throw new TenantViolationError('Only Platform Super Admin can delete or archive companies.');
    }
    const companyIdx = this.data.companies.findIndex((c) => c.id === companyId);
    if (companyIdx === -1) return false;
    const company = this.data.companies[companyIdx];

    // Cascade purge all company-scoped records
    this.data.companies.splice(companyIdx, 1);
    this.data.branches = this.data.branches.filter((b) => b.companyId !== companyId);
    this.data.departments = this.data.departments.filter((d) => d.companyId !== companyId);
    this.data.costCenters = this.data.costCenters.filter((cc) => cc.companyId !== companyId);
    this.data.fiscalYears = this.data.fiscalYears.filter((fy) => fy.companyId !== companyId);
    this.data.accountingPeriods = this.data.accountingPeriods.filter((p) => p.companyId !== companyId);
    this.data.accounts = this.data.accounts.filter((a) => a.companyId !== companyId);
    this.data.accountGroups = this.data.accountGroups.filter((g) => g.companyId !== companyId);
    this.data.companyModules = this.data.companyModules.filter((cm) => cm.companyId !== companyId);
    this.data.companyProfiles = this.data.companyProfiles.filter((cp) => cp.companyId !== companyId);
    this.data.companyRoleConfigs = this.data.companyRoleConfigs.filter((rc) => rc.companyId !== companyId);
    this.data.memberships = this.data.memberships.filter((m) => m.companyId !== companyId);
    this.data.customers = this.data.customers.filter((c) => c.companyId !== companyId);
    this.data.suppliers = this.data.suppliers.filter((s) => s.companyId !== companyId);
    this.data.items = this.data.items.filter((i) => i.companyId !== companyId);
    this.data.unitsOfMeasure = this.data.unitsOfMeasure.filter((u) => u.companyId !== companyId);
    this.data.warehouses = this.data.warehouses.filter((w) => w.companyId !== companyId);
    this.data.employees = this.data.employees.filter((e) => e.companyId !== companyId);
    this.data.designations = this.data.designations.filter((d) => d.companyId !== companyId);
    this.data.salaryComponents = this.data.salaryComponents.filter((sc) => sc.companyId !== companyId);
    this.data.salaryStructures = this.data.salaryStructures.filter((ss) => ss.companyId !== companyId);
    this.data.payrollPeriods = this.data.payrollPeriods.filter((pp) => pp.companyId !== companyId);
    this.data.payrollEntries = this.data.payrollEntries.filter((pe) => pe.companyId !== companyId);
    this.data.bankAccounts = this.data.bankAccounts.filter((ba) => ba.companyId !== companyId);
    this.data.cashAccounts = this.data.cashAccounts.filter((ca) => ca.companyId !== companyId);
    this.data.taxJurisdictions = this.data.taxJurisdictions.filter((tj) => tj.companyId !== companyId);
    this.data.taxRegistrations = this.data.taxRegistrations.filter((tr) => tr.companyId !== companyId);
    this.data.taxCodes = this.data.taxCodes.filter((tc) => tc.companyId !== companyId);
    this.data.projects = this.data.projects.filter((p) => p.companyId !== companyId);
    this.data.fixedAssets = this.data.fixedAssets.filter((fa) => fa.companyId !== companyId);
    this.data.journalEntries = this.data.journalEntries.filter((j) => j.companyId !== companyId);
    this.data.journalLines = this.data.journalLines.filter((jl) => jl.companyId !== companyId);
    this.data.salesInvoices = this.data.salesInvoices.filter((si) => si.companyId !== companyId);
    this.data.supplierBills = this.data.supplierBills.filter((sb) => sb.companyId !== companyId);
    this.data.customerPayments = this.data.customerPayments.filter((cp) => cp.companyId !== companyId);
    this.data.supplierPayments = this.data.supplierPayments.filter((sp) => sp.companyId !== companyId);

    this.logAudit({
      companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'DELETE_COMPANY',
      entityType: 'Company',
      entityId: companyId,
      details: `Platform Super Admin permanently removed company '${company.name}' [${company.code}] and purged tenant resources.`,
    });
    this.saveData(this.data);
    return true;
  }

  /**
   * Test fixture helper to bootstrap standard isolated company for automated domain tests
   */
  public seedTestFixtures(companyId: string = 'c1000000-0000-0000-0000-000000000001'): void {
    if (!this.data.companies.some((c) => c.id === companyId)) {
      this.data.companies.push({
        id: companyId,
        code: 'APEX',
        name: 'Apex Global Holdings Inc.',
        legalName: 'Apex Global Holdings Corporation',
        countryCode: 'US',
        industry: 'Enterprise Technology & Services',
        tier: 'enterprise',
        baseCurrency: 'USD',
        taxIdentifier: 'US-EIN-98-7654321',
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });
    }

    const branchId = 'b1000000-0000-0000-0000-000000000001';
    if (!this.data.branches.some((b) => b.id === branchId)) {
      this.data.branches.push({
        id: branchId,
        companyId,
        code: 'HQ-NY',
        name: 'New York Global Headquarters',
        isHeadquarters: true,
        addressLine1: '350 5th Avenue',
        city: 'New York',
        countryCode: 'US',
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      });
    }

    if (!this.data.fiscalYears.some((fy) => fy.companyId === companyId)) {
      const fyId = 'fy-2026-apex';
      this.data.fiscalYears.push({
        id: fyId,
        companyId,
        name: 'FY-2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isClosed: false,
        createdAt: '2026-01-01T00:00:00Z',
      });

      for (let i = 1; i <= 12; i++) {
        const monthStr = i.toString().padStart(2, '0');
        const lastDay = new Date(2026, i, 0).getDate();
        this.data.accountingPeriods.push({
          id: `p-apex-${monthStr}`,
          companyId,
          fiscalYearId: fyId,
          periodNumber: i,
          name: `Period ${i} (2026-${monthStr})`,
          startDate: `2026-${monthStr}-01`,
          endDate: `2026-${monthStr}-${lastDay}`,
          status: 'open',
          createdAt: '2026-01-01T00:00:00Z',
        });
      }
    }

    if (!this.data.accountGroups.some((ag) => ag.companyId === companyId)) {
      for (const g of INITIAL_ACCOUNT_GROUPS) {
        this.data.accountGroups.push({ ...g, companyId });
      }
    }

    if (!this.data.accounts.some((a) => a.companyId === companyId)) {
      for (const a of INITIAL_ACCOUNTS) {
        this.data.accounts.push({ ...a, companyId });
      }
    }

    if (!this.data.taxJurisdictions.some((tj) => tj.companyId === companyId)) {
      const jurId = 'tj-om-tax';
      this.data.taxJurisdictions.push({
        id: jurId,
        companyId,
        code: 'OM-TAX',
        name: 'Oman Tax Authority (OTA)',
        countryCode: 'OM',
        taxAuthorityName: 'Oman Tax Authority',
        defaultRegistrationNumber: 'OM1100223344',
        currency: 'OMR',
        effectiveDate: '2026-01-01',
        status: 'active',
        notes: 'Standard 5% VAT jurisdiction',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      this.data.taxRegistrations.push({
        id: 'tr-apex-om',
        companyId,
        jurisdictionId: jurId,
        registrationNumber: 'OM1100223344',
        registrationType: 'standard_vat',
        taxAuthorityName: 'Oman Tax Authority',
        effectiveDate: '2026-01-01',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });

      this.data.taxCodes.push(
        {
          id: 'tax-vat-05',
          companyId,
          code: 'VAT-05',
          name: 'Standard Output Value Added Tax 5%',
          rate: '0.0500',
          taxTypeId: 'tt-vat',
          taxType: 'output_vat',
          jurisdictionId: jurId,
          direction: 'output',
          taxTreatment: 'standard',
          recoverability: 'fully_recoverable',
          recoverablePercentage: '1.0000',
          accountId: 'a-2200',
          isInclusive: false,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'tax-vat-input-05',
          companyId,
          code: 'VAT-IN-05',
          name: 'Standard Input VAT Recoverable 5%',
          rate: '0.0500',
          taxTypeId: 'tt-vat',
          taxType: 'input_vat',
          jurisdictionId: jurId,
          direction: 'input',
          taxTreatment: 'standard',
          recoverability: 'fully_recoverable',
          recoverablePercentage: '1.0000',
          accountId: 'a-1450',
          isInclusive: false,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        }
      );
    }

    if (!this.data.companyModules.some((cm) => cm.companyId === companyId)) {
      this.data.companyModules.push(...generateCompanyModuleEntitlements(companyId, 'enterprise'));
    }

    this.saveData(this.data);
  }

  // --------------------------------------------------------------------------
  // Accrual Accounting
  // --------------------------------------------------------------------------
  public getAccruals(ctx: TenantContext): DbAccrualEntry[] {
    return this.data.accrualEntries.filter((a) => a.companyId === ctx.companyId);
  }

  public getAccrualById(id: string, ctx: TenantContext): DbAccrualEntry | undefined {
    return this.data.accrualEntries.find((a) => a.id === id && a.companyId === ctx.companyId);
  }

  public createAccrual(payload: Omit<DbAccrualEntry, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbAccrualEntry {
    const entry: DbAccrualEntry = {
      ...payload,
      id: 'acc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.accrualEntries.push(entry);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_ACCRUAL_ENTRY',
      entityType: 'AccrualEntry',
      entityId: entry.id,
      details: `Created accrual '${entry.accrualNumber}' (${entry.title}) for ${entry.amount} ${entry.currency}`,
      newState: entry as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return entry;
  }

  public updateAccrual(id: string, payload: Partial<Omit<DbAccrualEntry, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbAccrualEntry {
    const entry = this.data.accrualEntries.find((a) => a.id === id && a.companyId === ctx.companyId);
    if (!entry) throw new Error(`Accrual entry '${id}' not found`);
    Object.assign(entry, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return entry;
  }

  // --------------------------------------------------------------------------
  // Prepayment Amortization Schedules
  // --------------------------------------------------------------------------
  public getPrepaymentSchedules(ctx: TenantContext): DbPrepaymentSchedule[] {
    return this.data.prepaymentSchedules.filter((s) => s.companyId === ctx.companyId);
  }

  public getPrepaymentScheduleById(id: string, ctx: TenantContext): DbPrepaymentSchedule | undefined {
    return this.data.prepaymentSchedules.find((s) => s.id === id && s.companyId === ctx.companyId);
  }

  public createPrepaymentSchedule(payload: Omit<DbPrepaymentSchedule, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbPrepaymentSchedule {
    const schedule: DbPrepaymentSchedule = {
      ...payload,
      id: 'prep-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.prepaymentSchedules.push(schedule);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PREPAYMENT_SCHEDULE',
      entityType: 'PrepaymentSchedule',
      entityId: schedule.id,
      details: `Created prepayment schedule '${schedule.scheduleNumber}' (${schedule.name}) for ${schedule.totalAmount} ${schedule.currency}`,
      newState: schedule as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return schedule;
  }

  public updatePrepaymentSchedule(id: string, payload: Partial<Omit<DbPrepaymentSchedule, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbPrepaymentSchedule {
    const schedule = this.data.prepaymentSchedules.find((s) => s.id === id && s.companyId === ctx.companyId);
    if (!schedule) throw new Error(`Prepayment schedule '${id}' not found`);
    Object.assign(schedule, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return schedule;
  }

  // --------------------------------------------------------------------------
  // Deferred Revenue Schedules
  // --------------------------------------------------------------------------
  public getDeferredRevenueSchedules(ctx: TenantContext): DbDeferredRevenueSchedule[] {
    return this.data.deferredRevenueSchedules.filter((s) => s.companyId === ctx.companyId);
  }

  public getDeferredRevenueScheduleById(id: string, ctx: TenantContext): DbDeferredRevenueSchedule | undefined {
    return this.data.deferredRevenueSchedules.find((s) => s.id === id && s.companyId === ctx.companyId);
  }

  public createDeferredRevenueSchedule(payload: Omit<DbDeferredRevenueSchedule, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbDeferredRevenueSchedule {
    const schedule: DbDeferredRevenueSchedule = {
      ...payload,
      id: 'def-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.deferredRevenueSchedules.push(schedule);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_DEFERRED_REVENUE_SCHEDULE',
      entityType: 'DeferredRevenueSchedule',
      entityId: schedule.id,
      details: `Created deferred revenue schedule '${schedule.scheduleNumber}' (${schedule.name}) for ${schedule.totalAmount} ${schedule.currency}`,
      newState: schedule as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return schedule;
  }

  public updateDeferredRevenueSchedule(id: string, payload: Partial<Omit<DbDeferredRevenueSchedule, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbDeferredRevenueSchedule {
    const schedule = this.data.deferredRevenueSchedules.find((s) => s.id === id && s.companyId === ctx.companyId);
    if (!schedule) throw new Error(`Deferred revenue schedule '${id}' not found`);
    Object.assign(schedule, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return schedule;
  }

  // --------------------------------------------------------------------------
  // Accounting Provisions
  // --------------------------------------------------------------------------
  public getProvisions(ctx: TenantContext): DbProvision[] {
    return this.data.provisions.filter((p) => p.companyId === ctx.companyId);
  }

  public getProvisionById(id: string, ctx: TenantContext): DbProvision | undefined {
    return this.data.provisions.find((p) => p.id === id && p.companyId === ctx.companyId);
  }

  public createProvision(payload: Omit<DbProvision, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbProvision {
    const provision: DbProvision = {
      ...payload,
      id: 'prov-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.provisions.push(provision);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_PROVISION',
      entityType: 'Provision',
      entityId: provision.id,
      details: `Created provision '${provision.provisionNumber}' (${provision.title}) for ${provision.originalAmount} ${provision.currency}`,
      newState: provision as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return provision;
  }

  public updateProvision(id: string, payload: Partial<Omit<DbProvision, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbProvision {
    const provision = this.data.provisions.find((p) => p.id === id && p.companyId === ctx.companyId);
    if (!provision) throw new Error(`Provision '${id}' not found`);
    Object.assign(provision, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return provision;
  }

  // --------------------------------------------------------------------------
  // Recurring Journal Templates
  // --------------------------------------------------------------------------
  public getRecurringJournalTemplates(ctx: TenantContext): DbRecurringJournalTemplate[] {
    return this.data.recurringJournalTemplates.filter((t) => t.companyId === ctx.companyId);
  }

  public getRecurringJournalTemplateById(id: string, ctx: TenantContext): DbRecurringJournalTemplate | undefined {
    return this.data.recurringJournalTemplates.find((t) => t.id === id && t.companyId === ctx.companyId);
  }

  public createRecurringJournalTemplate(payload: Omit<DbRecurringJournalTemplate, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'generatedCount'>, ctx: TenantContext): DbRecurringJournalTemplate {
    const template: DbRecurringJournalTemplate = {
      ...payload,
      id: 'rjt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      generatedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.recurringJournalTemplates.push(template);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_RECURRING_JOURNAL_TEMPLATE',
      entityType: 'RecurringJournalTemplate',
      entityId: template.id,
      details: `Created recurring journal template '${template.templateCode}' (${template.templateName}) frequency: ${template.frequency}`,
      newState: template as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return template;
  }

  public updateRecurringJournalTemplate(id: string, payload: Partial<Omit<DbRecurringJournalTemplate, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbRecurringJournalTemplate {
    const template = this.data.recurringJournalTemplates.find((t) => t.id === id && t.companyId === ctx.companyId);
    if (!template) throw new Error(`Recurring journal template '${id}' not found`);
    Object.assign(template, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return template;
  }

  // --------------------------------------------------------------------------
  // Year-End Close
  // --------------------------------------------------------------------------
  public getYearEndCloses(ctx: TenantContext): DbYearEndClose[] {
    return this.data.yearEndCloses.filter((y) => y.companyId === ctx.companyId);
  }

  public getYearEndCloseById(id: string, ctx: TenantContext): DbYearEndClose | undefined {
    return this.data.yearEndCloses.find((y) => y.id === id && y.companyId === ctx.companyId);
  }

  public createYearEndClose(payload: Omit<DbYearEndClose, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbYearEndClose {
    const close: DbYearEndClose = {
      ...payload,
      id: 'yec-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.yearEndCloses.push(close);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'EXECUTE_YEAR_END_CLOSE',
      entityType: 'YearEndClose',
      entityId: close.id,
      details: `Executed Fiscal Year-End Close for '${close.fiscalYearName}'. Net income transferred: ${close.netIncomeTransferred}`,
      newState: close as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return close;
  }

  public updateYearEndClose(id: string, payload: Partial<Omit<DbYearEndClose, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbYearEndClose {
    const close = this.data.yearEndCloses.find((y) => y.id === id && y.companyId === ctx.companyId);
    if (!close) throw new Error(`Year-end close record '${id}' not found`);
    Object.assign(close, payload);
    this.saveData(this.data);
    return close;
  }

  // --------------------------------------------------------------------------
  // FX Revaluations
  // --------------------------------------------------------------------------
  public getFxRevaluations(ctx: TenantContext): DbFxRevaluation[] {
    return this.data.fxRevaluations.filter((f) => f.companyId === ctx.companyId);
  }

  public getFxRevaluationById(id: string, ctx: TenantContext): DbFxRevaluation | undefined {
    return this.data.fxRevaluations.find((f) => f.id === id && f.companyId === ctx.companyId);
  }

  public createFxRevaluation(payload: Omit<DbFxRevaluation, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbFxRevaluation {
    const rev: DbFxRevaluation = {
      ...payload,
      id: 'fxr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.fxRevaluations.push(rev);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'POST_FX_REVALUATION',
      entityType: 'FxRevaluation',
      entityId: rev.id,
      details: `Posted period-end FX revaluation '${rev.revaluationNumber}'. Total unrealized gain/loss: ${rev.totalUnrealizedGainLoss}`,
      newState: rev as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return rev;
  }

  public updateFxRevaluation(id: string, payload: Partial<Omit<DbFxRevaluation, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbFxRevaluation {
    const rev = this.data.fxRevaluations.find((f) => f.id === id && f.companyId === ctx.companyId);
    if (!rev) throw new Error(`FX revaluation '${id}' not found`);
    Object.assign(rev, payload);
    this.saveData(this.data);
    return rev;
  }

  // --------------------------------------------------------------------------
  // Expected Credit Loss (ECL) & Bad Debt Write-Offs
  // --------------------------------------------------------------------------
  public getEclCalculations(ctx: TenantContext): DbEclCalculation[] {
    return this.data.eclCalculations.filter((e) => e.companyId === ctx.companyId);
  }

  public createEclCalculation(payload: Omit<DbEclCalculation, 'id' | 'companyId' | 'createdAt'>, ctx: TenantContext): DbEclCalculation {
    const ecl: DbEclCalculation = {
      ...payload,
      id: 'ecl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
    };
    this.data.eclCalculations.push(ecl);
    this.saveData(this.data);
    return ecl;
  }

  public updateEclCalculation(id: string, payload: Partial<Omit<DbEclCalculation, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbEclCalculation {
    const ecl = this.data.eclCalculations.find((e) => e.id === id && e.companyId === ctx.companyId);
    if (!ecl) throw new Error(`ECL calculation '${id}' not found`);
    Object.assign(ecl, payload);
    this.saveData(this.data);
    return ecl;
  }

  public getBadDebtWriteOffs(ctx: TenantContext): DbBadDebtWriteOff[] {
    return this.data.badDebtWriteOffs.filter((w) => w.companyId === ctx.companyId);
  }

  public getBadDebtWriteOffById(id: string, ctx: TenantContext): DbBadDebtWriteOff | undefined {
    return this.data.badDebtWriteOffs.find((w) => w.id === id && w.companyId === ctx.companyId);
  }

  public createBadDebtWriteOff(payload: Omit<DbBadDebtWriteOff, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbBadDebtWriteOff {
    const writeOff: DbBadDebtWriteOff = {
      ...payload,
      id: 'bdw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.badDebtWriteOffs.push(writeOff);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_BAD_DEBT_WRITEOFF',
      entityType: 'BadDebtWriteOff',
      entityId: writeOff.id,
      details: `Created write-off '${writeOff.writeOffNumber}' for ${writeOff.customerName} amount ${writeOff.amount} ${writeOff.currency}`,
      newState: writeOff as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return writeOff;
  }

  public updateBadDebtWriteOff(id: string, payload: Partial<Omit<DbBadDebtWriteOff, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbBadDebtWriteOff {
    const writeOff = this.data.badDebtWriteOffs.find((w) => w.id === id && w.companyId === ctx.companyId);
    if (!writeOff) throw new Error(`Bad debt write-off '${id}' not found`);
    Object.assign(writeOff, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return writeOff;
  }

  // --------------------------------------------------------------------------
  // Employee Expense Claims
  // --------------------------------------------------------------------------
  public getEmployeeExpenseClaims(ctx: TenantContext): DbEmployeeExpenseClaim[] {
    return this.data.employeeExpenseClaims.filter((c) => c.companyId === ctx.companyId);
  }

  public getEmployeeExpenseClaimById(id: string, ctx: TenantContext): DbEmployeeExpenseClaim | undefined {
    return this.data.employeeExpenseClaims.find((c) => c.id === id && c.companyId === ctx.companyId);
  }

  public getEmployeeExpenseClaim(id: string, ctx: TenantContext): DbEmployeeExpenseClaim | undefined {
    return this.getEmployeeExpenseClaimById(id, ctx);
  }

  public createEmployeeExpenseClaim(payload: Omit<DbEmployeeExpenseClaim, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>, ctx: TenantContext): DbEmployeeExpenseClaim {
    const claim: DbEmployeeExpenseClaim = {
      ...payload,
      id: 'exp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      companyId: ctx.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.employeeExpenseClaims.push(claim);
    this.logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: 'CREATE_EMPLOYEE_EXPENSE_CLAIM',
      entityType: 'EmployeeExpenseClaim',
      entityId: claim.id,
      details: `Submitted employee expense claim '${claim.claimNumber}' for ${claim.employeeName} amount ${claim.totalAmount} ${claim.currency}`,
      newState: claim as unknown as Record<string, unknown>,
    });
    this.saveData(this.data);
    return claim;
  }

  public updateEmployeeExpenseClaim(id: string, payload: Partial<Omit<DbEmployeeExpenseClaim, 'id' | 'companyId' | 'createdAt'>>, ctx: TenantContext): DbEmployeeExpenseClaim {
    const claim = this.data.employeeExpenseClaims.find((c) => c.id === id && c.companyId === ctx.companyId);
    if (!claim) throw new Error(`Employee expense claim '${id}' not found`);
    Object.assign(claim, payload, { updatedAt: new Date().toISOString() });
    this.saveData(this.data);
    return claim;
  }
}

export const db = new RelationalStorageEngine();



