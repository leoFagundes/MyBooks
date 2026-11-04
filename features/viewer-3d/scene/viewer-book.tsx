"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  DoubleSide,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
} from "three";
import {
  bookColor,
  INK_RGB,
  mixColors,
  toHex,
} from "@/features/books/lib/color";
import { drawTitlePage } from "../lib/book-art";
import type { BookCopy } from "../lib/copy";
import {
  drawBlankFace,
  drawBookmarkFace,
  drawDiscussionsFace,
  drawExcerptFace,
  drawExLibris,
  drawQuoteFace,
  drawReadingCard,
  type PageLink,
} from "../lib/copy-art";
import { OPEN_ANGLE } from "../lib/hinge";
import { type Face, pageLayout } from "../lib/pages";
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
// O lápis leva 0,9s para sublinhar a citação inteira; o carimbo, 0,5s
const PENCIL_SECONDS = 0.9;
const STAMP_SECONDS = 0.5;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function toTexture(canvas: HTMLCanvasElement, maxAnisotropy: number) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);
  return texture;
}

/** A folha de rosto, na frente do miolo ou da primeira folha. */
function useTitlePage(
  book: SceneProps["book"],
  description: string | null,
  quote: SceneProps["quotes"][number] | null,
  aspect: number,
  maxAnisotropy: number,
) {
  const texture = useMemo(
    () =>
      toTexture(drawTitlePage(book, description, quote, aspect), maxAnisotropy),
    [book, description, quote, aspect, maxAnisotropy],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

type FacePage = {
  texture: CanvasTexture;
  /** As citações de quem vê: o lápis redesenha a página enquanto sublinha. */
  pencil: Extract<Face, { kind: "quote" }> | null;
  links: PageLink[];
};

/** As páginas das folhas que se viram (a primeira face é a folha de rosto). */
function useFacePages(
  faces: Face[],
  aspect: number,
  ribbon: string,
  maxAnisotropy: number,
): FacePage[] {
  const pages = useMemo(
    () =>
      faces.slice(1).map((face): FacePage => {
        if (face.kind === "quote") {
          const mine = face.credit === null;
          // A de quem vê nasce sem o sublinhado: o lápis o desenha ao aparecer
          const canvas = drawQuoteFace(face, aspect, mine ? 0 : 1);
          return {
            texture: toTexture(canvas, maxAnisotropy),
            pencil: mine ? face : null,
            links: [],
          };
        }
        if (face.kind === "discussions") {
          const { canvas, links } = drawDiscussionsFace(face, aspect);
          return {
            texture: toTexture(canvas, maxAnisotropy),
            pencil: null,
            links,
          };
        }
        const canvas =
          face.kind === "bookmark"
            ? drawBookmarkFace(face, aspect, ribbon)
            : face.kind === "excerpt"
              ? drawExcerptFace(face, aspect)
              : drawBlankFace(aspect);
        return {
          texture: toTexture(canvas, maxAnisotropy),
          pencil: null,
          links: [],
        };
      }),
    [faces, aspect, ribbon, maxAnisotropy],
  );
  useEffect(
    () => () => {
      for (const page of pages) page.texture.dispose();
    },
    [pages],
  );
  return pages;
}

/**
 * A face `index` está à vista com o livro aberto: a frente de uma folha é a
 * página da direita quando ela ainda não virou e a anterior já virou; o
 * verso é a da esquerda quando ela virou e a próxima não.
 */
function faceVisible(index: number, leaves: number[], open: number) {
  if (open < 0.92) return false;
  const leaf = Math.floor(index / 2);
  const turned = (value: number | undefined) => (value ?? 0) > 0.95;
  const flat = (value: number | undefined) => (value ?? 0) < 0.05;
  if (index % 2 === 0) {
    return flat(leaves[leaf]) && (leaf === 0 || turned(leaves[leaf - 1]));
  }
  return turned(leaves[leaf]) && flat(leaves[leaf + 1]);
}

/**
 * O lápis: quando a página de uma citação de quem vê aparece, o sublinhado
 * corre de novo, linha a linha; saindo de vista, ele se apaga para a próxima
 * vez. A cena só desenha sob demanda, então pede quadros enquanto escreve.
 */
function usePencil(
  pages: FacePage[],
  pose: SceneProps["pose"],
  aspect: number,
) {
  const invalidate = useThree((state) => state.invalidate);
  const progress = useRef<number[]>([]);

  useFrame((_, delta) => {
    const leaves = pose.leaves.map((leaf) => leaf.get());
    const open = pose.open.get();
    pages.forEach((page, index) => {
      if (!page.pencil) return;
      const before = progress.current[index] ?? 0;
      const visible = faceVisible(index + 1, leaves, open);
      const next = visible ? Math.min(1, before + delta / PENCIL_SECONDS) : 0;
      if (next === before) return;
      progress.current[index] = next;
      drawQuoteFace(
        page.pencil,
        aspect,
        easeOut(next),
        page.texture.image as HTMLCanvasElement,
      );
      page.texture.needsUpdate = true;
      if (next < 1) invalidate();
    });
  });
}

/**
 * O ex-libris na guarda da capa: aparece quando a capa abre, como um carimbo
 * que desce e aperta o papel (mais largo e transparente, depois no lugar), e
 * some quando ela fecha, para carimbar de novo na próxima vez.
 */
function ExLibris({
  copy,
  dims,
  open,
  maxAnisotropy,
}: {
  copy: NonNullable<BookCopy["mine"]>;
  dims: SceneProps["dims"];
  open: SceneProps["pose"]["open"];
  maxAnisotropy: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const mesh = useRef<Mesh>(null);
  const press = useRef(0);
  const texture = useMemo(
    () =>
      toTexture(
        drawExLibris({
          name: copy.displayName,
          addedAt: copy.addedAt,
          copiedFrom: copy.copiedFrom,
          seed: `${copy.displayName}:${copy.addedAt}`,
        }),
        maxAnisotropy,
      ),
    [copy, maxAnisotropy],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    const node = mesh.current;
    if (!node) return;
    const value = open.get();
    const before = press.current;
    const next =
      value > 0.8
        ? Math.min(1, before + delta / STAMP_SECONDS)
        : value < 0.2
          ? 0
          : before;
    press.current = next;
    const eased = easeOut(next);
    node.scale.setScalar(1.14 - 0.14 * eased);
    (node.material as MeshStandardMaterial).opacity = 0.88 * eased;
    node.visible = next > 0;
    if (next > 0 && next < 1) invalidate();
  });

  const width = dims.width * 0.44;
  return (
    <mesh ref={mesh} position={[0, dims.height * 0.06, 0]} visible={false}>
      <planeGeometry args={[width, width * 1.25]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        roughness={0.95}
      />
    </mesh>
  );
}

/**
 * O cartão da leitura de quem vê, colado na contracapa: surge (sobe um
 * pouco e aparece) quando o verso do livro vira para quem olha.
 */
function ReadingCard({
  copy,
  dims,
  pose,
  maxAnisotropy,
}: {
  copy: NonNullable<BookCopy["mine"]>;
  dims: SceneProps["dims"];
  pose: SceneProps["pose"];
  maxAnisotropy: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const mesh = useRef<Mesh>(null);
  const shown = useRef(0);
  const canvas = useMemo(
    () => drawReadingCard({ rating: copy.rating, review: copy.review }),
    [copy.rating, copy.review],
  );
  const texture = useMemo(
    () => toTexture(canvas, maxAnisotropy),
    [canvas, maxAnisotropy],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  const width = dims.width * 0.74;
  const height = (width * canvas.height) / canvas.width;
  const rest =
    -dims.height / 2 + dims.overhang + height / 2 + dims.height * 0.06;

  useFrame((_, delta) => {
    const node = mesh.current;
    if (!node) return;
    // O verso olha para quem vê quando o livro girou mais de meia volta
    const facing = -Math.cos(pose.yaw.get() + pose.tiltYaw.get());
    const target = clamp01((facing - 0.15) / 0.45);
    const before = shown.current;
    const next = before + (target - before) * Math.min(1, delta * 7);
    shown.current = Math.abs(next - target) < 0.002 ? target : next;
    const eased = easeOut(shown.current);
    (node.material as MeshStandardMaterial).opacity = eased;
    node.position.y = rest - (1 - eased) * dims.height * 0.025;
    node.visible = shown.current > 0.001;
    if (shown.current !== target) invalidate();
  });

  return (
    <mesh ref={mesh} position={[0, rest, 0]} visible={false}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        roughness={0.85}
      />
    </mesh>
  );
}

/** A fita com o corte em V na ponta, pendurada do alto (y = 0) para baixo. */
function ribbonGeometry(width: number, length: number) {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, -length);
  shape.lineTo(0, -length + width * 0.7);
  shape.lineTo(-width / 2, -length);
  shape.closePath();
  return new ShapeGeometry(shape);
}

/**
 * A fita marcadora: sai de baixo do miolo na altura da página em que quem vê
 * parou, e balança com o peso quando o livro gira ou inclina (uma mola sobre
 * a gravidade). Com o livro aberto, ela se recolhe. Tocar nela abre o livro
 * na página do marcador.
 */
function Ribbon({
  dims,
  progress,
  color,
  pose,
  stack,
}: {
  dims: SceneProps["dims"];
  progress: number;
  color: string;
  pose: SceneProps["pose"];
  stack: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const pivot = useRef<Group>(null);
  const motion = useRef({ angle: 0, velocity: 0, yaw: 0 });
  const length = dims.height * 0.17;
  const width = dims.width * 0.032;
  const geometry = useMemo(
    () => ribbonGeometry(width, length),
    [width, length],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const { width: bookWidth, height, board, overhang, pagesDepth } = dims;
  const front = pagesDepth / 2 - stack;
  const depth = pagesDepth - stack;
  const z = front - clamp01(progress) * depth * 0.9 - depth * 0.05;
  const x = -bookWidth / 2 + board + (bookWidth - board - overhang) * 0.32;
  const y = -(height / 2 - overhang) + 0.02;

  useFrame((_, delta) => {
    const node = pivot.current;
    if (!node) return;
    const state = motion.current;
    const step = Math.min(delta, 1 / 30);
    // A gravidade puxa a fita para baixo da tela; o giro a empurra de lado
    const yaw = pose.yaw.get() + pose.tiltYaw.get();
    const spin = (yaw - state.yaw) / Math.max(step, 1e-3);
    state.yaw = yaw;
    const target = -(pose.pitch.get() + pose.tiltPitch.get()) * 0.85;
    state.velocity +=
      ((target - state.angle) * 90 - state.velocity * 9 - spin * 0.6) * step;
    state.angle += state.velocity * step;
    node.rotation.x = state.angle;
    node.rotation.z = Math.sin(state.angle * 2) * 0.08;
    // Aberto, o miolo sai do lugar: a fita se recolhe para dentro
    const hidden = clamp01(pose.open.get() * 4);
    node.scale.set(1, 1 - hidden * 0.98, 1);
    node.visible = hidden < 0.99;
    if (
      Math.abs(state.velocity) > 1e-3 ||
      Math.abs(target - state.angle) > 1e-3
    ) {
      invalidate();
    }
  });

  return (
    <group ref={pivot} position={[x, y, z]}>
      <mesh geometry={geometry} userData={{ kind: "ribbon" }}>
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * O livro do visualizador (e da prévia do cadastro): o BookModel com as
 * texturas grandes e o exemplar de quem vê. As folhas (a folha de rosto,
 * onde parou, as citações a lápis e da comunidade, um trecho e o fórum) ficam
 * dentro da altura do miolo, que baixa para elas: fechada, a capa não encosta
 * em nenhuma. O ex-libris vai na guarda, o cartão da leitura na contracapa e
 * a fita sai de baixo do miolo.
 */
export function ViewerBook({
  book,
  description,
  quotes,
  copy,
  dims,
  pose,
}: Pick<SceneProps, "book" | "description" | "quotes" | "dims" | "pose"> & {
  copy: BookCopy;
}) {
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const key = texturesKey(book, description, dims);
  const textures = use(
    loadBookTextures(book, description, dims, maxAnisotropy),
  );
  const layout = useMemo(
    () => pageLayout(quotes, copy, book.pageCount),
    [quotes, copy, book.pageCount],
  );
  const pageWidth = dims.width - dims.board - dims.overhang;
  const pageHeight = dims.height - 2 * dims.overhang;
  const aspect = pageWidth / pageHeight;
  const titlePage = useTitlePage(
    book,
    description,
    layout.titleQuote,
    aspect,
    maxAnisotropy,
  );
  // A fita tem a cor do livro, mais funda, como um cetim tingido
  const ribbon = useMemo(
    () => mixColors(bookColor(book), toHex(INK_RGB), 0.35),
    [book],
  );
  const pages = useFacePages(layout.faces, aspect, ribbon, maxAnisotropy);
  usePencil(pages, pose, aspect);
  const shift = useRef<Group>(null);

  useEffect(() => retainBookTextures(key), [key]);

  useFrame(() => {
    if (shift.current) shift.current.position.x = pose.shift.get();
  });

  const { width, board, pagesDepth, gap } = dims;
  const leaves = layout.leafCount;
  const stack = leaves * LEAF_GAP;
  const pageFaces = [titlePage, ...pages.map((page) => page.texture)];
  const mine = copy.mine;
  const reading =
    mine?.status === "reading" && mine.currentPage && book.pageCount
      ? mine.currentPage / book.pageCount
      : null;

  return (
    <group ref={shift}>
      <BookModel
        dims={dims}
        surfaces={textures}
        open={pose.open}
        blockFront={leaves > 0 ? undefined : titlePage}
        pagesInset={stack}
        coverInside={
          mine ? (
            <ExLibris
              copy={mine}
              dims={dims}
              open={pose.open}
              maxAnisotropy={maxAnisotropy}
            />
          ) : undefined
        }
        backOutside={
          mine && (mine.rating || mine.review) ? (
            <ReadingCard
              copy={mine}
              dims={dims}
              pose={pose}
              maxAnisotropy={maxAnisotropy}
            />
          ) : undefined
        }
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
              meta={{
                kind: "leaf",
                links: {
                  front: pages[index * 2 - 1]?.links ?? [],
                  back: pages[index * 2]?.links ?? [],
                },
              }}
            />
          );
        })}
        {reading !== null ? (
          <Ribbon
            dims={dims}
            progress={reading}
            color={ribbon}
            pose={pose}
            stack={stack}
          />
        ) : null}
      </BookModel>
    </group>
  );
}
