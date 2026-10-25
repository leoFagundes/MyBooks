# Fase 2 · Supabase e conta: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar o MyBooks ao projeto Supabase na nuvem: schema com RLS, triggers, Storage e seed; login por e-mail e senha, link mágico e Google; e o onboarding de 4 passos.

**Architecture:** Migrations SQL em `supabase/migrations`, aplicadas com a CLI (`db push --linked`) no projeto `djehboxlhvjtlrvmdiis` (supabase-cerulean-yacht), que é o ambiente de desenvolvimento (escolha do usuário; até 25/10/2026 era o `pdlxsimtcamwadfbjyjm`, que o token dele não alcança). Sem Docker, os testes de banco rodam como SQL dentro de `begin … rollback` pela API de gestão do Supabase, sem deixar dados. O app lê a sessão com `@supabase/ssr` (`getClaims()`, chaves ES256 já ativas), dentro de `'use cache: private'` e `<Suspense>`, e o `proxy.ts` renova a sessão e redireciona.

**Tech Stack:** Next 16.4.3, React 19.3.1, @supabase/supabase-js 2.118.0, @supabase/ssr 0.12.7, supabase (CLI) 2.122.0, zod 4.6.7, react-hook-form 7.91.0, @hookform/resolvers 6.0.0, react-easy-crop 6.2.4, server-only 0.0.1, node-vibrant 4.0.4 (seed), Vitest 5.0.5, Playwright 1.64.1.

**Spec:** [SPEC.md](../../../SPEC.md) (§5.2, §6, §7, §8, §10) · Arquitetura aprovada: [Fase 0](2026-10-24-fase-0-arquitetura.md) · Convenções: [CLAUDE.md](../../../CLAUDE.md)

## Global Constraints

- Tabelas e colunas da spec §6, com RLS ativa em **todas**. Perfis e estantes públicos são lidos por todos; os privados, só por seguidores aceitos. Só o dono escreve nos próprios dados. Coleções privadas só para dono e membros; membros adicionam e reordenam itens.
- Perfil privado: quem não segue vê só o cabeçalho (spec §5.4). O registro de `profiles` é público; o conteúdo (estante, citações, coleções, atividades) segue a regra acima.
- `profiles` criado por trigger no cadastro; `username` único, minúsculo.
- Storage: buckets `avatars` e `covers`, com políticas por dono (pasta = id da pessoa).
- Seed em `supabase/seed.sql`: ~8 leitores, ~40 livros reais, coleções, resenhas, citações e follows. Gerado uma vez por `scripts/gerar-seed.ts` (Open Library, no máximo 1 req/s; o e-mail do usuário não vai no `User-Agent`).
- Tipos gerados com `supabase gen types` em `lib/supabase/database.types.ts`, nunca editados à mão.
- `/entrar` e `/cadastro`: cartão central com e-mail e senha, link mágico e Google; validação nos campos e erros gentis.
- `/onboarding`: transição deslizante e pontos de progresso. 1) nome, @usuário com disponibilidade (debounce) e avatar com recorte no Storage; 2) gêneros; 3) primeiros livros pela busca; 4) leitores para seguir.
- Chave secreta nunca no cliente. Variáveis novas documentadas em `.env.example`.
- Server Actions: zod → `requireViewer()` → escrita → `updateTag()` → `ActionResult`; leituras e buscas por Route Handler GET.
- Interface 100% pt-BR, textos curtos e calorosos; foco visível, contraste AA, 360–1920px; só presets de `lib/motion.ts`.

## Review Focus

1. **Conteúdo de perfil privado vazando:** estante, citações, coleções e atividades de quem é privado aparecendo para quem não segue ou para visitante. Testes de RLS nas Tasks 3, 4 e 5.
2. **Escrita em dados alheios:** gravar `user_books`, itens de coleção, follows ou notificações de outra pessoa; forjar follow "aceito" para perfil privado; subir arquivo na pasta de outra pessoa. Testes de RLS nas Tasks 3 a 6.
3. **Redirecionamentos:** `next` levando para outro domínio, laço entre `/entrar` e `/inicio`, quem não terminou o onboarding indo para o `/inicio`, link mágico vencido. Testes unitários na Task 8 e E2E nas Tasks 9 e 11.
4. **@usuário estranho:** maiúsculas, acento, espaço, arroba, nome reservado e colisão de dois cadastros com o mesmo nome (dois "ana" pelo Google). Unitários na Task 11, trigger na Task 2, E2E na Task 11.
5. **Sessão e segredos:** chave secreta no bundle do cliente, resposta com cookie de sessão sem `Cache-Control: private`, a pessoa vendo a barra de outra. Teste do bundle e do cabeçalho na Task 8.

## Passos no painel (do usuário)

1. **Token de acesso** (antes da Task 1, passo 5): Account → Access Tokens → gerar e pôr em `SUPABASE_ACCESS_TOKEN` no `.env.local`. A CLI aplica as migrations e gera os tipos com ele, e os testes de banco rodam por ele. Se o `db push` pedir, a senha do banco vai em `SUPABASE_DB_PASSWORD`.
2. **URLs do Auth** (antes da Task 9): Site URL `http://localhost:3000` e Redirect URL `http://localhost:3000/**`. Previews e produção entram na Fase 8.
3. **Modelos de e-mail** (antes da Task 9): "Confirm signup" e "Magic Link" com os textos de `supabase/templates/`, que apontam para `/auth/confirm` com `token_hash` (funciona até abrindo o e-mail em outro aparelho).
4. **Google** (antes de testar o botão): cliente OAuth no Google Cloud com o retorno `https://djehboxlhvjtlrvmdiis.supabase.co/auth/v1/callback`, e o provedor ligado no Supabase.
5. O e-mail padrão do Supabase só entrega para endereços da equipe do projeto e manda poucos por hora. Para testar à mão, use o seu e-mail; SMTP próprio fica para a Fase 8.

## Fora desta fase

- `reading_affinity`, a view de livros em alta e o Broadcast das notificações em tempo real entram na Fase 5, junto com quem os usa (afinidade, Explorar e popover de notificações). São acréscimos de migration, sem mexer no que esta fase cria.
- A busca na Open Library e o salvamento de livros novos no catálogo são da Fase 3; aqui a busca do onboarding procura só no catálogo (os ~40 livros do seed).

---

### Task 1: Base do Supabase

**Files:**

- Modify: `package.json`, `.env.local` (só renomear, sem ler valores), `.env.example`, `.gitignore`, `playwright.config.ts`
- Create: `supabase/config.toml` (`supabase init`), `scripts/supabase.mjs`, `lib/env.ts`, `lib/env.test.ts`, `vitest.db.config.mts`, `tests/db/sql.ts`, `tests/db/smoke.test.ts`

**Interfaces:**

- Produces: `publicEnv: { supabaseUrl: string; supabasePublishableKey: string; siteUrl: string }` (zod, com referências explícitas a `process.env.NEXT_PUBLIC_*`); scripts `db:push`, `db:types`, `db:link`, `test:db`; `runSql(sql: string): Promise<unknown>` e `sqlTransaction(...statements: string[]): string` (envolve em `begin … rollback`) em `tests/db/sql.ts`; helpers SQL `asUser(id)`, `asAnon()`, `createUser({ id, email, meta })` (insert em `auth.users` + `auth.identities`).

- [ ] **Step 1:** Instalar com `-E`: @supabase/supabase-js 2.118.0, @supabase/ssr 0.12.7, zod 4.6.7, react-hook-form 7.91.0, @hookform/resolvers 6.0.0, react-easy-crop 6.2.4, server-only 0.0.1; dev: supabase 2.122.0, node-vibrant 4.0.4.
- [ ] **Step 2:** Renomear no `.env.local` por script que não imprime valores: `API_KEY_SUPABASE` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SECRET_KEY_SUPABASE` → `SUPABASE_SECRET_KEY`, remover `ANON_SUPABSE` (a publicável substitui), acrescentar `NEXT_PUBLIC_SUPABASE_URL=https://djehboxlhvjtlrvmdiis.supabase.co`. `.env.example` com todas as variáveis, incluindo `SUPABASE_ACCESS_TOKEN` (só para CLI e testes).
- [ ] **Step 3: Testes** em `lib/env.test.ts`: `parsePublicEnv` aceita URL https e chave `sb_publishable_`; recusa chave `sb_secret_` no lugar da publicável e URL ausente, com mensagem em pt-BR.
- [ ] **Step 4:** Rodar. Expected: FAIL (módulo inexistente). Implementar `lib/env.ts`. Expected: PASS.
- [ ] **Step 5:** `supabase init` (`--yes`), `scripts/supabase.mjs` (carrega `.env.local` com `process.loadEnvFile` e repassa os argumentos ao binário da CLI), scripts npm, `supabase link --project-ref djehboxlhvjtlrvmdiis`. Playwright carrega `.env.local` no config.
- [ ] **Step 6: Teste** `tests/db/smoke.test.ts`: `runSql("select 1 as ok")` devolve `[{ ok: 1 }]`; um `sqlTransaction` com `assert false` falha com a mensagem do assert. Rodar `npm run test:db`. Expected: PASS (se a API não aceitar transação com vários comandos, a Task inteira para e vira ruling).
- [ ] **Step 7:** Commit `chore(supabase): CLI, variáveis e testes de banco`.

### Task 2: Perfis e cadastro

**Files:**

- Create: `supabase/migrations/<ts>_profiles.sql`, `tests/db/profiles.test.ts`

**Interfaces:**

- Produces: tabela `profiles` (colunas da spec + `onboarded_at timestamptz`, `updated_at timestamptz`), `username` `not null unique`, check `^[a-z0-9_]{3,20}$`, `display_name` até 60, `bio` até 160, `avatar_url` só do nosso bucket `avatars` ou do Google; função `private.set_updated_at()`; trigger `on_auth_user_created` → `private.handle_new_user()`, que deriva o @usuário provisório de `user_metadata.username`, do nome do Google ou da parte local do e-mail (sem acento, minúsculo, `_` no lugar do resto, 3–20 caracteres, sufixo numérico em colisão) e copia `full_name`/`name` e `avatar_url`/`picture`.

- [ ] **Step 1: Testes** (SQL em transação): cadastro de `ana.souza@x.com` cria perfil `ana_souza`; segundo cadastro com o mesmo nome vira `ana_souza1`; metadados do Google preenchem nome e avatar; e-mail `ab@x.com` vira um @ com 3 ou mais caracteres; RLS: visitante lê perfis (inclusive privados); a pessoa atualiza só o próprio; ninguém insere nem apaga; `avatar_url` de outro domínio é recusado.
- [ ] **Step 2:** `npm run test:db -- profiles`. Expected: FAIL (tabela inexistente).
- [ ] **Step 3:** Migration (`create schema private`, sem acesso pela API). `npm run db:push`.
- [ ] **Step 4:** Rodar. Expected: PASS.
- [ ] **Step 5:** Commit `feat(banco): perfis criados no cadastro`.

### Task 3: Catálogo e estante

**Files:**

- Create: `supabase/migrations/<ts>_books_shelf.sql`, `tests/db/shelf.test.ts`

**Interfaces:**

- Produces: `books` (spec §6; `cover_color` check `^#[0-9a-f]{6}$`, `isbn_13` único, `unique (source, source_id)`), `user_books` (status, nota de 0.5 a 5 em meios, `unique (user_id, book_id)`, `finished_at >= started_at`), `quotes`; extensões `pg_trgm` e `unaccent` no schema `extensions`; `public.immutable_unaccent(text)`; índice trigram do catálogo; RPC `search_catalog(q text, max_results int default 8)` (sem acento, por similaridade); `private.can_view_content(owner uuid)` (dono, perfil público ou seguidor aceito; `security definer`, `search_path = ''`).

- [ ] **Step 1: Testes:** visitante e logado leem o catálogo; só logado insere livro, com `created_by` = ele; estante de perfil público visível ao visitante; de perfil privado, invisível ao visitante e a quem não segue, visível a seguidor aceito e não a pendente; ninguém grava na estante de outra pessoa; nota 4.3 e status inválido recusados; `search_catalog('sertao')` acha "Grande Sertão: Veredas".
- [ ] **Step 2:** Rodar. Expected: FAIL. **Step 3:** Migration e push. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(banco): catálogo, estante e citações com RLS`.

### Task 4: Coleções

**Files:**

- Create: `supabase/migrations/<ts>_collections.sql`, `tests/db/collections.test.ts`

**Interfaces:**

- Produces: `collections`, `collection_items` (`position text collate "C"`, para o índice fracionário ordenar por byte; PK `(collection_id, book_id)`), `collection_members` (`role` `'editor'`), `collection_likes`, `collection_saves`; `private.can_view_collection(id uuid)`, `private.can_edit_collection(id uuid)`.

- [ ] **Step 1: Testes:** coleção pública de perfil público visível a todos; privada só para dono e membros; pública de perfil privado só para seguidor aceito; membro adiciona e reordena itens, quem não é membro não; só o dono convida e remove membros (membro pode sair); curtidas visíveis com a coleção; "salvar" visível só para quem salvou; `order by position` respeita `"a0" < "a1" < "aV" < "b0"`.
- [ ] **Step 2–4:** FAIL → migration e push → PASS.
- [ ] **Step 5:** Commit `feat(banco): coleções, membros, curtidas e salvos`.

### Task 5: Social: follows, atividades e notificações

**Files:**

- Create: `supabase/migrations/<ts>_social.sql`, `tests/db/social.test.ts`

**Interfaces:**

- Produces: `follows` (PK `(follower_id, following_id)`, sem seguir a si mesmo; trigger `before insert` define `status` pelo perfil seguido: privado → `'pending'`, público → `'accepted'`); `activities` (tipos `shelf_want`, `shelf_reading`, `shelf_read`, `shelf_abandoned`, `collection_create`, `collection_add`, `follow`), preenchida por triggers em `user_books` (insert e mudança de status; cópia leva `target_user_id`), `collections` (só públicas), `collection_items` e `follows` aceitos; `notifications` (tipos `follow`, `follow_request`, `collection_like`, `collection_copy`, `collection_invite`; `refs jsonb`), por triggers em `follows`, `collection_likes`, `collections` com `copied_from_id` e `collection_members`.

- [ ] **Step 1: Testes:** seguir perfil público fica aceito, privado fica pendente, mesmo se o cliente mandar `'accepted'`; só o seguido aceita o pedido; seguir gera notificação `follow` ou `follow_request`; adicionar livro gera atividade `shelf_want`; mudar para lido gera `shelf_read`; atividades de perfil privado invisíveis a quem não segue; notificação visível só ao destinatário, que só marca como lida; ninguém insere atividade nem notificação direto.
- [ ] **Step 2–4:** FAIL → migration e push → PASS.
- [ ] **Step 5:** Commit `feat(banco): follows, atividades e notificações por trigger`.

### Task 6: Storage

**Files:**

- Create: `supabase/migrations/<ts>_storage.sql`, `tests/db/storage.test.ts`

**Interfaces:**

- Produces: buckets públicos `avatars` (2 MB; webp, jpeg, png) e `covers` (5 MB; webp, jpeg, png); políticas em `storage.objects`: inserir, atualizar e apagar só em `<bucket>/<auth.uid()>/…`.

- [ ] **Step 1: Testes:** como pessoa A, inserir objeto em `avatars/<A>/x.webp` passa e em `avatars/<B>/x.webp` falha; visitante não insere; A não apaga objeto de B.
- [ ] **Step 2–4:** FAIL → migration e push → PASS.
- [ ] **Step 5:** Commit `feat(banco): buckets de avatares e capas por dono`.

### Task 7: Seed e tipos

**Files:**

- Create: `scripts/gerar-seed.ts`, `scripts/seed-data.ts`, `supabase/seed.sql`, `lib/supabase/database.types.ts`, `tests/db/seed.test.ts`

**Interfaces:**

- Consumes: tabelas das Tasks 2–6.
- Produces: ~40 livros com dados da Open Library (`source = 'openlibrary'`, `source_id` = chave da obra, capa S/M/L, ano, páginas, ISBN quando houver) e sinopse curta em pt-BR escrita no `seed-data.ts`; `cover_color` pelo node-vibrant; 8 leitores (um privado) com estantes, notas, resenhas, citações reais e curtas, coleções (uma colaborativa, uma privada), curtidas, salvos e follows (um pedido pendente). UUIDs determinísticos (hash do slug), `on conflict do nothing`, leitores de exemplo sem senha (`@example.com`). Tipos `Database` gerados.

- [ ] **Step 1: Teste** `tests/db/seed.test.ts` (só leitura): 40 livros ou mais, 8 perfis com `onboarded_at`, todo livro com `cover_color` válido, cada leitor com 8 ou mais livros, um perfil privado, um follow pendente.
- [ ] **Step 2:** Rodar. Expected: FAIL (banco vazio).
- [ ] **Step 3:** Gerar o seed (`npm run seed:gerar`), conferir o SQL e aplicar com `db push --include-seed`. Gerar os tipos (`npm run db:types`).
- [ ] **Step 4:** Rodar. Expected: PASS. `npm run typecheck`. Expected: exit 0.
- [ ] **Step 5:** Commit `feat(banco): seed com leitores e livros reais, e tipos gerados`.

### Task 8: Clientes, sessão e proxy

**Files:**

- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/public.ts`, `lib/supabase/proxy.ts`, `proxy.ts`, `lib/auth.ts`, `lib/action.ts`, `lib/auth-redirect.ts`, `lib/auth-redirect.test.ts`, `e2e/session.spec.ts`, `tests/client-bundle.test.ts`
- Modify: `lib/routes.ts`

**Interfaces:**

- Produces: `createClient()` (navegador, memoizado) · `createClient(): Promise<…>` (servidor, cookies; `setAll` ignora o erro em Server Component) · `createPublicClient()` (sem sessão) · `updateSession(request): Promise<{ response: NextResponse; userId: string | null }>` (aplica cookies **e** os cabeçalhos que o `setAll` entrega); `type Viewer = { id; username; displayName; avatarUrl: string | null; onboarded: boolean }`; `getViewer(): Promise<Viewer | null>` (`'use cache: private'`); `requireViewer(): Promise<Viewer>` (sem sessão → `/entrar`); `ActionResult<T>`; `safeNextPath(raw, fallback)` (só caminho relativo do próprio site); `authRedirect(pathname, signedIn): string | null`. Rotas protegidas: `/inicio`, `/onboarding`, `/configuracoes`; logado em `/`, `/entrar` ou `/cadastro` vai para `/inicio`.

- [ ] **Step 1: Testes** `lib/auth-redirect.test.ts`: `safeNextPath` recusa `https://mal.com`, `//mal.com`, `/\mal.com`, `javascript:…` e aceita `/@ana/colecoes?x=1`; `authRedirect` cobre os casos acima sem laço (`/entrar` deslogado não redireciona). `e2e/session.spec.ts`: deslogado em `/inicio` cai em `/entrar?next=%2Finicio`; a resposta do proxy com sessão nova traz `Cache-Control` privado (checado num login pelo admin). `tests/client-bundle.test.ts`: depois do build, nenhum arquivo de `.next/static` contém `sb_secret_`.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar (ler o guia de `@supabase/ssr` e o `proxy.md` do Next antes). Matcher sem `_next/static`, `_next/image`, imagens e `/capas`.
- [ ] **Step 4:** Rodar. Expected: PASS.
- [ ] **Step 5:** Commit `feat(conta): sessão do Supabase, proxy e leitura de quem está vendo`.

### Task 9: Entrar, cadastrar e sair

**Files:**

- Create: `features/auth/schemas.ts`, `features/auth/schemas.test.ts`, `features/auth/errors.ts`, `features/auth/errors.test.ts`, `features/auth/actions.ts`, `features/auth/components/*`, `app/(auth)/layout.tsx`, `app/(auth)/entrar/page.tsx`, `app/(auth)/cadastro/page.tsx`, `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`, `supabase/templates/confirmar-cadastro.html`, `supabase/templates/link-magico.html`, `e2e/auth.spec.ts`, `e2e/support/supabase-admin.ts`
- Modify: `components/shell/account-menu.tsx`

**Interfaces:**

- Produces: `signIn`, `signUp`, `sendMagicLink`, `signInWithGoogle`, `signOut` (Server Actions com `useActionState`); `authErrorMessage(code)` para os códigos do Supabase Auth (`invalid_credentials`, `email_not_confirmed`, `user_already_exists`, `weak_password`, `over_email_send_rate_limit`, `otp_expired`, padrão gentil); `/auth/confirm` (`verifyOtp` com `token_hash`) e `/auth/callback` (`exchangeCodeForSession`) levam para `/onboarding` ou `/inicio` conforme `onboarded_at`, e para `/entrar?erro=…` quando falham; modelos de e-mail em pt-BR com `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. E2E sem mandar e-mail: usuários criados e apagados pelo admin (`e2e/support/supabase-admin.ts`, chave secreta só no Node dos testes) e link mágico por `generateLink`.

- [ ] **Step 1: Testes:** schemas (e-mail inválido, senha com menos de 8, mensagens em pt-BR); `authErrorMessage`; E2E: campos inválidos mostram erros gentis sem enviar; login com senha errada mostra "E-mail ou senha não conferem"; login certo de pessoa com onboarding feito vai para `/inicio`; link mágico de pessoa nova vai para `/onboarding`; link vencido volta para `/entrar` com aviso; "Sair" no menu da conta volta para `/`.
- [ ] **Step 2:** Rodar. Expected: FAIL.
- [ ] **Step 3:** Implementar. O "Sair" chama `signOut` e depois `window.location.assign("/")`.
- [ ] **Step 4:** Rodar. Expected: PASS.
- [ ] **Step 5:** Commit `feat(conta): entrar, cadastrar, link mágico, Google e sair`.

### Task 10: Barra com a conta e início provisório

**Files:**

- Modify: `app/(app)/layout.tsx`, `components/shell/top-nav.tsx`, `components/shell/bottom-nav.tsx`, `app/(marketing)/page.tsx`
- Create: `app/(app)/inicio/page.tsx`, `features/shelf/queries.ts`, `features/books/lib/to-book-visual.ts`, `features/books/lib/to-book-visual.test.ts`, `e2e/home.spec.ts`

**Interfaces:**

- Consumes: `getViewer()`, `ShelfViews`, `toBookVisual`.
- Produces: barra que lê a conta dentro de `<Suspense>` (fallback neutro, sem "Entrar" nem avatar); `/inicio` provisório (o feed é da Fase 5): saudação em Instrument Serif e a estante da pessoa nas 3 visualizações, ou o estado vazio; landing com "Criar minha estante" → `/cadastro`; `getShelf(userId)` (`user_books` + `books`); `toBookVisual(row): BookVisual`.

- [ ] **Step 1: Testes:** `toBookVisual` (cor inválida vira `null`, autores vazios viram lista vazia); E2E: logado vê o avatar e o menu da conta, não o "Entrar"; `/inicio` mostra a saudação com o nome e os livros da estante; pessoa sem livros vê o estado vazio.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(conta): barra com a conta e início provisório`.

### Task 11: Onboarding

**Files:**

- Create: `features/profile/lib/username.ts`, `features/profile/lib/username.test.ts`, `features/profile/genres.ts`, `features/profile/schemas.ts`, `features/profile/schemas.test.ts`, `features/profile/actions.ts`, `features/profile/queries.ts`, `features/profile/components/onboarding/*`, `features/shelf/actions.ts`, `features/social/actions.ts`, `app/onboarding/page.tsx`, `app/api/usernames/availability/route.ts`, `app/api/books/search/route.ts`, `e2e/onboarding.spec.ts`, `e2e/fixtures/avatar.png`

**Interfaces:**

- Consumes: `search_catalog`, `requireViewer`, `ActionResult`, Storage `avatars`.
- Produces: `normalizeUsername(input): string` (tira `@`, acento e espaços; minúsculo); `usernameSchema` (formato da Task 2 + nomes reservados); `GENRES` (slug e rótulo); Server Actions `saveProfile`, `saveGenres`, `finishOnboarding` (`features/profile`), `addToShelf(bookId, status)` (`features/shelf`), `followReader(id)` e `unfollowReader(id)` (`features/social`); GET `/api/usernames/availability?username=` → `{ status: "available" | "taken" | "invalid" | "reserved" | "yours" }`; GET `/api/books/search?q=` (só o catálogo nesta fase; a Open Library entra na Fase 3); sugestões de leitores por gêneros em comum. Avatar: recorte quadrado no cliente, WebP 256px, upload em `avatars/<id>/<timestamp>.webp`.

- [ ] **Step 1: Testes:** `normalizeUsername` (`" @Ana Lívia "` → `"ana_livia"`), `usernameSchema` (curto, longo, reservado, com hífen), schemas dos passos; E2E com pessoa nova criada pelo admin: passo 1 mostra "já tem dono" para `ana` e aceita outro nome, envia e recorta um avatar; passo 2 escolhe gêneros; passo 3 busca "sertao" e adiciona "Grande Sertão: Veredas" como Quero ler; passo 4 segue um leitor sugerido ("Seguir" → "Seguindo"); ao concluir cai no `/inicio` com o livro na estante; recarregar o `/onboarding` depois de concluir leva ao `/inicio`; teclado navega todos os passos.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(conta): onboarding em quatro passos`.

### Task 12: Fechamento da fase

**Files:**

- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run test:db && npm run test:e2e && npm run build`. Expected: exit 0.
- [ ] **Step 2:** Capturas de `/entrar`, `/cadastro` e dos 4 passos do onboarding (claro, escuro, 375px e 1440px).
- [ ] **Step 3:** CLAUDE.md (estado, variáveis, comandos do banco, testes de banco e E2E com admin) e README; commit `docs: estado da fase 2`.
