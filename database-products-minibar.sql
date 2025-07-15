-- Script SQL para Sistema de Gestão de Produtos da Conveniência/Minibar
-- Execute este script no painel SQL do Supabase após o database-setup.sql

-- Tabela de categorias de produtos
CREATE TABLE product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- nome do ícone para UI
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE products (
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

-- Tabela de consumos por quarto
CREATE TABLE room_consumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL, -- preço unitário no momento do consumo
  total_amount DECIMAL(10,2) NOT NULL, -- quantidade * preço unitário
  consumption_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- CAMPO ESPECÍFICO PARA SEPARAR RESPONSABILIDADE DE PAGAMENTO
  payment_responsibility VARCHAR(20) DEFAULT 'guest' CHECK (payment_responsibility IN ('guest', 'company')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'billed', 'paid', 'cancelled')),
  notes TEXT, -- observações sobre o consumo
  registered_by VARCHAR(100), -- quem registrou (hóspede, recepção, etc)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de movimentação de estoque
CREATE TABLE stock_movements (
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

-- Índices para performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_room_consumptions_reservation ON room_consumptions(reservation_id);
CREATE INDEX idx_room_consumptions_room ON room_consumptions(room_id);
CREATE INDEX idx_room_consumptions_product ON room_consumptions(product_id);
CREATE INDEX idx_room_consumptions_date ON room_consumptions(consumption_date);
CREATE INDEX idx_room_consumptions_status ON room_consumptions(status);
CREATE INDEX idx_room_consumptions_payment_resp ON room_consumptions(payment_responsibility);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);

-- Inserir categorias padrão
INSERT INTO product_categories (name, description, icon, display_order) VALUES
('Bebidas', 'Águas, refrigerantes, sucos', 'droplets', 1),
('Bebidas Alcoólicas', 'Cervejas, vinhos, destilados', 'wine', 2),
('Snacks', 'Salgadinhos, biscoitos, chocolates', 'cookie', 3),
('Higiene', 'Produtos de higiene pessoal', 'sparkles', 4),
('Outros', 'Produtos diversos', 'package', 5);

-- Inserir produtos de exemplo
INSERT INTO products (category_id, name, description, price, cost_price, sku, stock_quantity, unit) 
SELECT 
  c.id,
  'Água Mineral 500ml',
  'Água mineral natural sem gás',
  3.50,
  1.20,
  'AGUA-500',
  100,
  'unidade'
FROM product_categories c WHERE c.name = 'Bebidas';

INSERT INTO products (category_id, name, description, price, cost_price, sku, stock_quantity, unit) 
SELECT 
  c.id,
  'Coca-Cola 350ml',
  'Refrigerante de cola gelado',
  5.00,
  2.00,
  'COCA-350',
  50,
  'unidade'
FROM product_categories c WHERE c.name = 'Bebidas';

INSERT INTO products (category_id, name, description, price, cost_price, sku, stock_quantity, unit) 
SELECT 
  c.id,
  'Cerveja Heineken 330ml',
  'Cerveja premium gelada',
  8.00,
  3.50,
  'HEIN-330',
  30,
  'unidade'
FROM product_categories c WHERE c.name = 'Bebidas Alcoólicas';

INSERT INTO products (category_id, name, description, price, cost_price, sku, stock_quantity, unit) 
SELECT 
  c.id,
  'Amendoim Salgado',
  'Amendoim torrado e salgado',
  4.50,
  1.80,
  'AMEND-SAL',
  25,
  'pacote'
FROM product_categories c WHERE c.name = 'Snacks';

INSERT INTO products (category_id, name, description, price, cost_price, sku, stock_quantity, unit) 
SELECT 
  c.id,
  'Chocolate Nestlé',
  'Chocolate ao leite 90g',
  6.00,
  2.50,
  'CHOC-NEST',
  20,
  'unidade'
FROM product_categories c WHERE c.name = 'Snacks';

-- Função para atualizar estoque automaticamente
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
CREATE TRIGGER trigger_update_stock
  AFTER INSERT OR UPDATE ON room_consumptions
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- View para relatórios de consumo
CREATE VIEW consumption_report AS
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

-- View para estoque baixo
CREATE VIEW low_stock_alert AS
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

SELECT 'Sistema de Produtos da Conveniência criado com sucesso!' as status;