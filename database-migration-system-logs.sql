-- Script SQL para criar a tabela system_logs que está faltando
-- Execute este script no painel SQL do Supabase

-- Criar tabela system_logs (necessária para o sistema de logging)
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity ON system_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);

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

SELECT 'Tabela system_logs criada com sucesso!' as status;
SELECT 'Esta tabela é necessária para o sistema de logging funcionar corretamente' as info;
SELECT 'Agora o check-out deve funcionar sem erros de logging' as info2;