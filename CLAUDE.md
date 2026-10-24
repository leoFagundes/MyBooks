# MyBooks: convenções do projeto

Rede social de leitura minimalista. A interface fica quieta para os livros falarem, e o que torna o produto memorável é o movimento.

Fora do escopo (não crie): conquistas ou badges, página de estatísticas, gráficos, metas de leitura, streaks, retrospectiva ou qualquer gamificação.

- Spec: [SPEC.md](SPEC.md). Arquitetura, pastas e versões: [plano da Fase 0](docs/superpowers/plans/2026-10-24-fase-0-arquitetura.md).
- O Next.js 16.4 tem APIs diferentes das que você conhece. Siga o [AGENTS.md](AGENTS.md) (gerado pelo `next dev`) e leia o guia em `node_modules/next/dist/docs/` antes de usar qualquer API do Next.
- Antes de usar @supabase/ssr, View Transitions, Tailwind v4 ou Motion, confira a documentação atual.

## Estado

- Fase 0 (plano) entregue em 24/10/2026, aguardando aprovação. As regras abaixo já assumem as propostas do plano; ajuste se a aprovação mudar algo.
- Por enquanto só existe o scaffold do `create-next-app`. Os arquivos citados aqui nascem nas fases indicadas no plano.
- Atualize esta seção ao fim de cada fase.

## Comandos

- `npm run dev` · `npm run build` · `npm run lint` (`next lint` não existe mais; `next build` não roda lint)
- A partir da Fase 1: `npm run typecheck` (`tsc --noEmit`), `npm test` (Vitest), `npm run test:e2e` (Playwright), `npm run format`
- Fim de fase: typecheck, lint, testes e build sem erros → resumo do que testar manualmente → commit.

## Idioma e texto

- Interface 100% em português do Brasil, com textos curtos e calorosos. Nada de lorem ipsum: exemplos usam livros reais.
- Código em inglês (identificadores, arquivos, tabelas e colunas). Rotas da interface em português (`/entrar`, `/livro/[id]`, `/colecao/[id]`).
- Comentários raros, em português, explicando o porquê.
- Commits em Conventional Commits com descrição em português, por exemplo `feat(estante): troca animada entre visualizações`.

## Organização

- `app/` tem só rotas, layouts e composição. Grupos: `(marketing)` para a landing, `(auth)` para entrar e cadastro, `(app)` para as telas com barra de navegação.
- `features/<domínio>/` (books, shelf, collections, social, profile, viewer-3d) contém `components/`, `actions.ts` (Server Actions), `queries.ts` (leituras, `server-only`), `schemas.ts` (zod) e `lib/`.
- `components/ui/` guarda os primitivos shadcn restilizados, `components/motion/` os wrappers de animação e `components/shell/` a navegação e os providers.
- `lib/` concentra a infraestrutura transversal: `motion.ts`, `supabase/`, `auth.ts`, `action.ts`, `routes.ts`, `env.ts` e `utils.ts`.
- O perfil tem URL pública `/@usuario`, servida por `app/(app)/u/[username]` via rewrite. Monte URLs sempre com `lib/routes.ts`; com `typedRoutes`, um `/@...` escrito à mão não compila.

## Next.js 16: o que mais pega

- Middleware agora se chama `proxy.ts` (função `proxy`, runtime Node).
- Cache Components está ligado. `cookies()`, `headers()`, `params` e `searchParams` só podem ser lidos dentro de `<Suspense>` (com skeleton) ou de uma função `'use cache: private'`. Nunca leia a sessão no topo de um layout.
- Todo `'use cache'` leva `cacheLife(...)` e `cacheTag(...)`. Tags: `book:<id>`, `profile:<username>`, `shelf:<userId>`, `collection:<id>`.
- Depois de uma mutação, chame `updateTag(tag)` dentro da Server Action. `revalidateTag` exige dois argumentos: `revalidateTag(tag, 'max')`.
- O cliente despacha Server Actions uma por vez. Nunca use uma para leitura ou busca; use um Route Handler GET.
- Activity mantém até 3 rotas montadas e escondidas. Popover, menu, ⌘K e sheet fecham no cleanup de `useLayoutEffect`. Nenhuma página escreve variável CSS global. O logout usa `window.location.assign`.
- Links para `/livro/[id]` em listas usam `<BookLink>` (prefetch completo por intenção); sem isso o morph da capa não acontece.

## Dados e segurança (Supabase)

- Clientes:
  - `lib/supabase/server.ts`: com cookies, só no servidor;
  - `client.ts`: no navegador;
  - `public.ts`: sem sessão, para leituras públicas dentro de `'use cache'`;
  - `proxy.ts`: `updateSession`, chamado pelo `proxy.ts` da raiz.
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` podem ir para o cliente. `SUPABASE_SECRET_KEY` fica só em código com `import 'server-only'` ou em scripts. Toda variável nova é documentada em `.env.example`.
- Autorização sempre com `supabase.auth.getClaims()`, via `getViewer()` e `requireViewer()` de `lib/auth.ts`. Nunca confie em `getSession()` no servidor.
- RLS em todas as tabelas. Migrations ficam em `supabase/migrations/`; os tipos gerados ficam em `lib/supabase/database.types.ts` e não são editados à mão.
- Toda Server Action segue a sequência zod → `requireViewer()` → escrita → `updateTag()` → `ActionResult` (`{ ok: true, data } | { ok: false, error }`). Erro esperado nunca vira exceção. A UI aplica `useOptimistic` antes da resposta.
- A Open Library só é chamada pelo servidor, com `User-Agent` identificado e cache. Nada de download em massa.

## Design

- Cores só pelos tokens do `@theme` em `app/globals.css`, sem hex solto em componente. A exceção é a `cover_color` vinda do banco, passada pela variável CSS `--cover`.
- Acento (`#D9541E` no claro, `#F07040` no escuro) só em foco, curtidas e seleção, nunca em texto pequeno (3,8:1 no claro).
- Botão primário invertido: preto no claro, branco no escuro. Bordas de 1px, quase nenhuma sombra, nenhum gradiente decorativo. Campos de formulário usam `--border-strong`.
- Tipografia: `font-serif` (Instrument Serif) nos títulos de páginas e livros, `font-sans` (Geist) na interface, `font-mono` (Geist Mono) nos metadados (páginas, ano, ISBN, contadores).
- Raios de 10px em controles, 14px em cards e 3px em capas. Grade de 4/8px. Ícones `lucide-react` com traço 1.5.
- Todo componente tem os estados de carregando (skeleton com shimmer), vazio (ilustração em traço fino + uma ação), erro e sucesso, e funciona de 360px a 1920px.
- Acessibilidade: navegação por teclado, foco visível, `aria-label` nos botões de ícone, contraste AA.
- Performance: Lighthouse ≥ 90 no celular, LCP < 2,5s, CLS perto de zero, 60fps num celular intermediário. Imagens sempre com `next/image` no tamanho certo.

## Movimento

- Use só os presets de `lib/motion.ts`: molas `snappy`, `smooth` e `gentle`, curva `[0.22, 1, 0.36, 1]`, durações de 150/250/400ms e sequência de 35ms. Importe de `motion/react`.
- Anime só `transform` e `opacity` (`filter` com moderação). Tamanho e posição mudam com `layout`/`layoutId`, nunca com width, height, top ou left.
- Elementos interativos usam mola, nada é linear e nada aparece ou some de repente. Toda saída é mais rápida que a entrada.
- `<MotionConfig reducedMotion="user">` fica na raiz. A versão reduzida de qualquer animação é só opacidade.
- Entre rotas, `<ViewTransition>` do React, com nomes únicos na página (`capa-<id>`, `titulo-<id>`). Dentro da mesma tela, Motion.
- Lenis fica na raiz, guiado pelo `frame` do Motion. Áreas com scroll próprio levam `data-lenis-prevent`.
- three.js só no visualizador 3D, carregado com `next/dynamic` sem SSR.

## Dependências

- Não adicione `vaul` nem `next-themes`. Gavetas usam `components/ui/sheet`, e o tema usa o script próprio (ver plano).
- Formulários usam react-hook-form + zod. Use `useWatch`, nunca `watch()`, que quebra com o React Compiler.
- Biblioteca nova entra na versão estável mais recente que respeite as peer dependencies. O TypeScript fica na 6.0.x enquanto o typescript-eslint não aceitar a 7, e o ESLint fica na 9.x.

## Testes

- Vitest para utilitários puros, em `*.test.ts` ao lado do código.
- Playwright em `e2e/`, com seletores por papel (`getByRole`), porque o Activity deixa rotas escondidas no DOM.

## Git

- Uma branch por fase (`fase-N-nome`), com commit ao fim da fase e merge na `master` depois da aprovação.
