-- ConvocaGoleiro Database Schema for Supabase
-- Execute this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('goleiro', 'organizador', 'admin')),
  foto_url TEXT,
  status_aprovacao VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status_aprovacao IN ('pendente', 'aprovado', 'rejeitado')),
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nota_media DECIMAL(3,2),
  jogos_realizados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create convocacoes table
CREATE TABLE IF NOT EXISTS convocacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  goleiro_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_hora_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  local TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado', 'presente', 'finalizado')),
  valor_retido INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create avaliacoes_goleiro table
CREATE TABLE IF NOT EXISTS avaliacoes_goleiro (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convocacao_id UUID NOT NULL REFERENCES convocacoes(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  coins_calculados INTEGER NOT NULL,
  comentario TEXT,
  data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create avaliacoes_organizador table
CREATE TABLE IF NOT EXISTS avaliacoes_organizador (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  convocacao_id UUID NOT NULL REFERENCES convocacoes(id) ON DELETE CASCADE,
  goleiro_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_avaliacao VARCHAR(100) NOT NULL,
  data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categorias_avaliacao table
CREATE TABLE IF NOT EXISTS categorias_avaliacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_categoria VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('positiva', 'neutra', 'negativa')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saldos table
CREATE TABLE IF NOT EXISTS saldos (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  saldo_coins INTEGER NOT NULL DEFAULT 0,
  saldo_retido INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recargas_coins table
CREATE TABLE IF NOT EXISTS recargas_coins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  valor_reais DECIMAL(10,2) NOT NULL,
  coins_recebidos INTEGER NOT NULL,
  metodo_pagamento VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  data_recarga TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saques_pix table
CREATE TABLE IF NOT EXISTS saques_pix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goleiro_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  valor_coins INTEGER NOT NULL,
  valor_reais DECIMAL(10,2) NOT NULL,
  chave_pix VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chamados_suporte table
CREATE TABLE IF NOT EXISTS chamados_suporte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem_inicial TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'resolvido', 'recusado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mensagens_suporte table
CREATE TABLE IF NOT EXISTS mensagens_suporte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamado_id UUID NOT NULL REFERENCES chamados_suporte(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_goleiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_organizador ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recargas_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE saques_pix ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamados_suporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_suporte ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usuarios
CREATE POLICY "Users can read own profile" ON usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON usuarios
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can insert during registration" ON usuarios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read all users" ON usuarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

CREATE POLICY "Admins can update user status" ON usuarios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- RLS Policies for convocacoes
CREATE POLICY "Users can read own convocacoes" ON convocacoes
  FOR SELECT USING (
    auth.uid() = organizador_id OR 
    auth.uid() = goleiro_id OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

CREATE POLICY "Organizadores can create convocacoes" ON convocacoes
  FOR INSERT WITH CHECK (
    auth.uid() = organizador_id AND
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'organizador'
    )
  );

CREATE POLICY "Users can update own convocacoes" ON convocacoes
  FOR UPDATE USING (
    auth.uid() = organizador_id OR 
    auth.uid() = goleiro_id OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- RLS Policies for saldos
CREATE POLICY "Users can read own saldo" ON saldos
  FOR SELECT USING (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

CREATE POLICY "System can manage saldos" ON saldos
  FOR ALL USING (true);

-- RLS Policies for categorias_avaliacao
CREATE POLICY "Anyone can read categorias" ON categorias_avaliacao
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categorias" ON categorias_avaliacao
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- RLS Policies for chamados_suporte
CREATE POLICY "Users can read own chamados" ON chamados_suporte
  FOR SELECT USING (
    auth.uid() = solicitante_id OR
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

CREATE POLICY "Users can create chamados" ON chamados_suporte
  FOR INSERT WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Admins can update chamados" ON chamados_suporte
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- RLS Policies for mensagens_suporte
CREATE POLICY "Users can read messages from own chamados" ON mensagens_suporte
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chamados_suporte 
      WHERE id = chamado_id AND (
        solicitante_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM usuarios 
          WHERE id = auth.uid() AND tipo_usuario = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can send messages" ON mensagens_suporte
  FOR INSERT WITH CHECK (
    auth.uid() = autor_id AND
    EXISTS (
      SELECT 1 FROM chamados_suporte 
      WHERE id = chamado_id AND (
        solicitante_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM usuarios 
          WHERE id = auth.uid() AND tipo_usuario = 'admin'
        )
      )
    )
  );

-- Insert default categorias
INSERT INTO categorias_avaliacao (nome_categoria, emoji, tipo) VALUES
  ('Top Demais', '🌟', 'positiva'),
  ('Paga Certinho', '🤑', 'positiva'),
  ('Guaraná 3 Litros', '🥤', 'positiva'),
  ('Chatão', '😐', 'negativa'),
  ('Sumido', '🤷', 'negativa'),
  ('Campo Ruim', '💥', 'negativa'),
  ('Não tem bola', '⚽', 'negativa'),
  ('Caxumba', '🧊', 'neutra')
ON CONFLICT DO NOTHING;

-- Create functions for saldo management
CREATE OR REPLACE FUNCTION update_saldo_retido(user_id UUID, valor INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO saldos (usuario_id, saldo_coins, saldo_retido)
  VALUES (user_id, -valor, valor)
  ON CONFLICT (usuario_id)
  DO UPDATE SET
    saldo_coins = saldos.saldo_coins - valor,
    saldo_retido = saldos.saldo_retido + valor,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_coins_to_saldo(user_id UUID, coins_amount INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO saldos (usuario_id, saldo_coins, saldo_retido)
  VALUES (user_id, coins_amount, 0)
  ON CONFLICT (usuario_id)
  DO UPDATE SET
    saldo_coins = saldos.saldo_coins + coins_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transfer_coins_after_evaluation(convocacao_id UUID, coins_amount INTEGER)
RETURNS void AS $$
DECLARE
  conv_record RECORD;
BEGIN
  SELECT organizador_id, goleiro_id, valor_retido 
  INTO conv_record 
  FROM convocacoes 
  WHERE id = convocacao_id;
  
  -- Remove from organizador retido
  UPDATE saldos 
  SET saldo_retido = saldo_retido - conv_record.valor_retido,
      updated_at = NOW()
  WHERE usuario_id = conv_record.organizador_id;
  
  -- Add to goleiro saldo
  INSERT INTO saldos (usuario_id, saldo_coins, saldo_retido)
  VALUES (conv_record.goleiro_id, coins_amount, 0)
  ON CONFLICT (usuario_id)
  DO UPDATE SET
    saldo_coins = saldos.saldo_coins + coins_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create saldo when user is created
CREATE OR REPLACE FUNCTION create_user_saldo()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO saldos (usuario_id, saldo_coins, saldo_retido)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_user_saldo
  AFTER INSERT ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION create_user_saldo();

-- Create admin user (update with your actual admin credentials)
-- Note: You'll need to create this user through Supabase Auth first, then update the record
-- INSERT INTO usuarios (id, nome, tipo_usuario, email, status_aprovacao)
-- VALUES ('your-admin-user-id', 'Admin User', 'admin', 'admin@convocagoleiro.com', 'aprovado');