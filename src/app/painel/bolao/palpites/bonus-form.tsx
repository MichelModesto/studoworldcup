"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Trophy } from "lucide-react";
import { salvarBonusAction, type BolaoState } from "../actions";

const INPUT =
  "w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-brand/60";

export type TimeOpcao = { fifa: string; nomePt: string; flag: string };
export type JogadorOpcao = { nome: string; fifa: string };

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
      Salvar bônus
    </button>
  );
}

export function BonusForm({
  times,
  jogadores,
  campeaoAtual,
  artilheiroAtual,
}: {
  times: TimeOpcao[];
  jogadores: JogadorOpcao[];
  campeaoAtual: string | null;
  artilheiroAtual: string | null;
}) {
  const [state, action] = useActionState<BolaoState, FormData>(salvarBonusAction, {});
  const campeaoTravado = Boolean(campeaoAtual);
  const artilheiroTravado = Boolean(artilheiroAtual);
  const nomeCampeao = times.find((t) => t.fifa === campeaoAtual);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="campeao" className="mb-1.5 block text-xs font-medium text-muted">
          🏆 Campeã da Copa (+10 pts){campeaoTravado && " · definitivo 🔒"}
        </label>
        {campeaoTravado ? (
          <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm font-medium">
            {nomeCampeao ? `${nomeCampeao.flag} ${nomeCampeao.nomePt}` : campeaoAtual}
          </p>
        ) : (
          <select id="campeao" name="campeao" defaultValue="" className={INPUT}>
            <option value="">— escolher seleção —</option>
            {times.map((t) => (
              <option key={t.fifa} value={t.fifa}>
                {t.flag} {t.nomePt}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label htmlFor="artilheiro" className="mb-1.5 block text-xs font-medium text-muted">
          👟 Artilheiro da Copa (+5 pts){artilheiroTravado && " · definitivo 🔒"}
        </label>
        {artilheiroTravado ? (
          <p className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-2.5 text-sm font-medium">
            {artilheiroAtual}
          </p>
        ) : (
          <>
            <input
              id="artilheiro"
              name="artilheiro"
              type="text"
              list="lista-convocados"
              placeholder="Comece a digitar o nome..."
              maxLength={60}
              className={INPUT}
            />
            <datalist id="lista-convocados">
              {jogadores.map((j, i) => (
                <option key={`${j.fifa}-${i}`} value={j.nome}>
                  {j.fifa}
                </option>
              ))}
            </datalist>
          </>
        )}
      </div>
      {!(campeaoTravado && artilheiroTravado) && <Botao />}
      {state.ok && (
        <p className="flex items-center gap-1.5 text-sm text-brand sm:col-span-3">
          <CheckCircle2 className="h-4 w-4" /> {state.ok}
        </p>
      )}
      {state.error && (
        <p className="flex items-center gap-1.5 text-sm text-danger sm:col-span-3">
          <AlertCircle className="h-4 w-4" /> {state.error}
        </p>
      )}
    </form>
  );
}
