export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nome: string;
          tipo_usuario: 'goleiro' | 'organizador' | 'admin';
          foto_url: string | null;
          status_aprovacao: 'pendente' | 'aprovado' | 'rejeitado';
          email: string;
          telefone: string | null;
          data_cadastro: string;
          nota_media: number | null;
          jogos_realizados: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          tipo_usuario: 'goleiro' | 'organizador' | 'admin';
          foto_url?: string | null;
          status_aprovacao?: 'pendente' | 'aprovado' | 'rejeitado';
          email: string;
          telefone?: string | null;
          data_cadastro?: string;
          nota_media?: number | null;
          jogos_realizados?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          tipo_usuario?: 'goleiro' | 'organizador' | 'admin';
          foto_url?: string | null;
          status_aprovacao?: 'pendente' | 'aprovado' | 'rejeitado';
          email?: string;
          telefone?: string | null;
          data_cadastro?: string;
          nota_media?: number | null;
          jogos_realizados?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      convocacoes: {
        Row: {
          id: string;
          organizador_id: string;
          goleiro_id: string;
          data_hora_inicio: string;
          data_hora_fim: string;
          local: string;
          status: 'pendente' | 'aceito' | 'recusado' | 'presente' | 'finalizado';
          valor_retido: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organizador_id: string;
          goleiro_id: string;
          data_hora_inicio: string;
          data_hora_fim: string;
          local: string;
          status?: 'pendente' | 'aceito' | 'recusado' | 'presente' | 'finalizado';
          valor_retido: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organizador_id?: string;
          goleiro_id?: string;
          data_hora_inicio?: string;
          data_hora_fim?: string;
          local?: string;
          status?: 'pendente' | 'aceito' | 'recusado' | 'presente' | 'finalizado';
          valor_retido?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      avaliacoes_goleiro: {
        Row: {
          id: string;
          convocacao_id: string;
          nota: number;
          coins_calculados: number;
          comentario: string | null;
          data_avaliacao: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          convocacao_id: string;
          nota: number;
          coins_calculados: number;
          comentario?: string | null;
          data_avaliacao?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          convocacao_id?: string;
          nota?: number;
          coins_calculados?: number;
          comentario?: string | null;
          data_avaliacao?: string;
          created_at?: string;
        };
      };
      avaliacoes_organizador: {
        Row: {
          id: string;
          convocacao_id: string;
          goleiro_id: string;
          categoria_avaliacao: string;
          data_avaliacao: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          convocacao_id: string;
          goleiro_id: string;
          categoria_avaliacao: string;
          data_avaliacao?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          convocacao_id?: string;
          goleiro_id?: string;
          categoria_avaliacao?: string;
          data_avaliacao?: string;
          created_at?: string;
        };
      };
      categorias_avaliacao: {
        Row: {
          id: string;
          nome_categoria: string;
          emoji: string;
          tipo: 'positiva' | 'neutra' | 'negativa';
          created_at: string;
        };
        Insert: {
          id?: string;
          nome_categoria: string;
          emoji: string;
          tipo: 'positiva' | 'neutra' | 'negativa';
          created_at?: string;
        };
        Update: {
          id?: string;
          nome_categoria?: string;
          emoji?: string;
          tipo?: 'positiva' | 'neutra' | 'negativa';
          created_at?: string;
        };
      };
      saldos: {
        Row: {
          usuario_id: string;
          saldo_coins: number;
          saldo_retido: number;
          updated_at: string;
        };
        Insert: {
          usuario_id: string;
          saldo_coins?: number;
          saldo_retido?: number;
          updated_at?: string;
        };
        Update: {
          usuario_id?: string;
          saldo_coins?: number;
          saldo_retido?: number;
          updated_at?: string;
        };
      };
      recargas_coins: {
        Row: {
          id: string;
          organizador_id: string;
          valor_reais: number;
          coins_recebidos: number;
          metodo_pagamento: string;
          status: 'pendente' | 'aprovado' | 'rejeitado';
          data_recarga: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organizador_id: string;
          valor_reais: number;
          coins_recebidos: number;
          metodo_pagamento: string;
          status?: 'pendente' | 'aprovado' | 'rejeitado';
          data_recarga?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organizador_id?: string;
          valor_reais?: number;
          coins_recebidos?: number;
          metodo_pagamento?: string;
          status?: 'pendente' | 'aprovado' | 'rejeitado';
          data_recarga?: string;
          created_at?: string;
        };
      };
      saques_pix: {
        Row: {
          id: string;
          goleiro_id: string;
          valor_coins: number;
          valor_reais: number;
          chave_pix: string;
          status: 'pendente' | 'aprovado' | 'rejeitado';
          data_solicitacao: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          goleiro_id: string;
          valor_coins: number;
          valor_reais: number;
          chave_pix: string;
          status?: 'pendente' | 'aprovado' | 'rejeitado';
          data_solicitacao?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          goleiro_id?: string;
          valor_coins?: number;
          valor_reais?: number;
          chave_pix?: string;
          status?: 'pendente' | 'aprovado' | 'rejeitado';
          data_solicitacao?: string;
          created_at?: string;
        };
      };
      chamados_suporte: {
        Row: {
          id: string;
          solicitante_id: string;
          mensagem_inicial: string;
          status: 'pendente' | 'aprovado' | 'resolvido' | 'recusado';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitante_id: string;
          mensagem_inicial: string;
          status?: 'pendente' | 'aprovado' | 'resolvido' | 'recusado';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitante_id?: string;
          mensagem_inicial?: string;
          status?: 'pendente' | 'aprovado' | 'resolvido' | 'recusado';
          created_at?: string;
          updated_at?: string;
        };
      };
      mensagens_suporte: {
        Row: {
          id: string;
          chamado_id: string;
          autor_id: string;
          mensagem: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chamado_id: string;
          autor_id: string;
          mensagem: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chamado_id?: string;
          autor_id?: string;
          mensagem?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}