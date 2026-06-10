import { getTeams } from "./api";

/**
 * Placar ao vivo da Copa 2026 via scoreboard público da ESPN (sem chave).
 * `state`: "pre" (agendado) | "in" (rolando) | "post" (encerrado).
 * Buscado sem cache — o cliente faz polling leve via /api/live.
 */

export type LiveSide = {
  fifa: string;
  nome: string;
  flag: string;
  gols: number;
};

export type LiveMatch = {
  id: string;
  estado: "pre" | "in" | "post";
  /** Ex.: "45'+2'", "HT", "FT" — texto curto de status da ESPN. */
  detalhe: string;
  relogio: string;
  inicioISO: string;
  mandante: LiveSide;
  visitante: LiveSide;
};

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

type RawCompetitor = {
  homeAway?: string;
  score?: string;
  team?: { abbreviation?: string; displayName?: string };
};

export async function getLiveScoreboard(): Promise<LiveMatch[]> {
  try {
    const [res, teams] = await Promise.all([
      fetch(SCOREBOARD, { cache: "no-store" }),
      getTeams(),
    ]);
    if (!res.ok) return [];
    const data = await res.json();
    const porFifa = new Map(teams.map((t) => [t.fifa, t]));

    const out: LiveMatch[] = [];
    for (const e of data?.events ?? []) {
      const c = e?.competitions?.[0];
      if (!c) continue;
      const lado = (ha: string): LiveSide | null => {
        const r = (c.competitors as RawCompetitor[] | undefined)?.find(
          (x) => x.homeAway === ha,
        );
        if (!r?.team) return null;
        const fifa = (r.team.abbreviation ?? "").toUpperCase();
        const t = porFifa.get(fifa);
        return {
          fifa,
          nome: t?.nomePt ?? r.team.displayName ?? fifa,
          flag: t?.flag ?? "🏳️",
          gols: Number(r.score ?? 0),
        };
      };
      const mandante = lado("home");
      const visitante = lado("away");
      if (!mandante || !visitante) continue;
      const st = c.status ?? {};
      const estado = (st.type?.state ?? "pre") as LiveMatch["estado"];
      out.push({
        id: String(e.id),
        estado,
        detalhe: st.type?.shortDetail ?? "",
        relogio: st.displayClock ?? "",
        inicioISO: e.date ?? "",
        mandante,
        visitante,
      });
    }
    // Rolando primeiro, depois agendados por horário, encerrados por último.
    const peso = { in: 0, pre: 1, post: 2 } as const;
    return out.sort(
      (a, b) =>
        peso[a.estado] - peso[b.estado] || a.inicioISO.localeCompare(b.inicioISO),
    );
  } catch {
    return [];
  }
}
