-- Catálogo compartilhado, estante, citações e quem segue quem.

create extension if not exists pg_trgm with schema extensions;

-- Todos os itens preenchidos, sem espaço sobrando e dentro do limite
create or replace function private.valid_text_items(value text[], max_length int)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(
    bool_and(item is not null and item = btrim(item) and char_length(item) between 1 and max_length),
    true
  )
  from unnest(value) as item
$$;

-- Chave de busca: sem acento, minúsculo e só letras e números
create or replace function private.search_key(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select btrim(regexp_replace(lower(private.immutable_unaccent(value)), '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function private.book_search_key(title text, authors text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select private.search_key(title || ' ' || array_to_string(authors, ' '))
$$;

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  authors text[] not null default '{}',
  description text,
  page_count int,
  published_year int,
  isbn_13 text unique,
  isbn_10 text,
  language text,
  genres text[] not null default '{}',
  cover_url text,
  cover_color text,
  source text not null,
  source_id text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint books_source_valid check (source in ('openlibrary', 'google', 'manual')),
  constraint books_source_id_matches_source check ((source = 'manual') = (source_id is null)),
  constraint books_source_id_length check (char_length(source_id) between 1 and 64),
  constraint books_source_unique unique (source, source_id),
  -- Os limites espelham BOOK_LIMITS (features/books/lib/search-result.ts)
  constraint books_title_length check (title = btrim(title) and char_length(title) between 1 and 300),
  constraint books_subtitle_length check (subtitle = btrim(subtitle) and char_length(subtitle) between 1 and 300),
  constraint books_authors_valid check (cardinality(authors) <= 10 and private.valid_text_items(authors, 200)),
  constraint books_description_length check (char_length(description) <= 5000),
  constraint books_page_count_range check (page_count between 1 and 20000),
  constraint books_published_year_range check (published_year between 1 and 2100),
  constraint books_isbn_13_format check (isbn_13 ~ '^97[89][0-9]{10}$'),
  constraint books_isbn_10_format check (isbn_10 ~ '^[0-9]{9}[0-9X]$'),
  constraint books_language_format check (language ~ '^[a-z]{2}$'),
  constraint books_genres_valid check (cardinality(genres) <= 8 and private.are_slugs(genres)),
  constraint books_cover_color_format check (cover_color ~ '^#[0-9a-f]{6}$'),
  -- Capa da Open Library (seed e busca) ou a pasta do próprio livro no nosso
  -- bucket, onde ficam as três larguras: nada de imagem de terceiros
  constraint books_cover_source check (
    cover_url ~ '^https://covers\.openlibrary\.org/b/(id|isbn|olid)/[A-Za-z0-9]+-[SML]\.jpg$'
    or cover_url = 'covers/' || id::text
  )
);

create index books_search_idx on public.books
  using gin (private.book_search_key(title, authors) extensions.gin_trgm_ops);

-- Busca do catálogo: "sertao" acha "Sertão", o autor também conta e erro
-- de digitação passa pela semelhança de trigramas
create or replace function public.search_catalog(q text, max_results int default 8)
returns setof public.books
language sql
stable
set search_path = ''
as $$
  with query as (select private.search_key(q) as key)
  select b.*
  from public.books as b, query
  where char_length(query.key) >= 2
    and (
      private.book_search_key(b.title, b.authors) like '%' || query.key || '%'
      or query.key operator(extensions.<%) private.book_search_key(b.title, b.authors)
    )
  order by
    extensions.word_similarity(query.key, private.book_search_key(b.title, b.authors)) desc,
    b.title
  limit greatest(1, least(coalesce(max_results, 8), 20))
$$;

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_status_valid check (status in ('accepted', 'pending')),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id, status);

-- O status vem do perfil seguido, nunca do cliente: privado vira pedido
create or replace function private.set_follow_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select case when p.is_private then 'pending' else 'accepted' end
  into new.status
  from public.profiles as p
  where p.id = new.following_id;
  return new;
end;
$$;

create trigger follows_set_status
  before insert on public.follows
  for each row execute function private.set_follow_status();

-- Conteúdo de alguém (estante, citações, coleções, atividades) é visível
-- para o dono, para todos se o perfil é público e, se é privado, só para
-- seguidores aceitos. security definer: lê follows sem cair na RLS dele
create or replace function private.can_view_content(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(owner = (select auth.uid()), false)
    or exists (select 1 from public.profiles as p where p.id = owner and not p.is_private)
    or exists (
      select 1
      from public.follows as f
      where f.follower_id = (select auth.uid())
        and f.following_id = owner
        and f.status = 'accepted'
    )
$$;

create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  status text not null,
  rating numeric(2, 1),
  review text,
  started_at date,
  finished_at date,
  current_page int,
  copied_from_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_books_unique unique (user_id, book_id),
  constraint user_books_status_valid check (status in ('read', 'reading', 'want', 'abandoned')),
  constraint user_books_rating_halves check (rating between 0.5 and 5 and rating * 2 = trunc(rating * 2)),
  constraint user_books_review_length check (char_length(review) <= 10000),
  constraint user_books_dates_ordered check (finished_at >= started_at),
  constraint user_books_current_page_range check (current_page between 0 and 20000),
  constraint user_books_not_copied_from_self check (copied_from_user_id <> user_id)
);

create index user_books_book_id_idx on public.user_books (book_id);

create trigger user_books_set_updated_at
  before update on public.user_books
  for each row execute function private.set_updated_at();

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  text text not null,
  page int,
  created_at timestamptz not null default now(),
  constraint quotes_text_length check (text = btrim(text) and char_length(text) between 1 and 1000),
  constraint quotes_page_range check (page between 1 and 20000)
);

create index quotes_user_id_idx on public.quotes (user_id);
create index quotes_book_id_idx on public.quotes (book_id);

-- Catálogo: todos leem; quem está logado acrescenta em nome próprio; ninguém
-- edita nem apaga, porque o mesmo livro está na estante de outras pessoas
alter table public.books enable row level security;

create policy "catalog is public"
  on public.books for select
  to anon, authenticated
  using (true);

create policy "readers add books in their own name"
  on public.books for insert
  to authenticated
  with check (created_by = (select auth.uid()));

revoke all on table public.books from anon, authenticated;
grant select on table public.books to anon, authenticated;
grant insert (
  id, title, subtitle, authors, description, page_count, published_year, isbn_13,
  isbn_10, language, genres, cover_url, cover_color, source, source_id, created_by
) on table public.books to authenticated;

-- Estante e citações: seguem a privacidade do perfil; só o dono escreve
alter table public.user_books enable row level security;

create policy "shelves follow profile privacy"
  on public.user_books for select
  to anon, authenticated
  using (private.can_view_content(user_id));

create policy "people add to their own shelf"
  on public.user_books for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "people edit their own shelf"
  on public.user_books for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "people remove from their own shelf"
  on public.user_books for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_books from anon, authenticated;
grant select on table public.user_books to anon, authenticated;
-- O upsert do PostgREST repete user_id e book_id no update; a RLS é que
-- impede mover o livro para a estante de outra pessoa
grant insert (
  user_id, book_id, status, rating, review, started_at, finished_at, current_page, copied_from_user_id
) on table public.user_books to authenticated;
grant update (
  user_id, book_id, status, rating, review, started_at, finished_at, current_page, copied_from_user_id
) on table public.user_books to authenticated;
grant delete on table public.user_books to authenticated;

alter table public.quotes enable row level security;

create policy "quotes follow profile privacy"
  on public.quotes for select
  to anon, authenticated
  using (private.can_view_content(user_id));

create policy "people quote in their own name"
  on public.quotes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "people edit their own quotes"
  on public.quotes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "people delete their own quotes"
  on public.quotes for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.quotes from anon, authenticated;
grant select on table public.quotes to anon, authenticated;
grant insert (user_id, book_id, text, page) on table public.quotes to authenticated;
grant update (text, page) on table public.quotes to authenticated;
grant delete on table public.quotes to authenticated;

-- Follows: os dois lados sempre veem; aceitos, quem pode ver um dos perfis.
-- Pedido pendente fica entre os dois
alter table public.follows enable row level security;

create policy "both sides and allowed viewers see follows"
  on public.follows for select
  to anon, authenticated
  using (
    (select auth.uid()) in (follower_id, following_id)
    or (
      status = 'accepted'
      and (private.can_view_content(follower_id) or private.can_view_content(following_id))
    )
  );

create policy "people follow in their own name"
  on public.follows for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

create policy "the followed person accepts requests"
  on public.follows for update
  to authenticated
  using (following_id = (select auth.uid()))
  with check (following_id = (select auth.uid()) and status = 'accepted');

create policy "either side ends a follow"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) in (follower_id, following_id));

revoke all on table public.follows from anon, authenticated;
grant select on table public.follows to anon, authenticated;
grant insert (follower_id, following_id, status) on table public.follows to authenticated;
grant update (status) on table public.follows to authenticated;
grant delete on table public.follows to authenticated;
