-- Painel administrativo (MELHORIAS 6): papéis, sanções, configurações do
-- site e o registro de auditoria. Nada disso se escreve pelo cliente: o
-- servidor grava com a chave secreta, depois de conferir o papel de quem pede.

-- Papéis. Só por SQL ou pelo painel do Supabase (e o promover a moderador do
-- /admin, que roda no servidor). O cliente não lê a tabela: pergunta às funções
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role),
  constraint user_roles_role_valid check (role in ('admin', 'moderator'))
);

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Admin também modera
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('admin', 'moderator')
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_moderator() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_moderator() to anon, authenticated;

-- Suspensão (com prazo) e banimento (sem prazo). Quem vale é a mais nova sem
-- lifted_at e ainda no prazo; o bloqueio de verdade é o ban_duration do Auth
create table public.account_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  reason text not null,
  ends_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references public.profiles (id) on delete set null,

  constraint account_sanctions_kind_valid check (kind in ('suspension', 'ban')),
  constraint account_sanctions_reason_length check (reason = btrim(reason) and char_length(reason) between 3 and 500),
  constraint account_sanctions_suspension_ends check (kind = 'ban' or ends_at is not null)
);

create index account_sanctions_user_id_idx on public.account_sanctions (user_id, created_at desc);

alter table public.account_sanctions enable row level security;

create policy "moderators read sanctions"
  on public.account_sanctions for select
  to authenticated
  using ((select public.is_moderator()));

revoke all on table public.account_sanctions from anon, authenticated;
grant select on table public.account_sanctions to authenticated;

-- Configurações do site: o aviso no topo, o modo manutenção e as
-- funcionalidades liga/desliga. Públicas para leitura (a página precisa delas)
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint site_settings_key_valid check (key in ('banner', 'maintenance', 'features'))
);

alter table public.site_settings enable row level security;

create policy "site settings are public"
  on public.site_settings for select
  using (true);

revoke all on table public.site_settings from anon, authenticated;
grant select on table public.site_settings to anon, authenticated;

insert into public.site_settings (key, value) values
  ('banner', '{"enabled": false, "message": "", "tone": "info"}'),
  ('maintenance', '{"enabled": false, "message": ""}'),
  ('features', '{"cadastro": true, "criar_generos": true, "importar_goodreads": true, "visualizador_3d": true}');

-- Toda ação administrativa: quem, o quê, em quem, quando, antes e depois
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admins read the audit log"
  on public.admin_audit_log for select
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.admin_audit_log from anon, authenticated;
grant select on table public.admin_audit_log to authenticated;

-- A sanção que vale agora para alguém (ou nada)
create or replace function private.current_sanction(target uuid)
returns public.account_sanctions
language sql
stable
security definer
set search_path = ''
as $$
  select s.*
  from public.account_sanctions as s
  where s.user_id = target
    and s.lifted_at is null
    and (s.ends_at is null or s.ends_at > now())
  order by s.created_at desc
  limit 1;
$$;

-- Os números da visão geral, para quem modera. Ativo é quem mexeu na estante
-- ou fez alguma atividade no período
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', jsonb_build_object(
      'day', (select count(*) from public.profiles where created_at >= now() - interval '1 day'),
      'week', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
      'month', (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
      'total', (select count(*) from public.profiles)
    ),
    'active', jsonb_build_object(
      'week', (
        select count(*) from (
          select actor_id from public.activities where created_at >= now() - interval '7 days'
          union
          select user_id from public.user_books where updated_at >= now() - interval '7 days'
        ) as people
      ),
      'month', (
        select count(*) from (
          select actor_id from public.activities where created_at >= now() - interval '30 days'
          union
          select user_id from public.user_books where updated_at >= now() - interval '30 days'
        ) as people
      )
    ),
    'books', jsonb_build_object(
      'week', (select count(*) from public.books where created_at >= now() - interval '7 days'),
      'month', (select count(*) from public.books where created_at >= now() - interval '30 days'),
      'total', (select count(*) from public.books)
    ),
    'collections', jsonb_build_object(
      'week', (select count(*) from public.collections where created_at >= now() - interval '7 days'),
      'month', (select count(*) from public.collections where created_at >= now() - interval '30 days'),
      'total', (select count(*) from public.collections)
    ),
    'pending', jsonb_build_object(
      'genres', (select count(*) from public.genres where status = 'pending')
    ),
    -- Leitores novos por semana, nas últimas 12 (a semana começa na segunda)
    'growth', (
      select jsonb_agg(jsonb_build_object('week', week, 'users', users) order by week)
      from (
        select
          weeks.week::date as week,
          (
            select count(*) from public.profiles as p
            where p.created_at >= weeks.week and p.created_at < weeks.week + interval '1 week'
          ) as users
        from generate_series(
          date_trunc('week', now()) - interval '11 weeks',
          date_trunc('week', now()),
          interval '1 week'
        ) as weeks (week)
      ) as series
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- A lista de usuários do painel, com busca, filtro, ordem e página no
-- servidor. O e-mail vem do auth.users: só quem modera chega aqui
create or replace function public.admin_users(
  q text default null,
  status_filter text default null,
  sort text default 'created_at',
  direction text default 'desc',
  page int default 0,
  page_size int default 20
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz,
  books bigint,
  role text,
  sanction text,
  sanction_ends_at timestamptz,
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
  key text := case when sort in ('username', 'books') then sort else 'created_at' end;
  size int := greatest(1, least(coalesce(page_size, 20), 100));
  offset_rows int := greatest(0, coalesce(page, 0)) * greatest(1, least(coalesce(page_size, 20), 100));
  ascending boolean := lower(coalesce(direction, 'desc')) = 'asc';
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;

  return query
  with people as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      u.email::text as email,
      p.created_at,
      (select count(*) from public.user_books as ub where ub.user_id = p.id) as books,
      (
        select r.role from public.user_roles as r
        where r.user_id = p.id
        order by case r.role when 'admin' then 0 else 1 end
        limit 1
      ) as role,
      s.kind as sanction,
      s.ends_at as sanction_ends_at
    from public.profiles as p
    left join auth.users as u on u.id = p.id
    left join lateral private.current_sanction(p.id) as s on s.id is not null
    where term is null
      or p.username ilike '%' || term || '%'
      or p.display_name ilike '%' || term || '%'
      or u.email ilike '%' || term || '%'
  ),
  filtered as (
    select * from people
    where case coalesce(status_filter, '')
      when 'suspensos' then people.sanction = 'suspension'
      when 'banidos' then people.sanction = 'ban'
      when 'moderadores' then people.role is not null
      else true
    end
  )
  select f.*, count(*) over () as total
  from filtered as f
  order by
    case when key = 'username' and ascending then f.username end asc,
    case when key = 'username' and not ascending then f.username end desc,
    case when key = 'books' and ascending then f.books end asc,
    case when key = 'books' and not ascending then f.books end desc,
    case when key = 'created_at' and ascending then f.created_at end asc,
    case when key = 'created_at' and not ascending then f.created_at end desc,
    f.id
  limit size offset offset_rows;
end;
$$;

revoke all on function public.admin_users(text, text, text, text, int, int) from public, anon;
grant execute on function public.admin_users(text, text, text, text, int, int) to authenticated;
