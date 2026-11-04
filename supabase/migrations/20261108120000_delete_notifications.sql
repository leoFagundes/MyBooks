-- O sino guarda os avisos para sempre, até a pessoa excluir: quem recebe pode
-- apagar os seus (um a um ou todos). Apagar não reabre o aviso: o registro do
-- que saiu (private.notice_log) continua valendo por 24 horas.
create policy "people delete their own notifications"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

grant delete on table public.notifications to authenticated;
