-- Adiciona a coluna cancellation_date à tabela reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP WITH TIME ZONE;

-- Adiciona um comentário à coluna para documentação
COMMENT ON COLUMN reservations.cancellation_date IS 'Data e hora em que a reserva foi cancelada';

-- Atualiza o schema cache do PostgREST (pode ser necessário reiniciar o serviço)
NOTIFY pgrst, 'reload schema';