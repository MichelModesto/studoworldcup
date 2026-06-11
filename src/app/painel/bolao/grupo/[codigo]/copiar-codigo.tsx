"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
