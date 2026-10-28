import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { routes } from "@/lib/routes";
import type { Reader, ReaderState } from "../types";
import { FollowButton } from "./follow-button";

/**
 * Um leitor numa lista (seguidores, Explorar, sugestões): avatar, nome e @
 * levando ao perfil, uma linha de detalhe e o botão Seguir, ou outra ação.
 */
export function ReaderRow({
  reader,
  state,
  detail,
  action,
}: {
  reader: Reader & { isPrivate: boolean };
  state: ReaderState;
  detail?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="size-10">
        {reader.avatarUrl ? <AvatarImage src={reader.avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(reader.displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={routes.profile(reader.username)}
          className="truncate rounded-sm text-sm font-medium hover:underline hover:decoration-border-strong hover:underline-offset-4"
        >
          {reader.displayName}{" "}
          <span className="font-mono text-xs font-normal text-muted-foreground">
            @{reader.username}
          </span>
        </Link>
        {detail ? (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        ) : null}
      </div>
      {action ?? <FollowButton reader={reader} state={state} size="sm" />}
    </div>
  );
}
