# Deploy do MyBooks

O passo a passo para colocar no ar (SPEC §10). O código já está pronto: o que falta são as contas e os painéis.

## 1. Banco de produção (Supabase)

1. Crie o projeto de produção e anote a URL, a chave publicável e a secreta (Project Settings → API Keys).
2. Com o `.env.local` apontando para ele (e o `SUPABASE_ACCESS_TOKEN`), rode:
   - `npm run db:link`
   - `npm run db:push -- --yes`: aplica todas as migrations, inclusive os buckets `avatars` e `covers`.
3. Opcional, para ter leitores e coleções de exemplo:
   - `npm run db:seed -- --yes`
   - `npm run capas:copiar`: traz as capas do seed da Open Library para o bucket, o que deixa o LCP bem mais rápido.

## 2. Vercel

1. Suba o repositório para o GitHub e importe na Vercel (framework Next.js). Cada branch ganha o seu preview.
2. Em Settings → Environment Variables, para Production e Preview:

   | Variável                               | Valor                                                                               |
   | -------------------------------------- | ----------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | a URL do projeto                                                                    |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | a chave publicável                                                                  |
   | `SUPABASE_SECRET_KEY`                  | a chave secreta (nunca com `NEXT_PUBLIC_`)                                          |
   | `NEXT_PUBLIC_SITE_URL`                 | o domínio de produção, ex.: `https://mybooks.app` (OG, sitemap e links dos e-mails) |
   | `GOOGLE_BOOKS_API_KEY`                 | opcional: a reserva da busca quando a Open Library falha                            |

3. Em Analytics e em Speed Insights, clique em Enable. Os componentes já estão no layout raiz.
4. O build já confere sozinho que nenhuma chave secreta foi parar no bundle do navegador.

## 3. Login (Supabase → Authentication)

1. **URL Configuration:**
   - Site URL: o domínio de produção.
   - Redirect URLs: `http://localhost:3000/**`, `https://<domínio>/**` e o padrão dos previews da Vercel, `https://<projeto>-*-<time>.vercel.app/**`.
   - Os links voltam por `/auth/callback` (Google) e `/auth/confirm` (e-mail).
2. **Google:**
   - No Google Cloud, crie um cliente OAuth (Aplicativo da Web) com o URI de redirecionamento `https://<ref do projeto>.supabase.co/auth/v1/callback`.
   - Em Sign In / Providers → Google, cole o Client ID e o Secret e ligue.
   - O botão "Continuar com Google" passa a funcionar sozinho.
   - Na tela de consentimento (Google Auth Platform → Branding), preencha a página inicial (`https://<seu domínio>`), a política de privacidade (`/privacidade`) e os termos de uso (`/termos`). O logo pode ser o `public/pwa/icone-512.png`.
   - Antes de publicar, revise os rascunhos dos termos e da privacidade: no `npm run dev`, os trechos a revisar aparecem marcados com um tracejado (o `<ToReview>`, em `components/ui/prose.tsx`).
3. **E-mail com o Resend:**
   - Em Emails → SMTP Settings: host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a API key do Resend e remetente num domínio verificado lá.
   - Em Emails → Templates, cole os modelos em pt-BR:
     - `supabase/templates/confirmar-cadastro.html` em Confirm signup;
     - `supabase/templates/link-magico.html` em Magic Link.
   - Com o SMTP próprio, o limite de 2 e-mails por hora (só para a equipe) deixa de valer.

## 4. Depois do primeiro deploy

- Abra `/sitemap.xml` e `/robots.txt` no domínio, e cole um link de livro numa conversa para ver a imagem de prévia.
- A importação do Goodreads roda em lotes de 5 livros por chamada. Na Vercel, com o Fluid Compute, cada função tem até 300s, o que dá folga mesmo com a Open Library lenta.
