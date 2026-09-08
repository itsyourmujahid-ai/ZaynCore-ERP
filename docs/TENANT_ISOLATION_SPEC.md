# Tenant Isolation & Security Specification

---

## 1. Multi-Tenant Architecture Overview

The platform implements a **Shared Database, Shared Schema, Row-Level Partitioning** multi-tenancy model backed by strict database-level Row Level Security (RLS) policies and service-level contextual guards.

### Guarantees
1. **No Data Leakage**: Company A can never read, query, update, or aggregate Company B's records.
2. **Cryptographic Context Derivation**: The active `company_id` is derived on the server from authenticated JWT/session tokens and verified against the `company_memberships` table. Client requests cannot spoof the tenant context.
3. **Defense in Depth**: Isolation is enforced at 3 separate architectural layers:
   - **Layer 1 (Database)**: PostgreSQL Row Level Security (RLS) policies using session variables.
   - **Layer 2 (Service Layer)**: Repository query filters and `TenantContext` injection on every operation.
   - **Layer 3 (Presentation Layer)**: Contextual UI stores that purge state when switching companies.

---

## 2. Super Admin Separation

- Platform Super Admins exist in a dedicated `platform_admins` role.
- Super Admins can manage companies, toggle module capabilities, monitor tenant storage usage, and inspect global health.
- Super Admin operations bypass tenant RLS only for tenant provisioning and platform administration, but never pollute customer general ledgers or customer business transactions.
