"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, LogIn, PlusCircle } from "lucide-react";
import { criarGrupoAction, entrarGrupoAction, type BolaoState } from "./actions";

const INPUT =
  "w-full rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-foreground outline-none transition placeholder:text-muted/60 focus:border-brand/60";

function Botao({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

function Erro({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {msg}
    </p>
  );
}

export function CriarGrupoForm() {
  const [state, action] = useActionState<BolaoState, FormData>(criarGrupoAction, {});
  return (
    <form action={action} className="space-y-3">
      <input
        name="nome"
        type="text"
        required
        minLength={2}
        maxLength={40}
        placeholder="Nome do grupo — ex.: Família Modesto"
        className={INPUT}
      />
      <Erro msg={state.error} />
      <Botao>
        <PlusCircle className="h-4 w-4" /> Criar grupo
      </Botao>
    </form>
  );
}

export function EntrarGrupoForm() {
  const [state, action] = useActionState<BolaoState, FormData>(entrarGrupoAction, {});
  return (
    <form action={action} className="space-y-3">
      <input
        name="codigo"
        type="text"
        required
        minLength={6}
        maxLength={8}
        placeholder="Código do grupo — ex.: K7M2QX"
        autoCapitalize="characters"
        className={`${INPUT} font-mono uppercase tracking-widest`}
      />
      <Erro msg={state.error} />
      <Botao>
        <LogIn className="h-4 w-4" /> Entrar no grupo
      </Botao>
    </form>
  );
}
