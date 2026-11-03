// Ilustrações minimalistas em traço fino para os estados vazios (spec §8).
// Usam currentColor: a cor vem da classe de quem usa. O viewBox tem o tamanho
// em que elas aparecem (96 × 64), então o traço de 1.5 é o mesmo dos ícones.
// Tudo se apoia na base (y = 56): nada passa dela. O traço se desenha ao
// aparecer (.ilustracao no globals.css), na ordem de cada um.

import { cn } from "@/lib/utils";

type IllustrationProps = React.ComponentProps<"svg">;

function Illustration({ className, children, ...props }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 96 64"
      aria-hidden
      className={cn("ilustracao", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * Um traço da ilustração. O contínuo se desenha (pathLength); o tracejado,
 * o que ainda falta ou pode vir, esmaece por último.
 */
function Stroke({
  d,
  order,
  dashed = false,
}: {
  d: string;
  order: number;
  dashed?: boolean;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(dashed
        ? { strokeDasharray: "2 4", "data-tracejado": "" }
        : { pathLength: 1, "data-traco": "" })}
      style={{ "--i": order } as React.CSSProperties}
    />
  );
}

/** Retângulo de cantos arredondados como um caminho só (para se desenhar). */
function rect(x: number, y: number, width: number, height: number, r: number) {
  return `M${x + r} ${y}h${width - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${height - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${width - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${height - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
}

/** Círculo como um caminho só. */
function circle(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0`;
}

/** Duas lombadas, uma encostada nelas e o lugar de um livro que falta. */
export function EmptyShelfIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M10 56H86" />
      <Stroke order={1} d={rect(22, 26, 10, 30, 1.5)} />
      <Stroke order={2} d={rect(34, 20, 8, 36, 1.5)} />
      {/* Inclinado sobre o canto de baixo, que fica na base */}
      <Stroke order={3} d="M50.7 56L58.5 54.1L49.8 19.1L42 21.1Z" />
      <Stroke
        order={4}
        dashed
        d="M66 56V25.5a1.5 1.5 0 0 1 1.5-1.5h7a1.5 1.5 0 0 1 1.5 1.5V56"
      />
    </Illustration>
  );
}

export function SearchIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M22 56H74" />
      <Stroke order={1} d={circle(44, 28, 13)} />
      <Stroke order={2} d="M53.5 37.5L63 47" />
      <Stroke order={3} dashed d="M38 28H50" />
    </Illustration>
  );
}

export function QuietBellIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M36 44V31a12 12 0 0 1 24 0V44l3.5 4.5H32.5Z" />
      <Stroke order={1} d="M44.5 52.5a3.5 3.5 0 0 0 7 0" />
      <Stroke order={2} d="M66 17h6l-6 7h6" />
      <Stroke order={3} d="M76 10h4l-4 4.5h4" />
    </Illustration>
  );
}

export function LockedShelfIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M10 56H86" />
      <Stroke order={1} d={rect(22, 28, 9, 28, 1.5)} />
      <Stroke order={2} d={rect(33, 22, 8, 34, 1.5)} />
      <Stroke order={3} d={rect(52, 36, 22, 20, 3)} />
      <Stroke order={4} d="M57 36V31a6 6 0 0 1 12 0V36" />
      <Stroke order={5} d="M63 44V48" />
    </Illustration>
  );
}

export function QuoteIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M16 56H80" />
      {/* Um trecho em destaque: as aspas, o fio da citação e o texto */}
      <Stroke order={1} d="M23 18l-2.5 5M28 18l-2.5 5" />
      <Stroke order={2} d="M32 18V46" />
      <Stroke order={3} dashed d="M40 22H74M40 30H70M40 38H72M40 46H62" />
    </Illustration>
  );
}

/** Três livros em leque: os de trás aparecem só pelas bordas que se veem. */
export function CollectionsIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M14 56H82" />
      <Stroke order={1} d={rect(39, 14, 18, 42, 2)} />
      <Stroke order={2} d="M43.5 22.5h9" />
      <Stroke order={3} d="M39 54.9L34 56L26.1 18.8L39 16.1" />
      <Stroke order={4} d="M57 54.9L62 56L69.9 18.8L57 16.1" />
    </Illustration>
  );
}

/** Um leitor e, tracejado, o próximo que você pode seguir. */
export function ReadersIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M18 56H78" />
      <Stroke order={1} d={circle(38, 26, 7)} />
      <Stroke order={2} d="M26 56c1.5-9 6.5-14 12-14s10.5 5 12 14" />
      <Stroke order={3} dashed d={circle(60, 30, 6)} />
      <Stroke order={4} dashed d="M50 56c1-7.5 5-11.5 10-11.5s9 4 10 11.5" />
    </Illustration>
  );
}

/** Um livro aberto na base e o sinal da internet que não chega (tracejado). */
export function OfflineIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d="M10 56H86" />
      <Stroke order={1} d="M48 34C40 29 30 29 22 32V54C30 51 40 51 48 56" />
      <Stroke order={2} d="M48 34C56 29 66 29 74 32V54C66 51 56 51 48 56" />
      <Stroke order={3} d="M48 34V56" />
      <Stroke order={4} d="M44 21a6 6 0 0 1 8 0" />
      <Stroke order={5} dashed d="M40 16.5a11 11 0 0 1 16 0" />
      <Stroke order={6} dashed d="M36 12a16.5 16.5 0 0 1 24 0" />
    </Illustration>
  );
}

/** A barra do Safari, com o botão de compartilhar em destaque. */
export function ShareStepIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} dashed d="M20 14H76" />
      <Stroke order={1} dashed d="M20 22H60" />
      <Stroke order={2} d={rect(8, 40, 80, 16, 4)} />
      <Stroke order={3} d="M20 44.5L16.5 48L20 51.5" />
      <Stroke order={4} d="M45 45.5H43.5V53.5H52.5V45.5H51" />
      <Stroke order={5} d="M48 50V33M45 36L48 33L51 36" />
      <Stroke order={6} d={rect(72, 44.5, 7, 7, 1)} />
    </Illustration>
  );
}

/** O menu de compartilhar, com "Adicionar à Tela de Início" em destaque. */
export function AddToHomeStepIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} d={rect(16, 8, 64, 48, 4)} />
      <Stroke order={1} dashed d="M24 18H64" />
      <Stroke order={2} d={rect(24, 28, 8, 8, 1.5)} />
      <Stroke order={3} d="M28 30.5V33.5M26.5 32H29.5" />
      <Stroke order={4} d="M37 32H68" />
      <Stroke order={5} dashed d="M24 46H60" />
    </Illustration>
  );
}

/** A tela de início com o ícone do MyBooks entre os outros apps. */
export function HomeScreenStepIllustration(props: IllustrationProps) {
  return (
    <Illustration {...props}>
      <Stroke order={0} dashed d={rect(20, 18, 14, 14, 3)} />
      <Stroke order={1} dashed d={rect(41, 18, 14, 14, 3)} />
      <Stroke order={2} dashed d={rect(62, 18, 14, 14, 3)} />
      <Stroke order={3} dashed d={rect(20, 42, 14, 14, 3)} />
      <Stroke order={4} d={rect(40, 40, 16, 16, 3.5)} />
      <Stroke order={5} d="M45 45.5V51.5M48.5 44V51.5M52.5 46L51.4 51.6" />
      <Stroke order={6} dashed d={rect(62, 42, 14, 14, 3)} />
    </Illustration>
  );
}
