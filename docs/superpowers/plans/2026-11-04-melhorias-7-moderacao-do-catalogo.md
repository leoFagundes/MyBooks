# Melhorias, Fase 7: moderação do catálogo

Branch `melhorias-7-moderacao-do-catalogo`, a partir da `main`. Itens 7.1 e 7.2 do [MELHORIAS.md](../../../MELHORIAS.md).

## Decisões

1. **Livros manuais (7.1).** `books.moderation_status` (pending | approved | rejected), com `moderation_note`.
   - O manual novo nasce pendente (trigger), e os que já existiam ficam aprovados.
   - Quando quem cadastrou muda o título, o subtítulo, a autoria ou a capa de um livro, ele volta à fila.
   - O pendente já está na estante de quem criou, mas a busca, as descobertas, a lista dos mais adicionados e o sitemap só mostram os aprovados.
   - Na página do livro, quem cadastrou vê "em análise" ou o motivo da recusa.
2. **Exclusão lógica e mescla.** `books.deleted_at` e `books.merged_into`.
   - A RLS esconde o excluído de todo mundo, menos da equipe.
   - A mescla (`private.merge_books`) move os itens de coleção, as citações e as atividades. Quando a mesma pessoa tem os dois livros, fica o do alvo, completado com a nota, a resenha e as datas do outro.
   - O `/livro/<id>` antigo redireciona (`book_redirect`).
3. **Sugestões (7.2).** `book_change_requests` (edit | delete | merge, `changes`, `base_snapshot`, `reason`, a revisão), com `target_book_id` na mescla.
   - Cada pessoa tem até 5 pendentes (política de insert).
   - Na página do livro, quem não o cadastrou vê "Algo errado neste livro?":
     - **Sugerir edição** abre o formulário já preenchido. O servidor guarda só o que mudou e o que era antes.
     - **Sugerir exclusão** pede o motivo: duplicado (de qual livro, e aí vira mescla), impróprio, inexistente ou outro.
4. **Revisão no banco.** As funções `review_manual_book`, `review_change_request` e `review_genre` conferem o papel, aplicam tudo numa transação e avisam quem criou ou sugeriu, com a notificação `catalog_review` (refs.kind diz o quê).
   - Rejeitar pede a nota.
   - As ações do painel gravam na auditoria e atualizam o catálogo, o livro e as estantes movidas.
5. **No painel:**
   - a tela **Moderação** (para quem modera) tem as filas de livros novos, sugestões e gêneros;
   - os livros novos podem ser aprovados, editados e aprovados, rejeitados ou marcados como "é duplicado de…";
   - as sugestões aparecem com o diff campo a campo e o aviso de "o livro mudou depois da sugestão";
   - a visão geral soma as três filas.
6. **Testes:**
   - `tests/db/moderation.test.ts`: nasce pendente e fora da busca, só a equipe revisa, a mescla e os conflitos, o redirecionamento, o limite de 5 e a nota da rejeição;
   - dois testes antigos de `shelf.test.ts` acompanham a Fase 2 (o criador edita o próprio livro) e esta (manual pendente fora da busca);
   - uma sonda no dev do fluxo inteiro;
   - a varredura de acessibilidade achou o `aria-label` dos cards do Explorar, que não continha o texto da capa tipográfica, e ele saiu.
