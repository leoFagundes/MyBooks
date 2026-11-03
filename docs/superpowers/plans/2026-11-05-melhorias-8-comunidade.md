# Melhorias, Fase 8: comunidade

Branch `melhorias-8-comunidade`, a partir da `main`. Itens 8.1 e 8.2 do [MELHORIAS.md](../../../MELHORIAS.md).

## Decisões

1. **Fórum (8.1).** As tabelas são estas:
   - `forum_categories`, criadas pelo admin, com cinco de partida: Geral, Recomendações, Clubes de leitura, Discussões de livros e Ajuda;
   - `forum_topics`, com tags, `has_spoilers`, fixado, trancado e oculto;
   - `forum_topic_books`, os livros ligados;
   - `forum_replies`, com um nível de aninhamento e a resposta de outra resposta pendurada no pai (`forum_reply_shape`);
   - `forum_reactions`, com "curtir" e "útil", no tópico ou na resposta;
   - `forum_subscriptions`, para seguir o tópico.
2. **Markdown leve, sem HTML.** `features/community/lib/markdown.ts` vira o texto numa árvore, que o `RichText` desenha como elementos do React.
   - Aceita negrito, itálico, link (só http e https), citação, lista, `||spoiler||` (desfocado até o toque) e `@usuário`.
   - `[[livro:<id>]]`, num parágrafo só dele, vira o card do livro; no meio da frase, vira o chip.
   - O editor tem a barra, a prévia e "Livro" (busca no catálogo), numa gaveta.
3. **Avisos.**
   - Responder avisa quem segue o tópico (`forum_reply`) e quem escreveu a resposta pai.
   - Quem abre o tópico ou responde passa a segui-lo.
   - `@` no texto avisa a pessoa (`forum_mention`).
   - Tudo isso sai por trigger, no sino.
4. **Antispam no banco** (`private.community_anti_spam`):
   - até 4 publicações por minuto, ou 1 para contas com menos de um dia;
   - links só depois de 3 publicações;
   - o erro sai com a dica `rate_limit` ou `links`, que o `postingError` traduz.
5. **Moderação.**
   - A equipe fixa, tranca, move e oculta tópicos (`moderate_topic`) e oculta respostas.
   - As denúncias (`content_reports`) entram na aba "Denúncias" da tela Moderação, agrupadas por alvo, e `review_report` oculta ou dispensa.
   - Quem escreveu edita (marca "editado") e exclui.
   - As categorias ficam em Configurações do site.
6. **Sugestões (8.2).** As tabelas são `feature_suggestions`, `suggestion_votes` (quem sugere já vota) e `suggestion_comments`.
   - Ao digitar o título, aparecem as parecidas (`similar_suggestions`, pg_trgm).
   - Há votos com NumberFlow, comentários, ordem e filtro de status.
   - O admin muda o status com a resposta oficial (`set_suggestion_status`, que avisa quem votou com `suggestion_status`).
   - "Enviar sugestão" fica em Configurações (`/sugestoes?nova=1`).
   - Reaproveita o editor, as denúncias e o `RichText` do fórum.
7. **Onde aparece:**
   - Comunidade na barra do computador e no ⌘K, mais o link "Converse no fórum" no Explorar;
   - na página do livro, a seção "Discussões", com "Abrir uma discussão";
   - no celular, pelo Explorar e pelo ⌘K, para a pílula não crescer.
8. **Movimento.** A resposta nova entra com `layout` e `AnimatePresence` (só as novas animam). A reação dá um "pop" em dois passos: a mola só aceita dois quadros-chave.
9. **Testes:**
   - `tests/db/community.test.ts`: o aninhamento, a menção, os avisos da resposta, o antispam, o trancado, o ocultar e as denúncias;
   - `markdown.test.ts`;
   - sondas no dev dos dois fluxos inteiros;
   - `/comunidade` e `/sugestoes` entram na varredura de acessibilidade, que achou o `aria-label` sem papel nos esqueletos (do Explorar e da comunidade), que ganharam `role="status"`.
