"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Pencil } from "lucide-react";
import { atualizarNome, type ContaState } from "@/app/actions";

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      Salvar
    </button>
  );
}

/**
 * Avatar do usuário no topo: clica para abrir o menu e trocar o nome
 * de exibição (vale no ranking do bolão, nos avisos e no push).
 */
export function MenuUsuario({ nome, podeEditar }: { nome: string; podeEditar: boolean }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [state, action] = useActionState<ContaState, FormData>(atualizarNome, {});

  const iniciais = nome
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // fecha ao clicar fora / Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  // nome salvo: atualiza o layout inteiro (topo, ranking...)
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(() => router.refresh(), 400);
    return () => clearTimeout(t);
  }, [state.ok, router]);

  return (
    <div ref={ref} className="relative flex items-center gap-3">
      <button
        type="button"
        onClick={() => podeEditar && setAberto((v) => !v)}
        className={`group flex items-center gap-3 ${podeEditar ? "" : "cursor-default"}`}
        title={podeEditar ? "Editar meu nome" : undefined}
        aria-expanded={aberto}
      >
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand transition group-hover:bg-brand/25">
          {iniciais}
          {podeEditar && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-background bg-surface-2 text-muted transition group-hover:text-brand">
              <Pencil className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-medium leading-tight">{nome}</span>
          <span className="block text-xs text-muted">Sessão ativa</span>
        </span>
      </button>

      {aberto && (
        <div className="glass absolute right-0 top-12 z-50 w-72 p-4 shadow-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Meu nome no ranking
          </p>
          <form action={action} className="flex items-center gap-2">
            <input
              name="nome"
              type="text"
              required
              minLength={2}
              maxLength={40}
              defaultValue={nome}
              autoFocus
              className="w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand/60"
            />
            <BotaoSalvar />
          </form>
          {state.ok && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-brand">
              <Check className="h-3.5 w-3.5" /> {state.ok}
            </p>
          )}
          {state.error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5" /> {state.error}
            </p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted/80">
            É assim que a galera te vê no ranking dos bolões — capricha. 😄
          </p>
        </div>
      )}
    </div>
  );
}
