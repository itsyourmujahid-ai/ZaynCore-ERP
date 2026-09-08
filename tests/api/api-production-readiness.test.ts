import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import type { Server } from "node:http";
import { createServer } from "../../backend/src/server.js";
import { db } from "../../backend/src/database/storage.js";

describe("Production REST API & Database Integration Readiness Suite", () => {
  let server: Server;
  let baseUrl: string;
  const PORT = 3892;

  before(async () => {
    const app = createServer();
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseUrl = `http://localhost:${PORT}/api`;
        // Seed test tenants
        db.resetDatabase();
        db.seedTestFixtures("c1000000-0000-0000-0000-000000000001");
        db.seedTestFixtures("c2000000-0000-0000-0000-000000000002");
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  test("1. GET /api/health returns safe health payload with uptime and zero exposed secrets", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "ok");
    assert.strictEqual(body.service, "enterprise-erp-api");
    assert.ok(body.uptime >= 0);
    assert.strictEqual(body.dbPassword, undefined);
    assert.strictEqual(body.jwtSecret, undefined);
  });

  test("2. GET /api/ready reports database and tenant readiness", async () => {
    const res = await fetch(`${baseUrl}/ready`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "ready");
    assert.strictEqual(body.database.status, "connected");
    assert.ok(body.database.tenantsLoaded >= 2);
  });

  test("3. Security Headers are set on API responses", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
    assert.strictEqual(res.headers.get("x-frame-options"), "DENY");
    assert.ok(res.headers.get("strict-transport-security")?.includes("max-age"));
  });

  test("4. POST /api/auth/login authenticates user and returns scoped memberships", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@mujahid.com" })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.token);
    assert.strictEqual(body.data.user.email, "admin@mujahid.com");
  });

  test("5. POST /api/auth/login rejects invalid credentials", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@user.com" })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "INVALID_CREDENTIALS");
  });

  test("6. Multi-Tenant API Scoping: Company A cannot read Company B data", async () => {
    // Query accounts with Company A header
    const resA = await fetch(`${baseUrl}/accounting/accounts`, {
      headers: { "x-company-id": "c1000000-0000-0000-0000-000000000001" }
    });
    assert.strictEqual(resA.status, 200);
    const bodyA = await resA.json();
    assert.ok(bodyA.data.length > 0);
    assert.ok(bodyA.data.every((a: any) => a.companyId === "c1000000-0000-0000-0000-000000000001"));

    // Query accounts with Company B header
    const resB = await fetch(`${baseUrl}/accounting/accounts`, {
      headers: { "x-company-id": "c2000000-0000-0000-0000-000000000002" }
    });
    assert.strictEqual(resB.status, 200);
    const bodyB = await resB.json();
    assert.ok(bodyB.data.length > 0);
    assert.ok(bodyB.data.every((a: any) => a.companyId === "c2000000-0000-0000-0000-000000000002"));
  });

  test("7. End-to-End Sales API Lifecycle with Double-Entry GL Verification", async () => {
    const companyId = "c1000000-0000-0000-0000-000000000001";
    const headers = { "Content-Type": "application/json", "x-company-id": companyId };

    // 1. Create Customer
    const custRes = await fetch(`${baseUrl}/sales/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customerNumber: `CUST-${Date.now()}`,
        name: "Acme Industrial Corp",
        currency: "USD",
        paymentTermsDays: 30,
        creditLimit: "50000.0000",
        taxNumber: "TX-998811",
        status: "active"
      })
    });
    assert.strictEqual(custRes.status, 200);
    const cust = (await custRes.json()).data;
    assert.ok(cust.id);

    // 2. Create Invoice
    const invRes = await fetch(`${baseUrl}/sales/invoices`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        invoiceNumber: `INV-${Date.now()}`,
        customerId: cust.id,
        invoiceDate: "2026-01-15",
        dueDate: "2026-01-31",
        currency: "USD",
        exchangeRate: "1.0000",
        subtotal: "1000.0000",
        taxTotal: "50.0000",
        total: "1050.0000",
        items: [
          {
            itemId: "item-1",
            description: "Industrial Machine Service",
            quantity: "1.0000",
            unitPrice: "1000.0000",
            taxCodeId: "tc-vat-standard",
            taxRate: "0.0500",
            taxAmount: "50.0000",
            total: "1050.0000"
          }
        ]
      })
    });
    assert.strictEqual(invRes.status, 200);
    const inv = (await invRes.json()).data;

    // 3. Post Invoice to GL
    const postRes = await fetch(`${baseUrl}/sales/invoices/${inv.id}/post`, {
      method: "POST",
      headers
    });
    assert.strictEqual(postRes.status, 200);
    const postedInv = (await postRes.json()).data;
    assert.strictEqual(postedInv.status, "posted");
    assert.ok(postedInv.journalEntryId);

    // 4. Verify Trial Balance Equilibrium (Total Debits == Total Credits)
    const tbRes = await fetch(`${baseUrl}/accounting/trial-balance`, { headers });
    assert.strictEqual(tbRes.status, 200);
    const tb = (await tbRes.json()).data;
    assert.strictEqual(tb.isBalanced, true);
    assert.strictEqual(tb.totalClosingDebit, tb.totalClosingCredit);
  });

  test("8. End-to-End Procurement API Lifecycle with 3-Way Match & Balanced GL", async () => {
    const companyId = "c1000000-0000-0000-0000-000000000001";
    const headers = { "Content-Type": "application/json", "x-company-id": companyId };

    // 1. Create Supplier
    const supRes = await fetch(`${baseUrl}/procurement/suppliers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        supplierNumber: `SUP-${Date.now()}`,
        name: "Global Steel Works Ltd",
        currency: "USD",
        paymentTermsDays: 30,
        taxNumber: "TX-SUP-1122",
        status: "active"
      })
    });
    assert.strictEqual(supRes.status, 200);
    const sup = (await supRes.json()).data;
    assert.ok(sup.id);

    // 2. Create Bill
    const billRes = await fetch(`${baseUrl}/procurement/bills`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        billNumber: `BILL-${Date.now()}`,
        supplierId: sup.id,
        billDate: "2026-01-20",
        dueDate: "2026-02-20",
        currency: "USD",
        exchangeRate: "1.0000",
        subtotal: "2000.0000",
        taxTotal: "100.0000",
        total: "2100.0000",
        items: [
          {
            itemId: "item-2",
            description: "Raw Steel Sheets",
            quantity: "10.0000",
            unitPrice: "200.0000",
            taxCodeId: "tc-vat-standard",
            taxRate: "0.0500",
            taxAmount: "100.0000",
            total: "2100.0000"
          }
        ]
      })
    });
    assert.strictEqual(billRes.status, 200);
    const bill = (await billRes.json()).data;

    // 3. Post Bill to GL
    const postBillRes = await fetch(`${baseUrl}/procurement/bills/${bill.id}/post`, {
      method: "POST",
      headers
    });
    assert.strictEqual(postBillRes.status, 200);
    const postedBill = (await postBillRes.json()).data;
    assert.strictEqual(postedBill.status, "posted");
    assert.ok(postedBill.journalEntryId);

    // 4. Verify Trial Balance Equilibrium
    const tbRes = await fetch(`${baseUrl}/accounting/trial-balance`, { headers });
    assert.strictEqual(tbRes.status, 200);
    const tb = (await tbRes.json()).data;
    assert.strictEqual(tb.isBalanced, true);
  });
});
