-- ============================================================================
-- ENTERPRISE ACCOUNTING ERP — DEFAULT DEMO COMPANY SEED
-- ============================================================================

INSERT INTO companies (id, code, name, legal_name, country_code, industry, tier, base_currency, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'DEMO-CORP',
  'Acme Global Enterprise Inc',
  'Acme Global Enterprise Incorporated',
  'US',
  'Technology & Manufacturing',
  'enterprise',
  'USD',
  'active'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
