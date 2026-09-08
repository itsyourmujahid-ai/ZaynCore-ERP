-- ============================================================================
-- ENTERPRISE ACCOUNTING ERP — COMMERCIAL OPERATIONS & SUBLEDGER SCHEMA
-- ============================================================================

-- 1. Customers & Sales AR
CREATE TABLE IF NOT EXISTS customer_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    default_receivable_account_id UUID REFERENCES chart_of_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_customer_group_code UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    customer_number VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    group_id UUID REFERENCES customer_groups(id),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    credit_limit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    outstanding_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    payment_terms_days INT NOT NULL DEFAULT 30,
    tax_number VARCHAR(64),
    email VARCHAR(255),
    phone VARCHAR(64),
    address TEXT,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_customer_number UNIQUE (company_id, customer_number)
);

CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id),
    invoice_number VARCHAR(64) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    subtotal NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    discount_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    amount_paid NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    balance_due NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    journal_entry_id UUID REFERENCES journal_entries(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_sales_invoice_number UNIQUE (company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS customer_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id),
    receipt_number VARCHAR(64) NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(64) NOT NULL DEFAULT 'bank_transfer',
    bank_account_id UUID,
    amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    reference VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    proof_document_url TEXT,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_customer_receipt_number UNIQUE (company_id, receipt_number)
);

-- 2. Suppliers & Procurement AP
CREATE TABLE IF NOT EXISTS supplier_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    default_payable_account_id UUID REFERENCES chart_of_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_supplier_group_code UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    supplier_number VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    group_id UUID REFERENCES supplier_groups(id),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    outstanding_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    payment_terms_days INT NOT NULL DEFAULT 30,
    tax_number VARCHAR(64),
    email VARCHAR(255),
    phone VARCHAR(64),
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_supplier_number UNIQUE (company_id, supplier_number)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id),
    po_number VARCHAR(64) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    subtotal NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_purchase_order_number UNIQUE (company_id, po_number)
);

CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id),
    receipt_number VARCHAR(64) NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    receipt_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_goods_receipt_number UNIQUE (company_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS supplier_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id),
    bill_number VARCHAR(64) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    goods_receipt_id UUID REFERENCES goods_receipts(id),
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    subtotal NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax_total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    amount_paid NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    balance_due NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_supplier_bill_number UNIQUE (company_id, bill_number)
);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    payment_number VARCHAR(64) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(64) NOT NULL DEFAULT 'bank_transfer',
    bank_account_id UUID,
    amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_supplier_payment_number UNIQUE (company_id, payment_number)
);

-- 3. Items & Inventory
CREATE TABLE IF NOT EXISTS item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    inventory_account_id UUID REFERENCES chart_of_accounts(id),
    cogs_account_id UUID REFERENCES chart_of_accounts(id),
    revenue_account_id UUID REFERENCES chart_of_accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_item_category_code UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    item_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES item_categories(id),
    unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'PCS',
    standard_cost NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    selling_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    stock_on_hand NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    valuation_method VARCHAR(32) NOT NULL DEFAULT 'fifo',
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_item_code UNIQUE (company_id, item_code)
);

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    branch_id UUID REFERENCES branches(id),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_warehouse_code UNIQUE (company_id, code)
);

-- 4. Banking & Cash
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id),
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(128) NOT NULL,
    account_type VARCHAR(64) NOT NULL DEFAULT 'current',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    status entity_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_bank_account_number UNIQUE (company_id, account_number)
);

-- Enable RLS on all commercial tables
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Apply Tenant Isolation RLS Policies
CREATE POLICY tenant_customer_groups ON customer_groups FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_customers ON customers FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_sales_invoices ON sales_invoices FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_customer_payments ON customer_payments FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_supplier_groups ON supplier_groups FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_suppliers ON suppliers FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_purchase_orders ON purchase_orders FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_goods_receipts ON goods_receipts FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_supplier_bills ON supplier_bills FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_supplier_payments ON supplier_payments FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_item_categories ON item_categories FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_items ON items FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_warehouses ON warehouses FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
CREATE POLICY tenant_bank_accounts ON bank_accounts FOR ALL USING (company_id = current_setting('app.current_company_id', true)::uuid);
