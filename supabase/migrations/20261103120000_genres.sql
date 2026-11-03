-- Gêneros (MELHORIAS 5.4): os oficiais do MyBooks e os que os leitores
-- criam. A fonte dos favoritos passa a ser user_favorite_genres; o
-- profiles.favorite_genres fica como espelho, mantido pelo banco (ninguém o
-- escreve), com os gêneros aprovados, para as funções de afinidade e de
-- sugestões continuarem lendo um array só.

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_official boolean not null default false,
  status text not null default 'pending',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  constraint genres_name_length check (name = btrim(name) and char_length(name) between 2 and 40),
  constraint genres_slug_format check (char_length(slug) >= 2 and private.are_slugs(array[slug])),
  constraint genres_status_valid check (status in ('approved', 'pending', 'rejected')),
  constraint genres_official_approved check (not is_official or status = 'approved')
);

create index genres_created_by_idx on public.genres (created_by);

alter table public.genres enable row level security;

-- Os aprovados são de todos; quem criou vê também os seus, ainda pendentes
create policy "approved genres are public"
  on public.genres for select
  using (status = 'approved' or created_by = (select auth.uid()));

-- Gênero novo nasce pendente e não oficial: só um admin o aprova (Fase 7)
create policy "readers suggest genres"
  on public.genres for insert
  to authenticated
  with check (created_by = (select auth.uid()) and status = 'pending' and not is_official);

revoke all on table public.genres from anon, authenticated;
grant select on table public.genres to anon, authenticated;
grant insert (name, slug, created_by) on table public.genres to authenticated;

-- Os mesmos de features/profile/genres.ts
insert into public.genres (name, slug, is_official, status) values
  ('Literatura brasileira', 'literatura-brasileira', true, 'approved'),
  ('Clássicos', 'classicos', true, 'approved'),
  ('Ficção', 'ficcao', true, 'approved'),
  ('Romance', 'romance', true, 'approved'),
  ('Contos', 'contos', true, 'approved'),
  ('Poesia', 'poesia', true, 'approved'),
  ('Fantasia', 'fantasia', true, 'approved'),
  ('Ficção científica', 'ficcao-cientifica', true, 'approved'),
  ('Distopia', 'distopia', true, 'approved'),
  ('Terror', 'terror', true, 'approved'),
  ('Mistério', 'misterio', true, 'approved'),
  ('Realismo mágico', 'realismo-magico', true, 'approved'),
  ('História', 'historia', true, 'approved'),
  ('Biografias e memórias', 'biografia', true, 'approved'),
  ('Ciência', 'ciencia', true, 'approved'),
  ('Filosofia', 'filosofia', true, 'approved'),
  ('Quadrinhos', 'quadrinhos', true, 'approved'),
  ('Infantojuvenil', 'infantojuvenil', true, 'approved');

create table public.user_favorite_genres (
  user_id uuid not null references public.profiles (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, genre_id),
  constraint user_favorite_genres_position_range check (position between 0 and 9)
);

create index user_favorite_genres_genre_id_idx on public.user_favorite_genres (genre_id);

alter table public.user_favorite_genres enable row level security;

-- Públicos como o perfil; o nome de um gênero pendente continua escondido
-- pela RLS de genres
create policy "favorite genres are public"
  on public.user_favorite_genres for select
  using (true);

-- Cada um favorita para si, e só gêneros que enxerga
create policy "readers pick their genres"
  on public.user_favorite_genres for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.genres as g
      where g.id = genre_id
        and (g.status = 'approved' or g.created_by = (select auth.uid()))
    )
  );

create policy "readers drop their genres"
  on public.user_favorite_genres for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_favorite_genres from anon, authenticated;
grant select on table public.user_favorite_genres to anon, authenticated;
grant insert (user_id, genre_id, position), delete on table public.user_favorite_genres to authenticated;

-- Os favoritos de hoje passam para a tabela, na mesma ordem
insert into public.user_favorite_genres (user_id, genre_id, position)
select p.id, g.id, (s.ord - 1)::smallint
from public.profiles as p
cross join lateral unnest(p.favorite_genres) with ordinality as s (slug, ord)
join public.genres as g on g.slug = s.slug
where s.ord <= 10
on conflict do nothing;

-- O espelho: os aprovados de cada pessoa, na ordem dela
create or replace function private.refresh_favorite_genres(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set favorite_genres = coalesce(
    (
      select array_agg(g.slug order by f.position, g.slug)
      from public.user_favorite_genres as f
      join public.genres as g on g.id = f.genre_id
      where f.user_id = target and g.status = 'approved'
    ),
    '{}'
  )
  where id = target;
$$;

create or replace function private.mirror_favorite_genres()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_favorite_genres(old.user_id);
  else
    perform private.refresh_favorite_genres(new.user_id);
  end if;
  return null;
end;
$$;

create trigger user_favorite_genres_mirror
  after insert or delete on public.user_favorite_genres
  for each row execute function private.mirror_favorite_genres();

-- Aprovado ou recusado (o painel da Fase 7), o espelho de quem o favoritou muda
create or replace function private.mirror_genre_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_favorite_genres(f.user_id)
  from public.user_favorite_genres as f
  where f.genre_id = new.id;
  return null;
end;
$$;

create trigger genres_status_mirror
  after update of status on public.genres
  for each row
  when (old.status is distinct from new.status)
  execute function private.mirror_genre_status();

-- O espelho não se escreve de fora
revoke update (favorite_genres) on public.profiles from authenticated;

-- Troca os favoritos de quem chama, na ordem dada (até 10). Gênero que a
-- pessoa não enxerga (pendente de outra) fica de fora: a RLS filtra o join
create or replace function public.set_favorite_genres(slugs text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  if cardinality(slugs) > 10 then
    raise exception 'até 10 gêneros' using errcode = '22023';
  end if;
  delete from public.user_favorite_genres where user_id = me;
  insert into public.user_favorite_genres (user_id, genre_id, position)
  select me, g.id, (min(s.ord) - 1)::smallint
  from unnest(slugs) with ordinality as s (slug, ord)
  join public.genres as g on g.slug = s.slug
  group by g.id;
end;
$$;

revoke all on function public.set_favorite_genres(text[]) from public, anon;
grant execute on function public.set_favorite_genres(text[]) to authenticated;
