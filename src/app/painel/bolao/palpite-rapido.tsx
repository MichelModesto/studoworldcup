"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Zap } from "lucide-react";
import { salvarPalpitesAction, type BolaoState } from "./actions";

const INPUT_GOL =
  "h-11 w-14 rounded-xl border border-border bg-surface/60 text-center font-display text-lg font-semibold outline-none transition focus:border-brand/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
      Salvar
    </button>
  );
}

/** Palpite rápido do jogo do dia, direto na home do bolão. */
export function PalpiteRapido({
  matchId,
  gm,
  gv,
}: {
  matchId: number;
  gm: string;
  gv: string;
}) {
  const [state, action] = useActionState<BolaoState, FormData>(salvarPalpitesAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name={`m-${matchId}`}
        type="number"
        min={0}
        max={20}
        inputMode="numeric"
        defaultValue={gm}
        placeholder="–"
        aria-label="Gols do mandante"
        className={INPUT_GOL}
      />
      <span className="text-muted">×</span>
      <input
        name={`v-${matchId}`}
        type="number"
        min={0}
        max={20}
        inputMode="numeric"
        defaultValue={gv}
        placeholder="–"
        aria-label="Gols do visitante"
        className={INPUT_GOL}
      />
      <Botao />
      {state.ok && (
        <span className="flex items-center gap-1 text-xs text-brand">
          <CheckCircle2 className="h-3.5 w-3.5" /> Salvo!
        </span>
      )}
      {state.error && (
        <span className="flex items-center gap-1 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" /> {state.error}
        </span>
      )}
    </form>
  );
}
