"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  autenticar,
  encodeSession,
  redefinirSenha,
  registrar,
  type Sessao,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export type LoginState = {
  error?: string;
  /** Código de recuperação para exibir UMA vez (cadastro/reset concluídos). */
  codigoRecuperacao?: string;
  /** Para onde seguir após o usuário anotar o código. */
  next?: string;
};

function destinoSeguro(next?: string): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/painel";
}

async function abrirSessao(sessao: Sessao) {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(sessao), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const limite = await rateLimit("login", 10, 10);
  if (limite) return { error: limite };

  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const next = String(formData.get("next") ?? "");

  const r = await autenticar(email, senha);
  if (!r.sessao) return { error: r.erro };
  await abrirSessao(r.sessao);
  redirect(destinoSeguro(next));
}

export async function criarConta(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const limite = await rateLimit("cadastro", 6, 60);
  if (limite) return { error: limite };

  const nome = String(formData.get("nome") ?? "");
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const next = String(formData.get("next") ?? "");

  const r = await registrar(nome, email, senha);
  if (!r.sessao) return { error: r.erro };
  await abrirSessao(r.sessao);
  // não redireciona ainda: mostra o código de recuperação uma única vez
  return { codigoRecuperacao: r.codigoRecuperacao, next: destinoSeguro(next) };
}

export async function esqueciSenha(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const limite = await rateLimit("reset", 6, 60);
  if (limite) return { error: limite };

  const email = String(formData.get("email") ?? "");
  const codigo = String(formData.get("codigo") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const next = String(formData.get("next") ?? "");

  const r = await redefinirSenha(email, codigo, senha);
  if (!r.sessao) return { error: r.erro };
  await abrirSessao(r.sessao);
  // senha trocada gera código NOVO — mostra para anotar
  return { codigoRecuperacao: r.codigoRecuperacao, next: destinoSeguro(next) };
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export type ContaState = { error?: string; ok?: string };

/** Muda o nome de exibição (ranking, topo, push). Reemite o cookie de sessão. */
export async function atualizarNome(_prev: ContaState, formData: FormData): Promise<ContaState> {
  const { getSession } = await import("@/lib/auth");
  const { sql, temBanco } = await import("@/lib/db");
  const { revalidatePath } = await import("next/cache");

  const sessao = await getSession();
  if (!sessao || sessao.uid <= 0 || !temBanco()) {
    return { error: "Disponível apenas para contas reais." };
  }
  const nome = String(formData.get("nome") ?? "").trim().replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 40) {
    return { error: "Nome deve ter entre 2 e 40 caracteres." };
  }

  await sql()`UPDATE usuarios SET nome = ${nome} WHERE id = ${sessao.uid}`;
  await abrirSessao({ ...sessao, nome });
  revalidatePath("/painel", "layout");
  return { ok: "Nome atualizado! 👊" };
}
