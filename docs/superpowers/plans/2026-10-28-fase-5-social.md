# Fase 5 · Social: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A parte social: seguir (com pedido nos perfis privados), seguidores e seguindo, notificações em tempo real, afinidade literária e livros em comum, copiar livros com a capa voando até a estante, "Lendo agora" e feed agrupado no Início, e a página Explorar.

**Architecture:** O banco da Fase 2 já grava atividades e avisos por trigger; esta fase lê isso. As leituras com sessão ficam em `'use cache: private'` (tags `profile:`, `shelf:` e a nova `feed:<userId>`); as públicas do Explorar em `'use cache'` com o cliente sem sessão. O feed vem de uma RPC (`feed_activities`, com a RLS das atividades) e é agrupado em TypeScript; a primeira página chega do servidor e as outras por um Route Handler com `useInfiniteQuery`. Os avisos chegam pelo Broadcast do Realtime: um trigger em `notifications` chama `realtime.send` num canal privado por pessoa, e o cliente busca a lista de novo pelo Route Handler. Copiar é uma Server Action; o voo da capa é um clone num portal, animado só com `transform` e `opacity`.

**Tech Stack:** Next 16.4.3, React 19.3.1, Motion 14.6.0, Supabase (Postgres, RLS, Realtime Broadcast, pg_trgm e full-text), @supabase/ssr 0.12.7, @tanstack/react-query 5.105.0, @number-flow/react 0.6.2, radix-ui 1.8.1, sonner 2.0.8, zod 4.6.7.

**Spec:** [SPEC.md](../../../SPEC.md) (§3 momentos 3, 6, 7, 10 e 11; §5.3; §5.4; §5.9; §5.10; §6) · Arquitetura: [Fase 0](2026-10-24-fase-0-arquitetura.md) · Banco social: [Fase 2](2026-10-24-fase-2-supabase-e-conta.md) · Estante e perfil: [Fase 3](2026-10-24-fase-3-estante.md) · Coleções: [Fase 4](2026-10-25-fase-4-colecoes.md)

**Pré-requisito:** Fases 2 a 4 integradas à `master` (28/10/2026).

## Global Constraints

- Perfil privado: quem não segue vê só o cabeçalho, e seguir exige aprovação.
- No perfil de outra pessoa: "Afinidade literária" em % e "N livros em comum" (clicar filtra a estante por eles); botão "Copiar" ao passar o mouse em cada livro, que abre um popover para escolher o status (padrão: Quero ler) e a coleção; selo "Na sua estante" nos livros que você já tem.
- Copiar livro: um clone da capa voa em curva até o ícone da estante na barra superior, que dá um pulinho. O contador muda com NumberFlow e aparece o toast "Na sua estante · Desfazer".
- Início: "Lendo agora", faixa horizontal com capas e progresso; tocar numa capa abre um popover para atualizar a página atual. Feed de quem você segue, com atividades agrupadas ("Ana adicionou 3 livros a Quero ler"), capas clicáveis e opção de copiar direto do feed. Scroll infinito. Com o feed vazio, sugestões de leitores e coleções populares.
- Explorar: busca única com abas Livros · Leitores · Coleções (full-text do Postgres + pg_trgm). Seções: Coleções populares, Livros mais adicionados na semana e Leitores com afinidade com você.
- Notificações num popover, em tempo real (Supabase Realtime): novo seguidor, pedido para seguir, curtida e cópia de coleção, convite para coleção colaborativa.
- Banco: função `reading_affinity(a, b)`, que pondera livros em comum e gêneros, e uma view com os livros em alta na semana. RLS em tudo.
- Movimento: "Seguir" → "Seguindo" com `AnimatePresence mode="popLayout"`; botões com scale 0.97; atualização otimista em seguir e copiar; entradas em sequência de 35ms; popovers e modais entram de 0.96 e saem mais rápido. Só presets de `lib/motion.ts`; movimento reduzido: só opacidade.
- Interface 100% pt-BR; foco visível; contraste AA; 360–1920px; todo componente com carregando, vazio, erro e sucesso.

## Decisões

1. **Avisos pelo Broadcast, não pelo Postgres Changes.** A documentação do Supabase recomenda o Broadcast: o Postgres Changes autoriza cada evento para cada inscrito, numa fila só. Um trigger `after insert` em `notifications` chama `realtime.send({ id, type }, 'nova', 'notificacoes:<user_id>', true)`, dentro de um `begin … exception` para que o aviso nunca derrube a escrita que o gerou. Uma política em `realtime.messages` deixa cada pessoa ouvir só o próprio tópico. O payload não carrega nada sensível: o cliente busca a lista de novo em `/api/notifications`.
2. **Pedidos no topo do popover.** "Pedidos para seguir" lista todos os pendentes (vindos de `follows`, não dos avisos), com Aceitar e Recusar. Embaixo vêm os 30 avisos mais novos. Abrir o popover marca tudo como lido. O selo do sino tem as cores invertidas do botão primário (o acento é só para foco, curtidas e seleção).
3. **Perfil que vira público aceita os pedidos pendentes** (trigger em `profiles`). O trigger de `follows` da Fase 2 já transforma o pedido em aviso de seguidor.
4. **Afinidade:** `reading_affinity(a, b) returns table (score int, common_books int)`, `security invoker`, para contar só o que quem pergunta pode ver. Nos livros, o coeficiente de Ochiai: em comum / √(|A|·|B|). Nos gêneros, o cosseno entre os vetores de cada pessoa (cada gênero de um livro da estante vale 1, e cada gênero favorito vale 2). `score = round(100 · √(0,65·livros + 0,35·gêneros))`, e null quando um dos lados não tem livro nem gênero favorito. Só aparece quando quem vê pode ver a estante.
5. **Feed:** `feed_activities(before_at, before_id, max_rows)` traz as atividades de quem a pessoa segue (aceitos), na ordem `(created_at, id)` decrescente. O agrupamento é em TypeScript: mesma pessoa, mesmo tipo e, em coleções, a mesma coleção, dentro de 24h da mais nova do grupo. A página tem 60 linhas; numa página cheia, o último grupo fica para a próxima (a não ser que seja o único). O cursor é `{ at, id }`.
6. **Copiar:** `copyBook` grava em `user_books` com `copied_from_user_id`. Livro que já está na estante não muda e volta `added: false` ("Já estava na sua estante", sem Desfazer). O popover oferece Quero ler (o padrão), Lendo e Lido (Abandonado não faz sentido numa cópia) e a coleção, entre as que a pessoa edita. O voo e o selo "Na sua estante" são otimistas; o contador e o toast esperam a resposta. Desfazer tira da estante e, se a cópia pôs o livro na coleção, de lá também.
7. **"Copiar" sem mouse.** No toque (`@media (hover: none)`), o botão fica sempre visível na Grade e na Lista. Na Estante (lombadas), um chip aparece logo abaixo da linha da prateleira, sob a lombada que sobe, com o mouse ou o foco (Tab da lombada vai para o chip). Um único popover por área (`CopyBookScope`), ancorado no livro, para não fechar quando o chip some.
8. **Contador quieto.** "Minha estante" só mostra o número por 2,4s depois de uma cópia, de n−1 para n com NumberFlow, e some. No resto do tempo a barra fica como está.
9. **Explorar é público.** Sem busca, as três seções. "Leitores com afinidade com você" só aparece com conta. Os livros em alta vêm da view `trending_books`, que conta as adições da semana e as de sempre. Se a semana estiver vazia, a seção vira "Livros mais adicionados". Com busca (`?q=&aba=livros|leitores|colecoes`, guardada com `replaceState`), os resultados vêm de `GET /api/explore/search` com React Query: a partir de 2 letras e com debounce de 200ms. Livros pelo `search_catalog` da Fase 3; leitores por trigramas de @ e nome sem acento; coleções públicas por full-text em português de título e descrição, mais trigramas no título.
10. **Seguidores e seguindo:** os contadores do cabeçalho viram botões quando quem vê pode ver o conteúdo, e cada um abre um diálogo com a lista e o botão Seguir. No seu perfil, "Tirar" remove um seguidor, depois de confirmar num popover.
11. **Um botão Seguir só** (`FollowButton`): "Seguir" → "Seguindo"; perfil privado: "Pedir para seguir" → "Pedido enviado" (clicar de novo cancela). Deixar de seguir um perfil privado pede confirmação. O onboarding passa a usar o mesmo botão. Visitante sem conta vê "Seguir", que leva ao Entrar.
12. **Lendo agora:** a faixa sai da estante de quem vê (status Lendo, da mexida por último à primeira). Cada capa é um botão que abre o popover "Em que página você está?" (número, Enter salva, no máximo o total de páginas quando se sabe) e o link "Abrir o livro". A barra de progresso anima `scaleX`. O `MyShelf` provisório sai do Início.
13. **Testes em espera** (pedido do usuário, 27/10). Cada task valida com typecheck, lint e uma sonda no dev (Playwright no scratchpad). A lista adiada vai para o CLAUDE.md.

## Fora desta fase

- `/configuracoes` (privacidade, exportar, excluir conta, Goodreads): Fase 7. A privacidade continua no "Editar perfil".
- Busca global no ⌘K e imagens OG: Fase 7. Aviso de "pedido aceito", push e e-mail: fora do SPEC.

## Review Focus

1. **Vazamento de perfil privado:** feed, afinidade, livros em comum, listas de seguidores, busca e livros em alta de quem não segue um perfil privado não mostram nada da estante dele. Conferido na sonda de banco da Task 1 e nas sondas das Tasks 3, 5 e 10.
2. **Clique duplo e corrida:** seguir duas vezes, aceitar um pedido já cancelado, copiar duas vezes, Desfazer depois de sair da página: um registro só, mensagem gentil, nada quebra. Tasks 2, 4 e 7.
3. **Tempo real que cai:** sem conexão ou com o token vencido, abrir o popover busca a lista certa. A inscrição sai no cleanup e não duplica no StrictMode. Task 4.
4. **Borda da paginação do feed:** grupo partido entre páginas, horários iguais (cursor composto), quem não segue ninguém, atividade de livro ou coleção que sumiu. Task 10.
5. **Toque, teclado e movimento reduzido:** copiar sem mouse, foco que volta ao livro quando o popover fecha, rótulos ("Copiar Duna para a sua estante"), sem voo com movimento reduzido. Tasks 6 e 7.

---

### Task 1: Banco da fase

**Files:**

- Create: `supabase/migrations/20261028120000_social.sql`
- Modify: `lib/supabase/database.types.ts` (gerado)

**Interfaces:**

- Produces: trigger `notifications_broadcast` (`realtime.send`, evento `nova`, tópico `notificacoes:<user_id>`) e política `people hear their own notifications` em `realtime.messages`; trigger `profiles_accept_pending` (privado → público aceita os pendentes); `public.reading_affinity(a uuid, b uuid) returns table (score int, common_books int)`; `public.readers_by_affinity(max_results int default 6)` (as colunas de `suggested_readers` mais `score`, `common_books`; fora quem já segue e o próprio; só `score` não nulo, do maior ao menor); `public.feed_activities(before_at timestamptz default null, before_id uuid default null, max_rows int default 60) returns setof public.activities` (entre 1 e 100 linhas); view `public.trending_books` (`security_invoker`): `book_id`, `week_adds`, `total_adds`; `public.popular_collections(max_results int default 8) returns setof public.collections` (públicas com pelo menos um livro, por curtidas e depois pelo número de livros); `public.search_readers(q text, max_results int default 20) returns setof public.profiles` (onboarded); `public.search_collections(q text, max_results int default 20) returns setof public.collections`; índices GIN `profiles_search_idx` (trigramas de `search_key(username || ' ' || display_name)`), `collections_search_idx` (`to_tsvector('portuguese', …)`) e `collections_title_search_idx` (trigramas do título).

- [ ] **Step 1:** Escrever a migration (funções em `public` com `set search_path = ''`, `stable`; as internas em `private`).
- [ ] **Step 2:** `npm run db:push -- --yes` e `npm run db:types`. Expected: exit 0; `database.types.ts` com as funções e a view novas.
- [ ] **Step 3: Sonda de banco** (SQL com `tests/db/sql.ts`, em `begin … rollback`): a afinidade de duas leitoras do seed fica entre 0 e 100, e `common_books` bate com a contagem à mão; a afinidade com um perfil privado que não se segue tem `common_books = 0`; `feed_activities` só traz quem se segue e respeita o cursor; perfil que vira público tem os pedidos aceitos; `search_readers('sertao')` acha acentos; `search_collections` não traz coleção privada; inserir um aviso não falha.
- [ ] **Step 4:** Commit `feat(banco): afinidade, feed, explorar e avisos em tempo real`.

### Task 2: Seguir

**Files:**

- Create: `features/social/components/follow-button.tsx`
- Modify: `features/social/actions.ts`, `features/social/types.ts`, `app/(app)/u/[username]/layout.tsx`, `features/profile/components/onboarding/readers-step.tsx`

**Interfaces:**

- Produces: `FollowState = "none" | "accepted" | "pending"` e `ReaderState = FollowState | "self" | "visitor"` (`types.ts`); `relationToState(relation: ProfileRelation): ReaderState`; `<FollowButton reader={{ id, username, isPrivate }} state: ReaderState size?: "sm" | "default" onChange?(state: FollowState)>`; Server Actions `acceptFollowRequest(followerId)`, `declineFollowRequest(followerId)` e `removeFollower(followerId)` (zod → `requireViewer()` → escrita → `updateTag` de `profile:` dos dois e `feed:` → `ActionResult`); `followReader` e `unfollowReader` também atualizam `feed:<viewerId>`.

- [ ] **Step 1:** Implementar o botão (useOptimistic, `SwapText`, confirmação em Dialog ao deixar de seguir um perfil privado: "Deixar de seguir @ana?" / "O perfil é privado: para ver a estante de novo, você vai precisar pedir."), as ações e o botão no cabeçalho dos outros perfis; o onboarding usa o mesmo botão.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** num perfil público, "Seguir" vira "Seguindo" e o contador de seguidores sobe; recarregando, continua; num privado, "Pedir para seguir" vira "Pedido enviado", e o aviso de perfil privado fala do pedido; dois cliques rápidos terminam num estado coerente.
- [ ] **Step 4:** Commit `feat(social): seguir e pedir para seguir`.

### Task 3: Seguidores e seguindo

**Files:**

- Create: `app/api/readers/[id]/follows/route.ts`, `features/social/components/follow-list.tsx`, `features/social/components/reader-row.tsx`
- Modify: `features/social/queries.ts`, `features/profile/components/profile-header.tsx`, `app/(app)/u/[username]/layout.tsx`

**Interfaces:**

- Consumes: Task 2.
- Produces: `readFollowList(supabase, profileId, list: "followers" | "following", viewerId: string | null): Promise<ReaderListItem[]>` com `ReaderListItem = SuggestedReader & { state: ReaderState }`; `followStates(supabase, viewerId, ids): Promise<Record<string, FollowState>>`; `GET /api/readers/[id]/follows?lista=seguidores|seguindo` → `{ readers: ReaderListItem[] }`; `<ReaderRow reader state detail? action?>` (avatar, nome, @, uma linha de detalhe, botão Seguir), usado também no Explorar e no feed vazio; `ProfileHeader` ganha `lists?: { profileId: string; isSelf: boolean }`: com ele, seguidores e seguindo viram botões que abrem o diálogo (lista com skeleton, vazio "Ninguém por aqui ainda", erro com "Tentar de novo"); no próprio perfil, "Tirar" com confirmação ("Tirar @bia dos seus seguidores? Ela não é avisada.").

- [ ] **Step 1:** Implementar a query, o Route Handler (`Cache-Control: private, no-store`), as linhas e o diálogo.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** os números batem com a lista; num perfil privado que não se segue, os contadores não abrem lista; tirar um seguidor some da lista e baixa o contador.
- [ ] **Step 4:** Commit `feat(social): seguidores e seguindo`.

### Task 4: Notificações em tempo real

**Files:**

- Create: `app/api/notifications/route.ts`, `features/social/components/notifications-panel.tsx`, `features/social/lib/use-notifications.ts`, `components/ui/relative-time.tsx`
- Modify: `components/shell/notifications-button.tsx`, `components/shell/nav-links.tsx` (`NavViewer` ganha `id`), `app/(app)/layout.tsx`, `features/social/queries.ts`, `features/social/actions.ts`, `features/social/types.ts`, `lib/format.ts`

**Interfaces:**

- Consumes: Tasks 1 e 2.
- Produces: `NotificationsPayload = { unread: number; requests: FollowRequest[]; items: NotificationItem[] }`, com `FollowRequest = { reader: Reader; at: string }`, `NotificationItem = { id; type: "follow" | "collection_like" | "collection_copy" | "collection_invite"; actor: Reader | null; collection: { id: string; title: string } | null; at: string; unread: boolean }` e `Reader = { id; username; displayName; avatarUrl }`; `readNotifications(supabase, userId)`; `GET /api/notifications`; `markNotificationsRead(): Promise<ActionResult>`; `useNotifications(userId)` (React Query `["notificacoes"]`, refetch ao abrir o popover; inscrição no canal privado com `await supabase.realtime.setAuth()`, invalidação a cada `nova`, `removeChannel` no cleanup); `formatRelativeTime(iso: string, now: number): string` ("agora", "há 5 min", "há 3 h", "ontem", "há 4 dias", "12 de out."); `<RelativeTime iso>` (calcula só no cliente: o servidor não sabe a hora de quem vê).
- Textos: "{nome} começou a seguir você", "{nome} quer seguir você", "{nome} curtiu {coleção}", "{nome} copiou {coleção}", "{nome} chamou você para {coleção}".

- [ ] **Step 1:** Implementar a query, o Route Handler, a ação, o hook e o painel (pedidos com Aceitar e Recusar, que saem da lista com `AnimatePresence`; avisos com link para o perfil ou a coleção; skeleton, vazio, erro). O selo do sino entra com mola e mostra o número de não lidos.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev** (duas sessões): a sessão B segue a A, e o sino da A ganha o selo sem recarregar; abrir o popover zera o selo; o pedido para um perfil privado aparece em "Pedidos para seguir", e Aceitar faz a B ver a estante.
- [ ] **Step 4:** Commit `feat(social): notificações em tempo real`.

### Task 5: Afinidade e livros em comum

**Files:**

- Create: `features/social/components/affinity-line.tsx`
- Modify: `features/social/queries.ts`, `features/profile/components/profile-header.tsx`, `app/(app)/u/[username]/layout.tsx`, `app/(app)/u/[username]/page.tsx`, `features/shelf/lib/filters.ts`, `features/shelf/components/profile-shelf.tsx`, `features/shelf/components/shelf-toolbar.tsx`

**Interfaces:**

- Consumes: Task 1.
- Produces: `Affinity = { score: number; commonBooks: number }`; `getAffinity(viewerId, profile: { id; username }): Promise<Affinity | null>` (`'use cache: private'`, tags `shelf:<viewerId>` e `shelf:<profileId>`); `ShelfFilters.common: boolean` (`?comum=1`); `filterShelf(entries, filters, { ignoreStatus?, ownedIds?: ReadonlySet<string> })`; `ShelfEntry.book` ganha `id`; `ProfileShelf` ganha `ownedIds: string[] | null` (null no próprio perfil e para visitante); `<AffinityLine affinity username>` ("Afinidade literária 72%" e o link "8 livros em comum", que liga o filtro com `replaceState` na aba Estante ou navega até ela; sem livro em comum, "Nenhum livro em comum ainda"); chip "Em comum com você" na barra de filtros.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** o perfil de outra leitora mostra a afinidade; clicar em "N livros em comum" deixa só os N na estante e o chip; tirar o chip volta tudo; no próprio perfil e para visitante, nada disso aparece.
- [ ] **Step 4:** Commit `feat(social): afinidade literária e livros em comum`.

### Task 6: Voo da capa até a estante

**Files:**

- Create: `components/shell/shelf-flight.tsx`
- Modify: `components/shell/providers.tsx`, `components/shell/estante-link.tsx`, `app/(app)/dev/_components/motion-demo.tsx`

**Interfaces:**

- Produces: `<ShelfFlightProvider>`; `useShelfFlight(): { fly(from: Element, book: BookVisual): void; showCount(count: number): void }`; o `EstanteLink` marca `data-shelf-target`, pula (y 0 → −5 → 0, `durations.base`, `easing`) quando o clone chega e mostra o contador transitório; demonstração "Copiar livro" no `/dev`.
- Voo: o clone (`BookCover`, sem tilt) nasce no retângulo da origem, num portal `fixed` e `pointer-events-none`. Vai até o alvo visível (o da barra no desktop, o da pílula no celular), com `x` em `springs.smooth` e `y` em `springs.snappy`, o que faz a curva. A escala cai até 0,2 e a opacidade some no último terço. Movimento reduzido: sem clone, só o contador.

- [ ] **Step 1:** Implementar o provider, o clone e o pulinho; contador por 2,4s com `AnimatedNumber`.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev** (`/dev`, 1440px e 375px): o clone parte da capa, termina no "Minha estante" da barra (ou da pílula), o link pula e o número aparece e some; com `reducedMotion: "reduce"`, não há clone.
- [ ] **Step 4:** Commit `feat(movimento): a capa voa até a estante`.

### Task 7: Copiar livro

**Files:**

- Create: `features/shelf/components/copy-book.tsx`
- Modify: `features/shelf/actions.ts`, `features/shelf/schemas.ts`, `features/shelf/components/shelf-views.tsx`, `features/books/components/shelf.tsx`, `features/books/components/book-spine.tsx`, `features/shelf/components/profile-shelf.tsx`, `app/(app)/u/[username]/page.tsx`, `app/globals.css` (variante `can-hover`)

**Interfaces:**

- Consumes: Tasks 5 e 6.
- Produces: `copyBookSchema` e `copyBook({ bookId, status, collectionId, fromUserId }): Promise<ActionResult<{ added: boolean; addedToCollection: boolean; shelfCount: number }>>`; `undoCopy(bookId, collectionId: string | null): Promise<ActionResult>`; `<CopyBookScope>` com `useCopyBook(): { open(target: { book; fromUserId; source: HTMLElement }): void; copiedIds: ReadonlySet<string> }`; `<BookShelfAction book fromUserId owned place: "estante" | "grade" | "lista" | "feed">` (selo "Na sua estante" ou "Copiar", com `aria-label` "Copiar {título} para a sua estante"); `ShelfViews` ganha `bookAction?(book, place)`; `Shelf` ganha `accessory?(book, active: boolean)`, abaixo da linha da prateleira, com o destaque mantido enquanto o foco ou o ponteiro estiver no item; `@custom-variant can-hover (@media (hover: hover) and (pointer: fine))`.

- [ ] **Step 1:** Implementar a ação, o escopo com um popover só (status em `SegmentedControl`, coleção como no passo de detalhes da paleta, "Copiar"), os selos nas três vistas e a ligação no perfil dos outros.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** no perfil de outra leitora, na Grade, "Copiar" abre o popover com Quero ler marcado; "Copiar" faz a capa voar, mostra o selo e o toast "Na sua estante · Desfazer"; Desfazer tira; na Estante, o chip aparece sob a lombada pelo Tab; a 375px o botão aparece sem hover; o livro que já está na estante mostra o selo.
- [ ] **Step 4:** Commit `feat(estante): copiar livros de outros perfis`.

### Task 8: Lendo agora

**Files:**

- Create: `features/shelf/components/reading-now.tsx`
- Modify: `features/shelf/queries.ts` (`ShelfItem.currentPage`), `features/shelf/actions.ts`, `features/shelf/schemas.ts`, `app/(app)/inicio/page.tsx`

**Interfaces:**

- Produces: `updateCurrentPage(bookId: string, page: number): Promise<ActionResult>` (inteiro de 0 a 20000; acima do total de páginas, a mensagem "Esse livro tem N páginas"); `<ReadingNow entries: ShelfItem[]>` (some quando não há livro em Lendo).

- [ ] **Step 1:** Implementar a faixa (rolagem horizontal com snap, capas `sm`, barra de progresso, "p. 120 de 412" em mono), o popover e a ação otimista; o Início passa a ser saudação e Lendo agora (o feed entra na Task 10).
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** com um livro em Lendo, tocar na capa abre o popover; 120 + Enter fecha e a barra anda; recarregando, continua; 9999 num livro de 300 páginas mostra o erro.
- [ ] **Step 4:** Commit `feat(inicio): lendo agora com a página atual`.

### Task 9: Explorar

**Files:**

- Create: `app/(app)/explorar/page.tsx`, `app/api/explore/search/route.ts`, `features/social/components/explore/explore-search.tsx`, `features/social/components/explore/explore-sections.tsx`
- Modify: `features/collections/queries.ts`, `features/books/queries.ts`, `features/social/queries.ts`, `lib/routes.ts` (sem o `as Route` de `explorar`)

**Interfaces:**

- Consumes: Tasks 1, 2 e 3 (`ReaderRow`).
- Produces: `getPopularCollections(limit = 8): Promise<CollectionVisual[]>` e `searchCollections(q): Promise<CollectionVisual[]>` (`'use cache'`, cliente sem sessão, `cacheLife("hours")` e `("minutes")`, tags `explore` e `collection:<id>`); `getTrendingBooks(limit = 12): Promise<{ weekly: boolean; books: (BookVisual & { adds: number })[] }>` e `searchCatalogBooks(q): Promise<BookVisual[]>`; `searchReaders(q): Promise<SuggestedReader[]>`; `getAffinityReaders(limit = 6): Promise<(SuggestedReader & Affinity)[]>` (`'use cache: private'`, tags `shelf:<viewerId>` e `profile:<username>`); `GET /api/explore/search?q=&aba=` → `{ books } | { readers: ReaderListItem[] } | { collections }`; página com título "Explorar", busca, abas com o indicador por `layoutId` e as seções em Suspense.

- [ ] **Step 1:** Implementar as queries, o Route Handler, a busca (URL com `replaceState`, skeleton, vazio "Nada com “{q}” em {aba}" com "Limpar busca", erro com "Tentar de novo") e as seções (cards de coleção, capas com `BookLink` e "N esta semana" em mono, leitores com "72% de afinidade").
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** `/explorar` abre sem conta com as duas seções públicas; com conta, mais os leitores; "sertao" acha Grande Sertão na aba Livros; "ana" acha leitoras; a aba Coleções acha por palavra da descrição; a URL guarda a busca e a aba.
- [ ] **Step 4:** Commit `feat(explorar): busca e seções da comunidade`.

### Task 10: Feed

**Files:**

- Create: `features/social/lib/feed.ts`, `app/api/feed/route.ts`, `features/social/components/feed/feed.tsx`, `features/social/components/feed/feed-card.tsx`, `features/social/components/feed/feed-empty.tsx`
- Modify: `features/social/queries.ts`, `features/social/types.ts`, `app/(app)/inicio/page.tsx`

**Interfaces:**

- Consumes: Tasks 1, 7, 8 e 9.
- Produces: `FEED_PAGE_SIZE = 60`; `FeedCursor = { at: string; id: string }`; `FeedGroup = { key: string; type: ActivityType; actor: Reader; at: string; books: BookVisual[]; collection: { id: string; title: string; emoji: string | null } | null; people: Reader[] }`; `FeedPage = { groups: FeedGroup[]; next: FeedCursor | null }`; `groupActivities(rows: ActivityRow[], full: boolean): FeedPage`; `readFeedPage(supabase, cursor: FeedCursor | null)`; `getFeedFirstPage(viewerId)` (`'use cache: private'`, `cacheTag("feed:<viewerId>")`); `GET /api/feed?antes=&id=`; `<Feed first ownedIds>` (`useInfiniteQuery` com a chave `["feed", first.groups[0]?.key]`, sentinela com IntersectionObserver, "Isso é tudo por agora" no fim); cards em `StaggerItem`.
- Frases: quero ler "quer ler {título}" / "adicionou {n} livros a Quero ler"; lendo "começou a ler {título}" / "começou a ler {n} livros"; lido "terminou {título}" / "terminou {n} livros"; abandonado "deixou {título} de lado" / "deixou {n} livros de lado"; "criou a coleção {coleção}"; "pôs {título} em {coleção}" / "pôs {n} livros em {coleção}"; "começou a seguir {@a}" / "começou a seguir {@a}, {@b} e mais {n}".
- Vazio: sem ninguém seguido, "Siga leitores para ver o que eles leem"; seguindo e sem atividade, "Quem você segue ainda não mexeu na estante". Os dois mostram leitores sugeridos (`ReaderRow`) e coleções populares.

- [ ] **Step 1:** Implementar o agrupamento, a leitura, o Route Handler, os cards (capas com `BookLink` e `BookShelfAction` dentro de um `CopyBookScope`, tempo com `RelativeTime`) e o Início completo.
- [ ] **Step 2:** `npm run typecheck && npm run lint`. Expected: exit 0.
- [ ] **Step 3: Sonda no dev:** com uma conta que segue as leitoras do seed, o feed mostra grupos ("adicionou 3 livros a Quero ler"); rolar até o fim carrega a próxima página sem repetir grupos; copiar do feed funciona; uma conta nova vê o vazio com sugestões e coleções.
- [ ] **Step 4:** Commit `feat(inicio): feed de quem você segue`.

### Task 11: Fechamento da fase

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build`. Expected: exit 0.
- [ ] **Step 2:** Capturas do perfil de outra leitora, do popover de cópia, das notificações, do Início e do Explorar (claro, escuro, 375px e 1440px).
- [ ] **Step 3:** CLAUDE.md (estado, tags novas, Broadcast, testes adiados) e commit `docs: estado da fase 5`.
