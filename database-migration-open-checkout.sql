-- Migration script para permitir check-out em aberto (estadias prolongadas)
-- Execute este script no painel SQL do Supabase

-- Permitir que check_out_date seja NULL para estadias em aberto
ALTER TABLE reservations 
ALTER COLUMN check_out_date DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN reservations.check_out_date IS 'Data de check-out. Pode ser NULL para estadias em aberto (check-out indefinido)';

-- Adicionar constraint para garantir que se check_out_date não for NULL, deve ser posterior ao check_in_date
ALTER TABLE reservations 
ADD CONSTRAINT check_checkout_after_checkin 
CHECK (check_out_date IS NULL OR check_out_date > check_in_date);

-- Atualizar o status para incluir 'no_show' se ainda não existir
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations 
ADD CONSTRAINT reservations_status_check 
CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'));

-- Criar índice para consultas de reservas em aberto
CREATE INDEX IF NOT EXISTS idx_reservations_open_checkout 
ON reservations(check_in_date) 
WHERE check_out_date IS NULL;

-- Criar view para facilitar consultas de reservas em aberto
CREATE OR REPLACE VIEW open_reservations AS
SELECT 
  r.*,
  g.first_name,
  g.last_name,
  g.company_name,
  g.trade_name,
  g.email,
  g.phone,
  rm.room_number,
  rm.room_type,
  rm.price_per_night,
  -- Calcular dias de estadia até hoje
  CASE 
    WHEN r.check_out_date IS NULL THEN 
      GREATEST(1, (CURRENT_DATE - r.check_in_date) + 1)
    ELSE 
      (r.check_out_date - r.check_in_date)
  END as days_stayed,
  -- Calcular valor total baseado nos dias até hoje
  CASE 
    WHEN r.check_out_date IS NULL THEN 
      rm.price_per_night * GREATEST(1, (CURRENT_DATE - r.check_in_date) + 1)
    ELSE 
      r.total_amount
  END as current_total_amount
FROM reservations r
JOIN guests g ON r.guest_id = g.id
JOIN rooms rm ON r.room_id = rm.id
WHERE r.check_out_date IS NULL 
  AND r.status IN ('confirmed', 'checked_in');

-- Criar função para finalizar check-out de reservas em aberto
CREATE OR REPLACE FUNCTION finalize_checkout(
  reservation_id UUID,
  checkout_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  final_amount DECIMAL(10,2)
) AS $$
DECLARE
  reservation_record RECORD;
  calculated_amount DECIMAL(10,2);
  days_stayed INTEGER;
BEGIN
  -- Buscar a reserva
  SELECT r.*, rm.price_per_night
  INTO reservation_record
  FROM reservations r
  JOIN rooms rm ON r.room_id = rm.id
  WHERE r.id = reservation_id
    AND r.check_out_date IS NULL
    AND r.status IN ('confirmed', 'checked_in');
  
  -- Verificar se a reserva existe e está em aberto
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Reserva não encontrada ou não está em aberto'::TEXT, 0.00::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- Verificar se a data de checkout é válida
  IF checkout_date < reservation_record.check_in_date THEN
    RETURN QUERY SELECT FALSE, 'Data de check-out não pode ser anterior ao check-in'::TEXT, 0.00::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- Calcular dias de estadia (mínimo 1 dia)
  days_stayed := GREATEST(1, (checkout_date - reservation_record.check_in_date) + 1);
  
  -- Calcular valor total
  calculated_amount := reservation_record.price_per_night * days_stayed;
  
  -- Atualizar a reserva
  UPDATE reservations 
  SET 
    check_out_date = checkout_date,
    total_amount = calculated_amount,
    status = 'checked_out',
    updated_at = NOW()
  WHERE id = reservation_id;
  
  -- Atualizar status do quarto para disponível
  UPDATE rooms 
  SET status = 'available', updated_at = NOW()
  WHERE id = reservation_record.room_id;
  
  RETURN QUERY SELECT TRUE, 'Check-out finalizado com sucesso'::TEXT, calculated_amount;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar automaticamente o status do quarto
CREATE OR REPLACE FUNCTION update_room_status_on_reservation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a reserva foi cancelada ou teve check-out, liberar o quarto
  IF NEW.status IN ('cancelled', 'checked_out') AND OLD.status NOT IN ('cancelled', 'checked_out') THEN
    UPDATE rooms SET status = 'available', updated_at = NOW() WHERE id = NEW.room_id;
  
  -- Se fez check-in, marcar quarto como ocupado
  ELSIF NEW.status = 'checked_in' AND OLD.status != 'checked_in' THEN
    UPDATE rooms SET status = 'occupied', updated_at = NOW() WHERE id = NEW.room_id;
  
  -- Se confirmou reserva, marcar como reservado
  ELSIF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE rooms SET status = 'reserved', updated_at = NOW() WHERE id = NEW.room_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_update_room_status ON reservations;
CREATE TRIGGER trigger_update_room_status
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_status_on_reservation_change();

SELECT 'Migration for open checkout completed successfully!' as status;
SELECT 'New features:' as info;
SELECT '- Check-out date can now be NULL for open stays' as feature1;
SELECT '- View "open_reservations" shows current open stays with calculated amounts' as feature2;
SELECT '- Function "finalize_checkout()" to close open stays' as feature3;
SELECT '- Automatic room status updates via triggers' as feature4;