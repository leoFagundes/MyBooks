# MyBooks: convenções do projeto

Rede social de leitura minimalista. A interface fica quieta para os livros falarem, e o que torna o produto memorável é o movimento.

Fora do escopo (não crie): conquistas ou badges, página de estatísticas, gráficos, metas de leitura, streaks, retrospectiva ou qualquer gamificação.

- Spec: [SPEC.md](SPEC.md). Arquitetura, pastas e versões: [plano da Fase 0](docs/superpowers/plans/2026-10-24-fase-0-arquitetura.md).
- O Next.js 16.4 tem APIs diferentes das que você conhece. Siga o [AGENTS.md](AGENTS.md) (gerado pelo `next dev`) e leia o guia em `node_modules/next/dist/docs/` antes de usar qualquer API do Next.
- Antes de usar @supabase/ssr, View Transitions, Tailwind v4 ou Motion, confira a documentação atual.

## Estado

- Fase 0 (plano) aprovada com as 6 propostas. Fase 1 (Fundação) entregue em 24/10/2026 e integrada à `master` em 25/10/2026. As fases 2 a 6 foram integradas à `master` em 28/10/2026, e a 7 em 29/10/2026.
- Fase 2 (Supabase e conta) entregue em 27/10/2026 na branch `fase-2-supabase-e-conta`.
  - Banco de desenvolvimento: projeto `djehboxlhvjtlrvmdiis` (supabase-cerulean-yacht, na organização da Vercel). O `pdlxsimtcamwadfbjyjm` ficou de fora porque o token da conta não o alcança; as chaves dele estão em `.env.local.pdlxsim` (fora do git).
  - Já existe: schema com RLS (perfis, catálogo, estante, citações, follows, coleções, atividades e notificações por trigger), Storage (avatares e capas), seed (8 leitores, 44 livros, coleções), tipos gerados, entrar e cadastrar (e-mail e senha, link mágico, Google), sair, barra com a conta, `/inicio` provisório e onboarding em 4 passos.
  - E-mails: saem com o modelo padrão do Supabase, em inglês (o plano gratuito com o e-mail padrão não aceita modelos próprios), e só chegam a quem é da equipe do projeto, 2 por hora. Os links voltam por `/auth/callback` e precisam abrir no mesmo navegador. Os modelos em pt-BR de `supabase/templates` entram com o SMTP próprio, na Fase 8.
  - Google: falta criar o cliente OAuth no Google Cloud, com o retorno `https://djehboxlhvjtlrvmdiis.supabase.co/auth/v1/callback`, e ligar o provedor no Supabase. Até lá, o botão avisa que o login com Google ainda não está ligado.
- Fase 3 (Estante) entregue em 27/10/2026 na branch `fase-3-estante` (rebaseada sobre a fase 2). Aprovada pelo usuário com três correções (27/10): o card de Filtros cabe na tela, e a capa viaja na ida e na volta já na primeira vez.
  - Já existe: transições entre páginas e a viagem da capa; busca no catálogo e na Open Library (Google Books de reserva); livro novo no catálogo com cor e capas em três larguras; paleta de adicionar livro (+, tecla N e ⌘K) com cadastro manual; perfil `/@usuario` com cabeçalho, contadores, abas, edição e perfil privado; aba Estante com status, busca, filtros, ordem e vista na URL; página `/livro/[id]` com o bloco da pessoa (resenha que salva sozinha, citações) e a comunidade.
  - Testes que ficaram para depois, a pedido do usuário (para economizar): unitários dos filtros, E2E da aba Estante, da página do livro e da viagem da capa entre as páginas reais.
- Fase 4 (Coleções) entregue em 28/10/2026 na branch `fase-4-colecoes` (recriada sobre a fase 3 corrigida; a antiga ficou em `fase-4-colecoes-antiga`). Trabalhamos uma fase por vez: ao fim de cada uma, o usuário confere antes da próxima.
  - Já existe: página `/colecao/[id]` (cabeçalho, grade reordenável por mouse, toque e teclado, notas, tirar com "Desfazer", 404 gentil); criar, editar e excluir; curtir, salvar, compartilhar; colaboração (convite por @, sair, desligar); copiar com "Inspirado em @fulano" (`copy_collection`, no banco); aba Coleções do perfil (as próprias, "Você colabora", "Salvas"); "Pôr numa coleção" na página do livro; campo Coleção na paleta; "Nova coleção" no ⌘K. Migrations novas: `set_collection_positions` e `copy_collection`.
  - Testes que ficaram para depois, a pedido do usuário: de banco (`set_collection_positions`, `copy_collection`) e E2E (página, criar e reordenar, curtir e salvar, colaboração com duas sessões, copiar, coleções no perfil e no livro). Cada fluxo foi conferido por uma sonda no dev.
- Fase 5 (Social) entregue em 28/10/2026 na branch `fase-5-social`. Plano: [fase 5](docs/superpowers/plans/2026-10-28-fase-5-social.md).
  - Já existe: seguir e pedir para seguir (`FollowButton`, também no onboarding; perfil que vira público aceita os pedidos); seguidores e seguindo em diálogo, com "Tirar" no próprio perfil; notificações em tempo real no sino (pedidos com Aceitar e Recusar no topo; abrir marca como lido); afinidade literária e "N livros em comum" (`?comum=1` filtra a estante); copiar livro da estante dos outros (Estante, Grade e Lista) e do feed, com a capa voando até "Minha estante", o contador passageiro e "Desfazer"; "Lendo agora" com a página atual; feed agrupado com scroll infinito e o Início vazio com sugestões e coleções populares; `/explorar` com busca (Livros, Leitores, Coleções) e as seções. Migration nova: `20261028120000_social.sql`.
  - Testes que ficaram para depois, a pedido do usuário: unitários de `groupActivities` (`features/social/lib/feed.ts`), `formatRelativeTime` e do filtro "em comum"; de banco (`reading_affinity`, `readers_by_affinity`, `feed_activities` com cursor, aceite ao virar público, `search_readers`, `search_collections` sem coleção de perfil privado, `trending_books`); E2E (seguir e pedir, aceitar pelo sino em duas sessões, listas de seguidores, copiar com Desfazer nas três vistas e no feed, voo da capa, "Lendo agora", feed com scroll, Explorar). Cada fluxo foi conferido por uma sonda no dev.
- Fase 6 (Visualizador 3D) entregue em 28/10/2026 na branch `fase-6-visualizador-3d`. Plano: [fase 6](docs/superpowers/plans/2026-10-28-fase-6-visualizador-3d.md).
  - Já existe: "Ver em 3D" sob a capa da página do livro (tocar na capa também abre). A capa voa até o centro e vira um livro de capa dura em 3D, com a contracapa desenhada (sinopse), a lombada com o título, a borda das folhas e a capa tipográfica quando falta imagem. Também: girar arrastando (com mola), pinça e roda para o zoom, duplo clique para voltar, setas, Girar, Resetar e Inclinar (sensor do aparelho). O Abrir gira a capa pela dobra até a folha de rosto (título, autoria, sinopse e citação da comunidade), e dá para folhear até três folhas de citações, com curvatura. O voltar do navegador fecha. Route Handler novo: `/api/books/[id]/quotes`.
  - Testes que ficaram para depois, a pedido do usuário: unitários de `frameBook`/`openFraming`, `bookDimensions`, `wrapLines` e `pageLayout`; de banco (as citações de perfil privado não saem em `/api/books/[id]/quotes` para quem não segue); E2E do SPEC §9 "abrir o visualizador 3D" (abrir, girar, abrir o livro, folhear, Esc e voltar do navegador fecham, foco de volta ao botão, sem WebGL mostra o erro). Cada fluxo foi conferido por uma sonda no dev, e o JS inicial sem three, no build de produção.
- Fase 7 (Toques finais) entregue em 28/10/2026 na branch `fase-7-toques-finais`. Plano: [fase 7](docs/superpowers/plans/2026-10-28-fase-7-toques-finais.md).
  - Já existe: landing contada pela rolagem (capas soltas que viram lombadas na prateleira e o perfil de uma leitora de verdade; Organize · Descubra · Compartilhe com demonstrações vivas; carrossel das coleções populares; chamada final e rodapé); ⌘K completo (a estante de quem vê, o catálogo, leitores e coleções, mais as ações e o "Ir para"); sortear a próxima leitura (o baralho embaralha e vira a carta; "Começar a ler"); scanner de ISBN pela câmera, no celular, e a busca que acha por ISBN-13 ou ISBN-10; imagens de compartilhamento (raiz, livro, perfil e coleção) e a citação como imagem; `sitemap.xml` e `robots.txt`; `/configuracoes` (perfil e @, senha, sair, privacidade, tema, importar do Goodreads, exportar em JSON ou CSV e excluir a conta). Route Handlers novos: `/api/account/export`, `/api/search`, `/api/shelf/want` e `/api/quotes/[id]/image`. Sem migration nova.
  - Testes que ficaram para depois, a pedido do usuário: unitários de `parseCsv`/`toCsv`, `readGoodreadsExport`, `isbn13From`/`isbnFromQuery`, `normalizeQuery` com ISBN, `matchesText`, `pickRandom`, `mixColors` e `fetchAll`; E2E das configurações (privacidade, trocar o @ e a senha, exportar, excluir a conta), da importação do Goodreads (prévia, importar, reimportar sem duplicar), do scanner (com a câmera falsa do Chromium), do sorteio, do ⌘K, das imagens (tamanho, 404 da citação de perfil privado, o botão de compartilhar), do sitemap e do robots, e da landing (a história da rolagem, movimento reduzido, carrossel, `/` com conta indo ao `/inicio`). Cada fluxo foi conferido por uma sonda no dev, e o LCP da landing no build de produção (o título: 1,0s no perfil de celular do Lighthouse, CLS zero).
- Páginas que existem: `/`, `/dev`, `/dev/livro/[slug]`, `/dev/colecao/[slug]`, `/entrar`, `/cadastro`, `/onboarding`, `/inicio`, `/@usuario` (com `/colecoes` e `/citacoes`), `/livro/[id]`, `/colecao/[id]`, `/explorar` e `/configuracoes`, mais `/sitemap.xml` e `/robots.txt`. As demos do `/dev` usam `features/books/sample-books.ts` e `features/collections/sample-collections.ts`, com os mesmos slugs do seed (`seedId` de `scripts/seed-ids.ts` dá o id). Tire os `as Route` de `lib/routes.ts` conforme as páginas nascerem (as dinâmicas e o perfil continuam com ele).
- O catálogo segue `BOOK_LIMITS` (`search-result.ts`) nos checks do banco, e o `source_id` da Open Library é o id da obra sem `/works/`.
- O Google Books só responde com `GOOGLE_BOOKS_API_KEY` (opcional, no `.env.example`; a cota anônima é zero).
- Atualize esta seção ao fim de cada fase.

## Comandos

- `npm run dev` · `npm run build` · `npm run lint` (`next lint` não existe mais; `next build` não roda lint)
- `npm run typecheck` (`next typegen && tsc --noEmit`) · `npm test` (Vitest) · `npm run test:e2e` (Playwright) · `npm run format` / `format:check`
- O Playwright usa o `next dev` da porta 3000 (sobe um se não houver) e roda com 1 worker local: no Windows, vários Chromium headless travam as requisições ao localhost. Na primeira vez, `npx playwright install chromium`.
- O `next dev` às vezes guarda no servidor a versão velha de um módulo já carregado: um Route Handler acusa "… is not a function" para um export novo, ou um provider novo falta no SSR ("precisa do <…Provider>"). Encoste no `next.config.ts` (`touch next.config.ts`): o Next reinicia o servidor no mesmo terminal.
- Banco (CLI do Supabase pelo `.env.local`): `npm run db:link` uma vez; `npm run db:push -- --yes` aplica as migrations; `npm run db:seed -- --yes` aplica também o `supabase/seed.sql`; `npm run db:types` gera `lib/supabase/database.types.ts`. `npm run seed:gerar` refaz o `seed.sql` a partir de `scripts/seed-data.ts` (busca cada obra uma vez na Open Library, com cache em disco).
- `npm run test:db`: testes de banco, em SQL de verdade, pela API de gestão; precisam do `SUPABASE_ACCESS_TOKEN`.
- `npm run build` termina com `scripts/verificar-bundle.mjs` (postbuild): chave secreta no bundle do navegador derruba o build.
- `npm run test:e2e:producao`: build de produção e `next start` na porta 3100 para os `*.producao.spec.ts`. Prefetch, e com ele o par da capa entre páginas, só existe em produção.
- O projeto mora em `C:\Users\Adm\Dev\mybooks`, fora do OneDrive, e não deve voltar para uma pasta sincronizada: o OneDrive transforma arquivos em marcadores de nuvem, o `next dev` perde avisos de mudança e o `next build` falha com EPERM. O `prebuild` (`scripts/limpar-next.mjs`) ainda limpa o `.next` antes do build.
- O repositório não tem remoto: o histórico existe só nesta máquina.
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
- `cn` (em `lib/utils.ts`) vem do pacote `cn` com os tokens próprios registrados (raios `control`/`card`/`cover`, curva `standard`, `shimmer`). Token novo de tema que vira classe entra ali também, ou o merge de classes descarta a classe errada.
- Números exibidos passam por `formatNumber` de `lib/format.ts` (pt-BR, `1.204`).
- O perfil tem URL pública `/@usuario`, servida por `app/(app)/u/[username]` via rewrite. Monte URLs sempre com `lib/routes.ts`; com `typedRoutes`, um `/@...` escrito à mão não compila.
- Adicionar livro: `useAddBook().open()` abre a paleta na busca, `openWith(livro)` já no passo de status e `openForCollection({ id, title })` no modo coleção (escolher põe o livro nela, e a busca segue aberta). A tecla N e o + da pílula só funcionam com conta (`AddBookShortcut`, montado pela barra). "Nova coleção" de qualquer lugar: `useNewCollection()`.
- Copiar livro de outra pessoa: a área fica dentro de um `<CopyBookScope>` (um popover só, ancorado no item) e cada livro usa `<BookShelfAction book fromUserId owned place>` (o Copiar ou o selo "Na sua estante"). O item leva `data-copy-item` e a capa `data-copy-source` (de onde o voo parte); `ShelfViews` recebe `bookAction`, e `Shelf` recebe `accessory` (o chip sob a lombada). O voo e o contador de "Minha estante" vêm de `useShelfFlight()` (`components/shell/shelf-flight.tsx`); o alvo é o `[data-shelf-target]` visível.
- Seguir: sempre `<FollowButton reader state>` (`features/social/components/follow-button.tsx`), com `relationToState` para a relação do perfil. Leitor em lista: `<ReaderRow>`.
- Escanear o código de barras: `useAddBook().openScanner()` abre a paleta na câmera, e o botão só aparece com `useCanScan()` (toque e câmera, que só existe em HTTPS). O leitor (`startBarcodeReader`, `features/shelf/lib/barcode-reader.ts`) usa o `BarcodeDetector` ou o `@zxing` (baixado na hora) num laço próprio, e recebe um `AbortSignal`: no StrictMode, a tentativa cancelada não toca no `<video>` da outra. ISBN: `isbn13From` e `isbnFromQuery` (`features/books/lib/isbn.ts`); o `normalizeQuery` já transforma uma busca que é ISBN no ISBN-13.
- Sortear a próxima leitura: `useNextRead().open(livros?)`; sem livros, busca a fila em `/api/shelf/want`. `pickRandom` (`features/shelf/lib/pick-random.ts`) sorteia com `crypto.getRandomValues`, e `startReading(bookId, today())` passa o livro para Lendo. O dia de quem usa vem de `today()` (`features/shelf/lib/today.ts`): o servidor só conhece o UTC.
- ⌘K: a paleta (`components/shell/command-palette.tsx`) sabe quem está logado por `<CommandPaletteAccount username>`, montado na barra ao lado do `AddBookShortcut`. Os comandos fixos são filtrados por `matchesText` (`lib/text-match.ts`: todas as palavras, sem acento e sem caixa; `foldText` normaliza).
- Importar do Goodreads: o CSV é lido no navegador (`readGoodreadsExport`) e vai em lotes de 5 a `importBooksBatch`; `finishImport` atualiza as tags no fim. `findOrCreateBook` (`features/books/lib/match.ts`) acha o livro no catálogo pelo ISBN (que só vale com o título ou o autor batendo) ou pelo título e o sobrenome do autor, depois na Open Library, e só então cria um manual: reimportar não duplica.
- Imagens de compartilhamento (`lib/og/`): cada segmento tem o seu `opengraph-image.tsx`, e o `<img>` do `next/og` recebe data URI. As fontes são TTF em `assets/fonts` (com o OFL), lidas uma vez no módulo. As cores vêm de `ogColors`, lido dos tokens do tema claro no `globals.css` (o TS não pode ter hex). Capas e avatares chegam por `ogCoverData`/`ogImageData` (cache de um dia; sem imagem, a capa tipográfica), e quando não há o que mostrar entra `genericOgImage`. A citação vira PNG em `/api/quotes/[id]/image`, lida com a sessão (a RLS dá o 404), pelo `<ShareQuoteButton quoteId bookTitle>`: no toque, a folha de compartilhar; no computador, o download.
- O que só aparece no hover usa a variante `can-hover:` (`globals.css`, mouse de verdade): no toque, fica sempre visível. Variante nova com `@media` vai na forma em bloco (`@custom-variant x { @media … { @slot; } }`); a forma curta não gera CSS.

## Next.js 16: o que mais pega

- Middleware agora se chama `proxy.ts` (função `proxy`, runtime Node).
- Cache Components está ligado. `cookies()`, `headers()`, `params` e `searchParams` só podem ser lidos dentro de `<Suspense>` (com skeleton) ou de uma função `'use cache: private'`. Nunca leia a sessão no topo de um layout.
- Todo `'use cache'` leva `cacheLife(...)` e `cacheTag(...)`. Tags: `book:<id>` (o livro e a comunidade dele), `profile:<username>` (perfil, contadores e a relação com quem vê), `shelf:<userId>` (estante e citações), `collection:<id>` (a coleção, os itens e as curtidas; uma lista de coleções leva o de cada card, e o perfil da dona e de quem colabora entra com `profile:<username>`), `catalog` (a busca no catálogo), `feed:<userId>` (a primeira página do feed e as sugestões do Início; seguir, deixar de seguir, aceitar e tirar seguidor atualizam) e `explore` (as listas públicas do Explorar, que só expiram).
- Depois de uma mutação, chame `updateTag(tag)` dentro da Server Action. `revalidateTag` exige dois argumentos: `revalidateTag(tag, 'max')`.
- O cliente despacha Server Actions uma por vez. Nunca use uma para leitura ou busca; use um Route Handler GET.
- Activity mantém até 3 rotas montadas e escondidas. Popover, menu, ⌘K e sheet fecham no cleanup de `useLayoutEffect`. Nenhuma página escreve variável CSS global. O logout usa `window.location.assign`.
- O par da viagem só se forma com o destino na tela no mesmo commit do clique. No dev não há prefetch nenhum (nem `router.prefetch`), e em produção o clique pode chegar antes dele.
  - Ida: links para `/livro/[id]` em listas usam `<BookLink book>` (prefetch completo por intenção). Ele guarda o livro apertado, e o esqueleto da página do livro (`BookPageSkeleton`) já mostra a capa e o título dele. Quando o resto chega, o par sem tipo de navegação leva a classe `fica`: troca a foto sem voar de novo.
  - Volta: o "Voltar" só anima com a origem pronta no clique. Toda página de origem da viagem (aba Estante, Início, página da coleção) exporta `unstable_dynamicStaleTime = 300`, para o roteador reaproveitar os dados dela. Server Action que revalida esvazia esse cache; em produção, o prefetch do "Voltar" cobre esse caso.
  - Nos testes, o prefetch da intenção (`Next-Router-Prefetch: 2`) pode esperar a fila dos prefetches automáticos: espere esse pedido antes do clique.
- O voltar e o avançar do navegador nunca animam: o Next restaura a rota guardada de forma síncrona. A volta animada é um link da própria página.
- `usePathname` e `useSearchParams` em client components ficam dentro de `<Suspense>`; sem isso, com Cache Components, o build falha.
- Aba ativa num layout vem de `useSelectedLayoutSegment`, não do `usePathname`: com o rewrite de `/@usuario`, o pathname do servidor e o do navegador não batem.
- `generateMetadata` que lê `params` precisa de conteúdo dinâmico (em Suspense) no segmento da própria página; senão, com o Partial Prefetching, o dev acusa "URL data in `generateMetadata()`". Por isso cada aba do perfil confere a privacidade sozinha, em vez de o layout esconder a página.
- Filtro guardado na URL sem ida ao servidor: `window.history.replaceState` (o Next acompanha no `useSearchParams`). Veja a aba Estante (`features/shelf/lib/filters.ts`).
- Entrada no histórico sem navegar (o voltar fecha um overlay): `history.pushState({ ...history.state, marca }, "")`, na mesma URL. O Next regrava o `history.state` quando o roteador muda e pode apagar a marca: quem empilhou guarda isso numa ref (veja `ViewIn3D`).
- As barras do app são estáticas: só o que depende da conta (o canto da conta e o "Minha estante") chega em slots com `<Suspense>` (`TopNav slots`, `BottomNav estante`). Barra inteira num Suspense é trocada no meio de um clique e briga com o `aria-hidden` dos modais do Radix.
- O `error.tsx` recebe `{ error: unknown, retry }` (no Next 16.4, `retry` no lugar de `reset`).
- `next/image` usa o loader de `lib/image-loader.ts` (tamanhos S/M/L da Open Library, sem o otimizador da Vercel). Ele pede `default=false`: sem capa, a Open Library responde 404 (e não um GIF de 1px) e a capa tipográfica entra. `priority` foi descontinuado: use `preload` só na capa que é o LCP.

## Dados e segurança (Supabase)

- Clientes:
  - `lib/supabase/server.ts`: com cookies, só no servidor;
  - `client.ts`: no navegador;
  - `public.ts`: sem sessão, para leituras públicas dentro de `'use cache'`;
  - `proxy.ts`: `updateSession`, chamado pelo `proxy.ts` da raiz.
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` podem ir para o cliente. `SUPABASE_SECRET_KEY` fica só em código com `import 'server-only'` ou em scripts. Toda variável nova é documentada em `.env.example`.
- Autorização sempre com `supabase.auth.getClaims()`, via `getViewer()` e `requireViewer()` de `lib/auth.ts`. Nunca confie em `getSession()` no servidor.
- RLS em todas as tabelas. Migrations ficam em `supabase/migrations/`; os tipos gerados ficam em `lib/supabase/database.types.ts` e não são editados à mão. Funções internas ficam no schema `private` (fora da API), com `search_path = ''`.
- Leituras de quem está vendo (`getViewer`, `getShelf`, `getOwnProfile`) usam `'use cache: private'` com `cacheLife` e tag (`profile:<username>`, `shelf:<userId>`). Leitura com a sessão fora de cache faz o dev acusar `Date.now()` no pré-render.
- Leituras e buscas do cliente vão por Route Handler GET: `/api/books/search`, `/api/usernames/availability`, `/api/readers/suggestions`, `/api/collections/editable`, `/api/readers/[id]/follows`, `/api/notifications`, `/api/feed`, `/api/explore/search`, `/api/books/[id]/quotes`, `/api/search` (o ⌘K), `/api/shelf/want` (a fila do sorteio), `/api/account/export` (baixar os dados) e `/api/quotes/[id]/image` (a citação em PNG). No cliente, usam React Query (`components/shell/query-provider.tsx`) a busca da paleta, o feed (`useInfiniteQuery`, com a primeira página do servidor em `initialData`), o sino, a busca do Explorar, as listas de seguidores, as citações do visualizador 3D, a busca do ⌘K e a fila do sorteio.
- O PostgREST devolve até mil linhas por pedido: lista longa (a exportação, o sitemap) vem em páginas, com `fetchAll` (`lib/supabase/fetch-all.ts`).
- Tempo real: Broadcast a partir do banco, nunca Postgres Changes. O trigger `notifications_broadcast` chama `realtime.send` no canal privado `notificacoes:<user_id>` (evento `nova`, payload sem dado sensível), e a política em `realtime.messages` deixa cada pessoa ouvir só o seu tópico. O cliente faz `supabase.realtime.setAuth()`, assina com `{ config: { private: true } }` e busca a lista de novo (`useNotifications`). O `realtime.messages` só ganha a partição do dia quando um cliente conecta; antes disso, `realtime.send` só avisa.
- Busca de livros: `/api/books/search?q=&scope=all|catalog|external`. A paleta pede o catálogo (na hora) e as fontes de fora (Open Library, depois Google Books) em separado. Cada fonte de fora desiste em 10s, e falha não fica no cache (a função em cache lança erro).
- Livro de fora só entra no catálogo pelo servidor: `ensureCatalogBook` (`features/books/lib/catalog.ts`, com a chave secreta de `lib/supabase/admin.ts`) acha pela obra ou pelo ISBN-13; se for novo, baixa a capa uma vez, tira a cor, grava `covers/<id>/S|M|L.webp` (96, 240 e 480) e traduz os assuntos para os gêneros do MyBooks (`toGenreSlugs`). Quem está logado só insere livro manual (RLS). O `addBook` nunca recebe dados do livro do cliente: refaz a busca, do cache, com `findExternalResult`.
- Avatar no banco: o caminho no bucket (`avatars/<id>/<arquivo>`) ou a URL do Google; `avatarSrc` (`features/profile/lib/avatar.ts`) monta a URL. Capa no catálogo: a URL da Open Library ou `covers/<id do livro>`, e só o servidor grava no bucket `covers`.
- Os @ reservados existem em dois lugares, `private.reserved_usernames()` e `RESERVED_USERNAMES` (`features/profile/lib/username.ts`); `tests/db/usernames.test.ts` confere que são iguais.
- Toda Server Action segue a sequência zod → `requireViewer()` → escrita → `updateTag()` → `ActionResult` (`{ ok: true, data } | { ok: false, error }`). Erro esperado nunca vira exceção. A UI aplica `useOptimistic` antes da resposta.
- A Open Library só é chamada pelo servidor, com `User-Agent` identificado e cache. Nada de download em massa.

## Design

- Cores só pelos tokens do `@theme` em `app/globals.css`, sem hex solto em componente. A exceção é a `cover_color` vinda do banco, passada pela variável CSS `--cover`.
- Acento (`#D9541E` no claro, `#F07040` no escuro) só em foco, curtidas e seleção, nunca em texto pequeno (3,8:1 no claro).
- Botão primário invertido: preto no claro, branco no escuro. Bordas de 1px, quase nenhuma sombra, nenhum gradiente decorativo. Campos de formulário usam `--border-strong`.
- Tipografia: `font-serif` (Instrument Serif) nos títulos de páginas e livros, `font-sans` (Geist) na interface, `font-mono` (Geist Mono) nos metadados (páginas, ano, ISBN, contadores).
- Raios de 10px em controles, 14px em cards e 3px em capas. Grade de 4/8px. Ícones `lucide-react` com traço 1.5.
- Capas sempre com `<BookCover>`. A imagem vinda do servidor nasce visível, para o LCP não esperar a hidratação; só a que ainda está chegando entra com fade (`data-loading`). Não volte a esconder a capa até o `onLoad`.
- Texto sobre a cor do livro (lombada, capa tipográfica) usa `coverInk`, que garante 4,5:1 escolhendo a tinta e, se preciso, ajustando o fundo. Nada de opacidade nesse texto: ela derruba o contraste.
- Tema: preferência em `localStorage["mybooks:tema"]`, lida por `useTheme()`. Para trocar, use `ThemeToggle` (ícone) ou `ThemeSelect` (Claro, Escuro e Sistema).
- Todo componente tem os estados de carregando (skeleton com shimmer), vazio (ilustração em traço fino + uma ação), erro e sucesso, e funciona de 360px a 1920px.
- Acessibilidade: navegação por teclado, foco visível, `aria-label` nos botões de ícone, contraste AA.
- Foco: o `:focus-visible` global do `globals.css` desenha o contorno. Não ponha `outline-none` em elemento focável: no Tailwind 4 ele zera `--tw-outline-style` e o `focus-visible:outline-2` passa a desenhar nada (o design-rules barra a combinação). Dentro de algo que rola, use `focus-visible:-outline-offset-2`.
- Item ativo de menu e paleta: fundo sutil mais a barra de acento à esquerda, que dá os 3:1 de que o teclado precisa.
- Performance: Lighthouse ≥ 90 no celular, LCP < 2,5s, CLS perto de zero, 60fps num celular intermediário. Imagens sempre com `next/image` no tamanho certo.

## Movimento

- Use só os presets de `lib/motion.ts`: molas `snappy`, `smooth` e `gentle`, curva `[0.22, 1, 0.36, 1]`, durações de 150/250/400ms e sequência de 35ms. Importe de `motion/react`.
- Anime só `transform` e `opacity` (`filter` com moderação). Tamanho e posição mudam com `layout`/`layoutId`, nunca com width, height, top ou left.
- Elementos interativos usam mola, nada é linear e nada aparece ou some de repente. Toda saída é mais rápida que a entrada.
- `<MotionConfig reducedMotion="user">` fica na raiz. A versão reduzida de qualquer animação é só opacidade.
- O servidor não sabe da preferência de movimento: nada que muda o HTML inicial (variantes, `initial`) pode depender de `useReducedMotion` no render, ou a hidratação não bate. O modo reduzido muda só a transição, como em `entranceTransition`.
- Entre rotas, `<ViewTransition>` do React com `default="none"` e nomes únicos na página (`capa-<id>`, `titulo-<id>`, de `transition-names.ts`). Dentro da mesma tela, Motion. O conteúdo da página entra e sai com `<PageTransition>`.
- Classes das viagens: `capa` (capa para capa), `vira-capa` (lombada para capa, pelo tipo `livro-lombada`), `vira-lombada` (a volta), `titulo` e `fica` (esqueleto para a página pronta, sem tipo). A classe de um par vem do elemento que chega. No CSS, regra genérica (`(*)`) nunca divide a lista de seletores com uma classe, e as curvas `--quina-*` são geradas no design-rules a partir da mola.
- Capa que viaja na mesma tela: `<BookCover layoutId>` dentro de um `<LayoutGroup id>` próprio (veja `ShelfViews`). O raio vai no style em px (`COVER_RADIUS_PX`, espelho de `--radius-cover`), senão o Motion distorce os cantos.
- Arrastar e reordenar (`SortableBooks`): o dnd-kit clássico cuida só do gesto (mouse, toque, teclado e anúncios em pt-BR); a lista muda de ordem durante o arraste e o `layout` do Motion faz a mola. Ele mede sem a transformação em voo (`getClientRect` com `ignoreTransform`). A ordem vem do índice fracionário de `features/collections/lib/position.ts` (`planMove`, `applyMovePlan`, `byPosition`), que ordena por byte como o `collate "C"` do banco.
- Diálogo aberto sem `DialogTrigger` (a espiada da coleção, a paleta, o "Nova coleção" do ⌘K) devolve o foco à mão em `onCloseAutoFocus`; quando dá, passe o botão de abrir como trigger (veja `CollectionForm`).
- Diálogo modal do Radix:
  - **Trava de rolagem:** quem trava a rolagem é o `Overlay`. Diálogo sem ele não trava a página nem marca `data-scroll-locked`.
  - **Avisos:** o diálogo esconde do leitor de tela tudo o que fica fora dele, inclusive o toast do Sonner. Aviso de dentro do diálogo vai numa área `aria-live` dele.
- Contadores usam `<AnimatedNumber>` (NumberFlow). Os dígitos ficam `aria-hidden` e o número formatado vai em texto para leitores de tela.
- `<Stagger>` dispara quando 15% do grupo aparece: em lista longa (o feed), cada item entra no seu `whileInView` (veja `FeedItem`).
- Tempo relativo ("há 5 min") só com `<RelativeTime>`: o servidor manda vazio e o navegador preenche (a hora de quem vê não existe no servidor).
- Lenis fica na raiz, guiado pelo `frame` do Motion. Ele sai do caminho quando a rolagem está travada (evento cancelado ou `body[data-scroll-locked]`, que o Radix põe com modal, gaveta, menu e paleta abertos) e deixa áreas com scroll próprio rolarem sozinhas (`allowNestedScroll`). `data-lenis-prevent` só para o que fugir disso.
- three.js só no visualizador 3D, carregado com `next/dynamic` sem SSR.
- Visualizador 3D (`features/viewer-3d`):
  - **Onde mora o three:** three, R3F e drei só em `scene/`, que o `BookViewer` carrega com `next/dynamic` e pré-carrega na intenção (`preloadBookScene`). O resto (`components/`, `lib/`) não importa three.
  - **Abrir:** é `<ViewIn3D book description pending>`, em volta da capa (veja `BookHero`).
  - **Pose e quadros:** a pose (`useBookPose`) anima motion values com as molas de `lib/motion.ts`. Nada de `PresentationControls`, que traz as molas do react-spring. A cena (`frameloop="demand"`) só desenha quando um valor muda.
  - **Enquadramento:** `frameBook` dá ao mesmo tempo o retângulo do voo do clone e a distância da câmera. Mexeu num, mexa no outro pela mesma conta, ou o crossfade salta.
  - **Luz:** sem tone mapping (`flat`), calibrada para a capa de frente sair a ±5% do clone 2D. Mexeu na luz, refaça a comparação de pixels entre o clone e o 3D.
  - **Cores e texto nos canvas:** as cores vêm de `INK_RGB`/`PAPER_RGB` (com `toHex`) e de `bookColor`/`coverInk`. O texto usa `fontStack` (as variáveis do next/font), depois de `loadCanvasFonts()`.
- Animação do Motion interrompida por outra não resolve `finished`: quem espera uma mola põe um teto de tempo (veja `settled` em `use-book-pose.ts`).
- Landing (`features/landing`):
  - **Título:** o do topo entra só em CSS (keyframe `pagina-entra`, 35ms por palavra), porque é o LCP e não pode esperar o JavaScript.
  - **Capas que viram lombadas:** cada capa solta é uma caixa 3D (`BookBox`) que voa até a lombada de verdade da `Shelf`, medida no DOM; no fim a caixa esmaece e a lombada de verdade assume. A posição fica num invólucro e a perspectiva (`transformPerspective`) na caixa: com a perspectiva antes do deslocamento, as capas da borda aparecem de lado.
  - **Movimento reduzido:** resolvido no CSS, desde o primeiro quadro. `motion-reduce:…!` (com `!`) vence o estilo inline do Motion: a seção perde a rolagem presa e tudo aparece montado.
- Dois `CollectionCard` da mesma coleção na mesma tela disputam o `layoutId`, e o Motion esconde um: separe com um `LayoutGroup id` (veja a landing). O `ProfileHeader` aceita `titleAs="h2"` onde o h1 da página é outro.

## Dependências

- Não adicione `vaul` nem `next-themes`. Gavetas usam `components/ui/sheet`, e o tema usa o script próprio (ver plano).
- Formulários usam react-hook-form + zod. Use `useWatch`, nunca `watch()`, que quebra com o React Compiler.
- Biblioteca nova entra na versão estável mais recente que respeite as peer dependencies. O TypeScript fica na 6.0.x enquanto o typescript-eslint não aceitar a 7, e o ESLint fica na 9.x.

## Testes

- Vitest para utilitários puros, em `*.test.ts` ao lado do código. `tests/design-rules.test.ts` barra hex solto em TS/TSX, classes da paleta padrão do Tailwind e `outline-none` que apaga o foco, e confere que o CSS espelha `lib/motion.ts`, o raio da capa e as tintas `--ink`/`--paper`.
- Playwright em `e2e/`, com seletores por papel (`getByRole`), porque o Activity deixa rotas escondidas no DOM. `e2e/helpers.ts` tem `trackPageErrors`, `presetTheme`, `openCommandPalette` e `waitForHydration` (use logo depois do `goto` quando a interação depende de JS: antes de hidratar, um link segue o HTML e um botão não responde). Nos testes de transição, `e2e/support/view-transitions.ts` grava os pseudo-elementos e as animações de cada uma.
- WebGL no Chromium headless (sondas e E2E do 3D): lance com `--enable-unsafe-swiftshader --use-angle=swiftshader`. Para o sensor de inclinação, dê ao contexto as permissões `accelerometer` e `gyroscope`. O Chromium atual também tem `DeviceOrientationEvent.requestPermission`, que precisa ser chamada na própria classe, não solta.
- Testes de banco em `tests/db/`: SQL dentro de `begin … rollback` (`tests/db/sql.ts`: `createUser`, `asUser`, `asAnon`, `asAdmin`, `check`, `rejects`). Um `update` que a RLS filtra não dá erro, só afeta 0 linhas: confira com `check` depois. O seed está no banco: conte só o que o teste criou.
- E2E com conta: `e2e/support/supabase-admin.ts` cria e apaga contas pelo admin (`createTestUser`, `deleteTestUser`, que também apaga os avatares) e monta os cookies de sessão (`sessionCookies`; com `expired`, o proxy precisa renovar). Nenhum E2E manda e-mail: o link mágico vem do `generateLink`, aberto em `/auth/confirm`.
- O anunciador de rotas do Next também tem `role="alert"`: ao procurar o alerta de um formulário, exclua `#__next-route-announcer__`.
- O NumberFlow deixa o HTML do servidor fora da tela, no light DOM. Leia contadores com `toHaveText(texto, { useInnerText: true })`.
- Texto que chega por streaming fica uns 200ms também numa cópia escondida (`div#S:n[hidden]`), e o Activity guarda abas escondidas com o mesmo texto: procure dentro de um landmark (`getByRole("main")`), por papel, ou com `.filter({ visible: true })`.

## Git

- Uma branch por fase (`fase-N-nome`), com commit ao fim da fase e merge na `master` depois da aprovação.
