-- =============================================================================
-- MIGRATION SCRIPT: SEGURANÇA E ALINHAMENTO DO BANCO DE DADOS (HOTEL COSTA)
-- =============================================================================
-- Este script executa as seguintes remediações:
-- 1. Habilita Row Level Security (RLS) nas 11 tabelas principais.
-- 2. Cria políticas de acesso completo para usuários autenticados.
-- 3. Altera as 3 views de relatórios para SECURITY INVOKER (segurança reforçada).
-- 4. Corrige o search_path de funções críticas para mitigar riscos de injeção.
-- (OBSERVAÇÃO: A tabela 'atividade_heartbeat' e suas funções foram mantidas intactas).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SEÇÃO 1: HABILIATAR RLS (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- SEÇÃO 2: CRIAR POLÍTICAS DE ACESSO COMPLETO PARA USUÁRIOS AUTENTICADOS
-- -----------------------------------------------------------------------------

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.hotels;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.rooms;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.guests;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.reservations;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.product_categories;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.room_consumptions;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.stock_movements;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.system_logs;
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.activity_logs;

-- Criar novas políticas aplicáveis a todas as operações para usuários logados
CREATE POLICY "Allow all actions for authenticated users" ON public.hotels 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.rooms 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.guests 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.reservations 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.payments 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.product_categories 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.products 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.room_consumptions 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.stock_movements 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.system_logs 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users" ON public.activity_logs 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- SEÇÃO 3: RECONSTRUÇÃO DE VIEWS COM SECURITY INVOKER (WITH security_invoker = true)
-- -----------------------------------------------------------------------------

-- 3.1 View para relatórios de consumo
CREATE OR REPLACE VIEW public.consumption_report 
WITH (security_invoker = true) AS
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

-- 3.2 View para alerta de estoque baixo
CREATE OR REPLACE VIEW public.low_stock_alert 
WITH (security_invoker = true) AS
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

-- 3.3 View para reservas em aberto
CREATE OR REPLACE VIEW public.open_reservations 
WITH (security_invoker = true) AS
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
  CASE 
    WHEN r.check_out_date IS NULL THEN 
      GREATEST(1, (CURRENT_DATE - r.check_in_date) + 1)
    ELSE 
      (r.check_out_date - r.check_in_date)
  END as days_stayed,
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

-- -----------------------------------------------------------------------------
-- SEÇÃO 4: CORREÇÃO DO search_path DE FUNÇÕES E TRIGGERS CRÍTICOS
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.finalize_checkout(UUID, DATE) SET search_path = public;
ALTER FUNCTION public.generate_reservation_code() SET search_path = public;
ALTER FUNCTION public.update_product_stock() SET search_path = public;
ALTER FUNCTION public.update_room_status_on_reservation_change() SET search_path = public;

-- Finalizado com Sucesso
SELECT 'Migração de Segurança executada com sucesso!' as status;
