import { PageTransition } from "@/components/motion/page-transition";
import { CollectionsCarousel } from "@/features/landing/components/collections-carousel";
import { FeatureDemos } from "@/features/landing/components/feature-demos";
import { HeroStage } from "@/features/landing/components/hero-stage";
import {
  LandingCallToAction,
  LandingFooter,
} from "@/features/landing/components/landing-footer";
import { LandingHeader } from "@/features/landing/components/landing-header";
import { getLandingData, type LandingData } from "@/features/landing/queries";
import { AccountDeletedNotice } from "@/features/profile/components/settings/account-deleted-notice";

// Sem o banco, a landing ainda conta a história do título e chama para entrar
const EMPTY: LandingData = {
  showcase: null,
  match: null,
  quote: null,
  collections: [],
};

/**
 * A landing (spec §5.1), contada pela rolagem: da capa solta ao perfil, os
 * três recursos com demonstrações vivas, as coleções populares e a chamada
 * final. Quem já tem conta e abre / vai direto ao /inicio (proxy).
 */
export default async function HomePage() {
  const { showcase, match, quote, collections } = await getLandingData().catch(
    () => EMPTY,
  );

  return (
    <PageTransition>
      <AccountDeletedNotice />
      <LandingHeader />
      <main>
        <HeroStage showcase={showcase} />
        {showcase ? (
          <section
            aria-label="Recursos"
            className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32"
          >
            <FeatureDemos
              showcase={showcase}
              match={match}
              quote={quote}
              collection={collections[0] ?? null}
            />
          </section>
        ) : null}
        {collections.length > 0 ? (
          <section
            aria-labelledby="colecoes-populares"
            className="mx-auto max-w-6xl py-16 sm:py-24"
          >
            <div className="flex flex-col gap-4 px-4 pb-8 sm:px-6">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Coleções
              </p>
              <h2
                id="colecoes-populares"
                className="font-serif text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl"
              >
                As listas que estão circulando.
              </h2>
              <p className="max-w-md text-pretty text-muted-foreground">
                Coleções públicas de quem já está por aqui. Arraste para ver
                mais, e copie a que quiser para a sua estante.
              </p>
            </div>
            <CollectionsCarousel collections={collections} />
          </section>
        ) : null}
        <LandingCallToAction />
      </main>
      <LandingFooter />
    </PageTransition>
  );
}
