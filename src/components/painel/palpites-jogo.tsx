import { detalhePalpite, emProrrogacao, placarValido, type Palpite } from "@/lib/bolao";
import type { Match } from "@/lib/worldcup/types";
import { TagAoVivo } from "@/components/painel/placar-fx";

type PalpiteGrupo = { usuarioId: number; nome: string; palpite: Palpite };

const lado = (p: Palpite) => Math.sign(p.golsMandante - p.golsVisitante);

/** Cor do chip conforme os pontos (parciais em jogo ao vivo, finais em encerrado). */
function corPts(pts: number | null): string {
  if (pts !== null && pts >= 3) return "bg-gold/15 text-gold ring-gold/30";
  if (pts !== null && pts >= 1) return "bg-brand/15 text-brand ring-brand/20";
  return "bg-surface-2 text-muted ring-transparent";
}

/**
 * Bloco de um jogo na seção "Palpites do grupo": placar, chips de cada
 * participante (com pontos ao vivo e selos) e a barra de consenso.
 */
export function PalpitesJogo({
  m,
  palpites,
  meuId,
}: {
  m: Match;
  palpites: PalpiteGrupo[];
  meuId: number;
}) {
  const aoVivo = m.status === "ao-vivo";
  const prorrogacao = emProrrogacao(m);
  const placar90 = placarValido(m);
  const total = palpites.length;

  // Quantos cravaram cada placar exato (pra achar os "solo").
  const placarCount = new Map<string, number>();
  for (const p of palpites) {
    const k = `${p.palpite.golsMandante}x${p.palpite.golsVisitante}`;
    placarCount.set(k, (placarCount.get(k) ?? 0) + 1);
  }

  // Lado minoritário (quem foi na contramão do grupo).
  const ladoCount = { 1: 0, 0: 0, [-1]: 0 } as Record<number, number>;
  for (const p of palpites) ladoCount[lado(p.palpite)]++;
  const ladosComGente = [1, 0, -1].filter((s) => ladoCount[s] > 0);
  const minCount = Math.min(...ladosComGente.map((s) => ladoCount[s]));
  const ladoMinoritario =
    ladosComGente.length >= 2 &&
    ladosComGente.filter((s) => ladoCount[s] === minCount).length === 1 &&
    minCount <= total / 3
      ? ladosComGente.find((s) => ladoCount[s] === minCount)!
      : null;

  const selo = (p: PalpiteGrupo, base: number | null) => {
    if (base === 3) return aoVivo ? { e: "🎯", t: "cravando o placar agora" } : { e: "🎯", t: "cravou o placar" };
    if (ladoMinoritario !== null && lado(p.palpite) === ladoMinoritario)
      return { e: "🧨", t: "foi na contramão do grupo" };
    if (placarCount.get(`${p.palpite.golsMandante}x${p.palpite.golsVisitante}`) === 1 && total >= 3)
      return { e: "🃏", t: "único com esse placar" };
    return null;
  };

  // Eu primeiro; depois quem está pontuando melhor; empate por nome.
  const ordenados = [...palpites].sort((a, b) => {
    if (a.usuarioId === meuId) return -1;
    if (b.usuarioId === meuId) return 1;
    const pa = detalhePalpite(a.palpite, m)?.total ?? -1;
    const pb = detalhePalpite(b.palpite, m)?.total ?? -1;
    return pb - pa || a.nome.localeCompare(b.nome, "pt-BR");
  });

  return (
    <div className="border-b border-border/40 pb-4 last:border-0 last:pb-0">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium">
        <span>{m.flagMandante}</span> {m.mandante}
        <span className="font-display font-bold tabular-nums">
          {m.placarMandante ?? "–"} × {m.placarVisitante ?? "–"}
        </span>
        {m.visitante} <span>{m.flagVisitante}</span>
        {prorrogacao && placar90 && (
          <span className="text-xs font-normal text-muted">
            (90&apos;: {placar90.mandante}×{placar90.visitante})
          </span>
        )}
        {aoVivo && <TagAoVivo texto={prorrogacao ? "prorrogação" : "ao vivo"} />}
      </p>

      <div className="flex flex-wrap gap-2">
        {ordenados.map((p) => {
          const d = detalhePalpite(p.palpite, m);
          const pts = d?.total ?? null;
          const souEu = p.usuarioId === meuId;
          const s = selo(p, d?.base ?? null);
          return (
            <span
              key={p.usuarioId}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ${corPts(pts)} ${
                souEu ? "ring-2 ring-brand/60" : ""
              }`}
              title={
                pts !== null
                  ? `${pts} ponto(s)${aoVivo ? (d?.bonusProvisorio ? " — bônus provisório na prorrogação" : " se acabar agora") : ""}`
                  : "aguardando o jogo"
              }
            >
              <span className={souEu ? "font-semibold" : ""}>
                {souEu ? "Você" : p.nome}: {p.palpite.golsMandante}×{p.palpite.golsVisitante}
              </span>
              {s && <span title={s.t}>{s.e}</span>}
              {d && d.bonus > 0 && (
                <span
                  title={
                    d.bonusProvisorio ? "time escolhido na frente na prorrogação (+1)" : "acertou quem avançou (+1)"
                  }
                >
                  🏆
                </span>
              )}
              {pts !== null && (
                <span className="font-display font-semibold tabular-nums opacity-80">
                  +{pts}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {total >= 2 &&
        (() => {
          const conta = (s: number) => palpites.filter((p) => lado(p.palpite) === s).length;
          const pct = (n: number) => Math.round((n / total) * 100);
          return (
            <p className="mt-2 text-[11px] text-muted/80">
              {pct(conta(1))}% em {m.mandante} · {pct(conta(0))}% no empate · {pct(conta(-1))}% em{" "}
              {m.visitante}
            </p>
          );
        })()}
    </div>
  );
}
