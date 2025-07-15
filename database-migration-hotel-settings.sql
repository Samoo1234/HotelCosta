-- Migration script para adicionar campos de configuração à tabela hotels
-- Execute este script no painel SQL do Supabase se você já executou o database-setup.sql anteriormente

-- Adicionar colunas de configuração à tabela hotels
ALTER TABLE hotels 
ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '14:00',
ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '12:00',
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0.00;

-- Atualizar hotel existente com valores padrão se necessário
UPDATE hotels 
SET 
  check_in_time = COALESCE(check_in_time, '14:00'),
  check_out_time = COALESCE(check_out_time, '12:00'),
  currency = COALESCE(currency, 'BRL'),
  timezone = COALESCE(timezone, 'America/Sao_Paulo'),
  tax_rate = COALESCE(tax_rate, 0.00)
WHERE check_in_time IS NULL OR check_out_time IS NULL OR currency IS NULL OR timezone IS NULL OR tax_rate IS NULL;

SELECT 'Hotel settings migration completed successfully!' as status;