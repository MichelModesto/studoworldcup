"use client";

import { useState } from "react";

/**
 * Foto redonda do jogador com fallback para as iniciais (sem foto ou
 * erro de carregamento). As URLs vêm da TheSportsDB; o sufixo /small
 * baixa a versão ~200px (≈25 KB) em vez da original.
 */
export function PlayerAvatar({
  nome,
  foto,
  size = 28,
}: {
  nome: string;
  foto?: string;
  size?: number;
}) {
  const [erro, setErro] = useState(false);
  const style = { width: size, height: size };

  if (!foto || erro) {
    const iniciais = nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    return (
      <span
        className="grid shrink-0 select-none place-items-center rounded-full bg-surface-2 font-display text-[10px] font-semibold text-muted"
        style={style}
        aria-hidden
      >
        {iniciais}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- fotos remotas leves (~25 KB); dispensa o otimizador
    <img
      src={`${foto}/small`}
      alt={nome}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErro(true)}
      className="shrink-0 rounded-full bg-surface-2 object-cover object-top"
      style={style}
    />
  );
}
