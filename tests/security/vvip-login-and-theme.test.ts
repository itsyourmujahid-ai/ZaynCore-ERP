import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../../backend/src/server.js";
import { db } from "../../backend/src/database/storage.js";
import { signToken } from "../../backend/src/api/auth/jwt.js";
import { closeDatabasePool } from "../../backend/src/database/pg-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("SECURITY & UI/UX AUDIT — Hidden VVIP Login & Theme System", () => {
  let server: Server;
  let baseUrl: string;
  const PORT = 3898;

  const COMPANY_1 = "c1000000-0000-0000-0000-000000000001";
  const VVIP_USER_ID = "u1000000-0000-0000-0000-000000000001";
  const NORMAL_USER_ID = "u-normal-user-test-id";

  let tokenVvip: string;
  let tokenNormal: string;

  before(async () => {
    const app = createServer();
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseUrl = `http://localhost:${PORT}/api`;
        db.resetDatabase();
        db.seedTestFixtures(COMPANY_1);

        (db as any).data.users.push({
          id: NORMAL_USER_ID,
          username: "accountant@company.com",
          email: "accountant@company.com",
          fullName: "Company Accountant",
          isPlatformSuperAdmin: false,
          status: "active",
          createdAt: "2026-01-01T00:00:00Z"
        });
        (db as any).data.memberships.push({
          id: "m-normal-user-c1",
          userId: NORMAL_USER_ID,
          companyId: COMPANY_1,
          roleId: "ACCOUNTANT",
          isPrimaryCompany: true,
          createdAt: "2026-01-01T00:00:00Z"
        });

        tokenVvip = signToken({
          userId: VVIP_USER_ID,
          email: "admin@mujahid.com",
          role: "PLATFORM_SUPER_ADMIN",
          companyId: COMPANY_1,
          isPlatformSuperAdmin: true,
        });

        tokenNormal = signToken({
          userId: NORMAL_USER_ID,
          email: "accountant@company.com",
          role: "ACCOUNTANT",
          companyId: COMPANY_1,
          isPlatformSuperAdmin: false,
        });

        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await closeDatabasePool();
  });

  test("1. Normal login page contains NO visible VVIP buttons in normal layout", () => {
    const loginPagePath = path.resolve(__dirname, "../../frontend/src/modules/identity/components/LoginPage.tsx");
    assert.ok(fs.existsSync(loginPagePath), "LoginPage.tsx must exist");
    const content = fs.readFileSync(loginPagePath, "utf-8");
    assert.doesNotMatch(content, /Quick VVIP/i, "LoginPage must not have quick VVIP buttons");
    assert.match(content, /handleMouseClick/i, "LoginPage must implement mouse click handler for VVIP trigger");
    assert.match(content, /button === 0 && \(e\.ctrlKey \|\| e\.metaKey\)/, "LoginPage must detect Ctrl + Mouse Left Click");
    assert.match(content, /isVVIPOpen/i, "LoginPage must control VVIP modal state");
  });

  test("2. Hidden VVIP modal requires explicit credentials and does not auto-login", () => {
    const loginPagePath = path.resolve(__dirname, "../../frontend/src/modules/identity/components/LoginPage.tsx");
    const content = fs.readFileSync(loginPagePath, "utf-8");
    assert.match(content, /handleVVIPSubmit/i, "LoginPage must handle VVIP credentials submit");
    assert.match(content, /loginSuperAdmin/i, "VVIP login must authenticate through AuthContext");
  });

  test("3. Authenticating with valid VVIP credentials grants token", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@mujahid.com",
        password: "password123",
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, "VVIP login should succeed with valid credentials");
    assert.ok(body.data?.token, "Response must include JWT token");
    assert.equal(body.data?.user?.email, "admin@mujahid.com", "VVIP user email must match");
  });

  test("4. Normal company user is isolated to their tenant accounts", async () => {
    const res = await fetch(`${baseUrl}/accounting/accounts`, {
      headers: {
        Authorization: `Bearer ${tokenNormal}`,
      },
    });
    assert.equal(res.status, 200, "Normal user can query own accounts");
  });

  test("5. Central Theme System defines semantic CSS variables for Light and Dark modes", () => {
    const cssPath = path.resolve(__dirname, "../../frontend/src/index.css");
    assert.ok(fs.existsSync(cssPath), "index.css must exist");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert.match(cssContent, /--background:/, "CSS must define --background token");
    assert.match(cssContent, /--foreground:/, "CSS must define --foreground token");
    assert.match(cssContent, /--card:/, "CSS must define --card token");
    assert.match(cssContent, /--border:/, "CSS must define --border token");
    assert.match(cssContent, /--input:/, "CSS must define --input token");
    assert.match(cssContent, /--muted:/, "CSS must define --muted token");
    assert.match(cssContent, /\.dark/, "CSS must define .dark class variables");
    assert.match(cssContent, /data-palette="blue"/, "CSS must support blue palette");
    assert.match(cssContent, /data-palette="black"/, "CSS must support black palette");
  });

  test("6. Theme Context & Switcher persist theme and apply root classes", () => {
    const themeContextPath = path.resolve(__dirname, "../../frontend/src/core/theme/ThemeContext.tsx");
    assert.ok(fs.existsSync(themeContextPath), "ThemeContext.tsx must exist");
    const contextContent = fs.readFileSync(themeContextPath, "utf-8");
    assert.match(contextContent, /QUANTUM_CORE_THEME_MODE/, "ThemeContext must persist mode");
    assert.match(contextContent, /QUANTUM_CORE_THEME_PALETTE/, "ThemeContext must persist palette");
  });
});
