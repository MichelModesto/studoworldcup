import { ehMataMata, type Palpite } from "@/lib/bolao";
import type { Match } from "@/lib/worldcup/types";

export function palpiteEmpate(p: Palpite): boolean {
  return p.golsMandante === p.golsVisitante;
}

export function resolveTimeVencedor(
  m: Match,
  fifa?: string | null,
): { flag: string; nome: string } | null {
  if (!fifa) return null;
  if (fifa === m.fifaMandante) return { flag: m.flagMandante, nome: m.mandante };
  if (fifa === m.fifaVisitante) return { flag: m.flagVisitante, nome: m.visitante };
  return { flag: "🏳️", nome: fifa };
}

/**
 * Mata-mata + palpite de empate: mostra em quem a pessoa apostou para avançar
 * após os 90' (prorrogação ou pênaltis).
 */
export function IndicadorVencedorEmpate({
  m,
  palpite,
  compact = false,
}: {
  m: Match;
  palpite: Palpite;
  compact?: boolean;
}) {
  if (!ehMataMata(m) || !palpiteEmpate(palpite)) return null;
  const time = resolveTimeVencedor(m, palpite.vencedorFifa);

  if (!time) {
    return (
      <span
        className="inline-flex items-center rounded-md bg-surface-2/90 px-1.5 py-px text-[10px] text-muted/80"
        title="Não escolheu quem avança se empatar"
      >
        sem escolha
      </span>
    );
  }

  if (compact) {
    return (
      <span
        className="inline-flex max-w-[7.5rem] items-center gap-0.5 rounded-md bg-gold/10 px-1.5 py-px text-[10px] font-medium text-gold ring-1 ring-gold/25"
        title={`Aposta que ${time.nome} avança (prorrogação/pênaltis)`}
      >
        <span className="shrink-0 opacity-70" aria-hidden>
          →
        </span>
        <span className="shrink-0 text-sm leading-none">{time.flag}</span>
        <span className="truncate">{time.nome}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold ring-1 ring-gold/25"
      title={`Aposta que ${time.nome} avança (prorrogação/pênaltis)`}
    >
      <span className="text-sm leading-none">{time.flag}</span>
      <span className="truncate">avança: {time.nome}</span>
    </span>
  );
}
