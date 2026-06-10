# 🧠 Esquadrão de Especialistas — StudoWorldCup

15 subagents do Claude Code, cada um **mestre absoluto** em uma métrica da Copa do
Mundo 2026. Todos seguem o [Contrato de Dados](./CONTRATO-DE-DADOS.md) (modelo de
eventos, normalização e formato de saída comuns).

## Como usar
Invoque pelo nome (ex.: "use o `especialista-finalizacao` para analisar o Brasil")
ou deixe o Claude rotear pela `description` de cada agente. O
`especialista-duelo-adversario` é o **agregador** e pode acionar os demais.

## Roster

### ⚽ Ataque / criação
| Agente | Domínio |
|---|---|
| `especialista-finalizacao` | Volume e qualidade de chutes, xG, mapas de chute |
| `especialista-chute-ao-gol` | Chutes no alvo, precisão, xGOT, defesas exigidas |
| `especialista-artilheiro` | Ranking de gols, eficiência, Chuteira de Ouro |
| `especialista-assistencia` | Assistências, passes-chave, xA, criação |
| `especialista-escanteio` | Escanteios e bola parada de canto |

### 🛡️ Defesa / disputa
| Agente | Domínio |
|---|---|
| `especialista-desarme` | Desarmes, recuperações, pressão |
| `especialista-falta` | Faltas cometidas/sofridas, zona, consequência |
| `especialista-impedimento` | Offside, linha alta, armadilha, SAOT |
| `especialista-tiro-de-meta` | Saída de bola, build-up sob pressão |

### 🟨🟥 Disciplina
| Agente | Domínio |
|---|---|
| `especialista-cartao-amarelo` | Amarelos, pendurados, risco de suspensão |
| `especialista-cartao-vermelho` | Expulsões, jogar com 10, suspensões |

### 📈 Gols no tempo / agregação
| Agente | Domínio |
|---|---|
| `especialista-tempo-com-mais-gols` | Distribuição de gols por janela de 15' |
| `especialista-media-gol-por-tempo` | Média de gols 1º × 2º tempo |
| `especialista-media-gol-por-jogo` | Gols/jogo, over-under, projeção |
| `especialista-duelo-adversario` | Confronto direto (H2H), matchups, veredito |

## Princípios (resumo)
1. Rigor antes de opinião — todo número é rastreável.
2. Normalizar sempre (p90, por jogo).
3. Amostra pequena = incerteza alta (Copa tem poucos jogos por seleção).
4. Contexto manda (placar, homem a mais/menos, fase, adversário).
5. Transparência de fonte (observado / estimado / ilustrativo).
6. Saída padronizada: TL;DR → métricas → leitura → confiança → JSON → fonte.
