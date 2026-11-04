-- Gêneros no livro cadastrado à mão (ajustes finais): quem cadastrou escolhe
-- no cadastro e na edição, entre os oficiais, os aprovados e os que criou
-- (esses aparecem no livro depois da aprovação). O insert já aceitava a
-- coluna; a edição passa a aceitar também.

grant update (genres) on table public.books to authenticated;

-- Pelo cliente, só gênero que existe e que a pessoa pode ver. O servidor
-- (sem sessão) traduz os assuntos da Open Library para os oficiais.
create or replace function private.book_genres_exist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and exists (
    select 1
    from unnest(new.genres) as chosen (slug)
    where not exists (
      select 1
      from public.genres as genre
      where genre.slug = chosen.slug
        and (genre.status = 'approved' or genre.created_by = (select auth.uid()))
    )
  ) then
    raise exception 'gênero desconhecido' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger books_genres_exist
  before insert or update of genres on public.books
  for each row execute function private.book_genres_exist();
