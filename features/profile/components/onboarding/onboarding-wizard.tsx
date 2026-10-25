"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import { useState } from "react";
import { GENRE_SLUGS, type GenreSlug } from "@/features/profile/genres";
import type { OwnProfile } from "@/features/profile/queries";
import type { ShelfStatus } from "@/features/shelf/schemas";
import { springs, tweens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BooksStep } from "./books-step";
import { GenresStep } from "./genres-step";
import { type ProfileDraft, ProfileStep } from "./profile-step";
import { type FollowState, ReadersStep } from "./readers-step";

const TOTAL = 4;

// O passo novo entra pelo lado para onde se anda; a saída é mais rápida
const slide: Variants = {
  enter: (direction: number) => ({ x: 32 * direction, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: springs.smooth },
  exit: (direction: number) => ({
    x: -32 * direction,
    opacity: 0,
    transition: tweens.fast,
  }),
};

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between">
      <p className="font-mono text-xs text-muted-foreground">
        Passo {current + 1} de {TOTAL}
      </p>
      <div aria-hidden className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL }, (_, i) => (
          <motion.span
            key={i}
            layout
            transition={springs.snappy}
            className={cn(
              "h-1.5 rounded-full",
              i === current
                ? "w-5 bg-foreground"
                : i < current
                  ? "w-1.5 bg-muted-foreground"
                  : "w-1.5 bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Onboarding em quatro passos (spec §5.2): nome, @ e foto; gêneros;
 * primeiros livros; leitores para seguir. Cada passo salva ao seguir em
 * frente, e voltar mostra o que já foi feito.
 */
export function OnboardingWizard({
  profile,
  shelf,
}: {
  profile: OwnProfile;
  shelf: Record<string, ShelfStatus>;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [moved, setMoved] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: profile.displayName,
    username: profile.username,
    avatar: { path: null, preview: profile.avatarUrl },
  });
  const [genres, setGenres] = useState<GenreSlug[]>(
    profile.favoriteGenres.filter((slug): slug is GenreSlug =>
      (GENRE_SLUGS as readonly string[]).includes(slug),
    ),
  );
  const [books, setBooks] = useState(shelf);
  const [follows, setFollows] = useState<Record<string, FollowState>>({});

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setMoved(true);
    setStep(next);
  };

  return (
    <div className="flex flex-col gap-8">
      <ProgressDots current={step} />
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.section
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {step === 0 ? (
              <ProfileStep
                userId={profile.id}
                ownUsername={profile.username}
                draft={draft}
                focusTitle={moved}
                onSaved={(saved) => {
                  setDraft(saved);
                  go(1);
                }}
              />
            ) : step === 1 ? (
              <GenresStep
                value={genres}
                onChange={setGenres}
                onBack={() => go(0)}
                onDone={() => go(2)}
              />
            ) : step === 2 ? (
              <BooksStep
                added={books}
                onChange={setBooks}
                onBack={() => go(1)}
                onDone={() => go(3)}
              />
            ) : (
              <ReadersStep
                genres={genres}
                follows={follows}
                onChange={setFollows}
                onBack={() => go(2)}
              />
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
