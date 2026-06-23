import type { FormaJogo } from "@/lib/bolao";

const ESTILO: Record<number, { cor: string; rotulo: string }> = {
  3: { cor: "bg-emerald-400", rotulo: "placar exato" },
  1: { cor: "bg-amber-400", rotulo: "acertou o resultado" },
  0: { cor: "bg-foreground/15", rotulo: "errou" },
};

/** Forma recente: bolinhas dos últimos jogos (mais antigo → mais recente). */
export function Forma({ jogos, tamanho = "sm" }: { jogos: FormaJogo[]; tamanho?: "sm" | "md" }) {
  if (!jogos.length) return null;
  const dim = tamanho === "md" ? "h-2 w-2" : "h-1.5 w-1.5";
  const resumo = jogos.map((j) => (ESTILO[j.pts] ?? ESTILO[0]).rotulo).join(", ");
  return (
    <span
      className="ml-0.5 inline-flex items-center gap-1 align-middle"
      title={`Últimos ${jogos.length} jogos: ${resumo}`}
      aria-label={`Forma nos últimos ${jogos.length} jogos: ${resumo}`}
    >
      {jogos.map((j, i) => {
        const e = ESTILO[j.pts] ?? ESTILO[0];
        return <span key={i} className={`${dim} rounded-full ${e.cor}`} title={j.adversarios} />;
      })}
    </span>
  );
}
