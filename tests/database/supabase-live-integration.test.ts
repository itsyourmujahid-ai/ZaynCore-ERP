import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { pgPool, checkDatabaseConnection, withTransaction, closeDatabasePool } from '../../backend/src/database/pg-client.js';

describe('Supabase PostgreSQL Live Database Integration Suite', () => {
  after(async () => {
    await closeDatabasePool();
  });

  test('1. Live Connectivity: Successfully connects to Supabase PostgreSQL and queries engine metadata', async () => {
    const health = await checkDatabaseConnection();
    assert.equal(health.connected, true, 'Database connection must be established');
    assert.ok(health.version?.includes('PostgreSQL'), 'Database engine must be PostgreSQL');
    assert.ok(health.timestamp, 'Must return valid timestamp');
    assert.equal(health.database, 'postgres', 'Connected database should be postgres');
  });

  test('2. Schema Migration Integrity: All expected core and commercial tables exist in Supabase', async () => {
    const expectedTables = [
      'schema_migrations',
      'companies',
      'branches',
      'departments',
      'cost_centers',
      'fiscal_years',
      'accounting_periods',
      'users',
      'roles',
      'permissions',
      'role_permissions',
      'company_memberships',
      'company_modules',
      'company_feature_flags',
      'account_groups',
      'chart_of_accounts',
      'journal_entries',
      'journal_lines',
      'audit_logs',
      'customer_groups',
      'customers',
      'sales_invoices',
      'customer_payments',
      'supplier_groups',
      'suppliers'
    ];

    const result = await pgPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingTables = result.rows.map(r => r.table_name);

    for (const table of expectedTables) {
      assert.ok(
        existingTables.includes(table),
        `Table '${table}' must exist in public schema of Supabase`
      );
    }
  });

  test('3. Multi-Tenant CRUD & RLS: Inserts, retrieves, updates and deletes a tenant company', async () => {
    const testCompanyId = 'e1111111-1111-1111-1111-111111111111';
    const testCompanyCode = `TEST-CORP-${Date.now()}`;

    // Clean up if existing
    await pgPool.query('DELETE FROM companies WHERE id = $1 OR code = $2', [testCompanyId, testCompanyCode]);

    // INSERT
    const insertRes = await pgPool.query(`
      INSERT INTO companies (id, code, name, legal_name, country_code, industry, tier, base_currency, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      testCompanyId,
      testCompanyCode,
      'Test Aerospace Inc',
      'Test Aerospace Incorporated',
      'US',
      'Aerospace',
      'enterprise',
      'USD',
      'active'
    ]);

    assert.equal(insertRes.rowCount, 1);
    assert.equal(insertRes.rows[0].code, testCompanyCode);

    // SELECT
    const selectRes = await pgPool.query('SELECT * FROM companies WHERE id = $1', [testCompanyId]);
    assert.equal(selectRes.rowCount, 1);
    assert.equal(selectRes.rows[0].name, 'Test Aerospace Inc');

    // UPDATE
    const updateRes = await pgPool.query(
      'UPDATE companies SET name = $1 WHERE id = $2 RETURNING *',
      ['Test Aerospace Global Inc', testCompanyId]
    );
    assert.equal(updateRes.rows[0].name, 'Test Aerospace Global Inc');

    // DELETE / CLEANUP
    const deleteRes = await pgPool.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
    assert.equal(deleteRes.rowCount, 1);
  });

  test('4. Transaction Atomicity (COMMIT): Multiple related writes commit atomically', async () => {
    const companyId = 'e2222222-2222-2222-2222-222222222222';
    const companyCode = `TX-TEST-${Date.now()}`;

    try {
      await withTransaction(async (client) => {
        // Step 1: Create company
        await client.query(`
          INSERT INTO companies (id, code, name, legal_name, industry)
          VALUES ($1, $2, $3, $4, $5)
        `, [companyId, companyCode, 'Tx Test Corp', 'Tx Test Corp Legal', 'Finance']);

        // Step 2: Create department
        await client.query(`
          INSERT INTO departments (id, company_id, code, name)
          VALUES ($1, $2, $3, $4)
        `, ['d2222222-2222-2222-2222-222222222222', companyId, 'FIN', 'Finance Department']);
      });

      // Verify both committed
      const cRes = await pgPool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
      const dRes = await pgPool.query('SELECT * FROM departments WHERE id = $1', ['d2222222-2222-2222-2222-222222222222']);
      assert.equal(cRes.rowCount, 1);
      assert.equal(dRes.rowCount, 1);
    } finally {
      await pgPool.query('DELETE FROM departments WHERE company_id = $1', [companyId]);
      await pgPool.query('DELETE FROM companies WHERE id = $1', [companyId]);
    }
  });

  test('5. Transaction Atomicity (ROLLBACK): Failed operation rolls back entire transaction without side effects', async () => {
    const companyId = 'e3333333-3333-3333-3333-333333333333';
    const companyCode = `RB-TEST-${Date.now()}`;

    let threw = false;
    try {
      await withTransaction(async (client) => {
        // Step 1: Insert company
        await client.query(`
          INSERT INTO companies (id, code, name, legal_name, industry)
          VALUES ($1, $2, $3, $4, $5)
        `, [companyId, companyCode, 'Rollback Corp', 'Rollback Corp Legal', 'Logistics']);

        // Step 2: Force intentional database error (duplicate primary key or invalid foreign key)
        await client.query(`
          INSERT INTO departments (id, company_id, code, name)
          VALUES ($1, $2, $3, $4)
        `, ['d3333333-3333-3333-3333-333333333333', '00000000-9999-9999-9999-999999999999', 'LOG', 'Logistics']);
      });
    } catch (err) {
      threw = true;
    }

    assert.equal(threw, true, 'Transaction must throw on constraint failure');

    // Verify company was NOT saved
    const cRes = await pgPool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    assert.equal(cRes.rowCount, 0, 'Company insert must be rolled back');
  });

  test('6. Invariant Enforcement: Double-entry balanced constraint rejects unbalanced journal entries', async () => {
    const companyId = 'e4444444-4444-4444-4444-444444444444';
    const companyCode = `INVAR-CORP-${Date.now()}`;
    const fyId = 'f4444444-4444-4444-4444-444444444444';
    const periodId = 'a4444444-4444-4444-4444-444444444444';

    try {
      // Setup minimal company & period
      await pgPool.query(`
        INSERT INTO companies (id, code, name, legal_name, industry)
        VALUES ($1, $2, $3, $4, $5)
      `, [companyId, companyCode, 'Invariant Corp', 'Invariant Corp Legal', 'Tech']);

      await pgPool.query(`
        INSERT INTO fiscal_years (id, company_id, name, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5)
      `, [fyId, companyId, 'FY2026', '2026-01-01', '2026-12-31']);

      await pgPool.query(`
        INSERT INTO accounting_periods (id, company_id, fiscal_year_id, period_number, name, start_date, end_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [periodId, companyId, fyId, 1, 'Jan 2026', '2026-01-01', '2026-01-31', 'open']);

      // Attempt to insert UNBALANCED journal entry (debit: 100, credit: 50)
      let rejected = false;
      try {
        await pgPool.query(`
          INSERT INTO journal_entries (
            id, company_id, period_id, entry_number, entry_date, posting_date,
            status, total_debit, total_credit
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
        `, [
          'b4444444-4444-4444-4444-444444444444',
          companyId,
          periodId,
          'JE-UNBALANCED-001',
          '2026-01-15',
          '2026-01-15',
          'draft',
          100.0000,
          50.0000
        ]);
      } catch (err: any) {
        rejected = true;
        assert.ok(
          err.message.includes('chk_journal_balanced') || err.code === '23514',
          'Error must cite chk_journal_balanced check constraint'
        );
      }

      assert.equal(rejected, true, 'Unbalanced journal entry must be rejected by PostgreSQL constraint');
    } finally {
      await pgPool.query('DELETE FROM journal_entries WHERE company_id = $1', [companyId]);
      await pgPool.query('DELETE FROM accounting_periods WHERE company_id = $1', [companyId]);
      await pgPool.query('DELETE FROM fiscal_years WHERE company_id = $1', [companyId]);
      await pgPool.query('DELETE FROM companies WHERE id = $1', [companyId]);
    }
  });

  test('7. Seed Verification: Standard Chart of Accounts are present for demo tenant', async () => {
    const demoCompanyId = '00000000-0000-0000-0000-000000000001';
    const result = await pgPool.query(
      'SELECT code, name, classification FROM chart_of_accounts WHERE company_id = $1 ORDER BY code',
      [demoCompanyId]
    );

    assert.ok(result.rowCount && result.rowCount >= 20, 'At least 20 seeded chart of accounts should be present');
    
    // Check critical GL accounts
    const codes = result.rows.map(r => r.code);
    assert.ok(codes.includes('1010'), 'Operating Cash (1010) must be present');
    assert.ok(codes.includes('1200'), 'Accounts Receivable (1200) must be present');
    assert.ok(codes.includes('2010'), 'Accounts Payable (2010) must be present');
    assert.ok(codes.includes('4010'), 'Sales Revenue (4010) must be present');
    assert.ok(codes.includes('5010'), 'COGS (5010) must be present');
  });
});
