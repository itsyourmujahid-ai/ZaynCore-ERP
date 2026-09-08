# Enterprise ERP Database Schema & Migrations

This directory contains PostgreSQL DDL schema migrations, Row-Level Security (RLS) policies, and seed scripts.

## Directory Structure
- `migrations/`: Contains numbered schema migrations (`001_initial_schema.sql`).
- `seeds/`: Contains initial master data seeds (`001_chart_of_accounts.sql`).

## Running Migrations
To run migrations against a target PostgreSQL instance:
```bash
psql -U postgres -d enterprise_erp -f db/migrations/001_initial_schema.sql
psql -U postgres -d enterprise_erp -f db/seeds/001_chart_of_accounts.sql
```
