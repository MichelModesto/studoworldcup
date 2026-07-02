/**
 * Garante pontuação correta em jogos com prorrogação e pênaltis.
 * Uso: node scripts/verify-pontuacao.mjs
 */

const INICIO_NOVA_PONTUACAO = "2026-07-01";

function minutoBase(minuto) {
  const m = /^(\d+)/.exec(String(minuto ?? ""));
  return m ? Number(m[1]) : 0;
}

function golsAposNoventa(m) {
  let mandante = 0;
  let visitante = 0;
  for (const g of m.gols) {
    if (minutoBase(g.minuto) <= 90) continue;
    if (g.selecao === m.mandante) mandante++;
    else if (g.selecao === m.visitante) visitante++;
  }
  return { mandante, visitante };
}

function placarPorGols(m) {
  if (!m.gols.length || m.placarMandante === undefined || m.placarVisitante === undefined) {
    return null;
  }
  let mandante = 0;
  let visitante = 0;
  let etMandante = 0;
  let etVisitante = 0;
  for (const g of m.gols) {
    if (minutoBase(g.minuto) > 90) {
      if (g.selecao === m.mandante) etMandante++;
      else if (g.selecao === m.visitante) etVisitante++;
      continue;
    }
    if (g.selecao === m.mandante) mandante++;
    else if (g.selecao === m.visitante) visitante++;
  }
  const totalM = m.placarMandante;
  const totalV = m.placarVisitante;
  const bateTotal = mandante === totalM && visitante === totalV;
  const bateComEt = mandante + etMandante === totalM && visitante + etVisitante === totalV;
  if (!bateTotal && !bateComEt) return null;
  return { mandante, visitante };
}

function usaNovaPontuacao(m) {
  return m.dataISO >= INICIO_NOVA_PONTUACAO;
}

function ehMataMata(m) {
  return m.fase !== "Fase de Grupos";
}

function placarValido(m) {
  if (m.placarMandante === undefined || m.placarVisitante === undefined) return null;
  if (!usaNovaPontuacao(m)) {
    return { mandante: m.placarMandante, visitante: m.placarVisitante };
  }
  if (m.placarDos90) {
    return { mandante: m.placarMandante, visitante: m.placarVisitante };
  }
  const porGols = placarPorGols(m);
  if (porGols) return porGols;
  const extra = golsAposNoventa(m);
  return {
    mandante: Math.max(0, m.placarMandante - extra.mandante),
    visitante: Math.max(0, m.placarVisitante - extra.visitante),
  };
}

function comparar(p, mandante, visitante) {
  if (p.golsMandante === mandante && p.golsVisitante === visitante) return 3;
  return Math.sign(p.golsMandante - p.golsVisitante) === Math.sign(mandante - visitante) ? 1 : 0;
}

function bonusVencedor(p, m, placar) {
  if (!usaNovaPontuacao(m)) return 0;
  if (!ehMataMata(m)) return 0;
  if (p.golsMandante !== p.golsVisitante) return 0;
  if (placar.mandante !== placar.visitante) return 0;
  if (!p.vencedorFifa || !m.vencedorFifa) return 0;
  return p.vencedorFifa === m.vencedorFifa ? 1 : 0;
}

function detalhePalpite(p, m) {
  const placar = placarValido(m);
  if (!placar) return null;
  const base = comparar(p, placar.mandante, placar.visitante);
  const bonus = bonusVencedor(p, m, placar);
  return { base, bonus, total: base + bonus, placar };
}

function assertPlacar(nome, m, esperado) {
  const p = placarValido(m);
  const ok = p?.mandante === esperado[0] && p?.visitante === esperado[1];
  console.log(`${ok ? "✓" : "✗"} ${nome}: ${p?.mandante}×${p?.visitante} (esperado ${esperado[0]}×${esperado[1]})`);
  return ok;
}

function assertPontos(nome, p, m, esperado) {
  const d = detalhePalpite(p, m);
  const ok = d?.total === esperado;
  console.log(`${ok ? "✓" : "✗"} ${nome}: ${d?.total} pts (esperado ${esperado})`);
  return ok;
}

let ok = true;

// 1) openfootball score.ft + gol de prorrogação (Bélgica × Senegal)
ok &= assertPlacar(
  "openfootball ft + ET",
  {
    dataISO: "2026-07-01",
    fase: "16-avos de final",
    mandante: "Bélgica",
    visitante: "Senegal",
    placarMandante: 2,
    placarVisitante: 2,
    placarDos90: true,
    gols: [
      { selecao: "Bélgica", minuto: "86" },
      { selecao: "Bélgica", minuto: "89" },
      { selecao: "Bélgica", minuto: "120+5" },
      { selecao: "Senegal", minuto: "25" },
      { selecao: "Senegal", minuto: "51" },
    ],
  },
  [2, 2],
);

// 2) ESPN total com prorrogação (3×2 final, 2×2 nos 90')
ok &= assertPlacar(
  "ESPN total + timeline ET",
  {
    dataISO: "2026-07-03",
    fase: "16-avos de final",
    mandante: "Portugal",
    visitante: "Croácia",
    placarMandante: 3,
    placarVisitante: 2,
    placarDos90: false,
    gols: [
      { selecao: "Portugal", minuto: 23 },
      { selecao: "Croácia", minuto: 55 },
      { selecao: "Portugal", minuto: 67 },
      { selecao: "Croácia", minuto: 88 },
      { selecao: "Portugal", minuto: 108 },
    ],
  },
  [2, 2],
);

// 3) Pênaltis sem gols na prorrogação (1×1 nos 90', decide nos pênaltis)
ok &= assertPlacar(
  "pênaltis sem ET",
  {
    dataISO: "2026-07-04",
    fase: "Oitavas de final",
    mandante: "Alemanha",
    visitante: "França",
    placarMandante: 1,
    placarVisitante: 1,
    placarDos90: true,
    gols: [
      { selecao: "Alemanha", minuto: 34 },
      { selecao: "França", minuto: 78 },
    ],
  },
  [1, 1],
);

// 4) Decidido nos 90' (sem prorrogação)
ok &= assertPlacar(
  "decidido nos 90'",
  {
    dataISO: "2026-07-02",
    fase: "16-avos de final",
    mandante: "Inglaterra",
    visitante: "RD Congo",
    placarMandante: 2,
    placarVisitante: 1,
    placarDos90: true,
    gols: [
      { selecao: "Inglaterra", minuto: 12 },
      { selecao: "RD Congo", minuto: 67 },
      { selecao: "Inglaterra", minuto: "90+3" },
    ],
  },
  [2, 1],
);

// 5) ESPN sem timeline (fallback subtração)
ok &= assertPlacar(
  "ESPN fallback subtração",
  {
    dataISO: "2026-07-05",
    fase: "Oitavas de final",
    mandante: "Brasil",
    visitante: "Itália",
    placarMandante: 3,
    placarVisitante: 2,
    placarDos90: false,
    gols: [{ selecao: "Brasil", minuto: 105 }],
  },
  [2, 2],
);

// 6) Bônus: empate nos 90' + vencedor certo
ok &= assertPontos(
  "bônus empate + vencedor",
  { golsMandante: 1, golsVisitante: 1, vencedorFifa: "BEL" },
  {
    dataISO: "2026-07-01",
    fase: "16-avos de final",
    mandante: "Bélgica",
    visitante: "Senegal",
    placarMandante: 2,
    placarVisitante: 2,
    placarDos90: true,
    vencedorFifa: "BEL",
    gols: [],
  },
  2,
);

// 7) Pênaltis: 1×1 exato + vencedor certo = 4
ok &= assertPontos(
  "pênaltis 1×1 exato + vencedor",
  { golsMandante: 1, golsVisitante: 1, vencedorFifa: "GER" },
  {
    dataISO: "2026-07-04",
    fase: "Oitavas de final",
    mandante: "Alemanha",
    visitante: "França",
    placarMandante: 1,
    placarVisitante: 1,
    placarDos90: true,
    vencedorFifa: "GER",
    gols: [],
  },
  4,
);

// 8) Jogo antes da nova regra: sem bônus
ok &= assertPontos(
  "pré-01/07 sem bônus",
  { golsMandante: 1, golsVisitante: 1, vencedorFifa: "PAR" },
  {
    dataISO: "2026-06-29",
    fase: "16-avos de final",
    mandante: "Alemanha",
    visitante: "Paraguai",
    placarMandante: 1,
    placarVisitante: 1,
    placarDos90: true,
    vencedorFifa: "PAR",
    gols: [],
  },
  3,
);

console.log(ok ? "\nTodos os cenários passaram." : "\nFalhou.");
process.exit(ok ? 0 : 1);
