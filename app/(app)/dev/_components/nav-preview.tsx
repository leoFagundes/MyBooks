import { BottomNav } from "@/components/shell/bottom-nav";
import type { NavViewer } from "@/components/shell/nav-links";
import { TopNav } from "@/components/shell/top-nav";
import { DemoRow } from "./dev-section";

const sampleViewer: NavViewer = {
  id: "",
  username: "analivia",
  displayName: "Ana Lívia",
  avatarUrl: null,
};

// Prévia de quem está logado, só para ver: fica `inert` e fora da árvore de
// acessibilidade. A navegação de verdade, de visitante, está no topo e no
// rodapé desta página.
export function NavPreview() {
  return (
    <>
      <DemoRow label="Barra superior com conta">
        <div
          inert
          aria-hidden
          className="w-full overflow-hidden rounded-card border border-border"
        >
          <TopNav viewer={sampleViewer} preview />
          <div className="h-16 bg-background" />
        </div>
      </DemoRow>
      <DemoRow label="Pílula do celular">
        <div
          inert
          aria-hidden
          className="flex w-full justify-center rounded-card border border-border bg-background py-6"
        >
          <BottomNav viewer={sampleViewer} preview />
        </div>
      </DemoRow>
    </>
  );
}
