import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { sql, temBanco } from "./db";

/**
 * Autenticação com contas reais no Postgres (Neon) e cookie de sessão
 * assinado (HMAC). Sem DATABASE_URL, cai no modo demo de usuário único
 * para o painel continuar acessível.
 */

export const SESSION_COOKIE = "swc_session";

const SECRET = process.env.AUTH_SECRET ?? "studoworldcup-dev-secret";

export type Sessao = {
  /** id no banco; 0 = usuário demo (sem banco). */
  uid: number;
  nome: string;
  email: string;
};

// ---------- senha (scrypt) ----------

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, guardado: string): boolean {
  const [salt, hash] = guardado.split(":");
  if (!salt || !hash) return false;
  const calc = scryptSync(senha, salt, 32);
  const ref = Buffer.from(hash, "hex");
  return calc.length === ref.length && timingSafeEqual(calc, ref);
}

// ---------- sessão (cookie assinado) ----------

function assinar(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function encodeSession(s: Sessao): string {
  const payload = Buffer.from(JSON.stringify(s), "utf8").toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

export function decodeSession(raw: string): Sessao | null {
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const esperado = assinar(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Sessao;
    if (typeof s.uid !== "number" || !s.nome || !s.email) return null;
    return s;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Sessao | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
}

// ---------- contas ----------

const DEMO = { email: "admin@studoworldcup.com", nome: "Treinador(a)", senha: "copa2026" };

export type ResultadoAuth = { sessao?: Sessao; erro?: string; codigoRecuperacao?: string };

// ---------- código de recuperação de senha ----------

const ALFABETO_REC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Formato XXXX-XXXX-XXXX, fácil de anotar; guardamos só o hash. */
export function gerarCodigoRecuperacao(): string {
  const bloco = () =>
    Array.from(randomBytes(4))
      .map((b) => ALFABETO_REC[b % ALFABETO_REC.length])
      .join("");
  return `${bloco()}-${bloco()}-${bloco()}`;
}

function normalizarCodigoRec(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Gera e grava um novo código de recuperação para o usuário; retorna o código. */
export async function novoCodigoRecuperacao(uid: number): Promise<string> {
  const codigo = gerarCodigoRecuperacao();
  await sql()`
    UPDATE usuarios SET recuperacao_hash = ${hashSenha(normalizarCodigoRec(codigo))}
    WHERE id = ${uid}
  `;
  return codigo;
}

export async function temCodigoRecuperacao(uid: number): Promise<boolean> {
  const rows = (await sql()`
    SELECT recuperacao_hash FROM usuarios WHERE id = ${uid}
  `) as { recuperacao_hash: string | null }[];
  return Boolean(rows[0]?.recuperacao_hash);
}

/** Redefine a senha via e-mail + código de recuperação. Gera código novo. */
export async function redefinirSenha(
  email: string,
  codigo: string,
  novaSenha: string,
): Promise<ResultadoAuth> {
  if (!temBanco()) return { erro: "Banco de dados não configurado." };
  if (novaSenha.length < 6 || novaSenha.length > 100) {
    return { erro: "Nova senha deve ter pelo menos 6 caracteres." };
  }
  const mail = email.trim().toLowerCase();
  const rows = (await sql()`
    SELECT id, nome, email, recuperacao_hash FROM usuarios WHERE email = ${mail}
  `) as { id: number; nome: string; email: string; recuperacao_hash: string | null }[];
  const u = rows[0];
  const erroGenerico = { erro: "E-mail ou código de recuperação inválidos." };
  if (!u?.recuperacao_hash) return erroGenerico;
  if (!verificarSenha(normalizarCodigoRec(codigo), u.recuperacao_hash)) return erroGenerico;

  const novoCodigo = gerarCodigoRecuperacao();
  await sql()`
    UPDATE usuarios
    SET senha_hash = ${hashSenha(novaSenha)},
        recuperacao_hash = ${hashSenha(normalizarCodigoRec(novoCodigo))}
    WHERE id = ${u.id}
  `;
  return {
    sessao: { uid: u.id, nome: u.nome, email: u.email },
    codigoRecuperacao: novoCodigo,
  };
}

export async function autenticar(email: string, senha: string): Promise<ResultadoAuth> {
  const mail = email.trim().toLowerCase();
  if (!temBanco()) {
    if (mail === DEMO.email && senha === DEMO.senha) {
      return { sessao: { uid: 0, nome: DEMO.nome, email: DEMO.email } };
    }
    return { erro: "E-mail ou senha inválidos. Tente novamente." };
  }
  const rows = (await sql()`
    SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ${mail}
  `) as { id: number; nome: string; email: string; senha_hash: string }[];
  const u = rows[0];
  if (!u || !verificarSenha(senha, u.senha_hash)) {
    return { erro: "E-mail ou senha inválidos. Tente novamente." };
  }
  return { sessao: { uid: u.id, nome: u.nome, email: u.email } };
}

export async function registrar(
  nome: string,
  email: string,
  senha: string,
): Promise<ResultadoAuth> {
  if (!temBanco()) {
    return { erro: "Cadastro indisponível: banco de dados ainda não configurado." };
  }
  const nomeLimpo = nome.trim().replace(/\s+/g, " ");
  const mail = email.trim().toLowerCase();
  if (nomeLimpo.length < 2 || nomeLimpo.length > 40) {
    return { erro: "Nome deve ter entre 2 e 40 caracteres." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) || mail.length > 120) {
    return { erro: "E-mail inválido." };
  }
  if (senha.length < 6 || senha.length > 100) {
    return { erro: "Senha deve ter pelo menos 6 caracteres." };
  }
  try {
    const codigo = gerarCodigoRecuperacao();
    const rows = (await sql()`
      INSERT INTO usuarios (nome, email, senha_hash, recuperacao_hash)
      VALUES (${nomeLimpo}, ${mail}, ${hashSenha(senha)}, ${hashSenha(normalizarCodigoRec(codigo))})
      RETURNING id, nome, email
    `) as { id: number; nome: string; email: string }[];
    const u = rows[0];
    return {
      sessao: { uid: u.id, nome: u.nome, email: u.email },
      codigoRecuperacao: codigo,
    };
  } catch (e) {
    if (e instanceof Error && e.message.includes("usuarios_email_key")) {
      return { erro: "Este e-mail já tem conta. Faça login." };
    }
    throw e;
  }
}
