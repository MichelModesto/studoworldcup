"use client";

import { useEffect, useRef, useState } from "react";

/** Tag "AO VIVO" padronizada (ponto pulsando + texto). */
export function TagAoVivo({ texto = "Ao vivo" }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
      {texto}
    </span>
  );
}

/**
 * Dígito de placar com efeito flip (vira como painel de aeroporto)
 * sempre que o valor muda.
 */
export function DigitoPlacar({
  valor,
  className = "",
}: {
  valor: number | string;
  className?: string;
}) {
  const [animando, setAnimando] = useState(false);
  const anterior = useRef(valor);
  useEffect(() => {
    if (anterior.current !== valor) {
      anterior.current = valor;
      setAnimando(true);
      const t = setTimeout(() => setAnimando(false), 500);
      return () => clearTimeout(t);
    }
  }, [valor]);
  return (
    <span
      className={`inline-block tabular-nums ${animando ? "animate-flip-placar" : ""} ${className}`}
    >
      {valor}
    </span>
  );
}

/** Chuva de confetes âmbar (CSS puro) — disparar ao salvar palpites. */
export function Confete({ disparo }: { disparo: number }) {
  if (!disparo) return null;
  const cores = ["#ffb300", "#ffce4f", "#ffe9b3", "#4e8ec9"];
  return (
    <div key={disparo} className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => {
        const esq = (i * 37) % 100;
        const atraso = ((i * 13) % 10) / 20;
        const dur = 1.6 + ((i * 7) % 10) / 10;
        const tam = 6 + ((i * 11) % 8);
        return (
          <span
            key={i}
            className="animate-confete absolute block rounded-[2px]"
            style={{
              left: `${esq}%`,
              width: tam,
              height: tam * 0.6,
              background: cores[i % cores.length],
              animationDelay: `${atraso}s`,
              animationDuration: `${dur}s`,
            }}
          />
        );
      })}
    </div>
  );
}
