-- Atividades (o feed) e notificações: só triggers escrevem nelas.

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  book_id uuid references public.books (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint activities_type_valid check (
    type in (
      'shelf_want', 'shelf_reading', 'shelf_read', 'shelf_abandoned',
      'collection_create', 'collection_add', 'follow'
    )
  )
);

create index activities_actor_created_idx on public.activities (actor_id, created_at desc);
create index activities_collection_id_idx on public.activities (collection_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  type text not null,
  refs jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_valid check (
    type in ('follow', 'follow_request', 'collection_like', 'collection_copy', 'collection_invite')
  )
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- Ninguém se notifica
create or replace function private.notify(recipient uuid, actor uuid, kind text, refs jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, actor_id, type, refs)
  select recipient, actor, kind, refs
  where recipient is not null and recipient is distinct from actor
$$;

-- Estante: entrar e mudar de status vira atividade; sair apaga as do livro
-- (o "Desfazer" do toast não deixa rastro no feed)
create or replace function private.on_user_book_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activities (actor_id, type, book_id, target_user_id)
    values (new.user_id, 'shelf_' || new.status, new.book_id, new.copied_from_user_id);
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.activities (actor_id, type, book_id)
      values (new.user_id, 'shelf_' || new.status, new.book_id);
    end if;
  else
    delete from public.activities
    where actor_id = old.user_id
      and book_id = old.book_id
      and type in ('shelf_want', 'shelf_reading', 'shelf_read', 'shelf_abandoned');
  end if;
  return null;
end;
$$;

create trigger user_books_activity
  after insert or update of status or delete on public.user_books
  for each row execute function private.on_user_book_change();

-- Coleção pública (ou que ficou pública) entra no feed uma vez; a cópia
-- avisa a dona da origem; apagar a coleção leva os avisos que apontam para ela
create or replace function private.on_collection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
    where refs ->> 'collection_id' = old.id::text or refs ->> 'copy_id' = old.id::text;
    return null;
  end if;

  if new.visibility = 'public'
    and not exists (
      select 1 from public.activities as a
      where a.type = 'collection_create' and a.collection_id = new.id
    )
  then
    insert into public.activities (actor_id, type, collection_id)
    values (new.owner_id, 'collection_create', new.id);
  end if;

  if tg_op = 'INSERT' and new.copied_from_id is not null then
    perform private.notify(
      new.copied_from_owner_id,
      new.owner_id,
      'collection_copy',
      jsonb_build_object('collection_id', new.copied_from_id, 'copy_id', new.id)
    );
  end if;
  return null;
end;
$$;

create trigger collections_activity
  after insert or update of visibility or delete on public.collections
  for each row execute function private.on_collection_change();

create or replace function private.on_collection_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activities (actor_id, type, collection_id, book_id)
    select coalesce(new.added_by, c.owner_id), 'collection_add', c.id, new.book_id
    from public.collections as c
    where c.id = new.collection_id and c.visibility = 'public';
  else
    delete from public.activities
    where type = 'collection_add' and collection_id = old.collection_id and book_id = old.book_id;
  end if;
  return null;
end;
$$;

create trigger collection_items_activity
  after insert or delete on public.collection_items
  for each row execute function private.on_collection_item_change();

-- Seguir: aceito vira atividade e "começou a seguir você"; pendente, pedido.
-- Aceitar transforma o pedido no aviso de seguidor; desfazer apaga os dois
create or replace function private.on_follow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'accepted' then
      insert into public.activities (actor_id, type, target_user_id)
      values (new.follower_id, 'follow', new.following_id);
      perform private.notify(new.following_id, new.follower_id, 'follow');
    else
      perform private.notify(new.following_id, new.follower_id, 'follow_request');
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'accepted' then
      insert into public.activities (actor_id, type, target_user_id)
      values (new.follower_id, 'follow', new.following_id);
      update public.notifications
      set type = 'follow', read_at = coalesce(read_at, now())
      where user_id = new.following_id and actor_id = new.follower_id and type = 'follow_request';
    end if;
  else
    delete from public.activities
    where type = 'follow' and actor_id = old.follower_id and target_user_id = old.following_id;
    delete from public.notifications
    where user_id = old.following_id
      and actor_id = old.follower_id
      and type in ('follow', 'follow_request');
  end if;
  return null;
end;
$$;

create trigger follows_activity
  after insert or update of status or delete on public.follows
  for each row execute function private.on_follow_change();

create or replace function private.on_collection_like_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      (select c.owner_id from public.collections as c where c.id = new.collection_id),
      new.user_id,
      'collection_like',
      jsonb_build_object('collection_id', new.collection_id)
    );
  else
    delete from public.notifications
    where type = 'collection_like'
      and actor_id = old.user_id
      and refs ->> 'collection_id' = old.collection_id::text;
  end if;
  return null;
end;
$$;

create trigger collection_likes_notify
  after insert or delete on public.collection_likes
  for each row execute function private.on_collection_like_change();

-- O convite já torna a pessoa editora (Fase 4, decisão 4); o aviso some se
-- ela sai ou é removida
create or replace function private.on_collection_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      new.user_id,
      (select c.owner_id from public.collections as c where c.id = new.collection_id),
      'collection_invite',
      jsonb_build_object('collection_id', new.collection_id)
    );
  else
    delete from public.notifications
    where type = 'collection_invite'
      and user_id = old.user_id
      and refs ->> 'collection_id' = old.collection_id::text;
  end if;
  return null;
end;
$$;

create trigger collection_members_notify
  after insert or delete on public.collection_members
  for each row execute function private.on_collection_member_change();

-- Feed: segue a privacidade do perfil e a visibilidade da coleção
alter table public.activities enable row level security;

create policy "activities follow profile and collection privacy"
  on public.activities for select
  to anon, authenticated
  using (
    private.can_view_content(actor_id)
    and (collection_id is null or private.can_view_collection(collection_id))
  );

revoke all on table public.activities from anon, authenticated;
grant select on table public.activities to anon, authenticated;

-- Avisos: cada um vê os seus e só marca como lido
alter table public.notifications enable row level security;

create policy "people see their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "people mark their notifications as read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to anon, authenticated;
grant update (read_at) on table public.notifications to authenticated;
