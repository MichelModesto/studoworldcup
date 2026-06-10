/** Fatos fixos do torneio (Copa do Mundo FIFA 2026). */
export const TOURNAMENT = {
  nome: "Copa do Mundo FIFA 2026",
  edicao: "23ª edição",
  inicio: "2026-06-11",
  fim: "2026-07-19",
  sedes: ["Estados Unidos", "Canadá", "México"],
  selecoes: 48,
  grupos: 12,
  cidades: 16,
  estadios: 16,
  jogos: 104,
  aberturaLocal: "Estádio Azteca · Cidade do México",
  finalLocal: "MetLife Stadium · Nova York / Nova Jersey",
} as const;

/** Fonte dos dados (openfootball — domínio público, sem chave). */
export const DATA_SOURCE = {
  nome: "openfootball/worldcup.json",
  url: "https://github.com/openfootball/worldcup.json",
} as const;
