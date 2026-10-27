import { expect, type Locator, type Page, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import {
  openCommandPalette,
  trackPageErrors,
  waitForHydration,
} from "./helpers";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

async function signInAs(page: Page, user: TestUser, baseURL?: string) {
  await page
    .context()
    .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
}

async function shelfRows(user: TestUser) {
  const { data, error } = await adminClient()
    .from("user_books")
    .select("book_id, status, rating")
    .eq("user_id", user.id);
  if (error) throw error;
  return data;
}

/** A tecla N só funciona depois de hidratar: tenta até a paleta abrir. */
async function pressN(page: Page): Promise<Locator> {
  const palette = page.getByRole("dialog", { name: "Adicionar livro" });
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.keyboard.press("n");
    try {
      await palette.waitFor({ state: "visible", timeout: 2000 });
      return palette;
    } catch {
      // ainda hidratando; tenta de novo
    }
  }
  throw new Error("A tecla N não abriu a paleta de adicionar livro");
}

async function openHome(page: Page, user: TestUser, baseURL?: string) {
  await signInAs(page, user, baseURL);
  await page.goto("/inicio");
  await waitForHydration(
    page.getByRole("banner").getByRole("button", { name: "Buscar" }),
  );
}

test.describe("adicionar livro", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createTestUser({ onboarded: true });
  });

  test.afterEach(async () => {
    // O livro que o teste pôs no catálogo (e a capa no bucket) fica lá mesmo
    // sem a conta
    const admin = adminClient();
    const { data: books } = await admin
      .from("books")
      .select("id")
      .eq("created_by", user.id);
    const ids = (books ?? []).map((book) => book.id);
    if (ids.length > 0) {
      await admin.storage
        .from("covers")
        .remove(
          ids.flatMap((id) =>
            ["S", "M", "L"].map((size) => `${id}/${size}.webp`),
          ),
        );
      await admin.from("books").delete().in("id", ids);
    }
    await deleteTestUser(user.id);
  });

  test("livro da Open Library entra no catálogo, com capa, e vai para a estante", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    await openHome(page, user, baseURL);
    const palette = await pressN(page);
    await palette.getByRole("combobox").fill("the left hand of darkness");
    const option = palette
      .getByRole("option")
      .filter({ hasText: /left hand of darkness/i })
      .first();
    try {
      await option.waitFor({ timeout: 30_000 });
    } catch {
      test.skip(true, "A Open Library não respondeu a tempo");
    }
    await option.click();
    await expect(
      palette.getByRole("heading", { name: /left hand of darkness/i }),
    ).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("listitem").filter({ hasText: "Na sua estante" }),
    ).toBeVisible({ timeout: 45_000 });
    const rows = await shelfRows(user);
    expect(rows).toHaveLength(1);
    const { data: book, error } = await adminClient()
      .from("books")
      .select("id, source, cover_url, cover_color, created_by")
      .eq("id", rows[0]?.book_id ?? "")
      .single();
    if (error) throw error;
    expect(book).toMatchObject({ source: "openlibrary", created_by: user.id });
    // A cópia no bucket, ou a da Open Library se ela não deixou baixar
    expect(book.cover_url).toMatch(
      new RegExp(`^(covers/${book.id}|https://covers\\.openlibrary\\.org/.+)$`),
    );
  });

  test("N abre a paleta; setas e Enter escolhem; Enter salva; Desfazer tira", async ({
    page,
    baseURL,
  }) => {
    const errors = trackPageErrors(page);
    await openHome(page, user, baseURL);
    const palette = await pressN(page);

    await palette.getByRole("combobox").fill("machado");
    const options = palette.getByRole("option");
    await expect(
      options.filter({ hasText: "Memórias Póstumas de Brás Cubas" }),
    ).toBeVisible();
    await expect(options.filter({ hasText: "Dom Casmurro" })).toBeVisible();

    // A primeira vem escolhida; a seta desce para a seguinte
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    const chosen = palette.locator('[role="option"][aria-selected="true"]');
    const title = (await chosen.getAttribute("data-title")) ?? "";
    expect(title).not.toBe("");
    await page.keyboard.press("Enter");

    await expect(palette.getByRole("heading", { name: title })).toBeVisible();
    await palette.getByRole("radio", { name: "Lido" }).click();
    await palette.getByRole("slider", { name: "Nota" }).focus();
    await page.keyboard.press("4");
    await page.keyboard.press("ArrowRight");
    await expect(palette.getByRole("slider", { name: "Nota" })).toHaveAttribute(
      "aria-valuetext",
      "4,5 estrelas",
    );
    await page.keyboard.press("Enter");

    const toast = page
      .getByRole("listitem")
      .filter({ hasText: "Na sua estante" });
    await expect(toast).toBeVisible();
    await expect(palette).toBeHidden();
    await expect
      .poll(() => shelfRows(user))
      .toEqual([expect.objectContaining({ status: "read", rating: 4.5 })]);
    // A página atrás já mostra o livro na estante (a lombada é um link)
    const spine = page.getByRole("main").getByRole("link", { name: title });
    await expect(spine).toBeVisible();

    await toast.getByRole("button", { name: "Desfazer" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Tirei da estante" }),
    ).toBeVisible();
    await expect.poll(() => shelfRows(user)).toEqual([]);
    await expect(spine).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("Enter duas vezes não põe o livro duas vezes", async ({
    page,
    baseURL,
  }) => {
    await openHome(page, user, baseURL);
    const palette = await pressN(page);
    await palette.getByRole("combobox").fill("vidas secas");
    // O do catálogo vem primeiro; edições da Open Library podem vir embaixo
    await expect(
      palette.getByRole("option").filter({ hasText: "Vidas Secas" }).first(),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(
      palette.getByRole("heading", { name: "Vidas Secas" }),
    ).toBeVisible();

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("listitem").filter({ hasText: "Na sua estante" }),
    ).toHaveCount(1);
    await expect
      .poll(() => shelfRows(user))
      .toEqual([
        {
          book_id: seedId("book", "vidas-secas"),
          status: "want",
          rating: null,
        },
      ]);
  });

  test("cadastro manual: a capa gerada muda com o título", async ({
    page,
    baseURL,
  }) => {
    await openHome(page, user, baseURL);
    const palette = await pressN(page);
    await palette
      .getByRole("option", { name: /Cadastrar manualmente/ })
      .click();

    const title = palette.getByLabel("Título", { exact: true });
    await title.fill("O Livro da Areia");
    const preview = palette.getByRole("img", {
      name: "Capa de O Livro da Areia",
    });
    await expect(preview).toBeVisible();
    const cover = palette.getByTestId("capa-previa");
    const firstColor = await cover.evaluate((element) =>
      element.style.getPropertyValue("--cover"),
    );

    await title.fill("Ficções");
    await expect(
      palette.getByRole("img", { name: "Capa de Ficções" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        cover.evaluate((element) => element.style.getPropertyValue("--cover")),
      )
      .not.toBe(firstColor);

    await palette
      .getByLabel("Autoria", { exact: true })
      .fill("Jorge Luis Borges");
    await palette.getByRole("button", { name: "Continuar" }).click();
    await expect(
      palette.getByRole("heading", { name: "Ficções" }),
    ).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("listitem").filter({ hasText: "Na sua estante" }),
    ).toBeVisible();
    const { data: books } = await adminClient()
      .from("books")
      .select("title, authors, source")
      .eq("created_by", user.id);
    expect(books).toEqual([
      { title: "Ficções", authors: ["Jorge Luis Borges"], source: "manual" },
    ]);
  });

  test("o + da barra e o ⌘K abrem a mesma paleta", async ({
    page,
    baseURL,
    isMobile,
  }) => {
    await openHome(page, user, baseURL);
    const palette = page.getByRole("dialog", { name: "Adicionar livro" });
    const plus = isMobile
      ? page
          .getByRole("navigation", { name: "Navegação no celular" })
          .getByRole("button", { name: "Adicionar livro" })
      : page
          .getByRole("banner")
          .getByRole("button", { name: "Adicionar livro" });
    await plus.click();
    await expect(palette).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();

    const commands = await openCommandPalette(page);
    await commands.getByRole("option", { name: "Adicionar livro" }).click();
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("combobox")).toBeFocused();
  });
});
