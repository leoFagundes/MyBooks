-- Quem foi bloqueado não lê a linha do bloqueio (é de quem bloqueou), mas o
-- perfil precisa dizer "não disponível" em vez de "privado" ou uma estante
-- vazia: só sobre quem chama, e só sim ou não
create or replace function public.viewer_blocked_by(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks as ub
    where ub.blocker_id = other
      and ub.blocked_id = (select auth.uid())
      and ub.kind = 'block'
  )
$$;

revoke execute on function public.viewer_blocked_by(uuid) from public, anon;
grant execute on function public.viewer_blocked_by(uuid) to authenticated;
