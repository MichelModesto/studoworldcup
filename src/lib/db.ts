import { neon } from "@neondatabase/serverless";

/**
 * Conexão com o Postgres (Neon, plano gratuito).
 * Schema criado por `npm run db:init` (scripts/db-init.mjs).
 *
 * Sem DATABASE_URL o app continua funcionando em modo demo:
 * o painel abre com o usuário de demonstração e as telas do
 * bolão mostram as instruções de configuração.
 */

export function temBanco(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

let cliente: ReturnType<typeof neon> | null = null;

export function sql(): ReturnType<typeof neon> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada — veja o README (seção Bolão).");
  }
  cliente ??= neon(process.env.DATABASE_URL);
  return cliente;
}
