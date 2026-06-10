#!/usr/bin/env node
/**
 * Busca os elencos oficiais convocados para a Copa 2026 via ESPN (gratuita).
 * Fonte: site.api.espn.com — roster da liga fifa.world (26 jogadores por seleção).
 *
 * Saída: data/squads/<FIFA>.json
 *
 * Uso:
 *   node scripts/fetch-squads.mjs               # todas as seleções
 *   node scripts/fetch-squads.mjs --teams=BRA   # uma ou mais (vírgula)
 *   node scripts/fetch-squads.mjs --force       # refaz mesmo se já existir
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const FORCE = Boolean(args.force);
const FILTER = args.teams ? String(args.teams).toUpperCase().split(",") : null;
const DELAY = Number(args.delay ?? 400);

const ROOT = process.cwd();
const DIR_SQUADS = path.join(ROOT, "data", "squads");
const DIR_CACHE = path.join(ROOT, "data", ".cache");
const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const ESPN_NAME = {
  KOR: "South Korea", USA: "United States", CIV: "Ivory Coast", IRN: "Iran",
  CZE: "Czech Republic", COD: "DR Congo", CPV: "Cape Verde Islands",
  BIH: "Bosnia and Herzegovina", NED: "Netherlands",
};

const POSICAO_PT = {
  Goalkeeper: "Goleiro",
  Defender: "Defensor",
  Midfielder: "Meio-campista",
  Forward: "Atacante",
  Attacker: "Atacante",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readJSON(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function normNomeTime(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  await mkdir(DIR_SQUADS, { recursive: true });

  console.log("⬇️  Lista de seleções (openfootball) + índice ESPN (cache da ingestão)...");
  const teamsResp = await fetch(
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.teams.json",
  );
  let teams = (await teamsResp.json()).map((t) => ({
    name: t.name,
    name_normalised: t.name_normalised,
    fifa: t.fifa_code,
  }));
  if (FILTER) teams = teams.filter((t) => FILTER.includes(t.fifa));

  const index = await readJSON(path.join(DIR_CACHE, "espn-team-index.json"), null);
  if (!index) {
    console.error("❌ Rode antes: npm run ingest:espn (gera o índice de ids da ESPN).");
    process.exit(1);
  }

  let ok = 0;
  for (const team of teams) {
    const out = path.join(DIR_SQUADS, `${team.fifa}.json`);
    if (!FORCE && (await readJSON(out, null))) {
      console.log(`↩︎  ${team.fifa} já existe. Pulando.`);
      ok++;
      continue;
    }
    const candidatos = [ESPN_NAME[team.fifa], team.name, team.name_normalised]
      .filter(Boolean)
      .map(normNomeTime);
    const hit = candidatos.map((c) => index[c]).find(Boolean) ?? index[`abbrev:${team.fifa}`];
    if (!hit) {
      console.warn(`  ✗ ${team.fifa}: id ESPN não resolvido.`);
      continue;
    }
    await sleep(DELAY);
    const res = await fetch(`${SITE}/fifa.world/teams/${hit.id}/roster`, {
      headers: { "user-agent": "Mozilla/5.0" },
    });
    const d = await res.json().catch(() => ({}));
    const atletas = d?.athletes ?? [];
    if (!atletas.length) {
      console.warn(`  ✗ ${team.fifa}: roster vazio na ESPN.`);
      continue;
    }
    // o campo "coach" da ESPN é histórico (técnicos antigos) — não usar.
    const limpaNome = (s) => String(s ?? "").replace(/\s*\bnull\b/gi, "").trim();
    const squad = {
      fifa: team.fifa,
      team: team.name,
      espnTeamId: Number(hit.id),
      copa: 2026,
      atualizadoEm: new Date().toISOString(),
      jogadores: atletas.map((a) => ({
        nome: limpaNome(a.displayName || a.fullName),
        posicao: POSICAO_PT[a.position?.displayName] ?? a.position?.displayName ?? "—",
        numero: a.jersey ? Number(a.jersey) : undefined,
        idade: a.age ?? undefined,
      })),
      fontes: ["ESPN"],
    };
    await writeFile(out, JSON.stringify(squad, null, 2));
    ok++;
    console.log(`  ✅ ${team.fifa}: ${squad.jogadores.length} convocados`);
  }
  console.log(`\n🏁 ${ok}/${teams.length} elencos salvos em data/squads/.`);
}

main();
