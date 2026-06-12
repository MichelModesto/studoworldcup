import { PageHeader } from "@/components/ui/page-header";
import { AutoRefresh } from "@/components/painel/auto-refresh";
import { MatchCard } from "@/components/painel/match-card";
import { LiveScores } from "@/components/painel/live-scores";
import { getMatches, type Match } from "@/lib/worldcup";
import { getLiveScoreboard } from "@/lib/worldcup/live";

const FUSO = "America/Sao_Paulo";

/** Data-calendário (aaaa-mm-dd) em Brasília, para agrupar coerente com o horário exibido. */
function diaBR(j: Match): string {
  const base = j.kickoffISO ?? `${j.dataISO}T12:00:00`;
  return new Date(base).toLocaleDateString("en-CA", { timeZone: FUSO });
}

function formatarDataLonga(diaISO: string) {
  return new Date(`${diaISO}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  });
}

function agruparPorData(jogos: Match[]) {
  const mapa = new Map<string, Match[]>();
  for (const j of jogos) {
    const chave = diaBR(j);
    const lista = mapa.get(chave) ?? [];
    lista.push(j);
    mapa.set(chave, lista);
  }
  return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default async function JogosPage() {
  const [matches, live] = await Promise.all([getMatches(), getLiveScoreboard()]);
  const ordenados = [...matches].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const aoVivo = ordenados.filter((j) => j.status === "ao-vivo");
  const encerrados = ordenados.filter((j) => j.status === "encerrado");
  const agendados = ordenados.filter((j) => j.status === "agendado");

  return (
    <>
      <PageHeader
        titulo="Jogos"
        descricao={`Calendário completo da Copa 2026 — ${matches.length} partidas.`}
      />
      <AutoRefresh segundos={60} />

      <LiveScores initial={live} />

      {aoVivo.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-danger">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" /> Ao vivo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {aoVivo.map((j) => (
              <MatchCard key={j.id} jogo={j} />
            ))}
          </div>
        </section>
      )}

      {encerrados.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Resultados <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{encerrados.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {encerrados.map((j) => (
              <MatchCard key={j.id} jogo={j} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Próximos jogos <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{agendados.length}</span>
        </h2>
        <div className="space-y-8">
          {agruparPorData(agendados).map(([data, jogos]) => (
            <div key={data}>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-brand">
                {formatarDataLonga(data)}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {jogos.map((j) => (
                  <MatchCard key={j.id} jogo={j} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
