# 🏨 Hotel Management System

Sistema completo de gestão hoteleira desenvolvido com Next.js 14, TypeScript, Tailwind CSS e Supabase.

## ✨ Funcionalidades

- 🏠 **Dashboard Completo** - Visão geral com métricas em tempo real
- 🛏️ **Gestão de Quartos** - Controle de disponibilidade, tipos e preços
- 👥 **Gestão de Hóspedes** - Cadastro completo com histórico
- 📅 **Sistema de Reservas** - Reservas online com calendário inteligente
- 💳 **Controle de Pagamentos** - Múltiplas formas de pagamento
- 📊 **Relatórios Detalhados** - Analytics e métricas de performance
- 🔐 **Autenticação Segura** - Sistema completo de login/registro
- 📱 **Design Responsivo** - Interface moderna e adaptável

## 🚀 Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Headless UI
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Notifications**: React Hot Toast

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

## ⚡ Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd hotel-management-system
```

2. **Instale as dependências**
```bash
npm install
# ou
yarn install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.local.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais do Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

4. **Configure o banco de dados**

No painel do Supabase, execute as seguintes queries SQL para criar as tabelas:

```sql
-- Tabela de hotéis
CREATE TABLE hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  description TEXT,
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
```

5. **Execute o projeto**
```bash
npm run dev
# ou
yarn dev
```

O sistema estará disponível em `http://localhost:3000`

## 🎯 Como Usar

1. **Acesse o sistema** em `http://localhost:3000`
2. **Crie uma conta** ou faça login
3. **Configure seu hotel** nas configurações
4. **Adicione quartos** na seção de quartos
5. **Cadastre hóspedes** conforme necessário
6. **Gerencie reservas** através do dashboard

### Conta de Demonstração

Para testar o sistema rapidamente:
- **Email**: demo@hotelmanager.com
- **Senha**: demo123456

## 📁 Estrutura do Projeto

```
├── app/                    # App Router (Next.js 14)
│   ├── auth/              # Páginas de autenticação
│   ├── dashboard/         # Dashboard e páginas principais
│   ├── globals.css        # Estilos globais
│   ├── layout.tsx         # Layout raiz
│   └── page.tsx           # Página inicial
├── components/            # Componentes reutilizáveis
│   ├── dashboard/         # Componentes do dashboard
│   └── providers/         # Providers (Auth, etc.)
├── lib/                   # Utilitários e configurações
│   ├── supabase.ts        # Cliente Supabase
│   └── utils.ts           # Funções utilitárias
└── public/                # Arquivos estáticos
```

## 🔧 Configuração do Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Configure a autenticação:
   - Ative o provedor de email
   - Configure URLs de redirecionamento
3. Execute as queries SQL fornecidas acima
4. Configure as políticas RLS (Row Level Security) conforme necessário

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outras Plataformas

O projeto é compatível com qualquer plataforma que suporte Next.js:
- Netlify
- Railway
- Heroku
- AWS Amplify

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique a [documentação](docs/)
2. Abra uma [issue](issues/)
3. Entre em contato através do email: suporte@hotelmanager.com

---

**Desenvolvido com ❤️ para a indústria hoteleira**