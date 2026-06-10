# 🏆 StudoWorldCup

Plataforma de **estatísticas e análises da Copa do Mundo FIFA 2026** (México · Canadá · Estados Unidos).

Site com área pública (landing) e um **painel protegido por login** com várias telas: visão geral, seleções, jogos, grupos, artilheiros, estatísticas e sedes.

## ✨ Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Recharts** (gráficos) · **lucide-react** (ícones)
- Autenticação por cookie de sessão + `proxy.ts` (proteção de rotas)

## 🚀 Como rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000

### Acesso de demonstração

- **E-mail:** `admin@studoworldcup.com`
- **Senha:** `copa2026`

## 🗂️ Estrutura

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Tela de login (Server Action)
│   ├── actions.ts            # login / logout
│   └── painel/               # Área protegida
│       ├── layout.tsx        # Shell (sidebar + topbar)
│       ├── page.tsx          # Visão geral
│       ├── selecoes/
│       ├── jogos/
│       ├── grupos/
│       ├── artilheiros/
│       ├── estatisticas/
│       └── sedes/
├── components/               # UI, painel e gráficos
├── lib/
│   ├── auth.ts               # sessão / credenciais
│   └── data/worldcup.ts      # dados (ilustrativos)
└── proxy.ts                  # proteção de rotas (ex-middleware)
```

## 🛣️ Próximos passos (roadmap)

- [ ] Substituir dados ilustrativos por feed/API real
- [ ] Autenticação real (banco de dados / provider)
- [ ] Páginas de detalhe por seleção e por jogo
- [ ] Agentes de IA para insights e previsões
- [ ] Deploy (Vercel / GitHub)

---

> Dados atuais são **ilustrativos** para o escopo inicial e serão substituídos por fontes reais.
