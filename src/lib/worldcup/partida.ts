/**
 * Detalhes lance a lance de uma partida via summary público da ESPN.
 * Cache curto (30s) — serve para pré-jogo (escalações), ao vivo e pós-jogo.
 */

export type EventoPartida = {
  tipo: "gol" | "amarelo" | "vermelho" | "substituicao" | "var" | "outro";
  rotulo: string; // texto original do evento
  minuto: string; // "45'+2'" como a ESPN manda
  jogador?: string;
  time?: string; // displayName ESPN
};

export type EstatisticaPartida = { nome: string; casa: string; fora: string };

export type EscalacaoLado = {
  time: string;
  titulares: { nome: string; numero?: string; posicao?: string }[];
  reservas: { nome: string; numero?: string; entrou: boolean }[];
};

export type Partida = {
  eventos: EventoPartida[];
  estatisticas: EstatisticaPartida[];
  escalacoes: EscalacaoLado[];
};

const SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";

const STAT_PT: Record<string, string> = {
  possessionPct: "Posse de bola (%)",
  totalShots: "Finalizações",
  shotsOnTarget: "Chutes no gol",
  wonCorners: "Escanteios",
  foulsCommitted: "Faltas",
  offsides: "Impedimentos",
  yellowCards: "Cartões amarelos",
  redCards: "Cartões vermelhos",
  saves: "Defesas do goleiro",
};
const STAT_ORDEM = Object.keys(STAT_PT);

function tipoDoEvento(texto: string): EventoPartida["tipo"] {
  const t = texto.toLowerCase();
  if (t.includes("goal") || t.includes("penalty - scored")) return "gol";
  if (t.includes("yellow")) return "amarelo";
  if (t.includes("red")) return "vermelho";
  if (t.includes("substitution")) return "substituicao";
  if (t.includes("var") || t.includes("video review")) return "var";
  return "outro";
}

export async function getPartidaESPN(espnId: string): Promise<Partida | null> {
  try {
    const res = await fetch(`${SUMMARY}?event=${espnId}`, {
      next: { revalidate: 30 },
      headers: { "user-agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const d = await res.json();

    type RawKeyEvent = {
      type?: { text?: string };
      clock?: { displayValue?: string };
      team?: { displayName?: string };
      participants?: { athlete?: { displayName?: string } }[];
    };
    const eventos: EventoPartida[] = ((d.keyEvents ?? []) as RawKeyEvent[])
      .map((k) => {
        const rotulo = k.type?.text ?? "";
        return {
          tipo: tipoDoEvento(rotulo),
          rotulo,
          minuto: k.clock?.displayValue ?? "",
          jogador: k.participants?.[0]?.athlete?.displayName,
          time: k.team?.displayName,
        };
      })
      .filter((e) => e.tipo !== "outro" && e.minuto);

    type RawStatTeam = {
      team?: { displayName?: string };
      statistics?: { name?: string; displayValue?: string }[];
      homeAway?: string;
    };
    const teams = (d.boxscore?.teams ?? []) as RawStatTeam[];
    const casa = teams.find((t) => t.homeAway === "home") ?? teams[0];
    const fora = teams.find((t) => t.homeAway === "away") ?? teams[1];
    const valor = (t: RawStatTeam | undefined, nome: string) =>
      t?.statistics?.find((s) => s.name === nome)?.displayValue ?? "—";
    const estatisticas: EstatisticaPartida[] = STAT_ORDEM.filter(
      (n) => valor(casa, n) !== "—" || valor(fora, n) !== "—",
    ).map((n) => ({ nome: STAT_PT[n], casa: valor(casa, n), fora: valor(fora, n) }));

    type RawRosterEntry = {
      starter?: boolean;
      jersey?: string;
      subbedIn?: boolean | { didSub?: boolean };
      athlete?: { displayName?: string };
      position?: { abbreviation?: string };
    };
    type RawRoster = { team?: { displayName?: string }; roster?: RawRosterEntry[] };
    const escalacoes: EscalacaoLado[] = ((d.rosters ?? []) as RawRoster[])
      .filter((r) => r.roster?.length)
      .map((r) => ({
        time: r.team?.displayName ?? "",
        titulares: (r.roster ?? [])
          .filter((j) => j.starter)
          .map((j) => ({
            nome: j.athlete?.displayName ?? "?",
            numero: j.jersey,
            posicao: j.position?.abbreviation,
          })),
        reservas: (r.roster ?? [])
          .filter((j) => !j.starter)
          .map((j) => ({
            nome: j.athlete?.displayName ?? "?",
            numero: j.jersey,
            entrou: Boolean(typeof j.subbedIn === "object" ? j.subbedIn?.didSub : j.subbedIn),
          })),
      }));

    return { eventos, estatisticas, escalacoes };
  } catch {
    return null;
  }
}
