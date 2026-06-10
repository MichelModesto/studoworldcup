import Link from "next/link";
import { ArrowRight, CalendarClock, Goal, Target, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchCard } from "@/components/painel/match-card";
import { DonutChart } from "@/components/charts/donut-chart";
import {
  getConfederationBreakdown,
  getScorers,
  getSummary,
} from "@/lib/worldcup";

export default async function VisaoGeralPage() {
  const [summary, scorers, confed] = await Promise.all([
    getSummary(),
    getScorers(5),
    getConfederationBreakdown(),
  ]);

  const destaques = summary.jogosDisputados > 0 ? summary.ultimos : summary.proximos;

  return (
    <>
      <PageHeader
        titulo="Visão geral"
        descricao="Resumo do torneio com dados reais — Copa do Mundo FIFA 2026."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Seleções" value={summary.selecoes} hint="Classificadas" icon={Users} accent="brand" />
        <StatCard label="Jogos" value={summary.jogos} hint={`${summary.jogosDisputados} disputados`} icon={Trophy} accent="brand-2" />
        <StatCard label="Gols marcados" value={summary.golsTotais} hint="No torneio" icon={Goal} accent="accent" />
        <StatCard
          label="Artilheiro"
          value={scorers[0] ? `${scorers[0].gols} gols` : "—"}
          hint={scorers[0]?.jogador ?? "Aguardando o pontapé inicial"}
          icon={Target}
          accent="gold"
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
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card titulo="Top artilheiros" className="lg:col-span-3">
          {scorers.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {scorers.map((a, i) => (
                <li key={`${a.jogador}-${a.selecao}`} className="flex items-center gap-3 rounded-xl bg-surface/40 p-3">
                  <span className="w-5 text-sm font-semibold text-muted">{i + 1}</span>
                  <span className="text-xl">{a.flag}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.jogador}</p>
                    <p className="truncate text-xs text-muted">{a.selecao}</p>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-sm font-semibold text-brand">
                    {a.gols}
                  </span>
                </li>
              ))}
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
