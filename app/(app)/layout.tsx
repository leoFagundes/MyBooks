// Telas do app. A barra superior e a pílula inferior entram na Task 7.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh">{children}</div>;
}
