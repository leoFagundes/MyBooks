import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Browser,
  type BrowserContextOptions,
  type Page,
  test,
} from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

// Auditoria de responsividade: cada rota em cinco larguras e nos dois temas,
// com screenshot da página inteira, à procura de rolagem horizontal e de
// texto cortado, coberto ou com reticências. Roda à parte (npm run
// test:auditoria), não falha: deixa o relatório e as imagens em OUT.
// Para conferir só uma parte: AUDITORIA_PAGINAS=livro,inicio e
// AUDITORIA_LARGURAS=360,1024.

const only = (name: string) =>
  process.env[name]?.split(",").map((value) => value.trim()) ?? null;
const WIDTHS = [360, 390, 768, 1024, 1440].filter(
  (width) => only("AUDITORIA_LARGURAS")?.includes(String(width)) ?? true,
);
const OUT = join("test-results", "auditoria-responsiva");

type Kind = "rolagem" | "cortado" | "coberto" | "reticencias" | "rola";
type Problem = { kind: Kind; where: string; text: string };
type Finding = Problem & { page: string; width: number };
type AuditPage = { name: string; path: string };

const findings: Finding[] = [];

// Celular de verdade abaixo de 768px: toque e sem hover (o can-hover muda o
// que aparece), como no Pixel 7 do playwright.config.ts
function contextFor(width: number): BrowserContextOptions {
  const touch = width < 768;
  return {
    viewport: { width, height: touch ? 800 : 900 },
    deviceScaleFactor: touch ? 2 : 1,
    isMobile: touch,
    hasTouch: touch,
    locale: "pt-BR",
    colorScheme: "light",
  };
}

/**
 * Roda no navegador. Olha a página inteira (rolagem e texto cortado) e, na
 * parte que está na tela, o texto coberto por outro elemento.
 */
function inspect(): Problem[] {
  const problems: Problem[] = [];
  const width = window.innerWidth;
  const height = window.innerHeight;

  const describe = (element: Element) => {
    const parts: string[] = [];
    let node: Element | null = element;
    for (let depth = 0; node && depth < 3; depth++) {
      let part = node.tagName.toLowerCase();
      const label =
        node.getAttribute("aria-label") ?? node.getAttribute("data-testid");
      if (label) part += `[${label.slice(0, 40)}]`;
      else if (node.classList.length > 0)
        part += `.${[...node.classList].slice(0, 3).join(".")}`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };
  const visible = (element: Element) =>
    element.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true,
    });
  const clips = (style: CSSStyleDeclaration) =>
    style.overflowX !== "visible" || style.overflowY !== "visible";
  const scrolls = (style: CSSStyleDeclaration) =>
    ["auto", "scroll"].includes(style.overflowX) ||
    ["auto", "scroll"].includes(style.overflowY);
  // Texto só para leitores de tela (sr-only): uma caixa de 1px que esconde
  const screenReaderOnly = (element: Element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const rect = node.getBoundingClientRect();
      if (
        (rect.width <= 2 || rect.height <= 2) &&
        clips(getComputedStyle(node))
      )
        return true;
    }
    return false;
  };
  // Barras fixas, toasts e o botão do dev ficam por cima de propósito
  const floating = (element: Element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (node.tagName.toLowerCase() === "nextjs-portal") return true;
      const position = getComputedStyle(node).position;
      if (position === "fixed" || position === "sticky") return true;
    }
    return false;
  };

  // 1. Rolagem horizontal, com os elementos que passam da borda
  const overflow = document.documentElement.scrollWidth - width;
  if (overflow > 0) {
    const offenders = [...document.body.querySelectorAll("*")].filter(
      (element) => {
        if (!visible(element)) return false;
        if (element.getBoundingClientRect().right <= width + 1) return false;
        const parent = element.parentElement;
        return !parent || parent.getBoundingClientRect().right <= width + 1;
      },
    );
    problems.push({
      kind: "rolagem",
      where: offenders.slice(0, 4).map(describe).join(" | ") || "body",
      text: `${overflow}px a mais`,
    });
  }

  // Apagado na cadeia até o body (o botão que só aparece no hover)
  const transparent = (element: Element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) < 0.05) return true;
    }
    return false;
  };

  // 2. Cada trecho de texto: cortado por quem esconde o que transborda, ou
  // coberto por outro elemento. No eixo da linha, a medida dos glifos é
  // exata; no outro, a caixa da fonte passa da entrelinha (leading-none), e
  // só conta uma linha escondida de verdade.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? "";
    const element = node.parentElement;
    if (!text || !element || !visible(element)) continue;
    if (element.closest("script, style, noscript, svg, nextjs-portal"))
      continue;
    if (screenReaderOnly(element)) continue;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter(
      (rect) => rect.width > 0.5 && rect.height > 0.5,
    );
    if (rects.length === 0) continue;
    const box = {
      left: Math.min(...rects.map((rect) => rect.left)),
      right: Math.max(...rects.map((rect) => rect.right)),
      top: Math.min(...rects.map((rect) => rect.top)),
      bottom: Math.max(...rects.map((rect) => rect.bottom)),
    };
    const shown = { ...box };
    const own = getComputedStyle(element);
    const vertical = !own.writingMode.startsWith("horizontal");
    const slack = parseFloat(own.fontSize) * 0.5;
    const sample = text.slice(0, 60);

    let reported = false;
    for (
      let ancestor: Element | null = element;
      ancestor && ancestor !== document.body;
      ancestor = ancestor.parentElement
    ) {
      const style = getComputedStyle(ancestor);
      if (!clips(style)) continue;
      const outer = ancestor.getBoundingClientRect();
      const left = outer.left + ancestor.clientLeft;
      const top = outer.top + ancestor.clientTop;
      const right = left + ancestor.clientWidth;
      const bottom = top + ancestor.clientHeight;
      const slackX = vertical ? slack : 1;
      const slackY = vertical ? 1 : slack;
      const cutX =
        style.overflowX !== "visible" &&
        (box.left < left - slackX || box.right > right + slackX);
      const cutY =
        style.overflowY !== "visible" &&
        (box.top < top - slackY || box.bottom > bottom + slackY);
      // O que sobra à vista depois de cada corte
      if (style.overflowX !== "visible") {
        shown.left = Math.max(shown.left, left);
        shown.right = Math.min(shown.right, right);
      }
      if (style.overflowY !== "visible") {
        shown.top = Math.max(shown.top, top);
        shown.bottom = Math.min(shown.bottom, bottom);
      }
      if (reported || (!cutX && !cutY)) continue;
      reported = true;
      const kind: Kind = scrolls(style)
        ? "rola"
        : own.textOverflow === "ellipsis" ||
            style.textOverflow === "ellipsis" ||
            own.webkitLineClamp !== "none" ||
            style.webkitLineClamp !== "none"
          ? "reticencias"
          : "cortado";
      problems.push({ kind, where: describe(element), text: sample });
    }

    // Coberto: o que está por cima no começo, no meio e no fim de cada
    // linha, só na parte à vista (texto sem pointer-events não dá para medir)
    if (floating(element) || own.pointerEvents === "none") continue;
    for (const rect of rects) {
      const left = Math.max(rect.left, shown.left);
      const right = Math.min(rect.right, shown.right);
      const top = Math.max(rect.top, shown.top);
      const bottom = Math.min(rect.bottom, shown.bottom);
      if (right - left < 4 || bottom - top < 2) continue;
      if (top < 0 || bottom > height || right > width) continue;
      const y = (top + bottom) / 2;
      const cover = [left + 2, (left + right) / 2, right - 2]
        .map((x) => document.elementFromPoint(x, y))
        .find(
          (hit) =>
            hit &&
            hit !== element &&
            !element.contains(hit) &&
            !hit.contains(element) &&
            !floating(hit) &&
            !transparent(hit),
        );
      if (cover) {
        problems.push({
          kind: "coberto",
          where: `${describe(element)} ← ${describe(cover)}`,
          text: sample,
        });
        break;
      }
    }
  }
  return problems;
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Entradas animadas e capas terminam de chegar
  await page.waitForTimeout(900);
}

/** Percorre a página de tela em tela (as entradas abaixo da dobra rodam). */
async function auditPage(page: Page, target: AuditPage, width: number) {
  const response = await page.goto(target.path, { waitUntil: "load" });
  if (!response) throw new Error(`Sem resposta em ${target.path}`);
  await settle(page);

  const seen = new Set<string>();
  const record = (problems: Problem[]) => {
    for (const problem of problems) {
      const key = `${problem.kind}|${problem.where}|${problem.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ ...problem, page: target.name, width });
    }
  };

  const total = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const step = Math.round((page.viewportSize()?.height ?? 800) * 0.8);
  for (let y = 0; y < total; y += step) {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      y,
    );
    await page.waitForTimeout(250);
    record(await page.evaluate(inspect));
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(400);

  for (const theme of ["light", "dark"] as const) {
    // O tema segue o sistema (nenhuma preferência salva)
    await page.emulateMedia({ colorScheme: theme });
    await page.waitForTimeout(350);
    const dir = join(OUT, theme === "light" ? "claro" : "escuro", `${width}`);
    mkdirSync(dir, { recursive: true });
    await page.screenshot({
      path: join(dir, `${target.name}.png`),
      fullPage: true,
    });
  }
  await page.emulateMedia({ colorScheme: "light" });
}

async function auditAs(
  browser: Browser,
  all: AuditPage[],
  user: TestUser | null,
  baseURL: string,
) {
  const names = only("AUDITORIA_PAGINAS");
  const pages = all.filter((target) => names?.includes(target.name) ?? true);
  if (pages.length === 0) return;
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      ...contextFor(width),
      baseURL,
    });
    if (user)
      await context.addCookies(await sessionCookies(user, { url: baseURL }));
    const page = await context.newPage();
    for (const target of pages) await auditPage(page, target, width);
    await context.close();
  }
}

const book = (slug: string) => seedId("book", slug);

/** Uma leitora com a estante cheia: lendo, lidos com nota, citações e coleção. */
/**
 * Um tópico com o que mais estica a página (títulos, card de livro, citação,
 * lista, spoiler, tags longas e respostas aninhadas) e uma sugestão com a
 * resposta oficial. A conta é envelhecida antes: conta de menos de um dia só
 * publica uma vez por minuto.
 */
async function seedCommunity(user: TestUser, staff: TestUser) {
  const admin = adminClient();
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  for (const id of [user.id, staff.id]) {
    const { error } = await admin
      .from("profiles")
      .update({ created_at: twoDaysAgo })
      .eq("id", id);
    if (error) throw error;
  }
  const { data: category, error: categoryError } = await admin
    .from("forum_categories")
    .select("id")
    .eq("slug", "discussoes-de-livros")
    .single();
  if (categoryError) throw categoryError;
  const { data: topic, error: topicError } = await admin
    .from("forum_topics")
    .insert({
      category_id: category.id,
      author_id: user.id,
      title:
        "Capitu traiu Bentinho? Uma releitura de Dom Casmurro com a cabeça de hoje",
      body: `# Por que reler

Machado escreve como quem sorri de canto, e a cada leitura **a dúvida muda de lugar**.

[[livro:${book("dom-casmurro")}]]

## O que eu reparei agora

- Bentinho conta tudo depois, de memória
- A cena do enterro de Escobar muda tudo
- ||O retrato de Ezequiel não prova nada||

> Olhos de cigana oblíqua e dissimulada.`,
      tags: ["machado-de-assis", "releituras-de-classicos", "realismo"],
      contains_spoilers: true,
    })
    .select("id")
    .single();
  if (topicError) throw topicError;
  await admin
    .from("forum_topic_books")
    .insert({ topic_id: topic.id, book_id: book("dom-casmurro") });
  const { data: reply, error: replyError } = await admin
    .from("forum_replies")
    .insert({
      topic_id: topic.id,
      author_id: staff.id,
      body: "Li na escola e achei que era óbvio. Relendo adulta, a narração é que é suspeita: quem conta é o ciumento.",
    })
    .select("id")
    .single();
  if (replyError) throw replyError;
  const { error: nestedError } = await admin.from("forum_replies").insert({
    topic_id: topic.id,
    author_id: user.id,
    parent_id: reply.id,
    quoted_reply_id: reply.id,
    body: "Exatamente! E ele mesmo admite que a memória é um campo de ruínas.",
  });
  if (nestedError) throw nestedError;
  const { data: suggestion, error: suggestionError } = await admin
    .from("feature_suggestions")
    .insert({
      author_id: user.id,
      title: "Marcar a página em que parei com um lembrete para continuar",
      body: "Seria ótimo receber um aviso quando passo uma semana sem abrir o livro que estou lendo.",
      category: "funcionalidade",
      status: "planejada",
      official_response:
        "Boa ideia! Entrou no planejamento, junto com os avisos da estante.",
      responded_by: staff.id,
      responded_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (suggestionError) throw suggestionError;
  const { error: commentError } = await admin
    .from("suggestion_comments")
    .insert({
      suggestion_id: suggestion.id,
      author_id: staff.id,
      body: "Também queria, principalmente para os livros longos.",
    });
  if (commentError) throw commentError;
  return { topicId: topic.id, suggestionId: suggestion.id };
}

async function seedReader(user: TestUser) {
  const admin = adminClient();
  const shelf = [
    { slug: "torto-arado", status: "reading", current_page: 112 },
    { slug: "grande-sertao-veredas", status: "reading", current_page: 48 },
    { slug: "dom-casmurro", status: "read", rating: 4.5 },
    { slug: "memorias-postumas-de-bras-cubas", status: "read", rating: 5 },
    { slug: "a-hora-da-estrela", status: "read", rating: 3.5 },
    { slug: "vidas-secas", status: "read", rating: 4 },
    { slug: "o-alquimista", status: "read", rating: 1 },
    { slug: "1984", status: "read", rating: 4 },
    { slug: "duna", status: "want" },
    { slug: "fundacao", status: "want" },
    { slug: "cem-anos-de-solidao", status: "want" },
    { slug: "harry-potter-e-a-pedra-filosofal", status: "want" },
    { slug: "dom-quixote", status: "abandoned" },
  ];
  const { error: shelfError } = await admin.from("user_books").insert(
    shelf.map(({ slug, ...entry }) => ({
      user_id: user.id,
      book_id: book(slug),
      started_at: entry.status === "want" ? null : "2026-08-02",
      finished_at: entry.status === "read" ? "2026-09-14" : null,
      review:
        slug === "dom-casmurro"
          ? "Capitu traiu ou não traiu? Reli pela terceira vez e mudei de ideia de novo. Machado escreve como quem sorri de canto."
          : null,
      ...entry,
    })),
  );
  if (shelfError) throw shelfError;

  const { error: quotesError } = await admin.from("quotes").insert([
    {
      user_id: user.id,
      book_id: book("dom-casmurro"),
      page: 67,
      text: "Olhos de cigana oblíqua e dissimulada.",
    },
    {
      user_id: user.id,
      book_id: book("dom-casmurro"),
      page: 211,
      text: "A memória é um vasto campo de ruínas e de sombras, onde a gente anda às apalpadelas, e de onde às vezes se tira uma lembrança que ninguém sabia guardada.",
    },
  ]);
  if (quotesError) throw quotesError;

  const { data: collection, error: collectionError } = await admin
    .from("collections")
    .insert({
      owner_id: user.id,
      title: "Para reler devagar, com calma e um café coado",
      emoji: "☕",
      description:
        "Livros que pedem uma segunda leitura, de preferência num domingo de chuva.",
      visibility: "public",
    })
    .select("id")
    .single();
  if (collectionError) throw collectionError;
  const { error: itemsError } = await admin.from("collection_items").insert(
    ["dom-casmurro", "vidas-secas", "a-hora-da-estrela", "torto-arado"].map(
      (slug, index) => ({
        collection_id: collection.id,
        book_id: book(slug),
        position: `a${index}`,
        added_by: user.id,
        note:
          index === 0 ? "Começar pelo capítulo dos olhos de ressaca." : null,
      }),
    ),
  );
  if (itemsError) throw itemsError;

  const { error: followError } = await admin.from("follows").insert(
    ["ana", "bia", "caio"].map((username) => ({
      follower_id: user.id,
      following_id: seedId("user", username),
      status: "accepted",
    })),
  );
  if (followError) throw followError;
  return { collectionId: collection.id };
}

function writeReport() {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "achados.json"), JSON.stringify(findings, null, 2));
  // Agrupa por página, tipo e lugar: as larguras em que cada um aparece
  const groups = new Map<string, { finding: Finding; widths: Set<number> }>();
  for (const finding of findings) {
    const key = `${finding.page}|${finding.kind}|${finding.where}|${finding.text}`;
    const group = groups.get(key) ?? { finding, widths: new Set<number>() };
    group.widths.add(finding.width);
    groups.set(key, group);
  }
  const lines = [...groups.values()]
    .sort((a, b) =>
      `${a.finding.page}${a.finding.kind}`.localeCompare(
        `${b.finding.page}${b.finding.kind}`,
      ),
    )
    .map(
      ({ finding, widths }) =>
        `- **${finding.page}** · ${finding.kind} · ${[...widths].join(", ")}px · \`${finding.where}\` · “${finding.text}”`,
    );
  writeFileSync(
    join(OUT, "relatorio.md"),
    `# Auditoria de responsividade\n\n${lines.length} achados.\n\n${lines.join("\n")}\n`,
  );
}

test.describe.configure({ mode: "serial" });
test.setTimeout(30 * 60_000);

test.afterAll(writeReport);

test("páginas abertas", async ({ browser, baseURL }) => {
  const pages: AuditPage[] = [
    { name: "landing", path: "/" },
    { name: "entrar", path: "/entrar" },
    { name: "cadastro", path: "/cadastro" },
    { name: "explorar", path: "/explorar" },
    { name: "explorar-busca", path: "/explorar?q=dom" },
    { name: "explorar-leitores", path: "/explorar?q=a&aba=leitores" },
    { name: "explorar-colecoes", path: "/explorar?q=a&aba=colecoes" },
    { name: "livro", path: `/livro/${book("dom-casmurro")}` },
    { name: "perfil", path: "/@ana" },
    { name: "perfil-grade", path: "/@ana?vista=grade" },
    { name: "perfil-lista", path: "/@ana?vista=lista" },
    { name: "perfil-colecoes", path: "/@ana/colecoes" },
    { name: "perfil-citacoes", path: "/@ana/citacoes" },
    {
      name: "colecao",
      path: `/colecao/${seedId("collection", "classicos-brasileiros")}`,
    },
    {
      name: "nao-encontrado",
      path: "/livro/00000000-0000-4000-8000-000000000000",
    },
    { name: "comunidade", path: "/comunidade" },
    { name: "sugestoes", path: "/sugestoes" },
    { name: "creditos", path: "/readme" },
    { name: "termos", path: "/termos" },
    { name: "privacidade", path: "/privacidade" },
    { name: "sem-conexao", path: "/sem-conexao" },
    { name: "dev", path: "/dev" },
    { name: "dev-livro", path: "/dev/livro/dom-casmurro" },
    { name: "dev-colecao", path: "/dev/colecao/classicos-brasileiros" },
  ];
  await auditAs(browser, pages, null, baseURL ?? "");
});

test("leitora com a estante cheia", async ({ browser, baseURL }) => {
  const user = await createTestUser({
    onboarded: true,
    displayName: "Ariadne Albuquerque Nogueira",
  });
  try {
    const { collectionId } = await seedReader(user);
    const me = `/@${user.username}`;
    await auditAs(
      browser,
      [
        { name: "inicio", path: "/inicio" },
        { name: "minha-estante", path: me },
        { name: "minha-grade", path: `${me}?vista=grade` },
        { name: "minha-lista", path: `${me}?vista=lista` },
        { name: "minhas-colecoes", path: `${me}/colecoes` },
        { name: "minhas-citacoes", path: `${me}/citacoes` },
        { name: "livro-lido", path: `/livro/${book("dom-casmurro")}` },
        { name: "livro-lendo", path: `/livro/${book("torto-arado")}` },
        { name: "livro-fora", path: `/livro/${book("o-hobbit")}` },
        { name: "minha-colecao", path: `/colecao/${collectionId}` },
        { name: "explorar-com-conta", path: "/explorar" },
        { name: "configuracoes", path: "/configuracoes" },
      ],
      user,
      baseURL ?? "",
    );
  } finally {
    await deleteTestUser(user.id);
  }
});

test("comunidade e painel, com a equipe", async ({ browser, baseURL }) => {
  const user = await createTestUser({
    onboarded: true,
    displayName: "Ariadne Albuquerque Nogueira",
  });
  const staff = await createTestUser({ onboarded: true, displayName: "Iara" });
  try {
    const { error } = await adminClient()
      .from("user_roles")
      .insert({ user_id: staff.id, role: "admin" });
    if (error) throw error;
    const { topicId, suggestionId } = await seedCommunity(user, staff);
    await auditAs(
      browser,
      [
        { name: "comunidade-com-conta", path: "/comunidade" },
        { name: "topico", path: `/comunidade/${topicId}` },
        { name: "sugestoes-com-conta", path: "/sugestoes" },
        { name: "sugestao", path: `/sugestoes/${suggestionId}` },
        { name: "livro-com-discussao", path: `/livro/${book("dom-casmurro")}` },
      ],
      user,
      baseURL ?? "",
    );
    await auditAs(
      browser,
      [
        { name: "admin", path: "/admin" },
        { name: "admin-usuarios", path: "/admin/usuarios" },
        { name: "admin-moderacao", path: "/admin/moderacao" },
        { name: "admin-livros", path: "/admin/livros" },
        { name: "admin-configuracoes", path: "/admin/configuracoes" },
        { name: "admin-auditoria", path: "/admin/auditoria" },
        { name: "topico-da-equipe", path: `/comunidade/${topicId}` },
        { name: "sugestao-da-equipe", path: `/sugestoes/${suggestionId}` },
      ],
      staff,
      baseURL ?? "",
    );
  } finally {
    await deleteTestUser(user.id);
    await deleteTestUser(staff.id);
  }
});

test("conta nova, sem nada ainda", async ({ browser, baseURL }) => {
  const empty = await createTestUser({ onboarded: true, displayName: "Bento" });
  const fresh = await createTestUser({ displayName: "Cora" });
  try {
    await auditAs(
      browser,
      [
        { name: "inicio-vazio", path: "/inicio" },
        { name: "estante-vazia", path: `/@${empty.username}` },
        { name: "colecoes-vazias", path: `/@${empty.username}/colecoes` },
        { name: "citacoes-vazias", path: `/@${empty.username}/citacoes` },
      ],
      empty,
      baseURL ?? "",
    );
    await auditAs(
      browser,
      [{ name: "onboarding", path: "/onboarding" }],
      fresh,
      baseURL ?? "",
    );
  } finally {
    await deleteTestUser(empty.id);
    await deleteTestUser(fresh.id);
  }
});
