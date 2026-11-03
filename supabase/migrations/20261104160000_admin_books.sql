-- Os livros que não vieram da Open Library e os excluídos pela moderação,
-- no painel, e a busca que não traz de volta o que a moderação tirou.

-- Quais destas chaves ("openlibrary:<obra>", "google:<id>" ou "isbn:<13>")
-- são de livros excluídos (ou mesclados): a busca esconde esses resultados
-- de fora. Só as chaves voltam, nada do livro
create or replace function public.removed_book_keys(keys text[])
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select key
  from unnest(keys) as key
  where exists (
    select 1 from public.books as b
    where b.deleted_at is not null
      and (
        b.source || ':' || b.source_id = key
        or 'isbn:' || b.isbn_13 = key
      )
  );
$$;

revoke all on function public.removed_book_keys(text[]) from public;
grant execute on function public.removed_book_keys(text[]) to anon, authenticated;

-- Avisar quem cadastrou que o livro saiu do catálogo
create or replace function public.moderate_book(
  book uuid,
  action text,
  note text default null,
  changes jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.books;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into item from public.books where id = book;
  if item.id is null then
    raise exception 'livro não encontrado' using errcode = 'P0002';
  end if;

  if action = 'edit' then
    if changes is null or changes = '{}' then
      raise exception 'nada mudou' using errcode = '22023';
    end if;
    perform private.apply_book_changes(book, changes);
  elsif action = 'delete' then
    if item.deleted_at is not null then
      raise exception 'livro já excluído' using errcode = '22023';
    end if;
    update public.books set deleted_at = now() where id = book;
    if item.source = 'manual' then
      perform private.review_notice(item.created_by, 'book_removed', null, item.title, nullif(btrim(note), ''));
    end if;
  elsif action = 'restore' then
    if item.deleted_at is null then
      raise exception 'livro não está excluído' using errcode = '22023';
    end if;
    -- Restaurar um mesclado não desfaz a mescla: as estantes ficam no outro
    update public.books set deleted_at = null, merged_into = null where id = book;
  else
    raise exception 'ação inválida' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.moderate_book(uuid, text, text, jsonb) from public, anon;
grant execute on function public.moderate_book(uuid, text, text, jsonb) to authenticated;

-- A lista do painel: os livros que não são da Open Library (cadastrados à mão
-- e os do Google Books) e todos os excluídos, com busca, filtro, ordem e
-- página no banco
create or replace function public.admin_books(
  q text default null,
  status_filter text default null,
  sort text default 'created_at',
  direction text default 'desc',
  page int default 0,
  page_size int default 20
)
returns table (
  id uuid,
  title text,
  authors text[],
  source text,
  cover_url text,
  cover_color text,
  cover_style text,
  page_count int,
  published_year int,
  moderation_status text,
  moderation_note text,
  deleted_at timestamptz,
  merged_into uuid,
  merged_title text,
  creator text,
  created_at timestamptz,
  shelves bigint,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  term text := nullif(btrim(coalesce(q, '')), '');
  key text := case when sort in ('title', 'shelves') then sort else 'created_at' end;
  size int := greatest(1, least(coalesce(page_size, 20), 100));
  offset_rows int := greatest(0, coalesce(page, 0)) * greatest(1, least(coalesce(page_size, 20), 100));
  ascending boolean := lower(coalesce(direction, 'desc')) = 'asc';
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  return query
  with listed as (
    select
      b.id,
      b.title,
      b.authors,
      b.source,
      b.cover_url,
      b.cover_color,
      b.cover_style,
      b.page_count,
      b.published_year,
      b.moderation_status,
      b.moderation_note,
      b.deleted_at,
      b.merged_into,
      m.title as merged_title,
      p.username as creator,
      b.created_at,
      (select count(*) from public.user_books as ub where ub.book_id = b.id) as shelves
    from public.books as b
    left join public.books as m on m.id = b.merged_into
    left join public.profiles as p on p.id = b.created_by
    where
      case coalesce(status_filter, '')
        when 'excluidos' then b.deleted_at is not null
        when 'pendentes' then b.deleted_at is null and b.moderation_status = 'pending'
        when 'rejeitados' then b.deleted_at is null and b.moderation_status = 'rejected'
        else b.deleted_at is null and b.source <> 'openlibrary'
      end
      and (
        term is null
        or private.book_search_key(b.title, b.authors) like '%' || private.search_key(term) || '%'
        or p.username ilike '%' || term || '%'
        or b.isbn_13 = term
      )
  )
  select l.*, count(*) over () as total
  from listed as l
  order by
    case when key = 'title' and ascending then l.title end asc,
    case when key = 'title' and not ascending then l.title end desc,
    case when key = 'shelves' and ascending then l.shelves end asc,
    case when key = 'shelves' and not ascending then l.shelves end desc,
    case when key = 'created_at' and ascending then l.created_at end asc,
    case when key = 'created_at' and not ascending then l.created_at end desc,
    l.id
  limit size offset offset_rows;
end;
$$;

revoke all on function public.admin_books(text, text, text, text, int, int) from public, anon;
grant execute on function public.admin_books(text, text, text, text, int, int) to authenticated;
