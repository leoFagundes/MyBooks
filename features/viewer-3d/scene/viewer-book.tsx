"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, type Group, SRGBColorSpace } from "three";
import { drawQuotePage, drawTitlePage } from "../lib/book-art";
import { OPEN_ANGLE } from "../lib/hinge";
import { type PageLayout, pageLayout } from "../lib/pages";
import type { SceneProps } from "../lib/types";
import { BookModel } from "./book-model";
import {
  loadBookTextures,
  retainBookTextures,
  texturesKey,
} from "./book-textures";
import { LEAF_THICKNESS, PageLeaf } from "./page-leaf";

// As folhas viradas deitam um pouco antes da capa, uma sobre a outra
const LEAF_REST_GAP = 0.03;
const LEAF_GAP = LEAF_THICKNESS * 1.25;

/**
 * A folha de rosto, na frente do miolo. Redesenha quando a citação chega
 * (as fontes já carregaram com as outras texturas).
 */
function useTitlePage(
  book: SceneProps["book"],
  description: string | null,
  quote: SceneProps["quotes"][number] | null,
  dims: SceneProps["dims"],
  maxAnisotropy: number,
) {
  const aspect =
    (dims.width - dims.board - dims.overhang) /
    (dims.height - 2 * dims.overhang);
  const texture = useMemo(() => {
    const page = new CanvasTexture(
      drawTitlePage(book, description, quote, aspect),
    );
    page.colorSpace = SRGBColorSpace;
    page.anisotropy = Math.min(8, maxAnisotropy);
    return page;
  }, [book, description, quote, aspect, maxAnisotropy]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** As páginas de citação das folhas que se viram (a primeira face é a folha de rosto). */
function useQuotePages(
  faces: PageLayout["faces"],
  aspect: number,
  maxAnisotropy: number,
) {
  const textures = useMemo(
    () =>
      faces.slice(1).map((quote) => {
        const page = new CanvasTexture(drawQuotePage(quote, aspect));
        page.colorSpace = SRGBColorSpace;
        page.anisotropy = Math.min(8, maxAnisotropy);
        return page;
      }),
    [faces, aspect, maxAnisotropy],
  );
  useEffect(
    () => () => {
      for (const texture of textures) texture.dispose();
    },
    [textures],
  );
  return textures;
}

/**
 * O livro do visualizador (e da prévia do cadastro): o BookModel com as
 * texturas grandes, a folha de rosto e as folhas de citação que se viram. As
 * folhas ficam dentro da altura do miolo, que baixa para elas: fechada, a
 * capa não encosta em nenhuma.
 */
export function ViewerBook({
  book,
  description,
  quotes,
  dims,
  pose,
}: Pick<SceneProps, "book" | "description" | "quotes" | "dims" | "pose">) {
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const key = texturesKey(book, description, dims);
  const textures = use(
    loadBookTextures(book, description, dims, maxAnisotropy),
  );
  const titlePage = useTitlePage(
    book,
    description,
    quotes[0] ?? null,
    dims,
    maxAnisotropy,
  );
  const layout = useMemo(() => pageLayout(quotes), [quotes]);
  const pageWidth = dims.width - dims.board - dims.overhang;
  const pageHeight = dims.height - 2 * dims.overhang;
  const quotePages = useQuotePages(
    layout.faces,
    pageWidth / pageHeight,
    maxAnisotropy,
  );
  const shift = useRef<Group>(null);

  useEffect(() => retainBookTextures(key), [key]);

  useFrame(() => {
    if (shift.current) shift.current.position.x = pose.shift.get();
  });

  const { width, board, pagesDepth, gap } = dims;
  const leaves = layout.leafCount;
  const stack = leaves * LEAF_GAP;
  // Com folhas para virar, a folha de rosto vai na primeira delas, e o miolo
  // embaixo fica em branco
  const pageFaces = [titlePage, ...quotePages];

  return (
    <group ref={shift}>
      <BookModel
        dims={dims}
        surfaces={textures}
        open={pose.open}
        blockFront={leaves > 0 ? undefined : titlePage}
        pagesInset={stack}
      >
        {Array.from({ length: leaves }, (_, index) => {
          const front = pageFaces[index * 2];
          const back = pageFaces[index * 2 + 1];
          const turned = pose.leaves[index];
          if (!front || !back || !turned) return null;
          // A primeira folha a virar é a de cima; virada, cada uma deita sobre
          // a guarda da capa aberta e sobre as que viraram antes
          const z =
            pagesDepth / 2 -
            stack +
            LEAF_THICKNESS / 2 +
            (leaves - 1 - index) * LEAF_GAP;
          const landing =
            pagesDepth / 2 + gap + LEAF_THICKNESS / 2 + index * LEAF_GAP;
          return (
            <PageLeaf
              key={index}
              width={pageWidth}
              height={pageHeight}
              front={front}
              back={back}
              paper={textures.paper}
              turned={turned}
              rest={OPEN_ANGLE - LEAF_REST_GAP * (index + 1)}
              lift={landing - z}
              position={[-width / 2 + board, 0, z]}
            />
          );
        })}
      </BookModel>
    </group>
  );
}
