import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand";
import { temBanco } from "@/lib/db";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const comBanco = temBanco();
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
        </div>

        <div className="glass p-8">
          <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao StudoWorldCup</h1>
          <p className="mt-2 text-sm text-muted">
            Estatísticas da Copa 2026 + bolão com seus amigos.
          </p>

          <Suspense>
            <LoginForm permiteCadastro={comBanco} />
          </Suspense>

          {!comBanco && (
            <div className="mt-6 rounded-xl border border-border bg-surface/40 p-4 text-xs text-muted">
              <p className="font-medium text-foreground">Acesso de demonstração</p>
              <p className="mt-1">
                E-mail: <span className="text-brand">admin@studoworldcup.com</span>
              </p>
              <p>
                Senha: <span className="text-brand">copa2026</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
