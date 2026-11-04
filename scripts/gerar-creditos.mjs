// Gera a lista de bibliotecas da página de créditos (/readme) a partir do
// package.json: só o nome, a licença e o link, sem versões (MELHORIAS 9.2).
// Roda no prebuild e à mão com npm run creditos.

import { readFile, writeFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));

/** O link da biblioteca: o site, o repositório ou a página no npm. */
function linkOf(name, meta) {
  const repository =
    typeof meta.repository === "string"
      ? meta.repository
      : meta.repository?.url;
  const candidates = [meta.homepage, repository].filter(Boolean);
  for (const raw of candidates) {
    const url = raw
      .replace(/^git\+/, "")
      .replace(/^git:\/\//, "https://")
      .replace(/^ssh:\/\/git@/, "https://")
      .replace(/^github:/, "https://github.com/")
      .replace(/\.git(#.*)?$/, "")
      .replace(/#readme$/, "");
    if (/^https:\/\//.test(url)) return url;
  }
  return `https://www.npmjs.com/package/${name}`;
}

async function describe(names) {
  const list = [];
  for (const name of names) {
    // Tipos não são bibliotecas que alguém usa
    if (name.startsWith("@types/")) continue;
    const meta = JSON.parse(
      await readFile(`node_modules/${name}/package.json`, "utf8"),
    );
    const license =
      typeof meta.license === "string"
        ? meta.license
        : (meta.license?.type ?? "Ver o repositório");
    list.push({ name, license, url: linkOf(name, meta) });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

const libraries = {
  app: await describe(Object.keys(pkg.dependencies ?? {})),
  build: await describe(Object.keys(pkg.devDependencies ?? {})),
};
await writeFile(
  "features/credits/libraries.json",
  `${JSON.stringify(libraries, null, 2)}\n`,
);
console.log(
  `Créditos: ${libraries.app.length} bibliotecas do app e ${libraries.build.length} de construção.`,
);
