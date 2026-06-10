import type { AgentBlock } from "@/lib/worldcup/dossies/types";
import { DossieIcon } from "./dossie-icon";

const confBadge: Record<string, string> = {
  baixa: "bg-surface-2 text-muted",
  "média": "bg-gold/15 text-gold",
  alta: "bg-brand/15 text-brand",
};

export function DossieCard({
  block,
  accent = "text-brand bg-brand/10",
}: {
  block: AgentBlock;
  accent?: string;
}) {
  return (
    <div className="glass glass-hover flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}>
            <DossieIcon name={block.icone} className="h-5 w-5" />
          </span>
          <h3 className="font-display text-base font-semibold">{block.titulo}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${confBadge[block.confianca]}`}>
          {block.confianca}
        </span>
      </div>

      <dl className="mt-4 space-y-2.5">
        {block.metricas.map((m, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
            <dt className="flex min-w-0 items-center gap-1.5 text-sm text-muted" title={m.hint}>
              <span className="truncate">{m.label}</span>
              {m.tag === "convocado" && (
                <span
                  className="shrink-0 rounded-full bg-brand/15 px-1.5 py-px text-[10px] font-medium text-brand"
                  title="Convocado para a Copa 2026"
                >
                  Copa 26
                </span>
              )}
              {m.tag === "fora" && (
                <span
                  className="shrink-0 rounded-full bg-surface-2 px-1.5 py-px text-[10px] font-medium text-muted/70 line-through"
                  title="Fora da convocação da Copa 2026"
                >
                  fora
                </span>
              )}
            </dt>
            <dd className="shrink-0 font-display text-sm font-semibold tabular-nums">
              {m.valor}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted">{block.leitura}</p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted/60">
        via {block.agente}
      </p>
    </div>
  );
}
