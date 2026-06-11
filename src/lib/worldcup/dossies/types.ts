/** Dossiê de uma seleção, gerado pelos agentes especialistas. */

export type Confianca = "baixa" | "média" | "alta";

export type Metric = {
  label: string;
  valor: string;
  hint?: string;
  /** Situação na Copa 2026 quando o label é um jogador. */
  tag?: "convocado" | "fora";
  /** Foto do jogador (quando o label é um convocado com foto conhecida). */
  foto?: string;
};

export type AgentBlock = {
  agente: string; // ex: "especialista-finalizacao"
  titulo: string; // ex: "Finalização"
  icone: string; // keyword -> ícone (ver dossie-icons)
  metricas: Metric[];
  leitura: string;
  confianca: Confianca;
};

export type TeamDossier = {
  fifa: string; // "RSA"
  resumo?: string;
  fonte: string; // origem dos dados
  blocks: AgentBlock[];
};
