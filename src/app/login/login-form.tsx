"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, KeyRound, Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { login, criarConta, esqueciSenha, type LoginState } from "@/app/actions";

const INPUT =
  "w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-foreground outline-none transition placeholder:text-muted/60 focus:border-brand/60";

type Aba = "entrar" | "criar" | "recuperar";

function SubmitButton({ aba }: { aba: Aba }) {
  const { pending } = useFormStatus();
  const rotulos: Record<Aba, [React.ReactNode, string]> = {
    entrar: [<LogIn key="i" className="h-5 w-5" />, "Entrar"],
    criar: [<UserPlus key="i" className="h-5 w-5" />, "Criar conta"],
    recuperar: [<KeyRound key="i" className="h-5 w-5" />, "Redefinir senha"],
  };
  const [icone, texto] = rotulos[aba];
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base disabled:opacity-70"
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : icone}
      {pending ? "Aguarde..." : texto}
    </button>
  );
}

/** Tela pós-cadastro/reset: exibe o código de recuperação UMA vez. */
function CodigoRecuperacao({ codigo, next }: { codigo: string; next: string }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-brand/30 bg-brand/10 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand">
          <ShieldCheck className="h-4 w-4" /> Guarde seu código de recuperação
        </p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/80">
          Se você esquecer a senha, este código é a ÚNICA forma de recuperar a conta. Anote ou
          tire um print — ele não será mostrado de novo.
        </p>
        <p className="mt-3 select-all rounded-lg bg-surface/80 px-4 py-3 text-center font-mono text-lg font-bold tracking-widest">
          {codigo}
        </p>
      </div>
      <Link
        href={next}
        className="btn-brand inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base"
      >
        Anotei, ir para o painel →
      </Link>
    </div>
  );
}

export function LoginForm({ permiteCadastro }: { permiteCadastro: boolean }) {
  const [aba, setAba] = useState<Aba>("entrar");
  const next = useSearchParams().get("next") ?? "";
  const acoes = { entrar: login, criar: criarConta, recuperar: esqueciSenha } as const;
  const [state, formAction] = useActionState<LoginState, FormData>(acoes[aba], {});

  if (state.codigoRecuperacao) {
    return <CodigoRecuperacao codigo={state.codigoRecuperacao} next={state.next ?? "/painel"} />;
  }

  return (
    <div className="mt-6">
      {permiteCadastro && aba !== "recuperar" && (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2/60 p-1 text-sm font-medium">
          {(
            [
              ["entrar", "Entrar"],
              ["criar", "Criar conta"],
            ] as const
          ).map(([k, rotulo]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={`rounded-lg px-4 py-2 transition ${
                aba === k ? "btn-brand" : "text-muted hover:text-foreground"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {aba === "recuperar" && (
        <p className="mb-4 text-sm text-muted">
          Informe seu e-mail, o <strong>código de recuperação</strong> (anotado no cadastro) e a
          nova senha.
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        {aba === "criar" && (
          <div>
            <label htmlFor="nome" className="mb-1.5 block text-sm font-medium">
              Seu nome (como aparece no ranking)
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              minLength={2}
              maxLength={40}
              autoComplete="name"
              placeholder="Ex.: Michel"
              className={INPUT}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            className={INPUT}
          />
        </div>

        {aba === "recuperar" && (
          <div>
            <label htmlFor="codigo" className="mb-1.5 block text-sm font-medium">
              Código de recuperação
            </label>
            <input
              id="codigo"
              name="codigo"
              type="text"
              required
              placeholder="XXXX-XXXX-XXXX"
              className={`${INPUT} font-mono uppercase tracking-widest`}
            />
          </div>
        )}

        <div>
          <label htmlFor="senha" className="mb-1.5 block text-sm font-medium">
            {aba === "recuperar" ? "Nova senha" : "Senha"}
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            minLength={aba === "entrar" ? undefined : 6}
            autoComplete={aba === "entrar" ? "current-password" : "new-password"}
            placeholder="••••••••"
            className={INPUT}
          />
        </div>

        {state.error && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}

        <SubmitButton aba={aba} />
      </form>

      {permiteCadastro && (
        <button
          type="button"
          onClick={() => setAba(aba === "recuperar" ? "entrar" : "recuperar")}
          className="mt-4 w-full text-center text-xs text-muted transition hover:text-foreground"
        >
          {aba === "recuperar" ? "← Voltar para o login" : "Esqueci minha senha"}
        </button>
      )}
    </div>
  );
}
