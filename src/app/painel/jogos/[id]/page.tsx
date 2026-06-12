import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AutoRefresh } from "@/components/painel/auto-refresh";
import { PlayerAvatar } from "@/components/painel/player-avatar";
import { getMatches } from "@/lib/worldcup";
import { getPartidaESPN, type EventoPartida } from "@/lib/worldcup/partida";
import { getSquad, buildSquadMatcher, type SquadMatcher } from "@/lib/worldcup/squads";

const FUSO = "America/Sao_Paulo";

const ICONE_EVENTO: Record<EventoPartida["tipo"], string> = {
  gol: "⚽",
  amarelo: "🟨",
  vermelho: "🟥",
  substituicao: "🔁",
  var: "📺",
  outro: "•",
};

const statusInfo: Record<string, { label: string; cls: string }> = {
  encerrado: { label: "Encerrado", cls: "bg-surface-2 text-muted" },
  "ao-vivo": { label: "Ao vivo", cls: "bg-danger/15 text-danger" },
  agendado: { label: "Agendado", cls: "bg-brand/10 text-brand" },
};

export default async function JogoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matches = await getMatches();
  const jogo = matches.find((m) => m.id === Number(id));
  if (!jogo) notFound();

  const [partida, sqA, sqB] = await Promise.all([
    jogo.espnId ? getPartidaESPN(jogo.espnId) : Promise.resolve(null),
    jogo.fifaMandante ? getSquad(jogo.fifaMandante) : Promise.resolve(null),
    jogo.fifaVisitante ? getSquad(jogo.fifaVisitante) : Promise.resolve(null),
  ]);
  const matchers: SquadMatcher[] = [buildSquadMatcher(sqA), buildSquadMatcher(sqB)].filter(
    Boolean,
  ) as SquadMatcher[];
  const fotoDe = (nome: string) => {
    for (const m of matchers) {
      const j = m(nome);
      if (j?.foto) return j.foto;
    }
    return undefined;
  };

  const s = statusInfo[jogo.status];
  const quando = jogo.kickoffISO
    ? new Date(jogo.kickoffISO).toLocaleString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: FUSO,
      })
    : jogo.dataISO;
  const confronto =
    jogo.fifaMandante && jogo.fifaVisitante
      ? `/painel/confronto/${jogo.fifaMandante}-${jogo.fifaVisitante}`
      : null;

  return (
    <>
      <Link
        href="/painel/jogos"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Jogos
      </Link>
      {jogo.status !== "encerrado" && <AutoRefresh segundos={45} />}

      {/* Cabeçalho */}
      <div className="glass neon-border mb-7 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {jogo.fase}
            {jogo.grupo ? ` · Grupo ${jogo.grupo}` : ""}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${s.cls}`}>
            {jogo.status === "ao-vivo" && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
            )}
            {s.label}
          </span>
        </div>
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <span className="text-6xl">{jogo.flagMandante}</span>
            <span className="font-display text-lg font-bold">{jogo.mandante}</span>
          </div>
          <div className="text-center">
            {jogo.placarMandante !== undefined ? (
              <p className="font-display text-5xl font-bold tabular-nums">
                {jogo.placarMandante} <span className="text-muted">×</span> {jogo.placarVisitante}
              </p>
            ) : (
              <p className="font-display text-3xl font-bold text-muted">VS</p>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <span className="text-6xl">{jogo.flagVisitante}</span>
            <span className="font-display text-lg font-bold">{jogo.visitante}</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> {quando} (Brasília)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {jogo.estadio} · {jogo.cidade}
          </span>
          {confronto && (
            <Link
              href={confronto}
              className="inline-flex items-center gap-1.5 text-brand transition hover:underline"
            >
              <Scale className="h-3.5 w-3.5" /> Análise do confronto
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lance a lance */}
        {partida && partida.eventos.length > 0 && (
          <Card titulo="Lance a lance">
            <ul className="space-y-2.5 text-sm">
              {partida.eventos.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2.5">
                  <span className="w-12 shrink-0 text-right font-mono text-xs text-muted">
                    {e.minuto}
                  </span>
                  <span className="shrink-0">{ICONE_EVENTO[e.tipo]}</span>
                  <span className="min-w-0">
                    {e.jogador && <strong>{e.jogador}</strong>}
                    {e.jogador && e.time && <span className="text-muted"> · </span>}
                    {e.time && <span className="text-muted">{e.time}</span>}
                    {e.tipo === "substituicao" && (
                      <span className="text-muted"> (substituição)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Estatísticas */}
        {partida && partida.estatisticas.length > 0 && (
          <Card titulo="Estatísticas da partida">
            <div className="space-y-3">
              {partida.estatisticas.map((st) => {
                const a = parseFloat(st.casa) || 0;
                const b = parseFloat(st.fora) || 0;
                const max = Math.max(a, b, 0.001);
                return (
                  <div key={st.nome}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="w-12 font-display font-semibold tabular-nums">{st.casa}</span>
                      <span className="text-xs uppercase tracking-wide text-muted">{st.nome}</span>
                      <span className="w-12 text-right font-display font-semibold tabular-nums">
                        {st.fora}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-surface-2/50">
                        <div className="h-full rounded-full btn-brand" style={{ width: `${(a / max) * 100}%` }} />
                      </div>
                      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2/50">
                        <div className="h-full rounded-full bg-brand-2" style={{ width: `${(b / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Escalações */}
      {partida && partida.escalacoes.length === 2 && partida.escalacoes[0].titulares.length > 0 && (
        <Card titulo="Escalações" className="mt-4">
          <div className="grid gap-6 sm:grid-cols-2">
            {partida.escalacoes.map((lado, li) => (
              <div key={lado.time}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <span className="text-xl">{li === 0 ? jogo.flagMandante : jogo.flagVisitante}</span>
                  {lado.time}
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {lado.titulares.map((j) => (
                    <li key={j.nome} className="flex items-center gap-2">
                      <PlayerAvatar nome={j.nome} foto={fotoDe(j.nome)} size={26} />
                      <span className="w-5 shrink-0 text-right font-mono text-xs text-muted">
                        {j.numero ?? "–"}
                      </span>
                      <span className="truncate">{j.nome}</span>
                      {j.posicao && (
                        <span className="shrink-0 text-[10px] uppercase text-muted/70">
                          {j.posicao}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {lado.reservas.some((r) => r.entrou) && (
                  <p className="mt-3 text-xs text-muted">
                    Entraram:{" "}
                    {lado.reservas
                      .filter((r) => r.entrou)
                      .map((r) => r.nome)
                      .join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!partida && jogo.status === "agendado" && (
        <p className="text-sm text-muted">
          Lance a lance, estatísticas e escalações aparecem aqui automaticamente perto do início da
          partida.
        </p>
      )}
    </>
  );
}
