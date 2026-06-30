"use client";

/**
 * Mata-mata: quando o palpite é empate, o jogo vai p/ prorrogação/pênaltis.
 * O usuário escolhe quem avança (radio `vencedor-<id>`), valendo +1 ponto.
 */
export function SeletorVencedor({
  id,
  fifaMandante,
  fifaVisitante,
  mandante,
  visitante,
  flagMandante,
  flagVisitante,
  atual,
}: {
  id: number;
  fifaMandante: string;
  fifaVisitante: string;
  mandante: string;
  visitante: string;
  flagMandante: string;
  flagVisitante: string;
  atual?: string | null;
}) {
  const times = [
    { fifa: fifaMandante, nome: mandante, flag: flagMandante },
    { fifa: fifaVisitante, nome: visitante, flag: flagVisitante },
  ];
  return (
    <div className="mt-2.5 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2.5">
      <p className="mb-2 text-[11px] font-medium text-gold">
        Empate no mata-mata vai p/ prorrogação/pênaltis — quem avança? <strong>+1 pt</strong> se
        acertar.
      </p>
      <div className="flex flex-wrap gap-2">
        {times.map((t) => (
          <label key={t.fifa} className="cursor-pointer">
            <input
              type="radio"
              name={`vencedor-${id}`}
              value={t.fifa}
              defaultChecked={atual === t.fifa}
              className="peer sr-only"
            />
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium transition peer-checked:border-gold peer-checked:bg-gold/15 peer-checked:text-gold">
              <span className="text-base">{t.flag}</span> {t.nome}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
