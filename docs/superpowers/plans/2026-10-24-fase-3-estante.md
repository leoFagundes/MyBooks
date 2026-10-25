# Fase 3 · Estante: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Busca na Open Library, adicionar e editar livros, perfil `/@usuario` com as 3 visualizações e filtros, e a página do livro, com a capa viajando da estante até o topo dela.

**Architecture:** A transição usa `<ViewTransition>` do React 19.3 com `transitionTypes` do `<Link>`: a capa clicada e a capa do destino têm o mesmo nome e o navegador anima entre as duas. O par só se forma se a página do livro já estiver pronta no clique, então o `<BookLink>` pede o prefetch completo na intenção (mouse, foco ou toque) e o topo da página vem de leitura em cache (`'use cache'` por id). O resto da página do livro (bloco da pessoa e comunidade) chega depois, em `<Suspense>`.

**Tech Stack:** Next 16.4.3 (Partial Prefetching, `transitionTypes`), React 19.3.1 (`ViewTransition`), Motion 14.6.0 (curva de mola convertida para CSS), Supabase, @tanstack/react-query 5.104.5, sharp 0.35.5, node-vibrant 4.0.4, cmdk 1.1.1, Vitest 5.0.5, Playwright 1.64.1.

**Spec:** [SPEC.md](../../../SPEC.md) (§3 momentos 1, 2 e 11; §4; §5.4; §5.5; §5.6; §8; §9) · Arquitetura: [Fase 0](2026-10-24-fase-0-arquitetura.md) (decisões 4, 5 e 8; proposta 3) · Fase anterior: [Fase 2](2026-10-24-fase-2-supabase-e-conta.md)

**Pré-requisito:** a Fase 2 concluída (schema, seed, login e onboarding). As Tasks 1 a 4 não usam o banco e podem rodar antes.

## Global Constraints

- Momento 1: a capa clicada na estante viaja até o topo da página do livro, e o título acompanha. Sem suporte a View Transitions, crossfade.
- Momento 2: troca animada entre Estante, Grade e Lista (já existe) e filtros entrando e saindo com `layout`. Momento 11: skeleton com shimmer e atualização otimista em mudar status, nota e página.
- Movimento reduzido: só opacidade. Só presets de `lib/motion.ts`; a mola da transição é a `smooth` convertida em `linear()`.
- Ao salvar um livro no catálogo, extrair `cover_color` (node-vibrant) e guardar a capa em 3 larguras WebP no bucket `covers` (proposta 3); busca e seed usam os tamanhos S/M/L da Open Library.
- Perfil e estante são a mesma página; abas Estante · Coleções · Citações; status Todos · Lido · Lendo · Quero ler · Abandonado; busca, filtros (gênero, nota, ano) e ordenação.
- Adicionar livro: botão +, ⌘K ou tecla N; resultados instantâneos navegáveis pelo teclado; passo compacto com status, nota em meia estrela e data; Enter salva. "Cadastrar manualmente" com prévia ao vivo da capa gerada; livros manuais entram no catálogo.
- Página do livro: brilho sutil da `cover_color` no topo, capa com inclinação, metadados em mono, sinopse com "ler mais" (altura animada), bloco da pessoa (status, nota, datas, página atual, resenha que salva sozinha, citações com página) e comunidade.
- Open Library só pelo servidor, com cache e `User-Agent` identificado, sem o e-mail do usuário; no máximo 1 req/s sem contato.
- Vitest para a normalização da Open Library; Playwright para adicionar livro.
- Interface 100% pt-BR; foco visível; contraste AA; 360–1920px.

## A transição da capa

- `BookLink` envolve o `<Link>`: `prefetch={intenção ? true : "auto"}` (receita do Next para Partial Prefetching), intenção em `pointerenter`, `focus` e `pointerdown`; `transitionTypes` `["livro-capa"]` ou `["livro-lombada"]`; registra a si mesmo como origem da transição no `pointerdown`/teclado.
- Nomes `capa-<id>` e `titulo-<id>`: no destino, sempre; na origem, só a instância registrada (o mesmo livro pode aparecer duas vezes na tela, e nome repetido cancela a transição inteira). Com o Activity, a página de origem continua montada e com o nome, então o voltar do navegador refaz o caminho ao contrário.
- Classes: capa do destino `share={{ "livro-lombada": "lombada", default: "capa" }}`; capa de origem `share="capa"`; lombada `share="lombada"`; `default="none"` em todas, para não animarem em transições alheias.
- `.capa`: grupo com a mola `smooth` (`750ms linear(…)`), um desfoque de 2px aos 30% para esconder a interpolação e crossfade das imagens. `.lombada`: a lombada gira 90° em Y e some enquanto a capa entra girando de −90° a 0, como um livro tirado da prateleira e virado de frente. Título: crossfade junto com o grupo; sem título na origem, ele chega com fade, 12px para cima e blur de 4px a 0, 120ms depois da capa.
- O conteúdo das páginas sai em 150ms e entra em 250ms (fade, 8px, blur), com atraso de 120ms. A barra superior fica parada (`viewTransitionName: site-header`).
- No clique, a inclinação e o reflexo da capa voltam a zero na hora, para a foto de saída ficar reta.
- Movimento reduzido: grupos sem deslocamento e só crossfade de 150ms. Sem View Transitions no navegador: fade do Motion na entrada.

## Fora desta fase

- "Sortear próxima leitura", scanner de ISBN e imagem de citação: Fase 7. Afinidade, livros em comum, "Copiar" e o selo "Na sua estante" no perfil de outra pessoa: Fase 5. "Ver em 3D": Fase 6. "Adicionar à coleção": Fase 4. A página do livro só mostra as ações que já funcionam.
- "Lendo agora" no `/inicio` entra com o resto do Início, na Fase 5; aqui a página atual se edita na página do livro.

## Review Focus

1. **Transição que não forma par:** destino caindo no fallback do Suspense, nome repetido na página, toque no celular sem hover, voltar do navegador. Espião de View Transitions no build de produção (Tasks 3 e 11).
2. **Movimento reduzido e navegador sem suporte:** nada se desloca, só opacidade; sem View Transitions a navegação segue normal. Tasks 1 e 3.
3. **Dados estranhos da Open Library:** sem capa, sem ano, autores vazios, só ISBN-10, título enorme, edições duplicadas da mesma obra. Unitários na Task 4, deduplicação na Task 6.
4. **Pressa e desfazer:** adicionar o mesmo livro duas vezes seguidas, desfazer depois de navegar, sair da página com a resenha ainda salvando. Tasks 7 e 10.
5. **Perfil de outra pessoa ou privado:** estante oculta para quem não segue, edição só no próprio perfil. Task 8.

---

### Task 1: Base da transição

**Files:**

- Modify: `app/globals.css`, `components/shell/top-nav.tsx`, `tests/design-rules.test.ts`, `playwright.config.ts`, `package.json`
- Create: `components/motion/page-transition.tsx`, `e2e/support/view-transitions.ts`

**Interfaces:**

- Produces: variáveis `--spring-smooth` (`linear(…)`) e `--spring-smooth-duration` no CSS, conferidas contra `spring({ keyframes: [0, 1], ...springs.smooth })` do Motion; regras `::view-transition-*` das classes `capa`, `lombada`, `titulo`, `titulo-chega`, `pagina-entra`, `pagina-sai` e do `site-header`; `<PageTransition>` (enter/exit das páginas, fade do Motion sem suporte); projeto Playwright `producao` (build e `next start` na porta 3100) e script `test:e2e:producao`; `spyViewTransitions(page)` e `recordedTransitions(page)` (registram, no `ready` de cada `startViewTransition`, os pseudo-elementos animados com nome da animação, duração e atraso).

- [ ] **Step 1: Testes:** design-rules confere `--spring-smooth` e a duração com a mola do Motion; um E2E no projeto `producao` navega da landing para o `/dev` e o espião registra a transição com o grupo `site-header` sem animação.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar. Expected: PASS.
- [ ] **Step 5:** Commit `feat(movimento): base das transições entre páginas`.

### Task 2: BookLink e nomes da transição

**Files:**

- Create: `features/books/components/book-link.tsx`, `features/books/components/cover-transition.tsx`, `features/books/lib/transition-names.ts`, `features/books/lib/transition-names.test.ts`
- Modify: `features/books/components/book-cover.tsx`, `features/books/components/book-spine.tsx`, `features/books/components/shelf.tsx`, `features/shelf/components/shelf-views.tsx`, `components/shell/providers.tsx`

**Interfaces:**

- Produces: `coverName(id)` → `"capa-<id>"`, `titleName(id)` → `"titulo-<id>"`; `<CoverTransitionProvider>` e `useTransitionSource(bookId)` → `{ isSource: boolean; markSource(): void }` (uma origem por vez no app inteiro); `<BookLink book href? variant="cover" | "spine">`; `BookCover` com `transitionName?` e `resetTilt` no clique; `Shelf`/`ShelfViews` com `bookHref?: (book) => Route` (padrão `routes.book`).

- [ ] **Step 1: Testes:** `coverName`/`titleName` (id com caracteres fora de `[a-z0-9-]` vira um nome válido de CSS, e ids diferentes não colidem); E2E (dev): ao apertar numa capa da grade, só ela ganha `view-transition-name` durante a navegação, mesmo com o mesmo livro em outra seção da página.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(livros): BookLink com prefetch na intenção e nomes da transição`.

### Task 3: Topo da página do livro e a viagem da capa

**Files:**

- Create: `features/books/components/book-hero.tsx`, `features/books/components/ambient-glow.tsx`, `features/books/components/synopsis.tsx`, `features/books/components/book-page-skeleton.tsx`, `app/(app)/dev/livro/[slug]/page.tsx`, `e2e/transition.spec.ts`
- Modify: `app/(app)/dev/_components/views-demo.tsx`, `features/books/sample-books.ts` (sinopse)

**Interfaces:**

- Consumes: Tasks 1 e 2.
- Produces: `<BookHero book>` (capa grande com inclinação e nome `capa-<id>`, título com `titulo-<id>`, autores, linha de metadados em mono), `<AmbientGlow color>` (brilho da `cover_color` no container da página, sem variável CSS global), `<Synopsis text>` ("ler mais" com altura animada por `layout`); página de demonstração `/dev/livro/[slug]` com os livros de exemplo, ligada à seção 10 do `/dev`.

- [ ] **Step 1: Testes** (`e2e/transition.spec.ts`, projeto `producao`): da Grade, da Lista e da Estante para o livro, o espião registra o par `::view-transition-old(capa-<id>)` e `::view-transition-new(capa-<id>)`; da Estante, a capa nova usa a animação da classe `lombada`; voltar pelo navegador forma o par de novo; com movimento reduzido, o grupo da capa não se desloca (duração 0); "ler mais" abre a sinopse e o botão vira "ler menos".
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Quadros no meio do voo (animações pausadas a 25, 50 e 75%) da Grade e da Estante, claro e escuro, para a revisão visual.
- [ ] **Step 6:** Commit `feat(livros): a capa viaja até o topo da página do livro`.

### Task 4: Normalização da Open Library e do Google Books

**Files:**

- Create: `features/books/lib/open-library.ts`, `features/books/lib/open-library.test.ts`, `features/books/lib/google-books.ts`, `features/books/lib/google-books.test.ts`, `features/books/lib/__fixtures__/*.json`

**Interfaces:**

- Produces: `type SearchResult = { source: "openlibrary" | "google"; sourceId; title; subtitle; authors; publishedYear; pageCount; isbn13; isbn10; language; genres; coverUrl; catalogId?: string }`; `normalizeOpenLibraryDoc(doc): SearchResult | null`; `normalizeGoogleVolume(volume): SearchResult | null`; `dedupeResults(results)` (mesma obra ou mesmo ISBN-13 fica uma vez, preferindo quem tem capa); `searchOpenLibrary(q, fetcher)` com `User-Agent` `MyBooks/0.1`, sem contato (limite de 1 req/s até haver um e-mail de contato, pergunta 3 da Fase 0).

- [ ] **Step 1: Testes** com respostas reais gravadas em `__fixtures__`: obra com capa e ISBNs; sem capa (`coverUrl` null); sem ano; autores ausentes (lista vazia, não "undefined"); só ISBN-10; título com 300+ caracteres cortado no limite do banco; edições duplicadas viram uma; volume do Google sem `imageLinks`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(livros): normalização da Open Library e do Google Books`.

### Task 5: Busca unificada

**Files:**

- Modify: `app/api/books/search/route.ts`
- Create: `features/books/queries.ts` (busca no catálogo e externa com `'use cache'`), `e2e/search.spec.ts`

**Interfaces:**

- Consumes: `search_catalog` (Fase 2), Task 4.
- Produces: GET `/api/books/search?q=` → `{ results: SearchResult[] }`: catálogo primeiro (marca `catalogId`), depois Open Library (cache de 1 dia por consulta normalizada), Google Books se a Open Library falhar ou vier vazia; consultas com menos de 2 letras devolvem lista vazia.

- [ ] **Step 1–5:** E2E "sertao" acha o livro do catálogo primeiro; consulta de 1 letra vem vazia; FAIL → implementar → PASS; commit `feat(livros): busca no catálogo e na Open Library`.

### Task 6: Livro novo no catálogo

**Files:**

- Create: `features/books/lib/catalog.ts` (`server-only`), `features/books/lib/cover-pipeline.ts`, `features/books/lib/cover-pipeline.test.ts`, `tests/db/catalog.test.ts`

**Interfaces:**

- Produces: `ensureCatalogBook(result, viewerId): Promise<string>` (devolve o id: acha por `(source, source_id)` ou ISBN-13; senão baixa a capa uma vez, extrai `cover_color`, grava 3 larguras WebP em `covers/<book_id>/` com a chave secreta e insere o livro com `created_by`); `pickCoverColor(swatches)` (puro: Vibrant, depois Muted, depois null).

- [ ] **Step 1–5:** testes de `pickCoverColor` e de deduplicação por ISBN no banco; FAIL → implementar → PASS; commit `feat(livros): catálogo com cor e capas em três larguras`.

### Task 7: Adicionar livro

**Files:**

- Create: `features/shelf/components/add-book/*`, `features/shelf/schemas.ts`, `features/shelf/schemas.test.ts`, `features/books/components/star-rating.tsx`, `e2e/add-book.spec.ts`
- Modify: `features/shelf/actions.ts`, `components/shell/command-palette.tsx`, `components/shell/top-nav.tsx`, `components/shell/bottom-nav.tsx`, `components/shell/providers.tsx`

**Interfaces:**

- Produces: `<AddBookProvider>` e `useAddBook()` (abre pelo +, pelo item "Adicionar livro" do ⌘K e pela tecla N fora de campos de texto); paleta com React Query (debounce de 200ms, mantém os resultados anteriores); passo compacto (status, `<StarRating>` com meia estrela pelo teclado, data de início ou fim conforme o status); Enter salva por `addBook(input)` (zod → `requireViewer` → `ensureCatalogBook` → upsert em `user_books` → `updateTag("shelf:<userId>")`); toast "Na sua estante · Desfazer" (desfazer remove); "Cadastrar manualmente" com prévia ao vivo da capa gerada e `createManualBook`.

- [ ] **Step 1–5:** schemas (nota 0.5 a 5 em meios, datas coerentes); E2E: N abre a paleta, busca, setas e Enter escolhem, Enter salva, o toast aparece e "Desfazer" tira o livro; apertar Enter duas vezes não duplica; cadastro manual mostra a capa gerada mudando com o título; FAIL → implementar → PASS; commit `feat(estante): adicionar livro pela busca ou à mão`.

### Task 8: Perfil

**Files:**

- Create: `app/(app)/u/[username]/layout.tsx`, `app/(app)/u/[username]/page.tsx`, `app/(app)/u/[username]/colecoes/page.tsx`, `app/(app)/u/[username]/citacoes/page.tsx`, `features/profile/components/profile-header.tsx`, `features/profile/components/edit-profile-sheet.tsx`, `supabase/migrations/<ts>_profile_counts.sql`, `tests/db/profile-counts.test.ts`, `e2e/profile.spec.ts`
- Modify: `next.config.ts` (rewrites de `/@:username` e `/@:username/:path*`), `lib/routes.ts`

**Interfaces:**

- Produces: cabeçalho (avatar, nome, @, bio, gêneros, contadores em mono com NumberFlow); `profile_counts(user_id)` (`security definer`; contadores aparecem até em perfil privado, que mostra o cabeçalho); "Editar perfil" no próprio perfil (sheet com nome, bio, avatar, gêneros e privacidade, reaproveitando o onboarding); perfil privado para quem não segue: só o cabeçalho e um aviso gentil; aba Coleções com estado vazio (a Fase 4 preenche); aba Citações com as citações da pessoa.

- [ ] **Step 1–5:** RLS e contagens de `profile_counts`; E2E: `/@ana` abre o perfil com as abas e o indicador; perfil privado de quem não sigo mostra só o cabeçalho; editar perfil só no meu; FAIL → implementar → PASS; commit `feat(perfil): perfil com cabeçalho, abas e edição`.

### Task 9: Aba Estante

**Files:**

- Create: `features/shelf/lib/filters.ts`, `features/shelf/lib/filters.test.ts`, `features/shelf/components/shelf-toolbar.tsx`, `e2e/shelf.spec.ts`
- Modify: `app/(app)/u/[username]/page.tsx`, `features/shelf/queries.ts`

**Interfaces:**

- Produces: `filterShelf(entries, filters)` e `sortShelf(entries, sort)` (puros; busca sem acento por título e autor; gênero, faixa de nota, ano; ordenação por recentes, título, autor, nota e ano); estado na URL (`?status=&q=&genero=&nota=&ano=&ordem=&vista=`), lido dentro de `<Suspense>`; controle segmentado de status com contagens; chips de filtro entrando e saindo com `layout`; `ShelfViews` com os livros filtrados; estado vazio por filtro com ação de limpar.

- [ ] **Step 1–5:** unitários de filtro e ordenação; E2E: Lido filtra e a URL guarda; busca "sertao"; limpar filtros volta tudo; a vista escolhida sobrevive ao recarregar; FAIL → implementar → PASS; commit `feat(estante): status, busca, filtros e ordenação`.

### Task 10: Página do livro

**Files:**

- Create: `app/(app)/livro/[id]/page.tsx`, `features/shelf/components/shelf-entry-block.tsx`, `features/shelf/components/review-editor.tsx`, `features/shelf/components/quotes-block.tsx`, `features/books/components/community-block.tsx`, `e2e/book-page.spec.ts`
- Modify: `features/shelf/actions.ts`, `features/books/queries.ts`

**Interfaces:**

- Produces: `getBook(id)` (`'use cache'`, `cacheTag("book:<id>")`); bloco da pessoa com `updateShelfEntry`, `saveReview` (salva sozinha 800ms depois da última tecla, indicador "Salvando…"/"Salvo", e salva na hora ao sair da página), `addQuote`/`removeQuote`, `removeFromShelf` (com confirmação), tudo com `useOptimistic`; comunidade (quem leu com avatares empilhados, resenhas públicas, coleções com o livro); quem não tem o livro vê "Adicionar à estante".

- [ ] **Step 1–5:** E2E: mudar status e nota reflete na hora e persiste ao recarregar; resenha salva sozinha; citação com página entra e sai; remover pede confirmação e tira da estante; livro inexistente dá 404 gentil; FAIL → implementar → PASS; commit `feat(livros): página do livro com seu bloco e a comunidade`.

### Task 11: Tudo ligado

**Files:**

- Modify: perfil, `/inicio`, `features/books/sample-books.ts` (ids iguais aos do seed), `e2e/transition.spec.ts`

**Interfaces:**

- Produces: estante do perfil e do `/inicio` usando `BookLink` para `/livro/[id]`; a viagem da capa do perfil real até a página real do livro.

- [ ] **Step 1–5:** E2E (produção): do perfil, Grade e Estante, para a página do livro, o par se forma e o voltar refaz; FAIL → ligar → PASS; commit `feat(estante): capas e lombadas levam à página do livro`.

### Task 12: Fechamento da fase

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run test:db && npm run test:e2e && npm run test:e2e:producao && npm run build`. Expected: exit 0.
- [ ] **Step 2:** Capturas (perfil nas 3 visualizações, página do livro, paleta de adicionar; claro, escuro, 375px e 1440px) e quadros da transição.
- [ ] **Step 3:** CLAUDE.md e commit `docs: estado da fase 3`.
