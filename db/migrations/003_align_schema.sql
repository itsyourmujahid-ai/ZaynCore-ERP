-- ============================================================================
-- ENTERPRISE ACCOUNTING ERP — SCHEMA ALIGNMENT MIGRATION
-- ============================================================================

ALTER TABLE chart_of_accounts ALTER COLUMN group_id DROP NOT NULL;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chart_of_accounts' AND column_name = 'normal_balance'
  ) THEN
    ALTER TABLE chart_of_accounts ADD COLUMN normal_balance VARCHAR(10) NOT NULL DEFAULT 'debit';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chart_of_accounts' AND column_name = 'is_reconciled'
  ) THEN
    ALTER TABLE chart_of_accounts ADD COLUMN is_reconciled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;
