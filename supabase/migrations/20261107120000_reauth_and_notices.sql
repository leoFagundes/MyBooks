-- Segurança (ajustes finais): confirmar a identidade antes de trocar a senha
-- ou excluir a conta, e não repetir o mesmo aviso em 24 horas.

-- Se quem está logado tem senha (quem entrou só pelo Google ou por link
-- mágico não tem). Responde só sobre a própria conta: o Auth não expõe isso
create or replace function public.viewer_has_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select users.encrypted_password is not null and users.encrypted_password <> ''
      from auth.users as users
      where users.id = (select auth.uid())
    ),
    false
  );
$$;

revoke all on function public.viewer_has_password() from public, anon;
grant execute on function public.viewer_has_password() to authenticated;

-- O mesmo aviso (quem recebe, quem fez, o tipo e as referências) só uma vez
-- a cada 24 horas: seguir e deixar de seguir em sequência, curtir e descurtir,
-- não inunda o sino de ninguém (nem o tempo real, que sai do insert). Deixar
-- de seguir apaga o aviso, então a conta não pode olhar os avisos: o registro
-- do que saiu fica à parte, fora da API, e guarda só as últimas 24 horas
create table private.notice_log (
  user_id uuid not null,
  actor_id uuid,
  type text not null,
  payload jsonb not null default '{}',
  sent_at timestamptz not null default now()
);

create index notice_log_lookup_idx on private.notice_log (user_id, type, sent_at desc);

alter table private.notice_log enable row level security;
revoke all on table private.notice_log from public, anon, authenticated;

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
