import { expect, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import { trackPageErrors, waitForHydration } from "./helpers";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  sessionCookies,
} from "./support/supabase-admin";

// No celular, deslizar a linha da Lista mostra os outros status
test("deslizar a linha da Lista muda o status", async ({
  page,
  baseURL,
}, info) => {
  test.skip(info.project.name !== "mobile", "o deslizar é só do toque");
  test.slow();
  const user = await createTestUser({ onboarded: true });
  const admin = adminClient();
  const book = seedId("book", "dom-casmurro");
  try {
    await admin
      .from("user_books")
      .insert({ user_id: user.id, book_id: book, status: "want" });
    await page
      .context()
      .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
    const errors = trackPageErrors(page);
    const main = page.getByRole("main");
    await page.goto(`/@${user.username}?vista=lista`);
    const title = main.getByRole("link", { name: "Dom Casmurro" }).first();
    await waitForHydration(title);

    // Um dedo arrasta o título para a esquerda e solta: a linha fica aberta
    const cell = main.getByRole("cell").filter({ hasText: "Machado de Assis" });
    await page.waitForLoadState("networkidle");
    await cell.scrollIntoViewIfNeeded();
    const box = await cell.boundingBox();
    if (!box) throw new Error("sem a linha");
    const y = box.y + box.height / 2;
    const x = box.x + box.width - 24;
    const touch = await page.context().newCDPSession(page);
    const finger = (
      type: "touchStart" | "touchMove" | "touchEnd",
      at: number,
    ) =>
      touch.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: at, y }],
      });
    await finger("touchStart", x);
    for (const step of [10, 30, 60, 100, 140, 180]) {
      await finger("touchMove", x - step);
    }
    await finger("touchEnd", x - 180);
    await main.getByRole("button", { name: "Lido" }).click();

    await expect
      .poll(
        async () =>
          (
            await admin
              .from("user_books")
              .select("status, finished_at")
              .eq("user_id", user.id)
              .single()
          ).data?.status,
      )
      .toBe("read");
    // Arrastar não abriu o livro
    await expect(page).toHaveURL(new RegExp(`/@${user.username}`));
    expect(errors).toEqual([]);
  } finally {
    await deleteTestUser(user.id);
  }
});
