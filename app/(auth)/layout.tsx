import { Logo } from "@/components/shell/logo";

// Entrar e cadastrar: só o cartão no centro, sem a barra do app
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center sm:py-16">
      <Logo className="mb-8" />
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
