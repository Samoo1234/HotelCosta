-- Migration script para adicionar campos faltantes nas tabelas
-- Execute este script no painel SQL do Supabase

-- Adicionar campos faltantes na tabela reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS reservation_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS actual_check_in_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_check_out_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN reservations.reservation_code IS 'Código único da reserva para identificação';
COMMENT ON COLUMN reservations.actual_check_in_date IS 'Data e hora real do check-in';
COMMENT ON COLUMN reservations.actual_check_out_date IS 'Data e hora real do check-out';
COMMENT ON COLUMN reservations.cancelled_at IS 'Data e hora do cancelamento da reserva';
COMMENT ON COLUMN reservations.status_updated_at IS 'Data e hora da última atualização de status';
COMMENT ON COLUMN reservations.no_show_at IS 'Data e hora quando marcado como no-show';
COMMENT ON COLUMN reservations.cancellation_date IS 'Data e hora em que a reserva foi cancelada';
COMMENT ON COLUMN reservations.cancellation_reason IS 'Motivo do cancelamento da reserva';

-- Gerar códigos de reserva para reservas existentes que não possuem
UPDATE reservations 
SET reservation_code = 'RES' || LPAD(EXTRACT(YEAR FROM created_at)::TEXT, 4, '0') || 
                      LPAD(EXTRACT(MONTH FROM created_at)::TEXT, 2, '0') || 
                      LPAD(EXTRACT(DAY FROM created_at)::TEXT, 2, '0') || 
                      LPAD((EXTRACT(EPOCH FROM created_at)::BIGINT % 10000)::TEXT, 4, '0')
WHERE reservation_code IS NULL;

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code);
CREATE INDEX IF NOT EXISTS idx_reservations_actual_checkin ON reservations(actual_check_in_date);
CREATE INDEX IF NOT EXISTS idx_reservations_actual_checkout ON reservations(actual_check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_cancelled ON reservations(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_reservations_status_updated ON reservations(status_updated_at);
CREATE INDEX IF NOT EXISTS idx_reservations_no_show ON reservations(no_show_at);
CREATE INDEX IF NOT EXISTS idx_reservations_cancellation_date ON reservations(cancellation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_cancellation_reason ON reservations(cancellation_reason);

-- Função para gerar código de reserva automaticamente
CREATE OR REPLACE FUNCTION generate_reservation_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code VARCHAR(20);
    counter INTEGER := 1;
BEGIN
    -- Gerar código base
    new_code := 'RES' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(counter::TEXT, 4, '0');
    
    -- Verificar se já existe e incrementar se necessário
    WHILE EXISTS (SELECT 1 FROM reservations WHERE reservation_code = new_code) LOOP
        counter := counter + 1;
        new_code := 'RES' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(counter::TEXT, 4, '0');
    END LOOP;
    
    NEW.reservation_code := new_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automaticamente em novas reservas
DROP TRIGGER IF EXISTS trigger_generate_reservation_code ON reservations;
CREATE TRIGGER trigger_generate_reservation_code
    BEFORE INSERT ON reservations
    FOR EACH ROW
    WHEN (NEW.reservation_code IS NULL)
    EXECUTE FUNCTION generate_reservation_code();

-- Verificar se a tabela activity_logs existe, se não, criar
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    user_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Atualizar constraint de status para incluir 'no_show' se ainda não existir
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations 
ADD CONSTRAINT reservations_status_check 
CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'));

SELECT 'Migration for missing fields completed successfully!' as status;
SELECT 'Added fields: reservation_code, actual_check_in_date, actual_check_out_date, cancelled_at, status_updated_at, no_show_at, cancellation_date, cancellation_reason' as info;
SELECT 'Created activity_logs table if not exists' as info2;
SELECT 'Updated status constraint to include no_show' as info3;
SELECT 'Fixed check-in error: status_updated_at column now exists' as info4;
SELECT 'Fixed cancellation error: cancellation_date and cancellation_reason columns now exist' as info5;