-- Livro da Open Library ou do Google só entra pelo servidor, que pega os
-- dados na própria fonte (com a chave secreta, sem RLS). Quem está logado
-- cadastra direto só livro manual: assim ninguém ocupa a obra de uma fonte
-- (source, source_id) com título ou capa inventados.
alter policy "readers add books in their own name"
  on public.books
  rename to "readers add manual books in their own name";

alter policy "readers add manual books in their own name"
  on public.books
  with check (created_by = (select auth.uid()) and source = 'manual');
