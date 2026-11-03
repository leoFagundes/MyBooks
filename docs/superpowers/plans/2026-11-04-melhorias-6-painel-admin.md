# Melhorias, Fase 6: painel administrativo (fundação)

Branch `melhorias-6-painel-admin`, a partir da `main`. Item 6 do [MELHORIAS.md](../../../MELHORIAS.md).

## Decisões

1. **Banco** (`20261104120000_admin.sql`):
   - `user_roles` (admin | moderator), sem leitura nem escrita pelo cliente. `is_admin()` e `is_moderator()` (security definer; admin também modera) entram nas políticas RLS.
   - `account_sanctions` (suspensão com prazo, banimento sem; motivo sempre), `site_settings` (banner, maintenance, features; leitura pública) e `admin_audit_log` (só o admin lê).
   - Nada se escreve pelo cliente: o servidor grava com a chave secreta, depois de conferir o papel.
   - `admin_overview()` (os números e 12 semanas de crescimento) e `admin_users(...)` (busca por nome, @ ou e-mail, filtro, ordem e página no banco), as duas recusam quem não modera.
2. **Três camadas no `/admin`:**
   - o proxy: sem conta, `/entrar?next=`; sem papel, a página 404 de sempre (o painel não se anuncia);
   - o layout (`requireStaff`);
   - cada Server Action (`staffWith(nível)`). Fora do sitemap, com noindex e no robots.
3. **Quem pode o quê:**
   - o moderador vê a visão geral e os usuários, suspende, tira suspensão e remove conteúdo;
   - o admin também bane, tira banimento, promove e tira moderador, muda as configurações e lê a auditoria;
   - ninguém age sobre si mesmo, e só o admin age sobre alguém da equipe.
4. **Sanções** usam o `ban_duration` do Auth do Supabase (com prazo, ou 100 anos no banimento): a conta não entra nem renova a sessão. A tabela guarda o histórico; uma sanção nova substitui a que valia.
5. **Remover conteúdo:** bio e foto, resenhas e citações, com o antes na auditoria.
6. **Configurações do site:**
   - o aviso no topo (`SiteBanner`, em cache com a tag `site-settings`, no layout do app e na barra da landing);
   - o modo manutenção (o proxy lê do banco no máximo a cada 30s e reescreve para `/manutencao`; ficam abertos o painel, o entrar, os retornos do login e as rotas de dados; a equipe passa);
   - as funcionalidades `cadastro`, `criar_generos`, `importar_goodreads` e `visualizador_3d`, conferidas no servidor (`isFeatureOn`).
7. **Telas:**
   - barra lateral (no celular, em cima);
   - Visão geral, com um gráfico de barras de uma série, tooltip no hover e tabela para leitor de tela;
   - Usuários e Auditoria com o TanStack Table 9 (`useTable`, `manualSorting`, `manualPagination`), os dados por Route Handler GET (`/api/admin/users`, `/api/admin/users/[id]`, `/api/admin/audit`) e o estado na URL;
   - Configurações do site.
8. **Testes:**
   - `tests/db/admin.test.ts`: as barreiras sem papel e a lista do admin;
   - uma sonda no dev do fluxo inteiro: 404 sem papel, `/entrar` sem conta, suspender, o aviso e a auditoria;
   - o E2E do Google atualizado: o provedor agora está ligado.
