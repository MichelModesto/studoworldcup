import { Building2, Goal, LineChart, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DonutChart } from "@/components/charts/donut-chart";
import { SimpleBarChart, type BarDatum } from "@/components/charts/simple-bar-chart";
import {
  getConfederationBreakdown,
  getMatches,
  getStadiums,
  getSummary,
} from "@/lib/worldcup";

export const metadata = { title: "Estatísticas" };

const PAIS_COR: Record<string, string> = {
  "Estados Unidos": "#4e8ec9",
  Canadá: "#e5484d",
  México: "#3ddc84",
};

export default async function EstatisticasPage() {
  const [confed, stadiums, matches, summary] = await Promise.all([
    getConfederationBreakdown(),
    getStadiums(),
    getMatches(),
    getSummary(),
  ]);

  // Capacidade total por país-sede
  const capPorPais = new Map<string, number>();
  for (const s of stadiums) capPorPais.set(s.pais, (capPorPais.get(s.pais) ?? 0) + s.capacidade);
  const capData: BarDatum[] = [...capPorPais.entries()]
    .map(([pais, cap]) => ({ label: pais, value: Math.round(cap / 1000), color: PAIS_COR[pais] }))
    .sort((a, b) => b.value - a.value);

  // Jogos por fase
  const fases = new Map<string, number>();
  for (const m of matches) fases.set(m.fase, (fases.get(m.fase) ?? 0) + 1);
  const ordemFase = [
    "Fase de Grupos",
    "16-avos de final",
    "Oitavas de final",
    "Quartas de final",
    "Semifinal",
    "Disputa de 3º lugar",
    "Final",
  ];
  const faseData: BarDatum[] = [...fases.entries()]
    .map(([label, value]) => ({ label: label.replace(" de final", "").replace("Fase de ", ""), value }))
    .sort(
      (a, b) =>
        ordemFase.findIndex((f) => f.startsWith(a.label.split(" ")[0])) -
        ordemFase.findIndex((f) => f.startsWith(b.label.split(" ")[0])),
    );

  const capacidadeTotal = stadiums.reduce((a, s) => a + s.capacidade, 0);
  const media =
    summary.jogosDisputados > 0
      ? (summary.golsTotais / summary.jogosDisputados).toFixed(2).replace(".", ",")
      : "—";

  return (
    <>
      <PageHeader
        titulo="Estatísticas"
        descricao="Panorama do torneio. Métricas de jogo (finalizações, posse, cartões) entram em ação com o início das partidas."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Seleções" value={summary.selecoes} hint="6 confederações" icon={Users} accent="brand" />
        <StatCard label="Estádios" value={stadiums.length} hint="3 países-sede" icon={Building2} accent="brand-2" />
        <StatCard label="Capacidade total" value={capacidadeTotal} hint="Somando as sedes" icon={Trophy} accent="violet" />
        <StatCard label="Média de gols/jogo" value={media} hint={`${summary.jogosDisputados} jogos disputados`} icon={Goal} accent="gold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card titulo="Seleções por confederação">
          <DonutChart data={confed} />
        </Card>
        <Card titulo="Capacidade por país-sede (mil lugares)">
          <SimpleBarChart data={capData} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card titulo="Jogos por fase">
          <SimpleBarChart data={faseData} color="#4e8ec9" />
        </Card>
        <Card titulo="Estatísticas de jogo">
          <EmptyState
            icon={LineChart}
            titulo="Disponíveis com o início do torneio"
            descricao="Finalizações, chutes ao gol, posse, escanteios, cartões, impedimentos e mais — alimentados pelos jogos e pelos nossos agentes especialistas."
          />
        </Card>
      </div>
    </>
  );
}
