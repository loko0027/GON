# Revisão de Interações com Banco de Dados - ConvocaGoleiro

## 📋 **Páginas que Interagem com o Banco**

### **1. Página de Autenticação (`app/(auth)/login.tsx`)**
**Operações:**
- ✅ `supabase.auth.signInWithPassword()` - Login
- ✅ `supabase.auth.signUp()` - Registro
- ✅ `supabase.from('usuarios').insert()` - Criar perfil

**Tabelas Envolvidas:**
- `auth.users` (Supabase Auth)
- `usuarios` (perfil do usuário)

**Políticas RLS Necessárias:**
- `usuarios_insert_registration` - Permite criação durante registro
- `usuarios_select_own` - Permite leitura do próprio perfil

---

### **2. Página de Aprovações (`app/(tabs)/aprovacoes.tsx`)**
**Operações:**
- ✅ `supabase.from('usuarios').select()` - Listar usuários
- ✅ `supabase.from('usuarios').update()` - Aprovar/rejeitar usuários

**Tabelas Envolvidas:**
- `usuarios`

**Políticas RLS Necessárias:**
- `usuarios_select_own` - Admins podem ver todos
- `usuarios_admin_update_status` - Admins podem alterar status

---

### **3. Página de Carteira (`app/(tabs)/carteira.tsx`)**
**Operações:**
- ✅ `supabase.from('saldos').select()` - Ver saldo
- ✅ `supabase.from('recargas_coins').insert()` - Recarregar coins
- ✅ `supabase.from('saques_pix').insert()` - Solicitar saque
- ✅ `supabase.rpc('add_coins_to_saldo')` - Adicionar coins
- ✅ `supabase.rpc('update_saldo_retido')` - Reduzir saldo

**Tabelas Envolvidas:**
- `saldos`
- `recargas_coins`
- `saques_pix`

**Políticas RLS Necessárias:**
- `saldos_select_own` - Ver próprio saldo
- `saldos_system_manage` - Sistema pode gerenciar
- `recargas_insert_organizador` - Organizadores podem recarregar
- `saques_insert_goleiro` - Goleiros podem sacar

---

### **4. Página de Goleiros (`app/(tabs)/goleiros.tsx`)**
**Operações:**
- ✅ `supabase.from('usuarios').select()` - Listar goleiros
- ✅ `supabase.from('convocacoes').insert()` - Criar convocação
- ✅ `supabase.rpc('update_saldo_retido')` - Reter coins

**Tabelas Envolvidas:**
- `usuarios`
- `convocacoes`
- `saldos`

**Políticas RLS Necessárias:**
- `usuarios_select_own` - Ver goleiros (admins/organizadores)
- `convocacoes_insert_organizador` - Criar convocações
- `saldos_system_manage` - Gerenciar saldos

---

### **5. Página Home (`app/(tabs)/index.tsx`)**
**Operações:**
- ✅ `supabase.from('convocacoes').select()` - Ver convocações
- ✅ `supabase.from('convocacoes').update()` - Aceitar/recusar
- ✅ `supabase.from('avaliacoes_goleiro').insert()` - Avaliar goleiro
- ✅ `supabase.from('avaliacoes_organizador').insert()` - Avaliar organizador
- ✅ `supabase.rpc('transfer_coins_after_evaluation')` - Transferir coins

**Tabelas Envolvidas:**
- `convocacoes`
- `avaliacoes_goleiro`
- `avaliacoes_organizador`
- `saldos`

**Políticas RLS Necessárias:**
- `convocacoes_select_participants` - Ver próprias convocações
- `convocacoes_update_participants` - Atualizar status
- `avaliacoes_goleiro_insert_organizador` - Organizadores avaliam
- `avaliacoes_organizador_insert_goleiro` - Goleiros avaliam

---

### **6. Página de Perfil (`app/(tabs)/perfil.tsx`)**
**Operações:**
- ✅ `supabase.from('usuarios').select()` - Ver perfil
- ✅ `supabase.from('convocacoes').select()` - Ver histórico
- ✅ `supabase.auth.signOut()` - Logout

**Tabelas Envolvidas:**
- `usuarios`
- `convocacoes`
- `avaliacoes_goleiro`
- `avaliacoes_organizador`

**Políticas RLS Necessárias:**
- `usuarios_select_own` - Ver próprio perfil
- `convocacoes_select_participants` - Ver próprias convocações
- `avaliacoes_goleiro_select_related` - Ver avaliações relacionadas

---

### **7. Página de Suporte (`app/(tabs)/suporte.tsx`)**
**Operações:**
- ✅ `supabase.from('chamados_suporte').select()` - Ver chamados
- ✅ `supabase.from('chamados_suporte').insert()` - Criar chamado
- ✅ `supabase.from('chamados_suporte').update()` - Aprovar/rejeitar/resolver
- ✅ `supabase.from('mensagens_suporte').select()` - Ver mensagens
- ✅ `supabase.from('mensagens_suporte').insert()` - Enviar mensagem

**Tabelas Envolvidas:**
- `chamados_suporte`
- `mensagens_suporte`

**Políticas RLS Necessárias:**
- `chamados_select_own_or_admin` - Ver próprios chamados ou todos (admin)
- `chamados_insert_own` - Criar próprios chamados
- `chamados_admin_update` - Admins gerenciam chamados
- `mensagens_select_chamado_participants` - Ver mensagens do chamado
- `mensagens_insert_participants` - Enviar mensagens

---

### **8. Página Admin (`app/(tabs)/admin.tsx`)**
**Operações:**
- ✅ `supabase.from('categorias_avaliacao').select()` - Ver categorias
- ✅ `supabase.from('categorias_avaliacao').insert()` - Criar categoria
- ✅ Estatísticas gerais de todas as tabelas

**Tabelas Envolvidas:**
- `categorias_avaliacao`
- Todas as outras (para estatísticas)

**Políticas RLS Necessárias:**
- `categorias_select_all` - Todos podem ver
- `categorias_admin_manage` - Admins podem gerenciar
- Políticas de admin para todas as outras tabelas

---

## 🔐 **Contextos de Autenticação**

### **AuthContext (`contexts/AuthContext.tsx`)**
**Operações:**
- ✅ `supabase.auth.getSession()` - Verificar sessão
- ✅ `supabase.auth.onAuthStateChange()` - Escutar mudanças
- ✅ `supabase.from('usuarios').select()` - Carregar perfil
- ✅ `supabase.from('usuarios').insert()` - Criar perfil
- ✅ `supabase.auth.signInWithPassword()` - Login
- ✅ `supabase.auth.signUp()` - Registro
- ✅ `supabase.auth.signOut()` - Logout

### **AppContext (`contexts/AppContext.tsx`)**
**Operações:**
- ✅ Todas as operações de carregamento de dados
- ✅ Todas as operações de manipulação de dados
- ✅ Chamadas para funções RPC

---

## ⚡ **Funções RPC Utilizadas**

### **1. `update_saldo_retido(user_id, valor)`**
**Usado em:**
- Criação de convocações (reter coins)
- Solicitação de saques (reduzir saldo)

**Política de Segurança:**
- Apenas organizadores aprovados e admins
- Verificação via `check_update_saldo_retido_permission()`

### **2. `add_coins_to_saldo(user_id, coins_amount)`**
**Usado em:**
- Recargas de coins aprovadas
- Adição manual de coins (admin)

**Política de Segurança:**
- Apenas organizadores aprovados e admins
- Verificação via `check_add_coins_permission()`

### **3. `transfer_coins_after_evaluation(convocacao_id, coins_amount)`**
**Usado em:**
- Transferência de coins após avaliação do goleiro

**Política de Segurança:**
- Apenas organizador da convocação específica
- Verificação via `check_transfer_coins_permission()`

---

## 🛡️ **Resumo de Segurança Implementada**

### **Níveis de Acesso:**
1. **Admin**: Acesso completo a todas as tabelas
2. **Organizador**: Acesso a convocações, recargas, goleiros
3. **Goleiro**: Acesso a convocações, saques, avaliações
4. **Sistema**: Funções RPC com verificações específicas

### **Verificações de Segurança:**
- ✅ Status de aprovação verificado em todas as operações
- ✅ Tipo de usuário verificado para operações específicas
- ✅ Propriedade de dados verificada (usuário só vê seus dados)
- ✅ Participação em convocações verificada para avaliações
- ✅ Funções RPC com verificações de permissão específicas

### **Proteções Implementadas:**
- ✅ RLS habilitado em todas as tabelas
- ✅ Políticas específicas para cada operação (SELECT, INSERT, UPDATE, DELETE)
- ✅ Verificações de autenticação em todas as políticas
- ✅ Logs de segurança nas funções críticas
- ✅ Índices para performance das consultas com RLS

Todas as interações com o banco estão devidamente protegidas e seguem o princípio do menor privilégio!