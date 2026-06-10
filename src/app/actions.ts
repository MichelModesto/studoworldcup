"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  encodeSession,
  validarCredenciais,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const usuario = validarCredenciais(email, senha);
  if (!usuario) {
    return { error: "E-mail ou senha inválidos. Tente novamente." };
  }

  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    encodeSession({ email: usuario.email, nome: usuario.nome }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    },
  );

  redirect("/painel");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
