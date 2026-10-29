# Fase 8: Polimento e QA

**Goal:** deixar o MyBooks pronto para o deploy (SPEC §11.8): animações, fluidez, acessibilidade, performance e testes Playwright.

**Spec:** [SPEC.md](../../../SPEC.md) (§3, §8, §9, §10, §11.8). Branch `fase-8-polimento-e-qa`.

## Decisões

1. **Com o usuário (pedido de 29/10):** o deploy na Vercel, o SMTP com o Resend e os testes de e-mail. O cliente OAuth do Google também depende da conta dele. Eu entrego um checklist curto em `docs/deploy.md`: variáveis, URLs de redirecionamento do Supabase, Google, SMTP e os modelos de `supabase/templates`.
2. **Economia de tokens (pedido de 29/10):** nada além do SPEC. Os testes adiados das fases 3 a 7 continuam adiados, exceto os que o SPEC §9 pede.
3. **Testes Playwright:**
   - os E2E que envelheceram (o Início da fase 5 e a landing da 7) passam a refletir o produto de hoje;
   - novos, só os do SPEC §9 que faltam: seguir alguém e copiar livro e coleção de outro perfil; abrir o visualizador 3D;
   - uma varredura de acessibilidade com `@axe-core/playwright` nas páginas principais, sem violação séria ou crítica.
4. **Fluidez e performance:**
   - sonda de quadros por segundo, com a CPU 4× mais lenta, nas animações mais pesadas (a rolagem da landing, a troca de vistas da estante e o sorteio);
   - LCP e CLS do build de produção em `/livro/[id]`, `/@usuario` e `/explorar`.
5. **SPEC §10:** `@vercel/analytics` e `@vercel/speed-insights` no layout raiz.

## Tasks

1. E2E existentes em dia, com as correções de acessibilidade que eles mostrarem.
2. E2E do SPEC §9: social e visualizador 3D.
3. Varredura de acessibilidade (axe) e correções.
4. Fluidez e performance: sondas e correções.
5. Deploy: Analytics, Speed Insights e o checklist; o CLAUDE.md da fase; typecheck, lint, testes e build.
