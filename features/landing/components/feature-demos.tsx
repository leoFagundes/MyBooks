"use client";

import { LayoutGroup, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Reveal } from "@/components/motion/reveal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { BookCover } from "@/features/books/components/book-cover";
import { bookColor, coverInk } from "@/features/books/lib/color";
import { CollectionCard } from "@/features/collections/components/collection-card";
import type { CollectionVisual } from "@/features/collections/types";
import {
  type ShelfView,
  ShelfViews,
  shelfViewOptions,
} from "@/features/shelf/components/shelf-views";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { LandingMatch, LandingQuote, LandingShowcase } from "../queries";

// Enquanto a demonstração está na tela, a vista troca sozinha
const NEXT_VIEW: Record<ShelfView, ShelfView> = {
  estante: "grade",
  grade: "lista",
  lista: "estante",
};
const VIEW_INTERVAL_MS = 2800;

function Feature({
  eyebrow,
  title,
  text,
  demo,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  demo: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <Reveal className={cn("flex flex-col gap-4", flip && "lg:order-2")}>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h2 className="font-serif text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
          {title}
        </h2>
        <p className="max-w-md text-pretty text-muted-foreground">{text}</p>
      </Reveal>
      <Reveal delay={0.1} className="min-w-0">
        {demo}
      </Reveal>
    </div>
  );
}

/** Organize: as três vistas da estante, com os livros da leitora vitrine. */
function OrganizeDemo({ books }: { books: LandingShowcase["books"] }) {
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { amount: 0.5 });
  const reduced = useReducedMotion();
  const [view, setView] = useState<ShelfView>("estante");
  // Mexeu no controle, a demonstração para de trocar sozinha
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!inView || touched || reduced) return;
    const timer = window.setInterval(
      () => setView((current) => NEXT_VIEW[current]),
      VIEW_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [inView, touched, reduced]);

  return (
    <div
      ref={box}
      className="flex flex-col gap-6 rounded-card border border-border bg-surface p-5 sm:p-7"
    >
      <SegmentedControl<ShelfView>
        aria-label="Visualização"
        value={view}
        onValueChange={(next) => {
          setTouched(true);
          setView(next);
        }}
        options={shelfViewOptions}
        className="self-start"
      />
      <motion.div layout transition={springs.smooth} className="min-h-52">
        <ShelfViews books={books} view={view} />
      </motion.div>
    </div>
  );
}

function ReaderAvatar({
  reader,
  className,
}: {
  reader: { displayName: string; avatarUrl: string | null };
  className?: string;
}) {
  return (
    <Avatar className={cn("size-16 ring-4 ring-surface", className)}>
      {reader.avatarUrl ? <AvatarImage src={reader.avatarUrl} alt="" /> : null}
      <AvatarFallback className="font-serif text-xl">
        {initials(reader.displayName)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Descubra: a afinidade literária subindo, e os livros em comum. */
function DiscoverDemo({
  showcase,
  match,
}: {
  showcase: LandingShowcase;
  match: LandingMatch;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { once: true, amount: 0.6 });
  const { score, commonBooks } = match.affinity;

  return (
    <div
      ref={box}
      className="flex flex-col items-center gap-6 rounded-card border border-border bg-surface px-6 py-10 text-center"
    >
      <div className="flex items-center -space-x-3">
        <ReaderAvatar reader={showcase.profile} />
        <ReaderAvatar reader={match.reader} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="font-serif text-7xl leading-none tracking-tight">
          <AnimatedNumber value={inView ? score : 0} />%
        </p>
        <p className="text-sm text-pretty text-muted-foreground">
          de afinidade entre @{showcase.profile.username} e @
          {match.reader.username}
        </p>
      </div>
      {match.common.length > 0 ? (
        <ul aria-label="Livros em comum" className="flex gap-2.5">
          {match.common.map((book) => (
            <li key={book.id}>
              <BookCover book={book} size="xs" tilt={false} />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="font-mono text-xs text-muted-foreground">
        {commonBooks === 1
          ? "1 livro em comum"
          : `${formatNumber(commonBooks)} livros em comum`}
      </p>
    </div>
  );
}

/** A citação como ela vira imagem (a mesma folha de /api/quotes/[id]/image). */
function QuoteCard({
  quote,
  username,
}: {
  quote: LandingQuote;
  username: string;
}) {
  const { background, ink } = coverInk(bookColor(quote.book));
  const signature = [
    `— @${username}`,
    quote.page !== null ? `p. ${formatNumber(quote.page)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.figure
      initial={{ rotate: 2 }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      transition={springs.smooth}
      style={{ "--cover": background } as React.CSSProperties}
      className={cn(
        "mx-auto flex aspect-4/5 w-full max-w-72 flex-col justify-between gap-4 rounded-card bg-(--cover) p-6",
        ink === "ink" ? "text-ink" : "text-paper",
      )}
    >
      <span aria-hidden className="font-serif text-6xl leading-[0.6]">
        “
      </span>
      <blockquote className="font-serif text-xl leading-snug text-pretty italic">
        {quote.text}
      </blockquote>
      <figcaption className="flex flex-col gap-1">
        <span className="font-serif text-lg leading-tight">
          {quote.book.title}
        </span>
        <span className="text-xs">{quote.book.authors.join(", ")}</span>
        <span className="mt-2 font-mono text-[10px] tracking-wide">
          {signature}
        </span>
      </figcaption>
    </motion.figure>
  );
}

/** Organize · Descubra · Compartilhe (spec §5.1), cada um com a sua demonstração. */
export function FeatureDemos({
  showcase,
  match,
  quote,
  collection,
}: {
  showcase: LandingShowcase;
  match: LandingMatch | null;
  quote: LandingQuote | null;
  collection: CollectionVisual | null;
}) {
  return (
    <div className="flex flex-col gap-28 sm:gap-40">
      <Feature
        eyebrow="Organize"
        title="A sua estante, do seu jeito."
        text="Lido, lendo, quero ler e abandonado, com nota, datas e resenha. Veja tudo como lombadas numa prateleira, capas em grade ou uma lista."
        demo={<OrganizeDemo books={showcase.books.slice(0, 8)} />}
      />
      {match ? (
        <Feature
          flip
          eyebrow="Descubra"
          title="Leitores com o seu gosto."
          text="A afinidade literária compara estantes e gêneros favoritos, e mostra os livros que vocês têm em comum. Siga quem lê parecido e veja o que anda lendo."
          demo={<DiscoverDemo showcase={showcase} match={match} />}
        />
      ) : null}
      {collection || quote ? (
        <Feature
          eyebrow="Compartilhe"
          title="Coleções e citações para mostrar."
          text="Junte livros em coleções públicas, que outros leitores curtem e copiam, e transforme uma citação numa imagem pronta para compartilhar."
          demo={
            <div className="grid items-center gap-8 sm:grid-cols-2">
              {/* A mesma coleção está no carrossel: o grupo separa os layoutIds */}
              {collection ? (
                <LayoutGroup id="demo-compartilhe">
                  <CollectionCard
                    collection={collection}
                    href={routes.collection(collection.id)}
                  />
                </LayoutGroup>
              ) : null}
              {quote ? (
                <QuoteCard quote={quote} username={showcase.profile.username} />
              ) : null}
            </div>
          }
        />
      ) : null}
    </div>
  );
}
