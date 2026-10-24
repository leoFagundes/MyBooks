import { BottomNav } from "@/components/shell/bottom-nav";
import { TopNav } from "@/components/shell/top-nav";

// Telas do app: barra superior e, no celular, a pílula inferior. Quem está
// vendo entra com a conta, na Fase 2; por enquanto a navegação é a de visitante.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col pb-28 md:pb-0">
      <TopNav viewer={null} />
      <div className="flex-1">{children}</div>
      <BottomNav viewer={null} />
    </div>
  );
}
