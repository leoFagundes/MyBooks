-- Capa personalizada (melhorias, fase 2.3) e preferências da conta (2.2).

-- Estilo da capa tipográfica: null é a Clássica. O app espelha a lista em
-- COVER_STYLES (features/books/lib/cover-style.ts)
alter table public.books add column cover_style text;
alter table public.books add constraint books_cover_style_valid
  check (cover_style in ('classic', 'framed', 'band', 'minimal'));

-- Imagem enviada por quem cadastra: fica numa pasta com versão
-- (covers/<id>/<versão>/), e trocar a imagem muda a URL. O arquivo de uma
-- versão nunca muda, então o cache de um ano continua valendo
alter table public.books drop constraint books_cover_source;
alter table public.books add constraint books_cover_source check (
  cover_url ~ '^https://covers\.openlibrary\.org/b/(id|isbn|olid)/[A-Za-z0-9]+-[SML]\.jpg$'
  or cover_url = 'covers/' || id::text
  or cover_url ~ ('^covers/' || id::text || '/[0-9a-z]{8}$')
);

grant insert (cover_style) on table public.books to authenticated;

-- Quem cadastrou um livro à mão pode corrigi-lo: dados, cor e estilo da capa.
-- A imagem (cover_url) só o servidor grava, depois de pôr os arquivos no
-- bucket. Livro das fontes não se edita
create policy "creators edit their manual books"
  on public.books for update
  to authenticated
  using (created_by = (select auth.uid()) and source = 'manual')
  with check (created_by = (select auth.uid()) and source = 'manual');

grant update (
  title, subtitle, authors, page_count, published_year, isbn_13, isbn_10,
  cover_color, cover_style
) on table public.books to authenticated;

-- Preferências da conta (a vista da estante, por enquanto). Ficam fora de
-- profiles, que é público: só a própria pessoa lê e escreve a sua linha
create table public.profile_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),

  constraint profile_preferences_object check (jsonb_typeof(preferences) = 'object'),
  constraint profile_preferences_size check (octet_length(preferences::text) <= 2048),
  -- O app espelha os valores em SHELF_VIEWS (features/shelf/lib/view.ts)
  constraint profile_preferences_shelf_view check (
    not preferences ? 'shelfView'
    or preferences ->> 'shelfView' in ('estante', 'grade', 'lista')
  )
);

create trigger profile_preferences_set_updated_at
  before update on public.profile_preferences
  for each row execute function private.set_updated_at();

alter table public.profile_preferences enable row level security;

create policy "people read their own preferences"
  on public.profile_preferences for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "people save their own preferences"
  on public.profile_preferences for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "people change their own preferences"
  on public.profile_preferences for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

revoke all on table public.profile_preferences from anon, authenticated;
grant select on table public.profile_preferences to authenticated;
grant insert (profile_id, preferences) on table public.profile_preferences to authenticated;
grant update (preferences) on table public.profile_preferences to authenticated;

-- Junta as chaves novas às que já estavam (a RLS vale: só a própria linha)
create or replace function public.merge_preferences(patch jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  insert into public.profile_preferences as stored (profile_id, preferences)
  values ((select auth.uid()), patch)
  on conflict (profile_id) do update
    set preferences = stored.preferences || excluded.preferences
  returning preferences
$$;

revoke all on function public.merge_preferences(jsonb) from public;
grant execute on function public.merge_preferences(jsonb) to authenticated;
