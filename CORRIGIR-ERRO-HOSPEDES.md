# 🔧 Correção do Erro de Criação de Hóspedes

## Problema Identificado
O sistema não está conseguindo salvar hóspedes (tanto pessoa física quanto jurídica) devido à estrutura incorreta da tabela `guests` no banco de dados Supabase.

## Solução

### Passo 1: Acessar o Painel do Supabase
1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione o projeto do Hotel Management System

### Passo 2: Executar o Script SQL
1. No painel lateral esquerdo, clique em **"SQL Editor"**
2. Clique em **"New Query"**
3. Copie todo o conteúdo do arquivo `database-setup.sql` (que foi criado na raiz do projeto)
4. Cole no editor SQL
5. Clique em **"Run"** para executar o script

### Passo 3: Verificar a Execução
Após executar o script, você deve ver a mensagem:
```
Database setup completed successfully!
```

### Passo 4: Testar o Sistema
1. Volte para o sistema em `http://localhost:3001`
2. Tente criar um novo hóspede (pessoa física ou jurídica)
3. O erro deve estar resolvido

## O que o Script Faz

### Correções Implementadas:
1. **Recria a tabela `guests`** com a estrutura correta
2. **Adiciona a coluna `client_type`** para distinguir pessoa física de jurídica
3. **Inclui todas as colunas necessárias**:
   - Para pessoa física: `first_name`, `last_name`, `date_of_birth`
   - Para empresa: `company_name`, `trade_name`, `contact_person`
   - Campos comuns: `email`, `phone`, `document_type`, etc.
4. **Adiciona constraints** para validar os dados
5. **Cria índices** para melhor performance
6. **Insere dados de exemplo** (hotel e quartos)

### Estrutura da Tabela Guests:
```sql
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Alterações no Código

Também foram feitas correções no código para garantir que:

1. **Criação de hóspedes** (`/app/dashboard/guests/new/page.tsx`):
   - Agora inclui o campo `client_type` no insert
   - Salva campos específicos baseado no tipo de cliente
   - Define campos nulos apropriadamente

2. **Edição de hóspedes** (`/app/dashboard/guests/[id]/page.tsx`):
   - Atualiza corretamente todos os campos baseado no tipo
   - Mantém consistência dos dados

## Verificação Final

Após executar o script, você pode verificar se tudo está funcionando:

1. **Pessoa Física**: Tente criar um hóspede pessoa física com nome, sobrenome e data de nascimento
2. **Pessoa Jurídica**: Tente criar um hóspede empresa com razão social e pessoa de contato
3. **Listagem**: Verifique se os hóspedes aparecem corretamente na lista
4. **Edição**: Teste a edição de hóspedes existentes

## Suporte

Se ainda houver problemas após seguir estes passos:
1. Verifique se o script foi executado completamente
2. Confirme se não há erros no console do navegador
3. Verifique se as credenciais do Supabase estão corretas no arquivo `.env.local`

---

**Nota**: Este script irá recriar todas as tabelas, então certifique-se de fazer backup de dados importantes antes de executar.