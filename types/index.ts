export interface User {
  id: string;
  nome: string;
  tipo_usuario: 'goleiro' | 'organizador' | 'admin';
  foto_url?: string;
  status_aprovacao: 'pendente' | 'aprovado' | 'rejeitado';
  email: string;
  telefone?: string;
  data_cadastro: Date;
  nota_media?: number;
  jogos_realizados?: number;
}

export interface Convocacao {
  id: string;
  organizador_id: string;
  goleiro_id: string;
  data_hora_inicio: Date;
  data_hora_fim: Date;
  local: string;
  status: 'pendente' | 'aceito' | 'recusado' | 'presente' | 'perdida';
  valor_retido: number;
  organizador?: User;
  goleiro?: User;
  avaliacao_goleiro?: AvaliacaoGoleiro;
  avaliacao_organizador?: AvaliacaoOrganizador;
}

export interface AvaliacaoGoleiro {
  id: string;
  convocacao_id: string;
  nota: number;
  coins_calculados: number;
  comentario?: string;
  data_avaliacao: Date;
}

export interface AvaliacaoOrganizador {
  id: string;
  convocacao_id: string;
  goleiro_id: string;
  categoria_avaliacao: string;
  data_avaliacao: Date;
}

export interface CategoriaAvaliacao {
  id: string;
  nome_categoria: string;
  emoji: string;
  tipo: 'positiva' | 'neutra' | 'negativa';
}

export interface Saldo {
  usuario_id: string;
  saldo_coins: number;
  saldo_retido: number;
}

export interface RecargaCoins {
  id: string;
  organizador_id: string;
  valor_reais: number;
  coins_recebidos: number;
  metodo_pagamento: 'pix' | 'cartao' | 'boleto';
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data_recarga: Date;
}

export interface TransferenciaCoins {
  id: string;
  convocacao_id: string;
  organizador_id: string;
  goleiro_id: string;
  coins_transferidos: number;
  nota_utilizada: number;
  data: Date;
}

export interface SaquePix {
  id: string;
  goleiro_id: string;
  valor_coins: number;
  valor_reais: number;
  chave_pix: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data_solicitacao: Date;
}

export interface ChamadoSuporte {
  id: string;
  solicitante_id: string;
  mensagem_inicial: string;
  status: 'pendente' | 'aprovado' | 'resolvido' | 'recusado';
  created_at: Date;
  solicitante?: User;
}

export interface MensagemSuporte {
  id: string;
  chamado_id: string;
  autor_id: string;
  mensagem: string;
  created_at: Date;
  autor?: User;
}