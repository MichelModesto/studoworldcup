# ⚡ Otimização de requisições — meta: 3+ seleções por dia

A API-Football no plano **Free** dá **100 requisições/dia** (e limite baixo por
minuto). Este guia mostra como **não gastar requisição à toa** e fechar pelo
menos **3 seleções por dia** com folga.

---

## 1. Quanto custa cada seleção (a conta)

Custo por seleção no script de ingestão:

| Item | Requisições |
|---|---|
| Resolver o ID do time | 1 (**só na 1ª vez** — depois fica em cache) |
| Listar jogos (temporadas 2023 + 2024) | 2 |
| Estatísticas por jogo | 1 × Nº de jogos |
| Eventos por jogo (gols/cartões) | 1 × Nº de jogos |

Fórmula: **custo ≈ 2 + (2 × max-matches)**

| max-matches | Custo/seleção | Seleções/dia (100 req) |
|---|---|---|
| 24 | ~50 | 2 |
| **15** (padrão novo) | **~32** | **3** ✅ |
| 12 | ~26 | 3 (com sobra p/ começar a 4ª) |
| 10 | ~22 | 4 |

> **A alavanca principal é o `--max-matches`.** 15 jogos recentes já é uma amostra
> boa para os agentes. Use 12 se quiser garantir 3 com folga.

---

## 2. As 7 regras para não desperdiçar requisição

1. **Cache por requisição (automático).** Tudo que é baixado fica em
   `data/.cache/fx/`. Re-rodar a mesma seleção **não gasta nada**. Se o dia
   acabar no meio, no dia seguinte ele **continua de onde parou** de graça.
2. **Pular seleções já prontas (automático).** Se existe `data/teams/<FIFA>.json`,
   o script pula. Use `--force` só quando quiser refazer de propósito.
3. **Só temporadas 2023–2024.** O free **bloqueia 2025/2026** (cada tentativa é
   uma requisição desperdiçada). O padrão já está correto; não adicione 2025.
4. **Só jogos finalizados e mais recentes.** O script filtra `FT` e pega os
   `max-matches` mais recentes — nada de gastar com jogos futuros/sem placar.
5. **Evitar 429 (estouro por minuto).** Use `--delay=7000` (padrão). Requisição
   barrada por excesso de velocidade é requisição jogada fora.
6. **Trava de segurança.** `--max-requests=95` para o script antes de bater 100,
   deixando margem.
7. **Conferir a quota antes/depois** (ver seção 5) para planejar o lote do dia.

---

## 3. Receita do dia (copiar e colar)

Faça **3 seleções de uma vez** (custa ~96 req, dentro do limite):

```bash
npm run ingest -- --teams=KOR,MEX,CZE --max-matches=15
```

Quer margem para uma 4ª? Use 12 jogos:

```bash
npm run ingest -- --teams=KOR,MEX,CZE,CAN --max-matches=12
```

Se o dia acabar no meio de uma seleção (erro `BUDGET`), **rode de novo no dia
seguinte com o mesmo comando** — o cache cobre o que já veio e só busca o que
falta.

---

## 4. Sugestão de cronograma (grupos A→L, 3/dia ≈ 16 dias)

| Dia | Seleções (FIFA) |
|---|---|
| 1 | RSA ✅ (feito), KOR, MEX |
| 2 | CZE, CAN, BIH |
| 3 | QAT, SUI, BRA |
| 4 | MAR, HAI, SCO |
| … | (segue a ordem dos grupos) |

> Ajuste à vontade — priorize as seleções que você quer ver primeiro.

---

## 5. Conferir a quota (1 requisição, vale a pena)

```bash
curl -s "https://v3.football.api-sports.io/status" \
  -H "x-apisports-key: $API_FOOTBALL_KEY" | npx --yes json response.requests
```

Ou rode antes do lote para saber quantas restam hoje.

---

## 6. Depois que a ingestão roda: gerar o dossiê dos agentes

A ingestão **não usa requisições da API-Football para os agentes** — eles
analisam o JSON local. Então, sem custo de quota, para cada seleção nova:
1. Os 14 especialistas leem `data/teams/<FIFA>.json`.
2. Cada um escreve seu bloco em `data/dossies/<FIFA>.json`.
3. A tela `Seleções → (país)` mostra o dossiê.

---

## 6.1 Rotação de chaves (dobra a quota diária) 🔑

O script aceita **várias chaves** e usa uma até esgotar a quota do dia, então
passa automaticamente para a próxima. Configure no `.env.local`:

```
API_FOOTBALL_KEY=chave_1
API_FOOTBALL_KEY2=chave_2
API_FOOTBALL_KEY3=chave_3
```

- Com **2 chaves** = ~200 req/dia → **~6 seleções/dia**.
- A troca é automática quando a quota diária da chave atual acaba.
- Forçar uma chave específica: `--key=2` (começa pela 2ª).
- O orçamento padrão (`--max-requests`) escala sozinho: `95 × nº de chaves`.

```bash
# exemplo: 6 seleções num dia com 2 chaves
npm run ingest -- --teams=KOR,MEX,CZE,CAN,BIH,QAT
```

## 7. Evoluções que reduzem/ampliam ainda mais

- **Desarmes:** virão do endpoint de jogadores (`/players?team=&season=`) —
  ~2 req extras por seleção (paginação). Avaliar custo/benefício.
- **Tiro de meta:** via **Live-Score API** (quota separada, não consome a da
  API-Football).
- **Plano pago:** remove o limite diário e libera 2025/2026, xG/xGOT/xA — aí dá
  para ingerir as 48 de uma vez e com histórico mais profundo.

---

### TL;DR
`--max-matches=15` + cache + pular prontos + só 2023/2024 + `--delay=7000` =
**3 seleções/dia** sem desperdício. Comando padrão:
```bash
npm run ingest -- --teams=AAA,BBB,CCC
```
