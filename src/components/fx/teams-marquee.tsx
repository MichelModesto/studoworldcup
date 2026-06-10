import type { Team } from "@/lib/worldcup";

/** Faixa infinita com as seleções (duplicada para loop contínuo). */
export function TeamsMarquee({ teams }: { teams: Team[] }) {
  const itens = teams.slice(0, 24);
  if (!itens.length) return null;
  const loop = [...itens, ...itens];

  return (
    <div className="relative overflow-hidden py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-3">
        {loop.map((s, i) => (
          <div
            key={`${s.name}-${i}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface/50 px-4 py-2 text-sm backdrop-blur"
          >
            <span className="text-xl">{s.flag}</span>
            <span className="font-medium">{s.nomePt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
