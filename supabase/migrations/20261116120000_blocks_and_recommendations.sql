-- Bloquear e silenciar leitores, denunciar perfil e indicar um livro a alguém.

-- Bloquear e silenciar ---------------------------------------------------------
-- Uma linha por par: bloquear vence silenciar. Silenciar só esconde (a outra
-- pessoa não sabe); bloquear também desfaz o seguir dos dois lados, impede
-- seguir e responder, e fecha o conteúdo de quem bloqueou para quem foi
-- bloqueado
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_kind_valid check (kind in ('block', 'mute')),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- Só quem bloqueou vê a linha: quem foi bloqueado nunca fica sabendo por ela
create policy "people see their own blocks"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on table public.user_blocks from anon, authenticated;
grant select on table public.user_blocks to authenticated;

-- Bloqueio de um lado ou do outro (o silenciar não conta)
create or replace function private.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks as ub
    where ub.kind = 'block'
      and (
        (ub.blocker_id = a and ub.blocked_id = b)
        or (ub.blocker_id = b and ub.blocked_id = a)
      )
  )
$$;

-- Bloquear, silenciar ou desfazer (new_kind null), sempre em nome de quem chama
create or replace function public.set_user_block(target uuid, new_kind text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'sem conta' using errcode = '42501';
  end if;
  if target is null or target = me then
    raise exception 'leitor inválido' using errcode = '22023';
  end if;
  if new_kind is null then
    delete from public.user_blocks where blocker_id = me and blocked_id = target;
    return;
  end if;
  if new_kind not in ('block', 'mute') then
    raise exception 'tipo inválido' using errcode = '22023';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id, kind)
  values (me, target, new_kind)
  on conflict (blocker_id, blocked_id)
  do update set kind = excluded.kind, created_at = now();
  if new_kind = 'block' then
    delete from public.follows
    where (follower_id = me and following_id = target)
       or (follower_id = target and following_id = me);
    -- Os avisos que a pessoa deixou somem do sino
    delete from public.notifications where user_id = me and actor_id = target;
  end if;
end;
$$;

revoke execute on function public.set_user_block(uuid, text) from public, anon;
grant execute on function public.set_user_block(uuid, text) to authenticated;

-- Ninguém segue quem bloqueou ou foi bloqueado
create or replace function private.follows_not_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_blocked(new.follower_id, new.following_id) then
    raise exception 'bloqueio entre as contas' using errcode = '42501', hint = 'blocked';
  end if;
  return new;
end;
$$;

create trigger follows_not_blocked
  before insert on public.follows
  for each row execute function private.follows_not_blocked();

-- Nem responde no tópico (ou à resposta) de quem bloqueou ou foi bloqueado
create or replace function private.forum_reply_not_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  topic_author uuid;
  parent_author uuid;
begin
  select author_id into topic_author from public.forum_topics where id = new.topic_id;
  if new.parent_id is not null then
    select author_id into parent_author from public.forum_replies where id = new.parent_id;
  end if;
  if private.is_blocked(new.author_id, topic_author)
     or private.is_blocked(new.author_id, parent_author) then
    raise exception 'bloqueio entre as contas' using errcode = '42501', hint = 'blocked';
  end if;
  return new;
end;
$$;

create trigger forum_replies_not_blocked
  before insert on public.forum_replies
  for each row execute function private.forum_reply_not_blocked();

-- O conteúdo de quem bloqueou (estante, citações, coleções, atividades) some
-- para quem foi bloqueado
create or replace function private.can_view_content(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce(owner = (select auth.uid()), false)
    or exists (select 1 from public.profiles as p where p.id = owner and not p.is_private)
    or exists (
      select 1
      from public.follows as f
      where f.follower_id = (select auth.uid())
        and f.following_id = owner
        and f.status = 'accepted'
    )
  )
  and not exists (
    select 1
    from public.user_blocks as ub
    where ub.blocker_id = owner
      and ub.blocked_id = (select auth.uid())
      and ub.kind = 'block'
  )
$$;

-- Nenhum aviso de quem a pessoa silenciou ou bloqueou, nem para quem
-- bloqueou quem fez
create or replace function private.notify(recipient uuid, actor uuid, kind text, refs jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if recipient is null or recipient is not distinct from actor then
    return;
  end if;
  if actor is not null and exists (
    select 1
    from public.user_blocks as ub
    where (ub.blocker_id = notify.recipient and ub.blocked_id = notify.actor)
       or (ub.kind = 'block' and ub.blocker_id = notify.actor and ub.blocked_id = notify.recipient)
  ) then
    return;
  end if;
  if exists (
    select 1
    from private.notice_log as sent
    where sent.user_id = notify.recipient
      and sent.actor_id is not distinct from notify.actor
      and sent.type = notify.kind
      and sent.payload = notify.refs
      and sent.sent_at > now() - interval '24 hours'
  ) then
    return;
  end if;
  delete from private.notice_log as sent
  where sent.user_id = notify.recipient
    and sent.sent_at <= now() - interval '24 hours';
  insert into private.notice_log (user_id, actor_id, type, payload)
  values (notify.recipient, notify.actor, notify.kind, notify.refs);
  insert into public.notifications (user_id, actor_id, type, refs)
  values (notify.recipient, notify.actor, notify.kind, notify.refs);
end;
$$;

-- O feed não mostra quem a pessoa silenciou ou bloqueou
create or replace function public.feed_activities(
  before_at timestamptz default null,
  before_id uuid default null,
  max_rows int default 60
)
returns setof public.activities
language sql
stable
set search_path = ''
as $$
  select a.*
  from public.activities as a
  where a.actor_id in (
      select f.following_id
      from public.follows as f
      where f.follower_id = (select auth.uid()) and f.status = 'accepted'
    )
    and a.actor_id not in (
      select ub.blocked_id
      from public.user_blocks as ub
      where ub.blocker_id = (select auth.uid())
    )
    and (
      before_at is null
      or a.created_at < before_at
      or (a.created_at = before_at and a.id < before_id)
    )
  order by a.created_at desc, a.id desc
  limit greatest(1, least(coalesce(max_rows, 60), 100))
$$;

-- Denunciar perfil ----------------------------------------------------------------
alter table public.content_reports drop constraint content_reports_target_valid;
alter table public.content_reports add constraint content_reports_target_valid check (
  target_type in ('topic', 'reply', 'suggestion', 'suggestion_comment', 'profile')
);

-- O perfil denunciado não se oculta por aqui: a equipe resolve (e, se for o
-- caso, suspende no painel de usuários)
create or replace function public.review_report(report uuid, hide boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.content_reports;
begin
  if not public.is_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select * into item from public.content_reports where id = report and status = 'pending';
  if item.id is null then
    raise exception 'denúncia não encontrada' using errcode = 'P0002';
  end if;
  if hide then
    if item.target_type = 'topic' then
      update public.forum_topics set hidden_at = now() where id = item.target_id;
    elsif item.target_type = 'reply' then
      update public.forum_replies set hidden_at = now() where id = item.target_id;
    elsif item.target_type = 'suggestion' then
      update public.feature_suggestions set hidden_at = now() where id = item.target_id;
    elsif item.target_type = 'suggestion_comment' then
      update public.suggestion_comments set hidden_at = now() where id = item.target_id;
    end if;
  end if;
  update public.content_reports
  set status = case when hide then 'resolved' else 'dismissed' end,
      reviewed_by = (select auth.uid()), reviewed_at = now()
  where target_type = item.target_type and target_id = item.target_id and status = 'pending';
end;
$$;

-- Indicar um livro ------------------------------------------------------------------
-- Só para quem segue quem indica (ela escolheu ouvir essa pessoa) e sem
-- bloqueio entre as duas; o mesmo livro, uma vez por pessoa
create table public.book_recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  constraint book_recommendations_note_length check (char_length(note) <= 280),
  constraint book_recommendations_not_self check (sender_id <> recipient_id)
);

create unique index book_recommendations_once
  on public.book_recommendations (sender_id, recipient_id, book_id);
create index book_recommendations_recipient_idx
  on public.book_recommendations (recipient_id, created_at desc);

alter table public.book_recommendations enable row level security;

create policy "both sides see a recommendation"
  on public.book_recommendations for select
  to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "people recommend to their followers"
  on public.book_recommendations for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.follows as f
      where f.follower_id = recipient_id
        and f.following_id = sender_id
        and f.status = 'accepted'
    )
    and not private.is_blocked(sender_id, recipient_id)
  );

create policy "either side removes a recommendation"
  on public.book_recommendations for delete
  to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

revoke all on table public.book_recommendations from anon, authenticated;
grant select, delete on table public.book_recommendations to authenticated;
grant insert (id, sender_id, recipient_id, book_id, note) on table public.book_recommendations to authenticated;

alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (
  type in (
    'follow', 'follow_request', 'collection_like', 'collection_copy', 'collection_invite',
    'catalog_review', 'forum_reply', 'forum_mention', 'suggestion_status',
    'book_recommendation'
  )
);

create or replace function private.notify_book_recommendation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(
    new.recipient_id,
    new.sender_id,
    'book_recommendation',
    jsonb_build_object('recommendation_id', new.id)
  );
  return new;
end;
$$;

create trigger book_recommendations_notify
  after insert on public.book_recommendations
  for each row execute function private.notify_book_recommendation();
