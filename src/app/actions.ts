"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, autenticar, encodeSession, registrar, type Sessao } from "@/lib/auth";

export type LoginState = { error?: string };

async function abrirSessao(sessao: Sessao, next?: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(sessao), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  // só permite redirecionamentos internos
  redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/painel");
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const next = String(formData.get("next") ?? "");

  const r = await autenticar(email, senha);
  if (!r.sessao) return { error: r.erro };
  await abrirSessao(r.sessao, next);
  return {};
}

export async function criarConta(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const nome = String(formData.get("nome") ?? "");
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const next = String(formData.get("next") ?? "");

  const r = await registrar(nome, email, senha);
  if (!r.sessao) return { error: r.erro };
  await abrirSessao(r.sessao, next);
  return {};
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
