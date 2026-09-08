import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../../backend/src/server.js";
import { db } from "../../backend/src/database/storage.js";
import { signToken } from "../../backend/src/api/auth/jwt.js";
import { checkDatabaseConnection, closeDatabasePool } from "../../backend/src/database/pg-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("FINAL SECURITY VERIFICATION — Authentication, RBAC & Multi-Tenant Isolation", () => {
  let server: Server;
  let baseUrl: string;
  const PORT = 3899;

  const COMPANY_A = "c1000000-0000-0000-0000-000000000001";
  const COMPANY_B = "c2000000-0000-0000-0000-000000000002";
  const USER_A = "u-user-a-companya-id"; // Regular non-admin user for Company A
  const USER_B = "u-user-b-companyb-id"; // Regular non-admin user for Company B
  const SUPER_ADMIN = "u1000000-0000-0000-0000-000000000001"; // Platform Super Admin

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenSuperAdmin: string;

  before(async () => {
    const app = createServer();
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseUrl = `http://localhost:${PORT}/api`;
        // Seed database
        db.resetDatabase();
        db.seedTestFixtures(COMPANY_A);
        db.seedTestFixtures(COMPANY_B);

        // Register regular user for Company A
        (db as any).data.users.push({
          id: USER_A,
          username: "user.a@companya.com",
          email: "user.a@companya.com",
          fullName: "Company A User",
          isPlatformSuperAdmin: false,
          status: "active",
          createdAt: "2026-01-01T00:00:00Z"
        });
        (db as any).data.memberships.push({
          id: "m-user-a-companya",
          userId: USER_A,
          companyId: COMPANY_A,
          roleId: "COMPANY_ADMIN",
          isPrimaryCompany: true,
          createdAt: "2026-01-01T00:00:00Z"
        });

        // Register regular user for Company B
        (db as any).data.users.push({
          id: USER_B,
          username: "user.b@companyb.com",
          email: "user.b@companyb.com",
          fullName: "Company B User",
          isPlatformSuperAdmin: false,
          status: "active",
          createdAt: "2026-01-01T00:00:00Z"
        });
        (db as any).data.memberships.push({
          id: "m-user-b-companyb",
          userId: USER_B,
          companyId: COMPANY_B,
          roleId: "COMPANY_ADMIN",
          isPrimaryCompany: true,
          createdAt: "2026-01-01T00:00:00Z"
        });

        // Generate cryptographically signed tokens
        tokenUserA = signToken({ userId: USER_A, email: "user.a@companya.com", companyId: COMPANY_A });
        tokenUserB = signToken({ userId: USER_B, email: "user.b@companyb.com", companyId: COMPANY_B });
        tokenSuperAdmin = signToken({ userId: SUPER_ADMIN, email: "admin@mujahid.com", isPlatformAdmin: true });

        resolve();
      });
    });
  });

  after(async () => {
    await closeDatabasePool();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // --------------------------------------------------------------------------
  // 1, 2 & 4. Cryptographic Authentication & Role Spoofing Protection
  // --------------------------------------------------------------------------
  test("1. Backend does NOT trust forged x-user-role header: Role is strictly database-resolved", async () => {
    // User A provides valid token for User A, but attempts to spoof role to SYSTEM_ADMIN via header
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "x-user-role": "SYSTEM_ADMIN" // Malicious header spoofing
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    // Verified: Active role must be the user's authentic database role (COMPANY_ADMIN), NOT the spoofed SYSTEM_ADMIN
    assert.notEqual(body.data.activeRole, "SYSTEM_ADMIN", "Backend must NOT grant SYSTEM_ADMIN from header");
    assert.equal(body.data.activeRole, "COMPANY_ADMIN", "Active role must match database membership");
  });

  test("2. Cryptographic token signature is enforced: Tampered/forged token is rejected", async () => {
    // Tamper with payload in tokenUserA
    const parts = tokenUserA.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: USER_B, email: "hacked@user.com" })).toString("base64url");
    const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${forgedToken}`
      }
    });

    assert.equal(res.status, 401, "Forged/tampered token signature must return 401 Unauthorized");
  });

  test("3. Expired tokens are rejected", async () => {
    const expiredToken = signToken({ userId: USER_A, email: "user.a@companya.com" }, -10); // 10 seconds in the past
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`
      }
    });

    assert.equal(res.status, 401, "Expired token must return 401 Unauthorized");
  });

  // --------------------------------------------------------------------------
  // 3, 5, 6 & 7. Tenant Isolation & Cross-Company Access Attack Protection
  // --------------------------------------------------------------------------
  test("4. Cross-Company Access Attack: User A cannot change x-company-id to access Company B data", async () => {
    // User A (member of Company A) tries to query Company B accounting accounts
    const res = await fetch(`${baseUrl}/accounting/accounts`, {
      headers: {
        Authorization: `Bearer ${tokenUserA}`,
        "x-company-id": COMPANY_B // Target victim company
      }
    });

    assert.equal(res.status, 403, "Cross-company access attempt must be rejected with 403 Forbidden");
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "FORBIDDEN_CROSS_COMPANY_ACCESS");
  });

  test("5. Cross-Company Access Attack: User A cannot read Company B single company profile", async () => {
    const res = await fetch(`${baseUrl}/companies/${COMPANY_B}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA}`
      }
    });

    assert.equal(res.status, 403, "User cannot access profile of a company they do not belong to");
    const body = await res.json();
    assert.equal(body.error.code, "FORBIDDEN_CROSS_COMPANY_ACCESS");
  });

  test("6. Company filtering: GET /api/companies only returns companies the user belongs to", async () => {
    const res = await fetch(`${baseUrl}/companies`, {
      headers: {
        Authorization: `Bearer ${tokenUserA}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    // User A should only see Company A
    const ids = body.data.map((c: any) => c.id);
    assert.ok(ids.includes(COMPANY_A), "Must include user's own company");
    assert.ok(!ids.includes(COMPANY_B), "Must NOT include victim company");
  });

  test("7. Platform Super Admin can access all tenants for system administration", async () => {
    const res = await fetch(`${baseUrl}/companies`, {
      headers: {
        Authorization: `Bearer ${tokenSuperAdmin}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.length >= 2, "Platform super admin can list all registered tenant companies");
  });

  // --------------------------------------------------------------------------
  // 8. VVIP / Frozen Tenant Mutation Protection
  // --------------------------------------------------------------------------
  test("8. VVIP/Operational Freeze: Suspended company blocks mutations", async () => {
    // Mark Company B as suspended in DB
    const companies = db.getCompanies();
    const compB = companies.find(c => c.id === COMPANY_B);
    if (compB) compB.status = "suspended" as any;

    // Attempt mutation on suspended company
    const res = await fetch(`${baseUrl}/accounting/journals`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenSuperAdmin}`,
        "Content-Type": "application/json",
        "x-company-id": COMPANY_B
      },
      body: JSON.stringify({ memo: "Attempt on suspended tenant" })
    });

    assert.equal(res.status, 403, "Mutations must be blocked on suspended tenant");
    const body = await res.json();
    assert.equal(body.error.code, "TENANT_FROZEN");

    // Restore status
    if (compB) compB.status = "active" as any;
  });

  // --------------------------------------------------------------------------
  // 9. Secret Exposure Audit
  // --------------------------------------------------------------------------
  test("9. Secret Exposure Audit: Sensitive secrets are never exposed in frontend build or code", () => {
    const frontendDistDir = path.resolve(__dirname, "../../frontend/dist");
    
    // Check if dist exists (production build)
    if (fs.existsSync(frontendDistDir)) {
      const files = fs.readdirSync(frontendDistDir, { recursive: true }) as string[];
      for (const file of files) {
        const fullPath = path.join(frontendDistDir, file);
        if (fs.statSync(fullPath).isFile() && (file.endsWith(".js") || file.endsWith(".html"))) {
          const content = fs.readFileSync(fullPath, "utf8");
          assert.ok(!content.includes("aQvcyYDsgMoDGqfB"), `Database password must NOT be in ${file}`);
          assert.ok(!content.includes("SUPABASE_SERVICE_ROLE_KEY"), `Service role key must NOT be in ${file}`);
          assert.ok(!content.includes("enterprise-erp-default-secure-signing-secret"), `JWT secret must NOT be in ${file}`);
        }
      }
    }

    // Check frontend .env.example
    const frontendEnvExample = path.resolve(__dirname, "../../frontend/.env.example");
    if (fs.existsSync(frontendEnvExample)) {
      const content = fs.readFileSync(frontendEnvExample, "utf8");
      assert.ok(!content.includes("DATABASE_URL"), "DATABASE_URL must not be in frontend env");
      assert.ok(!content.includes("SUPABASE_SERVICE_ROLE_KEY"), "Service role key must not be in frontend env");
    }
  });

  // --------------------------------------------------------------------------
  // 10 & 11. PostgreSQL Connection & Health Verification
  // --------------------------------------------------------------------------
  test("10. /api/ready verifies actual live PostgreSQL connection", async () => {
    const res = await fetch(`${baseUrl}/ready`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ready");
    assert.equal(body.database.status, "connected");
    
    // Check live postgres metadata
    const pgCheck = await checkDatabaseConnection();
    assert.equal(pgCheck.connected, true, "PostgreSQL must be actively connected");
    assert.ok(pgCheck.version?.includes("PostgreSQL 17"), "PostgreSQL 17 must be verified");
  });
});
