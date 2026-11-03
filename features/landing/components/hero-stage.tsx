"use client";

import { ArrowDown } from "lucide-react";
import {
  type MotionValue,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { splitWords } from "@/components/motion/split-words";
import { Button } from "@/components/ui/button";
import { Shelf } from "@/features/books/components/shelf";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { staggerDelay } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { useMediaQuery } from "@/lib/use-media-query";
import { LINE, PROFILE, STORY_MEDIA, SWAP, TITLE_OUT } from "../lib/story";
import { useStoryProgress } from "../lib/use-story-progress";
import type { LandingShowcase } from "../queries";
import { HeroBooks } from "./hero-books";

const TITLE = "Sua vida de leitor, em uma estante só.";

/** Entrada só em CSS: o título aparece sem esperar o JavaScript (é o LCP). */
const entering =
  "animate-[pagina-entra_var(--duration-slow)_var(--ease-standard)_both] motion-reduce:animate-[aparecer_var(--duration-slow)_var(--ease-standard)_both]";
const delay = (step: number) => ({
  animationDelay: `${Math.round(step * staggerDelay * 1000)}ms`,
});

/**
 * O topo da landing (spec §5.1): o título e, em volta, livros de verdade em
 * 3D (HeroBooks). No computador, rolando, eles voam até a prateleira e viram
 * as lombadas dela, que vira o perfil de uma leitora; o palco fica preso por
 * 160vh de rolagem. No celular, no tablet e com movimento reduzido, o CSS
 * monta tudo parado (a variante historia-parada): título, prateleira e
 * perfil, e os livros (sem movimento reduzido) só flutuam em volta do título.
 */
export function HeroStage({ showcase }: { showcase: LandingShowcase | null }) {
  const section = useRef<HTMLElement>(null);
  const shelf = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });
  const progress = useStoryProgress(scrollYProgress);
  const reduced = useReducedMotion();
  const story = useMediaQuery(STORY_MEDIA) && !reduced;

  const titleOpacity = useTransform(progress, TITLE_OUT, [1, 0]);
  const titleY = useTransform(progress, TITLE_OUT, [0, -48]);
  const titleEvents = useTransform(titleOpacity, (value) =>
    value > 0.15 ? "auto" : "none",
  );
  const lineScale = useTransform(progress, LINE, [0, 1]);
  const shelfOpacity = useTransform(progress, SWAP, [0, 1]);
  const profileOpacity = useTransform(progress, PROFILE, [0, 1]);
  const profileY = useTransform(progress, PROFILE, [24, 0]);
  const endEvents = useTransform(profileOpacity, (value) =>
    value > 0.5 ? "auto" : "none",
  );
  const words = splitWords(TITLE);

  // O Tab não para no invisível: o foco numa camada escondida rola a página
  // até o trecho em que ela aparece (o começo ou o fim da história)
  function reveal(opacity: MotionValue<number>, where: "start" | "end") {
    const node = section.current;
    if (!story || !node || opacity.get() > 0.9) return;
    const top = window.scrollY + node.getBoundingClientRect().top;
    window.scrollTo({
      top:
        where === "start" ? top : top + node.offsetHeight - window.innerHeight,
      behavior: "instant",
    });
  }

  return (
    <section
      ref={section}
      aria-label="Apresentação"
      className="relative h-[260vh] historia-parada:h-auto"
    >
      <div className="sticky top-0 h-svh overflow-hidden historia-parada:relative historia-parada:h-auto historia-parada:overflow-visible">
        <motion.div
          ref={text}
          onFocusCapture={() => reveal(titleOpacity, "start")}
          style={{
            opacity: titleOpacity,
            y: titleY,
            pointerEvents: titleEvents,
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-7 px-6 text-center historia-parada:pointer-events-auto! historia-parada:relative historia-parada:min-h-[88svh] historia-parada:transform-none! historia-parada:opacity-100!"
        >
          <h1
            data-hero-text
            className="max-w-4xl font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-7xl lg:text-8xl"
          >
            {words.map((word, index) => (
              <span key={`${word}-${index}`}>
                <span
                  className={`inline-block ${entering}`}
                  style={delay(index)}
                >
                  {word}
                </span>
                {index < words.length - 1 ? " " : null}
              </span>
            ))}
          </h1>
          <p
            data-hero-text
            className={`max-w-md text-lg text-pretty text-muted-foreground ${entering}`}
            style={delay(words.length + 2)}
          >
            Guarde o que você leu, o que está lendo e o que ainda quer ler.
            Visite a estante de outros leitores e traga para a sua o que chamar
            a sua atenção.
          </p>
          <div
            data-hero-text
            className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-3 ${entering}`}
            style={delay(words.length + 4)}
          >
            <Button size="lg" asChild>
              <Link href={routes.cadastro}>Criar minha estante</Link>
            </Button>
            <Link
              href={routes.entrar}
              className="rounded-control text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Já tenho conta
            </Link>
          </div>
          {showcase ? (
            <p
              aria-hidden
              className={`absolute bottom-8 flex items-center gap-2 font-mono text-xs text-muted-foreground historia-parada:hidden ${entering}`}
              style={delay(words.length + 8)}
            >
              <ArrowDown className="size-3.5" strokeWidth={1.5} />
              role para ver
            </p>
          ) : null}
        </motion.div>

        {showcase ? (
          <HeroBooks
            books={showcase.books}
            progress={progress}
            story={story}
            shelf={shelf}
            text={text}
          />
        ) : null}

        {showcase ? (
          <motion.div
            onFocusCapture={() => reveal(profileOpacity, "end")}
            style={{ pointerEvents: endEvents }}
            // pt-14: o fim da história centra abaixo da barra
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 px-4 pt-14 sm:gap-10 sm:px-6 historia-parada:pointer-events-auto! historia-parada:relative historia-parada:pb-24"
          >
            <motion.div
              style={{ opacity: profileOpacity, y: profileY }}
              // No celular, sem os gêneros: o fim da história cabe na tela
              className="w-full max-w-3xl historia-parada:transform-none! historia-parada:opacity-100! max-sm:[&_[data-genres]]:hidden"
            >
              <ProfileHeader
                profile={showcase.profile}
                counts={showcase.counts}
                titleAs="h2"
              />
            </motion.div>
            <div className="relative px-6">
              <motion.div
                ref={shelf}
                style={{ opacity: shelfOpacity }}
                className="historia-parada:opacity-100!"
              >
                <Shelf
                  books={showcase.books}
                  label={`A estante de ${showcase.profile.displayName}`}
                  // No celular, 8 lombadas, como as capas soltas
                  className="justify-center bg-none! max-sm:[&>li:nth-child(n+9)]:hidden"
                />
              </motion.div>
              <motion.div
                aria-hidden
                style={{ scaleX: lineScale }}
                className="absolute inset-x-0 bottom-0 h-px bg-foreground/24 historia-parada:transform-none!"
              />
            </div>
            <motion.div
              style={{ opacity: profileOpacity }}
              className="historia-parada:opacity-100!"
            >
              <Link
                href={routes.profile(showcase.profile.username)}
                className="rounded-control font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Ver a estante de @{showcase.profile.username} →
              </Link>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
