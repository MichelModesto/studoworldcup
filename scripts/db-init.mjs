#!/usr/bin/env node
/**
 * Cria (se faltar) o schema do bolão no Postgres (Neon).
 * Idempotente — pode rodar quantas vezes quiser.
 *
 * Uso: npm run db:init   (lê DATABASE_URL de .env.local)
 */

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL não definida. Configure em .env.local (veja o README).");
  process.exit(1);
}

const sql = neon(url);

const DDL = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id          serial PRIMARY KEY,
    nome        text NOT NULL,
    email       text NOT NULL UNIQUE,
    senha_hash  text NOT NULL,
    criado_em   timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS grupos (
    id          serial PRIMARY KEY,
    nome        text NOT NULL,
    codigo      text NOT NULL UNIQUE,
    dono_id     int NOT NULL REFERENCES usuarios(id),
    criado_em   timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS grupo_membros (
    grupo_id    int NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    usuario_id  int NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    entrou_em   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (grupo_id, usuario_id)
  )`,
  `CREATE TABLE IF NOT EXISTS palpites (
    usuario_id      int NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    match_id        int NOT NULL,
    gols_mandante   int NOT NULL CHECK (gols_mandante BETWEEN 0 AND 20),
    gols_visitante  int NOT NULL CHECK (gols_visitante BETWEEN 0 AND 20),
    atualizado_em   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, match_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_palpites_match ON palpites (match_id)`,
  // Recuperação de senha por código (mostrado uma única vez ao usuário).
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS recuperacao_hash text`,
  // PIX copia-e-cola da entrada do bolão (configurado pelo dono do grupo).
  `ALTER TABLE grupos ADD COLUMN IF NOT EXISTS pix text`,
  // Palpites bônus: campeão (10 pts) e artilheiro da Copa (5 pts).
  `CREATE TABLE IF NOT EXISTS palpites_bonus (
    usuario_id     int PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    campeao_fifa   text,
    artilheiro     text,
    atualizado_em  timestamptz NOT NULL DEFAULT now()
  )`,
  // Inscrições de push notification (lembretes do bolão).
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint    text PRIMARY KEY,
    usuario_id  int NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    p256dh      text NOT NULL,
    auth        text NOT NULL,
    criado_em   timestamptz NOT NULL DEFAULT now()
  )`,
];

for (const stmt of DDL) await sql.query(stmt);
console.log("✅ Schema do bolão pronto (usuarios, grupos, grupo_membros, palpites).");
