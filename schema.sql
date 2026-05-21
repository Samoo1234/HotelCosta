-- =============================================================================
-- SCHEMA COMPLETO DO SISTEMA HOTEL COSTA
-- Execute este script no painel SQL do Supabase para criar o banco de dados
-- =============================================================================
-- Versão: 1.0
-- Data: 2025-12-26
-- =============================================================================

-- =============================================================================
-- SEÇÃO 1: LIMPEZA (OPCIONAL - Descomente se quiser recriar do zero)
-- =============================================================================
-- DROP VIEW IF EXISTS low_stock_alert CASCADE;
-- DROP VIEW IF EXISTS consumption_report CASCADE;
-- DROP VIEW IF EXISTS open_reservations CASCADE;
-- DROP TABLE IF EXISTS stock_movements CASCADE;
-- DROP TABLE IF EXISTS room_consumptions CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS product_categories CASCADE;
-- DROP TABLE IF EXISTS system_logs CASCADE;
-- DROP TABLE IF EXISTS activity_logs CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS reservations CASCADE;
-- DROP TABLE IF EXISTS guests CASCADE;
-- DROP TABLE IF EXISTS rooms CASCADE;
-- DROP TABLE IF EXISTS hotels CASCADE;

-- =============================================================================
-- SEÇÃO 2: TABELAS PRINCIPAIS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 Tabela de Hotéis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  description TEXT,
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '12:00',
  currency VARCHAR(3) DEFAULT 'BRL',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  website VARCHAR(255),
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2.2 Tabela de Quartos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  room_number VARCHAR(10) NOT NULL,
  room_type VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  amenities TEXT[],
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2.3 Tabela de Hóspedes (Pessoas Físicas e Empresas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_type VARCHAR(20) DEFAULT 'individual' CHECK (client_type IN ('individual', 'company')),
  -- Campos para pessoa física
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  -- Campos para empresa
  company_name VARCHAR(255),
  trade_name VARCHAR(255),
  contact_person VARCHAR(200),
  -- Campos comuns
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  document_type VARCHAR(20) NOT NULL,
  document_number VARCHAR(50) NOT NULL UNIQUE,
  address TEXT,
  nationality VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraints
  CONSTRAINT check_individual_fields CHECK (
    (client_type = 'individual' AND first_name IS NOT NULL AND last_name IS NOT NULL) OR
    (client_type = 'company' AND company_name IS NOT NULL)
  )
);

-- -----------------------------------------------------------------------------
-- 2.4 Tabela de Reservas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE, -- Pode ser NULL para estadias em aberto
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  special_requests TEXT,
  -- Campos adicionais
  reservation_code VARCHAR(20) UNIQUE,
  actual_check_in_date TIMESTAMP WITH TIME ZONE,
  actual_check_out_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  no_show_at TIMESTAMP WITH TIME ZONE,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraint para check-out após check-in
  CONSTRAINT check_checkout_after_checkin CHECK (check_out_date IS NULL OR check_out_date > check_in_date)
);

-- Comentários para documentação da tabela reservations
COMMENT ON COLUMN reservations.check_out_date IS 'Data de check-out. Pode ser NULL para estadias em aberto (check-out indefinido)';
COMMENT ON COLUMN reservations.reservation_code IS 'Código único da reserva para identificação';
COMMENT ON COLUMN reservations.actual_check_in_date IS 'Data e hora real do check-in';
COMMENT ON COLUMN reservations.actual_check_out_date IS 'Data e hora real do check-out';
COMMENT ON COLUMN reservations.cancelled_at IS 'Data e hora do cancelamento da reserva';
COMMENT ON COLUMN reservations.status_updated_at IS 'Data e hora da última atualização de status';
COMMENT ON COLUMN reservations.no_show_at IS 'Data e hora quando marcado como no-show';
COMMENT ON COLUMN reservations.cancellation_date IS 'Data e hora em que a reserva foi cancelada';
COMMENT ON COLUMN reservations.cancellation_reason IS 'Motivo do cancelamento da reserva';

-- -----------------------------------------------------------------------------
-- 2.5 Tabela de Pagamentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  transaction_id VARCHAR(255),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SEÇÃO 3: SISTEMA DE PRODUTOS E MINIBAR
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 Categorias de Produtos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- nome do ícone para UI
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3.2 Produtos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2), -- preço de custo para relatórios
  barcode VARCHAR(100), -- código de barras se houver
  sku VARCHAR(50), -- código interno
  stock_quantity INTEGER DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 5, -- alerta de estoque mínimo
  unit VARCHAR(20) DEFAULT 'unidade', -- unidade, litro, kg, etc
  image_url TEXT, -- URL da imagem do produto
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3.3 Consumos por Quarto
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_consumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL, -- preço unitário no momento do consumo
  total_amount DECIMAL(10,2) NOT NULL, -- quantidade * preço unitário
  consumption_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Campo para separar responsabilidade de pagamento
  payment_responsibility VARCHAR(20) DEFAULT 'guest' CHECK (payment_responsibility IN ('guest', 'company')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'billed', 'paid', 'cancelled')),
  notes TEXT, -- observações sobre o consumo
  registered_by VARCHAR(100), -- quem registrou (hóspede, recepção, etc)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3.4 Movimentação de Estoque
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason VARCHAR(100), -- compra, venda, ajuste, perda, etc
  reference_id UUID, -- ID da referência (consumo, compra, etc)
  reference_type VARCHAR(50), -- tipo da referência
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- =============================================================================
-- SEÇÃO 4: SISTEMA DE LOGS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 System Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  user_id VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  source VARCHAR(50) DEFAULT 'web',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE system_logs IS 'Tabela para armazenar logs do sistema';
COMMENT ON COLUMN system_logs.level IS 'Nível do log: debug, info, warning, error, critical';
COMMENT ON COLUMN system_logs.category IS 'Categoria do log: reservation, payment, user, system, consumption, room, guest';
COMMENT ON COLUMN system_logs.message IS 'Mensagem do log';
COMMENT ON COLUMN system_logs.details IS 'Detalhes adicionais em formato JSON';
COMMENT ON COLUMN system_logs.user_id IS 'ID do usuário que gerou o log';
COMMENT ON COLUMN system_logs.entity_type IS 'Tipo da entidade relacionada (reservation, payment, etc.)';
COMMENT ON COLUMN system_logs.entity_id IS 'ID da entidade relacionada';
COMMENT ON COLUMN system_logs.source IS 'Origem do log (web, mobile, api, etc.)';
COMMENT ON COLUMN system_logs.tags IS 'Tags para categorização adicional';

-- -----------------------------------------------------------------------------
-- 4.2 Activity Logs
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- SEÇÃO 5: ÍNDICES PARA PERFORMANCE
-- =============================================================================

-- Índices para rooms
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Índices para guests
CREATE INDEX IF NOT EXISTS idx_guests_client_type ON guests(client_type);
CREATE INDEX IF NOT EXISTS idx_guests_document ON guests(document_type, document_number);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);

-- Índices para reservations
CREATE INDEX IF NOT EXISTS idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code);
CREATE INDEX IF NOT EXISTS idx_reservations_actual_checkin ON reservations(actual_check_in_date);
CREATE INDEX IF NOT EXISTS idx_reservations_actual_checkout ON reservations(actual_check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_cancelled ON reservations(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_reservations_status_updated ON reservations(status_updated_at);
CREATE INDEX IF NOT EXISTS idx_reservations_no_show ON reservations(no_show_at);
CREATE INDEX IF NOT EXISTS idx_reservations_cancellation_date ON reservations(cancellation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_open_checkout ON reservations(check_in_date) WHERE check_out_date IS NULL;

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Índices para room_consumptions
CREATE INDEX IF NOT EXISTS idx_room_consumptions_reservation ON room_consumptions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_room_consumptions_room ON room_consumptions(room_id);
CREATE INDEX IF NOT EXISTS idx_room_consumptions_product ON room_consumptions(product_id);
CREATE INDEX IF NOT EXISTS idx_room_consumptions_date ON room_consumptions(consumption_date);
CREATE INDEX IF NOT EXISTS idx_room_consumptions_status ON room_consumptions(status);
CREATE INDEX IF NOT EXISTS idx_room_consumptions_payment_resp ON room_consumptions(payment_responsibility);

-- Índices para stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- Índices para system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity ON system_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);

-- Índices para activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- =============================================================================
-- SEÇÃO 6: FUNÇÕES E TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6.1 Função para gerar código de reserva automaticamente
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6.2 Função para atualizar estoque automaticamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um consumo é registrado, diminui o estoque
  IF TG_OP = 'INSERT' THEN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    -- Registra movimento de estoque
    INSERT INTO stock_movements (product_id, movement_type, quantity, reason, reference_id, reference_type)
    VALUES (NEW.product_id, 'out', NEW.quantity, 'Consumo no quarto', NEW.id, 'room_consumption');
    
    RETURN NEW;
  END IF;
  
  -- Quando um consumo é cancelado, volta o estoque
  IF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    -- Registra movimento de estoque
    INSERT INTO stock_movements (product_id, movement_type, quantity, reason, reference_id, reference_type)
    VALUES (NEW.product_id, 'in', NEW.quantity, 'Cancelamento de consumo', NEW.id, 'room_consumption_cancelled');
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estoque automaticamente
DROP TRIGGER IF EXISTS trigger_update_stock ON room_consumptions;
CREATE TRIGGER trigger_update_stock
  AFTER INSERT OR UPDATE ON room_consumptions
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- -----------------------------------------------------------------------------
-- 6.3 Função para atualizar status do quarto com base na reserva
-- -----------------------------------------------------------------------------
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

-- Trigger para atualizar status do quarto
DROP TRIGGER IF EXISTS trigger_update_room_status ON reservations;
CREATE TRIGGER trigger_update_room_status
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_status_on_reservation_change();

-- -----------------------------------------------------------------------------
-- 6.4 Função para finalizar check-out de reservas em aberto
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- SEÇÃO 7: VIEWS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7.1 View para relatórios de consumo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW consumption_report AS
SELECT 
  rc.id,
  rc.consumption_date,
  r.room_number,
  CASE 
    WHEN g.client_type = 'individual' THEN CONCAT(g.first_name, ' ', g.last_name)
    ELSE COALESCE(g.trade_name, g.company_name)
  END as guest_name,
  g.client_type,
  p.name as product_name,
  pc.name as category_name,
  rc.quantity,
  rc.unit_price,
  rc.total_amount,
  rc.payment_responsibility,
  rc.status,
  res.check_in_date,
  res.check_out_date
FROM room_consumptions rc
JOIN reservations res ON rc.reservation_id = res.id
JOIN rooms r ON rc.room_id = r.id
JOIN guests g ON res.guest_id = g.id
JOIN products p ON rc.product_id = p.id
LEFT JOIN product_categories pc ON p.category_id = pc.id
ORDER BY rc.consumption_date DESC;

-- -----------------------------------------------------------------------------
-- 7.2 View para alerta de estoque baixo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW low_stock_alert AS
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock_quantity,
  p.min_stock_alert,
  pc.name as category_name
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
WHERE p.active = true 
  AND p.stock_quantity <= p.min_stock_alert
ORDER BY p.stock_quantity ASC;

-- -----------------------------------------------------------------------------
-- 7.3 View para reservas em aberto
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- SEÇÃO 8: DADOS INICIAIS (OPCIONAL)
-- =============================================================================

-- Hotel de exemplo
INSERT INTO hotels (name, address, phone, email, description) 
SELECT 'Hotel Costa', 'Rua das Flores, 123 - Centro', '(11) 1234-5678', 'contato@hotelcosta.com', 'Um hotel aconchegante no centro da cidade'
WHERE NOT EXISTS (SELECT 1 FROM hotels);

-- Categorias de produtos padrão
INSERT INTO product_categories (name, description, icon, display_order) 
SELECT 'Bebidas', 'Águas, refrigerantes, sucos', 'droplets', 1
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Bebidas');

INSERT INTO product_categories (name, description, icon, display_order) 
SELECT 'Bebidas Alcoólicas', 'Cervejas, vinhos, destilados', 'wine', 2
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Bebidas Alcoólicas');

INSERT INTO product_categories (name, description, icon, display_order) 
SELECT 'Snacks', 'Salgadinhos, biscoitos, chocolates', 'cookie', 3
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Snacks');

INSERT INTO product_categories (name, description, icon, display_order) 
SELECT 'Higiene', 'Produtos de higiene pessoal', 'sparkles', 4
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Higiene');

INSERT INTO product_categories (name, description, icon, display_order) 
SELECT 'Outros', 'Produtos diversos', 'package', 5
WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Outros');

-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
SELECT 'Schema do Hotel Costa criado com sucesso!' as status;
