-- Migration script para corrigir o trigger de atualização de status do quarto
-- Corrige o problema onde novos check-ins ou reservas confirmadas criadas via INSERT
-- não atualizavam o status do quarto correspondente.
-- Execute este script no painel SQL do Supabase.

-- 1. Recriar a função do trigger para suportar INSERT, UPDATE e mudança de quarto de forma robusta
CREATE OR REPLACE FUNCTION update_room_status_on_reservation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Casos de INSERT (Novas reservas criadas diretamente com check-in ou confirmadas)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'checked_in' THEN
      UPDATE rooms SET status = 'occupied', updated_at = NOW() WHERE id = NEW.room_id;
    ELSIF NEW.status = 'confirmed' THEN
      UPDATE rooms SET status = 'reserved', updated_at = NOW() WHERE id = NEW.room_id;
    ELSIF NEW.status IN ('cancelled', 'checked_out', 'no_show') THEN
      UPDATE rooms SET status = 'available', updated_at = NOW() WHERE id = NEW.room_id;
    END IF;
    
  -- 2. Casos de UPDATE (Alteração de status ou mudança de quarto)
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se houve mudança de quarto (ex: alterando quarto de uma reserva ativa)
    IF NEW.room_id IS DISTINCT FROM OLD.room_id THEN
      -- Liberar o quarto antigo
      UPDATE rooms SET status = 'available', updated_at = NOW() WHERE id = OLD.room_id;
      
      -- Definir status do novo quarto baseado no status atual da reserva
      IF NEW.status = 'checked_in' THEN
        UPDATE rooms SET status = 'occupied', updated_at = NOW() WHERE id = NEW.room_id;
      ELSIF NEW.status = 'confirmed' THEN
        UPDATE rooms SET status = 'reserved', updated_at = NOW() WHERE id = NEW.room_id;
      ELSIF NEW.status IN ('cancelled', 'checked_out', 'no_show') THEN
        UPDATE rooms SET status = 'available', updated_at = NOW() WHERE id = NEW.room_id;
      END IF;
      
    -- Se não mudou de quarto, mas mudou de status
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'checked_in' THEN
        UPDATE rooms SET status = 'occupied', updated_at = NOW() WHERE id = NEW.room_id;
      ELSIF NEW.status = 'confirmed' THEN
        UPDATE rooms SET status = 'reserved', updated_at = NOW() WHERE id = NEW.room_id;
      ELSIF NEW.status IN ('cancelled', 'checked_out', 'no_show') THEN
        UPDATE rooms SET status = 'available', updated_at = NOW() WHERE id = NEW.room_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar o trigger associando-o a INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_update_room_status ON reservations;
CREATE TRIGGER trigger_update_room_status
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_status_on_reservation_change();

SELECT 'Trigger de status do quarto atualizado com sucesso!' as status;
