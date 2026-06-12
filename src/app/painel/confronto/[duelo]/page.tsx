import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Flame, MapPin, Scale, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getMatches, getTeams } from "@/lib/worldcup";
import { getTeamStats, type TeamStats } from "@/lib/worldcup/team-stats";
import { getSquad, buildSquadMatcher } from "@/lib/worldcup/squads";
import { PlayerAvatar } from "@/components/painel/player-avatar";
import { getDossier } from "@/lib/worldcup/dossies";
import type { Team } from "@/lib/worldcup/types";

const FUSO = "America/Sao_Paulo";

function fmt(v: number | undefined, dec = 1): string {
  if (v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(dec).replace(".", ",");
}
function pct(v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

/** P(vitória A / empate / vitória B) via Poisson independente (0..10 gols). */
function probabilidades(lambdaA: number, lambdaB: number) {
  const pois = (l: number) => {
    const p: number[] = [];
    let fat = 1;
    for (let k = 0; k <= 10; k++) {
      if (k > 0) fat *= k;
      p.push((Math.exp(-l) * Math.pow(l, k)) / fat);
    }
    return p;
  };
  const pa = pois(Math.max(0.05, lambdaA));
  const pb = pois(Math.max(0.05, lambdaB));
  let vA = 0;
  let emp = 0;
  let vB = 0;
  for (let a = 0; a <= 10; a++) {
    for (let b = 0; b <= 10; b++) {
      const p = pa[a] * pb[b];
      if (a > b) vA += p;
      else if (a === b) emp += p;
      else vB += p;
    }
  }
  const total = vA + emp + vB;
  return { vitoriaA: vA / total, empate: emp / total, vitoriaB: vB / total };
}

/** Barra comparativa de dois lados; destaca quem leva vantagem na métrica. */
function CompareRow({
  label,
  a,
  b,
  display,
  melhorMenor = false,
  hint,
}: {
  label: string;
  a?: number;
  b?: number;
  display?: [string, string];
  melhorMenor?: boolean;
  hint?: string;
}) {
  const va = a ?? 0;
  const vb = b ?? 0;
  const max = Math.max(va, vb, 0.001);
  const aGanha = melhorMenor ? va < vb : va > vb;
  const empate = va === vb;
  const corA = empate ? "bg-muted/50" : aGanha ? "btn-brand" : "bg-surface-2";
  const corB = empate ? "bg-muted/50" : !aGanha ? "btn-brand" : "bg-surface-2";
  return (
    <div className="py-2.5" title={hint}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className={`w-16 shrink-0 font-display font-semibold tabular-nums ${empate ? "" : aGanha ? "text-brand" : "text-muted"}`}>
          {display?.[0] ?? fmt(a)}
        </span>
        <span className="truncate text-center text-xs uppercase tracking-wide text-muted">{label}</span>
        <span className={`w-16 shrink-0 text-right font-display font-semibold tabular-nums ${empate ? "" : !aGanha ? "text-brand" : "text-muted"}`}>
          {display?.[1] ?? fmt(b)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-surface-2/50">
          <div className={`h-full rounded-full ${corA}`} style={{ width: `${(va / max) * 100}%` }} />
        </div>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2/50">
          <div className={`h-full rounded-full ${corB}`} style={{ width: `${(vb / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function janelaMaisProvavel(ataque?: Record<string, number>, defesaRival?: Record<string, number>) {
  if (!ataque) return null;
  const janelas = Object.keys(ataque);
  let melhor: { j: string; peso: number } | null = null;
  for (const j of janelas) {
    const peso = (ataque[j] ?? 0) + (defesaRival?.[j] ?? 0);
    if (!melhor || peso > melhor.peso) melhor = { j, peso };
  }
  return melhor?.peso ? melhor.j : null;
}

function aproveitamento(s: TeamStats) {
  return (s.registro.v * 3 + s.registro.e) / (s.jogos * 3);
}

export default async function ConfrontoPage({
  params,
}: {
  params: Promise<{ duelo: string }>;
}) {
  const { duelo } = await params;
  const [fifaA, fifaB] = duelo.toUpperCase().split("-");
  if (!fifaA || !fifaB || fifaA === fifaB) notFound();

  const teams = await getTeams();
  const teamA = teams.find((t) => t.fifa === fifaA);
  const teamB = teams.find((t) => t.fifa === fifaB);
  if (!teamA || !teamB) notFound();

  const [sA, sB, sqA, sqB, dA, dB, matches] = await Promise.all([
    getTeamStats(fifaA),
    getTeamStats(fifaB),
    getSquad(fifaA),
    getSquad(fifaB),
    getDossier(fifaA),
    getDossier(fifaB),
    getMatches(),
  ]);

  const jogoEntreEles = matches.find(
    (m) =>
      (m.fifaMandante === fifaA && m.fifaVisitante === fifaB) ||
      (m.fifaMandante === fifaB && m.fifaVisitante === fifaA),
  );

  const matchA = buildSquadMatcher(sqA);
  const matchB = buildSquadMatcher(sqB);

  // ---- probabilidades (Poisson sobre gols esperados de cada lado) ----
  const lambdaA = sA && sB ? (sA.porJogo.golsPro + sB.porJogo.golsContra) / 2 : undefined;
  const lambdaB = sA && sB ? (sB.porJogo.golsPro + sA.porJogo.golsContra) / 2 : undefined;
  const prob =
    lambdaA !== undefined && lambdaB !== undefined
      ? probabilidades(lambdaA, lambdaB)
      : undefined;

  // ---- radar do apostador ----
  const golsEsperados =
    sA && sB
      ? (sA.porJogo.golsPro + sB.porJogo.golsContra) / 2 +
        (sB.porJogo.golsPro + sA.porJogo.golsContra) / 2
      : undefined;
  const ambosMarcam =
    sA && sB
      ? sA.porJogo.golsPro >= 1 && sB.porJogo.golsPro >= 1
        ? "Tendência SIM"
        : sA.porJogo.golsPro < 0.8 || sB.porJogo.golsPro < 0.8
          ? "Tendência NÃO"
          : "Equilibrado"
      : "—";
  const escanteiosEsperados =
    sA?.porJogo.escanteios !== undefined && sB?.porJogo.escanteios !== undefined
      ? sA.porJogo.escanteios + sB.porJogo.escanteios
      : undefined;
  const cartoesEsperados =
    sA?.porJogo.amarelos !== undefined && sB?.porJogo.amarelos !== undefined
      ? sA.porJogo.amarelos + sB.porJogo.amarelos
      : undefined;
  const janelaA = sA && sB ? janelaMaisProvavel(sA.golsPorJanela, sB.golsContraPorJanela) : null;
  const janelaB = sA && sB ? janelaMaisProvavel(sB.golsPorJanela, sA.golsContraPorJanela) : null;

  const cabecalhoTime = (t: Team, s: TeamStats | null) => (
    <Link
      href={`/painel/selecoes/${t.fifa}`}
      className="group flex flex-1 flex-col items-center gap-2 text-center"
      title={`Abrir o dossiê de ${t.nomePt}`}
    >
      <span className="text-6xl transition group-hover:scale-110">{t.flag}</span>
      <span className="font-display text-xl font-bold group-hover:text-brand">{t.nomePt}</span>
      <span className="text-xs text-muted">
        Grupo {t.group} · {t.confed}
        {s && ` · ${s.registro.v}V ${s.registro.e}E ${s.registro.d}D`}
      </span>
      {s && (
        <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
          {pct(aproveitamento(s))} de aproveitamento
        </span>
      )}
    </Link>
  );

  return (
    <>
      <Link
        href="/painel"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Visão geral
      </Link>

      {/* Cabeçalho do duelo */}
      <div className="glass neon-border mb-6 p-6">
        <div className="flex items-center justify-between gap-4">
          {cabecalhoTime(teamA, sA)}
          <div className="shrink-0 text-center">
            <Scale className="mx-auto h-6 w-6 text-brand" />
            <p className="mt-1 font-display text-2xl font-bold text-muted">VS</p>
          </div>
          {cabecalhoTime(teamB, sB)}
        </div>
        {jogoEntreEles && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border/60 pt-4 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-brand" />
              {jogoEntreEles.kickoffISO
                ? new Date(jogoEntreEles.kickoffISO).toLocaleString("pt-BR", {
                    timeZone: FUSO,
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) + " (Brasília)"
                : jogoEntreEles.dataISO}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-brand" />
              {jogoEntreEles.estadio} · {jogoEntreEles.cidade}
            </span>
            <span>{jogoEntreEles.fase}</span>
            {jogoEntreEles.placarMandante !== undefined && (
              <span className="font-display font-bold text-foreground">
                Placar: {jogoEntreEles.mandante} {jogoEntreEles.placarMandante} × {jogoEntreEles.placarVisitante} {jogoEntreEles.visitante}
              </span>
            )}
          </div>
        )}
      </div>

      {!sA || !sB ? (
        <Card>
          <p className="text-sm text-muted">
            Estatísticas indisponíveis para {!sA ? teamA.nomePt : teamB.nomePt}. Rode{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">npm run ingest:espn</code>.
          </p>
        </Card>
      ) : (
        <>
          {/* Radar do apostador */}
          <section className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
              <Flame className="h-4 w-4 text-gold" /> Radar do apostador
            </h2>

            {prob && (
              <div className="glass mb-4 p-5">
                <p className="mb-3 text-xs uppercase tracking-wide text-muted">
                  Probabilidades do confronto (modelo Poisson · histórico desde 2023)
                </p>
                <div className="mb-2 flex h-3 overflow-hidden rounded-full">
                  <div className="btn-brand" style={{ width: `${prob.vitoriaA * 100}%` }} />
                  <div className="bg-muted/40" style={{ width: `${prob.empate * 100}%` }} />
                  <div className="bg-brand-2" style={{ width: `${prob.vitoriaB * 100}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {teamA.flag} {teamA.nomePt}{" "}
                    <strong className="text-brand">{pct(prob.vitoriaA)}</strong>
                  </span>
                  <span className="text-muted">
                    Empate <strong className="text-foreground">{pct(prob.empate)}</strong>
                  </span>
                  <span className="font-medium">
                    <strong className="text-brand-2">{pct(prob.vitoriaB)}</strong> {teamB.nomePt}{" "}
                    {teamB.flag}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="glass p-5">
                <p className="text-xs uppercase tracking-wide text-muted">Gols esperados no jogo</p>
                <p className="mt-2 font-display text-3xl font-bold">{fmt(golsEsperados)}</p>
                <p className="mt-1 text-xs text-muted">
                  {golsEsperados !== undefined
                    ? golsEsperados >= 2.8
                      ? "Tendência de Over 2,5 🔥"
                      : golsEsperados <= 2.1
                        ? "Tendência de Under 2,5 🧊"
                        : "Linha de 2,5 equilibrada"
                    : "—"}{" "}
                  · ataque × defesa das duas, média/jogo
                </p>
              </div>
              <div className="glass p-5">
                <p className="text-xs uppercase tracking-wide text-muted">Ambos marcam (BTTS)</p>
                <p className="mt-2 font-display text-3xl font-bold">{ambosMarcam}</p>
                <p className="mt-1 text-xs text-muted">
                  {teamA.fifa} marca {fmt(sA.porJogo.golsPro)}/jogo · {teamB.fifa} marca {fmt(sB.porJogo.golsPro)}/jogo
                </p>
              </div>
              <div className="glass p-5">
                <p className="text-xs uppercase tracking-wide text-muted">Escanteios esperados</p>
                <p className="mt-2 font-display text-3xl font-bold">{fmt(escanteiosEsperados)}</p>
                <p className="mt-1 text-xs text-muted">
                  {fmt(sA.porJogo.escanteios)} + {fmt(sB.porJogo.escanteios)} por jogo
                </p>
              </div>
              <div className="glass p-5">
                <p className="text-xs uppercase tracking-wide text-muted">Cartões amarelos esperados</p>
                <p className="mt-2 font-display text-3xl font-bold">{fmt(cartoesEsperados)}</p>
                <p className="mt-1 text-xs text-muted">
                  {fmt(sA.porJogo.amarelos)} + {fmt(sB.porJogo.amarelos)} por jogo
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="glass p-5">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                  <TrendingUp className="h-3.5 w-3.5 text-brand" /> Quando o gol tende a sair
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li>
                    {teamA.flag} <strong>{teamA.nomePt}</strong>:{" "}
                    {janelaA ? <>janela mais provável <strong className="text-brand">{janelaA}&apos;</strong></> : "—"}
                    {sA.golsPorTempo && (
                      <span className="text-muted"> · {sA.golsPorTempo["2T"] >= sA.golsPorTempo["1T"] ? "cresce no 2º tempo" : "mais forte no 1º tempo"}</span>
                    )}
                  </li>
                  <li>
                    {teamB.flag} <strong>{teamB.nomePt}</strong>:{" "}
                    {janelaB ? <>janela mais provável <strong className="text-brand">{janelaB}&apos;</strong></> : "—"}
                    {sB.golsPorTempo && (
                      <span className="text-muted"> · {sB.golsPorTempo["2T"] >= sB.golsPorTempo["1T"] ? "cresce no 2º tempo" : "mais forte no 1º tempo"}</span>
                    )}
                  </li>
                </ul>
                <p className="mt-3 text-[11px] text-muted/70">
                  Cruzamento: janelas em que o time marca × janelas em que o rival sofre (desde 2023).
                </p>
              </div>
              <div className="glass p-5">
                <p className="text-xs uppercase tracking-wide text-muted">Artilheiros prováveis</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { t: teamA, s: sA, match: matchA },
                    { t: teamB, s: sB, match: matchB },
                  ].map(({ t, s, match }) => (
                    <ul key={t.fifa} className="space-y-1.5">
                      {s.artilheiros.slice(0, 3).map((a) => {
                        const jogador = match?.(a.nome) ?? null;
                        const dentro = match ? jogador !== null : true;
                        return (
                          <li key={a.nome} className={`flex items-center gap-1.5 ${dentro ? "" : "opacity-50"}`}>
                            <PlayerAvatar nome={a.nome} foto={jogador?.foto} size={22} />
                            <span className="truncate">{a.nome}</span>
                            <span className="ml-auto shrink-0 font-semibold tabular-nums text-brand">{a.gols}</span>
                            {!dentro && <span className="shrink-0 text-[10px] text-muted line-through">fora</span>}
                          </li>
                        );
                      })}
                    </ul>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted/70">
                  Gols desde 2023 · riscado = fora da convocação da Copa 2026.
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted/60">
              ⚠️ Estatísticas históricas (15 jogos desde 2023, fonte ESPN) — tendências, não garantias. Aposte com responsabilidade.
            </p>
          </section>

          {/* Comparação lado a lado */}
          <Card titulo={`Comparação por jogo — ${teamA.nomePt} × ${teamB.nomePt}`} className="mb-8">
            <div className="mx-auto max-w-2xl divide-y divide-border/40">
              <CompareRow label="Gols marcados" a={sA.porJogo.golsPro} b={sB.porJogo.golsPro} />
              <CompareRow label="Gols sofridos" a={sA.porJogo.golsContra} b={sB.porJogo.golsContra} melhorMenor />
              <CompareRow label="Finalizações" a={sA.porJogo.chutes} b={sB.porJogo.chutes} />
              <CompareRow label="Chutes no gol" a={sA.porJogo.chutesNoGol} b={sB.porJogo.chutesNoGol} />
              <CompareRow
                label="Precisão de chute"
                a={sA.porJogo.chutes ? (sA.porJogo.chutesNoGol ?? 0) / sA.porJogo.chutes : undefined}
                b={sB.porJogo.chutes ? (sB.porJogo.chutesNoGol ?? 0) / sB.porJogo.chutes : undefined}
                display={[
                  pct(sA.porJogo.chutes ? (sA.porJogo.chutesNoGol ?? 0) / sA.porJogo.chutes : undefined),
                  pct(sB.porJogo.chutes ? (sB.porJogo.chutesNoGol ?? 0) / sB.porJogo.chutes : undefined),
                ]}
                hint="chutes no gol ÷ finalizações"
              />
              <CompareRow
                label="Conversão"
                a={sA.porJogo.chutes ? sA.porJogo.golsPro / sA.porJogo.chutes : undefined}
                b={sB.porJogo.chutes ? sB.porJogo.golsPro / sB.porJogo.chutes : undefined}
                display={[
                  pct(sA.porJogo.chutes ? sA.porJogo.golsPro / sA.porJogo.chutes : undefined),
                  pct(sB.porJogo.chutes ? sB.porJogo.golsPro / sB.porJogo.chutes : undefined),
                ]}
                hint="gols ÷ finalizações"
              />
              <CompareRow
                label="Posse de bola"
                a={sA.porJogo.posse}
                b={sB.porJogo.posse}
                display={[`${fmt(sA.porJogo.posse)}%`, `${fmt(sB.porJogo.posse)}%`]}
              />
              <CompareRow label="Escanteios" a={sA.porJogo.escanteios} b={sB.porJogo.escanteios} />
              <CompareRow label="Desarmes" a={sA.porJogo.desarmes} b={sB.porJogo.desarmes} />
              <CompareRow label="Defesas do goleiro" a={sA.porJogo.defesasGoleiro} b={sB.porJogo.defesasGoleiro} />
              <CompareRow label="Impedimentos" a={sA.porJogo.impedimentos} b={sB.porJogo.impedimentos} melhorMenor />
              <CompareRow label="Faltas cometidas" a={sA.porJogo.faltas} b={sB.porJogo.faltas} melhorMenor />
              <CompareRow label="Cartões amarelos" a={sA.porJogo.amarelos} b={sB.porJogo.amarelos} melhorMenor />
              <CompareRow label="Cartões vermelhos" a={sA.porJogo.vermelhos} b={sB.porJogo.vermelhos} melhorMenor display={[fmt(sA.porJogo.vermelhos, 2), fmt(sB.porJogo.vermelhos, 2)]} />
            </div>
            <p className="mt-4 text-center text-[11px] text-muted/70">
              Verde = vantagem na métrica · médias por jogo desde 2023 (15 jogos cada, fonte ESPN).
            </p>
          </Card>

          {/* Leitura dos especialistas */}
          {(dA?.resumo || dB?.resumo) && (
            <section className="mb-8 grid gap-4 lg:grid-cols-2">
              {[
                { t: teamA, d: dA },
                { t: teamB, d: dB },
              ].map(
                ({ t, d }) =>
                  d?.resumo && (
                    <Card key={t.fifa} titulo={`${t.flag} Leitura dos especialistas — ${t.nomePt}`}>
                      <p className="text-sm leading-relaxed text-foreground/90">{d.resumo}</p>
                      <Link
                        href={`/painel/selecoes/${t.fifa}`}
                        className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
                      >
                        Dossiê completo →
                      </Link>
                    </Card>
                  ),
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
