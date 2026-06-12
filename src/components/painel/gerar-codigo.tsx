"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import {
  gerarCodigoRecuperacaoAction,
  type BolaoState,
} from "@/app/painel/bolao/actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/20 disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
      Gerar código
    </button>
  );
}

/** Aviso para contas antigas sem código de recuperação de senha. */
export function GerarCodigoRecuperacao() {
  const [state, action] = useActionState<BolaoState, FormData>(
    gerarCodigoRecuperacaoAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="glass mb-4 border border-brand/30 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand">
          <ShieldCheck className="h-4 w-4" /> Anote seu código de recuperação (não será mostrado de
          novo):
        </p>
        <p className="mt-2 select-all rounded-lg bg-surface/80 px-4 py-2.5 text-center font-mono text-base font-bold tracking-widest">
          {state.ok}
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="glass mb-4 flex flex-wrap items-center justify-between gap-3 border border-gold/25 p-4"
    >
      <p className="text-sm text-foreground/90">
        🔐 Sua conta ainda <strong>não tem código de recuperação</strong> — sem ele, não dá para
        redefinir a senha se você esquecer.
      </p>
      <Botao />
      {state.error && <p className="w-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}
