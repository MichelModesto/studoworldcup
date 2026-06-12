"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";

export function CopiarCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(codigo).catch(() => {});
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-4 py-2 font-mono text-lg font-semibold tracking-[0.3em] transition hover:border-brand/60"
      title="Copiar código de convite"
    >
      {codigo}
      {copiado ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4 text-muted" />}
    </button>
  );
}

/** Copia (ou compartilha, no celular) o link de convite direto do grupo. */
export function CompartilharConvite({ codigo, nomeGrupo }: { codigo: string; nomeGrupo: string }) {
  const [copiado, setCopiado] = useState(false);
  const compartilhar = async () => {
    const url = `${window.location.origin}/bolao/${codigo}`;
    const texto = `⚽ Entra no meu bolão da Copa 2026 — "${nomeGrupo}"! Palpita comigo: ${url}`;
    if (navigator.share) {
      await navigator.share({ title: "Bolão da Copa 2026", text: texto, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={compartilhar}
      className="btn-brand inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
      title="Compartilhar link de convite"
    >
      {copiado ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copiado ? "Link copiado!" : "Convidar pelo link"}
      {!copiado && <Link2 className="hidden h-3.5 w-3.5 sm:block" />}
    </button>
  );
}
