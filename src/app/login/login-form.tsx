"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { login, type LoginState } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> Entrando...
        </>
      ) : (
        <>
          <LogIn className="h-5 w-5" /> Entrar
        </>
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
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
          defaultValue="admin@studoworldcup.com"
          placeholder="voce@email.com"
          className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-foreground outline-none transition placeholder:text-muted/60 focus:border-brand/60"
        />
      </div>

      <div>
        <label htmlFor="senha" className="mb-1.5 block text-sm font-medium">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-foreground outline-none transition placeholder:text-muted/60 focus:border-brand/60"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
