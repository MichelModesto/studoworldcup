"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { salvarPalpitesAction, type BolaoState } from "../actions";

export type JogoAberto = {
  id: number;
  rotuloData: string; // "Qui, 11 de jun"
  hora: string | null; // "13:00" (horário de Brasília) ou null
  fase: string;
  grupo?: string;
  mandante: string;
  flagMandante: string;
  visitante: string;
  flagVisitante: string;
  gm: string; // palpite atual ("" se não palpitou)
  gv: string;
};

const INPUT_GOL =
  "h-11 w-14 rounded-xl border border-border bg-surface/60 text-center font-display text-lg font-semibold outline-none transition focus:border-brand/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" /> Salvar palpites
        </>
      )}
    </button>
  );
}

export function PalpitesForm({ jogos }: { jogos: JogoAberto[] }) {
  const [state, action] = useActionState<BolaoState, FormData>(salvarPalpitesAction, {});

  return (
    <form action={action}>
      <div className="sticky top-0 z-10 -mx-1 mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-background/85 px-1 py-3 backdrop-blur">
        <BotaoSalvar />
        {state.ok && (
          <p className="flex items-center gap-1.5 text-sm text-brand">
            <CheckCircle2 className="h-4 w-4" /> {state.ok}
          </p>
        )}
        {state.error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4" /> {state.error}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {jogos.map((j, i) => {
          const novaData = i === 0 || jogos[i - 1].rotuloData !== j.rotuloData;
          return (
            <div key={j.id}>
              {novaData && (
                <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted first:mt-0">
                  {j.rotuloData}
                </h3>
              )}
              <div className="glass flex items-center gap-3 p-3.5">
                <div className="hidden w-28 shrink-0 text-xs text-muted sm:block">
                  {j.hora && <p className="font-medium text-foreground/80">{j.hora}</p>}
                  <p className="truncate">{j.grupo ? `Grupo ${j.grupo}` : j.fase}</p>
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm">
                  <span className="truncate text-right font-medium">{j.mandante}</span>
                  <span className="text-2xl">{j.flagMandante}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    name={`m-${j.id}`}
                    type="number"
                    min={0}
                    max={20}
                    inputMode="numeric"
                    defaultValue={j.gm}
                    placeholder="–"
                    aria-label={`Gols de ${j.mandante}`}
                    className={INPUT_GOL}
                  />
                  <span className="text-muted">×</span>
                  <input
                    name={`v-${j.id}`}
                    type="number"
                    min={0}
                    max={20}
                    inputMode="numeric"
                    defaultValue={j.gv}
                    placeholder="–"
                    aria-label={`Gols de ${j.visitante}`}
                    className={INPUT_GOL}
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <span className="text-2xl">{j.flagVisitante}</span>
                  <span className="truncate font-medium">{j.visitante}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {jogos.length > 6 && (
        <div className="mt-6">
          <BotaoSalvar />
        </div>
      )}
    </form>
  );
}
