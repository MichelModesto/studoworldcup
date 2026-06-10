import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TeamDossier } from "./types";

export type { TeamDossier } from "./types";
export type { AgentBlock, Metric, Confianca } from "./types";

/**
 * Dossiê gerado pelos agentes especialistas (data/dossies/<FIFA>.json).
 * Cada bloco é a análise de um especialista sobre os dados reais da seleção.
 */
export async function getDossier(fifa: string): Promise<(TeamDossier & { geradoEm?: string }) | null> {
  try {
    const file = path.join(process.cwd(), "data", "dossies", `${fifa.toUpperCase()}.json`);
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}
