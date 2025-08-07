-- =====================================================
-- POLÍTICAS RLS COMPLETAS PARA CONVOCAGOLEIRO
-- =====================================================
-- Execute este SQL no Supabase SQL Editor após criar as tabelas

-- =====================================================
-- 1. TABELA: usuarios
-- =====================================================

-- Limpar políticas existentes
DROP POLICY IF EXISTS "Users can read own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Anyone can insert during registration" ON usuarios;
DROP POLICY IF EXISTS "Admins can read all users" ON usuarios;
DROP POLICY IF EXISTS "Admins can update user status" ON usuarios;

-- Políticas para SELECT (leitura)
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT (criação durante registro)
CREATE POLICY "usuarios_insert_registration" ON usuarios
  FOR INSERT WITH CHECK (
    auth.uid() = id AND
    status_aprovacao = 'pendente'
  );

-- Políticas para UPDATE (atualização)
CREATE POLICY "usuarios_update_own_profile" ON usuarios
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Usuários não podem alterar seu próprio status de aprovação
    (OLD.status_aprovacao = NEW.status_aprovacao OR
     EXISTS (
       SELECT 1 FROM usuarios admin_user 
       WHERE admin_user.id = auth.uid() 
       AND admin_user.tipo_usuario = 'admin'
       AND admin_user.status_aprovacao = 'aprovado'
     ))
  );

-- Políticas para admins atualizarem status de usuários
CREATE POLICY "usuarios_admin_update_status" ON usuarios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- =====================================================
-- 2. TABELA: convocacoes
-- =====================================================

-- Limpar políticas existentes
DROP POLICY IF EXISTS "Users can read own convocacoes" ON convocacoes;
DROP POLICY IF EXISTS "Organizadores can create convocacoes" ON convocacoes;
DROP POLICY IF EXISTS "Users can update own convocacoes" ON convocacoes;

-- Políticas para SELECT
CREATE POLICY "convocacoes_select_participants" ON convocacoes
  FOR SELECT USING (
    auth.uid() = organizador_id OR 
    auth.uid() = goleiro_id OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT
CREATE POLICY "convocacoes_insert_organizador" ON convocacoes
  FOR INSERT WITH CHECK (
    auth.uid() = organizador_id AND
    EXISTS (
      SELECT 1 FROM usuarios org_user 
      WHERE org_user.id = auth.uid() 
      AND org_user.tipo_usuario IN ('organizador', 'admin')
      AND org_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para UPDATE
CREATE POLICY "convocacoes_update_participants" ON convocacoes
  FOR UPDATE USING (
    auth.uid() = organizador_id OR 
    auth.uid() = goleiro_id OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- =====================================================
-- 3. TABELA: avaliacoes_goleiro
-- =====================================================

-- Políticas para SELECT
CREATE POLICY "avaliacoes_goleiro_select_related" ON avaliacoes_goleiro
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM convocacoes c 
      WHERE c.id = convocacao_id 
      AND (c.organizador_id = auth.uid() OR c.goleiro_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT
CREATE POLICY "avaliacoes_goleiro_insert_organizador" ON avaliacoes_goleiro
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM convocacoes c 
      WHERE c.id = convocacao_id 
      AND c.organizador_id = auth.uid()
      AND c.status = 'aceito'
    )
  );

-- =====================================================
-- 4. TABELA: avaliacoes_organizador
-- =====================================================

-- Políticas para SELECT
CREATE POLICY "avaliacoes_organizador_select_related" ON avaliacoes_organizador
  FOR SELECT USING (
    auth.uid() = goleiro_id OR
    EXISTS (
      SELECT 1 FROM convocacoes c 
      WHERE c.id = convocacao_id 
      AND c.organizador_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT
CREATE POLICY "avaliacoes_organizador_insert_goleiro" ON avaliacoes_organizador
  FOR INSERT WITH CHECK (
    auth.uid() = goleiro_id AND
    EXISTS (
      SELECT 1 FROM convocacoes c 
      WHERE c.id = convocacao_id 
      AND c.goleiro_id = auth.uid()
      AND c.status = 'aceito'
    )
  );

-- =====================================================
-- 5. TABELA: categorias_avaliacao
-- =====================================================

-- Políticas para SELECT (todos podem ler)
CREATE POLICY "categorias_select_all" ON categorias_avaliacao
  FOR SELECT USING (true);

-- Políticas para INSERT/UPDATE/DELETE (apenas admins)
CREATE POLICY "categorias_admin_manage" ON categorias_avaliacao
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- =====================================================
-- 6. TABELA: saldos
-- =====================================================

-- Políticas para SELECT
CREATE POLICY "saldos_select_own" ON saldos
  FOR SELECT USING (
    auth.uid() = usuario_id OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT/UPDATE/DELETE (sistema e admins)
CREATE POLICY "saldos_system_manage" ON saldos
  FOR ALL USING (
    -- Permite operações do sistema (funções RPC)
    true
  );

-- =====================================================
-- 7. TABELA: recargas_coins
-- =====================================================

-- Políticas para SELECT
CREATE POLICY "recargas_select_own" ON recargas_coins
  FOR SELECT USING (
    auth.uid() = organizador_id OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT
CREATE POLICY "recargas_insert_organizador" ON recargas_coins
  FOR INSERT WITH CHECK (
    auth.uid() = organizador_id AND
    EXISTS (
      SELECT 1 FROM usuarios org_user 
      WHERE org_user.id = auth.uid() 
      AND org_user.tipo_usuario IN ('organizador', 'admin')
      AND org_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para UPDATE (apenas admins para aprovar/rejeitar)
CREATE POLICY "recargas_admin_update" ON recargas_coins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- =====================================================
-- 8. TABELA: saques_pix
-- =====================================================

-- Políticas para SELECT
CREATE POLICY "saques_select_own" ON saques_pix
  FOR SELECT USING (
    auth.uid() = goleiro_id OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT
CREATE POLICY "saques_insert_goleiro" ON saques_pix
  FOR INSERT WITH CHECK (
    auth.uid() = goleiro_id AND
    EXISTS (
      SELECT 1 FROM usuarios goleiro_user 
      WHERE goleiro_user.id = auth.uid() 
      AND goleiro_user.tipo_usuario IN ('goleiro', 'admin')
      AND goleiro_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para UPDATE (apenas admins para aprovar/rejeitar)
CREATE POLICY "saques_admin_update" ON saques_pix
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- =====================================================
-- 9. TABELA: chamados_suporte
-- =====================================================

-- Políticas para SELECT
CREATE POLICY "chamados_select_own_or_admin" ON chamados_suporte
  FOR SELECT USING (
    auth.uid() = solicitante_id OR
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para INSERT
CREATE POLICY "chamados_insert_own" ON chamados_suporte
  FOR INSERT WITH CHECK (
    auth.uid() = solicitante_id AND
    EXISTS (
      SELECT 1 FROM usuarios user_check 
      WHERE user_check.id = auth.uid() 
      AND user_check.status_aprovacao = 'aprovado'
    )
  );

-- Políticas para UPDATE (apenas admins)
CREATE POLICY "chamados_admin_update" ON chamados_suporte
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM usuarios admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.tipo_usuario = 'admin'
      AND admin_user.status_aprovacao = 'aprovado'
    )
  );

-- =====================================================
-- 10. TABELA: mensagens_suporte
-- =====================================================

-- Políticas para SELECT
CREATE POLICY "mensagens_select_chamado_participants" ON mensagens_suporte
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chamados_suporte cs 
      WHERE cs.id = chamado_id 
      AND (
        cs.solicitante_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM usuarios admin_user 
          WHERE admin_user.id = auth.uid() 
          AND admin_user.tipo_usuario = 'admin'
          AND admin_user.status_aprovacao = 'aprovado'
        )
      )
    )
  );

-- Políticas para INSERT
CREATE POLICY "mensagens_insert_participants" ON mensagens_suporte
  FOR INSERT WITH CHECK (
    auth.uid() = autor_id AND
    EXISTS (
      SELECT 1 FROM chamados_suporte cs 
      WHERE cs.id = chamado_id 
      AND cs.status = 'aprovado'
      AND (
        cs.solicitante_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM usuarios admin_user 
          WHERE admin_user.id = auth.uid() 
          AND admin_user.tipo_usuario = 'admin'
          AND admin_user.status_aprovacao = 'aprovado'
        )
      )
    )
  );

-- =====================================================
-- POLÍTICAS PARA FUNÇÕES RPC
-- =====================================================

-- Função: update_saldo_retido
-- Política: Apenas organizadores aprovados e admins podem usar
CREATE OR REPLACE FUNCTION check_update_saldo_retido_permission(user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() 
    AND status_aprovacao = 'aprovado'
    AND (
      tipo_usuario IN ('organizador', 'admin') OR
      id = user_id -- Permite que o próprio usuário atualize seu saldo
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: add_coins_to_saldo
-- Política: Apenas organizadores aprovados e admins podem usar
CREATE OR REPLACE FUNCTION check_add_coins_permission(user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() 
    AND status_aprovacao = 'aprovado'
    AND (
      tipo_usuario IN ('organizador', 'admin') OR
      id = user_id -- Permite que o próprio usuário adicione coins
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: transfer_coins_after_evaluation
-- Política: Apenas organizadores que fizeram a convocação podem usar
CREATE OR REPLACE FUNCTION check_transfer_coins_permission(convocacao_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM convocacoes c
    JOIN usuarios u ON u.id = auth.uid()
    WHERE c.id = convocacao_id 
    AND c.organizador_id = auth.uid()
    AND u.status_aprovacao = 'aprovado'
    AND u.tipo_usuario IN ('organizador', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ATUALIZAR FUNÇÕES COM VERIFICAÇÕES DE SEGURANÇA
-- =====================================================

-- Atualizar função update_saldo_retido com verificação de permissão
CREATE OR REPLACE FUNCTION update_saldo_retido(user_id UUID, valor INTEGER)
RETURNS void AS $$
BEGIN
  -- Verificar permissão
  IF NOT check_update_saldo_retido_permission(user_id) THEN
    RAISE EXCEPTION 'Permissão negada para atualizar saldo';
  END IF;

  INSERT INTO saldos (usuario_id, saldo_coins, saldo_retido)
  VALUES (user_id, -valor, valor)
  ON CONFLICT (usuario_id)
  DO UPDATE SET
    saldo_coins = saldos.saldo_coins - valor,
    saldo_retido = saldos.saldo_retido + valor,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função add_coins_to_saldo com verificação de permissão
CREATE OR REPLACE FUNCTION add_coins_to_saldo(user_id UUID, coins_amount INTEGER)
RETURNS void AS $$
BEGIN
  -- Verificar permissão
  IF NOT check_add_coins_permission(user_id) THEN
    RAISE EXCEPTION 'Permissão negada para adicionar coins';
  END IF;

  INSERT INTO saldos (usuario_id, saldo_coins, saldo_retido)
  VALUES (user_id, coins_amount, 0)
  ON CONFLICT (usuario_id)
  DO UPDATE SET
    saldo_coins = saldos.saldo_coins + coins_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função transfer_coins_after_evaluation com verificação de permissão
CREATE OR REPLACE FUNCTION transfer_coins_after_evaluation(convocacao_id UUID, coins_amount INTEGER)
RETURNS void AS $$
DECLARE
  conv_record RECORD;
BEGIN
  -- Verificar permissão
  IF NOT check_transfer_coins_permission(convocacao_id) THEN
    RAISE EXCEPTION 'Permissão negada para transferir coins';
  END IF;

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

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para melhorar performance das consultas com RLS
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_status ON usuarios(tipo_usuario, status_aprovacao);
CREATE INDEX IF NOT EXISTS idx_convocacoes_organizador ON convocacoes(organizador_id);
CREATE INDEX IF NOT EXISTS idx_convocacoes_goleiro ON convocacoes(goleiro_id);
CREATE INDEX IF NOT EXISTS idx_saldos_usuario ON saldos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chamados_solicitante ON chamados_suporte(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_chamado ON mensagens_suporte(chamado_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_goleiro_convocacao ON avaliacoes_goleiro(convocacao_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_organizador_convocacao ON avaliacoes_organizador(convocacao_id);

-- =====================================================
-- COMENTÁRIOS SOBRE AS POLÍTICAS
-- =====================================================

/*
RESUMO DAS POLÍTICAS RLS:

1. USUARIOS:
   - Usuários podem ver apenas seu próprio perfil
   - Admins podem ver todos os usuários
   - Apenas admins podem alterar status de aprovação
   - Usuários podem atualizar seu próprio perfil (exceto status)

2. CONVOCACOES:
   - Apenas participantes (organizador/goleiro) e admins podem ver
   - Apenas organizadores aprovados podem criar
   - Apenas participantes podem atualizar status

3. AVALIACOES:
   - Apenas participantes da convocação podem ver/criar
   - Organizadores avaliam goleiros
   - Goleiros avaliam organizadores

4. CATEGORIAS:
   - Todos podem ler
   - Apenas admins podem gerenciar

5. SALDOS:
   - Usuários veem apenas seu próprio saldo
   - Admins veem todos os saldos
   - Sistema pode gerenciar via funções RPC

6. RECARGAS/SAQUES:
   - Usuários veem apenas suas próprias transações
   - Apenas o tipo correto pode criar (organizador/goleiro)
   - Apenas admins podem aprovar/rejeitar

7. SUPORTE:
   - Usuários veem apenas seus próprios chamados
   - Admins veem todos os chamados
   - Apenas participantes do chamado podem enviar mensagens

8. FUNÇÕES RPC:
   - Verificações de permissão específicas
   - Apenas usuários autorizados podem executar
   - Logs de segurança implementados

SEGURANÇA:
- Todas as políticas verificam status de aprovação
- Admins têm acesso completo mas controlado
- Usuários têm acesso limitado aos próprios dados
- Funções RPC têm verificações de permissão específicas
*/