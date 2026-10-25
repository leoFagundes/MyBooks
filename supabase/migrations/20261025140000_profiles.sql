-- Perfis: um por conta, criado pelo trigger do cadastro.

-- Funções internas ficam fora dos schemas expostos pela API
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role, supabase_auth_admin;

create extension if not exists unaccent with schema extensions;

-- unaccent é stable porque o dicionário pode mudar; o invólucro imutável
-- permite usá-lo em índices e checks
create or replace function private.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Rotas do app e nomes que parecem oficiais. O app espelha a lista na
-- validação do @ (features/profile/lib/username.ts)
create or replace function private.reserved_usernames()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    'admin', 'administrador', 'ajuda', 'api', 'auth', 'cadastro', 'citacoes',
    'colecao', 'colecoes', 'configuracoes', 'contato', 'dev', 'entrar',
    'equipe', 'estante', 'explorar', 'inicio', 'livro', 'livros', 'moderador',
    'mybooks', 'notificacoes', 'null', 'oficial', 'onboarding', 'root', 'sair',
    'sistema', 'sobre', 'suporte', 'undefined', 'usuario', 'www'
  ]
$$;

-- "  @Lia Lê " → "lia_le": sem acento, minúsculo, "_" no lugar do resto
create or replace function private.normalize_username(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(lower(private.immutable_unaccent(value)), '[^a-z0-9_]+', '_', 'g'),
      '_{2,}', '_', 'g'
    ),
    '_'
  )
$$;

create or replace function private.are_slugs(value text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(bool_and(item ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(item) <= 40), true)
  from unnest(value) as item
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  favorite_genres text[] not null default '{}',
  is_private boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_username_not_reserved
    check (not (username = any (private.reserved_usernames()))),
  constraint profiles_display_name_length check (
    display_name = btrim(display_name) and char_length(display_name) between 1 and 60
  ),
  constraint profiles_bio_length check (char_length(bio) <= 160),
  -- Só a pasta da própria pessoa no nosso bucket (caminho, sem domínio) ou o
  -- avatar do Google: nada de imagem de terceiros que rastreie quem vê
  constraint profiles_avatar_source check (
    avatar_url ~ ('^avatars/' || id::text || '/[A-Za-z0-9._-]+$')
    or avatar_url ~ '^https://lh3\.googleusercontent\.com/[^[:space:]]+$'
  ),
  constraint profiles_favorite_genres_valid
    check (cardinality(favorite_genres) <= 10 and private.are_slugs(favorite_genres))
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

-- O cabeçalho de todo perfil é público, inclusive dos privados; o conteúdo
-- (estante, coleções, citações) é que segue a privacidade
create policy "profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "people edit their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Perfil nasce pelo trigger e some com a conta: ninguém cria nem apaga pela API
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, bio, avatar_url, favorite_genres, is_private, onboarded_at)
  on table public.profiles to authenticated;

-- @ provisório a partir do @ escolhido, do nome do Google ou do e-mail; a
-- pessoa confirma ou troca no onboarding
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := nullif(btrim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), '');
  avatar text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
  base text;
  candidate text;
  attempt int := 0;
begin
  base := coalesce(
    nullif(private.normalize_username(meta ->> 'username'), ''),
    nullif(private.normalize_username(full_name), ''),
    nullif(private.normalize_username(split_part(new.email, '@', 1)), ''),
    ''
  );
  base := btrim(left(base, 20), '_');
  if char_length(base) < 3 then
    base := btrim(left(base || '_leitor', 20), '_');
  end if;

  if not coalesce(avatar ~ '^https://lh3\.googleusercontent\.com/[^[:space:]]+$', false) then
    avatar := null;
  end if;

  candidate := base;
  loop
    if not (candidate = any (private.reserved_usernames())) then
      begin
        insert into public.profiles (id, username, display_name, avatar_url)
        values (new.id, candidate, nullif(btrim(left(full_name, 60)), ''), avatar);
        return new;
      exception when unique_violation then
        -- Outro cadastro já tem esse @: tenta o próximo sufixo
        if attempt >= 1000 then
          raise;
        end if;
      end;
    end if;
    attempt := attempt + 1;
    candidate := left(base, 20 - char_length(attempt::text)) || attempt::text;
  end loop;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
