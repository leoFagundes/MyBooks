import { expect, type Page, test } from "@playwright/test";
import { waitForHydration } from "./helpers";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./support/supabase-admin";

// Nenhum teste manda e-mail: as contas nascem e somem pelo admin, e o link
// mágico vem do generateLink

// O Next tem o próprio role="alert" (o anunciador de rotas); este é o do formulário
const formAlert = (page: Page) =>
  page.getByRole("alert").and(page.locator(":not(#__next-route-announcer__)"));

async function openSignIn(page: Page, path = "/entrar") {
  await page.goto(path);
  const submit = page.getByRole("button", { name: "Entrar", exact: true });
  await waitForHydration(submit);
  return submit;
}

async function signIn(page: Page, user: TestUser, password = user.password) {
  const submit = await openSignIn(page);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await submit.click();
}

test.describe("entrar", () => {
  test("campos inválidos mostram erros gentis sem enviar nada", async ({
    page,
  }) => {
    const submit = await openSignIn(page);
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });

    await submit.click();
    await expect(page.getByText("Digite seu e-mail")).toBeVisible();
    await expect(page.getByText("Digite sua senha")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeFocused();

    await page.getByLabel("E-mail").fill("ana@");
    await submit.click();
    await expect(page.getByText("Esse e-mail não parece certo")).toBeVisible();
    expect(posts).toEqual([]);
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test("senha errada mostra que e-mail e senha não conferem", async ({
    page,
  }) => {
    const user = await createTestUser({ onboarded: true });
    try {
      await signIn(page, user, "senha-errada-123");
      await expect(formAlert(page)).toHaveText("E-mail ou senha não conferem.");
      await expect(page).toHaveURL(/\/entrar$/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("quem já fez o onboarding entra e vai para o /inicio", async ({
    page,
  }) => {
    const user = await createTestUser({ onboarded: true });
    try {
      await signIn(page, user);
      await expect(page).toHaveURL(/\/inicio$/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("quem ainda não fez o onboarding vai para ele", async ({ page }) => {
    const user = await createTestUser();
    try {
      await signIn(page, user);
      await expect(page).toHaveURL(/\/onboarding$/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("o next leva de volta, mas só para dentro do site", async ({ page }) => {
    const user = await createTestUser({ onboarded: true });
    try {
      const submit = await openSignIn(page, "/entrar?next=%2Fdev%3Fsecao%3D1");
      await page.getByLabel("E-mail").fill(user.email);
      await page.getByLabel("Senha", { exact: true }).fill(user.password);
      await submit.click();
      await expect(page).toHaveURL(/\/dev\?secao=1$/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("o link mágico pede só o e-mail", async ({ page }) => {
    await openSignIn(page);
    await page.getByRole("button", { name: "Receber link mágico" }).click();
    await expect(page.getByLabel("Senha", { exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(page.getByText("Digite seu e-mail")).toBeVisible();
  });

  // O Google está ligado no projeto (Fase 4 das melhorias): o botão vai ao
  // authorize do Supabase, com a volta pelo /auth/callback
  test("Continuar com Google leva ao login do Google", async ({ page }) => {
    await openSignIn(page);
    const authorize = page.waitForRequest(
      (request) =>
        request.url().includes("/auth/v1/authorize?provider=google") &&
        request.url().includes(encodeURIComponent("/auth/callback")),
    );
    await page.getByRole("button", { name: "Continuar com Google" }).click();
    await authorize;
  });
});

test.describe("cadastro", () => {
  test("senha curta mostra o mínimo antes de enviar", async ({ page }) => {
    await page.goto("/cadastro");
    const submit = page.getByRole("button", { name: "Criar conta" });
    await waitForHydration(submit);
    await page.getByLabel("E-mail").fill("leitora@exemplo.com");
    await page.getByLabel("Senha", { exact: true }).fill("1234567");
    await submit.click();
    await expect(
      page.getByText("A senha precisa de 8 caracteres ou mais"),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test("dá para mostrar a senha que se digita", async ({ page }) => {
    await page.goto("/cadastro");
    const show = page.getByRole("button", { name: "Mostrar senha" });
    await waitForHydration(show);
    const field = page.getByLabel("Senha", { exact: true });
    await expect(field).toHaveAttribute("type", "password");
    await show.click();
    await expect(field).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Esconder senha" }),
    ).toBeVisible();
  });
});

test.describe("links do e-mail", () => {
  test("o link mágico de quem é nova leva ao onboarding", async ({ page }) => {
    const user = await createTestUser();
    try {
      const { data, error } = await adminClient().auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
      });
      if (error) throw error;
      await page.goto(
        `/auth/confirm?token_hash=${data.properties.hashed_token}&type=email`,
      );
      await expect(page).toHaveURL(/\/onboarding$/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("link vencido volta para o /entrar com aviso", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=link-que-nao-existe&type=email");
    await expect(page).toHaveURL(/\/entrar\?erro=/);
    await expect(formAlert(page)).toHaveText(
      "Esse link venceu ou já foi usado. Peça um novo para entrar.",
    );
  });

  test("retorno do Google ou do e-mail com erro também avisa", async ({
    page,
  }) => {
    await page.goto(
      "/auth/callback?error=access_denied&error_code=otp_expired&error_description=x",
    );
    await expect(page).toHaveURL(/\/entrar\?erro=otp_expired$/);
    await expect(formAlert(page)).toBeVisible();
  });
});
