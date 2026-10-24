# MyBooks · Plano de arquitetura (Fase 0)

**Status:** aguardando aprovação · **Data:** 24/10/2026 · **Spec:** [SPEC.md](../../../SPEC.md) · **Convenções:** [CLAUDE.md](../../../CLAUDE.md)

O projeto parte do `create-next-app` 16.4.3, que já vem com Cache Components, Partial Prefetching, Tailwind 4.3 (loader do Turbopack, sem PostCSS) e TypeScript estrito. O plano mantém essa base e organiza o resto por funcionalidade. As versões foram conferidas no npm em 24/10/2026, junto com as peer dependencies. O TypeScript 6.0.3 com `@types/node` 24 foi testado numa cópia do projeto: typecheck, lint e build passaram.

## 1. Propostas que mudam a spec

Cada uma precisa do seu ok.

1. **Gavetas sem vaul.** O README do vaul diz "This repo is unmaintained" (última versão em dez/2024). Proponho um `Sheet` próprio: Radix Dialog (foco, Esc, aria) + Motion (`drag="y"`, fecha por distância ou velocidade, mola `smooth`). Ganha a mesma física do resto do app; o vaul anima com transição CSS fixa, fora dos presets de `lib/motion.ts`.
2. **Tema sem next-themes.** A versão 0.4.6 é de mar/2025 e, a partir do Next 16.2, gera erro de console ("Encountered a script tag while rendering React component", issues #385 e #387, sem correção). Proponho ~60 linhas seguindo o guia oficial "Preventing flash before hydration": um script inline no `<head>` aplica `data-theme` antes da primeira pintura, e um hook `useTheme` cuida de claro, escuro e sistema, salva a escolha e sincroniza abas. A troca usa `document.startViewTransition` (crossfade de 250ms, instantâneo com movimento reduzido).
3. **Capas com tamanhos prontos.** No plano Hobby da Vercel o otimizador de imagens tem 5 mil transformações/mês. Quando estoura, imagens novas falham (402) e só o `alt` aparece. A capa também é a candidata natural a LCP na página do livro. Proponho: ao salvar um livro no catálogo, o servidor baixa a capa uma vez, extrai `cover_color` (node-vibrant), gera 3 larguras em WebP (sharp, que o Next já instala) e guarda no bucket `covers`. O `<BookCover>` usa `next/image` com loader próprio, sem passar pelo otimizador. Resultados de busca e livros do seed usam os tamanhos S/M/L da Open Library.
4. **TypeScript 6.0.3, não 7.0.** A 7.0.2 é a mais nova, mas o typescript-eslint (usado pelo `eslint-config-next`) só aceita `<6.1`. Pelo mesmo motivo o ESLint fica na 9.39: `eslint-plugin-react`, `-import` e `-jsx-a11y` ainda não aceitam a 10.
5. **Um token a mais: `--border-strong`.** `#EAEAE6` sobre branco dá 1,2:1, e campos de formulário precisam de 3:1 (WCAG 1.4.11). O token novo (`#8F8F8A` claro, `#66665F` escuro) vale só para inputs e selects; divisórias e cards continuam com `#EAEAE6`. Registro também uma regra: o acento claro `#D9541E` dá 3,8:1, então serve para foco, ícones e seleção, mas nunca para texto pequeno.
6. **React Compiler ligado** (não está na spec). É estável no Next 16 e corta re-renderizações, o que ajuda na meta de 60fps. O custo é um build um pouco mais lento (plugin Babel 1.0). Regra junto: no react-hook-form, `useWatch` em vez de `watch()`, que é incompatível com o compilador.

## 2. Perguntas

1. **Supabase: vi seu `.env.local`.** Olhei só os nomes (`API_KEY_SUPABASE`, `SECRET_KEY_SUPABASE`, `ANON_SUPABSE`), então sei que o projeto na nuvem já existe. Na Fase 2 renomeio para o padrão do @supabase/ssr: `NEXT_PUBLIC_SUPABASE_URL` (falta a URL do projeto), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (a chave `sb_publishable_...`, que substitui a anon) e `SUPABASE_SECRET_KEY` (só no servidor). Para desenvolver, recomendo também o Supabase local, que exige Docker Desktop: migrations e seed reproduzíveis com `supabase db reset`, sem sujar o projeto na nuvem, que fica para previews e produção. Prefere assim, ou desenvolve direto no projeto que você criou?
2. **Login com Google (Fase 2):** você já tem projeto no Google Cloud para criar o client ID, ou quer o passo a passo?
3. **Contato para a Open Library:** a API libera 3 req/s quando o `User-Agent` traz nome do app e um contato (sem isso, 1 req/s). Que e-mail entra em `OPEN_LIBRARY_USER_AGENT`? Fica só no servidor.
4. **`experimental.agentFeedback`:** veio ligado no scaffold. Com ele, o `next dev` pede que o agente prepare relatórios de bugs do Next e abra formulários no seu navegador ao fim das respostas. Nada é enviado sem seu clique. Recomendo desligar para não interromper o fluxo.

## 3. Bibliotecas e versões

| Pacote                                           | Versão                   | Fase | Nota                                                              |
| ------------------------------------------------ | ------------------------ | ---- | ----------------------------------------------------------------- |
| next                                             | 16.4.3                   | —    | já instalado                                                      |
| react · react-dom                                | 19.3.1                   | 1    | sobe da 19.3.0                                                    |
| typescript                                       | 6.0.3                    | 1    | sobe da 5.9.3 (proposta 4)                                        |
| @types/node                                      | 24.19.2                  | 1    | Node 24 local e padrão da Vercel; `engines.node: "24.x"`          |
| tailwindcss · @tailwindcss/turbopack             | 4.3.3                    | —    | já instalados                                                     |
| eslint · eslint-config-next                      | 9.39.5 · 16.4.3          | —    | já instalados                                                     |
| prettier · prettier-plugin-tailwindcss           | 3.9.10 · 0.8.1           | 1    | ordena as classes                                                 |
| babel-plugin-react-compiler                      | 1.0.0                    | 1    | proposta 6                                                        |
| motion                                           | 14.6.0                   | 1    | 13 e 14 sem mudança que nos afete                                 |
| lenis                                            | 1.3.27                   | 1    | `lenis/react` guiado pelo `frame` do Motion                       |
| shadcn · radix-ui                                | 4.22.1 · 1.8.1           | 1    | `shadcn init --base radix`                                        |
| class-variance-authority · clsx · tailwind-merge | 0.7.1 · 2.1.1 · 3.7.0    | 1    | usados pelo shadcn                                                |
| lucide-react                                     | 1.61.0                   | 1    | traço 1.5                                                         |
| sonner                                           | 2.0.8                    | 1    |                                                                   |
| @number-flow/react                               | 0.6.2                    | 1    |                                                                   |
| vitest                                           | 5.0.5                    | 1    | ambiente node, só utilitários puros                               |
| @supabase/supabase-js · @supabase/ssr            | 2.118.0 · 0.12.7         | 2    | chave publishable e `getClaims()`                                 |
| supabase (CLI)                                   | 2.122.0                  | 2    | migrations, seed e `gen types`                                    |
| zod · react-hook-form · @hookform/resolvers      | 4.6.7 · 7.91.0 · 6.0.0   | 2    | o mesmo schema valida formulário e Server Action                  |
| react-easy-crop                                  | 6.2.4                    | 2    | recorte do avatar                                                 |
| server-only                                      | 0.0.1                    | 2    |                                                                   |
| @playwright/test · @next/playwright              | 1.64.1 · 16.4.3          | 2    | `instant()` testa o que aparece de imediato na navegação          |
| cmdk                                             | 1.1.1                    | 3    | paleta de adicionar livro; ⌘K completo na 7                       |
| @tanstack/react-query                            | 5.104.5                  | 3    | busca instantânea e scroll infinito                               |
| sharp · node-vibrant                             | 0.35.5 · 4.0.4           | 3    | proposta 3                                                        |
| @dnd-kit/core · sortable · utilities             | 6.3.1 · 10.0.0 · 3.2.2   | 4    | sem release desde dez/2024; o sucessor ainda é 0.5, reavalio na 4 |
| fractional-indexing                              | 4.0.0                    | 4    | só ESM                                                            |
| three · @react-three/fiber · @react-three/drei   | 0.186.1 · 9.8.2 · 10.7.9 | 6    | carregados com `next/dynamic`, sem SSR                            |
| @zxing/browser                                   | 0.2.1                    | 7    | alternativa ao BarcodeDetector                                    |
| papaparse                                        | 5.7.0                    | 7    | CSV do Goodreads                                                  |
| @vercel/analytics · @vercel/speed-insights       | 2.0.1 · 2.0.0            | 8    |                                                                   |

Ficam de fora: vaul e next-themes (propostas 1 e 2) e fast-average-color, porque a cor é extraída no servidor.

## 4. Estrutura de pastas

```
mybooks/
├── app/
│   ├── layout.tsx                # <html lang="pt-BR">, fontes, script do tema, MotionConfig, Lenis, Toaster
│   ├── globals.css               # tokens no @theme (claro e escuro) e regras das view transitions
│   ├── (marketing)/page.tsx      # landing / (estática; quem está logado vai para /inicio no proxy)
│   ├── (auth)/                   # cartão central
│   │   ├── entrar/page.tsx
│   │   └── cadastro/page.tsx
│   ├── onboarding/page.tsx
│   ├── (app)/                    # barra superior + pílula inferior
│   │   ├── layout.tsx
│   │   ├── inicio/page.tsx
│   │   ├── explorar/page.tsx
│   │   ├── u/[username]/         # servido como /@usuario (rewrite)
│   │   │   ├── layout.tsx        # cabeçalho do perfil + abas
│   │   │   ├── page.tsx          # Estante
│   │   │   ├── colecoes/page.tsx
│   │   │   └── citacoes/page.tsx
│   │   ├── livro/[id]/page.tsx
│   │   ├── colecao/[id]/page.tsx
│   │   └── configuracoes/page.tsx
│   ├── auth/confirm/route.ts     # link mágico e confirmação de e-mail
│   ├── auth/callback/route.ts    # retorno do Google
│   ├── api/books/search/route.ts # catálogo + Open Library, com cache
│   ├── dev/page.tsx              # vitrine de componentes e animações (404 em produção)
│   └── sitemap.ts · robots.ts · not-found.tsx · error.tsx
├── components/
│   ├── ui/                       # primitivos shadcn restilizados + Sheet próprio
│   ├── motion/                   # Reveal, Stagger, Pressable, TextReveal (só presets)
│   └── shell/                    # TopNav, BottomNav, CommandPalette, ThemeToggle, providers
├── features/                     # cada uma: components/, actions.ts, queries.ts, schemas.ts, lib/
│   ├── books/                    # catálogo: BookCover, BookSpine, Shelf, BookLink, busca, Open Library
│   ├── shelf/                    # estante da pessoa: status, nota, visualizações, sortear
│   ├── collections/
│   ├── social/                   # seguir, feed, afinidade, notificações
│   ├── profile/                  # perfil, onboarding, configurações
│   └── viewer-3d/                # carregado sob demanda
├── lib/
│   ├── motion.ts                 # molas, curva, durações e sequência: a única fonte
│   ├── supabase/                 # server.ts, client.ts, public.ts, proxy.ts, database.types.ts
│   ├── auth.ts                   # getViewer() e requireViewer()
│   ├── action.ts                 # tipo ActionResult e helper de Server Action com zod
│   ├── routes.ts                 # URLs tipadas (perfil, livro, coleção)
│   ├── env.ts                    # variáveis de ambiente validadas com zod
│   └── utils.ts                  # cn()
├── proxy.ts                      # renova a sessão, redireciona / e protege rotas privadas
├── supabase/                     # config.toml, migrations/, seed.sql
├── scripts/gerar-seed.ts         # busca os ~40 livros uma única vez e grava o seed.sql
├── e2e/                          # Playwright
└── docs/superpowers/plans/       # este plano e os planos de cada fase
```

Imagens OG ficam como `opengraph-image.tsx` dentro de cada rota pública (perfil, livro, coleção e citação).

## 5. Decisões de arquitetura

1. **Renderização e cache.** Cache Components e Partial Prefetching ficam ligados (padrão do Next 16.4). Toda leitura de cookies, params ou searchParams fica dentro de `<Suspense>` com skeleton: sem isso o build falha, e o modo dev avisa quando uma navegação deixa de ser instantânea. Dados públicos (catálogo, perfis e coleções públicas) passam por `'use cache'` com `cacheTag`/`cacheLife`, usando um cliente Supabase sem sessão (`lib/supabase/public.ts`). Dados de quem está vendo vêm do cliente com cookies, dentro de Suspense.
2. **Autenticação.** O `proxy.ts` (o antigo middleware) renova a sessão com `@supabase/ssr` e aplica os cabeçalhos de cache que o `setAll` devolve, para nenhuma CDN servir a sessão de outra pessoa. A autorização usa sempre `getClaims()`, que verifica o JWT localmente com as chaves assimétricas do projeto. `lib/auth.ts` expõe `getViewer()` com `'use cache: private'`, e assim a parte logada da barra entra no prefetch sem travar a página. A barreira real continua sendo a RLS.
   - `/inicio`, `/onboarding` e `/configuracoes` exigem login.
   - Perfil, livro, coleção e Explorar são públicos (compartilháveis, com OG e sitemap).
   - Quem está logado e abre `/` vai para `/inicio` direto no proxy, e a landing segue estática.
3. **Mutações.** Server Actions em `features/*/actions.ts` seguem a sequência zod → `requireViewer()` → escrita → `updateTag()` → `ActionResult` tipado. Com o `updateTag()`, a mudança aparece na mesma resposta, e erro esperado nunca vira exceção. A UI aplica `useOptimistic` antes da resposta chegar.
4. **Busca de livros.** Fica num Route Handler GET (`/api/books/search`), não numa Server Action: o Next despacha Server Actions uma por vez no cliente, e um GET pode ter cache. Ordem da busca:
   1. catálogo local (pg_trgm, responde em milissegundos);
   2. Open Library, com cache de um dia por consulta normalizada e `User-Agent` identificado;
   3. Google Books como alternativa.

   No cliente, React Query com debounce curto, mantendo os resultados anteriores enquanto a pessoa digita.

5. **Capa que viaja até a página do livro.** Usa `<ViewTransition>` do React 19.3, estável e sem flag, com `name="capa-<id>"`/`"titulo-<id>"` e `share="morph"`. O morph só acontece se a página do livro já estiver pronta no clique. Por isso o `<BookLink>` faz prefetch completo por intenção (hover, foco ou toque), e a capa e o título do destino vêm de leitura em cache. Se o prefetch não chegar a tempo, a página entra com crossfade. Em navegador sem View Transitions, um fade do Motion cumpre o mesmo papel. Dentro da mesma tela, só Motion (`layout`/`layoutId`).
6. **Movimento.** `lib/motion.ts` é a única fonte de molas, curva e durações. O `<MotionConfig reducedMotion="user">` desliga transform e layout para quem pede movimento reduzido, e os presets também tiram o blur, para sobrar só opacidade. O Lenis fica na raiz com `autoRaf: false`, guiado pelo loop `frame` do Motion, então existe um único requestAnimationFrame. Áreas com scroll próprio levam `data-lenis-prevent`.
7. **Rota `/@usuario`.** Rewrite de `/@:username` e `/@:username/:path*` para `/u/...`. As abas viram sub-rotas (`/@ana/colecoes`, `/@ana/citacoes`): o cabeçalho fica no layout, cada aba tem URL compartilhável e o indicador desliza com `layoutId`. Com `typedRoutes` ligado, as URLs saem de `lib/routes.ts`.
8. **Activity.** Com Cache Components, até 3 rotas ficam montadas e escondidas. Por isso:
   - popovers, menus, ⌘K e sheets fecham quando a rota é escondida;
   - nenhuma página escreve variável CSS global (o brilho da `cover_color` mora no container da página);
   - o logout recarrega a página inteira;
   - os testes E2E usam `getByRole`.
9. **Tempo real.** As notificações usam Supabase Realtime Broadcast: um trigger chama `realtime.broadcast_changes` num canal privado por usuário, com RLS em `realtime.messages`. A Supabase recomenda Broadcast no lugar de Postgres Changes, por escala e segurança.
10. **Busca do Explorar.** Full-text em português com `unaccent` e `pg_trgm`, para "sertao" achar "Sertão" e tolerar erro de digitação.
11. **Seed.** `scripts/gerar-seed.ts` busca os ~40 livros na Open Library uma única vez (no máximo 1 req/s), calcula as cores e grava `supabase/seed.sql`, que vai versionado. A API proíbe download em massa, então nada de buscar a cada `db reset`.
12. **Testes.** Vitest para utilitários puros (`*.test.ts` ao lado do código) desde a Fase 1: largura e altura das lombadas, cor da capa gerada e contraste. Com Playwright, cada fluxo ganha seu teste na fase em que nasce, e a Fase 8 consolida.
13. **Fim de cada fase.** Rodar `npm run typecheck && npm run lint && npm test && npm run build`, resumir o que testar manualmente e fazer o commit (Conventional Commits em português) numa branch da fase (`fase-N-...`), que entra na `master` depois do seu ok.

## 6. Prévia da Fase 1 (Fundação)

1. Base: TypeScript 6, Node 24, scripts, Prettier, React Compiler, `typedRoutes`, Vitest e `.env.example`. Hoje o `.gitignore` ignora `.env*`, então o `.env.example` precisa da exceção `!.env.example`.
2. Tokens no `@theme` (claro e escuro), fontes (Instrument Serif, Geist, Geist Mono) e tema com troca suave.
3. shadcn (`--base radix`) restilizado e o `Sheet` próprio.
4. `lib/motion.ts`, `MotionConfig`, Lenis e os componentes de entrada (Reveal, Stagger, Pressable).
5. Barra superior translúcida e pílula inferior no celular, ainda sem dados reais.
6. `BookCover` (capa real ou tipográfica, inclinação 3D com reflexo), `BookSpine` e `Shelf` (lombada sai da prateleira e afasta as vizinhas).
7. `/dev` com todos os componentes e animações, usando livros reais.

O plano detalhado em tarefas, com os testes, sai no início da Fase 1.
