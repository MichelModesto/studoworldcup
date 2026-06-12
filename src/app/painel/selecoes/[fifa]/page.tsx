import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DossieCard } from "@/components/painel/dossie-card";
import { GoalsWindowChart, type WindowDatum } from "@/components/charts/goals-window-chart";
import { getTeams } from "@/lib/worldcup";
import { getTeamStats } from "@/lib/worldcup/team-stats";
import { buildDossier } from "@/lib/worldcup/dossie";
import { getDossier } from "@/lib/worldcup/dossies";
import { getSquad, buildSquadMatcher, tagConvocados } from "@/lib/worldcup/squads";
import { PlayerAvatar } from "@/components/painel/player-avatar";
import type { AgentBlock } from "@/lib/worldcup/dossies/types";

const CATEGORIAS: { nome: string; accent: string; agentes: string[] }[] = [
  {
    nome: "Ataque & criação",
    accent: "text-brand bg-brand/10",
    agentes: [
      "especialista-finalizacao",
      "especialista-chute-ao-gol",
      "especialista-escanteio",
      "especialista-artilheiro",
      "especialista-assistencia",
    ],
  },
  {
    nome: "Defesa & disputa",
    accent: "text-brand-2 bg-brand-2/10",
    agentes: [
      "especialista-desarme",
      "especialista-falta",
      "especialista-impedimento",
      "especialista-tiro-de-meta",
    ],
  },
  {
    nome: "Disciplina",
    accent: "text-accent bg-accent/10",
    agentes: ["especialista-cartao-amarelo", "especialista-cartao-vermelho"],
  },
  {
    nome: "Gols & tempo",
    accent: "text-gold bg-gold/10",
    agentes: [
      "especialista-tempo-com-mais-gols",
      "especialista-media-gol-por-tempo",
      "especialista-media-gol-por-jogo",
    ],
  },
];

export default async function SelecaoDetalhePage({
  params,
}: {
  params: Promise<{ fifa: string }>;
}) {
  const { fifa } = await params;
  const fifaUpper = fifa.toUpperCase();

  const teams = await getTeams();
  const team = teams.find((t) => t.fifa.toUpperCase() === fifaUpper);
  if (!team) notFound();

  const [dossie, stats, squad] = await Promise.all([
    getDossier(fifaUpper),
    getTeamStats(fifaUpper),
    getSquad(fifaUpper),
  ]);
  // Prioriza o dossiê gerado pelos agentes; senão, deriva dos dados reais.
  // Em ambos os casos, marca quem está (ou não) na convocação da Copa 2026.
  const matcher = buildSquadMatcher(squad);
  const blocks = tagConvocados(
    dossie?.blocks ?? (stats ? buildDossier(stats) : []),
    matcher,
  );
  const temConteudo = blocks.length > 0;
  const byAgent = new Map<string, AgentBlock>(blocks.map((b) => [b.agente, b]));

  const janelas = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90"];
  const windowData: WindowDatum[] = stats?.golsPorJanela
    ? janelas.map((j) => ({
        janela: j,
        marcados: stats.golsPorJanela?.[j] ?? 0,
        sofridos: stats.golsContraPorJanela?.[j] ?? 0,
      }))
    : [];

  return (
    <>
      <Link
        href="/painel/selecoes"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Seleções
      </Link>

      {/* Cabeçalho da seleção */}
      <div className="glass neon-border relative mb-7 flex flex-wrap items-center gap-5 overflow-hidden p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-14 select-none text-[200px] opacity-[0.07] blur-[2px]"
        >
          {team.flag}
        </span>
        <span className="text-6xl">{team.flag}</span>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{team.nomePt}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-surface-2 px-3 py-1 text-muted">Grupo {team.group}</span>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{team.confed}</span>
            <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-muted">{team.fifa}</span>
          </div>
        </div>
        {stats && (
          <div className="text-right text-sm">
            <p className="font-display text-2xl font-bold">
              {stats.registro.v}V {stats.registro.e}E {stats.registro.d}D
            </p>
            <p className="text-xs text-muted">
              {stats.jogos} jogos desde {stats.desde.slice(0, 4)}
            </p>
          </div>
        )}
      </div>

      {squad && (
        <Card titulo={`Convocados — Copa 2026 (${squad.jogadores.length} jogadores)`} className="mb-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(["Goleiro", "Defensor", "Meio-campista", "Atacante"] as const).map((pos) => {
              const grupo = squad.jogadores.filter((j) => j.posicao === pos);
              if (!grupo.length) return null;
              return (
                <div key={pos}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {pos}s
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {grupo.map((j) => (
                      <li key={`${j.numero}-${j.nome}`} className="flex items-center gap-2">
                        <PlayerAvatar nome={j.nome} foto={j.foto} size={30} />
                        <span className="w-5 shrink-0 text-right font-mono text-xs text-muted">
                          {j.numero ?? "–"}
                        </span>
                        <span className="truncate">{j.nome}</span>
                        {j.idade && <span className="shrink-0 text-xs text-muted/70">{j.idade}a</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted/70">
            Convocação oficial · atualizada em {new Date(squad.atualizadoEm).toLocaleDateString("pt-BR")} · fonte: {squad.fontes.join(" + ")}
          </p>
        </Card>
      )}

      {temConteudo ? (
        <>
          {dossie?.resumo && (
            <div className="glass mb-6 p-5">
              <p className="text-sm leading-relaxed text-foreground/90">{dossie.resumo}</p>
            </div>
          )}
          <p className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Database className="h-3.5 w-3.5" />
            {dossie
              ? `Dossiê gerado pelos agentes · ${dossie.fonte}${dossie.geradoEm ? ` · ${new Date(dossie.geradoEm).toLocaleDateString("pt-BR")}` : ""}`
              : `Dados reais · ${stats?.competicoes.join(", ") || "diversas competições"} · fonte: ${stats?.fontes.join(" + ")}`}
          </p>

          {windowData.length > 0 && (
            <Card titulo="Gols por janela de 15' (marcados × sofridos)" className="mb-8">
              <GoalsWindowChart data={windowData} />
            </Card>
          )}

          {CATEGORIAS.map((cat) => {
            const cards = cat.agentes.map((a) => byAgent.get(a)).filter(Boolean) as AgentBlock[];
            if (!cards.length) return null;
            return (
              <section key={cat.nome} className="mb-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                  {cat.nome}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((b) => (
                    <DossieCard key={b.agente} block={b} accent={cat.accent} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <EmptyState
          icon={Sparkles}
          titulo="Análises dos especialistas em geração"
          descricao={`Para preencher o dossiê da ${team.nomePt} com dados reais (2023+), configure a chave em .env.local e rode "npm run ingest". Cada agente especialista vai analisar os jogos e preencher esta página automaticamente.`}
        />
      )}
    </>
  );
}
