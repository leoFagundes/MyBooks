import Link from "next/link";
import { routes } from "@/lib/routes";
import { isFeatureOn } from "@/features/admin/queries";
import { authErrorMessage } from "../errors";
import { AuthCard } from "./auth-card";
import { SignInPanel } from "./sign-in-panel";
import { SignUpPanel } from "./sign-up-panel";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) =>
  typeof value === "string" && value !== "" ? value : null;

const linkClasses =
  "font-medium text-foreground underline-offset-4 hover:underline";

// Leem a URL (next e erro): ficam dentro do Suspense das páginas
export async function SignInCard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = single(params.next);
  const error = single(params.erro);
  return (
    <AuthCard
      title="Que bom te ver de novo"
      description="Entre para voltar à sua estante."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link
            href={{ pathname: routes.cadastro, query: next ? { next } : {} }}
            className={linkClasses}
          >
            Criar conta
          </Link>
        </>
      }
    >
      <SignInPanel
        next={next}
        initialError={error ? authErrorMessage(error) : null}
      />
    </AuthCard>
  );
}

export async function SignUpCard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const next = single((await searchParams).next);
  if (!(await isFeatureOn("cadastro"))) {
    return (
      <AuthCard
        title="Cadastros fechados por enquanto"
        description="Estamos recebendo leitores novos aos poucos. Volte em breve."
        footer={
          <>
            Já tem conta?{" "}
            <Link href={routes.entrar} className={linkClasses}>
              Entrar
            </Link>
          </>
        }
      >
        {null}
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Crie sua estante"
      description="Em um minuto você começa a guardar o que lê."
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href={{ pathname: routes.entrar, query: next ? { next } : {} }}
            className={linkClasses}
          >
            Entrar
          </Link>
        </>
      }
    >
      <SignUpPanel next={next} />
      <p className="mt-4 text-xs text-pretty text-muted-foreground">
        Ao criar a conta, você concorda com os{" "}
        <Link href={routes.termos} className={linkClasses}>
          termos de uso
        </Link>{" "}
        e a{" "}
        <Link href={routes.privacidade} className={linkClasses}>
          política de privacidade
        </Link>
        .
      </p>
    </AuthCard>
  );
}
