// ============================================================================
// Database Relational Entity Interfaces (Mirrors PostgreSQL Schema)
// ============================================================================

import { 
  CompanyTier, 
  EntityStatus, 
  FiscalPeriodStatus, 
  AccountType,
  NormalBalance,
  JournalStatus, 
  SubLedgerType,
  TaxType,
  PostingEvent
} from '@/core/types/common';

export type CustomerType = 'corporate' | 'retail' | 'wholesale' | 'government' | 'distributor';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type SalesOrderStatus = 'draft' | 'submitted' | 'approved' | 'confirmed' | 'completed' | 'cancelled';
export type SalesInvoiceStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled' | 'reversed';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'card' | 'cheque' | 'other';

export interface DbCompany {
  id: string;
  code: string;
  accessCode?: string;
  name: string;
  legalName: string;
  countryCode: string;
  industry: string;
  tier: CompanyTier;
  baseCurrency: string;
  taxIdentifier?: string;
  status: EntityStatus;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbBranch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  isHeadquarters: boolean;
  addressLine1?: string;
  city?: string;
  countryCode: string;
  status: EntityStatus;
  createdAt: string;
}

export interface DbDepartment {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  branchId?: string;
  managerId?: string;
  managerName?: string;
  budgetAmount?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface DbCostCenter {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  branchId?: string;
  departmentId?: string;
  managerId?: string;
  managerName?: string;
  parentCostCenterId?: string;
  startDate?: string;
  endDate?: string;
  budgetAmount?: string;
  notes?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface DbFiscalYear {
  id: string;
  companyId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isClosed: boolean;
  status?: 'open' | 'closed';
  code?: string;
  createdAt: string;
}

export interface DbAccountingPeriod {
  id: string;
  companyId: string;
  fiscalYearId: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  lockedAt?: string;
  lockedBy?: string;
  createdAt: string;
}

export interface DbUser {
  id: string;
  username?: string;
  email: string;
  fullName: string;
  passwordHash: string;
  password?: string;
  isPlatformSuperAdmin: boolean;
  status: EntityStatus;
  lastLoginAt?: string;
  createdAt: string;
}

export interface DbRole {
  id: string;
  companyId?: string; // null for platform system roles
  code: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[]; // array of permission codes
  createdAt: string;
}

export interface DbCompanyMembership {
  id: string;
  companyId: string;
  userId: string;
  roleId: string;
  branchId?: string;
  isPrimaryCompany: boolean;
  createdAt: string;
}

export interface DbCompanyModule {
  id: string;
  companyId: string;
  moduleKey: string;
  isEnabled: boolean;
  enabledAt: string;
}

export interface DbAccountGroup {
  id: string;
  companyId: string;
  code: string;
  name: string;
  classification: AccountType;
  accountType: AccountType;
  parentGroupId?: string;
  level: number;
  createdAt: string;
}

export interface DbAccount {
  id: string;
  companyId: string;
  groupId: string;
  parentAccountId?: string;
  code: string;
  name: string;
  classification: AccountType;
  accountType: AccountType;
  level: number;
  normalBalance: NormalBalance;
  currency: string;
  isActive: boolean;
  isControlAccount: boolean;
  isReconciliationAccount: boolean;
  isSystemAccount: boolean;
  allowManualJournal: boolean;
  description?: string;
  taxCodeId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TaxDirection = 'output' | 'input' | 'both';
export type TaxTreatment = 'standard' | 'zero_rated' | 'exempt' | 'out_of_scope' | 'reverse_charge';
export type TaxRecoverability = 'fully_recoverable' | 'partially_recoverable' | 'non_recoverable';

export interface DbTaxCode {
  id: string;
  companyId: string;
  code: string;
  name: string;
  rate: string; // e.g. "0.0500" for 5% VAT
  taxTypeId?: string;
  taxType: TaxType;
  jurisdictionId?: string;
  direction?: TaxDirection;
  taxTreatment?: TaxTreatment;
  recoverability?: TaxRecoverability;
  recoverablePercentage?: string; // e.g. "1.0000" for 100%, "0.7000" for 70%
  accountId: string; // GL Account for tax postings (Output VAT / Input VAT)
  nonRecoverableExpenseAccountId?: string; // For partial/non-recoverable input tax
  isInclusive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbJournalEntry {
  id: string;
  companyId: string;
  branchId?: string;
  periodId: string;
  entryNumber: string;
  entryDate: string;
  postingDate: string;
  status: JournalStatus;
  sourceModule: string;
  sourceType?: string;
  sourceId?: string;
  postingEvent?: PostingEvent | string;
  memo: string;
  totalDebit: string;
  totalCredit: string;
  currency: string;
  exchangeRate: string;
  postedAt?: string;
  postedBy?: string;
  reversesEntryId?: string;
  reversedByEntryId?: string;
  createdAt: string;
}

export interface DbJournalLine {
  id: string;
  companyId: string;
  journalEntryId: string;
  accountId: string;
  lineNumber: number;
  description: string;
  debitAmount: string;
  creditAmount: string;
  currency: string;
  exchangeRate: string;
  baseDebit: string;
  baseCredit: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
  subLedgerType?: SubLedgerType;
  subLedgerEntityId?: string;
  taxCodeId?: string;
  taxAmount?: string;
  dimensions?: Record<string, string>;
}

export interface DbSubLedgerEntry {
  id: string;
  companyId: string;
  subLedgerType: SubLedgerType;
  entityId: string;
  entityName: string;
  journalEntryId: string;
  journalLineId: string;
  documentNumber: string;
  documentDate: string;
  glAccountId: string;
  debitAmount: string;
  creditAmount: string;
  currency: string;
  createdAt: string;
}

export interface DbAccountingRule {
  id: string;
  companyId?: string; // null for platform system rules
  event: PostingEvent;
  name: string;
  version: number;
  priority: number;
  isActive: boolean;
  description: string;
  debitAccountSelector: string;
  creditAccountSelector: string;
  taxTreatment?: 'inclusive' | 'exclusive' | 'exempt';
  currencyTreatment?: 'base_only' | 'multi_currency';
  reversalBehavior?: 'standard_inversion';
  createdAt: string;
}

// --------------------------------------------------------------------------
// Sales & Accounts Receivable Models
// --------------------------------------------------------------------------

export interface DbCustomerGroup {
  id: string;
  companyId: string;
  code: string;
  name: string;
  defaultPaymentTermsDays: number;
  description?: string;
  createdAt: string;
}

export interface DbCustomer {
  id: string;
  companyId: string;
  code: string;
  name: string;
  customerGroupId?: string;
  customerType: CustomerType;
  contactPerson?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  countryCode: string;
  currency: string;
  paymentTermsDays: number; // e.g. 30 (Net 30)
  creditLimit: string;     // e.g. "25000.0000"
  taxIdentifier?: string;
  salesperson?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSalesLineItem {
  id: string;
  itemCode?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string; // e.g. "0.0500" for 5%
  taxCodeId?: string;
  taxRate?: string;
  taxAmount: string;
  subtotal: string;
  total: string;
}

export interface DbSalesQuotation {
  id: string;
  companyId: string;
  quotationNumber: string;
  customerId: string;
  date: string;
  validUntil: string;
  salesperson?: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  notes?: string;
  status: QuotationStatus;
  convertedToOrderId?: string;
  items: DbSalesLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DbSalesOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  customerId: string;
  quotationId?: string;
  orderDate: string;
  deliveryDate?: string;
  salesperson?: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  notes?: string;
  status: SalesOrderStatus;
  invoicedAmount: string;
  items: DbSalesLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DbSalesInvoice {
  id: string;
  companyId: string;
  branchId?: string;
  invoiceNumber: string;
  customerId: string;
  salesOrderId?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: string;
  salesperson?: string;
  reference?: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  status: SalesInvoiceStatus;
  journalEntryId?: string;
  items: DbSalesLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DbPaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: string;
}

export interface DbCustomerPayment {
  id: string;
  companyId: string;
  branchId?: string;
  receiptNumber: string;
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankAccountId: string; // GL Account for receipt (e.g. 1010)
  amount: string;
  currency: string;
  exchangeRate: string;
  reference?: string;
  notes?: string;
  proofDocumentUrl?: string;
  proofDocumentName?: string;
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  status: 'pending_approval' | 'approved' | 'posted' | 'rejected' | 'reversed';
  journalEntryId?: string;
  allocations: DbPaymentAllocation[];
  unallocatedAmount: string; // Tracks Customer Advance
  createdAt: string;
  updatedAt?: string;
}

export interface DbSalesCreditNote {
  id: string;
  companyId: string;
  creditNoteNumber: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  reason: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: string;
  exchangeRate: string;
  status: 'posted' | 'reversed';
  journalEntryId?: string;
  items: DbSalesLineItem[];
  createdAt: string;
}

// ============================================================================
// Phase 6: Procurement & Accounts Payable (AP) Entity Types
// ============================================================================

export type SupplierType = 'local' | 'international' | 'raw_material' | 'service' | 'contractor' | 'utility' | 'other';
export type PurchaseRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'closed';
export type RFQStatus = 'draft' | 'sent' | 'partially_responded' | 'completed' | 'closed' | 'cancelled';
export type PurchaseOrderStatus = 'draft' | 'submitted' | 'approved' | 'confirmed' | 'partially_received' | 'fully_received' | 'closed' | 'cancelled';
export type SupplierBillStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'cancelled' | 'reversed';
export type MatchStatus = 'matched' | 'partially_matched' | 'mismatch';

export interface DbSupplierGroup {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  defaultPaymentTermsDays?: number;
  createdAt: string;
}

export interface DbSupplier {
  id: string;
  companyId: string;
  code: string;
  name: string;
  supplierType: SupplierType;
  supplierGroupId?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  countryCode: string;
  currency: string;
  paymentTermsDays: number;
  creditLimit?: string;
  taxIdentifier?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    swiftCode?: string;
    iban?: string;
  };
  defaultExpenseAccountId?: string;
  defaultPayableAccountId?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbPurchaseRequestItem {
  id: string;
  itemId?: string;
  description: string;
  quantity: string;
  estimatedUnitPrice: string;
  estimatedTotal: string;
  preferredSupplierId?: string;
}

export interface DbPurchaseRequest {
  id: string;
  companyId: string;
  branchId?: string;
  requestNumber: string;
  requestDate: string;
  requiredDate: string;
  requesterId: string;
  requesterName: string;
  departmentId?: string;
  costCenterId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  notes?: string;
  status: PurchaseRequestStatus;
  items: DbPurchaseRequestItem[];
  totalEstimatedCost: string;
  approvedById?: string;
  approvedAt?: string;
  approvalComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSupplierQuotationItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  subtotal: string;
  taxCodeId?: string;
  taxAmount: string;
  total: string;
}

export interface DbSupplierQuotation {
  id: string;
  companyId: string;
  rfqId?: string;
  quotationNumber: string;
  supplierId: string;
  quotationDate: string;
  validUntil: string;
  currency: string;
  exchangeRate: string;
  paymentTermsDays: number;
  deliveryLeadTimeDays?: number;
  subtotal: string;
  taxAmount: string;
  freightCharges: string;
  otherCharges: string;
  total: string;
  isSelected: boolean;
  selectionReason?: string;
  notes?: string;
  items: DbSupplierQuotationItem[];
  createdAt: string;
}

export interface DbRFQ {
  id: string;
  companyId: string;
  rfqNumber: string;
  date: string;
  requiredDate: string;
  purchaseRequestId?: string;
  requestingDepartment?: string;
  buyerName: string;
  invitedSupplierIds: string[];
  deadlineDate: string;
  notes?: string;
  status: RFQStatus;
  items: DbPurchaseRequestItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DbPurchaseOrderItem {
  id: string;
  itemId?: string;
  description: string;
  quantity: string;
  receivedQuantity: string;
  billedQuantity: string;
  unitPrice: string;
  discountRate: string;
  subtotal: string;
  taxCodeId?: string;
  taxAmount: string;
  total: string;
  destinationAccountId?: string;
}

export interface DbPurchaseOrder {
  id: string;
  companyId: string;
  branchId?: string;
  poNumber: string;
  supplierId: string;
  purchaseRequestId?: string;
  rfqId?: string;
  supplierQuotationId?: string;
  poDate: string;
  expectedDeliveryDate?: string;
  currency: string;
  exchangeRate: string;
  buyerName?: string;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  paymentTermsDays: number;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  freightTotal: string;
  total: string;
  status: PurchaseOrderStatus;
  approvedById?: string;
  approvedAt?: string;
  notes?: string;
  items: DbPurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DbGoodsReceiptItem {
  poItemId: string;
  description: string;
  orderedQuantity: string;
  receivedQuantity: string;
  rejectedQuantity: string;
  acceptedQuantity: string;
  notes?: string;
}

export interface DbGoodsReceipt {
  id: string;
  companyId: string;
  branchId?: string;
  receiptNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  receivingLocation?: string;
  receiptDate: string;
  receivedBy: string;
  notes?: string;
  items: DbGoodsReceiptItem[];
  status: 'received' | 'cancelled';
  createdAt: string;
}

export interface DbSupplierBillItem {
  id: string;
  poItemId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  taxCodeId?: string;
  taxAmount: string;
  total: string;
  destinationAccountId?: string;
}

export interface DbSupplierBill {
  id: string;
  companyId: string;
  branchId?: string;
  billNumber: string;
  supplierId: string;
  supplierInvoiceNumber: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  billDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: string;
  subtotal: string;
  taxTotal: string;
  freightTotal: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  status: SupplierBillStatus;
  matchStatus: MatchStatus;
  matchDetails?: {
    poMatched: boolean;
    receiptMatched: boolean;
    qtyVariance: string;
    priceVariance: string;
    totalVariance: string;
    toleranceExceeded: boolean;
  };
  journalEntryId?: string;
  expenseAccountId?: string;
  items: DbSupplierBillItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbBillPaymentAllocation {
  billId: string;
  billNumber: string;
  allocatedAmount: string;
}

export interface DbSupplierPayment {
  id: string;
  companyId: string;
  branchId?: string;
  paymentNumber: string;
  supplierId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  reference?: string;
  notes?: string;
  status: 'posted' | 'reversed';
  journalEntryId?: string;
  allocations: DbBillPaymentAllocation[];
  unallocatedAmount: string;
  isAdvance?: boolean;
  createdAt: string;
}

export interface DbSupplierCreditNote {
  id: string;
  companyId: string;
  creditNoteNumber: string;
  supplierId: string;
  billId?: string;
  date: string;
  reason: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: string;
  exchangeRate: string;
  status: 'posted' | 'reversed';
  journalEntryId?: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    subtotal: string;
    taxAmount: string;
    total: string;
  }>;
  createdAt: string;
}

export interface DbSupplierDebitNote {
  id: string;
  companyId: string;
  debitNoteNumber: string;
  supplierId: string;
  billId?: string;
  date: string;
  reason: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: string;
  exchangeRate: string;
  status: 'posted' | 'reversed';
  journalEntryId?: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    subtotal: string;
    taxAmount: string;
    total: string;
  }>;
  createdAt: string;
}

// ============================================================================
// Phase 7: Inventory & Warehouse Management Entities
// ============================================================================

export type ItemType =
  | 'stock'
  | 'service'
  | 'non_stock'
  | 'consumable'
  | 'raw_material'
  | 'finished_goods'
  | 'semi_finished'
  | 'spare_part'
  | 'asset_related';

export type CostingMethod = 'weighted_average' | 'fifo' | 'standard_cost';

export type UomCategory = 'quantity' | 'weight' | 'volume' | 'length' | 'area' | 'time';

export interface DbItemCategory {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DbUnitOfMeasure {
  id: string;
  companyId: string;
  code: string;
  name: string;
  symbol: string;
  category: UomCategory;
  isBaseUnit: boolean;
  baseUnitId?: string;
  conversionFactor: string; // multiplier to base unit, e.g. "12.0000" for Box of 12
  isActive: boolean;
  createdAt: string;
}

export interface DbItem {
  id: string;
  companyId: string;
  itemCode: string; // SKU
  name: string;
  description?: string;
  categoryId: string;
  itemType: ItemType;
  uomId: string;
  baseUomId?: string;
  purchaseUomId?: string;
  salesUomId?: string;
  conversionFactor?: string;
  trackInventory: boolean;
  isStockItem: boolean;
  isService: boolean;
  barcode?: string;
  taxCodeId?: string;
  preferredSupplierId?: string;
  minStockLevel: string;
  reorderLevel: string;
  maxStockLevel: string;
  defaultWarehouseId?: string;
  defaultLocationId?: string;
  costingMethod: CostingMethod;
  inventoryAccountId?: string; // Default #1300
  cogsAccountId?: string;      // Default #5010
  purchaseExpenseAccountId?: string; // Default #5010
  salesRevenueAccountId?: string;    // Default #4010
  standardCost?: string;
  currentAverageCost: string;
  totalStockQuantity: string;
  totalStockValue: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbWarehouse {
  id: string;
  companyId: string;
  branchId?: string;
  code: string;
  name: string;
  address?: string;
  managerName?: string;
  isDefault: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbWarehouseLocation {
  id: string;
  companyId: string;
  warehouseId: string;
  code: string;
  name: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  bin?: string;
  isActive: boolean;
  createdAt: string;
}

export type StockMovementType =
  | 'opening_stock'
  | 'purchase_receipt'
  | 'sales_delivery'
  | 'stock_transfer_out'
  | 'stock_transfer_in'
  | 'stock_adjustment'
  | 'stock_issue'
  | 'stock_receipt'
  | 'supplier_return'
  | 'customer_return'
  | 'count_adjustment';

export type StockDirection = 'IN' | 'OUT';

export interface DbStockMovement {
  id: string;
  companyId: string;
  branchId?: string;
  movementNumber: string;
  movementDate: string;
  movementType: StockMovementType;
  itemId: string;
  warehouseId: string;
  locationId?: string;
  uomId?: string;
  direction: StockDirection;
  quantity: string;
  unitCost: string;
  totalCost: string;
  currency: string;
  batchNumber?: string;
  serialNumber?: string;
  sourceDocumentType: 'goods_receipt' | 'sales_delivery' | 'stock_transfer' | 'stock_adjustment' | 'stock_count' | 'supplier_return' | 'opening_balance' | 'manual_issue';
  sourceDocumentId: string;
  sourceDocumentNumber: string;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  journalEntryId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export type StockTransferStatus = 'draft' | 'submitted' | 'approved' | 'in_transit' | 'received' | 'completed' | 'cancelled';

export interface DbStockTransferItem {
  id: string;
  itemId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  fromLocationId?: string;
  toLocationId?: string;
  notes?: string;
}

export interface DbStockTransfer {
  id: string;
  companyId: string;
  branchId?: string;
  transferNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  status: StockTransferStatus;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  items: DbStockTransferItem[];
  createdAt: string;
  updatedAt: string;
}

export type StockAdjustmentReason = 'damage' | 'loss' | 'found_stock' | 'counting_difference' | 'expiry' | 'administrative';
export type StockAdjustmentStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'rejected';

export interface DbStockAdjustmentItem {
  id: string;
  itemId: string;
  warehouseId: string;
  locationId?: string;
  systemQuantity: string;
  countedQuantity: string;
  differenceQuantity: string; // counted - system
  unitCost: string;
  totalVarianceCost: string; // differenceQuantity * unitCost
  notes?: string;
}

export interface DbStockAdjustment {
  id: string;
  companyId: string;
  branchId?: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  warehouseId: string;
  locationId?: string;
  reason: StockAdjustmentReason;
  status: StockAdjustmentStatus;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  journalEntryId?: string;
  notes?: string;
  items: DbStockAdjustmentItem[];
  createdAt: string;
  updatedAt: string;
}

export type StockCountStatus = 'draft' | 'in_progress' | 'completed' | 'adjusted' | 'cancelled';

export interface DbStockCountItem {
  id: string;
  itemId: string;
  locationId?: string;
  systemQuantity: string;
  countedQuantity?: string;
  varianceQuantity?: string;
  unitCost: string;
  varianceValue?: string;
  notes?: string;
}

export interface DbStockCount {
  id: string;
  companyId: string;
  countNumber: string;
  warehouseId: string;
  locationId?: string;
  countDate: string;
  status: StockCountStatus;
  countedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  adjustmentId?: string;
  notes?: string;
  items: DbStockCountItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DbSalesDeliveryItem {
  id: string;
  salesOrderItemId?: string;
  itemId: string;
  orderedQuantity: string;
  deliveredQuantity: string;
  unitCost: string;
  totalCost: string;
  warehouseId: string;
  locationId?: string;
}

export interface DbSalesDelivery {
  id: string;
  companyId: string;
  branchId?: string;
  deliveryNumber: string;
  salesOrderId?: string;
  salesInvoiceId?: string;
  customerId: string;
  deliveryDate: string;
  deliveredBy?: string;
  status: 'delivered' | 'cancelled';
  journalEntryId?: string;
  notes?: string;
  items: DbSalesDeliveryItem[];
  createdAt: string;
}

export interface DbSupplierReturnItem {
  id: string;
  itemId: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  warehouseId: string;
  locationId?: string;
  notes?: string;
}

export interface DbSupplierReturn {
  id: string;
  companyId: string;
  branchId?: string;
  returnNumber: string;
  supplierId: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  returnDate: string;
  reason: string;
  status: 'draft' | 'approved' | 'posted' | 'cancelled';
  journalEntryId?: string;
  notes?: string;
  items: DbSupplierReturnItem[];
  createdAt: string;
}

export interface DbBatchLot {
  id: string;
  companyId: string;
  itemId: string;
  batchNumber: string;
  mfgDate?: string;
  expiryDate?: string;
  quantity: string;
  warehouseId: string;
  locationId?: string;
  createdAt: string;
}

export interface DbSerialNumber {
  id: string;
  companyId: string;
  itemId: string;
  serialNumber: string;
  warehouseId: string;
  locationId?: string;
  status: 'available' | 'issued' | 'returned' | 'transferred' | 'scrapped';
  receiptDocumentId?: string;
  issueDocumentId?: string;
  createdAt: string;
}

export interface DbAuditLog {
  id: string;
  companyId?: string;
  userId?: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// ============================================================================
// Phase 8: Banking, Cash & Treasury Types & Entities
// ============================================================================

export type BankAccountType = 
  | 'current' 
  | 'savings' 
  | 'petty_cash' 
  | 'cash_on_hand' 
  | 'credit_card' 
  | 'other';

export type CashAccountType = 
  | 'main_cash' 
  | 'petty_cash' 
  | 'branch_cash' 
  | 'cash_counter' 
  | 'vault';

export type BankTransactionType = 
  | 'receipt' 
  | 'payment' 
  | 'transfer_in' 
  | 'transfer_out' 
  | 'bank_charge' 
  | 'interest' 
  | 'deposit' 
  | 'withdrawal' 
  | 'adjustment' 
  | 'other';

export type BankTransactionStatus = 
  | 'draft' 
  | 'submitted' 
  | 'approved' 
  | 'posted' 
  | 'reconciled' 
  | 'cancelled';

export type BankReconciliationStatus = 
  | 'unreconciled' 
  | 'matched' 
  | 'reconciled';

export interface DbBankAccount {
  id: string;
  companyId: string;
  branchId?: string;
  accountName: string;
  bankName: string;
  branch?: string;
  accountNumber: string; // Stored securely; masked for unauthorized users
  iban?: string;
  swiftBic?: string;
  accountType: BankAccountType;
  currency: string;
  glAccountId: string; // e.g. #1010 Operating Bank Account
  openingBalance: string;
  openingBalanceDate: string;
  currentBalance: string;
  isActive: boolean;
  isDefault: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbCashAccount {
  id: string;
  companyId: string;
  branchId?: string;
  accountName: string;
  cashAccountType: CashAccountType;
  custodianName?: string;
  maxLimit?: string;
  currency: string;
  glAccountId: string; // e.g. #1020 Petty Cash & Vault Drawers
  openingBalance: string;
  openingBalanceDate: string;
  currentBalance: string;
  isActive: boolean;
  isDefault: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbBankTransaction {
  id: string;
  companyId: string;
  branchId?: string;
  bankAccountId: string; // Links to DbBankAccount or DbCashAccount
  transactionNumber: string;
  transactionDate: string;
  valueDate?: string;
  transactionType: BankTransactionType;
  amount: string; // Absolute amount
  debitCredit: 'debit' | 'credit'; // 'debit' = Inward (+), 'credit' = Outward (-)
  currency: string;
  exchangeRate: string;
  baseAmount: string;
  reference: string;
  description: string;
  sourceDocumentType?: string; // 'customer_receipt' | 'supplier_payment' | 'bank_transfer' | 'bank_charge' | 'general_receipt' | 'general_payment' | 'cash_deposit' | 'cash_withdrawal'
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  counterpartyName?: string;
  status: BankTransactionStatus;
  journalEntryId?: string;
  reconciliationId?: string;
  reconciliationStatus: BankReconciliationStatus;
  statementLineId?: string;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DbBankTransfer {
  id: string;
  companyId: string;
  branchId?: string;
  transferNumber: string;
  fromBankAccountId: string;
  toBankAccountId: string;
  transferDate: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  feeAmount?: string;
  feeAccountId?: string; // Expense account for transfer fees
  notes?: string;
  status: 'draft' | 'approved' | 'posted';
  transferOutTransactionId?: string;
  transferInTransactionId?: string;
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbBankStatement {
  id: string;
  companyId: string;
  bankAccountId: string;
  statementNumber: string;
  statementDate: string;
  startDate: string;
  endDate: string;
  openingBalance: string;
  closingBalance: string;
  currency: string;
  importBatchId: string;
  status: 'imported' | 'partially_matched' | 'matched' | 'reconciled';
  filename?: string;
  totalLinesCount: number;
  matchedLinesCount: number;
  importedBy: string;
  importedAt: string;
}

export interface DbBankStatementLine {
  id: string;
  companyId: string;
  statementId: string;
  bankAccountId: string;
  lineDate: string;
  valueDate?: string;
  description: string;
  reference?: string;
  amount: string;
  debitCredit: 'debit' | 'credit'; // 'debit' = bank deposit (ERP Inward), 'credit' = bank withdrawal (ERP Outward)
  currency: string;
  externalTransactionId?: string;
  matchStatus: 'unmatched' | 'suggested' | 'matched' | 'posted';
  matchedBankTransactionId?: string;
  createdAt: string;
}

export interface DbBankReconciliation {
  id: string;
  companyId: string;
  bankAccountId: string;
  statementId?: string;
  reconciliationNumber: string;
  asOfDate: string;
  statementEndingBalance: string;
  erpEndingBalance: string;
  outstandingReceiptsTotal: string;
  outstandingPaymentsTotal: string;
  unmatchedChargesTotal: string;
  unmatchedInterestTotal: string;
  adjustedBalance: string;
  variance: string;
  status: 'not_started' | 'in_progress' | 'balanced' | 'completed';
  matchedLineIds: string[];
  matchedTransactionIds: string[];
  notes?: string;
  reconciledBy?: string;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbCashCount {
  id: string;
  companyId: string;
  cashAccountId: string;
  countNumber: string;
  countDate: string;
  systemBalance: string;
  physicalCount: string;
  difference: string;
  reason?: string;
  counterName: string;
  reviewerName?: string;
  status: 'draft' | 'approved' | 'posted';
  adjustmentTransactionId?: string;
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbPaymentMethod {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'direct_debit' | 'other';
  defaultBankAccountId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DbCheque {
  id: string;
  companyId: string;
  branchId?: string;
  chequeType: 'incoming' | 'outgoing';
  chequeNumber: string;
  bankAccountId?: string;
  bankName: string;
  payeeName: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  currency: string;
  status: 'received' | 'prepared' | 'issued' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';
  reference?: string;
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// Phase 9: Fixed Assets & Asset Accounting Entity Models
// ============================================================================

export type AssetType = 'tangible' | 'intangible' | 'leased' | 'cwip' | 'other';
export type AssetStatus = 
  | 'draft' 
  | 'acquired' 
  | 'capitalized' 
  | 'in_service' 
  | 'fully_depreciated' 
  | 'impaired' 
  | 'disposed' 
  | 'written_off';

export type DepreciationMethod = 
  | 'straight_line' 
  | 'declining_balance' 
  | 'double_declining' 
  | 'units_of_production' 
  | 'no_depreciation';

export type DepreciationFrequency = 'monthly' | 'quarterly' | 'annually';

export type DisposalType = 'sale' | 'scrapping' | 'write_off' | 'donation' | 'trade_in' | 'other';

export interface DbAssetCategory {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  assetAccountId: string;
  accumDepAccountId: string;
  depExpenseAccountId: string;
  disposalGainLossAccountId?: string;
  defaultUsefulLifeMonths: number;
  defaultResidualValueRate: string; // e.g. "0.0500" for 5%
  defaultDepreciationMethod: DepreciationMethod;
  isActive: boolean;
  createdAt: string;
}

export interface DbAssetComponent {
  id: string;
  assetId: string;
  name: string;
  cost: string;
  usefulLifeMonths: number;
  serialNumber?: string;
  notes?: string;
}

export interface DbFixedAsset {
  id: string;
  companyId: string;
  branchId?: string;
  assetCode: string;
  name: string;
  categoryId: string;
  assetType: AssetType;
  description?: string;
  serialNumber?: string;
  tagNumber?: string;
  purchaseDate: string;
  capitalizationDate?: string;
  inServiceDate?: string;
  supplierId?: string;
  purchaseReference?: string;
  originalCost: string;
  currency: string;
  exchangeRate: string;
  usefulLifeMonths: number;
  depreciationMethod: DepreciationMethod;
  depreciationFrequency: DepreciationFrequency;
  residualValue: string;
  accumulatedDepreciation: string;
  accumulatedImpairment: string;
  netBookValue: string;
  status: AssetStatus;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  location?: string;
  custodianName?: string;
  assetAccountId: string;
  accumDepAccountId: string;
  depExpenseAccountId: string;
  disposalGainLossAccountId?: string;
  taxRate?: string;
  notes?: string;
  components?: DbAssetComponent[];
  capitalizationJournalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbDepreciationScheduleLine {
  id: string;
  companyId: string;
  assetId: string;
  periodId: string;
  periodName: string;
  fiscalYearId?: string;
  openingNBV: string;
  depreciationAmount: string;
  accumulatedDepreciation: string;
  closingNBV: string;
  isPosted: boolean;
  journalEntryId?: string;
  postedDate?: string;
}

export interface DbDepreciationRun {
  id: string;
  companyId: string;
  branchId?: string;
  runNumber: string;
  periodId: string;
  fiscalYearId?: string;
  runDate: string;
  totalAssetsCount: number;
  totalDepreciationAmount: string;
  status: 'draft' | 'approved' | 'posted';
  journalEntryId?: string;
  postedBy?: string;
  postedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbAssetTransfer {
  id: string;
  companyId: string;
  transferNumber: string;
  assetId: string;
  transferDate: string;
  fromBranchId?: string;
  toBranchId?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  fromCostCenterId?: string;
  toCostCenterId?: string;
  fromLocation?: string;
  toLocation?: string;
  fromCustodian?: string;
  toCustodian?: string;
  reason?: string;
  status: 'draft' | 'posted';
  createdAt: string;
}

export interface DbAssetImpairment {
  id: string;
  companyId: string;
  impairmentNumber: string;
  assetId: string;
  impairmentDate: string;
  preImpairmentNBV: string;
  impairmentAmount: string;
  postImpairmentNBV: string;
  reason: string;
  status: 'draft' | 'approved' | 'posted';
  journalEntryId?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface DbAssetDisposal {
  id: string;
  companyId: string;
  disposalNumber: string;
  assetId: string;
  disposalDate: string;
  disposalType: DisposalType;
  originalCost: string;
  accumulatedDepreciation: string;
  accumulatedImpairment: string;
  netBookValue: string;
  disposalProceeds: string;
  customerId?: string;
  bankAccountId?: string;
  gainLossAmount: string;
  isGain: boolean;
  status: 'draft' | 'approved' | 'posted';
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// Phase 10: HR, Employee & Payroll Management Schemas
// ============================================================================

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'probation' | 'intern';
export type EmploymentStatus = 'draft' | 'active' | 'on_leave' | 'suspended' | 'terminated' | 'inactive';
export type Gender = 'male' | 'female' | 'other';
export type PayrollPaymentMethod = 'bank_transfer' | 'cash' | 'cheque';
export type ComponentType = 'earning' | 'deduction';
export type CalculationMethod = 'fixed_amount' | 'percentage_of_basic' | 'percentage_of_gross' | 'daily_rate' | 'hourly_rate';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'late' | 'holiday' | 'weekend';
export type LeaveRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
export type PayrollPeriodStatus = 'draft' | 'processing' | 'pending_approval' | 'approved' | 'posted' | 'paid' | 'closed';
export type PayrollPaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type EmployeeAdvanceStatus = 'draft' | 'approved' | 'disbursed' | 'repaying' | 'fully_repaid' | 'cancelled';
export type FinalSettlementStatus = 'draft' | 'calculated' | 'approved' | 'posted' | 'paid';

export interface DbEmployeeDocument {
  id: string;
  title: string;
  documentType: string;
  documentNumber?: string;
  expiryDate?: string;
  fileUrl?: string;
  uploadedAt: string;
}

export interface DbDesignation {
  id: string;
  companyId: string;
  departmentId?: string;
  departmentCode?: string;
  code: string;
  name: string;
  description?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface DbEmployee {
  id: string;
  companyId: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  designationId?: string;
  designation?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality: string;
  nationalIdOrPassport?: string;
  email: string;
  phone: string;
  addressLine1?: string;
  city?: string;
  countryCode: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  jobTitle: string;
  managerId?: string;
  workLocation?: string;
  joiningDate: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  probationEndDate?: string;
  confirmationDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  salaryStructureId?: string;
  basicSalary: string;
  currency: string;
  paymentMethod: PayrollPaymentMethod;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIban?: string;
  taxIdentificationNumber?: string;
  documents?: DbEmployeeDocument[];
  notes?: string;
  isActive: boolean;
  hasSystemAccess?: boolean;
  systemUserId?: string;
  systemRoleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSalaryComponent {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: ComponentType;
  calculationMethod: CalculationMethod;
  defaultRateOrAmount: string;
  isTaxable: boolean;
  isStatutory: boolean;
  expenseAccountId: string;
  liabilityAccountId: string;
  isActive: boolean;
  createdAt: string;
}

export interface DbSalaryStructureComponent {
  componentId: string;
  componentCode: string;
  componentName: string;
  type: ComponentType;
  calculationMethod: CalculationMethod;
  rateOrAmount: string;
  formula?: string;
  expenseAccountId: string;
  liabilityAccountId: string;
}

export interface DbSalaryStructure {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  currency: string;
  components: DbSalaryStructureComponent[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbAttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  workingHours: string;
  overtimeHours: string;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  status: AttendanceStatus;
  notes?: string;
  source: 'manual' | 'biometric' | 'mobile';
  createdAt: string;
  updatedAt: string;
}

export interface DbLeaveType {
  id: string;
  companyId: string;
  code: string;
  name: string;
  isPaid: boolean;
  defaultDaysPerYear: number;
  allowNegativeBalance: boolean;
  requiresApproval: boolean;
  colorCode: string;
  isActive: boolean;
  createdAt: string;
}

export interface DbLeaveBalance {
  id: string;
  companyId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  openingBalance: string;
  accrued: string;
  used: string;
  available: string;
  updatedAt: string;
}

export interface DbLeaveRequest {
  id: string;
  companyId: string;
  requestNumber: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  numberOfDays: string;
  reason: string;
  status: LeaveRequestStatus;
  appliedAt: string;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface DbPayrollLineItem {
  componentId?: string;
  componentCode: string;
  componentName: string;
  type: ComponentType;
  amount: string;
  rateOrUnits?: string;
  accountId: string;
}

export interface DbPayrollEntry {
  id: string;
  companyId: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId?: string;
  costCenterId?: string;
  basicSalary: string;
  totalAllowances: string;
  totalOvertime: string;
  totalBonuses: string;
  grossSalary: string;
  absenceDeductions: string;
  advanceDeductions: string;
  taxDeductions: string;
  otherDeductions: string;
  totalDeductions: string;
  netSalary: string;
  currency: string;
  exchangeRate: string;
  status: 'draft' | 'approved' | 'posted' | 'paid';
  lineItems: DbPayrollLineItem[];
  createdAt: string;
}

export interface DbPayrollPeriod {
  id: string;
  companyId: string;
  branchId?: string;
  periodName: string;
  periodCode: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  fiscalPeriodId?: string;
  status: PayrollPeriodStatus;
  employeeCount: number;
  totalGrossSalary: string;
  totalAllowances: string;
  totalOvertime: string;
  totalBonuses: string;
  totalDeductions: string;
  totalAdvancesDeducted: string;
  totalTaxWithheld: string;
  totalNetSalary: string;
  totalEmployerCost: string;
  currency: string;
  exchangeRate: string;
  journalEntryId?: string;
  paymentStatus: PayrollPaymentStatus;
  paidAmount: string;
  bankTransactionId?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbEmployeeAdvance {
  id: string;
  companyId: string;
  advanceNumber: string;
  employeeId: string;
  requestDate: string;
  disbursementDate?: string;
  principalAmount: string;
  currency: string;
  exchangeRate: string;
  purpose: string;
  repaymentMonths: number;
  monthlyDeductionAmount: string;
  totalRepaid: string;
  remainingBalance: string;
  status: EmployeeAdvanceStatus;
  bankAccountId?: string;
  disbursementJournalId?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbFinalSettlement {
  id: string;
  companyId: string;
  settlementNumber: string;
  employeeId: string;
  terminationDate: string;
  unpaidSalaryDays: number;
  unpaidSalaryAmount: string;
  leaveBalanceDays: number;
  leaveEncashmentAmount: string;
  gratuityOrSeveranceAmount: string;
  bonusOrIncentiveAmount: string;
  loanDeductionsAmount: string;
  noticePeriodDeductionAmount: string;
  netSettlementAmount: string;
  currency: string;
  status: FinalSettlementStatus;
  journalEntryId?: string;
  bankTransactionId?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Phase 11: Tax & VAT Management Entities
// ============================================================================

export type TaxPeriodFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type TaxPeriodStatus = 'open' | 'locked' | 'filed' | 'closed';
export type TaxReturnStatus = 'draft' | 'prepared' | 'reviewed' | 'approved' | 'filed' | 'closed';
export type TaxPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refund_pending' | 'refunded';
export type TaxAdjustmentType = 'prior_period' | 'rounding_correction' | 'bad_debt_relief' | 'audit_settlement' | 'other';
export type TaxTypeCategory = 'vat' | 'sales_tax' | 'purchase_tax' | 'withholding_tax' | 'customs_duty' | 'other';

export interface DbTaxJurisdiction {
  id: string;
  companyId: string;
  code: string; // e.g. "US-FED", "OM-TAX", "GB-HMRC", "AE-FTA"
  name: string; // e.g. "Oman Tax Authority", "HM Revenue & Customs"
  countryCode: string; // ISO 2-letter
  stateOrRegion?: string;
  taxAuthorityName: string;
  defaultRegistrationNumber?: string;
  currency: string;
  effectiveDate: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbTaxRegistration {
  id: string;
  companyId: string;
  jurisdictionId: string;
  registrationNumber: string; // e.g. "OM12345678", "GB987654321"
  registrationType: string; // "standard_vat", "corporate_tax", "sales_tax", "withholding"
  taxAuthorityName?: string;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbTaxType {
  id: string;
  companyId: string;
  code: string; // e.g. "VAT", "SALES_TAX", "WHT", "CUSTOMS"
  name: string;
  category: TaxTypeCategory;
  description?: string;
  isRecoverableByDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbTaxLedgerEntry {
  id: string;
  companyId: string;
  branchId?: string;
  jurisdictionId: string;
  taxCodeId: string;
  taxCode: string;
  taxTypeId?: string;
  direction: TaxDirection; // 'output' | 'input' | 'both'
  sourceModule: string; // 'sales' | 'purchases' | 'assets' | 'payroll' | 'general_journal' | 'tax_adjustment'
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  transactionDate: string;
  taxPeriodId?: string;
  taxableAmount: string; // Absolute or signed
  taxRate: string;
  taxAmount: string;
  recoverableAmount: string;
  nonRecoverableAmount: string;
  currency: string;
  exchangeRate: string;
  baseTaxableAmount: string;
  baseTaxAmount: string;
  baseRecoverableAmount: string;
  baseNonRecoverableAmount: string;
  journalEntryId?: string;
  glAccountId: string;
  status: 'posted' | 'reversed' | 'adjusted';
  customerOrSupplierId?: string;
  notes?: string;
  createdAt: string;
}

export interface DbTaxPeriod {
  id: string;
  companyId: string;
  jurisdictionId: string;
  periodCode: string; // e.g. "TAX-2026-Q1", "TAX-2026-M01"
  periodName: string;
  frequency: TaxPeriodFrequency;
  startDate: string;
  endDate: string;
  filingDeadline: string;
  status: TaxPeriodStatus;
  filedAt?: string;
  filedBy?: string;
  totalOutputTax: string;
  totalRecoverableInputTax: string;
  netTaxPayable: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbTaxReturn {
  id: string;
  companyId: string;
  jurisdictionId: string;
  taxPeriodId: string;
  returnNumber: string; // e.g. "VAT-RET-2026-Q1-001"
  filingDate: string;
  status: TaxReturnStatus;
  
  // Output Tax Boxes (Sales)
  standardRatedSalesTaxable: string;
  standardRatedSalesTax: string;
  zeroRatedSales: string;
  exemptSales: string;
  exportSales: string;
  totalOutputTax: string;

  // Input Tax Boxes (Purchases)
  standardRatedPurchasesTaxable: string;
  standardRatedPurchasesTax: string;
  totalRecoverableInputTax: string;
  totalNonRecoverableInputTax: string;
  capitalGoodsInputTax: string;

  // Adjustments & Net Settlement
  priorPeriodAdjustments: string;
  otherAdjustments: string;
  netTaxPayableOrRefundable: string; // Output - RecoverableInput +/- Adjustments
  paymentStatus: TaxPaymentStatus;

  settlementJournalId?: string;
  notes?: string;
  preparedBy?: string;
  preparedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  filedBy?: string;
  filedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbTaxAdjustment {
  id: string;
  companyId: string;
  jurisdictionId: string;
  taxPeriodId?: string;
  adjustmentNumber: string; // e.g. "TAX-ADJ-2026-001"
  adjustmentDate: string;
  adjustmentType: TaxAdjustmentType;
  direction: 'increase_liability' | 'decrease_liability' | 'increase_recoverable' | 'decrease_recoverable';
  amount: string;
  currency: string;
  reason: string;
  taxCodeId?: string;
  glAccountId?: string;
  offsetAccountId?: string;
  status: 'draft' | 'approved' | 'posted';
  journalEntryId?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Phase 12: Project Management & Project Accounting
// ============================================================================

export type ProjectCategory = 
  | 'customer' 
  | 'internal' 
  | 'construction' 
  | 'manufacturing' 
  | 'consulting' 
  | 'service' 
  | 'other';

export interface DbProjectType {
  id: string;
  companyId?: string; // If null, system default
  code: string;
  name: string;
  description?: string;
  category: ProjectCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 
  | 'draft' 
  | 'active' 
  | 'on_hold' 
  | 'completed' 
  | 'closed' 
  | 'cancelled';

export type ProjectBillingMethod = 
  | 'fixed_price' 
  | 'time_and_material' 
  | 'milestone' 
  | 'progress_billing' 
  | 'manual';

export interface DbProject {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnit?: string;
  startDate: string;
  endDate?: string;
  currency: string;
  projectTypeId: string;
  status: ProjectStatus;
  billingMethod: ProjectBillingMethod;
  budgetAmount: string;
  contractValue: string;
  taxCodeId?: string;
  wipAccountId?: string;
  revenueAccountId?: string;
  costAccountId?: string;
  isActive: boolean;
  notes?: string;
  closedAt?: string;
  closedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectBudgetStatus = 
  | 'draft' 
  | 'submitted' 
  | 'approved' 
  | 'active' 
  | 'closed';

export type ProjectCostCategory = 
  | 'labor' 
  | 'materials' 
  | 'subcontractor' 
  | 'equipment' 
  | 'overhead' 
  | 'other';

export interface DbProjectBudget {
  id: string;
  companyId: string;
  projectId: string;
  budgetName: string;
  versionNumber: number;
  periodStartDate?: string;
  periodEndDate?: string;
  totalBudgetAmount: string;
  totalPlannedCost: string;
  totalPlannedRevenue: string;
  status: ProjectBudgetStatus;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbProjectBudgetLine {
  id: string;
  companyId: string;
  budgetId: string;
  projectId: string;
  costCategory: ProjectCostCategory;
  revenueCategory?: string;
  phase?: string;
  departmentId?: string;
  costCenterId?: string;
  plannedQuantity: string;
  unitCost: string;
  plannedCost: string;
  plannedRevenue: string;
  notes?: string;
}

export type ProjectTaskStatus = 
  | 'todo' 
  | 'in_progress' 
  | 'completed' 
  | 'blocked';

export type ProjectTaskPriority = 
  | 'low' 
  | 'medium' 
  | 'high';

export interface DbProjectTask {
  id: string;
  companyId: string;
  projectId: string;
  taskCode: string;
  taskName: string;
  phase?: string;
  startDate: string;
  endDate: string;
  assigneeId?: string;
  assigneeName?: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  estimatedHours: string;
  actualHours: string;
  estimatedCost: string;
  actualCost: string;
  progressPercentage: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectCostSourceModule = 
  | 'purchases' 
  | 'inventory' 
  | 'payroll' 
  | 'assets' 
  | 'banking' 
  | 'manual_adjustment';

export type ProjectCostBillingStatus = 
  | 'unbilled' 
  | 'billed' 
  | 'non_billable';

export interface DbProjectCost {
  id: string;
  companyId: string;
  projectId: string;
  costCategory: ProjectCostCategory;
  sourceModule: ProjectCostSourceModule;
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  transactionDate: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  baseAmount: string;
  departmentId?: string;
  costCenterId?: string;
  description: string;
  journalEntryId?: string;
  taskId?: string;
  employeeId?: string;
  assetId?: string;
  isBillable: boolean;
  billingStatus: ProjectCostBillingStatus;
  billingInvoiceId?: string;
  createdAt: string;
}

export interface DbProjectRevenue {
  id: string;
  companyId: string;
  projectId: string;
  sourceModule: 'sales' | 'billing' | 'manual_adjustment';
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  transactionDate: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  baseAmount: string;
  milestoneId?: string;
  salesInvoiceId?: string;
  journalEntryId?: string;
  description: string;
  createdAt: string;
}

export type ProjectMilestoneStatus = 
  | 'planned' 
  | 'in_progress' 
  | 'completed' 
  | 'approved' 
  | 'billed';

export interface DbProjectMilestone {
  id: string;
  companyId: string;
  projectId: string;
  milestoneNumber: number;
  name: string;
  description?: string;
  amount: string;
  currency: string;
  dueDate: string;
  completionPercentage: number;
  status: ProjectMilestoneStatus;
  salesInvoiceId?: string;
  approvedBy?: string;
  approvedAt?: string;
  billedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbProjectWipBalance {
  id: string;
  companyId: string;
  projectId: string;
  accumulatedCost: string;
  capitalizedAmount: string;
  transferredToCogs: string;
  currentWipBalance: string;
  wipAccountId: string;
  lastUpdatedAt: string;
}

export type ProjectCostAllocationType = 
  | 'direct' 
  | 'percentage' 
  | 'hours' 
  | 'amount';

export interface DbProjectCostAllocation {
  id: string;
  companyId: string;
  projectId: string;
  allocationType: ProjectCostAllocationType;
  sourceType: string;
  sourceId: string;
  allocatedAmount: string;
  percentage?: string;
  hours?: string;
  employeeId?: string;
  assetId?: string;
  journalEntryId?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// Phase 13: Advanced Cost & Management Accounting Types
// ============================================================================

export interface DbBusinessUnit {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  parentBusinessUnitId?: string;
  managerId?: string;
  managerName?: string;
  currency?: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ManagementDimensionType = 
  | 'branch'
  | 'department'
  | 'cost_center'
  | 'business_unit'
  | 'project'
  | 'employee'
  | 'customer'
  | 'supplier'
  | 'product'
  | 'warehouse'
  | 'custom';

export interface DbManagementDimension {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: ManagementDimensionType;
  isRequired: boolean;
  appliesTo: ('revenue' | 'expense' | 'all')[];
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CostCategoryType = 
  | 'direct_material'
  | 'direct_labor'
  | 'direct_expense'
  | 'operating_expense'
  | 'overhead'
  | 'revenue'
  | 'other';

export type BudgetPeriodType = 'annual' | 'quarterly' | 'monthly';

export type BudgetStatus = 'draft' | 'submitted' | 'approved' | 'active' | 'closed';

export interface DbManagementBudgetLine {
  id: string;
  budgetId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  costCategory?: CostCategoryType;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
  periodNumber?: number; // 1-12 for monthly, 1-4 for quarterly, 1 for annual
  plannedAmount: string;
  notes?: string;
}

export interface DbManagementBudget {
  id: string;
  companyId: string;
  budgetName: string;
  code: string;
  fiscalYearId: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string;
  currency: string;
  status: BudgetStatus;
  version: number;
  previousVersionId?: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
  totalPlannedRevenue: string;
  totalPlannedCost: string;
  totalPlannedProfit: string;
  submittedById?: string;
  submittedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  closedById?: string;
  closedAt?: string;
  lines: DbManagementBudgetLine[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AllocationBasis = 
  | 'percentage' 
  | 'fixed_amount' 
  | 'headcount' 
  | 'revenue' 
  | 'usage' 
  | 'quantity' 
  | 'area' 
  | 'direct_cost' 
  | 'equal' 
  | 'custom';

export type AllocationTargetType = 'cost_center' | 'department' | 'business_unit' | 'project';

export type AllocationRuleStatus = 'draft' | 'active' | 'archived';

export interface DbCostAllocationTarget {
  id: string;
  ruleId: string;
  targetEntityType: AllocationTargetType;
  targetEntityId: string;
  targetEntityName: string;
  weight: string; // e.g., headcount count, sq footage, or raw weight
  percentage: string; // e.g. "0.4000" for 40%
  fixedAmount?: string;
  targetAccountId?: string;
}

export interface DbCostAllocationRule {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  sourceCostCenterId?: string;
  sourceDepartmentId?: string;
  sourceAccountId?: string; // Specific GL expense account to reallocate
  allocationBasis: AllocationBasis;
  targetDimensionType: AllocationTargetType;
  status: AllocationRuleStatus;
  targets: DbCostAllocationTarget[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AllocationRunStatus = 'draft' | 'approved' | 'posted' | 'cancelled';

export interface DbCostAllocationRunLine {
  id: string;
  runId: string;
  targetEntityType: AllocationTargetType;
  targetEntityId: string;
  targetEntityName: string;
  allocatedAmount: string;
  percentage: string;
  targetAccountId: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
}

export interface DbCostAllocationRun {
  id: string;
  companyId: string;
  allocationRuleId: string;
  runNumber: string;
  runDate: string;
  periodId: string;
  totalAllocatedAmount: string;
  currency: string;
  exchangeRate: string;
  sourceCostCenterId?: string;
  sourceDepartmentId?: string;
  sourceAccountId?: string;
  status: AllocationRunStatus;
  journalEntryId?: string;
  lines: DbCostAllocationRunLine[];
  memo?: string;
  approvedById?: string;
  approvedAt?: string;
  postedById?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// Phase 14: Multi-Company, Group Accounting & Consolidation Entities
// ============================================================================

export type CompanyRelationshipType = 'parent_subsidiary' | 'sister' | 'associate' | 'joint_venture';
export type CompanyAccessLevel = 'full' | 'view_only' | 'admin';
export type IntercompanyTransactionStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'settled' | 'closed' | 'cancelled';
export type IntercompanyTransactionType = 'sales_purchase' | 'management_fee' | 'shared_service' | 'loan_transfer' | 'dividend';
export type ConsolidationRunStatus = 'draft' | 'computed' | 'finalized' | 'locked';
export type ConsolidationAdjustmentType = 'elimination' | 'reclassification' | 'fx_translation' | 'manual_consolidation';
export type ConsolidationAdjustmentStatus = 'draft' | 'approved' | 'posted';
export type EliminationType = 'intercompany_balance' | 'intercompany_sales_cogs' | 'intercompany_dividend' | 'intercompany_interest';
export type CurrencyRateType = 'closing_rate' | 'average_rate' | 'historical_rate';

export interface DbCompanyGroup {
  id: string;
  code: string;
  name: string;
  parentCompanyId: string;
  reportingCurrency: string;
  status: EntityStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbCompanyRelationship {
  id: string;
  groupId: string;
  parentCompanyId: string;
  childCompanyId: string;
  relationshipType: CompanyRelationshipType;
  ownershipPercentage: string; // Numeric decimal e.g. "80.0000"
  effectiveFrom: string;       // YYYY-MM-DD
  effectiveTo?: string;        // YYYY-MM-DD
  status: EntityStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbCompanyAccess {
  id: string;
  userId: string;
  companyId: string;
  accessLevel: CompanyAccessLevel;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DbIntercompanyTransaction {
  id: string;
  transactionNumber: string;
  sourceCompanyId: string;
  targetCompanyId: string;
  transactionType: IntercompanyTransactionType;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  targetDocumentType?: string;
  targetDocumentId?: string;
  targetDocumentNumber?: string;
  sourceJournalId?: string;
  targetJournalId?: string;
  transactionDate: string;
  currency: string;
  exchangeRate: string;
  amount: string;
  sourceAccountId?: string;                 // Source revenue or outflow account
  targetAccountId?: string;                 // Target expense or asset account
  intercompanyReceivableAccountId?: string; // Source IC asset account (e.g. #1220)
  intercompanyPayableAccountId?: string;    // Target IC liability account (e.g. #2020)
  status: IntercompanyTransactionStatus;
  memo?: string;
  createdById: string;
  approvedById?: string;
  approvedAt?: string;
  postedAt?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbGroupChartOfAccounts {
  id: string;
  groupId: string;
  code: string;
  name: string;
  classification: AccountType;
  parentGroupAccountId?: string;
  level: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbGroupAccountMapping {
  id: string;
  groupId: string;
  companyId: string;
  localAccountId: string;
  groupAccountId: string;
  effectiveDate: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface DbConsolidationSet {
  id: string;
  groupId: string;
  name: string;
  code: string;
  parentCompanyId: string;
  participatingCompanyIds: string[];
  reportingCurrency: string;
  status: EntityStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbConsolidationRun {
  id: string;
  consolidationSetId: string;
  fiscalYearId: string;
  periodId?: string;
  startDate: string;
  endDate: string;
  reportingCurrency: string;
  status: ConsolidationRunStatus;
  runDate: string;
  computedAt?: string;
  finalizedById?: string;
  finalizedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbConsolidationAdjustmentLine {
  id: string;
  adjustmentId: string;
  companyId: string;
  groupAccountId: string;
  localAccountId?: string;
  debitAmount: string;
  creditAmount: string;
  description?: string;
}

export interface DbConsolidationAdjustment {
  id: string;
  consolidationRunId: string;
  adjustmentNumber: string;
  adjustmentType: ConsolidationAdjustmentType;
  reason: string;
  affectingCompanyIds: string[];
  totalAmount: string;
  currency: string;
  status: ConsolidationAdjustmentStatus;
  lines: DbConsolidationAdjustmentLine[];
  createdById: string;
  approvedById?: string;
  approvedAt?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbEliminationRule {
  id: string;
  groupId: string;
  code: string;
  name: string;
  eliminationType: EliminationType;
  sourceAccountType: AccountType;
  targetAccountType: AccountType;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DbCurrencyTranslationRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  effectiveDate: string;
  rateType: CurrencyRateType;
  rate: string;
  rateSource: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// PHASE 15 — Company Onboarding & Business Configuration Models
// ============================================================================

export type BusinessType = 
  | 'trading'
  | 'retail'
  | 'wholesale'
  | 'manufacturing'
  | 'distribution'
  | 'services'
  | 'construction'
  | 'contracting'
  | 'import'
  | 'export'
  | 'project_based'
  | 'rental'
  | 'subscription'
  | 'other';

export type SellingCategory = 
  | 'physical_products'
  | 'raw_materials'
  | 'finished_goods'
  | 'spare_parts'
  | 'consumables'
  | 'services'
  | 'digital_products'
  | 'projects'
  | 'rental_items'
  | 'other';

export type BuyingCategory = 
  | 'raw_materials'
  | 'finished_goods'
  | 'spare_parts'
  | 'consumables'
  | 'services'
  | 'equipment_capital_goods'
  | 'digital_products'
  | 'other';

export interface DbProductAttribute {
  id: string;
  companyId: string;
  attributeKey: string; // e.g. 'brand', 'thickness', 'size', 'color', 'model'
  label: string;        // e.g. 'Glass Thickness (mm)', 'Brand Name'
  dataType: 'text' | 'number' | 'select' | 'boolean' | 'date';
  options?: string[];   // For select type
  isRequired: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface DbUomConversion {
  id: string;
  companyId: string;
  fromUomId: string;
  fromUomCode: string;
  toUomId: string;
  toUomCode: string;
  multiplier: string; // e.g. 1 Carton (from) = 24 PCS (to) => multiplier = "24.0000"
  precision: number;
  isStandard: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SalesWorkflowConfig {
  enableQuotation: boolean;
  enableSalesOrder: boolean;
  enableSalesInvoice: boolean;
  enableDeliveryNote: boolean;
  enableCustomerPayment: boolean;
  enableCreditNote: boolean;
  enableDebitNote: boolean;
  enableDiscounts: boolean;
  enableSalesCommission: boolean;
  enableCustomerCreditLimit: boolean;
  enablePartialPayments: boolean;
  enablePaymentProofVerification: boolean; // Mandatory 2-step verification rule
}

export interface PurchaseWorkflowConfig {
  enablePurchaseRequest: boolean;
  enableRfq: boolean;
  enableSupplierQuotation: boolean;
  enablePurchaseOrder: boolean;
  enableGoodsReceipt: boolean;
  enableServiceReceipt: boolean;
  enableSupplierBill: boolean;
  enableThreeWayMatch: boolean;
  enableSupplierPayment: boolean;
  enablePurchaseCreditNote: boolean;
  enablePurchaseDebitNote: boolean;
}

export interface InventoryCompanyConfig {
  maintainsInventory: boolean;
  allowNegativeStock: boolean;
  enableMultipleWarehouses: boolean;
  enableStorageLocations: boolean;
  enableStockTransfers: boolean;
  enableStockCount: boolean;
  enableStockAdjustments: boolean;
  enableBatchLotTracking: boolean;
  enableSerialNumberTracking: boolean;
  enableExpiryDateTracking: boolean;
  enableBarcodeSku: boolean;
  enableReorderLevelAlerts: boolean;
  defaultCostingMethod: 'FIFO' | 'WEIGHTED_AVG' | 'STANDARD_COST';
}

export interface AccountingDefaultsConfig {
  defaultRevenueAccountId?: string;     // Default #4010
  defaultExpenseAccountId?: string;     // Default #6080
  defaultInventoryAccountId?: string;   // Default #1300
  defaultArControlAccountId?: string;   // Default #1200
  defaultApControlAccountId?: string;   // Default #2010
  defaultOutputTaxAccountId?: string;   // Default #2200
  defaultInputTaxAccountId?: string;    // Default #1450
  defaultCogsAccountId?: string;        // Default #5010
  defaultFixedAssetAccountId?: string;  // Default #1510
  defaultPayrollAccountId?: string;     // Default #2300
  defaultBankAccountId?: string;        // Default #1010
  defaultCashAccountId?: string;        // Default #1020
  enableMultiCurrency: boolean;
  enableTaxVat: boolean;
  taxRegistrationNumber?: string;
  taxInclusivePricing: boolean;
  defaultTaxRatePercent: string;
}

export interface DbCompanyProfile {
  id: string;
  companyId: string;
  businessTypes: BusinessType[];
  sellingCategories: SellingCategory[];
  buyingCategories: BuyingCategory[];
  inventoryConfig: InventoryCompanyConfig;
  salesWorkflow: SalesWorkflowConfig;
  purchaseWorkflow: PurchaseWorkflowConfig;
  accountingDefaults: AccountingDefaultsConfig;
  timeZone: string;
  fiscalYearStartMonth: number; // 1 = January
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  numberFormat: '1,234.56' | '1.234,56' | '1 234,56';
  defaultLanguage: string;
  website?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  registrationNumber?: string;
  onboardingCompletedAt?: string;
  onboardingStatus: 'draft' | 'completed' | 'skipped';
  createdAt: string;
  updatedAt: string;
}

export interface DbCompanyRoleConfig {
  id: string;
  companyId: string;
  roleKey: string;
  roleName: string;
  description: string;
  isRecommended: boolean;
  isSelected: boolean;
  isCore: boolean;
  assignedPermissions: string[];
  createdAt: string;
}

export interface DbOnboardingDraft {
  id: string;
  draftName: string;
  currentStep: number;
  payload: FullCompanyOnboardingPayload;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitialAdminUserPayload {
  fullName: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  designation?: string;
}

export interface InitialWarehousePayload {
  code: string;
  name: string;
  address?: string;
  isDefault: boolean;
}

export interface InitialBranchPayload {
  code: string;
  name: string;
  city?: string;
  address?: string;
  addressLine1?: string;
  isHeadquarters: boolean;
}

export interface InitialDepartmentPayload {
  code: string;
  name: string;
  description?: string;
}

export interface FullCompanyOnboardingPayload {
  // Step 1: Company Information
  name: string;
  legalName: string;
  code: string;
  accessCode?: string;
  registrationNumber?: string;
  taxIdentifier?: string;
  countryCode: string;
  stateProvince?: string;
  city?: string;
  addressLine1?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  baseCurrency: string;
  timeZone: string;
  fiscalYearStartMonth: number;
  defaultLanguage: string;
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  numberFormat: '1,234.56' | '1.234,56' | '1 234,56';
  tier: CompanyTier;

  // Step 2: Business Types
  businessTypes: BusinessType[];

  // Step 3: Products & Services
  sellingCategories: SellingCategory[];
  buyingCategories: BuyingCategory[];

  // Step 4: Units of Measure
  selectedUomCodes: string[];
  customUoms?: Array<{
    code: string;
    name: string;
    symbol: string;
    category: UomCategory;
    conversionFactor: string;
  }>;
  uomConversions?: Array<{
    fromUomCode: string;
    toUomCode: string;
    multiplier: string;
  }>;
  defaultPurchaseUom?: string;
  defaultStockUom?: string;
  defaultSalesUom?: string;

  // Step 5: Inventory & Warehouses
  inventoryConfig: InventoryCompanyConfig;
  selectedAttributes: string[];
  customAttributes?: Array<{
    attributeKey: string;
    label: string;
    dataType: 'text' | 'number' | 'select' | 'boolean' | 'date';
    options?: string[];
    isRequired: boolean;
  }>;
  warehouses?: InitialWarehousePayload[];

  // Step 6: Sales Configuration
  salesWorkflow: SalesWorkflowConfig;

  // Step 7: Purchase Configuration
  purchaseWorkflow: PurchaseWorkflowConfig;

  // Step 8: Accounting & Tax Configuration
  accountingDefaults: AccountingDefaultsConfig;

  // Step 9: Organizational Structure
  branches?: InitialBranchPayload[];
  departments?: InitialDepartmentPayload[];
  costCenters?: Array<{ code: string; name: string }>;

  // Step 10: Roles & Initial Admin
  selectedRoles: string[];
  initialAdmin: InitialAdminUserPayload;
  designations?: Array<{ code: string; name: string; description?: string }>;

  // Step 11: Modules & Features
  enabledModuleKeys: string[];
}

// ============================================================================
// Phase: Enterprise Accounting Completeness Domain Models
// ============================================================================

export type AccrualType = 'expense_accrual' | 'unbilled_revenue' | 'payroll_accrual' | 'tax_accrual' | 'other_accrual';
export type AccrualStatus = 'draft' | 'approved' | 'posted' | 'reversed' | 'cancelled';

export interface DbAccrualEntry {
  id: string;
  companyId: string;
  branchId?: string;
  accrualNumber: string;
  accrualType: AccrualType;
  title: string;
  description: string;
  accrualDate: string;        // Posting date of the accrual
  effectiveDate: string;      // Economic period effective date
  autoReversalDate?: string;  // Date to automatically post reversal
  amount: string;
  currency: string;
  exchangeRate: string;
  debitAccountId: string;
  creditAccountId: string;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  status: AccrualStatus;
  journalEntryId?: string;
  reversalJournalEntryId?: string;
  preparedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  reversedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleFrequency = 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
export type ScheduleStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export interface DbPrepaymentLine {
  id: string;
  periodNumber: number;
  recognitionDate: string;
  amount: string;
  status: 'pending' | 'posted' | 'skipped';
  journalEntryId?: string;
  postedAt?: string;
}

export interface DbPrepaymentSchedule {
  id: string;
  companyId: string;
  branchId?: string;
  scheduleNumber: string;
  name: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  prepaidAssetAccountId: string;   // e.g. #1400 Prepaid Expenses
  targetExpenseAccountId: string;  // e.g. #6010 Rent / #6020 Insurance Expense
  totalAmount: string;
  recognizedAmount: string;
  remainingAmount: string;
  currency: string;
  exchangeRate: string;
  startDate: string;
  endDate: string;
  frequency: ScheduleFrequency;
  totalPeriods: number;
  status: ScheduleStatus;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  lines: DbPrepaymentLine[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbDeferredRevenueLine {
  id: string;
  periodNumber: number;
  recognitionDate: string;
  amount: string;
  status: 'pending' | 'posted' | 'skipped';
  journalEntryId?: string;
  postedAt?: string;
}

export interface DbDeferredRevenueSchedule {
  id: string;
  companyId: string;
  branchId?: string;
  scheduleNumber: string;
  name: string;
  customerId?: string;
  sourceInvoiceId?: string;
  sourceInvoiceNumber?: string;
  deferredRevenueAccountId: string; // e.g. #2100 Deferred / Unearned Revenue
  targetRevenueAccountId: string;   // e.g. #4010 Commercial Sales Revenue
  totalAmount: string;
  recognizedAmount: string;
  remainingAmount: string;
  currency: string;
  exchangeRate: string;
  startDate: string;
  endDate: string;
  frequency: ScheduleFrequency;
  totalPeriods: number;
  status: ScheduleStatus;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
  lines: DbDeferredRevenueLine[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProvisionType = 'warranty' | 'legal_claim' | 'restructuring' | 'expense_provision' | 'decommissioning' | 'other';
export type ProvisionStatus = 'active' | 'adjusted' | 'utilized' | 'reversed';

export interface DbProvision {
  id: string;
  companyId: string;
  branchId?: string;
  provisionNumber: string;
  title: string;
  provisionType: ProvisionType;
  description: string;
  provisionAccountId: string; // e.g. #2400 Provisions Liability
  expenseAccountId: string;   // e.g. #6090 Operational Expense
  originalAmount: string;
  currentBalance: string;
  utilizedAmount: string;
  reversedAmount: string;
  currency: string;
  effectiveDate: string;
  reviewDate?: string;
  status: ProvisionStatus;
  journalEntryId?: string;
  departmentId?: string;
  costCenterId?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbRecurringJournalLine {
  id: string;
  accountId: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
}

export interface DbRecurringJournalTemplate {
  id: string;
  companyId: string;
  branchId?: string;
  templateCode: string;
  templateName: string;
  frequency: ScheduleFrequency;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  lastRunDate?: string;
  autoPost: boolean;
  currency: string;
  status: 'active' | 'paused' | 'completed';
  lines: DbRecurringJournalLine[];
  generatedCount: number;
  lastJournalEntryId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbYearEndClose {
  id: string;
  companyId: string;
  fiscalYearId: string;
  fiscalYearName: string;
  closingDate: string;
  retainedEarningsAccountId: string; // e.g. #3200
  totalRevenueClosed: string;
  totalExpenseClosed: string;
  netIncomeTransferred: string;
  closingJournalEntryId: string;
  status: 'closed' | 'reopened';
  reopenedAt?: string;
  reopenedBy?: string;
  reopenedReason?: string;
  closedBy: string;
  closedAt: string;
  createdAt: string;
}

export interface DbFxRevaluationLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  currency: string;
  foreignBalance: string;
  bookBaseBalance: string;
  revaluedBaseBalance: string;
  unrealizedGainLoss: string; // Positive = Gain, Negative = Loss
}

export interface DbFxRevaluation {
  id: string;
  companyId: string;
  revaluationNumber?: string;
  revaluationDate: string;
  baseCurrency?: string;
  targetCurrency?: string;
  spotExchangeRate?: string;
  totalUnrealizedGainLoss: string;
  gainLossAccountId?: string; // #8010 or #4200
  lines?: DbFxRevaluationLine[];
  items?: any[];
  status: 'posted' | 'reversed';
  journalEntryId?: string;
  autoReversalDate?: string;
  reversalJournalEntryId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DbEclBucketSummary {
  bucketName?: string; // 'current', '31-60', '61-90', '90+', 'default'
  bucket?: string;
  label?: string;
  grossArAmount?: string;
  lossRatePct?: number;
  expectedLossAmount?: string;
  outstandingBalance?: string;
  lossRatePercent?: string;
  provisionAmount?: string;
}

export interface DbEclCalculation {
  id: string;
  companyId: string;
  calculationNumber?: string;
  calculationDate: string;
  totalGrossReceivables?: string;
  totalGrossAr?: string;
  totalEclProvision?: string;
  totalRequiredProvision?: string;
  currentAllowanceBalance?: string;
  existingProvisionBalance?: string;
  incrementalAdjustment?: string;
  netAdjustmentAmount?: string;
  adjustmentAction?: 'increase' | 'decrease' | 'none';
  buckets: DbEclBucketSummary[];
  status: 'calculated' | 'posted';
  journalEntryId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface DbBadDebtWriteOff {
  id: string;
  companyId: string;
  writeOffNumber?: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: string;
  currency?: string;
  reason: string;
  writeOffDate?: string;
  writeOffType: 'bad_debt' | 'inventory_loss' | 'small_balance' | 'allowance' | 'direct';
  allowanceAccountId?: string; // #1210 Allowance
  expenseAccountId?: string;    // #6090 Bad Debt Expense
  receivableAccountId?: string; // #1200 AR
  status: 'submitted' | 'approved' | 'posted' | 'recovered';
  recoveryAmount?: string;
  recoveryDate?: string;
  recoveryJournalEntryId?: string;
  journalEntryId?: string;
  submittedBy?: string;
  approvedBy?: string;
  approvedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbEmployeeExpenseLine {
  id: string;
  category: string;
  expenseAccountId?: string;
  description: string;
  expenseDate?: string;
  amount: string;
  taxRate?: number;
  taxAmount?: string;
  receiptUrl?: string;
  receiptName?: string;
  departmentId?: string;
  costCenterId?: string;
  projectId?: string;
}

export interface DbEmployeeExpenseClaim {
  id: string;
  companyId: string;
  branchId?: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  title?: string;
  purpose?: string;
  description?: string;
  claimDate: string;
  currency: string;
  subtotal?: string;
  totalAmount: string;
  taxTotal: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'posted' | 'reimbursed';
  rejectionReason?: string;
  payableAccountId?: string; // e.g. #2040 / #2300 Employee Payables
  journalEntryId?: string;
  reimbursementBankAccountId?: string;
  reimbursementPaymentId?: string;
  reimbursementDate?: string;
  reimbursementJournalEntryId?: string;
  items?: DbEmployeeExpenseLine[];
  lines: DbEmployeeExpenseLine[];
  notes?: string;
  submittedBy?: string;
  approvedBy?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  reimbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

