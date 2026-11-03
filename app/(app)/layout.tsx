import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { AccountActions } from "@/components/shell/account-actions";
import { BottomNav } from "@/components/shell/bottom-nav";
import { EstanteLink } from "@/components/shell/estante-link";
import type { NavViewer } from "@/components/shell/nav-links";
import { TopNav } from "@/components/shell/top-nav";
import { SiteBanner } from "@/features/admin/components/site-banner";
import { getViewer } from "@/lib/auth";

// Só o que a barra desenha vai para o cliente
async function navViewer(): Promise<NavViewer | null> {
  const viewer = await getViewer();
  return viewer
    ? {
        id: viewer.id,
        username: viewer.username,
        displayName: viewer.displayName,
        avatarUrl: viewer.avatarUrl,
      }
    : null;
}

async function ViewerAccountActions() {
  return <AccountActions viewer={await navViewer()} />;
}

async function ViewerEstanteLink({ variant }: { variant: "top" | "pill" }) {
  return <EstanteLink viewer={await navViewer()} variant={variant} />;
}

function estanteSlot(variant: "top" | "pill") {
  return (
    <Suspense fallback={<EstanteLink viewer={null} variant={variant} />}>
      <ViewerEstanteLink variant={variant} />
    </Suspense>
  );
}

// Telas do app: barra superior e, no celular, a pílula inferior. As barras
// fazem parte da página; só o que depende da conta chega depois, cada pedaço
// no seu Suspense, para nada esperar a sessão (e a barra não ser trocada
// inteira no meio de um clique).
// O PageTransition daqui só anima quando o layout inteiro chega ou sai (vindo
// da landing, por exemplo): o React só anima a transição que vem antes de
// qualquer elemento novo, e a das páginas fica dentro deste div.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <PageTransition className="flex min-h-dvh flex-col pb-28 md:pb-0">
      <SiteBanner />
      <TopNav
        slots={{
          estante: estanteSlot("top"),
          account: (
            <Suspense fallback={<AccountActions viewer={undefined} />}>
              <ViewerAccountActions />
            </Suspense>
          ),
        }}
      />
      <div className="flex-1">{children}</div>
      <BottomNav estante={estanteSlot("pill")} />
    </PageTransition>
  );
}
