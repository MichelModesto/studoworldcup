import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getMatches } from "@/lib/worldcup";
import type { Match } from "@/lib/worldcup/types";

export const metadata = { title: "Mata-mata" };

const FUSO = "America/Sao_Paulo";
const FASES = [
  "16-avos de final",
  "Oitavas de final",
  "Quartas de final",
  "Semifinal",
  "Disputa de 3º lugar",
  "Final",
];

/** Traduz placeholders do calendário ("1A", "2B", "3A/B/C", "W100", "L101"...). */
function nomePt(nome: string): string {
  const compacto = nome.trim();
  let m = /^([12])([A-L])$/i.exec(compacto);
  if (m) return `${m[1]}º do Grupo ${m[2].toUpperCase()}`;
  m = /^3([A-L/]+)$/i.exec(compacto);
  if (m) return `3º de ${m[1].toUpperCase()}`;
  m = /^W(\d+)$/i.exec(compacto);
  if (m) return `Venc. jogo ${m[1]}`;
  m = /^L(\d+)$/i.exec(compacto);
  if (m) return `Perd. jogo ${m[1]}`;
  return nome
    .replace(/winners?\s+group\s+([a-l])/i, "1º do Grupo $1")
    .replace(/runners?-up\s+group\s+([a-l])/i, "2º do Grupo $1")
    .replace(/winners?\s+(?:of\s+)?match\s+(\d+)/i, "Venc. jogo $1")
    .replace(/losers?\s+(?:of\s+)?match\s+(\d+)/i, "Perd. jogo $1");
}

function MiniJogo({ m }: { m: Match }) {
  const definido = Boolean(m.fifaMandante && m.fifaVisitante);
  const data = m.kickoffISO
    ? new Date(m.kickoffISO).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: FUSO,
      })
    : m.dataISO;
  const lado = (flag: string, nome: string, gols?: number, venceu?: boolean) => (
    <div className={`flex items-center justify-between gap-2 ${venceu === false ? "opacity-50" : ""}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-base">{flag}</span>
        <span className={`truncate text-xs ${definido ? "font-medium" : "text-muted"}`}>
          {definido ? nome : nomePt(nome)}
        </span>
      </span>
      {gols !== undefined && (
        <span className={`shrink-0 font-display text-sm font-bold tabular-nums ${venceu ? "text-brand" : ""}`}>
          {gols}
        </span>
      )}
    </div>
  );
  const terminou = m.status === "encerrado" && m.placarMandante !== undefined;
  const venceuA = terminou ? (m.placarMandante ?? 0) > (m.placarVisitante ?? 0) : undefined;
  return (
    <Link
      href={`/painel/jogos/${m.id}`}
      className="glass glass-hover block w-56 shrink-0 space-y-1.5 p-3 transition hover:border-brand/40"
    >
      {lado(m.flagMandante, m.mandante, m.placarMandante, venceuA)}
      {lado(m.flagVisitante, m.visitante, m.placarVisitante, venceuA === undefined ? undefined : !venceuA)}
      <p className="border-t border-border/40 pt-1.5 text-[10px] text-muted">
        {data} · {m.cidade}
        {m.status === "ao-vivo" && <span className="ml-1.5 font-medium text-danger">AO VIVO</span>}
      </p>
    </Link>
  );
}

export default async function MataMataPage() {
  const matches = await getMatches();
  const porFase = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.fase === "Fase de Grupos") continue;
    porFase.set(m.fase, [...(porFase.get(m.fase) ?? []), m]);
  }
  const fases = FASES.filter((f) => porFase.has(f));

  return (
    <>
      <PageHeader
        titulo="Mata-mata"
        descricao="O chaveamento da Copa 2026, dos 16-avos à final — preenchido conforme os classificados saem."
      />
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-6">
          {fases.map((fase) => {
            const jogos = (porFase.get(fase) ?? []).sort((a, b) =>
              a.sortKey.localeCompare(b.sortKey),
            );
            return (
              <div key={fase} className="shrink-0">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  {fase} <span className="text-muted/60">({jogos.length})</span>
                </h2>
                <div className="flex flex-col justify-around gap-3">
                  {jogos.map((m) => (
                    <MiniJogo key={m.id} m={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
