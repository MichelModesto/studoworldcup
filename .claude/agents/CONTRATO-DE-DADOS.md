# Contrato de Dados — Esquadrão de Especialistas StudoWorldCup

> Documento de referência (sem frontmatter — **não** é um agente). Todos os
> especialistas devem assumir este modelo de eventos como fonte da verdade.
> Quando os dados reais ainda não existirem, o agente trabalha sobre
> `src/lib/data/worldcup.ts` (ilustrativo) e **declara explicitamente** que a
> análise é baseada em dados de exemplo.

## Princípios comuns a todos os agentes

1. **Rigor antes de opinião.** Toda conclusão nasce de um número rastreável.
2. **Normalizar sempre.** Comparar por 90 minutos, por jogo ou por posse, nunca
   números brutos entre amostras de tamanhos diferentes.
3. **Amostra pequena = incerteza alta.** Em Copa do Mundo cada seleção joga de 3
   a 7 partidas. Sempre reportar tamanho de amostra e intervalo de confiança
   qualitativo ("baixa/média/alta confiança").
4. **Contexto manda.** Placar, homem a mais/menos, minuto, fase do torneio e
   força do adversário mudam a leitura de qualquer métrica.
5. **Transparência de fonte.** Diferenciar dado observado, estimado e ilustrativo.
6. **Idioma: português.** Saída objetiva e acionável.

## Modelo de eventos (event-level data)

Cada partida é uma sequência de eventos. Campos canônicos:

```ts
type EventoBase = {
  jogoId: number;
  minuto: number;          // 1..90 (+ acréscimos como 45+2, 90+4)
  periodo: "1T" | "2T" | "PRORR_1T" | "PRORR_2T";
  segundos?: number;       // opcional, para precisão temporal
  selecao: string;         // time do evento
  adversario: string;
  jogador?: string;
  x?: number;              // 0..100 (campo normalizado, ataque para a direita)
  y?: number;              // 0..100
  placarMandante?: number; // estado do placar no momento do evento
  placarVisitante?: number;
  homemAMais?: number;     // diferença de jogadores em campo (+1, 0, -1...)
};
```

### Tipos de evento relevantes

| Evento | Campos extras principais |
|--------|--------------------------|
| `chute` | `alvo: "no_gol"\|"para_fora"\|"bloqueado"\|"trave"`, `gol: boolean`, `xg: number`, `parteCorpo`, `tipoJogada: "bola_rolando"\|"escanteio"\|"falta"\|"penalti"\|"contra_ataque"` |
| `passe` | `key_pass: boolean`, `assistencia: boolean`, `xa: number`, `terco: "def"\|"meio"\|"ataque"` |
| `escanteio` | `lado: "esq"\|"dir"`, `tipo: "curto"\|"cruzamento"`, `resultou_chute`, `resultou_gol` |
| `falta` | `cometida_por`, `sofrida_por`, `regiao`, `gerou_cartao` |
| `cartao` | `tipo: "amarelo"\|"vermelho"\|"segundo_amarelo"`, `motivo` |
| `impedimento` | `jogador`, `origem: "passe"\|"contra_ataque"` |
| `desarme` | `bem_sucedido: boolean`, `regiao`, `gerou_posse` |
| `tiro_de_meta` | `curto_ou_longo`, `completou_passe` |
| `gol` | herda de `chute` com `gol:true`; `assistente?`, `tipoAssistencia?` |

## Convenções de normalização

- **Por 90 (`p90`)**: `valor / minutosJogados * 90`.
- **Por jogo**: `valor / nºJogos`.
- **Taxa de conversão**: `gols / chutes`; **precisão**: `chutesNoGol / chutes`.
- **xG over/underperformance**: `golsReais − xGAcumulado`.
- **Janelas de 15'**: `0–15, 16–30, 31–45+, 46–60, 61–75, 76–90+`.

## Formato de saída padrão (todos os agentes)

1. **TL;DR** (2–4 linhas com o achado principal).
2. **Tabela de métricas** com a fórmula aplicada e o valor.
3. **Leitura tática/contextual** (o que o número significa).
4. **Confiança** (amostra + ressalvas).
5. **Bloco JSON** estruturado pronto para alimentar a UI (`recharts`/tabelas).
6. **Fonte dos dados** (observado / estimado / ilustrativo).

## Integração com o projeto

- Dados ilustrativos: `src/lib/data/worldcup.ts`.
- Telas-alvo: `src/app/painel/*` e gráficos em `src/components/charts/*`.
- Ao propor visualização, indicar o componente (`AreaChart`, `BarChart`,
  `PieChart`, tabela) e o shape de dados esperado.
