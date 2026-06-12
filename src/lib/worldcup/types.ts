export type Confederation =
  | "UEFA"
  | "CONMEBOL"
  | "CONCACAF"
  | "CAF"
  | "AFC"
  | "OFC";

export type Team = {
  name: string; // nome em inglês (chave da API)
  nomePt: string;
  flag: string;
  fifa: string;
  group: string; // "A".."L"
  confed: Confederation;
  continent: string;
};

export type Goal = {
  jogador: string;
  minuto: number;
  penalti: boolean;
  golContra: boolean;
  selecao: string; // nomePt da seleção que marcou
};

export type MatchStatus = "encerrado" | "ao-vivo" | "agendado";

export type Match = {
  id: number;
  fase: string; // PT: "Fase de Grupos", "Oitavas de final"...
  rodada: string; // round bruto da API
  grupo?: string; // "A".."L" (só fase de grupos)
  dataISO: string; // "2026-06-11"
  hora: string; // "13:00 UTC-6" (horário local da sede, bruto)
  kickoffISO?: string; // instante UTC do início (para exibir em qualquer fuso)
  sortKey: string; // para ordenação cronológica
  mandante: string;
  flagMandante: string;
  visitante: string;
  flagVisitante: string;
  /** Códigos FIFA para linkar páginas de seleção e confronto. */
  fifaMandante?: string;
  fifaVisitante?: string;
  estadio: string;
  cidade: string;
  placarMandante?: number;
  placarVisitante?: number;
  status: MatchStatus;
  gols: Goal[];
  /** id do evento na ESPN (página lance a lance), quando casado. */
  espnId?: string;
};

export type StandingRow = {
  selecao: string;
  flag: string;
  grupo: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
};

export type Stadium = {
  cidade: string;
  cidadeBruta: string;
  estadio: string;
  capacidade: number;
  pais: string;
  cc: string;
  timezone: string;
  coords?: string;
};

export type Scorer = {
  jogador: string;
  selecao: string;
  flag: string;
  gols: number;
  penaltis: number;
  /** Foto do jogador (TheSportsDB), quando encontrado no elenco convocado. */
  foto?: string;
};
