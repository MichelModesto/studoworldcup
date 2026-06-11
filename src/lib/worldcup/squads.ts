import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentBlock } from "./dossies/types";

/**
 * Elencos oficiais convocados para a Copa 2026, produzidos por
 * `node scripts/fetch-squads.mjs` e salvos em `data/squads/<FIFA>.json`.
 * Permite marcar, em qualquer lista de jogadores, quem está na Copa.
 */

export type SquadPlayer = {
  nome: string;
  posicao: string; // Goleiro | Defensor | Meio-campista | Atacante
  numero?: number;
  idade?: number;
  /** URL da foto (TheSportsDB, via scripts/fetch-photos.mjs). A UI usa `${foto}/small`. */
  foto?: string;
};

export type Squad = {
  fifa: string;
  team: string;
  espnTeamId: number;
  copa: number; // 2026
  atualizadoEm: string;
  jogadores: SquadPlayer[];
  fontes: string[];
};

export async function getSquad(fifa: string): Promise<Squad | null> {
  try {
    const file = path.join(process.cwd(), "data", "squads", `${fifa.toUpperCase()}.json`);
    return JSON.parse(await readFile(file, "utf8")) as Squad;
  } catch {
    return null;
  }
}

/** Chave canônica: minúsculas, sem acentos, tokens ordenados ("Lee Kang-In" = "Kang-in Lee"). */
function chaveNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

export type SquadMatcher = (nome: string) => SquadPlayer | null;

/**
 * Cria um localizador de jogador no elenco. Match exato pela chave canônica
 * e, como tolerância entre fontes, por contenção de tokens (ex.: "Rodrygo"
 * casa com "Rodrygo Goes"). Retorna o jogador (com foto) ou null.
 */
export function buildSquadMatcher(squad: Squad | null): SquadMatcher | null {
  if (!squad?.jogadores.length) return null;
  const exatos = new Map(squad.jogadores.map((j) => [chaveNome(j.nome), j]));
  const tokens = squad.jogadores.map((j) => ({ j, t: new Set(chaveNome(j.nome).split(" ")) }));
  return (nome: string) => {
    const chave = chaveNome(nome);
    const exato = exatos.get(chave);
    if (exato) return exato;
    const meus = chave.split(" ").filter(Boolean);
    if (!meus.length) return null;
    const hit = tokens.find(
      ({ t }) =>
        (meus.length >= 2 && meus.every((tok) => t.has(tok))) ||
        (t.size >= 2 && [...t].every((tok) => meus.includes(tok))) ||
        (meus.length === 1 && t.size === 1 && t.has(meus[0])),
    );
    return hit?.j ?? null;
  };
}

const AGENTES_COM_JOGADORES = new Set(["especialista-artilheiro", "especialista-assistencia"]);

/**
 * Pós-processa os blocos do dossiê marcando cada jogador citado como
 * convocado (ou não) para a Copa 2026 e anexando a foto quando houver.
 * Funciona tanto para dossiês derivados dos dados quanto para os gerados
 * pelos agentes.
 */
export function tagConvocados(blocks: AgentBlock[], matcher: SquadMatcher | null): AgentBlock[] {
  if (!matcher) return blocks;
  return blocks.map((b) => {
    if (!AGENTES_COM_JOGADORES.has(b.agente)) return b;
    return {
      ...b,
      metricas: b.metricas.map((m) => {
        if (m.label === "Sem dados") return m;
        const j = matcher(m.label);
        return { ...m, tag: j ? ("convocado" as const) : ("fora" as const), foto: j?.foto };
      }),
    };
  });
}
