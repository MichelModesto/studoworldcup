import type { Match } from "@/lib/worldcup/types";

/** Letreiro de resultados reais rolando, como o telão do estádio. */
export function ResultadosMarquee({ jogos }: { jogos: Match[] }) {
  const encerrados = jogos.filter(
    (m) => m.status === "encerrado" && m.placarMandante !== undefined,
  );
  if (!encerrados.length) return null;

  const itens = encerrados.map(
    (m) =>
      `${m.flagMandante} ${m.fifaMandante ?? m.mandante} ${m.placarMandante} × ${m.placarVisitante} ${m.fifaVisitante ?? m.visitante} ${m.flagVisitante}`,
  );
  // duplica para o loop ser contínuo
  const fila = [...itens, ...itens];

  return (
    <div className="overflow-hidden border-y border-brand/20 bg-surface/60 py-3">
      <div className="flex w-max animate-marquee items-center gap-10 font-mono text-sm tabular-nums text-foreground/90">
        {fila.map((t, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap">
            <span>{t}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-brand/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
