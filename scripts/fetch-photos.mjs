#!/usr/bin/env node
/**
 * Enriquece os elencos de data/squads/<FIFA>.json com a foto de cada jogador.
 * Fonte: TheSportsDB (gratuita, chave pública "123") — busca por nome e
 * desambigua por nacionalidade, ano de nascimento e posição.
 *
 * Grava em cada jogador o campo `foto` (URL; a UI usa `${foto}/small`).
 * Cache em data/.cache/tsdb-fotos.json — re-execuções só consultam o que falta.
 *
 * Uso:
 *   node scripts/fetch-photos.mjs                 # todos os elencos
 *   node scripts/fetch-photos.mjs --teams=BRA,ARG # uma ou mais seleções
 *   node scripts/fetch-photos.mjs --force         # ignora cache e fotos já gravadas
 *   node scripts/fetch-photos.mjs --delay=1100    # intervalo entre buscas (ms)
 */

import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const FORCE = Boolean(args.force);
const FILTER = args.teams ? String(args.teams).toUpperCase().split(",") : null;
const DELAY = Number(args.delay ?? 1100);

const ROOT = process.cwd();
const DIR_SQUADS = path.join(ROOT, "data", "squads");
const DIR_CACHE = path.join(ROOT, "data", ".cache");
const CACHE_FILE = path.join(DIR_CACHE, "tsdb-fotos.json");
const API = "https://www.thesportsdb.com/api/v1/json/123";

// Nome do país nos squads (openfootball) -> nacionalidade na TheSportsDB.
const NACIONALIDADE = {
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  USA: "United States",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Mapeia a posição da TheSportsDB para os 4 grupos usados nos squads. */
function grupoPosicao(p) {
  const s = norm(p);
  if (!s) return null;
  if (s.includes("keeper")) return "Goleiro";
  if (s.includes("back") || s.includes("defen")) return "Defensor";
  if (s.includes("midfield")) return "Meio-campista";
  if (s.includes("wing") || s.includes("forward") || s.includes("striker") || s.includes("attack"))
    return "Atacante";
  return null;
}

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

let chamadas = 0;
/** Busca por nome. Retorna a lista de candidatos, ou null se a API falhou
 *  (429/erro de rede) — caso em que o resultado NÃO deve ser cacheado. */
async function buscar(nome) {
  for (let tent = 0; tent < 4; tent++) {
    await sleep(tent === 0 ? DELAY : 8000 * tent);
    chamadas++;
    const res = await fetch(`${API}/searchplayers.php?p=${encodeURIComponent(nome)}`, {
      headers: { "user-agent": "Mozilla/5.0" },
    }).catch(() => null);
    if (!res || res.status === 429) continue; // backoff e tenta de novo
    if (!res.ok) return null;
    const d = await res.json().catch(() => null);
    if (!d) continue; // 200 com corpo inválido = rate limit disfarçado
    return d.player ?? [];
  }
  return null;
}

/**
 * Escolhe o candidato certo entre os resultados da busca.
 * Nacionalidade divergente ou idade incompatível eliminam; aceita quando a
 * nacionalidade confirma ou quando a busca foi inequívoca (1 resultado).
 */
function escolher(jogador, candidatos, nacionalidade) {
  const alvo = norm(nacionalidade);
  let melhor = null;
  let melhorPts = -1;
  for (const c of candidatos) {
    const foto = c.strThumb || c.strCutout;
    if (!foto) continue;
    const nac = norm(c.strNationality);
    const nacOk = Boolean(nac) && (nac === alvo || nac.includes(alvo) || alvo.includes(nac));
    if (nac && !nacOk) continue;
    let idadeOk = null;
    if (jogador.idade && c.dateBorn) {
      const idadeAprox = 2026 - Number(c.dateBorn.slice(0, 4));
      idadeOk = Math.abs(idadeAprox - jogador.idade) <= 2;
      if (!idadeOk) continue;
    }
    let pts = 0;
    if (nacOk) pts += 4;
    if (idadeOk) pts += 2;
    if (grupoPosicao(c.strPosition) === jogador.posicao) pts += 1;
    if (pts > melhorPts) {
      melhor = { foto, id: c.idPlayer, pts };
      melhorPts = pts;
    }
  }
  if (!melhor) return null;
  if (melhor.pts >= 4) return melhor;
  return candidatos.length === 1 ? melhor : null;
}

/** Variações de busca: nome completo e, se houver 3+ tokens, primeiro+último. */
function variantes(nome) {
  const v = [nome];
  const tokens = nome.split(/\s+/).filter(Boolean);
  if (tokens.length >= 3) v.push(`${tokens[0]} ${tokens[tokens.length - 1]}`);
  return v;
}

async function main() {
  await mkdir(DIR_CACHE, { recursive: true });
  const cache = FORCE ? {} : await readJSON(CACHE_FILE, {});

  let files = (await readdir(DIR_SQUADS)).filter((f) => f.endsWith(".json")).sort();
  if (FILTER) files = files.filter((f) => FILTER.includes(f.replace(".json", "")));

  let totalCom = 0;
  let totalSem = 0;
  for (const file of files) {
    const squadPath = path.join(DIR_SQUADS, file);
    const squad = await readJSON(squadPath, null);
    if (!squad) continue;
    const nacionalidade = NACIONALIDADE[squad.team] ?? squad.team;

    let com = 0;
    let mudou = false;
    for (const j of squad.jogadores) {
      if (j.foto && !FORCE) {
        com++;
        continue;
      }
      const key = `${squad.fifa}:${norm(j.nome)}`;
      let hit = cache[key];
      if (hit === undefined) {
        hit = null;
        let falhou = false;
        for (const termo of variantes(j.nome)) {
          const candidatos = await buscar(termo);
          if (candidatos === null) {
            falhou = true; // API indisponível: não cachear como "sem foto"
            continue;
          }
          hit = escolher(j, candidatos, nacionalidade);
          if (hit) break;
        }
        if (hit || !falhou) {
          cache[key] = hit;
          await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
        }
      }
      if (hit?.foto) {
        j.foto = hit.foto;
        com++;
        mudou = true;
      }
    }

    if (mudou) {
      if (!squad.fontes.includes("TheSportsDB")) squad.fontes.push("TheSportsDB");
      await writeFile(squadPath, JSON.stringify(squad, null, 2));
    }
    totalCom += com;
    totalSem += squad.jogadores.length - com;
    console.log(`  ${com === squad.jogadores.length ? "✅" : "◐"} ${squad.fifa}: ${com}/${squad.jogadores.length} fotos`);
  }
  console.log(`\n🏁 ${totalCom} jogadores com foto, ${totalSem} sem (${chamadas} chamadas à API).`);
}

main();
