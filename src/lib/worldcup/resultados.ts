/**
 * Resultados em tempo (quase) real via scoreboard público da ESPN.
 *
 * O calendário oficial vem do openfootball (GitHub), mas o repositório
 * demora a registrar placares. Aqui buscamos o torneio inteiro na ESPN
 * (1 chamada, cache de 60s) e o getMatches() sobrepõe placar, status e
 * gols dos jogos que o openfootball ainda não tem.
 */

export type GolESPN = {
  jogador: string;
  minuto: number;
  penalti: boolean;
  golContra: boolean;
  /** FIFA da seleção CREDITADA com o gol (no gol contra, quem se beneficia). */
  fifa: string;
};

export type ResultadoESPN = {
  homeFifa: string;
  awayFifa: string;
  homeGols: number;
  awayGols: number;
  estado: "in" | "post";
  /** Instante UTC do início (ESPN). */
  dataISO: string;
  gols: GolESPN[];
};

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
// Janela fixa do torneio: 1 chamada cobre tudo.
const PERIODO = "20260611-20260719";

type RawDetail = {
  type?: { text?: string };
  clock?: { displayValue?: string };
  team?: { id?: string };
  scoringPlay?: boolean;
  ownGoal?: boolean;
  penaltyKick?: boolean;
  shootout?: boolean;
  athletesInvolved?: { displayName?: string }[];
};

function minutoDe(clock?: string): number {
  // "9'", "45'+2'", "90'+5'" -> 9, 45, 90
  const m = /^(\d+)/.exec(clock ?? "");
  return m ? Number(m[1]) : 0;
}

export async function getResultadosESPN(): Promise<ResultadoESPN[]> {
  try {
    const res = await fetch(`${SCOREBOARD}?dates=${PERIODO}&limit=300`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();

    const out: ResultadoESPN[] = [];
    for (const e of data?.events ?? []) {
      const c = e?.competitions?.[0];
      if (!c) continue;
      const estado = c.status?.type?.state;
      if (estado !== "in" && estado !== "post") continue; // só rolando/encerrado

      type Comp = {
        homeAway?: string;
        score?: string;
        team?: { id?: string; abbreviation?: string };
      };
      const comps = (c.competitors ?? []) as Comp[];
      const home = comps.find((x) => x.homeAway === "home");
      const away = comps.find((x) => x.homeAway === "away");
      const homeFifa = home?.team?.abbreviation?.toUpperCase();
      const awayFifa = away?.team?.abbreviation?.toUpperCase();
      if (!homeFifa || !awayFifa) continue;

      const fifaPorTeamId = new Map<string, string>();
      if (home?.team?.id) fifaPorTeamId.set(home.team.id, homeFifa);
      if (away?.team?.id) fifaPorTeamId.set(away.team.id, awayFifa);

      const gols: GolESPN[] = [];
      for (const d of (c.details ?? []) as RawDetail[]) {
        if (!d.scoringPlay) continue;
        const texto = d.type?.text ?? "";
        if (d.shootout || /shootout/i.test(texto)) continue; // disputa de pênaltis não é gol
        const fifa = d.team?.id ? fifaPorTeamId.get(d.team.id) : undefined;
        if (!fifa) continue;
        gols.push({
          jogador: d.athletesInvolved?.[0]?.displayName ?? "Desconhecido",
          minuto: minutoDe(d.clock?.displayValue),
          penalti: Boolean(d.penaltyKick),
          golContra: Boolean(d.ownGoal),
          fifa,
        });
      }

      out.push({
        homeFifa,
        awayFifa,
        homeGols: Number(home?.score ?? 0),
        awayGols: Number(away?.score ?? 0),
        estado,
        dataISO: e.date ?? "",
        gols: gols.sort((a, b) => a.minuto - b.minuto),
      });
    }
    return out;
  } catch {
    return [];
  }
}
