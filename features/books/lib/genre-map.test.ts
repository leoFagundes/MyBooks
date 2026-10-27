import { describe, expect, test } from "vitest";
import domCasmurro from "./__fixtures__/openlibrary-dom-casmurro.json";
import horaDaEstrela from "./__fixtures__/openlibrary-a-hora-da-estrela.json";
import tortoArado from "./__fixtures__/openlibrary-torto-arado.json";
import { toGenreSlugs } from "./genre-map";
import { normalizeOpenLibraryDoc } from "./open-library";

// Os assuntos como a busca entrega (normalizados e no máximo 8)
function subjects(fixture: { docs: readonly object[] }, key: string) {
  const doc = fixture.docs.find(
    (item) => (item as { key?: string }).key === key,
  );
  return normalizeOpenLibraryDoc(doc)?.genres ?? [];
}

describe("toGenreSlugs", () => {
  test("assuntos reais da Open Library viram gêneros do MyBooks", () => {
    expect(toGenreSlugs(subjects(horaDaEstrela, "/works/OL1002120W"))).toEqual([
      "literatura-brasileira",
      "ficcao",
    ]);
    expect(toGenreSlugs(subjects(tortoArado, "/works/OL24141556W"))).toEqual([
      "ficcao",
      "realismo-magico",
    ]);
    expect(toGenreSlugs(subjects(domCasmurro, "/works/OL1003040W"))).toEqual([
      "ficcao",
    ]);
  });

  test("o gênero específico dispensa o 'ficção' do mesmo assunto", () => {
    expect(toGenreSlugs(["Science fiction"])).toEqual(["ficcao-cientifica"]);
    expect(toGenreSlugs(["Brazilian fiction"])).toEqual([
      "literatura-brasileira",
    ]);
    expect(toGenreSlugs(["Juvenile Fiction / Fantasy & Magic"])).toEqual([
      "fantasia",
      "infantojuvenil",
    ]);
    expect(toGenreSlugs(["Historical fiction"])).toEqual(["ficcao"]);
  });

  test("Brasil só conta como literatura brasileira quando o assunto é literatura", () => {
    expect(toGenreSlugs(["Brazil, history"])).toEqual(["historia"]);
    expect(toGenreSlugs(["Rio de janeiro (brazil), fiction"])).toEqual([
      "literatura-brasileira",
    ]);
    expect(toGenreSlugs(["Literatura brasileira", "Poesia"])).toEqual([
      "literatura-brasileira",
      "poesia",
    ]);
  });

  test("crítica literária não é história, e ciência não é ficção científica", () => {
    expect(toGenreSlugs(["History and criticism"])).toEqual([]);
    expect(toGenreSlugs(["Popular science", "Philosophy"])).toEqual([
      "ciencia",
      "filosofia",
    ]);
  });

  test("categorias do Google e assuntos em português", () => {
    expect(toGenreSlugs(["Fiction / Classics"])).toEqual(["classicos"]);
    expect(
      toGenreSlugs(["Biography & Autobiography / Personal Memoirs"]),
    ).toEqual(["biografia"]);
    expect(toGenreSlugs(["Comics & Graphic Novels / Manga"])).toEqual([
      "quadrinhos",
    ]);
    expect(toGenreSlugs(["Romance policial", "Contos"])).toEqual([
      "contos",
      "misterio",
    ]);
  });

  test("sem gênero reconhecido, lista vazia; nunca repete", () => {
    expect(toGenreSlugs(["Earthquakes", "Exhibitions"])).toEqual([]);
    expect(toGenreSlugs(["Fiction", "fiction", "Ficção"])).toEqual(["ficcao"]);
  });
});
