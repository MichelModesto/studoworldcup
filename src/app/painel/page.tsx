import Link from "next/link";
import { ArrowRight, CalendarClock, Flame, Goal, Shield, ShieldAlert, Target, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchCard } from "@/components/painel/match-card";
import { LiveScores } from "@/components/painel/live-scores";
import { AvisosBolao } from "@/components/painel/avisos-bolao";
import { DonutChart } from "@/components/charts/donut-chart";
import {
  getConfederationBreakdown,
  getScorers,
  getSummary,
  getTeams,
} from "@/lib/worldcup";
import { getLiveScoreboard } from "@/lib/worldcup/live";
import { listTeamStats } from "@/lib/worldcup/team-stats";

export default async function VisaoGeralPage() {
  const [summary, scorers, confed, live, teams, allStats] = await Promise.all([
    getSummary(),
    getScorers(5),
    getConfederationBreakdown(),
    getLiveScoreboard(),
    getTeams(),
    listTeamStats(),
  ]);

  const destaques = summary.jogosDisputados > 0 ? summary.ultimos : summary.proximos;
  const fifaPorNomePt = new Map(teams.map((t) => [t.nomePt, t.fifa]));

  // Radar da Copa: rankings derivados das estatísticas reais (2023+).
  const top = (chave: (s: (typeof allStats)[number]) => number, asc = false) =>
    [...allStats]
      .sort((a, b) => (asc ? chave(a) - chave(b) : chave(b) - chave(a)))
      .slice(0, 3);
  const radar = allStats.length
    ? [
        {
          titulo: "Ataques mais quentes",
          hint: "gols marcados/jogo",
          icon: Flame,
          accent: "text-gold bg-gold/10",
          itens: top((s) => s.porJogo.golsPro).map((s) => ({
            fifa: s.fifa, nome: s.nomePt, valor: s.porJogo.golsPro.toFixed(1).replace(".", ","),
          })),
        },
        {
          titulo: "Defesas mais sólidas",
          hint: "gols sofridos/jogo",
          icon: Shield,
          accent: "text-brand bg-brand/10",
          itens: top((s) => s.porJogo.golsContra, true).map((s) => ({
            fifa: s.fifa, nome: s.nomePt, valor: s.porJogo.golsContra.toFixed(1).replace(".", ","),
          })),
        },
        {
          titulo: "Jogos com mais gols",
          hint: "gols pró + contra/jogo (over)",
          icon: Goal,
          accent: "text-accent bg-accent/10",
          itens: top((s) => s.porJogo.golsPro + s.porJogo.golsContra).map((s) => ({
            fifa: s.fifa, nome: s.nomePt,
            valor: (s.porJogo.golsPro + s.porJogo.golsContra).toFixed(1).replace(".", ","),
          })),
        },
        {
          titulo: "Mais indisciplinados",
          hint: "cartões amarelos/jogo",
          icon: ShieldAlert,
          accent: "text-danger bg-danger/10",
          itens: top((s) => s.porJogo.amarelos ?? 0).map((s) => ({
            fifa: s.fifa, nome: s.nomePt, valor: (s.porJogo.amarelos ?? 0).toFixed(1).replace(".", ","),
          })),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        titulo="Visão geral"
        descricao="Resumo do torneio com dados reais — Copa do Mundo FIFA 2026."
      />

      <AvisosBolao />

      <LiveScores initial={live} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Seleções" value={summary.selecoes} hint="Classificadas · ver todas" icon={Users} accent="brand" href="/painel/selecoes" />
        <StatCard label="Jogos" value={summary.jogos} hint={`${summary.jogosDisputados} disputados · calendário`} icon={Trophy} accent="brand-2" href="/painel/jogos" />
        <StatCard label="Gols marcados" value={summary.golsTotais} hint="No torneio · estatísticas" icon={Goal} accent="accent" href="/painel/estatisticas" />
        <StatCard
          label="Artilheiro"
          value={scorers[0] ? `${scorers[0].gols} gols` : "—"}
          hint={scorers[0]?.jogador ?? "Aguardando o pontapé inicial"}
          icon={Target}
          accent="gold"
          href="/painel/artilheiros"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {summary.jogosDisputados > 0 ? "Resultados recentes" : "Próximos jogos"}
            </h2>
            <Link href="/painel/jogos" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {destaques.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {destaques.slice(0, 4).map((j) => (
                <MatchCard key={j.id} jogo={j} />
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarClock} titulo="Calendário em breve" descricao="Os jogos aparecerão aqui." />
          )}
        </div>

        <Card titulo="Seleções por confederação">
          <DonutChart data={confed} />
          <Link
            href="/painel/grupos"
            className="mt-3 inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            Ver grupos e classificação <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      {radar.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Radar da Copa — dados reais desde 2023
            </h2>
            <Link href="/painel/estatisticas" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
              Todas as estatísticas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {radar.map((r) => (
              <div key={r.titulo} className="glass p-5">
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${r.accent}`}>
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{r.titulo}</p>
                    <p className="text-[11px] text-muted">{r.hint}</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {r.itens.map((i, idx) => (
                    <li key={i.fifa}>
                      <Link
                        href={`/painel/selecoes/${i.fifa}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition hover:bg-surface-2/60"
                        title={`Abrir o dossiê de ${i.nome}`}
                      >
                        <span className="w-4 text-xs font-semibold text-muted">{idx + 1}</span>
                        <span className="truncate font-medium">{i.nome}</span>
                        <span className="ml-auto font-display text-sm font-bold tabular-nums text-brand">{i.valor}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card titulo="Top artilheiros" className="lg:col-span-3">
          {scorers.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {scorers.map((a, i) => {
                const fifa = fifaPorNomePt.get(a.selecao);
                const conteudo = (
                  <>
                    <span className="w-5 text-sm font-semibold text-muted">{i + 1}</span>
                    <span className="text-xl">{a.flag}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.jogador}</p>
                      <p className="truncate text-xs text-muted">{a.selecao}</p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-sm font-semibold text-brand">
                      {a.gols}
                    </span>
                  </>
                );
                return (
                  <li key={`${a.jogador}-${a.selecao}`}>
                    {fifa ? (
                      <Link
                        href={`/painel/selecoes/${fifa}`}
                        className="flex items-center gap-3 rounded-xl bg-surface/40 p-3 transition hover:bg-surface-2/60"
                        title={`Abrir o dossiê de ${a.selecao}`}
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl bg-surface/40 p-3">{conteudo}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={Target}
              titulo="Ranking de artilheiros em breve"
              descricao="O torneio começa em 11/06/2026. Assim que a bola rolar, os gols (e seus autores) aparecem aqui automaticamente."
            />
          )}
        </Card>
      </div>
    </>
  );
}
