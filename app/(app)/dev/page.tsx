import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ButtonsDemo } from "./_components/buttons-demo";
import { DevSection } from "./_components/dev-section";
import { FeedbackDemo } from "./_components/feedback-demo";
import { FieldsDemo } from "./_components/fields-demo";
import { MotionDemo } from "./_components/motion-demo";
import { NavigationDemo } from "./_components/navigation-demo";
import { OverlaysDemo } from "./_components/overlays-demo";
import { TokensDemo } from "./_components/tokens-demo";

export const metadata: Metadata = {
  title: "Componentes",
  robots: { index: false },
};

// Vitrine de tudo que a interface usa. Fica fora da produção (previews e
// local continuam com ela).
export default function DevPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 pt-16 pb-32">
      <header className="flex flex-col gap-3 border-b border-border pb-10">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Fase 1 · Fundação
          </p>
          <ThemeToggle />
        </div>
        <h1 className="font-serif text-5xl tracking-tight text-balance">
          Componentes e movimento
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          Tudo que a interface do MyBooks usa, num lugar só. Passe o mouse,
          clique e troque o tema para ver cada estado.
        </p>
      </header>

      <DevSection
        id="tokens"
        number="01"
        title="Cor, tipo e forma"
        description="A interface fica neutra para a cor vir das capas. O acento aparece só em foco, curtidas e seleção."
      >
        <TokensDemo />
      </DevSection>

      <DevSection
        id="botoes"
        number="02"
        title="Botões"
        description="Todo botão encolhe um pouco ao clicar, com mola. O primário é invertido."
      >
        <ButtonsDemo />
      </DevSection>

      <DevSection
        id="campos"
        number="03"
        title="Campos"
        description="Borda mais forte que a dos cards, para os campos se destacarem com contraste AA."
      >
        <FieldsDemo />
      </DevSection>

      <DevSection
        id="sobreposicoes"
        number="04"
        title="Modais, gavetas e menus"
        description="Entram de 0.96 para 1 com mola e saem mais rápido. A gaveta de baixo fecha arrastando a alça."
      >
        <OverlaysDemo />
      </DevSection>

      <DevSection
        id="navegacao"
        number="05"
        title="Abas e escolhas"
        description="O indicador desliza entre as opções com layout animado."
      >
        <NavigationDemo />
      </DevSection>

      <DevSection
        id="estados"
        number="06"
        title="Carregando, vazio e avisos"
        description="Skeletons discretos, estados vazios com uma ação e toasts com desfazer."
      >
        <FeedbackDemo />
      </DevSection>

      <DevSection
        id="movimento"
        number="07"
        title="Movimento"
        description="Presets de lib/motion.ts: entradas que acontecem uma vez, títulos que saem do desfoque e molas para o que é tocável. A rolagem desta página usa Lenis."
      >
        <MotionDemo />
      </DevSection>
    </main>
  );
}
