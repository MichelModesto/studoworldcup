"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, LogIn, UserPlus } from "lucide-react";
import { login, criarConta, type LoginState } from "@/app/actions";

const INPUT =
  "w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-foreground outline-none transition placeholder:text-muted/60 focus:border-brand/60";

function SubmitButton({ criar }: { criar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-brand mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> {criar ? "Criando conta..." : "Entrando..."}
        </>
      ) : criar ? (
        <>
          <UserPlus className="h-5 w-5" /> Criar conta
        </>
      ) : (
        <>
          <LogIn className="h-5 w-5" /> Entrar
        </>
      )}
    </button>
  );
}

export function LoginForm({ permiteCadastro }: { permiteCadastro: boolean }) {
  const [aba, setAba] = useState<"entrar" | "criar">("entrar");
  const next = useSearchParams().get("next") ?? "";
  const [state, formAction] = useActionState<LoginState, FormData>(
    aba === "criar" ? criarConta : login,
    {},
  );
  const criar = aba === "criar";

  return (
    <div className="mt-6">
      {permiteCadastro && (
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

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        {criar && (
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

        <div>
          <label htmlFor="senha" className="mb-1.5 block text-sm font-medium">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            minLength={criar ? 6 : undefined}
            autoComplete={criar ? "new-password" : "current-password"}
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

        <SubmitButton criar={criar} />
      </form>
    </div>
  );
}
