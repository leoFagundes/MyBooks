import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ResultOrigin } from "../lib/search-result";

const SOURCE_LABEL = {
  openlibrary: "Open Library",
  google: "Google Books",
} as const;

const chip =
  "inline-flex max-w-full items-center rounded-full border border-border px-2 py-px";

/**
 * O selo discreto de um resultado da busca (MELHORIAS 5.2): a fonte ou quem
 * cadastrou o livro à mão e, se ele já está no catálogo, em quantas estantes.
 * O @ vira link só fora de uma opção de lista (\`linkCreator\`): link dentro
 * de opção não chega ao teclado nem ao leitor de tela.
 */
export function BookOrigin({
  origin,
  linkCreator = false,
  className,
}: {
  origin: ResultOrigin;
  linkCreator?: boolean;
  className?: string;
}) {
  const { source, catalogId, addedBy, shelves = 0 } = origin;
  const creator =
    source === "manual" ? (
      addedBy ? (
        linkCreator ? (
          <>
            Cadastrado por{" "}
            <Link
              href={routes.profile(addedBy)}
              className="rounded-control underline-offset-2 hover:text-foreground hover:underline"
            >
              @{addedBy}
            </Link>
          </>
        ) : (
          `Cadastrado por @${addedBy}`
        )
      ) : (
        "Cadastro manual"
      )
    ) : (
      SOURCE_LABEL[source]
    );

  return (
    <span
      className={cn(
        "flex flex-wrap gap-1.5 font-mono text-[11px] leading-4 text-muted-foreground",
        className,
      )}
    >
      <span className={chip}>
        <span className="truncate">{creator}</span>
      </span>
      {catalogId ? (
        <span className={chip}>
          {shelves > 0
            ? `No MyBooks · ${formatNumber(shelves)} ${shelves === 1 ? "estante" : "estantes"}`
            : "No MyBooks"}
        </span>
      ) : null}
    </span>
  );
}
