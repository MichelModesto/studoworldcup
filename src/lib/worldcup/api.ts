import type {
  Confederation,
  Goal,
  Match,
  Scorer,
  StandingRow,
  Stadium,
  Team,
} from "./types";
import {
  cidadePt,
  cityKey,
  faseFromRound,
  paisFromCc,
  ptTeam,
} from "./translate";

/**
 * Fonte de dados: openfootball/worldcup.json (domínio público, sem chave).
 * Dados REAIS da Copa 2026 (sorteio, calendário, sedes). Placares e gols
 * aparecem automaticamente conforme as partidas são disputadas.
 */
const BASE =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026";

const REVALIDATE = 600; // 10 min

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${path}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------- tipos brutos da API ----------
type RawTeam = {
  name: string;
  name_normalised?: string;
  continent: string;
  flag_icon: string;
  fifa_code: string;
  group: string;
  confed: string;
};

type RawGoal = {
  name: string;
  minute?: number;
  score?: number;
  penalty?: boolean;
  owngoal?: boolean;
};

type RawMatch = {
  round: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score?: { ft?: [number, number]; ht?: [number, number] };
  goals1?: RawGoal[];
  goals2?: RawGoal[];
};

type RawStadium = {
  city: string;
  name: string;
  capacity: number;
  cc: string;
  timezone: string;
  coords?: string;
};

// ---------- carregadores ----------
export async function getTeams(): Promise<Team[]> {
  const raw = await fetchJSON<RawTeam[]>("worldcup.teams.json");
  if (!raw) return [];
  return raw.map((t) => ({
    name: t.name,
    nomePt: ptTeam(t.name, t.name_normalised),
    flag: t.flag_icon,
    fifa: t.fifa_code,
    group: t.group,
    confed: t.confed as Confederation,
    continent: t.continent,
  }));
}

export async function getStadiums(): Promise<Stadium[]> {
  const raw = await fetchJSON<{ stadiums: RawStadium[] }>(
    "worldcup.stadiums.json",
  );
  if (!raw?.stadiums) return [];
  return raw.stadiums.map((s) => ({
    cidade: cidadePt(s.city),
    cidadeBruta: s.city,
    estadio: s.name,
    capacidade: s.capacity,
    pais: paisFromCc(s.cc),
    cc: s.cc,
    timezone: s.timezone,
    coords: s.coords,
  }));
}

function buildTeamLookup(teams: Team[]) {
  const byName = new Map<string, Team>();
  for (const t of teams) byName.set(t.name, t);
  return byName;
}

export async function getMatches(): Promise<Match[]> {
  const [data, teams, stadiums] = await Promise.all([
    fetchJSON<{ matches: RawMatch[] }>("worldcup.json"),
    getTeams(),
    getStadiums(),
  ]);
  if (!data?.matches) return [];

  const byName = buildTeamLookup(teams);
  const stadiumByCity = new Map<string, Stadium>();
  for (const s of stadiums) stadiumByCity.set(cityKey(s.cidadeBruta), s);

  const flagOf = (name: string) => byName.get(name)?.flag ?? "🏳️";
  const ptOf = (name: string) => byName.get(name)?.nomePt ?? name;

  return data.matches.map((m, i) => {
    const ft = m.score?.ft;
    const temPlacar = Array.isArray(ft);
    const cidadeRaw = m.ground ?? "";
    const stadium = stadiumByCity.get(cityKey(cidadeRaw));

    const gols: Goal[] = [
      ...(m.goals1 ?? []).map((g) => mapGoal(g, ptOf(m.team1))),
      ...(m.goals2 ?? []).map((g) => mapGoal(g, ptOf(m.team2))),
    ].sort((a, b) => a.minuto - b.minuto);

    const hora = (m.time ?? "").trim();
    const horaCurta = hora.slice(0, 5) || "00:00";
    const kickoffISO = toKickoffISO(m.date, hora);

    return {
      id: i + 1,
      fase: faseFromRound(m.round),
      rodada: m.round,
      grupo: m.group?.replace(/Group\s*/i, "").trim() || undefined,
      dataISO: m.date,
      hora,
      kickoffISO,
      sortKey: kickoffISO ?? `${m.date}T${horaCurta}`,
      mandante: ptOf(m.team1),
      flagMandante: flagOf(m.team1),
      visitante: ptOf(m.team2),
      flagVisitante: flagOf(m.team2),
      estadio: stadium?.estadio ?? cidadePt(cidadeRaw),
      cidade: stadium?.cidade ?? cidadePt(cidadeRaw),
      placarMandante: temPlacar ? ft![0] : undefined,
      placarVisitante: temPlacar ? ft![1] : undefined,
      status: temPlacar ? "encerrado" : "agendado",
      gols,
    } satisfies Match;
  });
}

/** Converte data + "13:00 UTC-6" no instante UTC (ISO). */
function toKickoffISO(date: string, time: string): string | undefined {
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::?(\d{2}))?/i);
  if (!m) return undefined;
  const [, hh, mm, off, offMin] = m;
  const [y, mo, d] = date.split("-").map(Number);
  if (!y || !mo || !d) return undefined;
  const offset = Number(off) + (offMin ? Math.sign(Number(off)) * Number(offMin) / 60 : 0);
  // hora local = UTC + offset  =>  UTC = local - offset
  const utcMs = Date.UTC(y, mo - 1, d, Number(hh) - offset, Number(mm));
  return new Date(utcMs).toISOString();
}

function mapGoal(g: RawGoal, selecao: string): Goal {
  return {
    jogador: g.name,
    minuto: g.minute ?? 0,
    penalti: Boolean(g.penalty),
    golContra: Boolean(g.owngoal),
    selecao,
  };
}

/** Seleções agrupadas por grupo (A..L). */
export async function getGroups(): Promise<{ grupo: string; times: Team[] }[]> {
  const teams = await getTeams();
  const grupos = [...new Set(teams.map((t) => t.group))].sort();
  return grupos.map((grupo) => ({
    grupo,
    times: teams.filter((t) => t.group === grupo),
  }));
}

/** Classificação calculada a partir dos jogos da fase de grupos já disputados. */
export async function getStandings(): Promise<Record<string, StandingRow[]>> {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);
  const byPt = new Map<string, Team>();
  for (const t of teams) byPt.set(t.nomePt, t);

  const linhas = new Map<string, StandingRow>();
  for (const t of teams) {
    linhas.set(t.nomePt, {
      selecao: t.nomePt,
      flag: t.flag,
      grupo: t.group,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0,
    });
  }

  for (const m of matches) {
    if (m.fase !== "Fase de Grupos") continue;
    if (m.status !== "encerrado") continue;
    const a = linhas.get(m.mandante);
    const b = linhas.get(m.visitante);
    if (!a || !b) continue;
    const ga = m.placarMandante ?? 0;
    const gb = m.placarVisitante ?? 0;
    a.jogos++; b.jogos++;
    a.golsPro += ga; a.golsContra += gb;
    b.golsPro += gb; b.golsContra += ga;
    if (ga > gb) { a.vitorias++; a.pontos += 3; b.derrotas++; }
    else if (ga < gb) { b.vitorias++; b.pontos += 3; a.derrotas++; }
    else { a.empates++; b.empates++; a.pontos++; b.pontos++; }
  }

  const porGrupo: Record<string, StandingRow[]> = {};
  for (const linha of linhas.values()) {
    linha.saldo = linha.golsPro - linha.golsContra;
    (porGrupo[linha.grupo] ??= []).push(linha);
  }
  for (const g of Object.keys(porGrupo)) {
    porGrupo[g].sort(
      (x, y) =>
        y.pontos - x.pontos ||
        y.saldo - x.saldo ||
        y.golsPro - x.golsPro ||
        x.selecao.localeCompare(y.selecao),
    );
  }
  return porGrupo;
}

/** Artilheiros derivados dos gols dos jogos disputados (exclui gol contra). */
export async function getScorers(limit = 20): Promise<Scorer[]> {
  const [teams, matches] = await Promise.all([getTeams(), getMatches()]);
  const flagByPt = new Map(teams.map((t) => [t.nomePt, t.flag]));

  const acc = new Map<string, Scorer>();
  for (const m of matches) {
    for (const g of m.gols) {
      if (g.golContra) continue;
      const chave = `${g.jogador}__${g.selecao}`;
      const cur =
        acc.get(chave) ??
        {
          jogador: g.jogador,
          selecao: g.selecao,
          flag: flagByPt.get(g.selecao) ?? "🏳️",
          gols: 0,
          penaltis: 0,
        };
      cur.gols++;
      if (g.penalti) cur.penaltis++;
      acc.set(chave, cur);
    }
  }
  return [...acc.values()]
    .sort((a, b) => b.gols - a.gols || a.jogador.localeCompare(b.jogador))
    .slice(0, limit);
}

export type Summary = {
  selecoes: number;
  grupos: number;
  estadios: number;
  jogos: number;
  jogosDisputados: number;
  golsTotais: number;
  proximos: Match[];
  ultimos: Match[];
};

export async function getSummary(): Promise<Summary> {
  const [teams, matches, stadiums, groups] = await Promise.all([
    getTeams(),
    getMatches(),
    getStadiums(),
    getGroups(),
  ]);
  const disputados = matches.filter((m) => m.status === "encerrado");
  const golsTotais = disputados.reduce(
    (a, m) => a + (m.placarMandante ?? 0) + (m.placarVisitante ?? 0),
    0,
  );
  const ordenados = [...matches].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return {
    selecoes: teams.length,
    grupos: groups.length,
    estadios: stadiums.length,
    jogos: matches.length,
    jogosDisputados: disputados.length,
    golsTotais,
    proximos: ordenados.filter((m) => m.status !== "encerrado").slice(0, 6),
    ultimos: ordenados.filter((m) => m.status === "encerrado").slice(-6).reverse(),
  };
}

/** Contagem de seleções por confederação (para gráficos). */
export async function getConfederationBreakdown(): Promise<
  { name: string; value: number; color: string }[]
> {
  const teams = await getTeams();
  const cores: Record<string, string> = {
    UEFA: "#2fb8ff",
    CONMEBOL: "#00f5a0",
    CONCACAF: "#ffd24a",
    CAF: "#ff2d78",
    AFC: "#a779ff",
    OFC: "#8ea0c6",
  };
  const counts = new Map<string, number>();
  for (const t of teams) counts.set(t.confed, (counts.get(t.confed) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value, color: cores[name] ?? "#8ea0c6" }))
    .sort((a, b) => b.value - a.value);
}
