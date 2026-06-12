"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, CheckCircle2, Copy, Loader2, Wallet } from "lucide-react";
import { salvarPixAction, type BolaoState } from "../../actions";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      Salvar PIX
    </button>
  );
}

/** Botão "copiar código PIX" com feedback. */
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

/** Form do dono: colar/atualizar/remover o PIX copia-e-cola da entrada. */
export function ConfigurarPix({ grupoId, pixAtual }: { grupoId: number; pixAtual: string | null }) {
  const [state, action] = useActionState<BolaoState, FormData>(salvarPixAction, {});
  const [aberto, setAberto] = useState(!pixAtual);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs text-muted underline-offset-2 transition hover:text-foreground hover:underline"
      >
        Editar ou remover o PIX (só o dono vê isto)
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="grupoId" value={grupoId} />
      <label htmlFor="pix" className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Wallet className="h-3.5 w-3.5" /> Cole o PIX copia-e-cola gerado pelo seu banco (deixe
        vazio para remover):
      </label>
      <textarea
        id="pix"
        name="pix"
        rows={3}
        defaultValue={pixAtual ?? ""}
        placeholder="000201..."
        className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 font-mono text-xs text-foreground outline-none transition focus:border-brand/60"
      />
      <div className="flex items-center gap-3">
        <BotaoSalvar />
        {state.ok && (
          <span className="flex items-center gap-1 text-xs text-brand">
            <CheckCircle2 className="h-3.5 w-3.5" /> {state.ok}
          </span>
        )}
        {state.error && (
          <span className="flex items-center gap-1 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5" /> {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
