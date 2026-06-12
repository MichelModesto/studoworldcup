"use client";

import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";

/** Botão "copiar código PIX" com feedback. Somente leitura — ninguém edita. */
export function CopiarPix({ pix }: { pix: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(pix).catch(() => {});
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }}
      className="btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium"
    >
      {copiado ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? "Código PIX copiado!" : "Copiar código PIX"}
    </button>
  );
}
