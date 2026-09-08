import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkDatabaseConnection, closeDatabasePool } from "../../backend/src/database/pg-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

describe("ENTERPRISE ERP — Backup, Recovery & Portability Audit Suite", () => {
  after(async () => {
    await closeDatabasePool();
  });

  // ==========================================================================
  // 1. GITHUB PORTABILITY & REPOSITORY STRUCTURE
  // ==========================================================================
  test("1. All required project manifests, workspace configs, and Vercel configs exist in repository", () => {
    const requiredFiles = [
      "package.json",
      "tsconfig.json",
      ".gitignore",
      ".env.example",
      "vercel.json",
      "frontend/vercel.json",
      "frontend/package.json",
      "backend/package.json",
      "shared/package.json",
      "docs/ARCHITECTURE.md",
      "docs/DEPLOYMENT.md",
      "docs/DATABASE.md",
      "docs/DISASTER-RECOVERY.md",
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Required repository file '${relPath}' must exist`);
    }
  });

  // ==========================================================================
  // 2. ENVIRONMENT & SECRET MANAGEMENT HYGIENE
  // ==========================================================================
  test("2. Environment template files contain ONLY safe placeholders and NO secrets", () => {
    const envTemplates = [".env.example", "backend/.env.example", "frontend/.env.example"];
    const forbiddenPatterns = [
      "aQvcyYDsgMoDGqfB",
      "SUPABASE_SERVICE_ROLE_KEY",
      "eyJh",
      "password123",
      "sb_publishable_",
    ];

    for (const envFile of envTemplates) {
      const fullPath = path.join(rootDir, envFile);
      assert.ok(fs.existsSync(fullPath), `${envFile} must exist`);
      const content = fs.readFileSync(fullPath, "utf8");

      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !content.includes(pattern),
          `Template file '${envFile}' must NOT contain secret string: '${pattern}'`
        );
      }
    }
  });

  test("3. Source code contains NO hardcoded database passwords or secrets", () => {
    const sourceFilesToCheck = [
      "backend/src/database/pg-client.ts",
      "backend/src/database/migrate.ts",
    ];

    for (const file of sourceFilesToCheck) {
      const fullPath = path.join(rootDir, file);
      const content = fs.readFileSync(fullPath, "utf8");
      assert.ok(!content.includes("aQvcyYDsgMoDGqfB"), `${file} must NOT have hardcoded passwords`);
      assert.ok(content.includes("process.env.DATABASE_URL"), `${file} must read from process.env`);
    }
  });

  // ==========================================================================
  // 3. DATABASE MIGRATION REPRODUCIBILITY
  // ==========================================================================
  test("4. Migration sequence is complete, deterministic, and all SQL files exist", () => {
    const migrationsDir = path.join(rootDir, "db/migrations");
    assert.ok(fs.existsSync(migrationsDir), "db/migrations directory must exist");

    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
    assert.ok(migrationFiles.length >= 3, "At least 3 SQL migration files must exist");
    assert.equal(migrationFiles[0], "001_initial_schema.sql");
    assert.equal(migrationFiles[1], "002_commercial_operations_schema.sql");
    assert.equal(migrationFiles[2], "003_align_schema.sql");

    // Verify SQL syntax non-empty
    for (const file of migrationFiles) {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      assert.ok(sqlContent.length > 50, `Migration ${file} must contain DDL SQL definitions`);
    }
  });

  // ==========================================================================
  // 4. DISASTER RECOVERY & DEPLOYMENT DOCUMENTATION
  // ==========================================================================
  test("5. Comprehensive Deployment and Disaster Recovery documents exist", () => {
    const docFiles = [
      "docs/DEPLOYMENT.md",
      "docs/DATABASE.md",
      "docs/DISASTER-RECOVERY.md",
      "docs/ARCHITECTURE.md",
    ];

    for (const doc of docFiles) {
      const fullPath = path.join(rootDir, doc);
      const content = fs.readFileSync(fullPath, "utf8");
      assert.ok(content.length > 500, `${doc} must contain comprehensive documentation`);
      assert.ok(content.includes("PostgreSQL") || content.includes("Vercel"), `${doc} must mention core infrastructure`);
    }
  });

  // ==========================================================================
  // 5. LIVE SUPABASE POSTGRESQL CONNECTIVITY & HEALTH
  // ==========================================================================
  test("6. Live PostgreSQL connectivity is healthy and responsive", async () => {
    const health = await checkDatabaseConnection();
    assert.equal(health.connected, true, "Database connection must be established");
    assert.ok(health.version?.includes("PostgreSQL"), "Database engine must be PostgreSQL");
    assert.ok(health.timestamp, "Must return valid timestamp from database");
  });
});
