-- Script SQL para configurar o banco de dados do Hotel Management System
-- Execute este script no painel SQL do Supabase

-- Primeiro, vamos verificar se a tabela guests existe e removê-la se necessário
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;

-- Tabela de hotéis
CREATE TABLE hotels (
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

-- Tabela de quartos
CREATE TABLE rooms (
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

-- Tabela de hóspedes (pessoas físicas e empresas)
CREATE TABLE guests (
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

-- Índices adicionais
CREATE INDEX idx_guests_client_type ON guests(client_type);
CREATE INDEX idx_guests_document ON guests(document_type, document_number);
CREATE INDEX idx_guests_email ON guests(email);

-- Tabela de reservas
CREATE TABLE reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE payments (
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

-- Índices para melhor performance
CREATE INDEX idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX idx_reservations_room_id ON reservations(room_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- Inserir dados de exemplo
-- Hotel de exemplo
INSERT INTO hotels (name, address, phone, email, description) VALUES 
('Hotel Exemplo', 'Rua das Flores, 123 - Centro', '(11) 1234-5678', 'contato@hotelexemplo.com', 'Um hotel aconchegante no centro da cidade');

-- Quartos de exemplo
INSERT INTO rooms (hotel_id, room_number, room_type, capacity, price_per_night, amenities, description) 
SELECT 
  h.id,
  '101',
  'Standard',
  2,
  150.00,
  ARRAY['Wi-Fi', 'TV', 'Ar Condicionado'],
  'Quarto standard com vista para a cidade'
FROM hotels h
LIMIT 1;

INSERT INTO rooms (hotel_id, room_number, room_type, capacity, price_per_night, amenities, description) 
SELECT 
  h.id,
  '102',
  'Deluxe',
  3,
  250.00,
  ARRAY['Wi-Fi', 'TV', 'Ar Condicionado', 'Frigobar', 'Varanda'],
  'Quarto deluxe com varanda e vista para o mar'
FROM hotels h
LIMIT 1;

-- Configurar RLS (Row Level Security) se necessário
-- ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS básicas (descomente se necessário)
-- CREATE POLICY "Users can view all guests" ON guests FOR SELECT USING (true);
-- CREATE POLICY "Users can insert guests" ON guests FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update guests" ON guests FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete guests" ON guests FOR DELETE USING (true);

SELECT 'Database setup completed successfully!' as status;