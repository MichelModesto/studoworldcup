import Link from "next/link";

/**
 * Identidade "Placar Eletrônico": monograma "S" em dot-matrix âmbar
 * (pontos de letreiro de estádio) + wordmark em caixa alta.
 */
export function MarcaS({ className = "h-5 w-5" }: { className?: string }) {
  // grade 3×5 do "S": pontos acesos do painel
  const acesos: [number, number][] = [
    [0, 0], [1, 0], [2, 0],
    [0, 1],
    [0, 2], [1, 2], [2, 2],
    [2, 3],
    [0, 4], [1, 4], [2, 4],
  ];
  return (
    <svg viewBox="0 0 28 44" className={className} aria-hidden>
      {acesos.map(([c, r]) => (
        <circle key={`${c}-${r}`} cx={6 + c * 8} cy={6 + r * 8} r={2.9} fill="currentColor" />
      ))}
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-brand/35 bg-surface text-brand shadow-lg shadow-brand/10 transition group-hover:border-brand/60">
        <MarcaS className="h-5 w-auto" />
      </span>
      <span className="font-display text-lg font-extrabold uppercase tracking-tight">
        Studo<span className="text-brand">WorldCup</span>
      </span>
    </Link>
  );
}
