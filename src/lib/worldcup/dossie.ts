import type { AgentBlock, Confianca, Metric } from "./dossies/types";
import type { TeamStats } from "./team-stats";

const INDISPONIVEL = "—";

function n(v: number | undefined, dec = 1): string {
  if (v === undefined || Number.isNaN(v)) return INDISPONIVEL;
  return v.toFixed(dec).replace(".", ",");
}
function pct(v: number | undefined, dec = 0): string {
  if (v === undefined || Number.isNaN(v)) return INDISPONIVEL;
  return `${(v * 100).toFixed(dec).replace(".", ",")}%`;
}

function confiancaPorJogos(jogos: number): Confianca {
  if (jogos < 5) return "baixa";
  if (jogos <= 12) return "média";
  return "alta";
}

function janelaMaisGols(j?: Record<string, number>): string {
  if (!j) return INDISPONIVEL;
  const entradas = Object.entries(j);
  if (!entradas.length) return INDISPONIVEL;
  const [faixa, qtd] = entradas.sort((a, b) => b[1] - a[1])[0];
  return `${faixa}' (${qtd})`;
}

/**
 * Cada especialista exerce sua função sobre os dados reais da seleção.
 * Métricas ausentes na fonte são marcadas como indisponíveis.
 */
export function buildDossier(s: TeamStats): AgentBlock[] {
  const conf = confiancaPorJogos(s.jogos);
  const pj = s.porJogo;
  const blocks: AgentBlock[] = [];

  // 1. Finalização
  const conversao = pj.chutes ? pj.golsPro / pj.chutes : undefined;
  blocks.push({
    agente: "especialista-finalizacao",
    titulo: "Finalização",
    icone: "target",
    metricas: [
      { label: "Finalizações/jogo", valor: n(pj.chutes) },
      { label: "Gols/jogo", valor: n(pj.golsPro) },
      { label: "Conversão", valor: pct(conversao), hint: "gols / finalizações" },
      { label: "Posse média", valor: pj.posse ? n(pj.posse) + "%" : INDISPONIVEL },
    ],
    leitura: pj.chutes
      ? `Média de ${n(pj.chutes)} finalizações por jogo, convertendo ${pct(conversao)} em gol.`
      : "Volume de finalizações indisponível na fonte para esta amostra.",
    confianca: conf,
  });

  // 2. Chute ao gol
  const precisao = pj.chutes && pj.chutesNoGol ? pj.chutesNoGol / pj.chutes : undefined;
  const convAlvo = pj.chutesNoGol ? pj.golsPro / pj.chutesNoGol : undefined;
  blocks.push({
    agente: "especialista-chute-ao-gol",
    titulo: "Chute ao gol",
    icone: "crosshair",
    metricas: [
      { label: "Chutes no alvo/jogo", valor: n(pj.chutesNoGol) },
      { label: "Precisão", valor: pct(precisao), hint: "no alvo / total" },
      { label: "Conversão no alvo", valor: pct(convAlvo) },
      { label: "Defesas do goleiro/jogo", valor: n(pj.defesasGoleiro) },
    ],
    leitura: pj.chutesNoGol
      ? `Acerta o alvo ${pct(precisao)} das vezes; ${pct(convAlvo)} dos chutes no gol viram gol.`
      : "Chutes no alvo indisponíveis na fonte.",
    confianca: conf,
  });

  // 3. Escanteio
  blocks.push({
    agente: "especialista-escanteio",
    titulo: "Escanteio",
    icone: "corner",
    metricas: [
      { label: "Escanteios/jogo", valor: n(pj.escanteios) },
    ],
    leitura: pj.escanteios
      ? `Conquista ${n(pj.escanteios)} escanteios por jogo.`
      : "Escanteios disponíveis apenas com a ingestão detalhada (--deep) ou Live-Score.",
    confianca: pj.escanteios ? conf : "baixa",
  });

  // 4. Cartão amarelo
  blocks.push({
    agente: "especialista-cartao-amarelo",
    titulo: "Cartão amarelo",
    icone: "card",
    metricas: [
      { label: "Amarelos/jogo", valor: n(pj.amarelos) },
      { label: "Janela com mais amarelos", valor: janelaMaisGols(s.amarelosPorJanela) },
    ],
    leitura: pj.amarelos
      ? `Recebe ${n(pj.amarelos)} cartões amarelos por jogo em média.`
      : "Amarelos indisponíveis na fonte.",
    confianca: conf,
  });

  // 5. Cartão vermelho
  blocks.push({
    agente: "especialista-cartao-vermelho",
    titulo: "Cartão vermelho",
    icone: "card-red",
    metricas: [{ label: "Vermelhos/jogo", valor: n(pj.vermelhos, 2) }],
    leitura: pj.vermelhos !== undefined
      ? `Expulsões raras: ${n(pj.vermelhos, 2)} por jogo.`
      : "Vermelhos indisponíveis na fonte.",
    confianca: conf,
  });

  // 6. Impedimento
  blocks.push({
    agente: "especialista-impedimento",
    titulo: "Impedimento",
    icone: "flag",
    metricas: [{ label: "Impedimentos/jogo", valor: n(pj.impedimentos) }],
    leitura: pj.impedimentos
      ? `Cai em impedimento ${n(pj.impedimentos)} vezes por jogo.`
      : "Impedimentos disponíveis com a ingestão detalhada (--deep).",
    confianca: pj.impedimentos ? conf : "baixa",
  });

  // 7. Desarme
  blocks.push({
    agente: "especialista-desarme",
    titulo: "Desarme",
    icone: "tackle",
    metricas: [{ label: "Desarmes/jogo", valor: n(pj.desarmes) }],
    leitura: pj.desarmes
      ? `Soma ${n(pj.desarmes)} desarmes por jogo (agregado dos jogadores).`
      : "Desarmes indisponíveis na fonte.",
    confianca: conf,
  });

  // 8. Falta
  blocks.push({
    agente: "especialista-falta",
    titulo: "Falta",
    icone: "foul",
    metricas: [
      { label: "Faltas cometidas/jogo", valor: n(pj.faltas) },
      { label: "Faltas por cartão", valor: pj.faltas && pj.amarelos ? n(pj.faltas / pj.amarelos) : INDISPONIVEL },
    ],
    leitura: pj.faltas
      ? `Comete ${n(pj.faltas)} faltas por jogo.`
      : "Faltas indisponíveis na fonte.",
    confianca: conf,
  });

  // 9. Tiro de meta
  blocks.push({
    agente: "especialista-tiro-de-meta",
    titulo: "Tiro de meta",
    icone: "goalkick",
    metricas: [{ label: "Tiros de meta/jogo", valor: n(pj.tirosDeMeta) }],
    leitura: pj.tirosDeMeta
      ? `Média de ${n(pj.tirosDeMeta)} tiros de meta por jogo.`
      : "Tiro de meta requer a Live-Score API (configure as credenciais).",
    confianca: pj.tirosDeMeta ? conf : "baixa",
  });

  // 10. Artilheiro
  blocks.push({
    agente: "especialista-artilheiro",
    titulo: "Artilheiros",
    icone: "scorer",
    metricas: s.artilheiros.length
      ? s.artilheiros.slice(0, 5).map((a) => ({
          label: a.nome,
          valor: `${a.gols ?? 0} gols`,
          hint: a.penaltis ? `${a.penaltis} pênalti(s)` : undefined,
        }))
      : [{ label: "Sem dados", valor: INDISPONIVEL }],
    leitura: s.artilheiros[0]
      ? `${s.artilheiros[0].nome} lidera com ${s.artilheiros[0].gols} gols desde 2023.`
      : "Artilheiros indisponíveis na fonte.",
    confianca: conf,
  });

  // 11. Assistência
  blocks.push({
    agente: "especialista-assistencia",
    titulo: "Assistências",
    icone: "assist",
    metricas: s.assistentes.length
      ? s.assistentes.slice(0, 5).map((a) => ({
          label: a.nome,
          valor: `${a.assistencias ?? 0} assist.`,
        }))
      : [{ label: "Sem dados", valor: INDISPONIVEL }],
    leitura: s.assistentes[0]
      ? `${s.assistentes[0].nome} é o maior garçom (${s.assistentes[0].assistencias} assistências).`
      : "Assistências indisponíveis na fonte.",
    confianca: conf,
  });

  // 12. Tempo com mais gols
  blocks.push({
    agente: "especialista-tempo-com-mais-gols",
    titulo: "Tempo com mais gols",
    icone: "clock",
    metricas: [
      { label: "Janela que mais marca", valor: janelaMaisGols(s.golsPorJanela) },
      { label: "Janela que mais sofre", valor: janelaMaisGols(s.golsContraPorJanela) },
    ],
    leitura: s.golsPorJanela
      ? `Marca mais na faixa de ${janelaMaisGols(s.golsPorJanela)} minutos.`
      : "Distribuição por janela indisponível.",
    confianca: conf,
  });

  // 13. Média de gols por tempo
  const t = s.golsPorTempo;
  blocks.push({
    agente: "especialista-media-gol-por-tempo",
    titulo: "Média de gols por tempo",
    icone: "chart",
    metricas: [
      { label: "Gols 1º tempo", valor: t ? n(t["1T"] / s.jogos) : INDISPONIVEL },
      { label: "Gols 2º tempo", valor: t ? n(t["2T"] / s.jogos) : INDISPONIVEL },
    ],
    leitura: t
      ? `${t["2T"] >= t["1T"] ? "Cresce no 2º tempo" : "Mais perigosa no 1º tempo"} (${t["1T"]} × ${t["2T"]} gols).`
      : "Gols por tempo indisponíveis.",
    confianca: conf,
  });

  // 14. Média de gols por jogo
  blocks.push({
    agente: "especialista-media-gol-por-jogo",
    titulo: "Média de gols por jogo",
    icone: "chart",
    metricas: [
      { label: "Gols marcados/jogo", valor: n(pj.golsPro) },
      { label: "Gols sofridos/jogo", valor: n(pj.golsContra) },
      { label: "Total/jogo", valor: n(pj.golsPro + pj.golsContra) },
    ],
    leitura: `Em média, ${n(pj.golsPro + pj.golsContra)} gols por jogo (${n(pj.golsPro)} marcados, ${n(pj.golsContra)} sofridos).`,
    confianca: conf,
  });

  return blocks;
}

export const RESUMO_CONFIANCA: Record<Confianca, string> = {
  baixa: "Confiança baixa (amostra pequena)",
  média: "Confiança média",
  alta: "Confiança alta",
};

export type { Metric };
