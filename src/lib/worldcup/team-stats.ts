import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Estatísticas reais por seleção (2023+), produzidas pelo script de ingestão
 * (`npm run ingest`) e salvas em `data/teams/<FIFA>.json`. O app e os agentes
 * leem este cache — nada de chamar a API em tempo de request (respeita o limite).
 */

export type PlayerTally = {
  nome: string;
  gols?: number;
  penaltis?: number;
  assistencias?: number;
};

export type TeamStats = {
  fifa: string;
  team: string;
  nomePt: string;
  apiTeamId?: number; // ingest.mjs (API-Football)
  espnTeamId?: number; // ingest-espn.mjs (ESPN)
  atualizadoEm: string;
  desde: string; // "2023-01-01"
  jogos: number;
  competicoes: string[];
  registro: { v: number; e: number; d: number; gp: number; gc: number };
  /** Médias por jogo. Campos ausentes => métrica indisponível na fonte. */
  porJogo: {
    chutes?: number;
    chutesNoGol?: number;
    escanteios?: number;
    faltas?: number;
    impedimentos?: number;
    amarelos?: number;
    vermelhos?: number;
    posse?: number;
    desarmes?: number;
    defesasGoleiro?: number;
    tirosDeMeta?: number;
    golsPro: number;
    golsContra: number;
  };
  golsPorJanela?: Record<string, number>;
  golsContraPorJanela?: Record<string, number>;
  golsPorTempo?: { "1T": number; "2T": number };
  amarelosPorJanela?: Record<string, number>;
  artilheiros: PlayerTally[];
  assistentes: PlayerTally[];
  cobertura: { jogosComStatsDetalhadas: number };
  fontes: string[];
};

/** Carrega as estatísticas de todas as seleções com dados ingeridos. */
export async function listTeamStats(): Promise<TeamStats[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    const dir = path.join(process.cwd(), "data", "teams");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    const all = await Promise.all(
      files.map((f) => getTeamStats(f.replace(".json", ""))),
    );
    return all.filter((t): t is TeamStats => t !== null);
  } catch {
    return [];
  }
}

export async function getTeamStats(fifa: string): Promise<TeamStats | null> {
  try {
    const file = path.join(process.cwd(), "data", "teams", `${fifa.toUpperCase()}.json`);
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as TeamStats;
  } catch {
    return null;
  }
}
