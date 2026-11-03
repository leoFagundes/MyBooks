"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/ui/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { routes } from "@/lib/routes";
import {
  liftSanction,
  removeContent,
  sanctionUser,
  setModerator,
} from "../actions";
import type { AdminUserRow, StaffRole, UserSummary } from "../queries";
import { CONTENT_PARTS, type ContentPart } from "../schemas";

export type UserDialog =
  | "resumo"
  | "suspender"
  | "banir"
  | "tirar-sancao"
  | "remover-conteudo"
  | "moderador";

const PART_LABEL: Record<ContentPart, string> = {
  perfil: "Bio e foto do perfil",
  resenhas: "Resenhas",
  citacoes: "Citações",
};

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

/** A situação de uma conta, em texto: "Suspensa até 12 de nov." ou "Banida". */
export function sanctionLabel(
  user: Pick<AdminUserRow, "sanction" | "sanctionEndsAt">,
) {
  if (user.sanction === "ban") return "Banida";
  if (user.sanction === "suspension" && user.sanctionEndsAt) {
    return `Suspensa até ${date.format(new Date(user.sanctionEndsAt))}`;
  }
  return null;
}

function Reason({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Motivo</Label>
      <Textarea
        id={id}
        value={value}
        maxLength={500}
        rows={3}
        placeholder="Fica no registro e na auditoria"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * As janelas das ações sobre uma conta. Cada uma chama a Server Action, que
 * confere o papel de novo e grava na auditoria; o erro esperado fica na
 * própria janela.
 */
export function UserDialogs({
  user,
  dialog,
  role,
  onClose,
  onDone,
}: {
  user: AdminUserRow | null;
  dialog: UserDialog | null;
  role: StaffRole;
  onClose: () => void;
  onDone: () => void;
}) {
  const open = Boolean(user && dialog);
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-lg">
        {user && dialog ? (
          dialog === "resumo" ? (
            <Summary user={user} />
          ) : (
            <ActionForm
              key={`${user.id}-${dialog}`}
              user={user}
              dialog={dialog}
              role={role}
              onClose={onClose}
              onDone={onDone}
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  user,
  dialog,
  onClose,
  onDone,
}: {
  user: AdminUserRow;
  dialog: Exclude<UserDialog, "resumo">;
  role: StaffRole;
  onClose: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [parts, setParts] = useState<ContentPart[]>(["perfil"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const name = `@${user.username}`;
  const promote = dialog === "moderador" && user.role !== "moderator";

  const copy = {
    suspender: {
      title: `Suspender ${name}`,
      description:
        "A conta não entra nem renova a sessão até o fim do prazo. O que ela publicou continua lá.",
      confirm: "Suspender",
    },
    banir: {
      title: `Banir ${name}`,
      description:
        "Sem prazo: a conta não entra mais. Para desfazer, tire a sanção depois.",
      confirm: "Banir",
    },
    "tirar-sancao": {
      title: `Tirar a sanção de ${name}`,
      description: "A conta volta a entrar normalmente.",
      confirm: "Tirar a sanção",
    },
    "remover-conteudo": {
      title: `Remover conteúdo de ${name}`,
      description:
        "Some de uma vez para todo mundo. A auditoria guarda o que foi removido.",
      confirm: "Remover",
    },
    moderador: {
      title: promote
        ? `Promover ${name} a moderador`
        : `Tirar ${name} da moderação`,
      description: promote
        ? "Moderadores veem o painel, suspendem contas e removem conteúdo."
        : "A conta volta a ser só de leitor.",
      confirm: promote ? "Promover" : "Tirar o papel",
    },
  }[dialog];

  function run() {
    setError(null);
    startTransition(async () => {
      let result: ActionResult<unknown>;
      if (dialog === "suspender") {
        result = await sanctionUser({
          kind: "suspension",
          userId: user.id,
          reason,
          days,
        });
      } else if (dialog === "banir") {
        result = await sanctionUser({ kind: "ban", userId: user.id, reason });
      } else if (dialog === "tirar-sancao") {
        result = await liftSanction({ userId: user.id, reason });
      } else if (dialog === "remover-conteudo") {
        result = await removeContent({ userId: user.id, reason, parts });
      } else {
        result = await setModerator({ userId: user.id, moderator: promote });
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        copy.confirm === "Remover" ? "Conteúdo removido" : "Pronto",
        {
          description: name,
        },
      );
      onDone();
      onClose();
    });
  }

  const destructive = dialog !== "tirar-sancao" && !(dialog === "moderador");

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        run();
      }}
    >
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
      {dialog === "suspender" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-dias`}>Por quantos dias</Label>
          <Input
            id={`${id}-dias`}
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className="w-28 font-mono"
          />
        </div>
      ) : null}
      {dialog === "remover-conteudo" ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">O que remover</legend>
          {CONTENT_PARTS.map((part) => (
            <label key={part} className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={parts.includes(part)}
                onChange={(event) =>
                  setParts((current) =>
                    event.target.checked
                      ? [...current, part]
                      : current.filter((item) => item !== part),
                  )
                }
                className="size-4 accent-foreground"
              />
              {PART_LABEL[part]}
            </label>
          ))}
        </fieldset>
      ) : null}
      {dialog !== "moderador" ? (
        <Reason id={`${id}-motivo`} value={reason} onChange={setReason} />
      ) : null}
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={destructive ? "destructive" : "primary"}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Salvando…" : copy.confirm}
        </Button>
      </DialogFooter>
    </form>
  );
}

async function fetchSummary(id: string, signal: AbortSignal) {
  const response = await fetch(`/api/admin/users/${id}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as UserSummary;
}

/** O perfil resumido: quem é, o que publicou e o histórico de sanções. */
function Summary({ user }: { user: AdminUserRow }) {
  const summary = useQuery({
    queryKey: ["admin-usuario", user.id],
    queryFn: ({ signal }) => fetchSummary(user.id, signal),
    staleTime: 0,
  });
  const data = summary.data;
  const status = sanctionLabel(user);

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="line-clamp-2">
              {user.displayName}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              @{user.username}
              {user.email ? ` · ${user.email}` : ""}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      {status ? (
        <p className="rounded-control border border-border px-3 py-2 text-sm">
          {status}
        </p>
      ) : null}
      {summary.isError ? (
        <p className="text-sm text-muted-foreground">
          Não deu para carregar o resumo agora.
        </p>
      ) : !data ? (
        <div
          aria-busy
          aria-label="Carregando o resumo"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
      ) : (
        <>
          {data.bio ? (
            <p className="text-sm text-pretty text-muted-foreground">
              {data.bio}
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Livros", data.books],
              ["Resenhas", data.counts.reviews],
              ["Citações", data.counts.quotes],
              ["Coleções", data.counts.collections],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col rounded-control border border-border px-3 py-2"
              >
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-mono text-lg">
                  {formatNumber(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="font-mono text-xs text-muted-foreground">
            Entrou em {date.format(new Date(data.createdAt))}
            {data.isPrivate ? " · perfil privado" : ""}
            {data.role
              ? ` · ${data.role === "admin" ? "admin" : "moderador"}`
              : ""}
          </p>
          <section aria-label="Sanções" className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Sanções</h3>
            {data.sanctions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma até hoje.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
                {data.sanctions.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-0.5 px-3 py-2.5 text-sm"
                  >
                    <span>
                      {item.kind === "ban" ? "Banimento" : "Suspensão"}
                      {item.endsAt
                        ? ` até ${date.format(new Date(item.endsAt))}`
                        : ""}
                      {item.liftedAt ? " · tirada" : ""}
                    </span>
                    <span className="text-pretty text-muted-foreground">
                      {item.reason}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      <RelativeTime iso={item.createdAt} />
                      {item.by ? ` · por @${item.by}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <a
            href={routes.profile(user.username)}
            target="_blank"
            rel="noreferrer"
            className="self-start text-sm underline underline-offset-4 hover:text-foreground"
          >
            Abrir o perfil público
          </a>
        </>
      )}
    </div>
  );
}
