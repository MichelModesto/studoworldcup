import { cookies } from "next/headers";

/**
 * Autenticação simples por cookie para o escopo inicial.
 * Em iterações futuras isto será trocado por um provider real
 * (NextAuth / Clerk / banco de dados).
 */

export const SESSION_COOKIE = "swc_session";

export type Usuario = {
  email: string;
  nome: string;
  senha: string; // demo apenas — não usar em produção
};

// Usuário demo para acesso ao painel.
const USUARIOS: Usuario[] = [
  { email: "admin@studoworldcup.com", nome: "Treinador(a)", senha: "copa2026" },
];

export function validarCredenciais(email: string, senha: string): Usuario | null {
  const u = USUARIOS.find(
    (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.senha === senha,
  );
  return u ?? null;
}

export type Sessao = { email: string; nome: string };

export async function getSession(): Promise<Sessao | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Sessao;
  } catch {
    return null;
  }
}

export function encodeSession(s: Sessao): string {
  return Buffer.from(JSON.stringify(s), "utf8").toString("base64");
}
