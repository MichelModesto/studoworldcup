/** Loading do painel: o "S" do letreiro acendendo ponto a ponto. */
const PONTOS: [number, number][] = [
  [0, 0], [1, 0], [2, 0],
  [0, 1],
  [0, 2], [1, 2], [2, 2],
  [2, 3],
  [0, 4], [1, 4], [2, 4],
];

export default function PainelLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <svg viewBox="0 0 28 44" className="mx-auto h-16 w-auto text-brand" aria-hidden>
          {PONTOS.map(([c, r], i) => (
            <circle
              key={`${c}-${r}`}
              cx={6 + c * 8}
              cy={6 + r * 8}
              r={2.9}
              fill="currentColor"
              className="dot-acende"
              style={{ animationDelay: `${i * 0.09}s` }}
            />
          ))}
        </svg>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-muted">
          Acendendo o telão...
        </p>
      </div>
    </div>
  );
}
