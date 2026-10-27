import { Logo } from "@/components/shell/logo";
import { PageTransition } from "@/components/motion/page-transition";

// Entrar e cadastrar: só o cartão no centro, sem a barra do app. O
// PageTransition da raiz anima a chegada vinda de outro grupo de rotas (da
// landing, por exemplo); entre entrar e cadastrar, anima o das páginas
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <PageTransition className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center sm:py-16">
      <Logo className="mb-8" />
      <main className="w-full max-w-sm">{children}</main>
    </PageTransition>
  );
}
