# Fase 4 · Coleções: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coleções completas: criar e editar (título, descrição, emoji, visibilidade, colaborativa com convite por @), capa em leque, página com a grade reordenável e uma nota por livro, curtir, salvar, compartilhar e copiar com crédito.

**Architecture:** A ordem dos livros é um índice fracionário (`fractional-indexing`, base 62, ordenado por byte no `collate "C"` da Fase 2). Mover um livro grava uma chave nova entre as vizinhas, sem renumerar os outros. Se duas pessoas gerarem a mesma chave ao mesmo tempo, a ordem empata pelo `book_id`, e o próximo movimento naquele ponto renumera a coleção. A grade usa o dnd-kit só para o gesto (ponteiro, toque, teclado e anúncios em pt-BR): a lista muda de ordem durante o arraste e o `layout` do Motion anima as vizinhas com mola, com o livro arrastado num `DragOverlay`. A página lê a parte pública com `'use cache'` (`cacheTag("collection:<id>")`, cliente sem sessão) e o resto (coleção privada, quem pode editar, curtiu, salvou) com a sessão, dentro de `<Suspense>`. Copiar é uma função SQL atômica.

**Tech Stack:** Next 16.4.3, React 19.3.1, Motion 14.6.0, @dnd-kit/core 6.3.1 e @dnd-kit/sortable 10.0.0, fractional-indexing 4.0.0, Supabase, react-hook-form 7.91.0 e zod 4.6.7, radix-ui 1.8.1 (Switch), sonner 2.0.8, Vitest 5.0.5, Playwright 1.64.1.

**Spec:** [SPEC.md](../../../SPEC.md) (§3 momentos 2, 3, 7, 10 e 11; §5.4; §5.5; §5.6; §5.8; §6; §9) · Arquitetura: [Fase 0](2026-10-24-fase-0-arquitetura.md) · Banco das coleções: [Fase 2, Task 4](2026-10-24-fase-2-supabase-e-conta.md) · Perfil, página do livro e adicionar livro: [Fase 3](2026-10-24-fase-3-estante.md)

**Pré-requisito:** Fases 2 e 3 concluídas. As Tasks 1 a 5 não usam o banco e podem rodar antes.

## Global Constraints

- Criar e editar: título, descrição, emoji, visibilidade (pública ou privada) e opção colaborativa, com convite por @usuário.
- Capa da coleção: de 3 a 5 capas em leque, que se abre com mola ao passar o mouse.
- Página: cabeçalho e livros em grade, reordenáveis pelo dono e pelos colaboradores (dnd-kit, com animação de layout fluida), cada um com uma nota opcional ("por que está aqui").
- Ações: curtir, salvar, compartilhar e "Copiar coleção", que faz uma cópia com o crédito "Inspirado em @fulano" e guarda a origem.
- Acesso: coleção privada só para o dono e os membros; membros adicionam e reordenam itens. Título, descrição, visibilidade, convites e exclusão são do dono; o membro pode sair.
- Movimento: card de coleção que se expande (`layoutId`); entradas em sequência de 35ms; botões com scale 0.97 e textos que mudam com `popLayout`; sheet entrando com escala de 0.96 a 1; atualização otimista em curtir, salvar, reordenar e nota. Movimento reduzido: só opacidade. Só presets de `lib/motion.ts`.
- Vitest para o índice fracionário; Playwright para criar e reordenar coleção e para copiar a coleção de outro perfil.
- Interface 100% pt-BR; foco visível; contraste AA; 360–1920px; todo componente com carregando, vazio, erro e sucesso.

## Decisões

1. **dnd-kit clássico.** Reavaliado como a Fase 0 pediu: `@dnd-kit/core` 6.3.1 e `sortable` 10.0.0 seguem sem release desde dez/2024, e o sucessor (`@dnd-kit/react`) ainda está em 0.5.1. O clássico é estável, aceita React 19 e já traz teclado, toque e anúncios para leitor de tela. O Reorder do Motion só ordena numa direção, e a página é uma grade. Se o React Compiler atrapalhar o dnd-kit, `'use no memo'` só no componente da grade.
2. **A mola é do Motion, não do dnd-kit.** As vizinhas não recebem o `transform` do dnd-kit: a lista muda de ordem no `onDragOver` e o `layout` do Motion faz a mola. Assim o arraste usa os presets do app, e não a transição CSS fixa do dnd-kit.
3. **Card que se expande:** o card é um link de verdade para `/colecao/[id]` (Ctrl/⌘ + clique ou o botão do meio abrem em outra aba). O clique simples abre uma espiada que cresce do próprio card (`layoutId`), com a descrição, as capas, curtir, salvar e "Abrir coleção". Esc ou um clique fora fecham, e ela volta para o card.
4. **Convite sem aceite:** `collection_members` não tem status na Fase 2, então o convite já torna a pessoa editora; ela fica sabendo pela notificação `collection_invite` e pode sair quando quiser. O @ é conferido pelo endpoint de disponibilidade da Fase 2 ("taken" quer dizer que existe).
5. **Cópia:** sempre privada e não colaborativa, com os mesmos livros, na mesma ordem e com as notas. O crédito "Inspirado em @fulano" aparece sempre, com link para a origem só enquanto quem vê puder vê-la.
6. **Limites** (`COLLECTION_LIMITS`, que a migration da Fase 2 também usa): título de 1 a 80 caracteres, descrição até 300, nota até 200, emoji com um único emoji (um grafema) e até 20 colaboradores.

## Fora desta fase

- Imagem OG da coleção e carrossel de coleções na landing: Fase 7 (o compartilhar já manda o link). Coleções populares no Explorar e o popover de notificações: Fase 5 (os gatilhos de curtida, cópia e convite existem desde a Fase 2).

## Review Focus

1. **Duas pessoas reordenando ao mesmo tempo:** chaves iguais, empate pelo `book_id` e renumeração; nenhum livro some nem se duplica. Unitários na Task 1; banco e E2E com duas sessões na Task 9.
2. **Coleção privada vazando:** página, espiada, card no perfil e crédito "Inspirado em" de coleção privada para quem não é membro (404 gentil; crédito sem link nem título). Tasks 6, 10 e 11.
3. **Clique duplo e desfazer:** curtir duas vezes seguidas, copiar duas vezes, sair da página com a nota salvando, membro removido no meio de um arraste (erro gentil e a ordem volta). Tasks 5 e 7 a 10.
4. **Texto e emoji estranhos:** só espaços, 81 caracteres, emoji com ZWJ (👩‍👩‍👧), bandeira, tom de pele, dois emojis, letra no lugar do emoji. Unitários na Task 2.
5. **Teclado e leitor de tela:** reordenar sem mouse com anúncios em pt-BR, foco voltando ao card quando a espiada fecha, nota que se edita e se cancela pelo teclado; movimento reduzido sem deslocamento. Tasks 3, 4 e 5.

---

### Task 1: Índice fracionário

**Files:**

- Create: `features/collections/lib/position.ts`, `features/collections/lib/position.test.ts`
- Modify: `package.json` (`fractional-indexing` 4.0.0)

**Interfaces:**

- Produces: `POSITION_PATTERN` (`/^[0-9A-Za-z]{2,64}$/`); `firstPositions(count: number): string[]`; `positionBetween(before: string | null, after: string | null): string`; `planMove(items: { id: string; position: string }[], from: number, to: number): MovePlan | null`, com `MovePlan = { kind: "move"; id: string; position: string } | { kind: "rebalance"; order: string[]; positions: string[] }` (`rebalance` quando as vizinhas do destino têm a mesma chave; `null` quando nada muda).

- [ ] **Step 1: Testes:** `firstPositions(3)` dá `["a0", "a1", "a2"]`; `positionBetween` antes da primeira, depois da última e no meio fica entre as vizinhas pela ordem de byte; 300 movimentos aleatórios deixam a ordem por byte das chaves igual à ordem pretendida; vizinhas com a mesma chave dão `rebalance` com a ordem pretendida e chaves crescentes; mover para o mesmo lugar dá `null`.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): índice fracionário para reordenar sem custo`.

### Task 2: Formulário e limites

**Files:**

- Create: `features/collections/schemas.ts`, `features/collections/schemas.test.ts`

**Interfaces:**

- Produces: `COLLECTION_LIMITS` (`title: 80`, `description: 300`, `note: 200`, `members: 20`); `isSingleEmoji(text: string): boolean` (`Intl.Segmenter`: um grafema, pictográfico ou bandeira); `collectionFormSchema` (título aparado de 1 a 80; descrição aparada até 300, vazia vira `null`; emoji único ou `null`; `visibility: "public" | "private"`; `isCollaborative: boolean`); `itemNoteSchema` (aparada até 200, vazia vira `null`); `positionSchema` (`POSITION_PATTERN`). Mensagens: "Dê um título à coleção", "Até 80 caracteres", "Um emoji só", "Até 200 caracteres".

- [ ] **Step 1: Testes:** título só com espaços e com 81 caracteres recusados; descrição vazia vira `null`; emoji `📚`, `👩‍👩‍👧`, `🇧🇷` e `👍🏽` aceitos; `😀😀`, `a` e `1` recusados; nota de 201 caracteres recusada; posição `a0` aceita, `a 0` e vazia recusadas.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): formulário e limites com zod`.

### Task 3: Capa em leque e card que se expande

**Files:**

- Create: `features/collections/types.ts`, `features/collections/sample-collections.ts`, `features/collections/components/collection-cover.tsx`, `features/collections/components/collection-card.tsx`, `features/collections/components/collection-peek.tsx`, `app/(app)/dev/_components/collections-demo.tsx`, `e2e/collections-ui.spec.ts`
- Modify: `app/(app)/dev/page.tsx` (seção 11, "Coleções")

**Interfaces:**

- Produces: `CollectionVisual = { id; title; emoji: string | null; description: string | null; visibility: "public" | "private"; isCollaborative: boolean; owner: Person; members: Person[]; copiedFrom: { id: string; title: string; username: string } | null; bookCount: number; likeCount: number; covers: BookVisual[] }` (`covers`: até 5, pela posição) e `Person = { username; displayName; avatarUrl: string | null }`; três coleções de exemplo com os livros de `sample-books.ts` (uma vazia); `<CollectionCover covers emoji open?>` (0 capas: o emoji num cartão; 1 ou 2: as que houver; 3 a 5: leque; abre com a mola `smooth`; movimento reduzido: parado); `<CollectionCard collection href>` (link; o clique simples abre a espiada; Ctrl/⌘ e o botão do meio seguem o link; o leque abre no hover e no foco); `<CollectionPeek>` (Dialog do Radix que cresce do card com `layoutId`; o foco volta ao card).

- [ ] **Step 1: Testes** (E2E no dev): a seção mostra os 3 cards com título e "5 livros" em mono; o hover abre o leque (`data-open`); o clique abre a espiada com o título e o link "Abrir coleção"; Esc fecha e o foco volta ao card; o card tem `href` da página; a coleção vazia mostra o emoji; com movimento reduzido o leque não abre.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): capa em leque e card que se expande`.

### Task 4: Grade reordenável e notas

**Files:**

- Create: `features/collections/components/sortable-books.tsx`, `features/collections/components/item-note.tsx`, `app/(app)/dev/colecao/[slug]/page.tsx`, `e2e/collection-reorder.spec.ts`
- Modify: `package.json` (dnd-kit), `features/collections/types.ts`, `app/(app)/dev/_components/collections-demo.tsx`

**Interfaces:**

- Consumes: Task 1 (`planMove`).
- Produces: `CollectionItemVisual = { book: BookVisual; position: string; note: string | null }`; `<SortableBooks items editable onMove(plan: MovePlan) onNote(bookId, note)>`: mouse a partir de 6px, toque com 250ms pressionado, teclado pela alça "Mover <título>" (espaço pega, setas movem, espaço solta, Esc cancela), instruções e anúncios em pt-BR; `DragOverlay` com a capa erguida (scale 1.04, 2° de giro); o lugar de origem fica com contorno tracejado; as vizinhas andam com `layout` e a mola `snappy`; capas com `BookLink` para o livro; sem edição, sem alças. `<ItemNote note editable onSave>`: "Por que está aqui?" para quem edita; Enter salva, Shift+Enter quebra a linha, Esc cancela, salva ao sair do campo; contador a partir de 160 caracteres. Página de demonstração `/dev/colecao/[slug]` com estado local.

- [ ] **Step 1: Testes** (E2E no dev, `/dev/colecao/classicos-brasileiros`): arrastar "Vidas Secas" com o mouse para o primeiro lugar muda a ordem; pelo teclado (alça, espaço, setas, espaço) também, com o anúncio em pt-BR; Esc no meio devolve a ordem; sem edição não há alças; a nota se escreve com Enter, se cancela com Esc e não passa de 200 caracteres.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Quadros do arraste (pegar, no meio, soltar), claro e escuro.
- [ ] **Step 6:** Commit `feat(colecoes): grade reordenável com notas`.

### Task 5: Cabeçalho, ações e formulário

**Files:**

- Create: `features/collections/components/collection-header.tsx`, `features/collections/components/collection-actions.tsx`, `features/collections/components/collection-form.tsx`, `features/collections/components/emoji-picker.tsx`, `components/ui/switch.tsx`, `e2e/collection-actions.spec.ts`
- Modify: `app/(app)/dev/colecao/[slug]/page.tsx`, `app/(app)/dev/_components/collections-demo.tsx`

**Interfaces:**

- Consumes: Tasks 2 e 3.
- Produces: `<CollectionHeader collection>` (emoji, título em serif, descrição, dono e colaboradores empilhados, selo "Privada", "Inspirado em @fulano", contadores em mono); `<LikeButton liked count onToggle>`, `<SaveButton saved onToggle>` ("Salvar" ↔ "Salva" com `popLayout`), `<ShareButton url title>` (Web Share no celular; senão copia o link e mostra o toast "Link copiado"), `<CopyCollectionButton onCopy>` (toast "Coleção copiada · Abrir"); `onToggle` e `onCopy` são Server Actions injetadas que devolvem `ActionResult`, com `useOptimistic`, botão travado enquanto a cópia anda e volta atrás com toast gentil no erro; `<CollectionForm defaultValues onSubmit>` dentro do `Sheet` (react-hook-form + zod; emoji numa grade curada + "Outro"; visibilidade no `SegmentedControl`; "Colaborativa" num `Switch` que revela o convite por @ com `layout`); `<Switch>` do Radix restilizado.

- [ ] **Step 1: Testes** (E2E no dev): curtir alterna `aria-pressed` e o contador; uma ação de exemplo que falha volta atrás com "Não deu para curtir agora"; "Salvar" vira "Salva"; compartilhar copia o link e mostra o toast; copiar mostra o toast com "Abrir"; o formulário mostra "Dê um título à coleção", recusa `😀😀` no "Outro" com "Um emoji só", revela o convite ao ligar "Colaborativa" e, válido, chama a ação e fecha; tudo alcançável pelo teclado.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): cabeçalho, curtir, salvar, compartilhar e formulário`.

### Task 6: Página da coleção

**Files:**

- Create: `app/(app)/colecao/[id]/page.tsx`, `features/collections/queries.ts`, `features/collections/components/collection-page-skeleton.tsx`, `e2e/collection-page.spec.ts`
- Modify: `lib/routes.ts` (sem o `as Route` de `collection`)

**Interfaces:**

- Consumes: Fase 2 (tabelas e `private.can_view_collection`), Tasks 3 a 5.
- Produces: `getPublicCollection(id)` (`'use cache'`, `cacheLife("hours")`, `cacheTag("collection:<id>")`, cliente sem sessão: só as públicas de perfis públicos); `getCollectionForViewer(id)` (com a sessão, dentro de `<Suspense>`: privadas e de perfis privados que a pessoa pode ver, mais `isOwner`, `canEdit`, `liked`, `saved`); página com skeleton, 404 gentil ("Essa coleção não está aqui") para quem não pode ver e metadata com título e descrição.

- [ ] **Step 1: Testes** (E2E com o seed): a coleção pública de uma leitora pública abre para visitante, com cabeçalho e livros na ordem; a privada de outra pessoa dá o 404 gentil para visitante e para quem entrou e não é membro; o membro a vê.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): página da coleção`.

### Task 7: Criar, editar e reordenar

**Files:**

- Create: `features/collections/actions.ts`, `supabase/migrations/<ts>_collection_positions.sql`, `tests/db/collection-positions.test.ts`, `e2e/collections.spec.ts`
- Modify: `app/(app)/colecao/[id]/page.tsx`, `features/shelf/components/add-book/*` (modo coleção)

**Interfaces:**

- Consumes: Task 6; `ensureCatalogBook` e a paleta de adicionar livro (Fase 3).
- Produces: Server Actions (zod → `requireViewer()` → escrita → `updateTag("collection:<id>")` e `updateTag("profile:<username>")` → `ActionResult`): `createCollection(input) → { id }`, `updateCollection(id, input)`, `deleteCollection(id)` (só o dono, com confirmação), `addBookToCollection(collectionId, book)` (`book` como na paleta: `catalogId` ou `SearchResult`; entra depois do último), `removeFromCollection(collectionId, bookId)`, `moveCollectionItem(collectionId, bookId, position)`, `rebalanceCollection(collectionId, orderedBookIds)` e `saveItemNote(collectionId, bookId, note)`; RPC `set_collection_positions(collection uuid, book_ids uuid[], positions text[])` (uma atualização só, com RLS de quem edita); `useAddBook().open({ collectionId })` (escolher um resultado põe o livro na coleção e a paleta segue aberta para o próximo).

- [ ] **Step 1: Testes:** banco: `set_collection_positions` renumera tudo de uma vez e recusa quem não edita; E2E (spec §9): "Nova coleção" com título, emoji e descrição cai na página; "Adicionar livro" põe 3 livros; arrastar o terceiro para o primeiro lugar persiste ao recarregar; reordenar pelo teclado também; editar o título; excluir pede confirmação e volta ao perfil.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): criar, editar e reordenar coleções`.

### Task 8: Curtir, salvar e compartilhar

**Files:**

- Modify: `features/collections/actions.ts`, `app/(app)/colecao/[id]/page.tsx`
- Create: `e2e/collection-social.spec.ts`

**Interfaces:**

- Produces: `setLike(collectionId, liked: boolean)` e `setSave(collectionId, saved: boolean)` (idempotentes: `on conflict do nothing` e `delete`); contador de curtidas; link de compartilhar absoluto (`NEXT_PUBLIC_SITE_URL` + `routes.collection(id)`).

- [ ] **Step 1: Testes** (E2E): curtir soma 1 e continua depois de recarregar; dois cliques rápidos em curtir terminam com uma curtida só; salvar continua depois de recarregar; compartilhar copia o endereço absoluto.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): curtir, salvar e compartilhar`.

### Task 9: Colaboração

**Files:**

- Modify: `features/collections/actions.ts`, `features/collections/components/collection-form.tsx`, `features/collections/components/collection-header.tsx`
- Create: `e2e/collection-members.spec.ts`

**Interfaces:**

- Produces: `inviteMember(collectionId, username)` (só o dono; @ inexistente, o próprio @, quem já é membro e o limite de 20 dão erros gentis), `removeMember(collectionId, userId)` (dono), `leaveCollection(collectionId)` (membro); colaboradores no cabeçalho e no formulário; o membro adiciona, reordena e escreve notas; empate de chaves vira `rebalance`.

- [ ] **Step 1: Testes** (E2E com duas sessões): a dona convida @bia; bia abre a coleção, arrasta um livro e a dona vê a nova ordem ao recarregar; as duas movendo para o mesmo lugar ao mesmo tempo não perdem nem duplicam livros; bia sai; membro removido que tenta mover vê "Você não edita mais esta coleção" e a ordem volta.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): coleções colaborativas`.

### Task 10: Copiar coleção

**Files:**

- Create: `supabase/migrations/<ts>_copy_collection.sql`, `tests/db/copy-collection.test.ts`
- Modify: `features/collections/actions.ts`, `features/collections/components/collection-header.tsx`, `features/collections/queries.ts`

**Interfaces:**

- Produces: `public.copy_collection(source uuid) returns uuid` (`security invoker`: só copia o que a pessoa vê; privada, não colaborativa, mesmos livros, ordem e notas, `copied_from_id`); `copyCollection(id) → { id }`; crédito "Inspirado em @fulano", com link para a origem só se ela ainda for visível.

- [ ] **Step 1: Testes:** banco: a cópia mantém ordem e notas, é de quem copiou, é privada e guarda a origem; coleção invisível não se copia; copiar gera a notificação `collection_copy` para a dona da origem. E2E (spec §9): do perfil de outra leitora, "Copiar coleção" mostra o toast, "Abrir" leva à cópia com "Inspirado em @ana"; dois cliques rápidos fazem uma cópia só.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): copiar coleção com crédito`.

### Task 11: Coleções no perfil, no livro e no ⌘K

**Files:**

- Create: `features/collections/components/add-to-collection.tsx`, `e2e/collections-everywhere.spec.ts`
- Modify: `app/(app)/u/[username]/colecoes/page.tsx`, `app/(app)/livro/[id]/page.tsx`, `features/shelf/components/add-book/*`, `components/shell/command-palette.tsx`, `features/collections/queries.ts`

**Interfaces:**

- Produces: aba Coleções (as públicas para todos; as privadas e aquelas em que a pessoa é membro só para ela; "Salvas" no próprio perfil; "Nova coleção"; cards entrando em sequência de 35ms); `<AddToCollection bookId>` na página do livro (popover com as coleções que a pessoa edita, marcadas quando o livro já está, e "Nova coleção" só com o título); campo "Coleção" no passo do adicionar livro; "Nova coleção" no ⌘K.

- [ ] **Step 1: Testes** (E2E): a aba mostra as públicas para visitante e as privadas só para a dona; uma coleção salva aparece em "Salvas"; pela página do livro, adicionar a uma coleção marca o item; adicionar livro com uma coleção escolhida põe o livro nela; ⌘K "Nova coleção" abre o formulário.
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** Commit `feat(colecoes): coleções no perfil, na página do livro e no ⌘K`.

### Task 12: Fechamento da fase

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run test:db && npm run test:e2e && npm run test:e2e:producao && npm run build`. Expected: exit 0.
- [ ] **Step 2:** Capturas (página da coleção, espiada, formulário, aba do perfil; claro, escuro, 375px e 1440px) e quadros do leque e do arraste.
- [ ] **Step 3:** CLAUDE.md e commit `docs: estado da fase 4`.
